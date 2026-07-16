'use server'

import { db } from '@/lib/db'
import { vehicles, owners } from '@/db/schema'
import { createVehicleSchema, updateVehicleSchema } from '@/lib/validations/vehicle'
import { updateVehicle } from '@/lib/services/vehicle'
import { eq } from 'drizzle-orm'

export type VehicleFormState = {
  success?: boolean
  error?: string
  data?: { id: string; licensePlate: string }
}

export async function createVehicle(
  _prev: VehicleFormState | null,
  formData: FormData
): Promise<VehicleFormState> {
  // Validar
  const parsed = createVehicleSchema.safeParse({
    ownerId: formData.get('ownerId'),
    vinSerial: formData.get('vinSerial'),
    codigoUnicoGnc: formData.get('codigoUnicoGnc') || undefined,
    licensePlate: formData.get('licensePlate'),
    vehicleType: formData.get('vehicleType'),
    brand: formData.get('brand'),
    model: formData.get('model'),
    marcaKit: formData.get('marcaKit') || undefined,
  })

  if (!parsed.success) {
    const firstError = parsed.error.issues?.[0]?.message ?? 'Error de validación'
    return { error: firstError }
  }

  const { vinSerial, codigoUnicoGnc, licensePlate } = parsed.data

  // Check vinSerial duplicado
  const existingVin = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.vinSerial, vinSerial))
    .limit(1)

  if (existingVin.length > 0) {
    return { error: `Ya existe un vehículo con Serial VIN ${vinSerial}` }
  }

  // Check codigoUnicoGnc duplicado
  if (codigoUnicoGnc) {
    const existingCodigo = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.codigoUnicoGnc, codigoUnicoGnc))
      .limit(1)

    if (existingCodigo.length > 0) {
      return { error: `Ya existe un vehículo con Código Único GNC ${codigoUnicoGnc}` }
    }
  }

  // Check placa duplicada
  const existingPlate = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.licensePlate, licensePlate))
    .limit(1)

  if (existingPlate.length > 0) {
    return { error: `Ya existe un vehículo con placa ${licensePlate}` }
  }

  // Verificar que el dueño existe
  const ownerExists = await db
    .select({ id: owners.id })
    .from(owners)
    .where(eq(owners.id, parsed.data.ownerId))
    .limit(1)

  if (ownerExists.length === 0) {
    return { error: 'El dueño seleccionado no existe' }
  }

  // Insertar
  try {
    const [vehicle] = await db
      .insert(vehicles)
      .values(parsed.data)
      .returning({
        id: vehicles.id,
        licensePlate: vehicles.licensePlate,
      })

    return { success: true, data: vehicle }
  } catch (e) {
    console.error('Error creating vehicle:', e)
    return { error: 'Error al guardar el vehículo. Intente de nuevo.' }
  }
}

export async function getOwnersList() {
  return db
    .select({
      id: owners.id,
      fullName: owners.fullName,
      documentId: owners.documentId,
    })
    .from(owners)
    .orderBy(owners.fullName)
}

export async function updateVehicleAction(
  _prev: VehicleFormState | null,
  formData: FormData,
): Promise<VehicleFormState> {
  const parsed = updateVehicleSchema.safeParse({
    codigoUnicoGnc: formData.get('codigoUnicoGnc') !== null ? (formData.get('codigoUnicoGnc') as string) : undefined,
    licensePlate: formData.get('licensePlate') || undefined,
    vehicleType: formData.get('vehicleType') || undefined,
    brand: formData.get('brand') || undefined,
    model: formData.get('model') || undefined,
    marcaKit: formData.get('marcaKit') !== null ? (formData.get('marcaKit') as string) : undefined,
  })

  if (!parsed.success) {
    const firstError = parsed.error.issues?.[0]?.message ?? 'Error de validación'
    return { error: firstError }
  }

  const vehicleId = formData.get('id') as string
  if (!vehicleId) {
    return { error: 'ID de vehículo no proporcionado' }
  }

  const result = await updateVehicle(vehicleId, parsed.data)

  if (!result.success) {
    return { error: result.error }
  }

  return { success: true, data: { id: result.vehicle.id, licensePlate: result.vehicle.licensePlate ?? '' } }
}
