'use server'

import { db } from '@/lib/db'
import { owners, vehicles } from '@/db/schema'
import { createOwnerSchema, updateOwnerSchema, buildDocumentId } from '@/lib/validations/owner'
import { updateOwner } from '@/lib/services/owner'
import { eq, sql } from 'drizzle-orm'

export type OwnerFormState = {
  success?: boolean
  error?: string
  data?: { id: string; fullName: string }
  duplicate?: boolean
  existingOwnerId?: string
  existingOwnerName?: string
}

export async function createOwner(
  _prev: OwnerFormState | null,
  formData: FormData
): Promise<OwnerFormState> {
  // Validar
  const parsed = createOwnerSchema.safeParse({
    fullName: formData.get('fullName'),
    documentType: formData.get('documentType'),
    documentNumber: formData.get('documentNumber'),
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
  })

  if (!parsed.success) {
    const firstError = parsed.error.issues?.[0]?.message ?? 'Error de validación'
    return { error: firstError }
  }

  const { fullName, documentType, documentNumber, phone, email } = parsed.data
  const documentId = buildDocumentId(documentType, documentNumber)

  // Checkear duplicado por documento
  const existing = await db
    .select({ id: owners.id })
    .from(owners)
    .where(eq(owners.documentId, documentId))
    .limit(1)

  if (existing.length > 0) {
    return { error: `Ya existe un dueño con documento ${documentId}` }
  }

  // Checkear duplicado por teléfono
  if (phone) {
    const dupPhone = await db
      .select({ id: owners.id })
      .from(owners)
      .where(eq(owners.phone, phone))
      .limit(1)

    if (dupPhone.length > 0) {
      return { error: 'El número de teléfono ya está registrado para otro propietario' }
    }
  }

  // Checkear duplicado por correo
  if (email) {
    const dupEmail = await db
      .select({ id: owners.id })
      .from(owners)
      .where(eq(owners.email, email))
      .limit(1)

    if (dupEmail.length > 0) {
      return { error: 'El correo electrónico ya está registrado para otro propietario' }
    }
  }

  // Insertar
  try {
    const [owner] = await db
      .insert(owners)
      .values({ fullName, documentId, phone, email })
      .returning({ id: owners.id, fullName: owners.fullName })

    return { success: true, data: owner }
  } catch (e) {
    console.error('Error creating owner:', e)
    return { error: 'Error al guardar el dueño. Intente de nuevo.' }
  }
}

export async function updateOwnerAction(
  _prev: OwnerFormState | null,
  formData: FormData,
): Promise<OwnerFormState> {
  const parsed = updateOwnerSchema.safeParse({
    fullName: formData.get('fullName') || undefined,
    documentId: formData.get('documentId') || undefined,
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
  })

  if (!parsed.success) {
    const firstError = parsed.error.issues?.[0]?.message ?? 'Error de validación'
    return { error: firstError }
  }

  const ownerId = formData.get('id') as string
  if (!ownerId) {
    return { error: 'ID de propietario no proporcionado' }
  }

  const result = await updateOwner(ownerId, parsed.data)

  if (!result.success) {
    // If duplicate detected, return duplicate info instead of error
    if ('duplicate' in result) {
      const dupResult = result as { duplicate: true; existingOwnerId: string; existingOwnerName: string }
      return {
        error: dupResult.existingOwnerName
          ? `Ya existe un propietario con ese documento: ${dupResult.existingOwnerName}`
          : 'Ya existe un propietario con ese documento',
        duplicate: true,
        existingOwnerId: dupResult.existingOwnerId,
        existingOwnerName: dupResult.existingOwnerName,
      }
    }
    // Regular error case
    const errorResult = result as { error: string }
    return { error: errorResult.error }
  }

  return { success: true, data: { id: result.owner.id, fullName: result.owner.fullName } }
}

// ─── Reassign vehicle to existing owner ───────────────────────

export async function reassignVehicleToOwnerAction(
  _prev: OwnerFormState | null,
  formData: FormData,
): Promise<OwnerFormState> {
  const vehicleId = formData.get('vehicleId') as string
  const newOwnerId = formData.get('newOwnerId') as string
  const oldOwnerId = formData.get('oldOwnerId') as string

  if (!vehicleId || !newOwnerId) {
    return { error: 'Datos incompletos para la reasignación' }
  }

  try {
    // Update vehicle's ownerId to point to the existing owner
    await db
      .update(vehicles)
      .set({ ownerId: newOwnerId, updatedAt: new Date() })
      .where(eq(vehicles.id, vehicleId))

    // Optionally delete the old (wrong) owner if it has no other vehicles
    if (oldOwnerId) {
      const [otherVehicles] = await db
        .select({ count: sql<number>`count(*)` })
        .from(vehicles)
        .where(eq(vehicles.ownerId, oldOwnerId))

      if (Number(otherVehicles.count) === 0) {
        await db.delete(owners).where(eq(owners.id, oldOwnerId))
      }
    }

    return { success: true }
  } catch (e) {
    console.error('Error reassigning vehicle:', e)
    return { error: 'Error al reasignar el propietario. Intente de nuevo.' }
  }
}
