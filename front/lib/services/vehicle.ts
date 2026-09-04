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

export interface VehicleWithOwner {
  id: string
  codigoUnicoGnc: string | null
  licensePlate: string
  vehicleType: string
  brand: string | null
  model: string | null
  marcaKit: string | null
  createdAt: Date | null
  ownerId: string | null
  ownerName: string | null
}

export async function getVehiclesForList(): Promise<VehicleWithOwner[]> {
  const records = await db
    .select({
      id: vehicles.id,
      codigoUnicoGnc: vehicles.codigoUnicoGnc,
      licensePlate: vehicles.licensePlate,
      vehicleType: vehicles.vehicleType,
      brand: vehicles.brand,
      model: vehicles.model,
      marcaKit: vehicles.marcaKit,
      createdAt: vehicles.createdAt,
      ownerId: vehicles.ownerId,
      ownerName: owners.fullName,
    })
    .from(vehicles)
    .leftJoin(owners, eq(vehicles.ownerId, owners.id))
    .orderBy(vehicles.createdAt)

  if (records.length === 0) return []

  return records.map((r) => ({
    id: r.id,
    codigoUnicoGnc: r.codigoUnicoGnc,
    licensePlate: r.licensePlate,
    vehicleType: r.vehicleType,
    brand: r.brand,
    model: r.model,
    marcaKit: r.marcaKit,
    createdAt: r.createdAt,
    ownerId: r.ownerId,
    ownerName: r.ownerName ?? null,
  }))
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
  vinSerial: string
  codigoUnicoGnc: string | null
  licensePlate: string
  vehicleType: string
  brand: string
  model: string
  marcaKit: string | null
  specificAttributes: Record<string, unknown>
}>

export async function updateVehicle(id: string, data: UpdateVehicleData): Promise<{ success: true; vehicle: typeof vehicles.$inferSelect } | { success: false; error: string }> {
  // Uniqueness checks (exclude self)
  if (data.vinSerial) {
    const dup = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.vinSerial, data.vinSerial), ne(vehicles.id, id)))
      .limit(1)

    if (dup.length > 0) {
      return { success: false, error: `Ya existe otro vehículo con Serial VIN ${data.vinSerial}` }
    }
  }

  if (data.codigoUnicoGnc) {
    const dup = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.codigoUnicoGnc, data.codigoUnicoGnc), ne(vehicles.id, id)))
      .limit(1)

    if (dup.length > 0) {
      return { success: false, error: `Ya existe otro vehículo con Código Único GNC ${data.codigoUnicoGnc}` }
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
