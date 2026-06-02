import { db } from '@/lib/db'
import { vehicleDocuments, type documentType } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export type VehicleDocumentRecord = typeof vehicleDocuments.$inferSelect

export async function getDocsByVehicle(vehicleId: string): Promise<VehicleDocumentRecord[]> {
  return db
    .select()
    .from(vehicleDocuments)
    .where(eq(vehicleDocuments.vehicleId, vehicleId))
    .orderBy(vehicleDocuments.uploadedAt)
}

export async function getDocByVehicleAndType(
  vehicleId: string,
  type: 'cedula' | 'carnet',
): Promise<VehicleDocumentRecord | null> {
  const [doc] = await db
    .select()
    .from(vehicleDocuments)
    .where(
      and(
        eq(vehicleDocuments.vehicleId, vehicleId),
        eq(vehicleDocuments.type, type),
      ),
    )
    .limit(1)

  return doc ?? null
}

export async function upsertDoc(
  vehicleId: string,
  type: 'cedula' | 'carnet',
  minioKey: string,
  originalName?: string,
): Promise<VehicleDocumentRecord> {
  // Delete existing document of same type for this vehicle
  await db
    .delete(vehicleDocuments)
    .where(
      and(
        eq(vehicleDocuments.vehicleId, vehicleId),
        eq(vehicleDocuments.type, type),
      ),
    )

  const [doc] = await db
    .insert(vehicleDocuments)
    .values({
      vehicleId,
      type,
      minioKey,
      originalName: originalName || null,
    })
    .returning()

  return doc
}
