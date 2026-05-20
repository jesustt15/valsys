import { db } from '@/lib/db'
import { vehicles } from '@/db/schema'
import { eq } from 'drizzle-orm'

export type VehicleRecord = typeof vehicles.$inferSelect

export async function getAllVehicles(): Promise<VehicleRecord[]> {
  return db.select().from(vehicles).orderBy(vehicles.createdAt)
}

export async function getVehiclesByOwnerId(ownerId: string): Promise<VehicleRecord[]> {
  return db
    .select()
    .from(vehicles)
    .where(eq(vehicles.ownerId, ownerId))
    .orderBy(vehicles.createdAt)
}
