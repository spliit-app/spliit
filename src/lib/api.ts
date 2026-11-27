import {
  ActivityType,
  Expense,
  RecurrenceRule,
  RecurringExpenseLink,
} from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { randomId } from '@/lib/random'
import { nextRecurringDate, usesAnchorDay } from '@/lib/recurrence'
import { ExpenseFormValues, GroupFormValues } from '@/lib/schemas'
import {
  getInstallmentAmounts,
  getOccurrenceValues,
  getSeriesSettings,
  isWithinSeries,
  projectOccurrences,
  SeriesSettings,
} from '@/lib/series'

// Re-exported for backwards compatibility with existing server-side importers.
export { randomId }

export async function createGroup(groupFormValues: GroupFormValues) {
  return prisma.group.create({
    data: {
      id: randomId(),
      name: groupFormValues.name,
      information: groupFormValues.information,
      currency: groupFormValues.currency,
      currencyCode: groupFormValues.currencyCode,
      participants: {
        createMany: {
          data: groupFormValues.participants.map(({ name }) => ({
            id: randomId(),
            name,
          })),
        },
      },
    },
    include: { participants: true },
  })
}

export async function createExpense(
  expenseFormValues: ExpenseFormValues,
  groupId: string,
  participantId?: string,
  // The expense form mints the id up front so the split it previews is the
  // one the saved expense gets (the id seeds who takes the leftover minor
  // unit, see `getExpenseShares`).
  expenseId: string = randomId(),
): Promise<Expense> {
  const group = await getGroup(groupId)
  if (!group) throw new Error(`Invalid group ID: ${groupId}`)

  for (const participant of [
    expenseFormValues.paidBy,
    ...expenseFormValues.paidFor.map((p) => p.participant),
  ]) {
    if (!group.participants.some((p) => p.id === participant))
      throw new Error(`Invalid participant ID: ${participant}`)
  }

  await logActivity(groupId, ActivityType.CREATE_EXPENSE, {
    participantId,
    expenseId,
    data: expenseFormValues.title,
  })

  const isCreateRecurrence =
    expenseFormValues.recurrenceRule !== RecurrenceRule.NONE
  const recurringExpenseLinkPayload = createPayloadForNewRecurringExpenseLink(
    expenseFormValues.recurrenceRule as RecurrenceRule,
    expenseFormValues.expenseDate,
    groupId,
  )

  const seriesSettings = getSeriesSettingsFromForm(expenseFormValues)
  const values = getFirstOccurrenceFormValues(expenseFormValues, seriesSettings)
  // A series of a single occurrence (or ending before the second one) has
  // nothing left to create.
  const hasNextOccurrence =
    isCreateRecurrence &&
    isWithinSeries(
      seriesSettings,
      2,
      recurringExpenseLinkPayload.nextExpenseDate,
    )

  return prisma.$transaction(async (transaction) => {
    const seriesId = seriesSettings
      ? (
          await transaction.recurringSeries.create({
            data: { id: randomId(), groupId, ...seriesSettings },
          })
        ).id
      : null

    return transaction.expense.create({
      data: {
        id: expenseId,
        groupId,
        expenseDate: values.expenseDate,
        categoryId: values.category,
        amount: values.amount,
        originalAmount: values.originalAmount,
        originalCurrency: values.originalCurrency,
        conversionRate: values.conversionRate,
        title: values.title,
        paidById: values.paidBy,
        splitMode: values.splitMode,
        recurrenceRule: values.recurrenceRule,
        seriesId,
        occurrenceNumber: seriesId ? 1 : null,
        recurringExpenseLink: {
          ...(hasNextOccurrence
            ? {
                create: recurringExpenseLinkPayload,
              }
            : {}),
        },
        paidFor: {
          createMany: {
            data: values.paidFor.map((paidFor) => ({
              participantId: paidFor.participant,
              shares: paidFor.shares,
            })),
          },
        },
        isReimbursement: values.isReimbursement,
        documents: {
          createMany: {
            data: values.documents.map((doc) => ({
              id: randomId(),
              url: doc.url,
              width: doc.width,
              height: doc.height,
            })),
          },
        },
        notes: values.notes,
      },
    })
  })
}

