import {
  createGroup,
  getGroupsForUser,
  ParticipantInUseError,
  StaleParticipantError,
  updateGroup,
} from './api'
import { prisma } from './prisma'

jest.mock('./prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    activity: { create: jest.fn() },
    expense: { findMany: jest.fn() },
    expensePaidFor: { findMany: jest.fn() },
    group: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    groupMembership: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    participant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    paymentDue: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  },
}))

let mockIdCount = 0
jest.mock('./random', () => ({
  randomId: () => `random-id-${++mockIdCount}`,
}))

const prismaMock = prisma as unknown as {
  $transaction: jest.Mock
  activity: { create: jest.Mock }
  expense: { findMany: jest.Mock }
  expensePaidFor: { findMany: jest.Mock }
  group: {
    create: jest.Mock
    findMany: jest.Mock
    findUnique: jest.Mock
    update: jest.Mock
  }
  groupMembership: {
    create: jest.Mock
    createMany: jest.Mock
    findMany: jest.Mock
    upsert: jest.Mock
  }
  participant: {
    findMany: jest.Mock
    findUnique: jest.Mock
    create: jest.Mock
    update: jest.Mock
  }
  paymentDue: { findMany: jest.Mock }
  user: { findMany: jest.Mock }
}

const group = {
  id: 'group-1',
  name: 'Flat',
  information: null,
  currency: '$',
  currencyCode: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  deleteAt: null,
  createdByUserId: 'user-1',
}

const alice = { id: 'participant-alice', name: 'Alice', userId: null }
const bob = { id: 'participant-bob', name: 'Bob', userId: null }

function form(participants: { id?: string; name: string; email?: string }[]) {
  return {
    name: 'Flat',
    information: '',
    currency: '$',
    currencyCode: null,
    participants,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockIdCount = 0

  // `createGroup` wraps its writes in a transaction; run the callback against
  // the same mocks so the assertions below see every call.
  prismaMock.$transaction.mockImplementation(
    async (callback: (tx: unknown) => unknown) => callback(prismaMock),
  )
  prismaMock.activity.create.mockResolvedValue({})
  prismaMock.expense.findMany.mockResolvedValue([])
  prismaMock.expensePaidFor.findMany.mockResolvedValue([])
  prismaMock.paymentDue.findMany.mockResolvedValue([])
  prismaMock.participant.findMany.mockResolvedValue([])
  prismaMock.groupMembership.findMany.mockResolvedValue([])
  prismaMock.groupMembership.create.mockResolvedValue({})
  prismaMock.groupMembership.createMany.mockResolvedValue({ count: 0 })
  prismaMock.groupMembership.upsert.mockResolvedValue({})
  prismaMock.group.update.mockResolvedValue(group)
  prismaMock.group.findUnique.mockResolvedValue({
    ...group,
    participants: [alice, bob],
  })
})

describe('createGroup', () => {
  it('gives the creator an OWNER membership and lets linked participants in', async () => {
    prismaMock.group.create.mockResolvedValue({ ...group, participants: [] })
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'user-1', email: 'alice@example.com' },
      { id: 'user-2', email: 'bob@example.com' },
    ])

    await createGroup(
      form([
        { name: 'Alice', email: 'alice@example.com' },
        { name: 'Bob', email: 'bob@example.com' },
      ]),
      'user-1',
    )

    // Alice is the creator: her own address resolves to her account, so the
    // second membership would duplicate the OWNER row -- `skipDuplicates`
    // cannot help because the rows are inserted in two statements.
    expect(prismaMock.groupMembership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        role: 'OWNER',
        status: 'ACTIVE',
      }),
    })

    // Bob is named in the ledger, so he has to be able to open it.
    expect(prismaMock.groupMembership.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'user-2',
          role: 'MEMBER',
          status: 'ACTIVE',
        }),
      ],
      skipDuplicates: true,
    })
  })

  it('keeps the creator out of the roster when they left themselves out', async () => {
    prismaMock.group.create.mockResolvedValue({ ...group, participants: [] })

    await createGroup(form([{ name: 'Bob' }]), 'user-1')

    // Access is granted (the admin case), participation is not invented.
    expect(prismaMock.groupMembership.create).toHaveBeenCalledTimes(1)
    const create = prismaMock.group.create.mock.calls[0][0]
    expect(create.data.participants.createMany.data).toEqual([
      expect.objectContaining({ name: 'Bob', userId: undefined }),
    ])
  })
})

