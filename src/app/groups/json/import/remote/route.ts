import { env } from '@/lib/env'
import type { JSONImportData } from '@/lib/json-import'
import { prisma } from '@/lib/prisma'
import { getRateLimitIdentifier, rateLimit } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'
import superjson, { type SuperJSONResult } from 'superjson'

type TrpcBatchEntry = {
  result?: {
    data?: unknown
  }
  error?: {
    message?: string
  }
}

const DEFAULT_LIMIT = 100
const MAX_PAGES = 500
const FETCH_TIMEOUT_MS = 30000 // 30 seconds
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_EXPENSES = 10000 // Maximum number of expenses to import

function extractGroupId(pathname: string): string | null {
  const match = pathname.match(/\/groups\/([^/]+)/)
  const groupId = match?.[1] ?? null
  if (!groupId) return null
  // Allow only alphanumeric characters and hyphens to avoid injection/path traversal patterns.
  if (!/^[a-zA-Z0-9-]+$/.test(groupId)) {
    return null
  }
  return groupId
}

function getOrigin(urlString: string): string {
  return new URL(urlString).origin
}

function isPrivateIP(hostname: string): boolean {
  // Check for localhost
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1'
  ) {
    return true
  }

  // Check for private IPv4 ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const match = hostname.match(ipv4Regex)
  if (match && match.length === 5) {
    const a = Number(match[1])
    const b = Number(match[2])
    const c = Number(match[3])
    const d = Number(match[4])

    // Validate octets are in valid range
    if (a > 255 || b > 255 || c > 255 || d > 255) {
      return true // Invalid IP, treat as unsafe
    }

    // 127.0.0.0/8 - Loopback
    if (a === 127) return true

    // 10.0.0.0/8 - Private
    if (a === 10) return true

    // 172.16.0.0/12 - Private
    if (a === 172 && b >= 16 && b <= 31) return true

    // 192.168.0.0/16 - Private
    if (a === 192 && b === 168) return true

    // 169.254.0.0/16 - Link-local (includes cloud metadata endpoint)
    if (a === 169 && b === 254) return true
  }

  return false
}

function validateRemoteUrl(
  url: URL,
  localOrigin: string,
): { valid: boolean; error?: string } {
  // Only allow http/https protocols to reduce SSRF risk
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      valid: false,
      error: 'Only http and https protocols are allowed.',
    }
  }

  // Check if URL is same origin
  if (url.origin === localOrigin) {
    return {
      valid: false,
      error: 'Remote URL must be different from this site.',
    }
  }

  // Check for private IPs and localhost
  if (isPrivateIP(url.hostname)) {
    return {
      valid: false,
      error: 'Cannot fetch from private or local addresses.',
    }
  }

  return { valid: true }
}

function deserializeTrpcData(entry: TrpcBatchEntry) {
  if (entry.error?.message) {
    throw new Error(entry.error.message)
  }
  if (!entry.result?.data) {
    throw new Error('Remote response is missing data.')
  }
  const data = entry.result.data as { json?: unknown; meta?: unknown }
  if (data && typeof data === 'object' && 'json' in data) {
    try {
      return superjson.deserialize(data as SuperJSONResult)
    } catch (error) {
      return (data as { json?: unknown }).json
    }
  }
  return data
}

function normalizeDate(value: unknown): string {
  try {
    const date = value instanceof Date ? value : new Date(value as string)

    if (isNaN(date.getTime())) {
      const valueType = typeof value
      console.warn(
        `normalizeDate: Received invalid date value of type ${valueType}, skipping expense.`,
      )
      throw new Error('Invalid date value')
    }

    return date.toISOString()
  } catch (error) {
    console.warn(
      'normalizeDate: Error while normalizing date value, skipping expense.',
    )
    throw error
  }
}

function buildBatchUrl(
  origin: string,
  groupId: string,
  cursor: number,
  limit: number,
) {
  const input = {
    0: { json: { groupId } },
    1: {
      json: {
        groupId,
        limit,
        filter: '',
        direction: 'forward',
        cursor,
      },
    },
  }
  return `${origin}/api/trpc/groups.get,groups.expenses.list?batch=1&input=${encodeURIComponent(
    JSON.stringify(input),
  )}`
}

function buildExpensesUrl(
  origin: string,
  groupId: string,
  cursor: number,
  limit: number,
) {
  const input = {
    json: {
      groupId,
      limit,
      filter: '',
      direction: 'forward',
      cursor,
    },
  }
  return `${origin}/api/trpc/groups.expenses.list?input=${encodeURIComponent(
    JSON.stringify(input),
  )}`
}

