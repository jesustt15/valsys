'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { inspections, inspectionAnswers, inspectionAttachments, signatures, gncCylinders, certificates, owners, vehicles } from '@/db/schema'
import { createInspectionSchema, checklistAnswersSchema, toggleAnswerSchema, unifiedInspectionSchema } from '@/lib/validations/inspection'
import { ALL_QUESTIONS } from '@/lib/checklist'
import { putObject } from '@/lib/minio'
import { getSession } from '@/lib/auth/get-session'
import { upsertDoc } from '@/lib/services/vehicle-document'
import { createNotification } from '@/lib/services/notification'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getNonCompliantAnswers, getPostMountAttachments, cycleInspectionAnswer, scheduleAppointment } from '@/lib/services/inspection'
import { getCertificateByInspectionId } from '@/lib/services/certificate'
import { canIssueCertificate } from '@/lib/services/inspection-gate'
import { scheduleAppointmentSchema } from '@/lib/validations/inspection'

export type InspectionFormState = {
  success?: boolean
  error?: string
  data?: { inspectionId: string }
  photoError?: string
}

export async function createInspectionAction(
  _prev: InspectionFormState | null,
  formData: FormData,
): Promise<InspectionFormState> {
  // Get current user from session
  const session = await getSession()
  if (!session) {
    return { error: 'No hay sesión activa. Inicie sesión nuevamente.' }
  }

  // Extract fields
  const vehicleId = formData.get('vehicleId') as string
  const kmCurrent = formData.get('kmCurrent') as string
  const observations = (formData.get('observations') as string) || undefined
  const answersJson = formData.get('answers') as string
  const category = (formData.get('category') as string) || 'initial'
  const signatureData = formData.get('signature') as string // base64 PNG

  // Parse and validate answers
  let answers: unknown
  try {
    answers = answersJson ? JSON.parse(answersJson) : []
  } catch {
    return { error: 'Error al procesar las respuestas del checklist' }
  }

  const answersResult = checklistAnswersSchema.safeParse(answers)
  if (!answersResult.success) {
    return { error: 'Respuestas del checklist inválidas' }
  }

  // Validate inspection data
  const inspectionResult = createInspectionSchema.safeParse({
    vehicleId,
    kmCurrent,
    observations,
  })
  if (!inspectionResult.success) {
    return { error: inspectionResult.error.issues?.[0]?.message ?? 'Error de validación' }
  }

  const { vehicleId: vid, kmCurrent: km, observations: obs } = inspectionResult.data

  // Signature is required for initial inspection
  if (!signatureData || !signatureData.startsWith('data:image')) {
    return { error: 'La firma del propietario es obligatoria para completar la inspección.' }
  }

  // Create inspection + answers in transaction
  let inspectionId: string
  let signatureId: string | undefined

  try {
    // Upload signature first if provided
    if (signatureData && signatureData.startsWith('data:image')) {
      const base64Data = signatureData.split(',')[1]
      const buffer = Buffer.from(base64Data, 'base64')
      const timestamp = Date.now()
      const minioKey = `signatures/${timestamp}.png`

      await putObject(minioKey, new File([buffer], 'signature.png', { type: 'image/png' }))

      const [sig] = await db
        .insert(signatures)
        .values({ minioKey })
        .returning({ id: signatures.id })

      signatureId = sig.id
    }

    const [inspection] = await db
      .insert(inspections)
      .values({
        vehicleId: vid,
        operatorId: session.sub,
        ownerSignatureId: signatureId,
        kmCurrent: km,
        observations: obs,
        status: 'inspeccion_inicial',
      })
      .returning({ id: inspections.id })

    inspectionId = inspection.id

    // Insert all 20 answers
    await db.insert(inspectionAnswers).values(
      answersResult.data.map((a) => ({
        inspectionId,
        section: a.section,
        questionKey: a.questionKey,
        answer: a.answer,
        observations: a.observations,
      })),
    )
  } catch (e) {
    console.error('Error creating inspection:', e)
    return { error: 'Error al crear la inspección. Intente de nuevo.' }
  }

  // Notification: inspection has pending or non-compliant answers
  try {
    const pendingCount = answersResult.data.filter(
      (a) => a.answer === null || a.answer === false,
    ).length
    if (pendingCount > 0) {
      await createNotification(session.sub, {
        type: 'inspection_pending_items',
        title: 'Inspección con pendientes',
        message: `La inspección tiene ${pendingCount} respuestas sin contestar o no conformes`,
        relatedEntityType: 'inspection',
        relatedEntityId: inspectionId,
      })
    }
  } catch (e) {
    console.error('Failed to create notification:', e)
  }

  // Insert cylinders if any
  const newCylindersJson = formData.get('newCylinders') as string
  if (newCylindersJson) {
    try {
      const cylindersToCreate = JSON.parse(newCylindersJson)
      if (Array.isArray(cylindersToCreate) && cylindersToCreate.length > 0) {
        await db.insert(gncCylinders).values(
          cylindersToCreate.map((c: Record<string, unknown>) => ({
            vehicleId: vid,
            brand: String(c.brand),
            capacity: String(c.capacity),
            initialSerial: String(c.initialSerial),
            location: String(c.location),
            status: 'instalado' as const,
            updatedBy: session.sub,
          }))
        )
      }
    } catch (e) {
      console.error('Error parsing/inserting cylinders:', e)
      // Non-fatal, let it continue
    }
  }

  // Upload photos (graceful failure — inspection + answers already persisted)
  let photoError: string | undefined
  const photos = formData.getAll('photos') as File[]
  if (photos.length > 0) {
    try {
      for (const file of photos) {
        console.log(
          '[createInspectionAction] photos received:',
          photos.map((f) => ({
            name: f?.name,
            size: f?.size,
            type: f?.type,
          }))
        )
        if (!file || file.size === 0) continue
        const timestamp = Date.now()
        const minioKey = `inspections/${inspectionId}/${category}/${timestamp}-${file.name}`
        await putObject(minioKey, file)
        await db.insert(inspectionAttachments).values({
          inspectionId,
          fileName: file.name,
          minioKey,
          fileType: file.type,
          fileSize: file.size,
          category: category as 'initial' | 'removal' | 'post_mount',
        })
      }
    } catch (e) {
      console.error('Error uploading photos:', e)
      photoError = 'La inspección se creó pero hubo un error al subir las fotos. Puede agregarlas luego.'
    }
  }

  revalidatePath('/inspections')
  return {
    success: true,
    data: { inspectionId },
    ...(photoError ? { photoError } : {}),
  }
}

