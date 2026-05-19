'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { inspections, inspectionAnswers, inspectionAttachments, signatures } from '@/db/schema'
import { createInspectionSchema, checklistAnswersSchema } from '@/lib/validations/inspection'
import { ALL_QUESTIONS } from '@/lib/checklist'
import { putObject } from '@/lib/minio'
import { getSession } from '@/lib/auth/get-session'

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
