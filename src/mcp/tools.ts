import { getGroupExpenses, getGroupExport } from '@/lib/api'
import { getExpenseShares } from '@/lib/shares'
import { filterExpensesByDateRange } from '@/lib/totals'
import { balanceDisplay, expenseDisplay, formatAmount } from '@/mcp/display'
import {
  buildCreateExpenseForm,
  buildUpdateExpenseForm,
  type ExistingExpenseForForm,
} from '@/mcp/expense-form'
import {
  activitiesListSchema,
  balancesGetSchema,
  balancesSettleSchema,
  categoriesListSchema,
  expensesAggregateSchema,
  expensesCreateSchema,
  expensesDeleteSchema,
  expensesGetSchema,
  expensesListSchema,
  expensesUpdateSchema,
  groupsDeleteSchema,
  groupsExportSchema,
  groupsGetSchema,
  groupsRestoreSchema,
  groupsUpdateSchema,
  participantsAddSchema,
  participantsRemoveSchema,
  participantsRenameSchema,
  statsCategoryExpensesSchema,
  statsMonthExpensesSchema,
  statsOverviewSchema,
} from '@/mcp/schemas'
import type { AppRouterCaller } from '@/trpc/routers/_app'
import * as z from 'zod'

export type SpliitCaller = AppRouterCaller

type ToolResult = {
  content: { type: 'text'; text: string }[]
  isError?: boolean
}

type ToolHandler = (input: unknown) => ToolResult | Promise<ToolResult>

/**
 * The subset of the MCP server that tool registration uses. Keeping it
 * structural means the data layer and tests do not need the transport package.
 */
export type SpliitToolServer = {
  registerTool(
    name: string,
    config: { description: string; inputSchema: z.ZodType },
    handler: ToolHandler,
  ): unknown
}

function jsonResult(value: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  }
}

async function runTool<T>(fn: () => Promise<T>): Promise<ToolResult> {
  try {
    return jsonResult(await fn())
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: error instanceof Error ? error.message : String(error),
        },
      ],
      isError: true,
    }
  }
}

type GroupForForm = {
  name: string
  information: string | null
  currency: string
  currencyCode: string | null
  participants: { id: string; name: string }[]
}

async function loadGroup(caller: SpliitCaller, groupId: string) {
  const { group } = await caller.groups.get({ groupId })
  if (!group) throw new Error('Group not found')
  return group
}

function groupFormValues(
  group: GroupForForm,
  participants: { id?: string; name: string }[] = group.participants,
) {
  return {
    name: group.name,
    information: group.information ?? undefined,
    currency: group.currency,
    currencyCode: group.currencyCode,
    participants,
  }
}

function assertKnownParticipantIds(
  group: GroupForForm,
  participants: { id?: string; name: string }[],
) {
  const known = new Set(group.participants.map((participant) => participant.id))
  for (const participant of participants) {
    if (participant.id !== undefined && !known.has(participant.id))
      throw new Error(`Unknown participant ID: ${participant.id}`)
  }
}