async function fetchTrpcJson(url: string) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: controller.signal,
      redirect: 'manual', // Prevent following redirects to avoid redirect-based SSRF
    })

    if (!response.ok) {
      throw new Error(`Remote request failed with status ${response.status}.`)
    }

    // Check response size from header first
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      throw new Error('Response size exceeds maximum allowed limit.')
    }

    // Read response as text with size enforcement to prevent memory exhaustion
    // even if content-length header is absent or incorrect
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable.')
    }

    const decoder = new TextDecoder()
    let text = ''
    let totalBytes = 0

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        totalBytes += value.length
        if (totalBytes > MAX_RESPONSE_SIZE) {
          throw new Error('Response size exceeds maximum allowed limit.')
        }

        text += decoder.decode(value, { stream: true })
      }

      // Final decode to flush any remaining bytes
      text += decoder.decode()

      return JSON.parse(text) as unknown
    } finally {
      reader.releaseLock()
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function POST(req: Request) {
  // Apply rate limiting
  const identifier = getRateLimitIdentifier(req)
  const rateLimitResult = rateLimit(identifier)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    )
  }

  try {
    const body = (await req.json()) as { url?: string }
    if (!body.url) {
      return NextResponse.json({ error: 'Missing URL.' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(body.url)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 })
    }

    const groupId = extractGroupId(parsedUrl.pathname)
    if (!groupId) {
      return NextResponse.json(
        { error: 'Unable to find a group ID in the URL.' },
        { status: 400 },
      )
    }

    const localOrigin = getOrigin(env.NEXT_PUBLIC_BASE_URL)
    const urlValidation = validateRemoteUrl(parsedUrl, localOrigin)
    if (!urlValidation.valid) {
      return NextResponse.json({ error: urlValidation.error }, { status: 400 })
    }

    const existingGroup = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    })

    if (existingGroup) {
      return NextResponse.json(
        { error: 'Group already exists on this site.' },
        { status: 400 },
      )
    }

    const limit = DEFAULT_LIMIT
    let cursor = 0
    let hasMore = true
    let pages = 0
    const expenses: Array<any> = []
    let groupData: any = null

    while (hasMore) {
      if (pages >= MAX_PAGES) {
        throw new Error('Exceeded maximum pagination limit.')
      }

      let responseData: any

      if (pages === 0) {
        const batchUrl = buildBatchUrl(parsedUrl.origin, groupId, cursor, limit)
        const batchResponse = (await fetchTrpcJson(
          batchUrl,
        )) as TrpcBatchEntry[]
        if (!Array.isArray(batchResponse) || batchResponse.length < 2) {
          throw new Error('Unexpected batch response from remote site.')
        }

        const groupResult = deserializeTrpcData(batchResponse[0]) as {
          group?: unknown
        }
        groupData = groupResult.group

        responseData = deserializeTrpcData(batchResponse[1])
      } else {
        const listUrl = buildExpensesUrl(
          parsedUrl.origin,
          groupId,
          cursor,
          limit,
        )
        const listResponse = (await fetchTrpcJson(listUrl)) as TrpcBatchEntry
        responseData = deserializeTrpcData(listResponse)
      }

      const pageExpenses = (responseData as { expenses?: unknown }).expenses
      const pageHasMore = (responseData as { hasMore?: boolean }).hasMore
      const nextCursor = (responseData as { nextCursor?: number }).nextCursor

      if (Array.isArray(pageExpenses)) {
        expenses.push(...pageExpenses)

        // Check if we've exceeded the maximum number of expenses
        if (expenses.length > MAX_EXPENSES) {
          throw new Error(
            `Import exceeds maximum allowed expenses (${MAX_EXPENSES}).`,
          )
        }
      }

      hasMore = Boolean(pageHasMore)
      cursor = typeof nextCursor === 'number' ? nextCursor : cursor + limit
      pages += 1
    }

    if (!groupData) {
      throw new Error('Unable to load group data from remote site.')
    }

    const jsonData: JSONImportData = {
      id: groupData.id,
      name: groupData.name,
      currency: groupData.currency,
      currencyCode: groupData.currencyCode ?? null,
      participants: (groupData.participants ?? []).map((participant: any) => ({
        id: participant.id,
        name: participant.name,
      })),
      expenses: expenses
        .map((expense: any) => {
          try {
            return {
              createdAt: normalizeDate(expense.createdAt),
              expenseDate: normalizeDate(expense.expenseDate),
              title: expense.title,
              category: expense.category
                ? {
                    grouping: expense.category.grouping,
                    name: expense.category.name,
                  }
                : null,
              amount: expense.amount,
              originalAmount: expense.originalAmount ?? null,
              originalCurrency: expense.originalCurrency ?? null,
              conversionRate: expense.conversionRate ?? null,
              paidById: expense.paidBy?.id ?? expense.paidById,
              paidFor: (expense.paidFor ?? []).map((paidFor: any) => ({
                participantId: paidFor.participant?.id ?? paidFor.participantId,
                shares: paidFor.shares,
              })),
              isReimbursement: expense.isReimbursement,
              splitMode: expense.splitMode,
              recurrenceRule: expense.recurrenceRule ?? null,
            }
          } catch (error) {
            // Skip expenses with invalid dates
            return null
          }
        })
        .filter(
          (expense): expense is NonNullable<typeof expense> => expense !== null,
        )
        .sort((a, b) => a.expenseDate.localeCompare(b.expenseDate)),
    }

    return NextResponse.json({
      jsonData,
      groupName: jsonData.name,
    })
  } catch (error) {
    console.error('Remote JSON import error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch remote JSON export.',
      },
      { status: 500 },
    )
  }
}
