'use server'

import { db } from '@/lib/db'
import { owners } from '@/db/schema'
import { createOwnerSchema, updateOwnerSchema, buildDocumentId } from '@/lib/validations/owner'
import { updateOwner } from '@/lib/services/owner'
import { eq } from 'drizzle-orm'

export type OwnerFormState = {
  success?: boolean
  error?: string
  data?: { id: string; fullName: string }
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
    return { error: result.error }
  }

  return { success: true, data: { id: result.owner.id, fullName: result.owner.fullName } }
}
