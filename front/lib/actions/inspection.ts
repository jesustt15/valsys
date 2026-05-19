'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { inspections, inspectionAnswers, inspectionAttachments } from '@/db/schema'
import { createInspectionSchema, checklistAnswersSchema } from '@/lib/validations/inspection'
import { ALL_QUESTIONS } from '@/lib/checklist'
import { putObject } from '@/lib/minio'

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
  // Extract fields
  const vehicleId = formData.get('vehicleId') as string
  const kmCurrent = formData.get('kmCurrent') as string
  const observations = (formData.get('observations') as string) || undefined
  const answersJson = formData.get('answers') as string
  const category = (formData.get('category') as string) || 'initial'

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

  // Create inspection + answers in transaction
  let inspectionId: string
  try {
    const [inspection] = await db
      .insert(inspections)
      .values({
        vehicleId: vid,
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

  // Upload photos (graceful failure — inspection + answers already persisted)
  let photoError: string | undefined
  const photos = formData.getAll('photos') as File[]
  if (photos.length > 0) {
    try {
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