export function registerSpliitTools(
  server: SpliitToolServer,
  caller: SpliitCaller,
  groupId: string,
): void {
  server.registerTool(
    'groups_get',
    {
      description:
        'Get the current group, including its participants and settings.',
      inputSchema: groupsGetSchema,
    },
    () => runTool(async () => ({ group: await loadGroup(caller, groupId) })),
  )

  server.registerTool(
    'groups_update',
    {
      description:
        'Update the current group. Omitted fields keep their current values; participants, when provided, replace the full participant list. Participant ids must belong to the current group; removing a participant permanently deletes expenses they paid.',
      inputSchema: groupsUpdateSchema,
    },
    (input) =>
      runTool(async () => {
        const values = input as z.infer<typeof groupsUpdateSchema>
        const group = await loadGroup(caller, groupId)
        if (values.participants)
          assertKnownParticipantIds(group, values.participants)
        await caller.groups.update({
          groupId,
          groupFormValues: {
            name: values.name ?? group.name,
            information: values.information ?? group.information ?? undefined,
            currency: values.currency ?? group.currency,
            currencyCode:
              values.currencyCode !== undefined
                ? values.currencyCode
                : group.currencyCode,
            participants:
              values.participants ??
              group.participants.map(({ id, name }) => ({ id, name })),
          },
          participantId: values.participantId,
        })
        return { group: await loadGroup(caller, groupId) }
      }),
  )

  server.registerTool(
    'groups_delete',
    {
      description:
        'Schedule the current group for deletion after the grace period. The group name must match exactly. Requires group deletion to be enabled.',
      inputSchema: groupsDeleteSchema,
    },
    (input) =>
      runTool(async () => {
        const { groupName } = input as z.infer<typeof groupsDeleteSchema>
        await caller.groups.delete({ groupId, groupName })
        return { deleted: true }
      }),
  )

  server.registerTool(
    'groups_restore',
    {
      description: 'Cancel a scheduled deletion of the current group.',
      inputSchema: groupsRestoreSchema,
    },
    () =>
      runTool(async () => {
        await caller.groups.restore({ groupId })
        return { restored: true }
      }),
  )

  server.registerTool(
    'participants_list',
    {
      description:
        'List the current group’s participants and the participants referenced by its expenses.',
      inputSchema: groupsGetSchema,
    },
    () =>
      runTool(async () => {
        const { group, participantsWithExpenses } =
          await caller.groups.getDetails({ groupId })
        return { participants: group.participants, participantsWithExpenses }
      }),
  )

  server.registerTool(
    'participants_add',
    {
      description: 'Add a participant to the current group.',
      inputSchema: participantsAddSchema,
    },
    (input) =>
      runTool(async () => {
        const values = input as z.infer<typeof participantsAddSchema>
        const group = await loadGroup(caller, groupId)
        await caller.groups.update({
          groupId,
          groupFormValues: groupFormValues(group, [
            ...group.participants.map(({ id, name }) => ({ id, name })),
            { name: values.name },
          ]),
        })
        return { participants: (await loadGroup(caller, groupId)).participants }
      }),
  )

  server.registerTool(
    'participants_rename',
    {
      description: 'Rename a participant in the current group.',
      inputSchema: participantsRenameSchema,
    },
    (input) =>
      runTool(async () => {
        const values = input as z.infer<typeof participantsRenameSchema>
        const group = await loadGroup(caller, groupId)
        if (
          !group.participants.some(
            (participant) => participant.id === values.participantId,
          )
        )
          throw new Error('Participant not found')
        await caller.groups.update({
          groupId,
          groupFormValues: groupFormValues(
            group,
            group.participants.map((participant) =>
              participant.id === values.participantId
                ? { id: participant.id, name: values.name }
                : { id: participant.id, name: participant.name },
            ),
          ),
        })
        return { participants: (await loadGroup(caller, groupId)).participants }
      }),
  )

  server.registerTool(
    'participants_remove',
    {
      description:
        'Remove a participant from the current group. This permanently deletes expenses they paid and their paid-for rows.',
      inputSchema: participantsRemoveSchema,
    },
    (input) =>
      runTool(async () => {
        const values = input as z.infer<typeof participantsRemoveSchema>
        const group = await loadGroup(caller, groupId)
        if (
          !group.participants.some(
            (participant) => participant.id === values.participantId,
          )
        )
          throw new Error('Participant not found')
        await caller.groups.update({
          groupId,
          groupFormValues: groupFormValues(
            group,
            group.participants
              .filter((participant) => participant.id !== values.participantId)
              .map(({ id, name }) => ({ id, name })),
          ),
        })
        return { participants: (await loadGroup(caller, groupId)).participants }
      }),
  )

  server.registerTool(
    'expenses_list',
    {
      description:
        'List the current group’s expenses, newest first. Raw amounts are in minor units; each expense’s display field contains formatted amounts.',
      inputSchema: expensesListSchema,
    },
    (input) =>
      runTool(async () => {
        const values = input as z.infer<typeof expensesListSchema>
        const group = await loadGroup(caller, groupId)
        const result = await caller.groups.expenses.list({
          ...values,
          groupId,
        })
        return {
          ...result,
          expenses: result.expenses.map((expense) => ({
            ...expense,
            display: expenseDisplay(group, expense),
          })),
        }
      }),
  )

  server.registerTool(
    'expenses_aggregate',
    {
      description:
        'Filter and aggregate the current group’s expenses for common questions: date range, category, payer or share participant, title search, and totals grouped by category, participant, or month. Reimbursements are excluded unless includeReimbursements is true. Raw totals are in minor units; display contains formatted values.',
      inputSchema: expensesAggregateSchema,
    },
    (input) =>
      runTool(async () => {
        const values = input as z.infer<typeof expensesAggregateSchema>
        const group = await loadGroup(caller, groupId)
        if (
          values.participantId !== undefined &&
          !group.participants.some(
            (participant) => participant.id === values.participantId,
          )
        )
          throw new Error('Participant not found')
        const allExpenses = await getGroupExpenses(groupId)
        let filtered = filterExpensesByDateRange(
          allExpenses,
          values.from,
          values.to,
        )
        filtered = filtered.filter(
          (expense) => values.includeReimbursements || !expense.isReimbursement,
        )
        if (values.categoryId !== undefined)
          filtered = filtered.filter(
            (expense) => (expense.category?.id ?? 0) === values.categoryId,
          )
        if (values.filter) {
          const needle = values.filter.toLowerCase()
          filtered = filtered.filter((expense) =>
            expense.title.toLowerCase().includes(needle),
          )
        }

        const sharesFor = (expense: (typeof filtered)[number]) =>
          getExpenseShares({
            id: expense.id,
            amount: expense.amount,
            splitMode: expense.splitMode,
            paidFor: expense.paidFor.map(({ participant, shares }) => ({
              participantId: participant.id,
              shares: Number(shares),
            })),
          })

        const participantId = values.participantId
        if (participantId !== undefined && values.role === 'payer')
          filtered = filtered.filter(
            (expense) => expense.paidBy.id === participantId,
          )
        if (participantId !== undefined && values.role === 'share')
          filtered = filtered.filter(
            (expense) => (sharesFor(expense).get(participantId) ?? 0) > 0,
          )

        const amountFor = (expense: (typeof filtered)[number]) =>
          participantId !== undefined && values.role === 'share'
            ? (sharesFor(expense).get(participantId) ?? 0)
            : expense.amount

        let groups: Record<string, unknown>[] = []
        if (values.groupBy === 'category') {
          const byCategory = new Map<
            number,
            {
              categoryId: number
              grouping: string
              name: string
              total: number
            }
          >()
          for (const expense of filtered) {
            const category = expense.category
            const categoryId = category?.id ?? 0
            const entry = byCategory.get(categoryId) ?? {
              categoryId,
              grouping: category?.grouping ?? 'Uncategorized',
              name: category?.name ?? 'General',
              total: 0,
            }
            entry.total += amountFor(expense)
            byCategory.set(categoryId, entry)
          }
          groups = [...byCategory.values()]
            .sort((a, b) => b.total - a.total)
            .map((entry) => ({
              ...entry,
              display: formatAmount(group, entry.total),
            }))
        }
        if (values.groupBy === 'participant') {
          const byParticipant = new Map(
            group.participants.map((participant) => [
              participant.id,
              {
                participantId: participant.id,
                name: participant.name,
                paid: 0,
                share: 0,
              },
            ]),
          )
          for (const expense of filtered) {
            const payer = byParticipant.get(expense.paidBy.id)
            if (payer) payer.paid += expense.amount
            for (const [id, share] of sharesFor(expense)) {
              const entry = byParticipant.get(id)
              if (entry) entry.share += share
            }
          }
          groups = [...byParticipant.values()]
            .sort((a, b) => b.paid - a.paid)
            .map((entry) => ({
              ...entry,
              display: {
                paid: formatAmount(group, entry.paid),
                share: formatAmount(group, entry.share),
              },
            }))
        }
        if (values.groupBy === 'month') {
          const byMonth = new Map<string, number>()
          for (const expense of filtered) {
            const month = expense.expenseDate.toISOString().slice(0, 7)
            byMonth.set(month, (byMonth.get(month) ?? 0) + amountFor(expense))
          }
          groups = [...byMonth.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, total]) => ({
              month,
              total,
              display: formatAmount(group, total),
            }))
        }

        const total = filtered.reduce(
          (sum, expense) => sum + amountFor(expense),
          0,
        )
        return {
          total,
          count: filtered.length,
          display: formatAmount(group, total),
          groups,
        }
      }),
  )

  server.registerTool(
    'expenses_get',
    {
      description:
        'Get one expense by id in an update-ready shape. Raw amounts are in minor units and display contains formatted amounts; paidFor shares are weights for BY_SHARES, percentages for BY_PERCENTAGE, and minor units for BY_AMOUNT.',
      inputSchema: expensesGetSchema,
    },
    (input) =>
      runTool(async () => {
        const values = input as z.infer<typeof expensesGetSchema>
        const group = await loadGroup(caller, groupId)
        const { expense } = await caller.groups.expenses.get({
          ...values,
          groupId,
        })
        return {
          expense: {
            ...expense,
            expenseDate: expense.expenseDate.toISOString().slice(0, 10),
            conversionRate: expense.conversionRate?.toNumber() ?? null,
            display: expenseDisplay(group, expense),
            paidFor: expense.paidFor.map(({ participantId, shares }) => ({
              participantId,
              shares: expense.splitMode === 'BY_AMOUNT' ? shares : shares / 100,
            })),
            documents: expense.documents.map(({ id, url, width, height }) => ({
              id,
              url,
              width,
              height,
            })),
          },
        }
      }),
  )

  server.registerTool(
    'expenses_create',
    {
      description:
        'Create an expense in the current group. Amounts are in minor units. paidFor defaults to every group participant; shares are weights for BY_SHARES, percentages for BY_PERCENTAGE, and minor units for BY_AMOUNT. EVENLY ignores shares. The server mints the expense id.',
      inputSchema: expensesCreateSchema,
    },
    (input) =>
      runTool(async () => {
        const values = input as z.infer<typeof expensesCreateSchema>
        const group = await loadGroup(caller, groupId)
        const expenseFormValues = buildCreateExpenseForm(
          values,
          group.participants,
        )
        return caller.groups.expenses.create({
          groupId,
          expenseFormValues,
          participantId: values.participantId,
        })
      }),
  )

  server.registerTool(
    'expenses_update',
    {
      description:
        'Update an expense in the current group. Omitted fields keep their current values. Amounts are in minor units. Changing splitMode without paidFor rebuilds the split for every group participant.',
      inputSchema: expensesUpdateSchema,
    },
    (input) =>
      runTool(async () => {
        const values = input as z.infer<typeof expensesUpdateSchema>
        const group = await loadGroup(caller, groupId)
        const { expense } = await caller.groups.expenses.get({
          groupId,
          expenseId: values.expenseId,
        })
        const existing: ExistingExpenseForForm = {
          expenseDate: expense.expenseDate,
          title: expense.title,
          amount: expense.amount,
          originalAmount: expense.originalAmount,
          originalCurrency: expense.originalCurrency,
          conversionRate: expense.conversionRate,
          categoryId: expense.categoryId,
          paidById: expense.paidById,
          paidFor: expense.paidFor,
          splitMode: expense.splitMode,
          isReimbursement: expense.isReimbursement,
          documents: expense.documents,
          notes: expense.notes,
          recurrenceRule: expense.recurrenceRule,
        }
        return caller.groups.expenses.update({
          groupId,
          expenseId: values.expenseId,
          expenseFormValues: buildUpdateExpenseForm(
            existing,
            values,
            group.participants,
          ),
          participantId: values.participantId,
        })
      }),
  )

  server.registerTool(
    'expenses_delete',
    {
      description: 'Permanently delete an expense from the current group.',
      inputSchema: expensesDeleteSchema,
    },
    (input) =>
      runTool(async () => {
        const values = input as z.infer<typeof expensesDeleteSchema>
        await loadGroup(caller, groupId)
        await caller.groups.expenses.delete({ ...values, groupId })
        return { deleted: true }
      }),
  )

  server.registerTool(
    'balances_get',
    {
      description:
        'Get each participant’s balance in the current group and the suggested reimbursements. Raw amounts are in minor units; display contains formatted balances and reimbursements.',
      inputSchema: balancesGetSchema,
    },
    () =>
      runTool(async () => {
        const group = await loadGroup(caller, groupId)
        const result = await caller.groups.balances.list({ groupId })
        return {
          ...result,
          display: {
            balances: balanceDisplay(group, result.balances),
            reimbursements: result.reimbursements.map((reimbursement) => ({
              ...reimbursement,
              display: formatAmount(group, reimbursement.amount),
            })),
          },
        }
      }),
  )

  server.registerTool(
    'balances_settle',
    {
      description:
        'Record a reimbursement for a suggested balance transfer. Amount defaults to the current suggestion and cannot exceed it. Setting confirm to true is required.',
      inputSchema: balancesSettleSchema,
    },
    (input) =>
      runTool(async () => {
        const values = input as z.infer<typeof balancesSettleSchema>
        const group = await loadGroup(caller, groupId)
        const { reimbursements } = await caller.groups.balances.list({
          groupId,
        })
        const suggestion = reimbursements.find(
          (reimbursement) =>
            reimbursement.from === values.from &&
            reimbursement.to === values.to,
        )
        if (!suggestion)
          throw new Error('No suggested reimbursement for these participants')
        const amount = values.amount ?? suggestion.amount
        if (amount > suggestion.amount)
          throw new Error('Amount exceeds the suggested reimbursement')
        const expenseFormValues = buildCreateExpenseForm(
          {
            title: 'Reimbursement',
            amount,
            categoryId: 1,
            paidBy: values.from,
            paidFor: [{ participantId: values.to }],
            splitMode: 'EVENLY',
            isReimbursement: true,
            recurrenceRule: 'NONE',
          },
          group.participants,
        )
        const { expenseId } = await caller.groups.expenses.create({
          groupId,
          expenseFormValues,
        })
        return {
          expenseId,
          amount,
          display: formatAmount(group, amount),
        }
      }),
  )

  server.registerTool(
    'stats_overview',
    {
      description:
        'Get the stats overview for the current group, optionally scoped to a participant and date range. Raw amounts are in minor units; display contains formatted values.',
      inputSchema: statsOverviewSchema,
    },
    (input) =>
      runTool(async () => {
        const values = input as z.infer<typeof statsOverviewSchema>
        const group = await loadGroup(caller, groupId)
        const stats = await caller.groups.stats.overview({
          ...values,
          groupId,
        })
        return {
          ...stats,
          display: {
            totalGroupSpendings: formatAmount(group, stats.totalGroupSpendings),
            totalParticipantSpendings:
              stats.totalParticipantSpendings === undefined
                ? undefined
                : formatAmount(group, stats.totalParticipantSpendings),
            totalParticipantShare:
              stats.totalParticipantShare === undefined
                ? undefined
                : formatAmount(group, stats.totalParticipantShare),
            summary: {
              totalSpending: formatAmount(group, stats.summary.totalSpending),
              averageExpense: formatAmount(group, stats.summary.averageExpense),
              largestExpense: stats.summary.largestExpense
                ? {
                    title: stats.summary.largestExpense.title,
                    amount: formatAmount(
                      group,
                      stats.summary.largestExpense.amount,
                    ),
                  }
                : null,
            },
            months: stats.months.map((month) => ({
              month: month.month,
              total: formatAmount(group, month.total),
            })),
            monthlyCategorySpending: {
              months: stats.monthlyCategorySpending.months.map((month) => ({
                key: month.key,
                amount: formatAmount(group, month.amount),
                expenseAmount: formatAmount(group, month.expenseAmount),
                incomeAmount: formatAmount(group, month.incomeAmount),
                categories: month.categories.map((category) => ({
                  key: category.key,
                  amount: formatAmount(group, category.amount),
                  expenseAmount: formatAmount(group, category.expenseAmount),
                  incomeAmount: formatAmount(group, category.incomeAmount),
                })),
              })),
              categories: stats.monthlyCategorySpending.categories.map(
                (category) => ({
                  key: category.key,
                  amount: formatAmount(group, category.amount),
                  expenseAmount: formatAmount(group, category.expenseAmount),
                  incomeAmount: formatAmount(group, category.incomeAmount),
                }),
              ),
              maxExpenseAmount: formatAmount(
                group,
                stats.monthlyCategorySpending.maxExpenseAmount,
              ),
            },
            participants: stats.participants.map((participant) => ({
              participantId: participant.participantId,
              paid: formatAmount(group, participant.paid),
              share: formatAmount(group, participant.share),
            })),
            categories: stats.categories.map((category) => ({
              categoryId: category.categoryId,
              total: formatAmount(group, category.total),
            })),
            recurring: {
              estimatedMonthly: formatAmount(
                group,
                stats.recurring.estimatedMonthly,
              ),
              estimatedYearly: formatAmount(
                group,
                stats.recurring.estimatedYearly,
              ),
              byPeriod: stats.recurring.byPeriod.map((period) => ({
                period: period.period,
                total: formatAmount(group, period.total),
              })),
            },
          },
        }
      }),
  )

  server.registerTool(
    'stats_month_expenses',
    {
      description:
        'List the expenses that make up one month of the current group’s stats. Raw amounts are in minor units; display contains formatted amounts.',
      inputSchema: statsMonthExpensesSchema,
    },
    (input) =>
      runTool(async () => {
        const values = input as z.infer<typeof statsMonthExpensesSchema>
        const group = await loadGroup(caller, groupId)
        const result = await caller.groups.stats.monthExpenses({
          ...values,
          groupId,
        })
        return {
          expenses: result.expenses.map((expense) => ({
            ...expense,
            display: formatAmount(group, expense.amount),
          })),
        }
      }),
  )

  server.registerTool(
    'stats_category_expenses',
    {
      description:
        'List the expenses that make up one category of the current group’s stats. Raw amounts are in minor units; display contains formatted amounts.',
      inputSchema: statsCategoryExpensesSchema,
    },
    (input) =>
      runTool(async () => {
        const values = input as z.infer<typeof statsCategoryExpensesSchema>
        const group = await loadGroup(caller, groupId)
        const result = await caller.groups.stats.categoryExpenses({
          ...values,
          groupId,
        })
        return {
          expenses: result.expenses.map((expense) => ({
            ...expense,
            display: formatAmount(group, expense.amount),
          })),
        }
      }),
  )

  server.registerTool(
    'activities_list',
    {
      description: 'List the current group’s activity history, newest first.',
      inputSchema: activitiesListSchema,
    },
    (input) =>
      runTool(async () => {
        const values = input as z.infer<typeof activitiesListSchema>
        await loadGroup(caller, groupId)
        return caller.groups.activities.list({ ...values, groupId })
      }),
  )

  server.registerTool(
    'categories_list',
    {
      description: 'List the reference expense categories.',
      inputSchema: categoriesListSchema,
    },
    () => runTool(async () => caller.categories.list()),
  )

  server.registerTool(
    'groups_export',
    {
      description:
        'Return the full JSON export of the current group, including expenses, participants, and activities. Each expense’s display field contains formatted amounts.',
      inputSchema: groupsExportSchema,
    },
    () =>
      runTool(async () => {
        const group = await getGroupExport(groupId)
        if (!group) throw new Error('Group not found')
        return {
          ...group,
          expenses: group.expenses.map((expense) => ({
            ...expense,
            display: expenseDisplay(group, expense),
          })),
        }
      }),
  )
}
