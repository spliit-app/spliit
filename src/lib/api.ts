import { prisma } from '@/lib/prisma'
import { ExpenseFormValues, GroupFormValues } from '@/lib/schemas'
import { ActivityType, Expense, RecurringTransactions } from '@prisma/client'
import { nanoid } from 'nanoid'
import { getEpochTimeInSeconds } from "./utils";

const secondsInADay = 86400
function sleep(duration: number) {
  return new Promise((resolve: any) => {
    setTimeout(resolve, duration)
  })
}

export function randomId() {
  return nanoid()
}

export async function createGroup(groupFormValues: GroupFormValues) {
  return prisma.group.create({
    data: {
      id: randomId(),
      name: groupFormValues.name,
      information: groupFormValues.information,
      currency: groupFormValues.currency,
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

/*

Locking is necessary to avoid race condition:
if two people fetch expenses at the same time, APIs of both will result in fetching of pending transactions and inserting in DB.
Hence Double insertions for the pending transaction.

Same condition will be there for update. One person is updating the transaction and other is inserting in DB.

Locking ensures consistency and correctness.

Retrying is there to retry acquiring locks after some time if it was acquired by someone else at that instant.
Discussion: https://github.com/spliit-app/spliit/pull/114/files#r1559974206
*/

export async function acquireLockRecurringTransaction(groupId:string, expenseId:string, lockId: string): Promise<RecurringTransactions[]> {
  let retryCnt = 5
  let getRecTxn:RecurringTransactions[] = []
  while(--retryCnt) {
    const existingLock = await prisma.recurringTransactions.findMany({
      where: {
        groupId,
        expenseId
      }
    })
    if (!existingLock.length) {
      const query = `
        INSERT INTO "RecurringTransactions"
          ("groupId", "expenseId", "createNextAt", "lockId")
          VALUES
          ('${groupId}', '${expenseId}', 0, '${lockId}')
          ON CONFLICT("groupId", "expenseId")
          DO NOTHING;
      `
      await prisma.$queryRawUnsafe(query)
    }
    await prisma.recurringTransactions.updateMany({
      where: {
          groupId,
          expenseId,
          lockId: null
      },
      data: {
        lockId
      }
    })
    getRecTxn = await prisma.recurringTransactions.findMany({
      where: {
        expenseId: expenseId,
        groupId,
        lockId
      }
    })
    const receivedLockId = getRecTxn?.[0]?.lockId
    if (receivedLockId === lockId) break;
    await sleep(500);
  }
  return getRecTxn
}

export async function releaseLockRecurringTransaction(groupId:string, expenseId:string, lockId: string): Promise<void>{
  await prisma.recurringTransactions.updateMany({
    where: {
      groupId,
      expenseId: expenseId,
      lockId,
    },
    data: {
      lockId: null
    }
  })
}

export async function createOrUpdateRecurringTransaction(
  expenseFormValues: ExpenseFormValues,
  groupId: string,
  expenseId: string,
  expenseRef: string|null = null
): Promise<RecurringTransactions | undefined> {
  let expenseDate = expenseFormValues.expenseDate
  if (!+expenseFormValues.recurringDays) {
    await prisma.recurringTransactions.deleteMany({
      where: {
        groupId,
        expenseId: expenseRef || expenseId
      }
    })
    return Promise.resolve(undefined)
  }
  const lockId:string = randomId();
  const receivedLockId = (await acquireLockRecurringTransaction(groupId, expenseRef || expenseId, lockId))?.[0]?.lockId
  let recTxn;
  if (!receivedLockId) return recTxn
  const epochTime = getEpochTimeInSeconds(expenseDate)
  const nextAt: number = epochTime + (+expenseFormValues.recurringDays * secondsInADay)
  if (!isNaN(nextAt)) {
    if (expenseRef) {
      expenseDate = new Date(nextAt*1000)
      await prisma.recurringTransactions.updateMany({
        where: {
          groupId,
          expenseId: expenseRef,
          lockId
        },
        data: {
          createNextAt: nextAt,
          expenseId
        }
      })
      recTxn = (await prisma.recurringTransactions.findMany({
        where: {
          groupId,
          expenseId
        }
      }))?.[0]
    } else {
      recTxn = await prisma.recurringTransactions.upsert({
        where: {
          groupId_expenseId: {
            groupId,
            expenseId: expenseId
          },
          lockId
        },
        update: {
          createNextAt: nextAt,
        },
        create: {
          groupId,
          expenseId,
          createNextAt: nextAt,
          lockId
        }
      })
    }
  }
  await releaseLockRecurringTransaction(groupId, expenseId, lockId)
  return recTxn;
}

export async function createExpense(
  expenseFormValues: ExpenseFormValues,
  groupId: string,
  expenseRef: string|null = null,
  participantId?: string,
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
  const expenseId = randomId()
  let expenseDate = expenseFormValues.expenseDate
  const recurringTxn = await createOrUpdateRecurringTransaction(expenseFormValues, groupId, expenseId, expenseRef)
  if (recurringTxn) {
    expenseDate = new Date(recurringTxn.createNextAt*1000)

  }

  await logActivity(groupId, ActivityType.CREATE_EXPENSE, {
    participantId,
    expenseId,
    data: expenseFormValues.title,
  })

  await logActivity(groupId, ActivityType.CREATE_EXPENSE, {
    participantId,
    expenseId,
    data: expenseFormValues.title,
  })

  return prisma.expense.create({
    data: {
      id: expenseId,
      groupId,
      expenseDate: expenseDate,
      categoryId: expenseFormValues.category,
      amount: expenseFormValues.amount,
      title: expenseFormValues.title,
      paidById: expenseFormValues.paidBy,
      splitMode: expenseFormValues.splitMode,
      paidFor: {
        createMany: {
          data: expenseFormValues.paidFor.map((paidFor) => ({
            participantId: paidFor.participant,
            shares: paidFor.shares,
          })),
        },
      },
      isReimbursement: expenseFormValues.isReimbursement,
      documents: {
        createMany: {
          data: expenseFormValues.documents.map((doc) => ({
            id: randomId(),
            url: doc.url,
            width: doc.width,
            height: doc.height,
          })),
        },
      },
      notes: expenseFormValues.notes,
      recurringDays: +expenseFormValues.recurringDays,
    },
  })
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

  const lockId = randomId()
  const recurringTxns = await prisma.recurringTransactions.findMany({
    where: {groupId, expenseId}
  })
  const receivedRecurringTxn = () => acquireLockRecurringTransaction(groupId, expenseId, lockId)
  if (recurringTxns.length && (await receivedRecurringTxn())?.[0]?.lockId) {
    await prisma.recurringTransactions.deleteMany({
      where: {groupId, expenseId}
    })
  }
  await releaseLockRecurringTransaction(groupId, expenseId, lockId)
  await prisma.expense.delete({
    where: { id: expenseId, groupId },
    include: { paidFor: true, paidBy: true },
  })
}

export async function getGroupExpensesParticipants(groupId: string) {
  const expenses = await getGroupExpenses(groupId)
  return Array.from(
    new Set(
      expenses.flatMap((e) => [
        e.paidBy.id,
        ...e.paidFor.map((pf) => pf.participant.id),
      ]),
    ),
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
  await createOrUpdateRecurringTransaction(expenseFormValues, groupId, expenseId, expenseId)

  await logActivity(groupId, ActivityType.UPDATE_EXPENSE, {
    participantId,
    expenseId,
    data: expenseFormValues.title,
  })

  await logActivity(groupId, ActivityType.UPDATE_EXPENSE, {
    participantId,
    expenseId,
    data: expenseFormValues.title,
  })

  return prisma.expense.update({
    where: { id: expenseId },
    data: {
      expenseDate: expenseFormValues.expenseDate,
      amount: expenseFormValues.amount,
      title: expenseFormValues.title,
      categoryId: expenseFormValues.category,
      paidById: expenseFormValues.paidBy,
      splitMode: expenseFormValues.splitMode,
      paidFor: {
        create: expenseFormValues.paidFor
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
        update: expenseFormValues.paidFor.map((paidFor) => ({
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
            !expenseFormValues.paidFor.some(
              (pf) => pf.participant === paidFor.participantId,
            ),
        ),
      },
      isReimbursement: expenseFormValues.isReimbursement,
      documents: {
        connectOrCreate: expenseFormValues.documents.map((doc) => ({
          create: doc,
          where: { id: doc.id },
        })),
        deleteMany: existingExpense.documents
          .filter(
            (existingDoc) =>
              !expenseFormValues.documents.some(
                (doc) => doc.id === existingDoc.id,
              ),
          )
          .map((doc) => ({
            id: doc.id,
          })),
      },
      notes: expenseFormValues.notes,
      recurringDays: +expenseFormValues.recurringDays,
    },
  })
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

export async function getGroupExpenses(groupId: string, options?: { offset: number; length: number },) {
  const now: number = getEpochTimeInSeconds(null)

  let allPendingRecurringTxns = await prisma.recurringTransactions.findMany({
    where: {
      groupId,
      createNextAt: {
        lte: now
      },
      lockId: null
    }
  })
  let ignoreExpenseId = []
  while(allPendingRecurringTxns.length) {
    const relatedExpenses = await prisma.expense.findMany({
      where: {
        id: {
          in: allPendingRecurringTxns.map((rt) => rt.expenseId)
        },
        groupId,
      },
      include: {
        paidFor: { include: { participant: true } },
        paidBy: true,
        category: true,
        documents: true
      },
    })
    for (let i=0; i<relatedExpenses.length; ++i) {
      if (now < getEpochTimeInSeconds(relatedExpenses[i].expenseDate) + (+relatedExpenses[i].recurringDays * secondsInADay)) {
        ignoreExpenseId.push(relatedExpenses[i].id)
        continue
      }
      await createExpense({
        expenseDate: relatedExpenses[i].expenseDate,
        title: relatedExpenses[i].title,
        category: relatedExpenses[i].category?.id || 0,
        amount: relatedExpenses[i].amount,
        paidBy: relatedExpenses[i].paidBy.id,
        splitMode: relatedExpenses[i].splitMode,
        paidFor: relatedExpenses[i].paidFor
        .map((paidFor) =>  ({
          participant: paidFor.participant.id,
          shares: paidFor.shares,
        })),
        isReimbursement: relatedExpenses[i].isReimbursement,
        documents: relatedExpenses[i].documents,
        recurringDays: String(relatedExpenses[i].recurringDays),
      }, groupId, relatedExpenses[i].id);
    }
    allPendingRecurringTxns = await prisma.recurringTransactions.findMany({
      where: {
        groupId,
        createNextAt: {
          lte: now
        },
        expenseId: {
          notIn: ignoreExpenseId
        },
        lockId: null
      }
    })
  }

  return prisma.expense.findMany({
    select: {
      amount: true,
      category: true,
      createdAt: true,
      expenseDate: true,
      id: true,
      isReimbursement: true,
      paidBy: { select: { id: true, name: true } },
      paidFor: {
        select: {
          participant: { select: { id: true, name: true } },
          shares: true,
        },
      },
      splitMode: true,
      title: true,
    },
    where: { groupId },
    orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    skip: options && options.offset,
    take: options && options.length,
  })
}

export async function getGroupExpenseCount(groupId: string) {
  return prisma.expense.count({ where: { groupId } })
}

export async function getExpense(groupId: string, expenseId: string) {
  return prisma.expense.findUnique({
    where: { id: expenseId },
    include: { paidBy: true, paidFor: true, category: true, documents: true },
  })
}

export async function getActivities(groupId: string) {
  return prisma.activity.findMany({
    where: { groupId },
    orderBy: [{ time: 'desc' }],
  })
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
