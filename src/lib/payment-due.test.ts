import {
  countUnreadNotifications,
  daysUntilDue,
  getPaymentDueNotifications,
  isPaymentDueStale,
  parsePaymentDueActivityData,
  type PaymentDueLike,
  type PaymentDueNotification,
} from './payment-due'

function due(overrides: Partial<PaymentDueLike> = {}): PaymentDueLike {
  return {
    id: 'due-1',
    fromParticipantId: 'bob',
    toParticipantId: 'alice',
    amount: 4250,
    dueDate: '2026-03-01',
    status: 'PENDING',
    ...overrides,
  }
}

const kinds = (notifications: PaymentDueNotification[]) =>
  notifications.map(({ kind }) => kind)

describe('getPaymentDueNotifications', () => {
  it('says nothing before the reminder window opens', () => {
    expect(
      getPaymentDueNotifications({
        dues: [due({ dueDate: '2026-03-10' })],
        participantId: 'bob',
        today: '2026-03-01',
      }),
    ).toEqual([])
  })

  it('reminds the debtor DUE_SOON inside the window', () => {
    const [notification] = getPaymentDueNotifications({
      dues: [due({ dueDate: '2026-03-04' })],
      participantId: 'bob',
      today: '2026-03-01',
    })
    expect(notification).toMatchObject({
      kind: 'DUE_SOON',
      role: 'debtor',
      counterpartParticipantId: 'alice',
      daysUntilDue: 3,
      dueDate: '2026-03-04',
      amount: 4250,
    })
  })

  it('honours a custom window', () => {
    expect(
      kinds(
        getPaymentDueNotifications({
          dues: [due({ dueDate: '2026-03-04' })],
          participantId: 'bob',
          today: '2026-03-01',
          dueSoonDays: 0,
        }),
      ),
    ).toEqual([])
  })

  it('separates DUE_TODAY from OVERDUE', () => {
    expect(
      kinds(
        getPaymentDueNotifications({
          dues: [due({ dueDate: '2026-03-01' })],
          participantId: 'bob',
          today: '2026-03-01',
        }),
      ),
    ).toEqual(['DUE_TODAY'])

    const [overdue] = getPaymentDueNotifications({
      dues: [due({ dueDate: '2026-02-20' })],
      participantId: 'bob',
      today: '2026-03-01',
    })
    expect(overdue.kind).toBe('OVERDUE')
    expect(overdue.daysUntilDue).toBe(-9)
  })

  it('keeps the debtor notified while late, past the window', () => {
    expect(
      kinds(
        getPaymentDueNotifications({
          dues: [due({ dueDate: '2025-01-01' })],
          participantId: 'bob',
          today: '2026-03-01',
        }),
      ),
    ).toEqual(['OVERDUE'])
  })

  it('tells the creditor only once the money is late', () => {
    expect(
      getPaymentDueNotifications({
        dues: [due({ dueDate: '2026-03-04' })],
        participantId: 'alice',
        today: '2026-03-01',
      }),
    ).toEqual([])

    const [notification] = getPaymentDueNotifications({
      dues: [due({ dueDate: '2026-02-25' })],
      participantId: 'alice',
      today: '2026-03-01',
    })
    expect(notification).toMatchObject({
      kind: 'AWAITING_PAYMENT',
      role: 'creditor',
      counterpartParticipantId: 'bob',
      daysUntilDue: -4,
    })
  })

  it('ignores every non-pending status', () => {
    for (const status of ['SETTLED', 'CANCELLED', 'SUPERSEDED'] as const) {
      expect(
        getPaymentDueNotifications({
          dues: [due({ dueDate: '2026-01-01', status })],
          participantId: 'bob',
          today: '2026-03-01',
        }),
      ).toEqual([])
    }
  })

  it('ignores obligations of other participants', () => {
    expect(
      getPaymentDueNotifications({
        dues: [due()],
        participantId: 'carol',
        today: '2026-03-01',
      }),
    ).toEqual([])
  })

  it('accepts Date values as well as day keys', () => {
    const [notification] = getPaymentDueNotifications({
      dues: [due({ dueDate: new Date('2026-02-28T00:00:00.000Z') })],
      participantId: 'bob',
      today: new Date('2026-03-01T18:30:00.000Z'),
    })
    expect(notification).toMatchObject({ kind: 'OVERDUE', daysUntilDue: -1 })
  })

  it('is not affected by the time of day', () => {
    // 23:59 vs 00:01 on the same UTC day are the same calendar day.
    for (const today of [
      '2026-03-01T00:01:00.000Z',
      new Date('2026-03-01T23:59:59.000Z'),
    ]) {
      expect(
        kinds(
          getPaymentDueNotifications({
            dues: [due({ dueDate: '2026-03-01' })],
            participantId: 'bob',
            today,
          }),
        ),
      ).toEqual(['DUE_TODAY'])
    }
  })

  it('orders by urgency, then lateness, then amount', () => {
    const notifications = getPaymentDueNotifications({
      dues: [
        due({ id: 'soon-small', dueDate: '2026-03-04', amount: 100 }),
        due({ id: 'today', dueDate: '2026-03-01', amount: 100 }),
        due({ id: 'overdue-new', dueDate: '2026-02-26', amount: 100 }),
        due({ id: 'overdue-old', dueDate: '2026-01-01', amount: 100 }),
      ],
      participantId: 'bob',
      today: '2026-03-01',
    })
    expect(notifications.map(({ paymentDueId }) => paymentDueId)).toEqual([
      'overdue-old',
      'overdue-new',
      'today',
      'soon-small',
    ])
  })

  it('reports several obligations for the same pair independently', () => {
    const notifications = getPaymentDueNotifications({
      dues: [
        due({ id: 'a', dueDate: '2026-02-01' }),
        due({ id: 'b', dueDate: '2026-02-02' }),
      ],
      participantId: 'bob',
      today: '2026-03-01',
    })
    expect(notifications.map(({ paymentDueId }) => paymentDueId)).toEqual([
      'a',
      'b',
    ])
  })
})

