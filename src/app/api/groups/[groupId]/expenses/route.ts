import { getGroupExpenses } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } },
) {
  let status = 200
  let expenses: Awaited<ReturnType<typeof getGroupExpenses>> = []

  try {
    const searchParams = request.nextUrl.searchParams
    const offset = parseInt(searchParams.get('offset') || '-1', 10)
    const length = parseInt(searchParams.get('length') || '-1', 10)

    let opts: { offset: number; length: number } | undefined

    if (offset < 0 && length < 0) {
      opts = undefined
    } else if (offset >= 0 && length > 0) {
      opts = { offset, length }
    } else {
      status = 400
    }

    if (status === 200) expenses = await getGroupExpenses(params.groupId, opts)
  } catch {
    status = 500
  }

  return Response.json(expenses, { status })
}
