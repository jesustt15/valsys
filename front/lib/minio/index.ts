import { Client } from 'minio'

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'admin_minio',
  secretKey: process.env.MINIO_SECRET_KEY || 'password_minio',
})

const BUCKET = process.env.MINIO_BUCKET || 'valsys'

export async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET)
  if (!exists) {
    await minioClient.makeBucket(BUCKET)
  }
}

export async function putObject(key: string, file: File) {
  await ensureBucket()
  const buffer = Buffer.from(await file.arrayBuffer())
  await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
    'Content-Type': file.type,
  })
  return key
}

export async function getObject(key: string) {
  return minioClient.getObject(BUCKET, key)
}

export async function getObjectUrl(key: string) {
  return minioClient.presignedGetObject(BUCKET, key, 60 * 60) // 1 hour
}
