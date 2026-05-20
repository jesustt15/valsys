'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { gncCylinders, inspectionAttachments } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createCylinderSchema, updateCylinderStatusSchema, recertifyCylinderSchema } from '@/lib/validations/cylinder'
import { getSession } from '@/lib/auth/get-session'
import { putObject } from '@/lib/minio'

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
    // Status guard: if current status is en_planta, only allow pendiente_reinstalacion or de_baja
    const current = await db.select({ status: gncCylinders.status })
      .from(gncCylinders)
      .where(eq(gncCylinders.id, parsed.data.id))
      .limit(1)

    if (current.length && current[0].status === 'en_planta') {
      if (parsed.data.status !== 'pendiente_reinstalacion' && parsed.data.status !== 'de_baja') {
        return { error: 'Los cilindros en planta solo pueden pasar a "pendiente reinstalación" o "de baja"' }
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

    // Handle photo uploads (removal photos etc)
    const inspectionId = formData.get('inspectionId') as string
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

    revalidatePath(`/inspections/${parsed.data.inspectionId}`)

    return { success: true }
  } catch (error) {
    console.error('Error recertifying cylinder:', error)
    return { error: 'Error al recertificar el cilindro' }
  }
}
