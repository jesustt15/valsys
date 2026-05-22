import { db } from '@/lib/db'
import { vehicles, owners } from '@/db/schema'
import { eq, count } from 'drizzle-orm'

export type VehicleRecord = typeof vehicles.$inferSelect

export async function getVehicleById(id: string) {
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, id))

  if (!vehicle) return null

  const [owner] = vehicle.ownerId
    ? await db.select().from(owners).where(eq(owners.id, vehicle.ownerId))
    : [null]

  return { ...vehicle, owner }
}

export async function getVehicleByPlate(licensePlate: string) {
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.licensePlate, licensePlate.toUpperCase()))

  if (!vehicle) return null

  const [owner] = vehicle.ownerId
    ? await db.select().from(owners).where(eq(owners.id, vehicle.ownerId))
    : [null]

  return { ...vehicle, owner }
}

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

export async function countVehicles(): Promise<number> {
  const [row] = await db.select({ count: count(vehicles.id) }).from(vehicles)
  return Number(row?.count ?? 0)
}