export async function updateInspectionStatusAction(
  _prev: InspectionFormState | null,
  formData: FormData,
): Promise<InspectionFormState> {
  const session = await getSession()
  if (!session) return { error: 'No hay sesión activa' }

  const id = formData.get('id') as string
  const status = formData.get('status') as string

  const parsed = z.enum(['inspeccion_inicial', 'recalificacion', 'por_programar', 'cita']).safeParse(status)
  if (!id || !parsed.success) {
    return { error: 'Datos inválidos' }
  }

  try {
    await db.update(inspections)
      .set({ status: parsed.data, updatedAt: new Date() })
      .where(eq(inspections.id, id))

    revalidatePath(`/inspections/${id}`)
    revalidatePath('/inspections')
    return { success: true }
  } catch (e) {
    console.error('Error updating status:', e)
    return { error: 'Error al actualizar el estado' }
  }
}

export async function uploadInspectionFileAction(
  _prev: InspectionFormState | null,
  formData: FormData,
): Promise<InspectionFormState> {
  const session = await getSession()
  if (!session) return { error: 'No hay sesión activa' }

  const inspectionId = formData.get('inspectionId') as string
  const category = formData.get('category') as string
  // Support both 'photos' (PostMountPhotos / PhotoUpload component) and
  // 'files' (ExpedienteUploader) since both share this action
  const files = [
    ...formData.getAll('photos') as File[],
    ...formData.getAll('files') as File[],
  ].filter((f) => f instanceof File && f.size > 0)

  if (!inspectionId || !category || files.length === 0) {
    return { error: 'Faltan datos o archivos' }
  }

  try {
    for (const file of files) {
      if (!file || file.size === 0) continue
      const timestamp = Date.now()
      const minioKey = `inspections/${inspectionId}/${category}/${timestamp}-${file.name}`
      
      await putObject(minioKey, file)
      
      await db.insert(inspectionAttachments).values({
        inspectionId,
        fileName: file.name,
        minioKey,
        fileType: file.type,
        fileSize: file.size,
        category: category as 'initial' | 'removal' | 'post_mount' | 'plant' | 'signature',
      })
    }

    revalidatePath(`/inspections/${inspectionId}`)
    return { success: true }
  } catch (e) {
    console.error('Error uploading files:', e)
    return { error: 'Error al subir los archivos' }
  }
}

