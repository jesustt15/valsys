'use server'

import { db } from '@/lib/db'
import { owners } from '@/db/schema'
import { createOwnerSchema, buildDocumentId } from '@/lib/validations/owner'
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

  // Checkear duplicado
  const existing = await db
    .select({ id: owners.id })
    .from(owners)
    .where(eq(owners.documentId, documentId))
    .limit(1)

  if (existing.length > 0) {
    return { error: `Ya existe un dueño con documento ${documentId}` }
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
