import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/lib/db'
import { inspectionAttachments } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getObject } from '@/lib/minio'
import { Client } from 'minio'

const BUCKET = process.env.MINIO_BUCKET || 'valsys'

function getMinioClient() {
  return new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: Number(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'admin_minio',
    secretKey: process.env.MINIO_SECRET_KEY || 'password_minio',
  })
}

function parseRange(rangeHeader: string, totalSize: number): { start: number; end: number } | null {
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
  if (!match) return null
  const start = parseInt(match[1], 10)
  const end = match[2] ? parseInt(match[2], 10) : totalSize - 1
  if (start > end || start >= totalSize) return null
  return { start, end: Math.min(end, totalSize - 1) }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const [attachment] = await db
    .select()
    .from(inspectionAttachments)
    .where(eq(inspectionAttachments.id, id))
    .limit(1)

  if (!attachment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const rangeHeader = req.headers.get('range')
  const fileSize = attachment.fileSize

  if (rangeHeader && fileSize) {
    const range = parseRange(rangeHeader, fileSize)
    if (range) {
      const client = getMinioClient()
      const length = range.end - range.start + 1
      const stream = await client.getPartialObject(BUCKET, attachment.minioKey, range.start, length)
      const webStream = readableNodeToWeb(stream)

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          'Content-Type': attachment.fileType,
          'Content-Length': length.toString(),
          'Content-Range': `bytes ${range.start}-${range.end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }
  }

  const stream = await getObject(attachment.minioKey)
  const webStream = readableNodeToWeb(stream)

  const headers: Record<string, string> = {
    'Content-Type': attachment.fileType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600',
  }
  if (fileSize) {
    headers['Content-Length'] = fileSize.toString()
  }

  return new NextResponse(webStream, { headers })
}

function readableNodeToWeb(nodeStream: NodeJS.ReadableStream): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk))
      })
      nodeStream.on('end', () => {
        controller.close()
      })
      nodeStream.on('error', (err: Error) => {
        controller.error(err)
      })
    },
    cancel() {
      if ('destroy' in nodeStream && typeof nodeStream.destroy === 'function') {
        nodeStream.destroy()
      }
    },
  })
}
