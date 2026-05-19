import { prisma } from '@/lib/prisma'
import { AppRouter } from '@/trpc/routers/_app'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import {
  extractSourceUrlFromImportMarker,
  normalizeGroupSourceUrl,
  setSourceUrlInImportMarkerData,
} from '@/lib/import-marker'
import { NextResponse } from 'next/server'
import superjson from 'superjson'

const PAGE_LIMIT = 100
const MAX_PAGES = 200
const EXPENSE_MATCH_THRESHOLD = 0.8
const PARTICIPANT_MATCH_THRESHOLD = 0.8

function createRemoteClient(origin: string) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${origin}/api/trpc`,
        transformer: superjson,
      }),
    ],
  })
}

function normalizeExpenseKey(expense: {
  expenseDate: Date | string
  title: string
  amount: number
}) {
  const date = new Date(expense.expenseDate).toISOString().split('T')[0]
  const title = expense.title.trim().toLowerCase()
  return `${date}|${title}|${expense.amount}`
}

function normalizeName(name: string) {
  return name.trim().toLowerCase()
}

function countIntersection(
  source: Map<string, number>,
  candidate: string[],
) {
  let matches = 0
  for (const key of candidate) {
    const remaining = source.get(key) ?? 0
    if (remaining > 0) {
      matches += 1
      if (remaining === 1) {
        source.delete(key)
      } else {
        source.set(key, remaining - 1)
      }
    }
  }
  return matches
}

function buildCountMap(values: string[]) {
  const map = new Map<string, number>()
  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1)
  }
  return map
}

async function validateRemoteSimilarity(groupId: string, sourceUrl: string) {
  const parsedUrl = new URL(sourceUrl)
  const remote = createRemoteClient(parsedUrl.origin)

  const localGroup = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      participants: { select: { name: true } },
      expenses: { select: { expenseDate: true, title: true, amount: true } },
    },
  })

  if (!localGroup) {
    throw new Error('Local group not found.')
  }

  const groupResult = await remote.groups.get.query({ groupId })
  if (!groupResult.group) {
    throw new Error('Remote group not found.')
  }

  const remoteExpenses: Awaited<
    ReturnType<typeof remote.groups.expenses.list.query>
  >['expenses'] = []

  let cursor = 0
  let hasMore = true
  let pages = 0

  while (hasMore) {
    if (pages >= MAX_PAGES) {
      throw new Error('Exceeded maximum remote pagination limit.')
    }

    const response = await remote.groups.expenses.list.query({
      groupId,
      cursor,
      limit: PAGE_LIMIT,
      filter: '',
    })

    remoteExpenses.push(...response.expenses)
    hasMore = response.hasMore
    cursor = response.nextCursor
    pages += 1
  }

  if (remoteExpenses.length === 0) {
    return { ok: true }
  }

  const localExpenseKeys = localGroup.expenses.map(normalizeExpenseKey)
  const remoteExpenseKeys = remoteExpenses.map((expense) =>
    normalizeExpenseKey({
      expenseDate: expense.expenseDate,
      title: expense.title,
      amount: expense.amount,
    }),
  )

  const expenseMatches = countIntersection(
    buildCountMap(localExpenseKeys),
    remoteExpenseKeys,
  )
  const expenseDenominator = Math.max(
    localExpenseKeys.length,
    remoteExpenseKeys.length,
  )
  const expenseRatio = expenseDenominator
    ? expenseMatches / expenseDenominator
    : 1

  const localParticipants = localGroup.participants.map((participant) =>
    normalizeName(participant.name),
  )
  const remoteParticipants = groupResult.group.participants.map((participant) =>
    normalizeName(participant.name),
  )
  const participantMatches = countIntersection(
    buildCountMap(localParticipants),
    remoteParticipants,
  )
  const participantDenominator = Math.max(
    localParticipants.length,
    remoteParticipants.length,
  )
  const participantRatio = participantDenominator
    ? participantMatches / participantDenominator
    : 1

  const expenseOk = expenseRatio >= EXPENSE_MATCH_THRESHOLD
  const participantOk = participantRatio >= PARTICIPANT_MATCH_THRESHOLD

  if (!expenseOk || !participantOk) {
    return {
      ok: false,
      details: {
        expenseRatio,
        participantRatio,
      },
    }
  }

  return { ok: true }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params

    const importMarker = await prisma.activity.findFirst({
      where: {
        groupId,
        data: {
          startsWith: 'JSON_IMPORT_START:',
        },
      },
      orderBy: { time: 'desc' },
      select: { id: true, data: true },
    })

    return NextResponse.json({
      hasImportMarker: !!importMarker,
      sourceUrl: extractSourceUrlFromImportMarker(importMarker?.data),
    })
  } catch {
    return NextResponse.json(
      { hasImportMarker: false, sourceUrl: null },
      { status: 500 },
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params
    const body = (await req.json().catch(() => null)) as {
      sourceUrl?: string | null
    } | null

    const importMarker = await prisma.activity.findFirst({
      where: {
        groupId,
        data: {
          startsWith: 'JSON_IMPORT_START:',
        },
      },
      orderBy: { time: 'desc' },
      select: { id: true, data: true },
    })

    if (!importMarker) {
      return NextResponse.json(
        { error: 'Import marker not found for this group.' },
        { status: 404 },
      )
    }

    let nextSourceUrl = body?.sourceUrl?.trim() || null
    if (nextSourceUrl) {
      let parsedUrl: URL
      try {
        parsedUrl = new URL(nextSourceUrl)
      } catch {
        return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 })
      }

      const remoteGroupId = parsedUrl.pathname.match(/\/groups\/([^/]+)/)?.[1]
      if (!remoteGroupId || remoteGroupId !== groupId) {
        return NextResponse.json(
          { error: 'URL must point to the same group ID.' },
          { status: 400 },
        )
      }

      nextSourceUrl = normalizeGroupSourceUrl(nextSourceUrl)

      const validation = await validateRemoteSimilarity(groupId, nextSourceUrl)
      if (!validation.ok) {
        return NextResponse.json(
          {
            error:
              'Remote group does not appear to match this group. Please link a matching group or an empty one.',
            details: validation.details,
          },
          { status: 400 },
        )
      }
    }

    const nextData = setSourceUrlInImportMarkerData(importMarker.data ?? '', nextSourceUrl)
    await prisma.activity.update({
      where: { id: importMarker.id },
      data: { data: nextData },
    })

    return NextResponse.json({
      hasImportMarker: true,
      sourceUrl: nextSourceUrl,
    })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      )
    }
    return NextResponse.json(
      { error: 'Failed to update import link.' },
      { status: 500 },
    )
  }
}
