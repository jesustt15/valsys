'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { gncCylinders, inspectionAttachments } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createCylinderSchema, updateCylinderSchema, unlinkCylinderSchema, sendToPlantSchema, receiveFromPlantSchema, bulkSendToPlantSchema, bulkReceiveFromPlantSchema } from '@/lib/validations/cylinder'
import { getSession } from '@/lib/auth/get-session'
import { putObject } from '@/lib/minio'
import { createNotification } from '@/lib/services/notification'
import { sendCylinderToPlant, receiveCylinderFromPlant, unlinkCylinderFromVehicle, bulkSendCylindersToPlant, bulkReceiveCylindersFromPlant } from '@/lib/services/cylinder'
import { sanitizeFileName } from '@/lib/validations/video-upload'

// ─── Shared constants ───────────────────────────────────────────────────────

/** F8: 20 MB server-side cap for plant documents */
const PLANT_DOC_MAX_BYTES = 20 * 1024 * 1024

// ─── G10: PDF magic-byte sniff ──────────────────────────────────────────────

/**
 * Reads the first 5 bytes of a File and checks for '%PDF-' magic.
 * Follows the sniffVideoMagic precedent from video-upload.ts.
 */
async function sniffPdfMagic(file: File): Promise<boolean> {
  try {
    const buf = await file.slice(0, 5).arrayBuffer()
    const bytes = new Uint8Array(buf)
    // '%PDF-' = 0x25 0x50 0x44 0x46 0x2D
    return (
      bytes.length >= 5 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2D
    )
  } catch {
    return false
  }
}

export type CylinderFormState = {
  success?: boolean
  error?: string
  message?: string
  cylinderId?: string
}

export async function createCylinderAction(
  _prev: CylinderFormState | null,
  formData: FormData,
): Promise<CylinderFormState> {
  const session = await getSession()
  if (!session) return { error: 'No hay sesión activa' }

  const data = Object.fromEntries(formData)
  const parsed = createCylinderSchema.safeParse(data)
  
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    // F12: use .returning({ id }) to get the real cylinder id for notification
    const [inserted] = await db.insert(gncCylinders).values({
      ...parsed.data,
      status: 'activo',
      updatedBy: session.sub,
    }).returning({ id: gncCylinders.id })

    // Notification: cylinder created — use real cylinder id (F12)
    if (inserted) {
      try {
        await createNotification(session.sub, {
          type: 'cylinder_sent_to_plant',
          title: 'Cilindro registrado',
          message: `El cilindro ${parsed.data.brand} ${parsed.data.initialSerial} fue registrado como activo`,
          relatedEntityType: 'cylinder',
          relatedEntityId: inserted.id,
        })
      } catch (e) {
        console.error('Failed to create notification:', { context: 'createCylinder', error: e })
      }
    }

    const inspectionId = formData.get('inspectionId') as string
    if (inspectionId) {
      revalidatePath(`/inspections/${inspectionId}`)
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error creating cylinder:', { error })
    return { error: 'Error al registrar el cilindro' }
  }
}