describe('updateGroup participant removal', () => {
  it('refuses to remove somebody who has expenses, instead of cascading', async () => {
    prismaMock.expense.findMany.mockResolvedValue([
      { paidById: 'participant-bob' },
    ])

    await expect(
      updateGroup('group-1', form([{ id: alice.id, name: 'Alice' }])),
    ).rejects.toThrow(ParticipantInUseError)

    expect(prismaMock.group.update).not.toHaveBeenCalled()
  })

  it('names the participant so the message is actionable', async () => {
    prismaMock.expense.findMany.mockResolvedValue([
      { paidById: 'participant-bob' },
    ])

    await expect(
      updateGroup('group-1', form([{ id: alice.id, name: 'Alice' }])),
    ).rejects.toThrow(/Bob cannot be removed/)
  })

  it('soft-removes somebody with no ledger rows, never deleting the row', async () => {
    await updateGroup('group-1', form([{ id: alice.id, name: 'Alice' }]))

    const update = prismaMock.group.update.mock.calls[0][0]
    const participants = update.data.participants

    expect(participants.deleteMany).toBeUndefined()
    expect(participants.updateMany).toEqual(
      expect.arrayContaining([
        {
          where: { id: bob.id },
          data: { removedAt: expect.any(Date), userId: null },
        },
      ]),
    )
  })

  it('releases the account link before re-linking it elsewhere', async () => {
    // Bob is the one being removed and he is linked to an account. Linking that
    // same account to a new participant in the same save only works if the
    // release runs first, otherwise `(groupId, userId)` collides.
    prismaMock.group.findUnique.mockResolvedValue({
      ...group,
      participants: [alice, { ...bob, userId: 'user-2' }],
    })
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'user-2', email: 'bob@example.com' },
    ])

    await updateGroup(
      'group-1',
      form([
        { id: alice.id, name: 'Alice' },
        { name: 'Bobby', email: 'bob@example.com' },
      ]),
    )

    const operations =
      prismaMock.group.update.mock.calls[0][0].data.participants.updateMany
    expect(operations[0]).toEqual({
      where: { id: bob.id },
      data: { removedAt: expect.any(Date), userId: null },
    })
  })
})

describe('updateGroup stale payloads', () => {
  it('refuses a save that drops an id and re-adds the same name', async () => {
    // Exactly what a hand-written or stale payload looks like: "Bob" is both
    // removed (no id) and created (no id). Allowing it would soft-remove the
    // real row, release its account link, and append a duplicate.
    await expect(
      updateGroup(
        'group-1',
        form([{ id: alice.id, name: 'Alice' }, { name: 'Bob' }]),
      ),
    ).rejects.toThrow(StaleParticipantError)

    expect(prismaMock.group.update).not.toHaveBeenCalled()
  })

  it('allows removing one Bob and adding a different Bob in one save', async () => {
    prismaMock.group.findUnique.mockResolvedValue({
      ...group,
      participants: [alice, bob],
    })

    // Different name, so this is a deliberate swap rather than a lost id.
    await updateGroup(
      'group-1',
      form([{ id: alice.id, name: 'Alice' }, { name: 'Robert' }]),
    )

    expect(prismaMock.group.update).toHaveBeenCalled()
  })
})

describe('getGroup', () => {
  it('hides participants who left, keeping their rows for history', async () => {
    prismaMock.group.findUnique.mockResolvedValue({
      ...group,
      participants: [],
    })

    await updateGroup('group-1', form([{ id: alice.id, name: 'Alice' }]))

    const args = prismaMock.group.findUnique.mock.calls[0][0]
    expect(args.include.participants.where).toEqual({ removedAt: null })
  })
})

describe('getGroupsForUser', () => {
  it('scopes the list to an active membership', async () => {
    prismaMock.group.findMany.mockResolvedValue([])

    await getGroupsForUser('user-1')

    const args = prismaMock.group.findMany.mock.calls[0][0]
    expect(args.where).toEqual({
      memberships: { some: { userId: 'user-1', status: 'ACTIVE' } },
    })
  })
})
