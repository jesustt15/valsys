import { db } from '@/lib/db'
import { gncCylinders, inspections } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

export async function getCylindersByVehicleId(vehicleId: string) {
  return await db
    .select()
    .from(gncCylinders)
    .where(eq(gncCylinders.vehicleId, vehicleId))
    .orderBy(gncCylinders.createdAt)
}

export async function getCylindersByInspectionId(inspectionId: string) {
  // Step 1: get vehicleId from inspection
  const [inspection] = await db
    .select({ vehicleId: inspections.vehicleId })
    .from(inspections)
    .where(eq(inspections.id, inspectionId))
    .limit(1)

  if (!inspection?.vehicleId) {
    return []
  }

  // Step 2: select cylinders ordered with en_planta first
  return await db
    .select()
    .from(gncCylinders)
    .where(eq(gncCylinders.vehicleId, inspection.vehicleId))
    .orderBy(
      sql`CASE WHEN ${gncCylinders.status} = 'en_planta' THEN 0 ELSE 1 END`,
      gncCylinders.createdAt,
    )
}
