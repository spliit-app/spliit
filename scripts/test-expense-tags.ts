import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { ExpenseFormValues } from '../src/lib/schemas'

async function main() {
  const url = process.env.TAG_TEST_DATABASE_URL
  assert(
    url && new URL(url).pathname.endsWith('_test'),
    'Set TAG_TEST_DATABASE_URL to a disposable database whose name ends in _test.',
  )
  process.env.POSTGRES_PRISMA_URL = url
  const { prisma } = await import('../src/lib/prisma')
  const { createExpense, deleteGroupTag, updateExpense, getGroupExpenses } =
    await import('../src/lib/api')
  const otherGroupId = randomUUID()
  const groupId = randomUUID()
  const participantId = randomUUID()
  const values = {
    expenseDate: new Date(),
    title: 'Tag integration',
    category: 0,
    amount: 1000,
    paidBy: participantId,
    paidFor: [{ participant: participantId, shares: 1 }],
    splitMode: 'EVENLY',
    isReimbursement: false,
    documents: [],
    recurrenceRule: 'NONE',
    saveDefaultSplittingOptions: false,
  } as ExpenseFormValues
  try {
    await prisma.group.create({
      data: {
        id: groupId,
        name: 'Tag integration',
        participants: { create: { id: participantId, name: 'Alice' } },
      },
    })
    const [first, second] = await Promise.all([
      createExpense({ ...values, tags: [{ name: 'Summer trip' }] }, groupId),
      createExpense({ ...values, tags: [{ name: 'summer TRIP' }] }, groupId),
    ])
    assert.equal(await prisma.tag.count({ where: { groupId } }), 1)
    const expenses = await getGroupExpenses(groupId, { includeTags: true })
    assert.equal(expenses.length, 2)
    assert.equal(expenses[0].tags[0].id, expenses[1].tags[0].id)
    await assert.rejects(
      createExpense(
        { ...values, tags: [{ name: 'Rollback' }] },
        groupId,
        undefined,
        first.id,
      ),
    )
    assert.equal(
      await prisma.tag.count({
        where: { groupId, normalizedName: 'rollback' },
      }),
      0,
    )
    assert.equal(await prisma.expense.count({ where: { groupId } }), 2)
    await updateExpense(groupId, second.id, { ...values, tags: [] })
    assert.equal(
      (
        await prisma.expense.findUniqueOrThrow({
          where: { id: second.id },
          include: { tags: true },
        })
      ).tags.length,
      0,
    )
    await updateExpense(groupId, first.id, values)
    assert.equal(
      (
        await prisma.expense.findUniqueOrThrow({
          where: { id: first.id },
          include: { tags: true },
        })
      ).tags.length,
      1,
    )
    assert(
      (await getGroupExpenses(groupId)).every(
        (expense) => expense.tags.length === 0,
      ),
    )
    await prisma.group.create({
      data: {
        id: otherGroupId,
        name: 'Other group',
        tags: {
          create: {
            id: randomUUID(),
            name: 'Summer trip',
            normalizedName: 'summer trip',
          },
        },
      },
    })
    const staleTags = expenses.find((expense) => expense.id === first.id)!.tags
    await deleteGroupTag(groupId, 'SUMMER trip')
    await deleteGroupTag(groupId, 'SUMMER trip')
    assert.equal(
      await prisma.tag.count({
        where: { groupId, normalizedName: 'summer trip' },
      }),
      0,
    )
    assert.equal(
      await prisma.tag.count({
        where: { groupId: otherGroupId, normalizedName: 'summer trip' },
      }),
      1,
    )
    const afterDeletion = await getGroupExpenses(groupId, { includeTags: true })
    assert.equal(afterDeletion.length, 2)
    assert.equal(
      afterDeletion.reduce((sum, expense) => sum + expense.amount, 0),
      2000,
    )
    assert(afterDeletion.every((expense) => expense.tags.length === 0))
    await updateExpense(groupId, first.id, { ...values, tags: staleTags })
    assert.equal(
      await prisma.tag.count({
        where: { groupId, normalizedName: 'summer trip' },
      }),
      0,
    )
    assert.equal(
      (await getGroupExpenses(groupId, { includeTags: true })).find(
        (expense) => expense.id === first.id,
      )!.tags.length,
      0,
    )
    await prisma.tag.createMany({
      data: Array.from({ length: 201 }, (_, i) => ({
        id: randomUUID(),
        groupId,
        name: `Tag ${i}`,
        normalizedName: `tag ${i}`,
      })),
    })
    await createExpense(
      { ...values, tags: [{ name: 'Still available' }] },
      groupId,
    )
    console.log(
      'Passed: migrated schema, concurrent deduplication, failed-save rollback, assignment clearing/preservation, stale-form save without resurrection, group-scoped deletion with assignment cleanup and unchanged expenses, opt-in loading, and vocabulary beyond 200 tags.',
    )
  } finally {
    await prisma.group.deleteMany({
      where: { id: { in: [groupId, otherGroupId] } },
    })
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
