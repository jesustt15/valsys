'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { gncCylinders, inspectionAttachments } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createCylinderSchema, updateCylinderStatusSchema } from '@/lib/validations/cylinder'
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
    return { error: parsed.error.errors[0].message }
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
    return { error: parsed.error.errors[0].message }
  }

  try {
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
