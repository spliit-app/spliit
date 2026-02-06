import { env } from '@/lib/env'
import type { JSONImportData } from '@/lib/json-import'
import { prisma } from '@/lib/prisma'
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

function extractGroupId(pathname: string): string | null {
    const match = pathname.match(/\/groups\/([^/]+)/)
    return match?.[1] ?? null
}

function getOrigin(urlString: string): string {
    return new URL(urlString).origin
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
    if (value instanceof Date) return value.toISOString()
    return new Date(value as string).toISOString()
}

function buildBatchUrl(origin: string, groupId: string, cursor: number, limit: number) {
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

function buildExpensesUrl(origin: string, groupId: string, cursor: number, limit: number) {
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
    const response = await fetch(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
    })

    if (!response.ok) {
        throw new Error(`Remote request failed with status ${response.status}.`)
    }

    return response.json() as Promise<unknown>
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as { url?: string }
        if (!body.url) {
            return NextResponse.json({ error: 'Missing URL.' }, { status: 400 })
        }

        let parsedUrl: URL
        try {
            parsedUrl = new URL(body.url)
        } catch (error) {
            return NextResponse.json(
                { error: 'Invalid URL.' },
                { status: 400 },
            )
        }

        const groupId = extractGroupId(parsedUrl.pathname)
        if (!groupId) {
            return NextResponse.json(
                { error: 'Unable to find a group ID in the URL.' },
                { status: 400 },
            )
        }

        const localOrigin = getOrigin(env.NEXT_PUBLIC_BASE_URL)
        if (parsedUrl.origin === localOrigin) {
            return NextResponse.json(
                { error: 'Remote URL must be different from this site.' },
                { status: 400 },
            )
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
                const batchResponse = (await fetchTrpcJson(batchUrl)) as TrpcBatchEntry[]
                if (!Array.isArray(batchResponse) || batchResponse.length < 2) {
                    throw new Error('Unexpected batch response from remote site.')
                }

                const groupResult = deserializeTrpcData(batchResponse[0]) as {
                    group?: unknown
                }
                groupData = groupResult.group

                responseData = deserializeTrpcData(batchResponse[1])
            } else {
                const listUrl = buildExpensesUrl(parsedUrl.origin, groupId, cursor, limit)
                const listResponse = (await fetchTrpcJson(listUrl)) as TrpcBatchEntry
                responseData = deserializeTrpcData(listResponse)
            }

            const pageExpenses = (responseData as { expenses?: unknown }).expenses
            const pageHasMore = (responseData as { hasMore?: boolean }).hasMore
            const nextCursor = (responseData as { nextCursor?: number }).nextCursor

            if (Array.isArray(pageExpenses)) {
                expenses.push(...pageExpenses)
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
                .map((expense: any) => ({
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
                        participantId:
                            paidFor.participant?.id ?? paidFor.participantId,
                        shares: paidFor.shares,
                    })),
                    isReimbursement: expense.isReimbursement,
                    splitMode: expense.splitMode,
                    recurrenceRule: expense.recurrenceRule ?? null,
                }))
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
