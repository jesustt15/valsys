'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { inspections, inspectionAnswers, inspectionAttachments, signatures, gncCylinders, certificates, owners, vehicles } from '@/db/schema'
import { utpInspectionSchema } from '@/lib/validations/utp'
import { putObject } from '@/lib/minio'
import { getSession } from '@/lib/auth/get-session'
import { upsertDoc } from '@/lib/services/vehicle-document'
import { createNotification } from '@/lib/services/notification'
import { canIssueUtpCertificate } from '@/lib/services/utp'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

export type UtpFormState = {
  success?: boolean
  error?: string
  data?: { inspectionId: string }
  photoError?: string
}

export async function createUtpInspectionAction(
  _prev: UtpFormState | null,
  formData: FormData,
): Promise<UtpFormState> {
  const session = await getSession()
  if (!session) {
    return { error: 'No hay sesión activa. Inicie sesión nuevamente.' }
  }

  // Parse JSON fields
  let answers: unknown = []
  let cylinders: unknown = []
  try {
    const answersStr = formData.get('answers') as string
    if (answersStr) answers = JSON.parse(answersStr)
    const cylindersStr = formData.get('cylinders') as string
    if (cylindersStr) cylinders = JSON.parse(cylindersStr)
  } catch {
    return { error: 'Error al procesar los datos del formulario' }
  }

  // Build the input object for Zod validation
  const input = {
    existingOwnerDocumentId: formData.get('existingOwnerDocumentId') as string || undefined,
    existingLicensePlate: formData.get('existingLicensePlate') as string || undefined,
    documentType: formData.get('documentType') as string || undefined,
    documentNumber: formData.get('documentNumber') as string || undefined,
    fullName: formData.get('fullName') as string || undefined,
    phone: formData.get('phone') as string || undefined,
    email: formData.get('email') as string || undefined,
    codigoUnicoGnc: formData.get('codigoUnicoGnc') as string || undefined,
    licensePlate: formData.get('licensePlate') as string || undefined,
    vehicleType: formData.get('vehicleType') as string || undefined,
    brand: formData.get('brand') as string || undefined,
    model: formData.get('model') as string || undefined,
    marcaKit: formData.get('marcaKit') as string || undefined,
    specificAttributes: formData.get('specificAttributes') as string || undefined,
    kmCurrent: formData.get('kmCurrent') as string || undefined,
    observations: formData.get('observations') as string || undefined,
    answers,
    signature: formData.get('signature') as string || undefined,
    cylinders,
  }

  // Parse specificAttributes JSON if string
  if (typeof input.specificAttributes === 'string') {
    try { input.specificAttributes = JSON.parse(input.specificAttributes) } catch { input.specificAttributes = undefined }
  }

  // Validate
  const parsed = utpInspectionSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues?.[0]?.message ?? 'Error de validación'
    return { error: firstError }
  }

  // Explicit signature guard
  if (!parsed.data.signature || parsed.data.signature.trim().length === 0) {
    return { error: 'La firma del propietario es obligatoria para completar la inspección.' }
  }

  const data = parsed.data
  const buildDocId = (type: string, num: string) => `${type}-${num}`

  // ── Upload signature to MinIO BEFORE the transaction ──
  let uploadedSigKey: string | undefined
  if (data.signature) {
    try {
      const base64Data = data.signature.split(',')[1]
      const buffer = Buffer.from(base64Data, 'base64')
      const timestamp = Date.now()
      uploadedSigKey = `signatures/${timestamp}.png`
      await putObject(uploadedSigKey, new File([buffer], 'signature.png', { type: 'image/png' }))
    } catch (e) {
      console.error('Error uploading signature to MinIO:', e)
      return { error: 'Error al subir la firma. Verifique la conexión e intente de nuevo.' }
    }
  }

  try {
    // Run everything in a single DB transaction
    const result = await db.transaction(async (tx) => {
      // 1. Resolve Owner
      let ownerId: string | undefined

      if (data.existingOwnerDocumentId) {
        const [existing] = await tx
          .select({ id: owners.id })
          .from(owners)
          .where(eq(owners.documentId, data.existingOwnerDocumentId))
          .limit(1)
        if (existing) {
          ownerId = existing.id
        }
      }

      if (!ownerId && data.documentType && data.documentNumber && data.fullName) {
        const documentId = buildDocId(data.documentType, data.documentNumber)

        const [existing] = await tx
          .select({ id: owners.id })
          .from(owners)
          .where(eq(owners.documentId, documentId))
          .limit(1)

        if (existing) {
          ownerId = existing.id
        } else {
          if (data.phone) {
            const dupPhone = await tx
              .select({ id: owners.id })
              .from(owners)
              .where(eq(owners.phone, data.phone))
              .limit(1)
            if (dupPhone.length > 0) {
              throw new Error('El número de teléfono ya está registrado para otro propietario')
            }
          }

          if (data.email) {
            const dupEmail = await tx
              .select({ id: owners.id })
              .from(owners)
              .where(eq(owners.email, data.email))
              .limit(1)
            if (dupEmail.length > 0) {
              throw new Error('El correo electrónico ya está registrado para otro propietario')
            }
          }

          const [created] = await tx
            .insert(owners)
            .values({
              documentId,
              fullName: data.fullName,
              phone: data.phone || null,
              email: data.email || null,
            })
            .returning({ id: owners.id })
          ownerId = created.id
        }
      }

      if (!ownerId) {
        throw new Error('Debe proporcionar datos del propietario o un documento existente')
      }

      // 2. Resolve Vehicle
      let vehicleId: string | undefined

      if (data.existingLicensePlate) {
        const [existing] = await tx
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(eq(vehicles.licensePlate, data.existingLicensePlate.toUpperCase()))
          .limit(1)
        if (existing) {
          vehicleId = existing.id
        }
      }

      if (!vehicleId && data.licensePlate) {
        const plate = data.licensePlate.toUpperCase()

        const [existing] = await tx
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(eq(vehicles.licensePlate, plate))
          .limit(1)

        if (existing) {
          vehicleId = existing.id
        } else {
          if (data.codigoUnicoGnc) {
            const dupGnc = await tx
              .select({ id: vehicles.id })
              .from(vehicles)
              .where(eq(vehicles.codigoUnicoGnc, data.codigoUnicoGnc))
              .limit(1)

            if (dupGnc.length > 0) {
              throw new Error(`Ya existe un vehículo con Código Único GNC ${data.codigoUnicoGnc}`)
            }
          }

          const [created] = await tx
            .insert(vehicles)
            .values({
              ownerId,
              codigoUnicoGnc: data.codigoUnicoGnc || null,
              licensePlate: plate,
              vehicleType: data.vehicleType || 'sedan',
              brand: data.brand || null,
              model: data.model || null,
              marcaKit: data.marcaKit || null,
              specificAttributes: data.specificAttributes || null,
            })
            .returning({ id: vehicles.id })
          vehicleId = created.id
        }
      }

      if (!vehicleId) {
        throw new Error('Debe proporcionar datos del vehículo o una placa existente')
      }

      // 3. Create Inspection (UTP)
      let inspectionId: string
      let signatureId: string | undefined

      if (uploadedSigKey) {
        const [sig] = await tx
          .insert(signatures)
          .values({ minioKey: uploadedSigKey })
          .returning({ id: signatures.id })
        signatureId = sig.id
      }

      const [inspection] = await tx
        .insert(inspections)
        .values({
          vehicleId,
          operatorId: session.sub,
          ownerSignatureId: signatureId,
          kmCurrent: data.kmCurrent,
          observations: data.observations || null,
          status: 'inspeccion_inicial',
          source: 'utp',
        })
        .returning({ id: inspections.id })

      inspectionId = inspection.id

      // 4. Insert checklist answers
      if (data.answers && data.answers.length > 0) {
        await tx.insert(inspectionAnswers).values(
          (data.answers as Array<{ section: string; questionKey: string; answer: boolean | null; observations?: string }>).map((a) => ({
            inspectionId,
            section: a.section,
            questionKey: a.questionKey,
            answer: a.answer,
            observations: a.observations || null,
          }))
        )
      }

      // 5. Insert cylinders
      if (data.cylinders && data.cylinders.length > 0) {
        await tx.insert(gncCylinders).values(
          data.cylinders.map((c) => ({
            vehicleId,
            brand: c.brand,
            capacity: c.capacity,
            initialSerial: c.initialSerial,
            location: c.location,
            status: 'instalado' as const,
            updatedBy: session.sub,
          }))
        )
      }

      return { inspectionId, vehicleId, ownerId }
    })

    // After transaction: upload vehicle documents (if any)
    const cedulaFile = formData.get('cedula') as File | null
    const carnetFile = formData.get('carnet') as File | null

    if (cedulaFile && cedulaFile.size > 0) {
      try {
        const timestamp = Date.now()
        const minioKey = `vehicles/${result.vehicleId}/documents/cedula/${timestamp}-${cedulaFile.name}`
        await putObject(minioKey, cedulaFile)
        await upsertDoc(result.vehicleId, 'cedula', minioKey, cedulaFile.name)
      } catch (e) {
        console.error('Error uploading cédula:', e)
      }
    }

    if (carnetFile && carnetFile.size > 0) {
      try {
        const timestamp = Date.now()
        const minioKey = `vehicles/${result.vehicleId}/documents/carnet/${timestamp}-${carnetFile.name}`
        await putObject(minioKey, carnetFile)
        await upsertDoc(result.vehicleId, 'carnet', minioKey, carnetFile.name)
      } catch (e) {
        console.error('Error uploading carnet:', e)
      }
    }

    // Notification for pending items
    if (data.answers) {
      try {
        const pendingCount = data.answers.filter(
          (a: { answer: boolean | null }) => a.answer === null || a.answer === false,
        ).length
        if (pendingCount > 0) {
          await createNotification(session.sub, {
            type: 'inspection_pending_items',
            title: 'Inspección UTP con pendientes',
            message: `La inspección UTP tiene ${pendingCount} respuestas sin contestar o no conformes`,
            relatedEntityType: 'inspection',
            relatedEntityId: result.inspectionId,
          })
        }
      } catch (e) {
        console.error('Failed to create notification:', e)
      }
    }

    // Upload photos (graceful failure)
    let photoError: string | undefined
    const photos = formData.getAll('photos') as File[]
    if (photos.length > 0) {
      try {
        for (const file of photos) {
          if (!file || file.size === 0) continue
          const timestamp = Date.now()
          const minioKey = `inspections/${result.inspectionId}/initial/${timestamp}-${file.name}`
          await putObject(minioKey, file)
          await db.insert(inspectionAttachments).values({
            inspectionId: result.inspectionId,
            fileName: file.name,
            minioKey,
            fileType: file.type,
            fileSize: file.size,
            category: 'initial',
          })
        }
      } catch (e) {
        console.error('Error uploading photos:', e)
        photoError = 'La inspección se creó pero hubo un error al subir las fotos. Puede agregarlas luego.'
      }
    }

    revalidatePath('/utp')
    return {
      success: true,
      data: { inspectionId: result.inspectionId },
      ...(photoError ? { photoError } : {}),
    }
  } catch (e) {
    console.error('Error creating UTP inspection:', e)
    const message = e instanceof Error ? e.message : 'Error al crear la inspección UTP. Intente de nuevo.'
    return { error: message }
  }
}