function getSeriesSettingsFromForm(
  expenseFormValues: ExpenseFormValues,
): SeriesSettings | null {
  return getSeriesSettings({
    recurrenceRule: expenseFormValues.recurrenceRule,
    seriesKind: expenseFormValues.seriesKind,
    recurrenceEnd: expenseFormValues.recurrenceEnd,
    recurrenceEndDate: expenseFormValues.recurrenceEndDate,
    recurrenceOccurrences: expenseFormValues.recurrenceOccurrences,
    installmentAmountIsTotal: expenseFormValues.installmentAmountIsTotal,
    amount: expenseFormValues.amount,
    originalAmount: expenseFormValues.originalAmount,
  })
}

/**
 * The form values the first occurrence of a new series is saved with. They
 * are the ones entered, except for a purchase total paid in installments: the
 * first installment is only its part of that total.
 */
function getFirstOccurrenceFormValues(
  expenseFormValues: ExpenseFormValues,
  series: SeriesSettings | null,
): ExpenseFormValues {
  if (!series || series.totalAmount == null) return expenseFormValues

  const count = series.occurrenceCount ?? 1
  if (getInstallmentAmounts(series.totalAmount, count).some((a) => a === 0))
    throw new Error(
      `The amount is too small to be paid in ${count} installments`,
    )

  const occurrence = getOccurrenceValues(
    {
      amount: expenseFormValues.amount,
      originalAmount: expenseFormValues.originalAmount ?? null,
      splitMode: expenseFormValues.splitMode,
      paidFor: expenseFormValues.paidFor.map((paidFor) => ({
        ...paidFor,
        participantId: paidFor.participant,
      })),
    },
    series,
    1,
  )
  return {
    ...expenseFormValues,
    amount: occurrence.amount,
    originalAmount: occurrence.originalAmount ?? undefined,
    paidFor: occurrence.paidFor.map(({ participantId, ...paidFor }) => ({
      ...paidFor,
      participant: participantId,
    })),
  }
}

export async function deleteExpense(
  groupId: string,
  expenseId: string,
  participantId?: string,
) {
  const existingExpense = await getExpense(groupId, expenseId)
  await logActivity(groupId, ActivityType.DELETE_EXPENSE, {
    participantId,
    expenseId,
    data: existingExpense?.title,
  })

  await prisma.expense.delete({
    where: { id: expenseId },
    include: { paidFor: true, paidBy: true },
  })

  // A series whose every occurrence was deleted has nothing left to describe.
  if (existingExpense?.seriesId) {
    await prisma.recurringSeries.deleteMany({
      where: { id: existingExpense.seriesId, expenses: { none: {} } },
    })
  }
}

// Instead of deleting a group and all its data right away, it is scheduled for
// deletion, and can be restored during this grace period. Once it is over, the
// group is purged by src/lib/group-deletion.ts.
const GROUP_DELETION_GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000

export async function scheduleGroupDeletion(
  groupId: string,
  groupName: string,
  participantId?: string,
) {
  // A single conditional update, so that two concurrent requests cannot both
  // succeed, nor push the deletion date back.
  const { count } = await prisma.group.updateMany({
    where: { id: groupId, name: groupName, deleteAt: null },
    data: { deleteAt: new Date(Date.now() + GROUP_DELETION_GRACE_PERIOD_MS) },
  })
  if (count === 0) {
    const group = await getGroup(groupId)
    if (!group) throw new Error('Invalid group ID')
    if (group.deleteAt)
      throw new Error('Group is already scheduled for deletion')
    throw new Error('Group name does not match')
  }

  await logActivity(groupId, ActivityType.SCHEDULE_GROUP_DELETION, {
    participantId,
  })
}

