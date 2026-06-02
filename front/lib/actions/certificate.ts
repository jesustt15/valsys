'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { certificates, inspections } from '@/db/schema'
import { createCertificateSchema } from '@/lib/validations/certificate'
import { putObject } from '@/lib/minio'
import { getSession } from '@/lib/auth/get-session'
import { eq } from 'drizzle-orm'

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

  if (inspection.status !== 'recalificacion' && inspection.status !== 'certificado') {
    return {
      error: 'La inspección no está en estado válido',
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

  // 5. Validate PDF file
  const plantDoc = formData.get('plantDoc') as File | null

  if (!plantDoc || plantDoc.size === 0 || plantDoc.type !== 'application/pdf') {
    return {
      error: 'El documento de planta es requerido y debe ser PDF',
      fields: { correlativeNumber: validatedCorrelative },
    }
  }

  // 6. Upload to MinIO
  const minioKey = `certificates/${validatedInspectionId}/plant/${validatedCorrelative}.pdf`

  try {
    await putObject(minioKey, plantDoc)
  } catch (e) {
    console.error('Error uploading certificate to MinIO:', e)
    return {
      error: 'Error al subir el documento. Intente de nuevo.',
      fields: { correlativeNumber: validatedCorrelative },
    }
  }

  // 7. Insert certificate record
  try {
    await db.insert(certificates).values({
      inspectionId: validatedInspectionId,
      correlativeNumber: validatedCorrelative,
      plantDocKey: minioKey,
      issueDate: new Date().toISOString().split('T')[0], // today's date as YYYY-MM-DD
    })
  } catch (e) {
    console.error('Error creating certificate record:', e)
    return {
      error: 'Error al crear el certificado. Intente de nuevo.',
      fields: { correlativeNumber: validatedCorrelative },
    }
  }

  revalidatePath(`/inspections/${validatedInspectionId}`)

  return {
    success: true,
    data: { correlativeNumber: validatedCorrelative },
  }
}
