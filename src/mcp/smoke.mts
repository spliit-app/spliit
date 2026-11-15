/**
 * End-to-end smoke for one group.
 *
 * Requires SPLIIT_GROUP_ID, MCP_API_KEY, and optionally SPLIIT_BASE_URL.
 * It mutates that group: adds/removes participants, creates/updates/deletes
 * one expense, and writes activity rows. Point it at a disposable group.
 */
import assert from 'node:assert/strict'
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client'

const baseUrl = new URL(process.env.SPLIIT_BASE_URL ?? 'http://localhost:3000')
const apiKey = process.env.MCP_API_KEY
const groupId = process.env.SPLIIT_GROUP_ID
if (!apiKey) throw new Error('MCP_API_KEY is required')
if (!groupId) throw new Error('SPLIIT_GROUP_ID is required')

const mcpUrl = new URL('/api/mcp', baseUrl)
const initializeBody = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'spliit-smoke', version: '1.0.0' },
  },
})

const unauthenticated = await fetch(mcpUrl, {
  method: 'POST',
  headers: {
    accept: 'application/json, text/event-stream',
    'content-type': 'application/json',
  },
  body: initializeBody,
})
assert.equal(unauthenticated.status, 401)

const missingGroupHeader = await fetch(mcpUrl, {
  method: 'POST',
  headers: {
    accept: 'application/json, text/event-stream',
    authorization: `Bearer ${apiKey}`,
    'content-type': 'application/json',
  },
  body: initializeBody,
})
assert.equal(missingGroupHeader.status, 400)

const client = new Client({ name: 'spliit-smoke', version: '1.0.0' })
const transport = new StreamableHTTPClientTransport(mcpUrl, {
  authProvider: { token: async () => apiKey },
  requestInit: { headers: { 'X-Spliit-Group-Id': groupId } },
})

async function callTool<T>(name: string, args: Record<string, unknown> = {}) {
  const result = await client.callTool({ name, arguments: args })
  assert.ok(
    !result.isError,
    `${name} returned isError: ${JSON.stringify(result.content)}`,
  )
  const content = result.content.find((item) => item.type === 'text')
  assert.ok(content && content.type === 'text', `${name} returned no text`)
  return JSON.parse(content.text) as T
}

try {
  await client.connect(transport)

  const initial = await callTool<{
    group: { participants: { id: string; name: string }[] }
  }>('groups_get')
  let participants = initial.group.participants
  const addedParticipants: string[] = []
  const suffix = `${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`

  if (participants.length < 2) {
    const bobName = `MCP Bob ${suffix}`
    const added = await callTool<{
      participants: { id: string; name: string }[]
    }>('participants_add', { name: bobName })
    participants = added.participants
    const bob = participants.find((participant) => participant.name === bobName)
    assert.ok(bob)
    addedParticipants.push(bob.id)
  }

  const alice = participants[0]
  const bob = participants[1]
  assert.ok(alice && bob)

  const beforeStats = await callTool<{ totalGroupSpendings: number }>(
    'stats_overview',
  )

  const title = `MCP smoke dinner ${Date.now()}`
  const createdExpense = await callTool<{ expenseId: string }>(
    'expenses_create',
    {
      title,
      amount: 3000,
      paidBy: alice.id,
      paidFor: [{ participantId: alice.id }, { participantId: bob.id }],
      splitMode: 'EVENLY',
    },
  )
  const { expenseId } = createdExpense
  assert.ok(expenseId)

  const expenses = await callTool<{ expenses: { id: string }[] }>(
    'expenses_list',
    { filter: title },
  )
  assert.ok(expenses.expenses.some((expense) => expense.id === expenseId))

  const fetchedExpense = await callTool<{
    expense: { id: string; title: string; amount: number }
  }>('expenses_get', { expenseId })
  assert.equal(fetchedExpense.expense.amount, 3000)

  await callTool('expenses_update', {
    expenseId,
    title: `${title} updated`,
  })

  const balances = await callTool<{
    balances: Record<string, number>
    reimbursements: unknown[]
  }>('balances_get')
  assert.ok(Object.keys(balances.balances).length > 0)

  const afterStats = await callTool<{ totalGroupSpendings: number }>(
    'stats_overview',
  )
  assert.equal(typeof afterStats.totalGroupSpendings, 'number')

  const exported = await callTool<{
    expenses: { id: string }[]
    participants: { id: string }[]
  }>('groups_export')
  assert.ok(exported.expenses.some((expense) => expense.id === expenseId))

  const activities = await callTool<{ activities: unknown[] }>(
    'activities_list',
  )
  assert.ok(activities.activities.length > 0)

  const categories = await callTool<{ categories: unknown[] }>(
    'categories_list',
  )
  assert.ok(categories.categories.length > 0)

  const carolName = `MCP Carol ${suffix}`
  const added = await callTool<{
    participants: { id: string; name: string }[]
  }>('participants_add', { name: carolName })
  const carol = added.participants.find(
    (participant) => participant.name === carolName,
  )
  assert.ok(carol)
  addedParticipants.push(carol.id)

  await callTool('participants_rename', {
    participantId: carol.id,
    name: `${carolName} Renamed`,
  })

  await callTool('expenses_delete', { expenseId })

  const afterDelete = await callTool<{ expenses: { id: string }[] }>(
    'expenses_list',
    { filter: title },
  )
  assert.ok(!afterDelete.expenses.some((expense) => expense.id === expenseId))

  const afterDeleteStats = await callTool<{ totalGroupSpendings: number }>(
    'stats_overview',
  )
  assert.equal(typeof afterDeleteStats.totalGroupSpendings, 'number')

  for (const participantId of addedParticipants.reverse())
    await callTool('participants_remove', {
      participantId,
      confirm: true,
    })

  console.log(
    JSON.stringify(
      {
        groupId,
        expenseId,
        balances: balances.balances,
        statsDelta:
          afterStats.totalGroupSpendings - beforeStats.totalGroupSpendings,
      },
      null,
      2,
    ),
  )
} finally {
  await client.close()
}
