'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { certificates, inspections } from '@/db/schema'
import { createCertificateSchema } from '@/lib/validations/certificate'
import { putObject } from '@/lib/minio'
import { getSession } from '@/lib/auth/get-session'
import { eq } from 'drizzle-orm'
import { getCertifiableCylinders } from '@/lib/services/certificate'

export type CertificateFormState = {
  success?: boolean
  error?: string
  data?: { correlativeNumber: string }
  fields?: { correlativeNumber: string }
}

export async function createCertificateAction(
  _prev: CertificateFormState | null,
  formData: FormData
): Promise<CertificateFormState> {
  // 1. Auth check
  const session = await getSession()
  if (!session) {
    return { error: 'No autorizado' }
  }

  // 2. Extract and validate fields
  const inspectionId = formData.get('inspectionId') as string
  const correlativeNumber = formData.get('correlativeNumber') as string

  const validationResult = createCertificateSchema.safeParse({
    inspectionId,
    correlativeNumber,
  })

  if (!validationResult.success) {
    return {
      error: validationResult.error.issues?.[0]?.message ?? 'Error de validación',
      fields: { correlativeNumber: correlativeNumber || '' },
    }
  }

  const { inspectionId: validatedInspectionId, correlativeNumber: validatedCorrelative } =
    validationResult.data

  // 3. Check inspection status
  const [inspection] = await db
    .select({ status: inspections.status })
    .from(inspections)
    .where(eq(inspections.id, validatedInspectionId))

  if (!inspection) {
    return {
      error: 'La inspección no existe',
      fields: { correlativeNumber: validatedCorrelative },
    }
  }

  if (inspection.status !== 'cita') {
    return {
      error: 'La inspección debe estar en estado "Cita" para generar el certificado. Use el flujo de "Emitir Certificado" desde la inspección.',
      fields: { correlativeNumber: validatedCorrelative },
    }
  }

  // 4. Check existing certificate for this inspection
  const [existingCert] = await db
    .select({ id: certificates.id, correlativeNumber: certificates.correlativeNumber })
    .from(certificates)
    .where(eq(certificates.inspectionId, validatedInspectionId))

  if (existingCert) {
    return {
      error: 'Ya existe un certificado para esta inspección',
      fields: { correlativeNumber: validatedCorrelative },
    }
  }

  // 4b. Check duplicate correlative number
  const [duplicateCorrelative] = await db
    .select({ id: certificates.id })
    .from(certificates)
    .where(eq(certificates.correlativeNumber, validatedCorrelative))

  if (duplicateCorrelative) {
    return {
      error: 'El número correlativo ya existe',
      fields: { correlativeNumber: validatedCorrelative },
    }
  }

  // 4c. Get certifiable cylinders (for document assembly)
  const certifiableCylinders = await getCertifiableCylinders(validatedInspectionId)

  // 5. Upload to MinIO (optional — correlative-only is valid)
  const plantDoc = formData.get('plantDoc') as File | null
  let minioKey: string | null = null

  if (plantDoc && plantDoc.size > 0) {
    if (plantDoc.type !== 'application/pdf') {
      return {
        error: 'El documento de planta debe ser PDF',
        fields: { correlativeNumber: validatedCorrelative },
      }
    }

    minioKey = `certificates/${validatedInspectionId}/plant/${validatedCorrelative}.pdf`

    try {
      await putObject(minioKey, plantDoc)
    } catch (e) {
      console.error('Error uploading certificate to MinIO:', e)
      return {
        error: 'Error al subir el documento. Intente de nuevo.',
        fields: { correlativeNumber: validatedCorrelative },
      }
    }
  }

  // 6. Insert certificate + transition status in transaction
  try {
    await db.transaction(async (tx) => {
      await tx.insert(certificates).values({
        inspectionId: validatedInspectionId,
        correlativeNumber: validatedCorrelative,
        plantDocKey: minioKey,
        issueDate: new Date().toISOString().split('T')[0],
      })

      await tx
        .update(inspections)
        .set({ status: 'certificado', updatedAt: new Date() })
        .where(eq(inspections.id, validatedInspectionId))
    })
  } catch (e) {
    console.error('Error creating certificate record:', e)
    return {
      error: 'Error al crear el certificado. Intente de nuevo.',
      fields: { correlativeNumber: validatedCorrelative },
    }
  }

  // Auto-transition cylinders after certificate issuance
  try {
    const { autoTransitionCylinders } = await import('@/lib/services/cylinder')
    const [inspectionWithVehicle] = await db
      .select({ vehicleId: inspections.vehicleId })
      .from(inspections)
      .where(eq(inspections.id, validatedInspectionId))
      .limit(1)

    if (inspectionWithVehicle?.vehicleId) {
      await autoTransitionCylinders(inspectionWithVehicle.vehicleId, 'certificado')
    }
  } catch (e) {
    console.error('Failed to auto-transition cylinders to reinstalado:', e)
  }

  revalidatePath(`/inspections/${validatedInspectionId}`)
  revalidatePath('/inspections')
  revalidatePath('/dashboard')

  return {
    success: true,
    data: { correlativeNumber: validatedCorrelative },
  }
}
