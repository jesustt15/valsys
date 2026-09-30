import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/lib/db'
import { signatures } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getObject } from '@/lib/minio'
import { readableNodeToWeb } from '@/lib/minio/web-stream'

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [signature] = await db
    .select()
    .from(signatures)
    .where(eq(signatures.id, id))
    .limit(1)

  if (!signature) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const stream = await getObject(signature.minioKey)
    const ext = signature.minioKey.split('.').pop()?.toLowerCase() ?? 'png'

    return new NextResponse(readableNodeToWeb(stream), {
      headers: {
        'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    // Object missing in MinIO (orphaned signature row) — surface as 404 so
    // the <img> fails cleanly instead of a 500.
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
