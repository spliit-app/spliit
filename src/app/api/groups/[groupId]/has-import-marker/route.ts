import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params

    const importMarker = await prisma.activity.findFirst({
      where: {
        groupId,
        data: {
          startsWith: 'JSON_IMPORT_START:',
        },
      },
      select: { id: true },
    })

    return NextResponse.json({
      hasImportMarker: !!importMarker,
    })
  } catch {
    return NextResponse.json({ hasImportMarker: false }, { status: 500 })
  }
}
