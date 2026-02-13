import { deleteExpense, randomId } from '@/lib/api'
import {
    JSONImportData,
    calculateJSONConflicts,
    compareJSONVersions,
    restoreGroupFromJSON,
} from '@/lib/json-import'
import { extractSourceUrlFromImportMarker } from '@/lib/import-marker'
import { prisma } from '@/lib/prisma'
import { AppRouter } from '@/trpc/routers/_app'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import { RecurrenceRule, SplitMode } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import superjson from 'superjson'
import { z } from 'zod'

const PAGE_LIMIT = 100
const MAX_PAGES = 500

type SyncDirection = 'remote_to_local' | 'local_to_remote'
type SyncAction =
    | 'create_local'
    | 'create_remote'
    | 'update_local'
    | 'update_remote'
    | 'delete_local'
    | 'delete_remote'

type RemoteExpenseWithIndex = {
    id: string
    index: number
    data: JSONImportData['expenses'][number]
}

type LocalExpense = {
    id: string
    createdAt: Date
    expenseDate: Date
    title: string
    amount: number
    originalAmount: number | null
    originalCurrency: string | null
    conversionRate: number | null
    paidById: string
    paidFor: Array<{ participantId: string; shares: number }>
    splitMode: SplitMode
    recurrenceRule: RecurrenceRule | null
    categoryId: number
    category: { grouping: string; name: string } | null
    isReimbursement: boolean
    notes: string | null
}

type SyncLine = {
    id: string
    entity: 'expense' | 'participant'
    kind: 'remote_only' | 'local_only' | 'conflict'
    title: string
    amount: number
    expenseDate: string
    differences?: Array<'category' | 'splitMode' | 'paidFor'>
    remoteExpenseId?: string
    remoteIndex?: number
    localExpenseId?: string
    defaultDirection: SyncDirection
    actions: {
        remote_to_local: SyncAction
        local_to_remote: SyncAction
    }
}

type RemoteParticipant = {
    id: string
    name: string
}

type LocalParticipant = {
    id: string
    name: string
}

const syncActionSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('preflight'),
    }),
    z.object({
        action: z.literal('execute'),
        selectedLines: z
            .array(
                z.object({
                    lineId: z.string().min(1),
                    direction: z.enum(['remote_to_local', 'local_to_remote']),
                }),
            )
            .optional(),
    }),
])

function extractGroupId(pathname: string): string | null {
    const match = pathname.match(/\/groups\/([^/]+)/)
    const groupId = match?.[1] ?? null
    if (!groupId) return null
    if (!/^[a-zA-Z0-9-]+$/.test(groupId)) return null
    return groupId
}

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

function createCategoryKey(grouping: string, name: string): string {
    return `${grouping}\x1F${name}`
}

const EXPENSE_KEY_DELIMITER = '\x1E'
const PAID_FOR_DELIMITER = '\x1D'

function normalizeExpenseDate(value: string | Date): string {
    return new Date(value).toISOString()
}

function createPaidForKey(
    paidFor: Array<{ participantId: string; shares: number }>,
): string {
    if (!paidFor.length) return ''
    return paidFor
        .slice()
        .sort(
            (a, b) =>
                a.participantId.localeCompare(b.participantId) || a.shares - b.shares,
        )
        .map((paidForItem) => `${paidForItem.participantId}:${paidForItem.shares}`)
        .join(PAID_FOR_DELIMITER)
}

function joinExpenseKey(parts: string[]): string {
    return parts.join(EXPENSE_KEY_DELIMITER)
}

function createExpenseBaseKey(expense: {
    expenseDate: string | Date
    title: string
    amount: number
    paidById: string
}): string {
    return joinExpenseKey([
        normalizeExpenseDate(expense.expenseDate),
        expense.title,
        expense.amount.toString(),
        expense.paidById,
    ])
}