export async function restoreGroup(groupId: string, participantId?: string) {
  // Once its deletion date has passed, the group may be being purged: it can
  // no longer be restored.
  const { count } = await prisma.group.updateMany({
    where: { id: groupId, deleteAt: { gt: new Date() } },
    data: { deleteAt: null },
  })
  if (count === 0)
    throw new Error(
      'Group is not scheduled for deletion, or can no longer be restored',
    )

  await logActivity(groupId, ActivityType.RESTORE_GROUP, { participantId })
}

export async function getGroupExpensesParticipants(groupId: string) {
  const [payers, paidFor] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId },
      distinct: ['paidById'],
      select: { paidById: true },
    }),
    prisma.expensePaidFor.findMany({
      where: { expense: { groupId } },
      distinct: ['participantId'],
      select: { participantId: true },
    }),
  ])

  return Array.from(
    new Set([
      ...payers.map((expense) => expense.paidById),
      ...paidFor.map((row) => row.participantId),
    ]),
  )
}

export async function getGroups(groupIds: string[]) {
  return (
    await prisma.group.findMany({
      where: { id: { in: groupIds } },
      include: { _count: { select: { participants: true } } },
    })
  ).map((group) => ({
    ...group,
    createdAt: group.createdAt.toISOString(),
  }))
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  expenseFormValues: ExpenseFormValues,
  participantId?: string,
) {
  const group = await getGroup(groupId)
  if (!group) throw new Error(`Invalid group ID: ${groupId}`)

  const existingExpense = await getExpense(groupId, expenseId)
  if (!existingExpense) throw new Error(`Invalid expense ID: ${expenseId}`)

  for (const participant of [
    expenseFormValues.paidBy,
    ...expenseFormValues.paidFor.map((p) => p.participant),
  ]) {
    if (!group.participants.some((p) => p.id === participant))
      throw new Error(`Invalid participant ID: ${participant}`)
  }

  await logActivity(groupId, ActivityType.UPDATE_EXPENSE, {
    participantId,
    expenseId,
    data: expenseFormValues.title,
  })

  const plan = planSeriesUpdate(existingExpense, expenseFormValues, groupId)
  const values = plan.values

  return prisma.$transaction(async (transaction) => {
    if (plan.createSeries) {
      await transaction.recurringSeries.create({ data: plan.createSeries })
    }
    if (plan.updateSeries) {
      await transaction.recurringSeries.update(plan.updateSeries)
    }

    return transaction.expense.update({
      where: { id: expenseId },
      data: {
        expenseDate: values.expenseDate,
        amount: values.amount,
        originalAmount: values.originalAmount,
        originalCurrency: values.originalCurrency,
        conversionRate: values.conversionRate,
        title: values.title,
        categoryId: values.category,
        paidById: values.paidBy,
        splitMode: values.splitMode,
        recurrenceRule: plan.recurrenceRule,
        seriesId: plan.seriesId,
        occurrenceNumber: plan.occurrenceNumber,
        paidFor: {
          create: values.paidFor
            .filter(
              (p) =>
                !existingExpense.paidFor.some(
                  (pp) => pp.participantId === p.participant,
                ),
            )
            .map((paidFor) => ({
              participantId: paidFor.participant,
              shares: paidFor.shares,
            })),
          update: values.paidFor.map((paidFor) => ({
            where: {
              expenseId_participantId: {
                expenseId,
                participantId: paidFor.participant,
              },
            },
            data: {
              shares: paidFor.shares,
            },
          })),
          deleteMany: existingExpense.paidFor.filter(
            (paidFor) =>
              !values.paidFor.some(
                (pf) => pf.participant === paidFor.participantId,
              ),
          ),
        },
        recurringExpenseLink: plan.link,
        isReimbursement: values.isReimbursement,
        documents: {
          connectOrCreate: values.documents.map((doc) => ({
            create: doc,
            where: { id: doc.id },
          })),
          deleteMany: existingExpense.documents
            .filter(
              (existingDoc) =>
                !values.documents.some((doc) => doc.id === existingDoc.id),
            )
            .map((doc) => ({
              id: doc.id,
            })),
        },
        notes: values.notes,
      },
    })
  })
}

