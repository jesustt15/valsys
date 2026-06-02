import { db } from '@/lib/db'
import { vehicles, owners } from '@/db/schema'
import { eq, count, and, ne, sql } from 'drizzle-orm'

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

export type UpdateVehicleData = Partial<{
  vin: string
  licensePlate: string
  vehicleType: string
  brand: string
  model: string
  year: number
  specificAttributes: Record<string, unknown>
}>

export async function updateVehicle(id: string, data: UpdateVehicleData): Promise<{ success: true; vehicle: typeof vehicles.$inferSelect } | { success: false; error: string }> {
  // Uniqueness checks (exclude self)
  if (data.vin) {
    const dup = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.vin, data.vin), ne(vehicles.id, id)))
      .limit(1)

    if (dup.length > 0) {
      return { success: false, error: `Ya existe otro vehículo con VIN ${data.vin}` }
    }
  }

  if (data.licensePlate) {
    const dup = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.licensePlate, data.licensePlate), ne(vehicles.id, id)))
      .limit(1)

    if (dup.length > 0) {
      return { success: false, error: `Ya existe otro vehículo con placa ${data.licensePlate}` }
    }
  }

  try {
    const [vehicle] = await db
      .update(vehicles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vehicles.id, id))
      .returning()

    return { success: true, vehicle }
  } catch (e) {
    console.error('Error updating vehicle:', e)
    return { success: false, error: 'Error al actualizar el vehículo. Intente de nuevo.' }
  }
}
