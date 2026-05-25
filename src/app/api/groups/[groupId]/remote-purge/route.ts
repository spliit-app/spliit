import { extractSourceUrlFromImportMarker } from '@/lib/import-marker'
import { prisma } from '@/lib/prisma'
import { getSessionFromHeaders } from '@/lib/session'
import { AppRouter } from '@/trpc/routers/_app'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import { NextResponse } from 'next/server'
import superjson from 'superjson'

const PAGE_LIMIT = 100
const MAX_PAGES = 500
const PLACEHOLDER_PARTICIPANT = 'Remote Cleanup'

function createRemoteClient(origin: string) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${origin}/api/trpc`,
        transformer: superjson,
      }),
    ],
  })
}

async function getImportSourceUrl(groupId: string) {
  const marker = await prisma.activity.findFirst({
    where: {
      groupId,
      data: {
        startsWith: 'JSON_IMPORT_START:',
      },
    },
    orderBy: { time: 'desc' },
    select: { data: true },
  })

  return extractSourceUrlFromImportMarker(marker?.data)
}

async function listRemoteExpenses(
  remote: ReturnType<typeof createRemoteClient>,
  groupId: string,
) {
  const expenses: Awaited<
    ReturnType<typeof remote.groups.expenses.list.query>
  >['expenses'] = []

  let cursor = 0
  let hasMore = true
  let pages = 0

  while (hasMore) {
    if (pages >= MAX_PAGES) {
      throw new Error('Exceeded maximum remote pagination limit.')
    }

    const response = await remote.groups.expenses.list.query({
      groupId,
      cursor,
      limit: PAGE_LIMIT,
      filter: '',
    })

    expenses.push(...response.expenses)
    hasMore = response.hasMore
    cursor = response.nextCursor
    pages += 1
  }

  return expenses
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params
    const session = await getSessionFromHeaders()

    if (!session) {
      return NextResponse.json(
        { error: 'You must be logged in to purge a remote group.' },
        { status: 401 },
      )
    }

    const userGroup = await prisma.anonymousUserGroup.findUnique({
      where: {
        anonymousUserId_groupId: {
          anonymousUserId: session.userId,
          groupId,
        },
      },
    })

    if (!userGroup) {
      return NextResponse.json(
        { error: 'You are not authorized to purge this group.' },
        { status: 403 },
      )
    }

    const sourceUrl = await getImportSourceUrl(groupId)

    if (!sourceUrl) {
      return NextResponse.json(
        { error: 'No remote link configured for this group.' },
        { status: 400 },
      )
    }

    const parsedUrl = new URL(sourceUrl)
    const remote = createRemoteClient(parsedUrl.origin)
    const groupResult = await remote.groups.get.query({ groupId })

    if (!groupResult.group) {
      return NextResponse.json(
        { error: 'Remote group not found.' },
        { status: 404 },
      )
    }

    const remoteExpenses = await listRemoteExpenses(remote, groupId)
    for (const expense of remoteExpenses) {
      await remote.groups.expenses.delete.mutate({
        groupId,
        expenseId: expense.id,
      })
    }

    await remote.groups.update.mutate({
      groupId,
      groupFormValues: {
        name: groupResult.group.name,
        information: groupResult.group.information ?? '',
        currency: groupResult.group.currency,
        currencyCode: groupResult.group.currencyCode ?? '',
        participants: [{ name: PLACEHOLDER_PARTICIPANT }],
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to purge remote group.',
      },
      { status: 500 },
    )
  }
}