function createExpenseMergeKey(expense: {
    expenseDate: string | Date
    title: string
    amount: number
    paidById: string
    splitMode?: string | null
    category?: { grouping: string; name: string } | null
    paidFor?: Array<{ participantId: string; shares: number }>
}): string {
    const categoryKey = expense.category
        ? createCategoryKey(expense.category.grouping, expense.category.name)
        : ''
    const paidForKey = createPaidForKey(expense.paidFor ?? [])
    return joinExpenseKey([
        createExpenseBaseKey(expense),
        expense.splitMode ?? 'EVENLY',
        categoryKey,
        paidForKey,
    ])
}

function toExpenseFormValues(expense: LocalExpense) {
    return {
        expenseDate: new Date(expense.expenseDate),
        title: expense.title,
        category: expense.categoryId,
        amount: expense.amount,
        originalAmount: expense.originalAmount ?? undefined,
        originalCurrency: expense.originalCurrency ?? undefined,
        conversionRate: expense.conversionRate ?? undefined,
        paidBy: expense.paidById,
        paidFor: expense.paidFor.map((paidForItem) => ({
            participant: paidForItem.participantId,
            shares: paidForItem.shares,
        })),
        splitMode: expense.splitMode,
        saveDefaultSplittingOptions: false,
        isReimbursement: expense.isReimbursement,
        documents: [],
        notes: expense.notes ?? '',
        recurrenceRule: expense.recurrenceRule ?? RecurrenceRule.NONE,
    }
}

function normalizeParticipantName(name: string) {
    return name.trim().toLowerCase()
}

function buildParticipantIdMapByName(
    localParticipants: LocalParticipant[],
    remoteParticipants: RemoteParticipant[],
) {
    const participantIdMap = new Map<string, string>()
    const remoteByName = new Map(
        remoteParticipants.map((participant) => [
            normalizeParticipantName(participant.name),
            participant.id,
        ]),
    )

    for (const participant of localParticipants) {
        const remoteId = remoteByName.get(normalizeParticipantName(participant.name))
        if (remoteId) {
            participantIdMap.set(participant.id, remoteId)
        }
    }

    return participantIdMap
}

function toRemoteExpenseFormValues(
    expense: LocalExpense,
    participantIdMap: Map<string, string>,
) {
    const paidByRemoteId = participantIdMap.get(expense.paidById)
    if (!paidByRemoteId) {
        throw new Error(
            `Cannot sync expense "${expense.title}" to remote: payer is missing on remote.`,
        )
    }

    const paidFor = expense.paidFor.map((paidForItem) => {
        const remoteParticipantId = participantIdMap.get(paidForItem.participantId)
        if (!remoteParticipantId) {
            throw new Error(
                `Cannot sync expense "${expense.title}" to remote: a participant is missing on remote.`,
            )
        }

        return {
            participant: remoteParticipantId,
            shares: paidForItem.shares,
        }
    })

    return {
        expenseDate: new Date(expense.expenseDate),
        title: expense.title,
        category: expense.categoryId,
        amount: expense.amount,
        originalAmount: expense.originalAmount ?? undefined,
        originalCurrency: expense.originalCurrency ?? undefined,
        conversionRate: expense.conversionRate ?? undefined,
        paidBy: paidByRemoteId,
        paidFor,
        splitMode: expense.splitMode,
        saveDefaultSplittingOptions: false,
        isReimbursement: expense.isReimbursement,
        documents: [],
        notes: expense.notes ?? '',
        recurrenceRule: expense.recurrenceRule ?? RecurrenceRule.NONE,
    }
}

async function getImportSourceUrl(groupId: string) {
    const marker = await prisma.activity.findFirst({
        where: {
            groupId,
            data: {
                startsWith: 'JSON_IMPORT_START:',
            },
        },
        orderBy: { time: 'desc' },
        select: { data: true },
    })

    return extractSourceUrlFromImportMarker(marker?.data)
}