describe('countUnreadNotifications', () => {
  it('counts only what is late or due today', () => {
    const notifications = getPaymentDueNotifications({
      dues: [
        due({ id: 'overdue', dueDate: '2026-01-01' }),
        due({ id: 'today', dueDate: '2026-03-01' }),
        due({ id: 'soon', dueDate: '2026-03-03' }),
      ],
      participantId: 'bob',
      today: '2026-03-01',
    })
    expect(countUnreadNotifications(notifications)).toBe(2)
  })
})

describe('isPaymentDueStale', () => {
  const obligation = {
    fromParticipantId: 'bob',
    toParticipantId: 'alice',
    amount: 4250,
  }

  it('is current while the suggested transfer matches', () => {
    expect(
      isPaymentDueStale(obligation, [
        { from: 'bob', to: 'alice', amount: 4250 },
      ]),
    ).toBe(false)
  })

  it('is stale when the balances moved', () => {
    expect(
      isPaymentDueStale(obligation, [
        { from: 'bob', to: 'alice', amount: 3000 },
      ]),
    ).toBe(true)
    expect(isPaymentDueStale(obligation, [])).toBe(true)
  })

  it('is stale when the transfer now goes the other way', () => {
    expect(
      isPaymentDueStale(obligation, [
        { from: 'alice', to: 'bob', amount: 4250 },
      ]),
    ).toBe(true)
  })
})

describe('parsePaymentDueActivityData', () => {
  it('reads the deadline back out of the activity payload', () => {
    expect(parsePaymentDueActivityData('{"dueDate":"2026-03-01"}')).toEqual({
      dueDate: '2026-03-01',
    })
  })

  it('treats a plain expense title as no payload', () => {
    expect(parsePaymentDueActivityData('Groceries')).toBeNull()
    expect(parsePaymentDueActivityData(null)).toBeNull()
    expect(parsePaymentDueActivityData('')).toBeNull()
  })

  it('survives malformed or unexpected JSON', () => {
    expect(parsePaymentDueActivityData('{oops')).toBeNull()
    expect(parsePaymentDueActivityData('[1,2]')).toBeNull()
    expect(parsePaymentDueActivityData('{"dueDate":"tomorrow"}')).toEqual({})
  })
})

describe('daysUntilDue', () => {
  it('counts calendar days in both directions', () => {
    expect(daysUntilDue('2026-03-04', '2026-03-01')).toBe(3)
    expect(daysUntilDue('2026-03-01', '2026-03-01')).toBe(0)
    expect(daysUntilDue('2026-02-25', '2026-03-01')).toBe(-4)
  })

  it('reads a stored date-only value at UTC midnight', () => {
    expect(
      daysUntilDue(new Date('2026-03-04T00:00:00.000Z'), '2026-03-01'),
    ).toBe(3)
  })
})
