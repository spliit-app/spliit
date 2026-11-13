import { NextResponse } from 'next/server'
import { z } from 'zod'

// Proxy to the Frankfurter API so that browsers never contact a third party
const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  base: z.string().regex(/^[A-Z]{3}$/),
  quotes: z.string().regex(/^[A-Z]{3}$/),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = querySchema.safeParse({
    date: searchParams.get('date'),
    base: searchParams.get('base'),
    quotes: searchParams.get('quotes'),
  })
  if (!query.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  const { date, base, quotes } = query.data
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v2/rates?${new URLSearchParams({ date, base, quotes })}`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Unsuccessful response from API' },
        { status: 502 },
      )
    }
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json(
      { error: 'Exchange rate API unreachable' },
      { status: 502 },
    )
  }
}
