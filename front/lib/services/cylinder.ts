import { db } from '@/lib/db'
import { gncCylinders } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function getCylindersByVehicleId(vehicleId: string) {
  return await db
    .select()
    .from(gncCylinders)
    .where(eq(gncCylinders.vehicleId, vehicleId))
    .orderBy(gncCylinders.createdAt)
}
