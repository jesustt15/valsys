'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { gncCylinders, inspectionAttachments, signatures, inspections } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createCylinderSchema, updateCylinderStatusSchema, recertifyCylinderSchema, decideCylinderFateSchema } from '@/lib/validations/cylinder'
import { getSession } from '@/lib/auth/get-session'
import { putObject } from '@/lib/minio'
import { createNotification } from '@/lib/services/notification'
import { decideCylinderFate } from '@/lib/services/cylinder'

export type CylinderFormState = {
  success?: boolean
  error?: string
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
    await db.insert(gncCylinders).values({
      ...parsed.data,
      updatedBy: session.sub,
    })

    // Notification: cylinder sent to plant
    try {
      await createNotification(session.sub, {
        type: 'cylinder_sent_to_plant',
        title: 'Cilindro enviado a planta',
        message: `El cilindro ${parsed.data.brand} ${parsed.data.initialSerial} fue enviado a planta`,
        relatedEntityType: 'cylinder',
        relatedEntityId: parsed.data.vehicleId,
      })
    } catch (e) {
      console.error('Failed to create notification:', e)
    }

    const inspectionId = formData.get('inspectionId') as string
    if (inspectionId) {
      revalidatePath(`/inspections/${inspectionId}`)
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error creating cylinder:', error)
    return { error: 'Error al registrar el cilindro' }
  }
}

export async function updateCylinderStatusAction(
  _prev: CylinderFormState | null,
  formData: FormData,
): Promise<CylinderFormState> {
  const session = await getSession()
  if (!session) return { error: 'No hay sesión activa' }

  const parsed = updateCylinderStatusSchema.safeParse({
    id: formData.get('id'),
    status: formData.get('status'),
    actualSerial: formData.get('actualSerial') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    // Status guard: validate allowed transitions based on current status
    const current = await db.select({ status: gncCylinders.status })
      .from(gncCylinders)
      .where(eq(gncCylinders.id, parsed.data.id))
      .limit(1)

    if (current.length) {
      if (current[0].status === 'instalado') {
        if (parsed.data.status !== 'en_planta' && parsed.data.status !== 'condenado') {
          return { error: 'Los cilindros instalados solo pueden pasarse a "en planta" o "condenado"' }
        }
      } else if (current[0].status === 'en_planta') {
        if (parsed.data.status !== 'pendiente_reinstalacion' && parsed.data.status !== 'condenado') {
          return { error: 'Los cilindros en planta solo pueden pasar a "pendiente reinstalación" o "condenado"' }
        }
      } else if (current[0].status === 'pendiente_reinstalacion') {
        if (parsed.data.status !== 'reinstalado') {
          return { error: 'Los cilindros pendientes de reinstalación solo pueden marcarse como "reinstalado"' }
        }
      }
    }

    await db.update(gncCylinders)
      .set({
        status: parsed.data.status,
        actualSerial: parsed.data.actualSerial,
        updatedBy: session.sub,
        updatedAt: new Date(),
      })
      .where(eq(gncCylinders.id, parsed.data.id))

    // Handle signature when dismounting (en_planta transition)
    const inspectionId = formData.get('inspectionId') as string
    const signatureData = formData.get('signature') as string

    if (parsed.data.status === 'en_planta' && inspectionId && signatureData?.startsWith('data:image')) {
      try {
        const base64Data = signatureData.split(',')[1]
        const buffer = Buffer.from(base64Data, 'base64')
        const timestamp = Date.now()
        const minioKey = `signatures/${timestamp}.png`

        await putObject(minioKey, new File([buffer], 'signature.png', { type: 'image/png' }))

        const [sig] = await db
          .insert(signatures)
          .values({ minioKey })
          .returning({ id: signatures.id })

        await db
          .update(inspections)
          .set({ ownerSignatureId: sig.id, updatedAt: new Date() })
          .where(eq(inspections.id, inspectionId))
      } catch (e) {
        console.error('Error saving signature during dismount:', e)
        // Non-fatal: cylinder status already updated
      }
    }

    // Handle photo uploads (removal photos etc)
    const photos = formData.getAll('photos') as File[]
    const category = formData.get('category') as string // 'removal' | 'post_mount'

    if (photos.length > 0 && inspectionId && category) {
      for (const file of photos) {
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
          category: category as 'removal' | 'post_mount',
        })
      }
    }

    if (inspectionId) {
      revalidatePath(`/inspections/${inspectionId}`)
    }

    // Notifications
    if (parsed.data.status === 'condenado') {
      try {
        await createNotification(session.sub, {
          type: 'cylinder_scrapped',
          title: 'Cilindro condenado',
          message: 'El cilindro fue marcado como condenado',
          relatedEntityType: 'cylinder',
          relatedEntityId: parsed.data.id,
        })
      } catch (e) {
        console.error('Failed to create notification:', e)
      }
    } else if (parsed.data.status === 'reinstalado') {
      try {
        await createNotification(session.sub, {
          type: 'cylinder_sent_to_plant',
          title: 'Cilindro reinstalado',
          message: 'El cilindro fue reinstalado en el vehículo',
          relatedEntityType: 'cylinder',
          relatedEntityId: parsed.data.id,
        })
      } catch (e) {
        console.error('Failed to create notification:', e)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating cylinder status:', error)
    return { error: 'Error al actualizar el estado del cilindro' }
  }
}

export async function recertifyCylinderAction(
  _prev: CylinderFormState | null,
  formData: FormData,
): Promise<CylinderFormState> {
  const session = await getSession()
  if (!session) return { error: 'No autorizado' }

  const data = Object.fromEntries(formData)
  const parsed = recertifyCylinderSchema.safeParse(data)

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    // DB read: verify current status is en_planta
    const cylinder = await db.select({ status: gncCylinders.status })
      .from(gncCylinders)
      .where(eq(gncCylinders.id, parsed.data.id))
      .limit(1)

    if (!cylinder.length || cylinder[0].status !== 'en_planta') {
      return { error: "Solo se pueden recertificar cilindros en estado 'en_planta'" }
    }

    // Validate plant document BEFORE DB update
    const plantDoc = formData.get('plantDoc') as File
    if (plantDoc && plantDoc.size > 0) {
      if (plantDoc.type !== 'application/pdf') {
        return { error: 'El documento de planta debe ser PDF' }
      }
    }

    // DB update: cylinder record (only after all validation passes)
    await db.update(gncCylinders)
      .set({
        status: parsed.data.status,
        actualSerial: parsed.data.actualSerial || null,
        recalificationDate: parsed.data.recalificationDate || null,
        updatedBy: session.sub,
        updatedAt: new Date(),
      })
      .where(eq(gncCylinders.id, parsed.data.id))

    // Upload plant document (after DB update — orphan risk accepted, consistent with existing patterns)
    if (plantDoc && plantDoc.size > 0) {
      const timestamp = Date.now()
      const minioKey = `inspections/${parsed.data.inspectionId}/plant/${parsed.data.id}/${timestamp}-${plantDoc.name}`

      await putObject(minioKey, plantDoc)

      await db.insert(inspectionAttachments).values({
        inspectionId: parsed.data.inspectionId,
        fileName: plantDoc.name,
        minioKey,
        fileType: plantDoc.type,
        fileSize: plantDoc.size,
        category: 'plant',
      })
    }

    // Notification: recertified or scrapped
    try {
      if (parsed.data.status === 'pendiente_reinstalacion') {
        await createNotification(session.sub, {
          type: 'cylinder_recertified',
          title: 'Cilindro recertificado',
          message: `El cilindro ${parsed.data.actualSerial ?? 's/n'} fue recertificado exitosamente`,
          relatedEntityType: 'cylinder',
          relatedEntityId: parsed.data.id,
        })
      } else if (parsed.data.status === 'condenado') {
        await createNotification(session.sub, {
          type: 'cylinder_scrapped',
          title: 'Cilindro condenado',
          message: `El cilindro ${parsed.data.actualSerial ?? 's/n'} fue marcado como condenado`,
          relatedEntityType: 'cylinder',
          relatedEntityId: parsed.data.id,
        })
      }
    } catch (e) {
      console.error('Failed to create notification:', e)
    }

    revalidatePath(`/inspections/${parsed.data.inspectionId}`)

    return { success: true }
  } catch (error) {
    console.error('Error recertifying cylinder:', error)
    return { error: 'Error al recertificar el cilindro' }
  }
}