const HARDCODED_UTP_GATE_MESSAGES: Record<string, string> = {
  inspection_not_found: 'Inspección UTP no encontrada',
  non_compliant_answers: 'La inspección tiene respuestas no conformes o pendientes',
  signature_required: 'Se requiere la firma del propietario para emitir el certificado',
}

// ─── Issue UTP Certificate Action ─────────────────────────────

export type UtpCertificateState = {
  success?: boolean
  error?: string
  data?: { correlativeNumber: string }
  missing?: string[]
}

export async function issueUtpCertificateAction(
  _prev: UtpCertificateState | null,
  formData: FormData,
): Promise<UtpCertificateState> {
  const session = await getSession()
  if (!session) return { error: 'No hay sesión activa' }

  const inspectionId = formData.get('id') as string
  const correlativeNumber = formData.get('correlativeNumber') as string
  const scanFile = formData.get('scanDoc') as File | null

  if (!inspectionId || !correlativeNumber || correlativeNumber.trim().length === 0) {
    return { error: 'El número correlativo es requerido' }
  }

  // 1. Gate check
  const gate = await canIssueUtpCertificate(inspectionId)
  if (!gate.canIssue) {
    const messages = gate.missing.map((key) => HARDCODED_UTP_GATE_MESSAGES[key] ?? key)
    return {
      error: messages.join('. '),
      missing: gate.missing,
    }
  }

  // 2. Check existing certificate
  const [existingCert] = await db
    .select({ id: certificates.id })
    .from(certificates)
    .where(eq(certificates.inspectionId, inspectionId))

  if (existingCert) {
    return { error: 'Ya existe un certificado para esta inspección UTP' }
  }

  // 3. Check duplicate correlative
  const [duplicate] = await db
    .select({ id: certificates.id })
    .from(certificates)
    .where(eq(certificates.correlativeNumber, correlativeNumber.trim()))

  if (duplicate) {
    return { error: 'El número correlativo ya existe' }
  }

  // 4. Upload scan document (if provided)
  let finalCertKey: string | null = null
  if (scanFile && scanFile.size > 0) {
    try {
      const timestamp = Date.now()
      const minioKey = `certificates/${inspectionId}/scan/${timestamp}-${scanFile.name}`
      await putObject(minioKey, scanFile)
      finalCertKey = minioKey
    } catch (e) {
      console.error('Error uploading scan document:', e)
      // Non-fatal for now — certificate still issues
    }
  }

  // 5. Create certificate + transition status in transaction
  try {
    await db.transaction(async (tx) => {
      await tx.insert(certificates).values({
        inspectionId,
        correlativeNumber: correlativeNumber.trim(),
        plantDocKey: null,
        finalCertKey,
        issueDate: new Date().toISOString().split('T')[0],
      })

      await tx
        .update(inspections)
        .set({ status: 'certificado', updatedAt: new Date() })
        .where(eq(inspections.id, inspectionId))
    })
  } catch (e) {
    console.error('Error issuing UTP certificate:', e)
    return { error: 'Error al emitir el certificado UTP. Intente de nuevo.' }
  }

  revalidatePath(`/utp/${inspectionId}`)
  revalidatePath('/utp')

  return {
    success: true,
    data: { correlativeNumber: correlativeNumber.trim() },
  }
}