type SeriesUpdatePlan = {
  /** The form values to save, adjusted for a new installment plan. */
  values: ExpenseFormValues
  recurrenceRule: RecurrenceRule | null
  seriesId: string | null
  occurrenceNumber: number | null
  createSeries?: SeriesSettings & { id: string; groupId: string }
  updateSeries?: { where: { id: string }; data: Partial<SeriesSettings> }
  link:
    | {}
    | { delete: true }
    | {
        upsert: {
          create: RecurringExpenseLink
          update: {
            nextExpenseDate: Date
            anchorDay: number | null
            nextExpenseCreatedAt: null
          }
        }
      }
}

/**
 * What saving an expense changes in its recurrence.
 *
 * Only the latest occurrence of a series steers it: from there the series can
 * be stopped, its schedule or end changed, or (for an expense that did not
 * repeat) a series started. Earlier occurrences are in the past, and keep the
 * recurrence they were created with. An installment plan keeps the number of
 * installments and the total it was created with; it can still be stopped.
 */
function planSeriesUpdate(
  existingExpense: NonNullable<Awaited<ReturnType<typeof getExpense>>>,
  expenseFormValues: ExpenseFormValues,
  groupId: string,
): SeriesUpdatePlan {
  const link = existingExpense.recurringExpenseLink
  const series = existingExpense.series
  const lastOccurrenceNumber = (series?.expenses ?? []).reduce(
    (max, expense) => Math.max(max, expense.occurrenceNumber ?? 0),
    0,
  )
  const isSeriesHead = series
    ? (existingExpense.occurrenceNumber ?? 0) >= lastOccurrenceNumber
    : !(link && link.nextExpenseCreatedAt !== null)

  const plan: SeriesUpdatePlan = {
    values: expenseFormValues,
    recurrenceRule: existingExpense.recurrenceRule,
    seriesId: existingExpense.seriesId,
    occurrenceNumber: existingExpense.occurrenceNumber,
    link: {},
  }
  if (!isSeriesHead) return plan

  const recurrenceRule = expenseFormValues.recurrenceRule
  plan.recurrenceRule = recurrenceRule
  if (recurrenceRule === RecurrenceRule.NONE) {
    // Stopping the series here. The expense stays numbered in its series.
    if (link) plan.link = { delete: true }
    return plan
  }

  let bounds: { endDate: Date | null; occurrenceCount: number | null }
  if (!series) {
    // An expense that did not repeat starts a series, as if created now.
    const settings = getSeriesSettingsFromForm(expenseFormValues)!
    plan.values = getFirstOccurrenceFormValues(expenseFormValues, settings)
    plan.seriesId = randomId()
    plan.occurrenceNumber = 1
    plan.createSeries = { id: plan.seriesId, groupId, ...settings }
    bounds = settings
  } else if (series.kind === 'INSTALLMENTS') {
    bounds = series
  } else {
    const settings = getSeriesSettingsFromForm({
      ...expenseFormValues,
      seriesKind: 'RECURRING',
    })!
    plan.updateSeries = {
      where: { id: series.id },
      data: {
        endDate: settings.endDate,
        occurrenceCount: settings.occurrenceCount,
      },
    }
    bounds = settings
  }

  // Keep the stored schedule (and the day of month it is anchored on) unless
  // the rule or the date changed.
  const expenseDateChanged =
    existingExpense.expenseDate.toISOString().slice(0, 10) !==
    expenseFormValues.expenseDate.toISOString().slice(0, 10)
  const scheduleChanged =
    !link ||
    existingExpense.recurrenceRule !== recurrenceRule ||
    expenseDateChanged
  const anchorDay =
    !scheduleChanged && link?.anchorDay != null
      ? link.anchorDay
      : usesAnchorDay(recurrenceRule)
        ? expenseFormValues.expenseDate.getUTCDate()
        : null
  const nextExpenseDate =
    !scheduleChanged && link
      ? link.nextExpenseDate
      : nextRecurringDate(
          recurrenceRule,
          expenseFormValues.expenseDate,
          anchorDay,
        )

  if (
    isWithinSeries(bounds, (plan.occurrenceNumber ?? 1) + 1, nextExpenseDate)
  ) {
    // Also reopens a series whose following occurrence was deleted.
    plan.link = {
      upsert: {
        create: {
          id: randomId(),
          groupId,
          nextExpenseDate,
          anchorDay,
        } as RecurringExpenseLink,
        update: { nextExpenseDate, anchorDay, nextExpenseCreatedAt: null },
      },
    }
  } else if (link) {
    // The series ends with this occurrence.
    plan.link = { delete: true }
  }
  return plan
}