export async function updateCylinderAction(
  _prev: CylinderFormState | null,
  formData: FormData,
): Promise<CylinderFormState> {
  const session = await getSession()
  if (!session) return { error: 'No hay sesión activa' }

  const parsed = updateCylinderSchema.safeParse({
    id: formData.get('id'),
    brand: formData.get('brand'),
    capacity: formData.get('capacity'),
    initialSerial: formData.get('initialSerial'),
    manufactureDate: formData.get('manufactureDate'),
    location: formData.get('location'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    // F12: use .returning({ id }) to detect no-op (cylinder not found)
    const [updated] = await db
      .update(gncCylinders)
      .set({
        brand: parsed.data.brand,
        capacity: parsed.data.capacity,
        initialSerial: parsed.data.initialSerial,
        manufactureDate: parsed.data.manufactureDate,
        location: parsed.data.location,
        updatedBy: session.sub,
        updatedAt: new Date(),
      })
      .where(eq(gncCylinders.id, parsed.data.id))
      .returning({ id: gncCylinders.id })

    if (!updated) {
      return { error: 'Cilindro no encontrado' }
    }

    const inspectionId = formData.get('inspectionId') as string
    if (inspectionId) {
      revalidatePath(`/inspections/${inspectionId}`)
    }

    return { success: true, cylinderId: parsed.data.id }
  } catch (error) {
    console.error('Error updating cylinder:', { cylinderId: parsed.data.id, error })
    return { error: 'Error al actualizar el cilindro' }
  }
}

export async function unlinkCylinderAction(
  _prev: CylinderFormState | null,
  formData: FormData,
): Promise<CylinderFormState> {
  const session = await getSession()
  if (!session) return { error: 'No autorizado' }

  const data = Object.fromEntries(formData)
  const parsed = unlinkCylinderSchema.safeParse(data)

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const result = await unlinkCylinderFromVehicle(
    parsed.data.id,
    parsed.data.inspectionId,
  )

  if (!result.success) {
    // H2: revalidatePath on failure so stale client state refreshes (parity with bulk)
    revalidatePath(`/inspections/${parsed.data.inspectionId}`)
    return { error: result.error }
  }

  // Notification
  try {
    await createNotification(session.sub, {
      type: 'cylinder_sent_to_plant',
      title: 'Cilindro desvinculado',
      message: 'Un cilindro fue desvinculado del vehículo',
      relatedEntityType: 'cylinder',
      relatedEntityId: parsed.data.id,
    })
  } catch (e) {
    console.error('Failed to create notification:', { context: 'unlinkCylinder', error: e })
  }

  revalidatePath(`/inspections/${parsed.data.inspectionId}`)

  return { success: true, cylinderId: parsed.data.id }
}

// ─── Send cylinder to plant ────────────────────────────────────────

export type SendToPlantFormState = {
  success?: boolean
  error?: string
  cylinderId?: string
}

export async function sendToPlantAction(
  _prev: SendToPlantFormState | null,
  formData: FormData,
): Promise<SendToPlantFormState> {
  const session = await getSession()
  if (!session) return { error: 'No autorizado' }

  const data = Object.fromEntries(formData)
  const parsed = sendToPlantSchema.safeParse(data)

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const result = await sendCylinderToPlant({
    cylinderId: parsed.data.cylinderId,
    inspectionId: parsed.data.inspectionId,
    sentAt: new Date(parsed.data.sentAt),
    updatedBy: session.sub,
  })

  if (!result.success) {
    // H2: revalidatePath on failure so stale client state refreshes (parity with bulk)
    revalidatePath(`/inspections/${parsed.data.inspectionId}`)
    return { error: result.error }
  }

  // Notification
  try {
    await createNotification(session.sub, {
      type: 'cylinder_sent_to_plant',
      title: 'Cilindro enviado a planta',
      message: 'El cilindro fue enviado a planta para recertificación',
      relatedEntityType: 'cylinder',
      relatedEntityId: parsed.data.cylinderId,
    })
  } catch (e) {
    console.error('Failed to create notification:', { context: 'sendToPlant', error: e })
  }

  revalidatePath(`/inspections/${parsed.data.inspectionId}`)

  return { success: true, cylinderId: parsed.data.cylinderId }
}

// ─── Receive cylinder from plant ───────────────────────────────────

export type ReceiveFromPlantFormState = {
  success?: boolean
  error?: string
  cylinderId?: string
  docError?: boolean
}

export async function receiveFromPlantAction(
  _prev: ReceiveFromPlantFormState | null,
  formData: FormData,
): Promise<ReceiveFromPlantFormState> {
  const session = await getSession()
  if (!session) return { error: 'No autorizado' }

  const data = Object.fromEntries(formData)
  const parsed = receiveFromPlantSchema.safeParse(data)

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // F8 + G10: Validate plant document (type + magic-byte sniff + size cap)
  const plantDoc = formData.get('plantDoc') as File
  if (plantDoc && plantDoc.size > 0) {
    if (plantDoc.type !== 'application/pdf') {
      return { error: 'El documento de planta debe ser PDF' }
    }
    // G10: magic-byte sniff — reject spoofed MIME
    if (!(await sniffPdfMagic(plantDoc))) {
      return { error: 'El documento de planta debe ser un PDF válido' }
    }
    if (plantDoc.size > PLANT_DOC_MAX_BYTES) {
      return { error: 'El documento de planta no puede superar los 20MB' }
    }
  }

  const result = await receiveCylinderFromPlant({
    cylinderId: parsed.data.cylinderId,
    inspectionId: parsed.data.inspectionId,
    result: parsed.data.result,
    receivedAt: new Date(parsed.data.receivedAt),
    actualSerial: parsed.data.actualSerial || undefined,
    recalificationDate: parsed.data.recalificationDate || undefined,
    updatedBy: session.sub,
  })

  if (!result.success) {
    // H2: revalidatePath on failure so stale client state refreshes (parity with bulk)
    revalidatePath(`/inspections/${parsed.data.inspectionId}`)
    return { error: result.error }
  }

  // F6: Upload plant document AFTER tx. On upload failure, return docError
  // flag so UI shows a warning instead of silently swallowing.
  let docError = false
  if (plantDoc && plantDoc.size > 0) {
    try {
      const timestamp = Date.now()
      // F8: sanitize the file name before building the MinIO key
      const safeName = sanitizeFileName(plantDoc.name)
      const minioKey = `inspections/${parsed.data.inspectionId}/plant/${parsed.data.cylinderId}/${timestamp}-${safeName}`

      await putObject(minioKey, plantDoc)

      // G6: persist the sanitized name (same safeName used for the MinIO key)
      await db.insert(inspectionAttachments).values({
        inspectionId: parsed.data.inspectionId,
        fileName: safeName,
        minioKey,
        fileType: plantDoc.type,
        fileSize: plantDoc.size,
        category: 'plant',
      })
    } catch (e) {
      console.error('Error uploading plant document:', {
        cylinderId: parsed.data.cylinderId,
        inspectionId: parsed.data.inspectionId,
        error: e,
      })
      docError = true
    }
  }

  // G4(b): notification must be honest when docError is set
  try {
    if (parsed.data.result === 'bueno') {
      const baseMsg = `El cilindro ${parsed.data.actualSerial || 's/n'} fue recertificado exitosamente`
      await createNotification(session.sub, {
        type: 'cylinder_recertified',
        title: docError ? 'Cilindro recertificado — documento pendiente' : 'Cilindro recertificado',
        message: docError ? `${baseMsg} — documento de planta NO subido, pendiente` : baseMsg,
        relatedEntityType: 'cylinder',
        relatedEntityId: parsed.data.cylinderId,
      })
    } else {
      const baseMsg = `El cilindro fue marcado como de baja`
      await createNotification(session.sub, {
        type: 'cylinder_scrapped',
        title: docError ? 'Cilindro dado de baja — documento pendiente' : 'Cilindro dado de baja',
        message: docError ? `${baseMsg} — documento de planta NO subido, pendiente` : baseMsg,
        relatedEntityType: 'cylinder',
        relatedEntityId: parsed.data.cylinderId,
      })
    }
  } catch (e) {
    console.error('Failed to create notification:', { context: 'receiveFromPlant', error: e })
  }

  revalidatePath(`/inspections/${parsed.data.inspectionId}`)

  return { success: true, cylinderId: parsed.data.cylinderId, docError }
}

// ─── Bulk operations ───────────────────────────────────────────────

export type BulkSendFormState = {
  success?: boolean
  error?: string
  bulk?: boolean
  count?: number
}

export async function bulkSendToPlantAction(
  _prev: BulkSendFormState | null,
  formData: FormData,
): Promise<BulkSendFormState> {
  const session = await getSession()
  if (!session) return { error: 'No autorizado' }

  const rawIds = formData.get('cylinderIds')
  if (typeof rawIds !== 'string') return { error: 'Selección inválida' }

  let cylinderIds: string[]
  try {
    cylinderIds = JSON.parse(rawIds)
  } catch {
    return { error: 'Selección inválida' }
  }

  // G2: guard against non-array JSON (e.g. "5" parses to a number)
  if (!Array.isArray(cylinderIds)) {
    return { error: 'Selección inválida' }
  }

  // F9: dedupe ids before schema validation
  cylinderIds = [...new Set(cylinderIds)]

  const parsed = bulkSendToPlantSchema.safeParse({
    cylinderIds,
    inspectionId: formData.get('inspectionId'),
    sentAt: formData.get('sentAt'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const result = await bulkSendCylindersToPlant({
    cylinderIds: parsed.data.cylinderIds,
    inspectionId: parsed.data.inspectionId,
    sentAt: new Date(parsed.data.sentAt),
    updatedBy: session.sub,
  })

  if (!result.success) {
    // F7: revalidatePath on precondition failure so stale client state refreshes
    revalidatePath(`/inspections/${parsed.data.inspectionId}`)
    return { error: result.error }
  }

  // Single summary notification
  try {
    await createNotification(session.sub, {
      type: 'cylinder_sent_to_plant',
      title: 'Cilindros enviados a planta',
      message: `${parsed.data.cylinderIds.length} cilindros enviados a planta para recertificación`,
      relatedEntityType: 'inspection',
      relatedEntityId: parsed.data.inspectionId,
    })
  } catch (e) {
    console.error('Failed to create notification:', { context: 'bulkSendToPlant', error: e })
  }

  revalidatePath(`/inspections/${parsed.data.inspectionId}`)

  return { success: true, bulk: true, count: parsed.data.cylinderIds.length }
}

export type BulkReceiveFormState = {
  success?: boolean
  error?: string
  bulk?: boolean
  count?: number
  docError?: boolean
}

export async function bulkReceiveFromPlantAction(
  _prev: BulkReceiveFormState | null,
  formData: FormData,
): Promise<BulkReceiveFormState> {
  const session = await getSession()
  if (!session) return { error: 'No autorizado' }

  const rawIds = formData.get('cylinderIds')
  if (typeof rawIds !== 'string') return { error: 'Selección inválida' }

  let cylinderIds: string[]
  try {
    cylinderIds = JSON.parse(rawIds)
  } catch {
    return { error: 'Selección inválida' }
  }

  // G2: guard against non-array JSON (e.g. "5" parses to a number)
  if (!Array.isArray(cylinderIds)) {
    return { error: 'Selección inválida' }
  }

  // F9: dedupe ids before schema validation
  cylinderIds = [...new Set(cylinderIds)]

  const parsed = bulkReceiveFromPlantSchema.safeParse({
    cylinderIds,
    inspectionId: formData.get('inspectionId'),
    result: formData.get('result'),
    receivedAt: formData.get('receivedAt'),
    recalificationDate: formData.get('recalificationDate'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // F8 + G10: Validate plant document (type + magic-byte sniff + size cap)
  const plantDoc = formData.get('plantDoc') as File
  if (plantDoc && plantDoc.size > 0) {
    if (plantDoc.type !== 'application/pdf') {
      return { error: 'El documento de planta debe ser PDF' }
    }
    // G10: magic-byte sniff — reject spoofed MIME
    if (!(await sniffPdfMagic(plantDoc))) {
      return { error: 'El documento de planta debe ser un PDF válido' }
    }
    if (plantDoc.size > PLANT_DOC_MAX_BYTES) {
      return { error: 'El documento de planta no puede superar los 20MB' }
    }
  }

  // F6: Generate MinIO key BEFORE tx, but upload AFTER tx.
  let plantDocKey: string | undefined

  if (plantDoc && plantDoc.size > 0) {
    const timestamp = Date.now()
    // G8: sanitize the file name before building the MinIO key
    const safeName = sanitizeFileName(plantDoc.name)
    // G9: add random component to prevent same-second retry collisions
    const randomSuffix = crypto.randomUUID().slice(0, 8)
    plantDocKey = `inspections/${parsed.data.inspectionId}/plant/bulk/${timestamp}-${randomSuffix}-${safeName}`
  }

  // F6: run the tx FIRST — avoids orphaned MinIO object on tx failure
  const result = await bulkReceiveCylindersFromPlant({
    cylinderIds: parsed.data.cylinderIds,
    inspectionId: parsed.data.inspectionId,
    result: parsed.data.result,
    receivedAt: new Date(parsed.data.receivedAt),
    recalificationDate: parsed.data.recalificationDate || undefined,
    updatedBy: session.sub,
  })

  if (!result.success) {
    // F7: revalidatePath on precondition failure so stale client state refreshes
    revalidatePath(`/inspections/${parsed.data.inspectionId}`)
    return { error: result.error }
  }

  // F6: Upload AFTER successful tx. Insert attachment row only if upload
  // succeeds. On upload failure, return docError flag for UI warning.
  let docError = false
  if (plantDoc && plantDoc.size > 0 && plantDocKey) {
    try {
      await putObject(plantDocKey, plantDoc)

      // G6: persist the sanitized name (same safeName used for the MinIO key)
      // We need to re-derive safeName here since it was declared in the outer
      // block — use the same sanitizeFileName call for consistency.
      const safeName = sanitizeFileName(plantDoc.name)
      // Upload succeeded — now insert the attachment row
      await db.insert(inspectionAttachments).values({
        inspectionId: parsed.data.inspectionId,
        fileName: safeName,
        minioKey: plantDocKey,
        fileType: plantDoc.type,
        fileSize: plantDoc.size,
        category: 'plant',
      })
    } catch (e) {
      console.error('Error uploading plant document:', {
        inspectionId: parsed.data.inspectionId,
        cylinderIds: parsed.data.cylinderIds,
        error: e,
      })
      docError = true
    }
  }

  // G4(b): notification must be honest when docError is set
  try {
    const verb = parsed.data.result === 'bueno' ? 'recertificados' : 'dados de baja'
    const baseMsg = `${parsed.data.cylinderIds.length} cilindros ${verb}`
    await createNotification(session.sub, {
      type: parsed.data.result === 'bueno' ? 'cylinder_recertified' : 'cylinder_scrapped',
      title: docError ? 'Cilindros recibidos — documento pendiente' : 'Cilindros recibidos de planta',
      message: docError ? `${baseMsg} — documento de planta NO subido, pendiente` : baseMsg,
      relatedEntityType: 'inspection',
      relatedEntityId: parsed.data.inspectionId,
    })
  } catch (e) {
    console.error('Failed to create notification:', { context: 'bulkReceiveFromPlant', error: e })
  }

  revalidatePath(`/inspections/${parsed.data.inspectionId}`)

  return { success: true, bulk: true, count: parsed.data.cylinderIds.length, docError }
}