export type ToggleAnswerState = {
  success?: boolean
  error?: string
  data?: { answer: boolean | null }
}

export async function toggleInspectionAnswerAction(
  _prev: ToggleAnswerState | null,
  formData: FormData,
): Promise<ToggleAnswerState> {
  const session = await getSession()
  if (!session) return { error: 'No hay sesión activa' }

  const parsed = toggleAnswerSchema.safeParse({
    answerId: formData.get('answerId'),
    expectedAnswer: formData.get('expectedAnswer') === 'true' ? true : formData.get('expectedAnswer') === 'false' ? false : null,
  })

  if (!parsed.success) {
    return { error: 'Datos inválidos' }
  }

  const result = await cycleInspectionAnswer(parsed.data.answerId, parsed.data.expectedAnswer)

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath(`/inspections/${formData.get('inspectionId')}`)
  revalidatePath('/inspections')

  return { success: true, data: { answer: result.answer } }
}

export type MarkScheduledState = {
  success?: boolean
  error?: string
  data?: { correlativeNumber: string }
  missing?: string[]
}

// ─── Human-readable gate messages ────────────────────────────
const GATE_MESSAGES: Record<string, string> = {
  cylinders_pending: 'Hay cilindros pendientes en planta o por reinstalar',
  post_mount_photos: 'Se requieren fotos de post-montaje',
  signature: 'Se requiere la firma del propietario',
  checklist_incomplete: 'El checklist tiene respuestas pendientes',
  inspection_not_found: 'Inspección no encontrada',
  no_vehicle: 'La inspección no tiene vehículo asociado',
}

// ─── Schedule Appointment Action ──────────────────────────────