export async function updateGroup(
  groupId: string,
  groupFormValues: GroupFormValues,
  participantId?: string,
) {
  const existingGroup = await getGroup(groupId)
  if (!existingGroup) throw new Error('Invalid group ID')

  await logActivity(groupId, ActivityType.UPDATE_GROUP, { participantId })

  return prisma.group.update({
    where: { id: groupId },
    data: {
      name: groupFormValues.name,
      information: groupFormValues.information,
      currency: groupFormValues.currency,
      currencyCode: groupFormValues.currencyCode,
      participants: {
        deleteMany: existingGroup.participants.filter(
          (p) => !groupFormValues.participants.some((p2) => p2.id === p.id),
        ),
        updateMany: groupFormValues.participants
          .filter((participant) => participant.id !== undefined)
          .map((participant) => ({
            where: { id: participant.id },
            data: {
              name: participant.name,
            },
          })),
        createMany: {
          data: groupFormValues.participants
            .filter((participant) => participant.id === undefined)
            .map((participant) => ({
              id: randomId(),
              name: participant.name,
            })),
        },
      },
    },
  })
}

export async function getGroup(groupId: string) {
  return prisma.group.findUnique({
    where: { id: groupId },
    include: { participants: true },
  })
}

export async function getCategories() {
  return prisma.category.findMany()
}

export async function getGroupExpenses(
  groupId: string,
  options?: { offset?: number; length?: number; filter?: string },
) {
  await createRecurringExpenses()

  return prisma.expense.findMany({
    select: {
      amount: true,
      category: true,
      createdAt: true,
      expenseDate: true,
      id: true,
      isReimbursement: true,
      originalAmount: true,
      originalCurrency: true,
      paidBy: { select: { id: true, name: true } },
      paidFor: {
        select: {
          participant: { select: { id: true, name: true } },
          shares: true,
        },
      },
      splitMode: true,
      recurrenceRule: true,
      occurrenceNumber: true,
      series: {
        select: {
          id: true,
          kind: true,
          occurrenceCount: true,
          totalAmount: true,
        },
      },
      title: true,
      _count: { select: { documents: true } },
    },
    where: {
      groupId,
      // Search matches the title or the notes (#601).
      OR: options?.filter
        ? [
            { title: { contains: options.filter, mode: 'insensitive' } },
            { notes: { contains: options.filter, mode: 'insensitive' } },
          ]
        : undefined,
    },
    orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    skip: options && options.offset,
    take: options && options.length,
  })
}

export async function getGroupExpenseCount(groupId: string) {
  return prisma.expense.count({ where: { groupId } })
}