async function fetchRemoteGroupJSON(sourceUrl: string): Promise<{
    jsonData: JSONImportData
    expensesWithIndex: RemoteExpenseWithIndex[]
}> {
    const parsedUrl = new URL(sourceUrl)
    const groupId = extractGroupId(parsedUrl.pathname)
    if (!groupId) {
        throw new Error('Invalid import source URL. Missing group ID.')
    }

    const remote = createRemoteClient(parsedUrl.origin)
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

    const sortableExpenses = remoteExpenses
        .map((expense) => ({
            id: expense.id,
            data: {
                createdAt: new Date(expense.createdAt).toISOString(),
                expenseDate: new Date(expense.expenseDate).toISOString(),
                title: expense.title,
                category: expense.category
                    ? {
                        grouping: expense.category.grouping,
                        name: expense.category.name,
                    }
                    : null,
                amount: expense.amount,
                originalAmount: null,
                originalCurrency: null,
                conversionRate: null,
                paidById: expense.paidBy.id,
                paidFor: expense.paidFor.map((paidForItem) => ({
                    participantId: paidForItem.participant.id,
                    shares: paidForItem.shares,
                })),
                isReimbursement: expense.isReimbursement,
                splitMode: expense.splitMode,
                recurrenceRule: expense.recurrenceRule ?? null,
            },
        }))
        .sort((a, b) => a.data.expenseDate.localeCompare(b.data.expenseDate))

    const expensesWithIndex = sortableExpenses.map((expense, index) => ({
        id: expense.id,
        index,
        data: expense.data,
    }))

    return {
        jsonData: {
            id: groupResult.group.id,
            name: groupResult.group.name,
            currency: groupResult.group.currency,
            currencyCode: groupResult.group.currencyCode ?? null,
            participants: groupResult.group.participants.map((participant) => ({
                id: participant.id,
                name: participant.name,
            })),
            expenses: sortableExpenses.map((expense) => expense.data),
        },
        expensesWithIndex,
    }
}

async function getLocalGroup(groupId: string) {
    const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
            participants: { select: { id: true, name: true } },
            expenses: {
                select: {
                    id: true,
                    createdAt: true,
                    expenseDate: true,
                    title: true,
                    amount: true,
                    originalAmount: true,
                    originalCurrency: true,
                    conversionRate: true,
                    paidById: true,
                    paidFor: { select: { participantId: true, shares: true } },
                    splitMode: true,
                    recurrenceRule: true,
                    categoryId: true,
                    category: { select: { grouping: true, name: true } },
                    isReimbursement: true,
                    notes: true,
                },
            },
            activities: { select: { time: true } },
        },
    })

    if (!group) throw new Error('Local group not found.')

    const normalizedExpenses: LocalExpense[] = group.expenses.map((expense) => ({
        ...expense,
        conversionRate: expense.conversionRate?.toNumber() ?? null,
    }))

    return {
        ...group,
        expenses: normalizedExpenses,
    }
}

