import { eq, and, ne } from 'drizzle-orm'
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

export async function getOwnerByDocumentId(documentId: string): Promise<OwnerRecord | null> {
  const [owner] = await db.select().from(owners).where(eq(owners.documentId, documentId)).limit(1)
  return owner ?? null
}

export type UpdateOwnerData = Partial<{
  fullName: string
  documentId: string
  phone: string
  email: string
}>

export async function updateOwner(id: string, data: UpdateOwnerData): Promise<{ success: true; owner: OwnerRecord } | { success: false; error: string }> {
  // Document ID uniqueness check (exclude self)
  if (data.documentId) {
    const dup = await db
      .select({ id: owners.id })
      .from(owners)
      .where(and(eq(owners.documentId, data.documentId), ne(owners.id, id)))
      .limit(1)

    if (dup.length > 0) {
      return { success: false, error: `Ya existe otro propietario con documento ${data.documentId}` }
    }
  }

  try {
    const [owner] = await db
      .update(owners)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(owners.id, id))
      .returning()

    return { success: true, owner }
  } catch (e) {
    console.error('Error updating owner:', e)
    return { success: false, error: 'Error al actualizar el propietario. Intente de nuevo.' }
  }
}