/**
 * Returns the currently active recurring expenses of a group: the latest frame
 * of every ongoing recurring series. Each materialized frame keeps its own
 * `recurringExpenseLink`, but only the current frame's link is still "open"
 * (`nextExpenseCreatedAt` is null) — past frames have it set once their
 * successor is created (see `createRecurringExpenses`). Filtering on the open
 * link ensures a single subscription is counted only once. Used for recurring
 * stats (#508).
 */
export async function getActiveRecurringExpenses(groupId: string) {
  await createRecurringExpenses()

  return prisma.expense.findMany({
    select: {
      id: true,
      title: true,
      amount: true,
      category: true,
      recurrenceRule: true,
      isReimbursement: true,
    },
    where: {
      groupId,
      isReimbursement: false,
      recurrenceRule: { not: RecurrenceRule.NONE },
      recurringExpenseLink: { is: { nextExpenseCreatedAt: null } },
    },
    orderBy: { amount: 'desc' },
  })
}

export async function getExpense(groupId: string, expenseId: string) {
  return prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      paidBy: true,
      paidFor: true,
      category: true,
      documents: true,
      recurringExpenseLink: true,
      series: {
        include: {
          expenses: {
            select: {
              id: true,
              expenseDate: true,
              occurrenceNumber: true,
              amount: true,
            },
            orderBy: [{ occurrenceNumber: 'asc' }, { expenseDate: 'asc' }],
          },
        },
      },
    },
  })
}

export async function getActivities(
  groupId: string,
  options?: { offset?: number; length?: number },
) {
  const activities = await prisma.activity.findMany({
    where: { groupId },
    orderBy: [{ time: 'desc' }],
    skip: options?.offset,
    take: options?.length,
  })

  const expenseIds = activities
    .map((activity) => activity.expenseId)
    .filter(Boolean)
  const expenses = await prisma.expense.findMany({
    where: {
      groupId,
      id: { in: expenseIds },
    },
  })

  return activities.map((activity) => ({
    ...activity,
    expense:
      activity.expenseId !== null
        ? expenses.find((expense) => expense.id === activity.expenseId)
        : undefined,
  }))
}

export async function logActivity(
  groupId: string,
  activityType: ActivityType,
  extra?: { participantId?: string; expenseId?: string; data?: string },
) {
  return prisma.activity.create({
    data: {
      id: randomId(),
      groupId,
      activityType,
      ...extra,
    },
  })
}

