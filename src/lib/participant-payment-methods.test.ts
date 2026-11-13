import { createGroup, updateGroup } from './api'
import { parsePaymentMethods } from './payment-methods'
import { prisma } from './prisma'
import { groupFormSchema } from './schemas'

jest.mock('./prisma', () => ({
  prisma: {
    activity: { create: jest.fn() },
    group: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  },
}))

let mockIdCount = 0
jest.mock('./random', () => ({
  randomId: () => `random-id-${++mockIdCount}`,
}))

const sepa = {
  type: 'sepa' as const,
  name: 'Ada Lovelace',
  iban: 'FI2112345600000785',
}

function form(participants: { id?: string; paymentMethods?: unknown[] }[]) {
  return groupFormSchema.parse({
    name: 'Trip',
    currency: '€',
    currencyCode: 'EUR',
    participants: participants.map((participant, index) => ({
      name: `Participant ${index + 1}`,
      ...participant,
    })),
  })
}

describe('participant payment methods', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(prisma.group.findUnique).mockResolvedValue({
      id: 'group-1',
      participants: [
        { id: 'p1', name: 'Participant 1', paymentMethods: [sepa] },
        { id: 'p2', name: 'Participant 2', paymentMethods: null },
      ],
    } as never)
  })

  it('normalizes valid details in the group form', () => {
    const values = form([
      { paymentMethods: [{ ...sepa, iban: 'fi21 1234 5600 0007 85' }] },
    ])
    expect(values.participants[0].paymentMethods).toEqual([sepa])
  })

  it('rejects an invalid IBAN in the group form', () => {
    const result = groupFormSchema.safeParse({
      name: 'Trip',
      currency: '€',
      currencyCode: 'EUR',
      participants: [
        {
          name: 'Ada',
          paymentMethods: [{ ...sepa, iban: 'FI2112345600000786' }],
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('stores the methods of new participants', async () => {
    await createGroup(form([{ paymentMethods: [sepa] }, {}]))
    const { data } = jest.mocked(prisma.group.create).mock.calls[0][0]
    expect(data.participants?.createMany?.data).toEqual([
      expect.objectContaining({ paymentMethods: [sepa] }),
      expect.objectContaining({ paymentMethods: undefined }),
    ])
  })

  it('replaces the methods sent and keeps those omitted', async () => {
    const mobilepay = { type: 'mobilepay', phone: '+358 40 123 4567' }
    await updateGroup(
      'group-1',
      form([{ id: 'p1' }, { id: 'p2', paymentMethods: [mobilepay] }]),
    )
    const { data } = jest.mocked(prisma.group.update).mock.calls[0][0]
    expect(data.participants?.updateMany).toEqual([
      {
        where: { id: 'p1' },
        data: { name: 'Participant 1', paymentMethods: undefined },
      },
      {
        where: { id: 'p2' },
        data: {
          name: 'Participant 2',
          paymentMethods: [{ type: 'mobilepay', phone: '+358401234567' }],
        },
      },
    ])
  })

  it('reads back what it stored, through JSON', () => {
    const values = form([
      { paymentMethods: [sepa, { type: 'swish', phone: '070 123 45 67' }] },
    ])
    const stored = JSON.parse(
      JSON.stringify(values.participants[0].paymentMethods),
    )
    expect(parsePaymentMethods(stored)).toEqual(
      values.participants[0].paymentMethods,
    )
  })

  it('drops stored entries this version cannot read', () => {
    expect(
      parsePaymentMethods([sepa, { type: 'carrier-pigeon' }, null]),
    ).toEqual([sepa])
    expect(parsePaymentMethods(null)).toEqual([])
  })
})
