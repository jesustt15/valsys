import { db } from '@/lib/db'
import { vehicles } from '@/db/schema'

export type VehicleRecord = typeof vehicles.$inferSelect

export async function getAllVehicles(): Promise<VehicleRecord[]> {
  return db.select().from(vehicles).orderBy(vehicles.createdAt)
}