async function createRecurringExpenses() {
  const localDate = new Date() // Current local date
  const utcDateFromLocal = new Date(
    Date.UTC(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate(),
      // More precision beyond date is required to ensure that recurring Expenses are created within <most precises unit> of when expected
      localDate.getUTCHours(),
      localDate.getUTCMinutes(),
    ),
  )

  const recurringExpenseLinksWithExpensesToCreate =
    await prisma.recurringExpenseLink.findMany({
      where: {
        nextExpenseCreatedAt: null,
        nextExpenseDate: {
          lte: utcDateFromLocal,
        },
      },
      include: {
        currentFrameExpense: {
          include: {
            paidBy: true,
            paidFor: true,
            category: true,
            documents: true,
            series: true,
          },
        },
      },
    })

  for (const recurringExpenseLink of recurringExpenseLinksWithExpensesToCreate) {
    let newExpenseDate = recurringExpenseLink.nextExpenseDate

    let currentExpenseRecord = recurringExpenseLink.currentFrameExpense
    let currentReccuringExpenseLinkId = recurringExpenseLink.id
    const series = currentExpenseRecord.series
    const anchorDay =
      recurringExpenseLink.anchorDay ??
      (usesAnchorDay(currentExpenseRecord.recurrenceRule)
        ? currentExpenseRecord.expenseDate.getUTCDate()
        : null)

    while (newExpenseDate < utcDateFromLocal) {
      const recurrenceRule = currentExpenseRecord.recurrenceRule

      if (recurrenceRule === null || recurrenceRule === RecurrenceRule.NONE)
        break

      const occurrenceNumber =
        currentExpenseRecord.occurrenceNumber != null
          ? currentExpenseRecord.occurrenceNumber + 1
          : null

      // The series ended before this occurrence (its end was moved since the
      // link was created): close the link instead.
      if (!isWithinSeries(series, occurrenceNumber, newExpenseDate)) {
        await prisma.recurringExpenseLink.deleteMany({
          where: {
            id: currentReccuringExpenseLinkId,
            nextExpenseCreatedAt: null,
          },
        })
        break
      }

      const newExpenseId = randomId()
      const newRecurringExpenseLinkId = randomId()

      const newRecurringExpenseNextExpenseDate = nextRecurringDate(
        recurrenceRule,
        newExpenseDate,
        anchorDay,
      )
      // The last occurrence of a series gets no link: nothing follows it.
      const hasNextOccurrence = isWithinSeries(
        series,
        occurrenceNumber != null ? occurrenceNumber + 1 : null,
        newRecurringExpenseNextExpenseDate,
      )

      const {
        category,
        paidBy,
        paidFor,
        documents,
        series: _series,
        ...destructeredCurrentExpenseRecord
      } = currentExpenseRecord

      // An installment of a purchase total has its own part of the total.
      const occurrenceValues = getOccurrenceValues(
        {
          amount: currentExpenseRecord.amount,
          originalAmount: currentExpenseRecord.originalAmount,
          splitMode: currentExpenseRecord.splitMode,
          paidFor: currentExpenseRecord.paidFor,
        },
        series,
        occurrenceNumber,
      )

      // Use a transacton to ensure that the only one expense is created for the RecurringExpenseLink
      // just in case two clients are processing the same RecurringExpenseLink at the same time
      const newExpense = await prisma
        .$transaction(async (transaction) => {
          const newExpense = await transaction.expense.create({
            data: {
              ...destructeredCurrentExpenseRecord,
              amount: occurrenceValues.amount,
              originalAmount: occurrenceValues.originalAmount,
              occurrenceNumber,
              categoryId: currentExpenseRecord.categoryId,
              paidById: currentExpenseRecord.paidById,
              paidFor: {
                createMany: {
                  data: occurrenceValues.paidFor.map((paidFor) => ({
                    participantId: paidFor.participantId,
                    shares: paidFor.shares,
                  })),
                },
              },
              documents: {
                createMany: {
                  data: currentExpenseRecord.documents.map(
                    (documentRecord) => ({
                      id: randomId(),
                      url: documentRecord.url,
                      width: documentRecord.width,
                      height: documentRecord.height,
                    }),
                  ),
                },
              },
              id: newExpenseId,
              expenseDate: newExpenseDate,
              recurringExpenseLink: hasNextOccurrence
                ? {
                    create: {
                      groupId: currentExpenseRecord.groupId,
                      id: newRecurringExpenseLinkId,
                      nextExpenseDate: newRecurringExpenseNextExpenseDate,
                      anchorDay,
                    },
                  }
                : undefined,
            },
            // Ensure that the same information is available on the returned record that was created
            include: {
              paidFor: true,
              documents: true,
              category: true,
              paidBy: true,
              series: true,
            },
          })

          // Mark the RecurringExpenseLink as being "completed" since the new Expense was created
          // if an expense hasn't been created for this RecurringExpenseLink yet
          await transaction.recurringExpenseLink.update({
            where: {
              id: currentReccuringExpenseLinkId,
              nextExpenseCreatedAt: null,
            },
            data: {
              nextExpenseCreatedAt: newExpense.createdAt,
              anchorDay,
            },
          })

          return newExpense
        })
        .catch(() => {
          console.error(
            'Failed to created recurringExpense for expenseId: %s',
            currentExpenseRecord.id,
          )
          return null
        })

      // If the new expense failed to be created, break out of the while-loop
      if (newExpense === null) break
      if (!hasNextOccurrence) break

      // Set the values for the next iteration of the for-loop in case multiple recurring Expenses need to be created
      currentExpenseRecord = newExpense
      currentReccuringExpenseLinkId = newRecurringExpenseLinkId
      newExpenseDate = newRecurringExpenseNextExpenseDate
    }
  }
}