export async function scheduleAppointmentAction(
  _prev: InspectionFormState | null,
  formData: FormData,
): Promise<InspectionFormState> {
  const session = await getSession()
  if (!session) return { error: 'No hay sesión activa' }

  const parsed = scheduleAppointmentSchema.safeParse({
    id: formData.get('id'),
    appointmentDate: formData.get('appointmentDate'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const appointmentDate = new Date(parsed.data.appointmentDate)
  if (isNaN(appointmentDate.getTime())) {
    return { error: 'Fecha de cita inválida' }
  }

  const result = await scheduleAppointment(parsed.data.id, appointmentDate)

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath(`/inspections/${parsed.data.id}`)
  revalidatePath('/inspections')

  return { success: true }
}

// ─── Owner / Vehicle Lookup Actions ─────────────────────────────
export async function lookupOwnerAction(
  documentId: string,
): Promise<{ owner: { id: string; documentId: string; fullName: string; phone: string | null; email: string | null } | null; error?: string }> {
  try {
    const { getOwnerByDocumentId } = await import('@/lib/services/owner')
    const owner = await getOwnerByDocumentId(documentId)
    if (!owner) return { owner: null, error: `No se encontró propietario con documento ${documentId}` }
    return { owner: { id: owner.id, documentId: owner.documentId, fullName: owner.fullName, phone: owner.phone, email: owner.email } }
  } catch (e) {
    console.error('Error looking up owner:', e)
    return { owner: null, error: 'Error al buscar propietario' }
  }
}

export async function lookupVehicleAction(
  licensePlate: string,
): Promise<{ vehicle: { id: string; codigoUnicoGnc: string | null; licensePlate: string; vehicleType: string; brand: string | null; model: string | null; marcaKit: string | null; owner: { id: string; documentId: string; fullName: string; phone: string | null; email: string | null } | null } | null; error?: string }> {
  try {
    const { getVehicleByPlate } = await import('@/lib/services/vehicle')
    const vehicle = await getVehicleByPlate(licensePlate.toUpperCase())
    if (!vehicle) return { vehicle: null, error: `No se encontró vehículo con placa ${licensePlate}` }
    return {
      vehicle: {
        id: vehicle.id,
        codigoUnicoGnc: vehicle.codigoUnicoGnc,
        licensePlate: vehicle.licensePlate,
        vehicleType: vehicle.vehicleType,
        brand: vehicle.brand,
        model: vehicle.model,
        marcaKit: vehicle.marcaKit,
        owner: vehicle.owner ? {
          id: vehicle.owner.id,
          documentId: vehicle.owner.documentId,
          fullName: vehicle.owner.fullName,
          phone: vehicle.owner.phone,
          email: vehicle.owner.email,
        } : null,
      },
    }
  } catch (e) {
    console.error('Error looking up vehicle:', e)
    return { vehicle: null, error: 'Error al buscar vehículo' }
  }
}

// ─── Unified Inspection Action (single form, both paths) ──────
export async function createUnifiedInspectionAction(
  _prev: InspectionFormState | null,
  formData: FormData,
): Promise<InspectionFormState> {
  const session = await getSession()
  if (!session) {
    return { error: 'No hay sesión activa. Inicie sesión nuevamente.' }
  }

  // Extract branch
  const branch = formData.get('branch') as string
  if (!branch || !['montados', 'desmontados'].includes(branch)) {
    return { error: 'Debe seleccionar un tipo de ingreso (montados/desmontados)' }
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
    branch,
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
  const parsed = unifiedInspectionSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues?.[0]?.message ?? 'Error de validación'
    return { error: firstError }
  }

  const data = parsed.data
  const buildDocId = (type: string, num: string) => `${type}-${num}`

  try {
    // Run everything in a single transaction
    const result = await db.transaction(async (tx) => {
      // 1. Resolve Owner
      let ownerId: string | undefined

      if (data.existingOwnerDocumentId) {
        // Reuse existing owner
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

        // Check if owner already exists by this document ID
        const [existing] = await tx
          .select({ id: owners.id })
          .from(owners)
          .where(eq(owners.documentId, documentId))
          .limit(1)

        if (existing) {
          ownerId = existing.id
        } else {
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

        // Check if vehicle exists by plate
        const [existing] = await tx
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(eq(vehicles.licensePlate, plate))
          .limit(1)

        if (existing) {
          vehicleId = existing.id
        } else {
          // Check codigoUnicoGnc duplicate (only if provided)
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

      // 3. Create Inspection
      let inspectionId: string
      let signatureId: string | undefined

      if (data.signature) {
        // Upload signature first
        const base64Data = data.signature.split(',')[1]
        const buffer = Buffer.from(base64Data, 'base64')
        const timestamp = Date.now()
        const minioKey = `signatures/${timestamp}.png`
        await putObject(minioKey, new File([buffer], 'signature.png', { type: 'image/png' }))

        const [sig] = await tx
          .insert(signatures)
          .values({ minioKey })
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
        })
        .returning({ id: inspections.id })

      inspectionId = inspection.id

      // 4. Insert checklist answers (montados only)
      if (data.branch === 'montados' && data.answers && data.answers.length > 0) {
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
            status: data.branch === 'montados' ? ('instalado' as const) : ((c.status || 'en_planta') as 'en_planta' | 'condenado'),
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
        // Non-fatal
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
        // Non-fatal
      }
    }

    // Notification for pending items (montados)
    if (data.branch === 'montados' && data.answers) {
      try {
        const pendingCount = data.answers.filter(
          (a: { answer: boolean | null }) => a.answer === null || a.answer === false,
        ).length
        if (pendingCount > 0) {
          await createNotification(session.sub, {
            type: 'inspection_pending_items',
            title: 'Inspección con pendientes',
            message: `La inspección tiene ${pendingCount} respuestas sin contestar o no conformes`,
            relatedEntityType: 'inspection',
            relatedEntityId: result.inspectionId,
          })
        }
      } catch (e) {
        console.error('Failed to create notification:', e)
      }
    }

    // 6. Upload photos (graceful failure — inspection + answers + cylinders already persisted)
    let photoError: string | undefined
    const photos = formData.getAll('photos') as File[]
    const category = branch === 'montados' ? 'initial' : 'removal'
    if (photos.length > 0) {
      try {
        for (const file of photos) {
          if (!file || file.size === 0) continue
          const timestamp = Date.now()
          const minioKey = `inspections/${result.inspectionId}/${category}/${timestamp}-${file.name}`
          await putObject(minioKey, file)
          await db.insert(inspectionAttachments).values({
            inspectionId: result.inspectionId,
            fileName: file.name,
            minioKey,
            fileType: file.type,
            fileSize: file.size,
            category: category as 'initial' | 'removal' | 'post_mount',
          })
        }
      } catch (e) {
        console.error('Error uploading photos:', e)
        photoError = 'La inspección se creó pero hubo un error al subir las fotos. Puede agregarlas luego.'
      }
    }

    revalidatePath('/inspections')
    return {
      success: true,
      data: { inspectionId: result.inspectionId },
      ...(photoError ? { photoError } : {}),
    }
  } catch (e) {
    console.error('Error creating unified inspection:', e)
    const message = e instanceof Error ? e.message : 'Error al crear la inspección. Intente de nuevo.'
    return { error: message }
  }
}

export async function markAsScheduledAction(
  _prev: MarkScheduledState | null,
  formData: FormData,
): Promise<MarkScheduledState> {
  const session = await getSession()
  if (!session) return { error: 'No hay sesión activa' }

  const id = formData.get('id') as string
  const correlativeNumber = formData.get('correlativeNumber') as string
  if (!id || !correlativeNumber || correlativeNumber.trim().length === 0) {
    return { error: 'El número correlativo es requerido' }
  }

  const inspectionId = id

  // 1. Fetch inspection and verify status is cita
  const [inspection] = await db
    .select()
    .from(inspections)
    .where(eq(inspections.id, inspectionId))

  if (!inspection) {
    return { error: 'Inspección no encontrada' }
  }

  if (inspection.status !== 'cita') {
    return { error: "La inspección debe estar en estado 'cita'" }
  }

  // 2. Gate check — verify all preconditions for certificate issuance
  const gate = await canIssueCertificate(inspectionId)
  if (!gate.canIssue) {
    const messages = gate.missing.map((key) => GATE_MESSAGES[key] ?? key)
    return {
      error: messages.join('. '),
      missing: gate.missing,
    }
  }

  // 3. Check existing certificate
  const existingCert = await getCertificateByInspectionId(inspectionId)
  if (existingCert) {
    return { error: 'Ya existe un certificado para esta inspección' }
  }

  // 4. Check duplicate correlative
  const [duplicate] = await db
    .select({ id: certificates.id })
    .from(certificates)
    .where(eq(certificates.correlativeNumber, correlativeNumber.trim()))

  if (duplicate) {
    return { error: 'El número correlativo ya existe' }
  }

  // 5. Create certificate + transition status in transaction
  try {
    await db.transaction(async (tx) => {
      await tx.insert(certificates).values({
        inspectionId,
        correlativeNumber: correlativeNumber.trim(),
        plantDocKey: null,
        finalCertKey: null,
        issueDate: new Date().toISOString().split('T')[0],
      })

      await tx
        .update(inspections)
        .set({ status: 'certificado', updatedAt: new Date() })
        .where(eq(inspections.id, inspectionId))
    })
  } catch (e) {
    console.error('Error marking inspection as scheduled:', e)
    return { error: 'Error al emitir el certificado. Intente de nuevo.' }
  }

  revalidatePath(`/inspections/${inspectionId}`)
  revalidatePath('/inspections')

  return {
    success: true,
    data: { correlativeNumber: correlativeNumber.trim() },
  }
}

export type SignatureCaptureState = {
  success?: boolean
  error?: string
}

export async function captureSignatureAction(
  _prev: SignatureCaptureState | null,
  formData: FormData,
): Promise<SignatureCaptureState> {
  const session = await getSession()
  if (!session) return { error: 'No hay sesión activa' }

  const inspectionId = formData.get('inspectionId') as string
  const signatureData = formData.get('signature') as string

  if (!inspectionId || !signatureData || !signatureData.startsWith('data:image')) {
    return { error: 'Firma inválida o faltante' }
  }

  try {
    // Upload signature to MinIO
    const base64Data = signatureData.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')
    const timestamp = Date.now()
    const minioKey = `signatures/${timestamp}.png`

    await putObject(minioKey, new File([buffer], 'signature.png', { type: 'image/png' }))

    // Create signature record
    const [sig] = await db
      .insert(signatures)
      .values({ minioKey })
      .returning({ id: signatures.id })

    // Update inspection with signature reference
    await db
      .update(inspections)
      .set({ ownerSignatureId: sig.id, updatedAt: new Date() })
      .where(eq(inspections.id, inspectionId))

    revalidatePath(`/inspections/${inspectionId}`)
    return { success: true }
  } catch (e) {
    console.error('Error capturing signature:', e)
    return { error: 'Error al guardar la firma. Intente de nuevo.' }
  }
}