function buildSyncLines(
    remoteExpenses: RemoteExpenseWithIndex[],
    localExpenses: LocalExpense[],
    conflictDifferencesByRemoteIndex: Map<number, Array<'category' | 'splitMode' | 'paidFor'>>,
): SyncLine[] {
    const localByMergeKey = new Map<string, LocalExpense[]>()
    const localByBaseKey = new Map<string, LocalExpense[]>()
    for (const localExpense of localExpenses) {
        const mergeKey = createExpenseMergeKey(localExpense)
        const mergeList = localByMergeKey.get(mergeKey) ?? []
        mergeList.push(localExpense)
        localByMergeKey.set(mergeKey, mergeList)

        const baseKey = createExpenseBaseKey(localExpense)
        const baseList = localByBaseKey.get(baseKey) ?? []
        baseList.push(localExpense)
        localByBaseKey.set(baseKey, baseList)
    }

    const matchedLocalIds = new Set<string>()
    const syncLines: SyncLine[] = []

    for (const remoteExpense of remoteExpenses) {
        const mergeKey = createExpenseMergeKey(remoteExpense.data)
        const mergeMatches = localByMergeKey.get(mergeKey)
        if (mergeMatches && mergeMatches.length > 0) {
            const matched = mergeMatches.shift()
            if (matched) matchedLocalIds.add(matched.id)
            continue
        }

        const baseKey = createExpenseBaseKey(remoteExpense.data)
        const baseMatches = (localByBaseKey.get(baseKey) ?? []).filter(
            (localExpense) => !matchedLocalIds.has(localExpense.id),
        )

        if (baseMatches.length > 0) {
            const createdAtMatch = baseMatches.find(
                (localExpense) =>
                    normalizeExpenseDate(localExpense.createdAt) ===
                    normalizeExpenseDate(remoteExpense.data.createdAt),
            )
            const matchedLocal = createdAtMatch ?? baseMatches[0]
            matchedLocalIds.add(matchedLocal.id)

            syncLines.push({
                id: `conflict:${remoteExpense.id}:${matchedLocal.id}`,
                entity: 'expense',
                kind: 'conflict',
                title: remoteExpense.data.title,
                amount: remoteExpense.data.amount,
                expenseDate: remoteExpense.data.expenseDate,
                remoteExpenseId: remoteExpense.id,
                remoteIndex: remoteExpense.index,
                localExpenseId: matchedLocal.id,
                differences: conflictDifferencesByRemoteIndex.get(remoteExpense.index) ?? [],
                defaultDirection: 'remote_to_local',
                actions: {
                    remote_to_local: 'update_local',
                    local_to_remote: 'update_remote',
                },
            })
            continue
        }

        syncLines.push({
            id: `remote-only:${remoteExpense.id}`,
            entity: 'expense',
            kind: 'remote_only',
            title: remoteExpense.data.title,
            amount: remoteExpense.data.amount,
            expenseDate: remoteExpense.data.expenseDate,
            remoteExpenseId: remoteExpense.id,
            remoteIndex: remoteExpense.index,
            defaultDirection: 'remote_to_local',
            actions: {
                remote_to_local: 'create_local',
                local_to_remote: 'delete_remote',
            },
        })
    }

    for (const localExpense of localExpenses) {
        if (matchedLocalIds.has(localExpense.id)) continue

        syncLines.push({
            id: `local-only:${localExpense.id}`,
            entity: 'expense',
            kind: 'local_only',
            title: localExpense.title,
            amount: localExpense.amount,
            expenseDate: localExpense.expenseDate.toISOString(),
            localExpenseId: localExpense.id,
            defaultDirection: 'local_to_remote',
            actions: {
                remote_to_local: 'delete_local',
                local_to_remote: 'create_remote',
            },
        })
    }

    return syncLines
}

function buildParticipantSyncLines(
    localParticipants: LocalParticipant[],
    remoteParticipants: RemoteParticipant[],
): SyncLine[] {
    const lines: SyncLine[] = []

    const localByName = new Map(
        localParticipants.map((participant) => [
            normalizeParticipantName(participant.name),
            participant,
        ]),
    )
    const remoteByName = new Map(
        remoteParticipants.map((participant) => [
            normalizeParticipantName(participant.name),
            participant,
        ]),
    )

    for (const remoteParticipant of remoteParticipants) {
        const key = normalizeParticipantName(remoteParticipant.name)
        if (localByName.has(key)) continue

        lines.push({
            id: `participant-remote-only:${remoteParticipant.id}`,
            entity: 'participant',
            kind: 'remote_only',
            title: remoteParticipant.name,
            amount: 0,
            expenseDate: new Date(0).toISOString(),
            remoteExpenseId: remoteParticipant.id,
            defaultDirection: 'remote_to_local',
            actions: {
                remote_to_local: 'create_local',
                local_to_remote: 'delete_remote',
            },
        })
    }

    for (const localParticipant of localParticipants) {
        const key = normalizeParticipantName(localParticipant.name)
        if (remoteByName.has(key)) continue

        lines.push({
            id: `participant-local-only:${localParticipant.id}`,
            entity: 'participant',
            kind: 'local_only',
            title: localParticipant.name,
            amount: 0,
            expenseDate: new Date(0).toISOString(),
            localExpenseId: localParticipant.id,
            defaultDirection: 'local_to_remote',
            actions: {
                remote_to_local: 'delete_local',
                local_to_remote: 'create_remote',
            },
        })
    }

    return lines
}