export type ProjectedExpense = Awaited<
  ReturnType<typeof getProjectedExpenses>
>[number]

/**
 * The occurrences that the group's recurring expenses and installment plans
 * will create from now until `until` (inclusive), as they will be once
 * created. Nothing is saved: they are what the monthly report shows as
 * expected, and they are created for real on their date.
 */
export async function getProjectedExpenses(
  groupId: string,
  until: Date,
  options?: { seriesKind?: 'RECURRING' | 'INSTALLMENTS' },
) {
  await createRecurringExpenses()

  const links = await prisma.recurringExpenseLink.findMany({
    where: {
      groupId,
      nextExpenseCreatedAt: null,
      ...(options?.seriesKind
        ? { currentFrameExpense: { series: { kind: options.seriesKind } } }
        : {}),
    },
    include: {
      currentFrameExpense: {
        include: {
          category: true,
          paidBy: { select: { id: true, name: true } },
          paidFor: {
            include: { participant: { select: { id: true, name: true } } },
          },
          series: true,
        },
      },
    },
  })

  return links.flatMap((link) => {
    const frame = link.currentFrameExpense
    const rule = frame.recurrenceRule
    if (rule === null || rule === RecurrenceRule.NONE) return []

    const occurrences = projectOccurrences({
      rule,
      nextDate: link.nextExpenseDate,
      anchorDay:
        link.anchorDay ??
        (usesAnchorDay(rule) ? frame.expenseDate.getUTCDate() : null),
      nextOccurrenceNumber:
        frame.occurrenceNumber != null ? frame.occurrenceNumber + 1 : null,
      bounds: frame.series,
      until,
    })

    return occurrences.map(({ occurrenceNumber, date }) => {
      const values = getOccurrenceValues(
        {
          amount: frame.amount,
          originalAmount: frame.originalAmount,
          splitMode: frame.splitMode,
          paidFor: frame.paidFor,
        },
        frame.series,
        occurrenceNumber,
      )
      return {
        id: `${frame.id}:${occurrenceNumber ?? date.toISOString().slice(0, 10)}`,
        sourceExpenseId: frame.id,
        title: frame.title,
        category: frame.category,
        expenseDate: date,
        amount: values.amount,
        originalAmount: values.originalAmount,
        originalCurrency: frame.originalCurrency,
        isReimbursement: frame.isReimbursement,
        splitMode: frame.splitMode,
        recurrenceRule: rule,
        occurrenceNumber,
        series: frame.series
          ? {
              id: frame.series.id,
              kind: frame.series.kind,
              occurrenceCount: frame.series.occurrenceCount,
              totalAmount: frame.series.totalAmount,
            }
          : null,
        paidBy: frame.paidBy,
        paidFor: values.paidFor.map(({ participant, shares }) => ({
          participant,
          shares,
        })),
      }
    })
  })
}

function createPayloadForNewRecurringExpenseLink(
  recurrenceRule: RecurrenceRule,
  priorDateToNextRecurrence: Date,
  groupId: String,
): RecurringExpenseLink {
  const anchorDay = usesAnchorDay(recurrenceRule)
    ? priorDateToNextRecurrence.getUTCDate()
    : null
  const nextExpenseDate = nextRecurringDate(
    recurrenceRule,
    priorDateToNextRecurrence,
    anchorDay,
  )

  const recurringExpenseLinkId = randomId()
  const recurringExpenseLinkPayload = {
    id: recurringExpenseLinkId,
    groupId: groupId,
    nextExpenseDate: nextExpenseDate,
    anchorDay,
  }

  return recurringExpenseLinkPayload as RecurringExpenseLink
}
