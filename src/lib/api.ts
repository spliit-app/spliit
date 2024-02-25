import { getPrisma } from '@/lib/prisma'
import { ExpenseFormValues, GroupFormValues } from '@/lib/schemas'
import { Expense } from '@prisma/client'
import { nanoid } from 'nanoid'

export function randomId() {
  return nanoid()
}

export async function createGroup(groupFormValues: GroupFormValues) {
  const prisma = await getPrisma()
  return prisma.group.create({
    data: {
      id: randomId(),
      name: groupFormValues.name,
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

export async function createExpense(
  expenseFormValues: ExpenseFormValues,
  groupId: string,
  expenseRef: string|null = null
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
  const prisma = await getPrisma()
  let expenseDate = expenseFormValues.expenseDate
  if (+expenseFormValues.recurringDays) {
    const nextAt: number = Math.floor((new Date(expenseDate)).getTime() / 1000) + (+expenseFormValues.recurringDays * 86400)
    if (!isNaN(nextAt)) {
      if (expenseRef) {
        expenseDate = new Date(nextAt*1000)
        await prisma.recurringTransactions.updateMany({
          where: {
            groupId,
            expenseId: expenseRef
          },
          data: {
            createNextAt: nextAt,
            expenseId
          }
        })
      } else {
        await prisma.recurringTransactions.create({
          data: {
            groupId,
            expenseId,
            createNextAt: nextAt,
            lockId: null
          }
        })
      }
    }
  }

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
      isArchive: false,
    },
  })
}

export async function deleteExpense(expenseId: string) {
  const prisma = await getPrisma()
  await prisma.expense.delete({
    where: { id: expenseId },
    include: { paidFor: true, paidBy: true },
  })
}

export async function getGroupExpensesParticipants(groupId: string) {
  const expenses = await getGroupExpenses(groupId)
  return Array.from(
    new Set(
      expenses.flatMap((e) => [
        e.paidById,
        ...e.paidFor.map((pf) => pf.participantId),
      ]),
    ),
  )
}

export async function getGroups(groupIds: string[]) {
  const prisma = await getPrisma()
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

  const prisma = await getPrisma()
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
    },
  })
}

export async function updateGroup(
  groupId: string,
  groupFormValues: GroupFormValues,
) {
  const existingGroup = await getGroup(groupId)
  if (!existingGroup) throw new Error('Invalid group ID')

  const prisma = await getPrisma()
  return prisma.group.update({
    where: { id: groupId },
    data: {
      name: groupFormValues.name,
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
  const prisma = await getPrisma()
  return prisma.group.findUnique({
    where: { id: groupId },
    include: { participants: true },
  })
}

export async function getCategories() {
  const prisma = await getPrisma()
  return prisma.category.findMany()
}

export async function getGroupExpenses(groupId: string) {
  const now: number = Math.floor((new Date()).getTime() / 1000)
  const prisma = await getPrisma()

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
      const lockId =  randomId()
      if (now < new Date(relatedExpenses[i].expenseDate).getTime()/1000 + (+relatedExpenses[i].recurringDays * 86400)) {
        ignoreExpenseId.push(relatedExpenses[i].id)
        continue
      }
      await prisma.recurringTransactions.updateMany({
        where: {
          groupId,
          expenseId: relatedExpenses[i].id,
          lockId: null
        },
        data: {
          lockId
        }
      })
      const getRecTxn = await prisma.recurringTransactions.findMany({
        where: {
          expenseId: relatedExpenses[i].id,
          groupId,
          lockId
        }
      })
      if (getRecTxn.length) {
        const newExpense = await createExpense({
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
          isArchive: relatedExpenses[i].isArchive,
        }, groupId, relatedExpenses[i].id);
        await prisma.recurringTransactions.updateMany({
          where: {
            groupId,
            expenseId: newExpense.id,
          },
          data: {
            lockId: null
          }
        })
      }
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
    where: { groupId },
    include: {
      paidFor: { include: { participant: true } },
      paidBy: true,
      category: true,
    },
    orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function getExpense(groupId: string, expenseId: string) {
  const prisma = await getPrisma()
  return prisma.expense.findUnique({
    where: { id: expenseId },
    include: { paidBy: true, paidFor: true, category: true, documents: true },
  })
}