async function applyRemoteParticipantMutations(
    remote: ReturnType<typeof createRemoteClient>,
    groupId: string,
    createRemoteParticipantNames: string[],
    deleteRemoteParticipantIds: string[],
) {
    if (
        createRemoteParticipantNames.length === 0 &&
        deleteRemoteParticipantIds.length === 0
    ) {
        const groupResult = await remote.groups.get.query({ groupId })
        if (!groupResult.group) throw new Error('Remote group not found.')
        return groupResult.group.participants.map((participant) => ({
            id: participant.id,
            name: participant.name,
        }))
    }

    const groupResult = await remote.groups.get.query({ groupId })
    if (!groupResult.group) throw new Error('Remote group not found.')

    const deleteSet = new Set(deleteRemoteParticipantIds)
    const existingParticipants = groupResult.group.participants.filter(
        (participant) => !deleteSet.has(participant.id),
    )

    const existingNames = new Set(
        existingParticipants.map((participant) =>
            normalizeParticipantName(participant.name),
        ),
    )

    const newParticipants = createRemoteParticipantNames
        .filter((name) => {
            const key = normalizeParticipantName(name)
            if (existingNames.has(key)) return false
            existingNames.add(key)
            return true
        })
        .map((name) => ({ name }))

    await remote.groups.update.mutate({
        groupId,
        groupFormValues: {
            name: groupResult.group.name,
            information: groupResult.group.information ?? '',
            currency: groupResult.group.currency,
            currencyCode: groupResult.group.currencyCode ?? '',
            participants: [
                ...existingParticipants.map((participant) => ({
                    id: participant.id,
                    name: participant.name,
                })),
                ...newParticipants,
            ],
        },
    })

    const refreshed = await remote.groups.get.query({ groupId })
    if (!refreshed.group) throw new Error('Remote group not found after update.')

    return refreshed.group.participants.map((participant) => ({
        id: participant.id,
        name: participant.name,
    }))
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ groupId: string }> },
) {
    try {
        const { groupId } = await params
        const rawBody = (await req.json().catch(() => null)) as unknown
        const parsedBody = syncActionSchema.safeParse(rawBody)

        if (!parsedBody.success) {
            return NextResponse.json(
                { error: 'Invalid sync request payload.' },
                { status: 400 },
            )
        }

        const sourceUrl = await getImportSourceUrl(groupId)
        if (!sourceUrl) {
            return NextResponse.json(
                { error: 'No remote import source URL found for this group.' },
                { status: 400 },
            )
        }

        const { jsonData: remoteJSON, expensesWithIndex } =
            await fetchRemoteGroupJSON(sourceUrl)
        if (remoteJSON.id !== groupId) {
            return NextResponse.json(
                { error: 'Remote source does not match this group.' },
                { status: 400 },
            )
        }

        const localGroup = await getLocalGroup(groupId)
        const comparison = compareJSONVersions(remoteJSON, localGroup)
        const conflicts = calculateJSONConflicts(remoteJSON, localGroup)
        const conflictDifferencesByRemoteIndex = new Map(
            conflicts.map((conflict) => [conflict.index, conflict.differences]),
        )

        const expenseSyncLines = buildSyncLines(
            expensesWithIndex,
            localGroup.expenses,
            conflictDifferencesByRemoteIndex,
        )
        const participantSyncLines = buildParticipantSyncLines(
            localGroup.participants,
            remoteJSON.participants,
        )
        const syncLines = [...participantSyncLines, ...expenseSyncLines]

        if (parsedBody.data.action === 'preflight') {
            return NextResponse.json({
                success: true,
                sourceUrl,
                comparison,
                syncLines,
            })
        }

        const selectedLines = parsedBody.data.selectedLines ?? []
        const selectedLineMap = new Map(selectedLines.map((line) => [line.lineId, line.direction]))
        const lineById = new Map(syncLines.map((line) => [line.id, line]))

        for (const selectedLine of selectedLines) {
            if (!lineById.has(selectedLine.lineId)) {
                return NextResponse.json(
                    { error: 'Invalid sync line selection. Please refresh and retry.' },
                    { status: 400 },
                )
            }
        }

        const localExpenseById = new Map(
            localGroup.expenses.map((expense) => [expense.id, expense]),
        )

        const importRemoteIndexes = new Set<number>()
        const updateLocalIndexes = new Set<number>()
        const deleteLocalExpenseIds = new Set<string>()
        const createRemoteExpenseIds = new Set<string>()
        const updateRemotePairs: Array<{ remoteExpenseId: string; localExpenseId: string }> = []
        const deleteRemoteExpenseIds = new Set<string>()
        const createLocalParticipantIds = new Set<string>()
        const deleteLocalParticipantIds = new Set<string>()
        const createRemoteParticipantIds = new Set<string>()
        const deleteRemoteParticipantIds = new Set<string>()

        for (const [lineId, direction] of selectedLineMap.entries()) {
            const line = lineById.get(lineId)
            if (!line) continue

            const action = line.actions[direction]
            switch (action) {
                case 'create_local': {
                    if (line.entity === 'participant' && line.remoteExpenseId) {
                        createLocalParticipantIds.add(line.remoteExpenseId)
                        break
                    }
                    if (line.remoteIndex !== undefined) {
                        importRemoteIndexes.add(line.remoteIndex)
                    }
                    break
                }
                case 'update_local': {
                    if (line.remoteIndex !== undefined) {
                        importRemoteIndexes.add(line.remoteIndex)
                        updateLocalIndexes.add(line.remoteIndex)
                    }
                    break
                }
                case 'delete_local': {
                    if (line.entity === 'participant' && line.localExpenseId) {
                        deleteLocalParticipantIds.add(line.localExpenseId)
                        break
                    }
                    if (line.localExpenseId) deleteLocalExpenseIds.add(line.localExpenseId)
                    break
                }
                case 'create_remote': {
                    if (line.entity === 'participant' && line.localExpenseId) {
                        createRemoteParticipantIds.add(line.localExpenseId)
                        break
                    }
                    if (line.localExpenseId) createRemoteExpenseIds.add(line.localExpenseId)
                    break
                }
                case 'update_remote': {
                    if (line.remoteExpenseId && line.localExpenseId) {
                        updateRemotePairs.push({
                            remoteExpenseId: line.remoteExpenseId,
                            localExpenseId: line.localExpenseId,
                        })
                    }
                    break
                }
                case 'delete_remote': {
                    if (line.entity === 'participant' && line.remoteExpenseId) {
                        deleteRemoteParticipantIds.add(line.remoteExpenseId)
                        break
                    }
                    if (line.remoteExpenseId) deleteRemoteExpenseIds.add(line.remoteExpenseId)
                    break
                }
            }
        }

        if (createLocalParticipantIds.size > 0) {
            const remoteParticipantsById = new Map(
                remoteJSON.participants.map((participant) => [participant.id, participant]),
            )
            const existingLocalNames = new Set(
                localGroup.participants.map((participant) =>
                    normalizeParticipantName(participant.name),
                ),
            )
            for (const remoteParticipantId of createLocalParticipantIds) {
                const remoteParticipant = remoteParticipantsById.get(remoteParticipantId)
                if (!remoteParticipant) continue
                const normalizedName = normalizeParticipantName(remoteParticipant.name)
                if (existingLocalNames.has(normalizedName)) continue

                await prisma.participant.create({
                    data: {
                        id: randomId(),
                        groupId,
                        name: remoteParticipant.name,
                    },
                })
                existingLocalNames.add(normalizedName)
            }
        }

        if (deleteLocalParticipantIds.size > 0) {
            for (const localParticipantId of deleteLocalParticipantIds) {
                await prisma.participant.delete({
                    where: { id: localParticipantId },
                })
            }
        }

        if (importRemoteIndexes.size > 0) {
            const remap = new Map<number, number>()
            const filteredRemoteExpenses = remoteJSON.expenses.filter((expense, index) => {
                if (!importRemoteIndexes.has(index)) return false
                remap.set(index, remap.size)
                return true
            })
            const remappedConflictIndexes = Array.from(updateLocalIndexes)
                .map((index) => remap.get(index))
                .filter((index): index is number => index !== undefined)

            const filteredRemoteJSON: JSONImportData = {
                ...remoteJSON,
                expenses: filteredRemoteExpenses,
            }

            await prisma.$transaction(
                async (tx) => {
                    await restoreGroupFromJSON(tx, filteredRemoteJSON, 'update', {
                        conflictUpdates: remappedConflictIndexes,
                        sourceUrl,
                    })
                },
                { timeout: 60000, maxWait: 20000 },
            )
        }

        for (const localExpenseId of deleteLocalExpenseIds) {
            await deleteExpense(groupId, localExpenseId)
        }

        const hasRemoteActions =
            createRemoteParticipantIds.size > 0 ||
            deleteRemoteParticipantIds.size > 0 ||
            createRemoteExpenseIds.size > 0 ||
            updateRemotePairs.length > 0 ||
            deleteRemoteExpenseIds.size > 0

        if (hasRemoteActions) {
            const remote = createRemoteClient(new URL(sourceUrl).origin)
            const localParticipantById = new Map(
                localGroup.participants.map((participant) => [participant.id, participant]),
            )

            const createRemoteParticipantNames = Array.from(createRemoteParticipantIds)
                .map((participantId) => localParticipantById.get(participantId)?.name)
                .filter((name): name is string => !!name)

            const remoteParticipants = await applyRemoteParticipantMutations(
                remote,
                groupId,
                createRemoteParticipantNames,
                Array.from(deleteRemoteParticipantIds),
            )

            const participantIdMap = buildParticipantIdMapByName(
                localGroup.participants,
                remoteParticipants,
            )

            for (const localExpenseId of createRemoteExpenseIds) {
                const localExpense = localExpenseById.get(localExpenseId)
                if (!localExpense) continue

                await remote.groups.expenses.create.mutate({
                    groupId,
                    expenseFormValues: toRemoteExpenseFormValues(
                        localExpense,
                        participantIdMap,
                    ),
                })
            }

            for (const pair of updateRemotePairs) {
                const localExpense = localExpenseById.get(pair.localExpenseId)
                if (!localExpense) continue

                await remote.groups.expenses.update.mutate({
                    groupId,
                    expenseId: pair.remoteExpenseId,
                    expenseFormValues: toRemoteExpenseFormValues(
                        localExpense,
                        participantIdMap,
                    ),
                })
            }

            for (const remoteExpenseId of deleteRemoteExpenseIds) {
                await remote.groups.expenses.delete.mutate({
                    groupId,
                    expenseId: remoteExpenseId,
                })
            }
        }

        revalidatePath(`/groups/${groupId}`)
        revalidatePath(`/groups/${groupId}/expenses`)
        revalidatePath(`/groups/${groupId}/balances`)

        return NextResponse.json({
            success: true,
            applied: {
                createLocal: importRemoteIndexes.size - updateLocalIndexes.size,
                updateLocal: updateLocalIndexes.size,
                deleteLocal: deleteLocalExpenseIds.size,
                createRemote: createRemoteExpenseIds.size,
                updateRemote: updateRemotePairs.length,
                deleteRemote: deleteRemoteExpenseIds.size,
            },
        })
    } catch (error) {
        console.error('Sync expenses error:', error)
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to sync expenses.',
            },
            { status: 500 },
        )
    }
}
