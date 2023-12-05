import { getPrisma } from '@/lib/prisma'
import { ExpenseFormValues, GroupFormValues } from '@/lib/schemas'
import { Expense } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

export async function createGroup(groupFormValues: GroupFormValues) {
  return getPrisma().group.create({
    data: {
      id: uuidv4(),
      name: groupFormValues.name,
      participants: {
        createMany: {
          data: groupFormValues.participants.map(({ name }) => ({
            id: uuidv4(),
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
): Promise<Expense> {
  const group = await getGroup(groupId)
  if (!group) throw new Error(`Invalid group ID: ${groupId}`)

  for (const participant of [
    expenseFormValues.paidBy,
    ...expenseFormValues.paidFor,
  ]) {
    if (!group.participants.some((p) => p.id === participant))
      throw new Error(`Invalid participant ID: ${participant}`)
  }

  return getPrisma().expense.create({
    data: {
      id: uuidv4(),
      groupId,
      amount: expenseFormValues.amount,
      title: expenseFormValues.title,
      paidById: expenseFormValues.paidBy,
      paidFor: {
        createMany: {
          data: expenseFormValues.paidFor.map((paidFor) => ({
            participantId: paidFor,
          })),
        },
      },
    },
  })
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
    ...expenseFormValues.paidFor,
  ]) {
    if (!group.participants.some((p) => p.id === participant))
      throw new Error(`Invalid participant ID: ${participant}`)
  }

  return getPrisma().expense.update({
    where: { id: expenseId },
    data: {
      amount: expenseFormValues.amount,
      title: expenseFormValues.title,
      paidById: expenseFormValues.paidBy,
      paidFor: {
        connectOrCreate: expenseFormValues.paidFor.map((paidFor) => ({
          where: {
            expenseId_participantId: { expenseId, participantId: paidFor },
          },
          create: { participantId: paidFor },
        })),
        deleteMany: existingExpense.paidFor.filter(
          (paidFor) =>
            !expenseFormValues.paidFor.some(
              (pf) => pf === paidFor.participantId,
            ),
        ),
      },
    },
  })
}

export async function updateGroup(
  groupId: string,
  groupFormValues: GroupFormValues,
) {
  const existingGroup = await getGroup(groupId)
  if (!existingGroup) throw new Error('Invalid group ID')

  return getPrisma().group.update({
    where: { id: groupId },
    data: {
      name: groupFormValues.name,
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
              id: uuidv4(),
              name: participant.name,
            })),
        },
      },
    },
  })
}

export async function getGroup(groupId: string) {
  return getPrisma().group.findUnique({
    where: { id: groupId },
    include: { participants: true },
  })
}

export async function getGroupExpenses(groupId: string) {
  return getPrisma().expense.findMany({
    where: { groupId },
    include: { paidFor: { include: { participant: true } }, paidBy: true },
  })
}

export async function getExpense(groupId: string, expenseId: string) {
  return getPrisma().expense.findUnique({
    where: { id: expenseId },
    include: { paidBy: true, paidFor: true },
  })
}
