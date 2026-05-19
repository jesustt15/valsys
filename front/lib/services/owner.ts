import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { owners } from '@/db/schema'

export type OwnerRecord = typeof owners.$inferSelect

export async function getAllOwners(): Promise<OwnerRecord[]> {
  return db.select().from(owners).orderBy(owners.createdAt)
}

export async function getOwnerById(id: string): Promise<OwnerRecord | null> {
  const [owner] = await db.select().from(owners).where(eq(owners.id, id)).limit(1)
  return owner ?? null
}