export async function decideCylinderFateAction(
  _prev: CylinderFormState | null,
  formData: FormData,
): Promise<CylinderFormState> {
  const session = await getSession()
  if (!session) return { error: 'No autorizado' }

  const data = Object.fromEntries(formData)
  const parsed = decideCylinderFateSchema.safeParse(data)

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // Validate plant document BEFORE calling service
  const plantDoc = formData.get('plantDoc') as File
  if (plantDoc && plantDoc.size > 0) {
    if (plantDoc.type !== 'application/pdf') {
      return { error: 'El documento de planta debe ser PDF' }
    }
  }

  const result = await decideCylinderFate({
    cylinderId: parsed.data.id,
    inspectionId: parsed.data.inspectionId,
    status: parsed.data.status,
    actualSerial: parsed.data.actualSerial,
    recalificationDate: parsed.data.recalificationDate,
    updatedBy: session.sub,
  })

  if (!result.success) {
    return { error: result.error }
  }

  // Upload plant document after DB update
  if (plantDoc && plantDoc.size > 0) {
    try {
      const timestamp = Date.now()
      const minioKey = `inspections/${parsed.data.inspectionId}/plant/${parsed.data.id}/${timestamp}-${plantDoc.name}`
      await putObject(minioKey, plantDoc)

      const { db } = await import('@/lib/db')
      const { inspectionAttachments } = await import('@/db/schema')
      await db.insert(inspectionAttachments).values({
        inspectionId: parsed.data.inspectionId,
        fileName: plantDoc.name,
        minioKey,
        fileType: plantDoc.type,
        fileSize: plantDoc.size,
        category: 'plant',
      })
    } catch (e) {
      console.error('Error uploading plant document:', e)
      // Non-fatal — cylinder fate already decided
    }
  }

  // Notification
  try {
    if (parsed.data.status === 'pendiente_reinstalacion') {
      await createNotification(session.sub, {
        type: 'cylinder_recertified',
        title: 'Cilindro recertificado',
        message: `El cilindro fue recertificado exitosamente`,
        relatedEntityType: 'cylinder',
        relatedEntityId: parsed.data.id,
      })
    } else if (parsed.data.status === 'condenado') {
      await createNotification(session.sub, {
        type: 'cylinder_scrapped',
        title: 'Cilindro condenado',
        message: `El cilindro fue marcado como condenado`,
        relatedEntityType: 'cylinder',
        relatedEntityId: parsed.data.id,
      })
    }
  } catch (e) {
    console.error('Failed to create notification:', e)
  }

  revalidatePath(`/inspections/${parsed.data.inspectionId}`)

  return { success: true }
}