// ─── Mark UTP Standby Action ──────────────────────────────────

export type UtpStandbyState = {
  success?: boolean
  error?: string
}

const standbySchema = z.object({
  id: z.string().uuid('ID de inspección inválido'),
  observations: z.string().min(1, 'Las observaciones son requeridas para marcar como standby'),
})

export async function markUtpStandbyAction(
  _prev: UtpStandbyState | null,
  formData: FormData,
): Promise<UtpStandbyState> {
  const session = await getSession()
  if (!session) return { error: 'No hay sesión activa' }

  const parsed = standbySchema.safeParse({
    id: formData.get('id'),
    observations: formData.get('observations'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { id, observations } = parsed.data

  // Verify UTP inspection exists and is in valid state
  const [inspection] = await db
    .select()
    .from(inspections)
    .where(and(eq(inspections.id, id), eq(inspections.source, 'utp')))
    .limit(1)

  if (!inspection) {
    return { error: 'Inspección UTP no encontrada' }
  }

  if (inspection.status !== 'inspeccion_inicial' && inspection.status !== 'standby') {
    return { error: 'Solo inspecciones en estado inicial o standby pueden marcarse como standby' }
  }

  try {
    await db
      .update(inspections)
      .set({
        status: 'standby',
        observations,
        updatedAt: new Date(),
      })
      .where(eq(inspections.id, id))
  } catch (e) {
    console.error('Error marking UTP inspection as standby:', e)
    return { error: 'Error al marcar la inspección como standby' }
  }

  revalidatePath(`/utp/${id}`)
  revalidatePath('/utp')

  return { success: true }
}
