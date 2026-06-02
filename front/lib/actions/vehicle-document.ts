'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { vehicleDocuments } from '@/db/schema'
import { putObject } from '@/lib/minio'
import { getSession } from '@/lib/auth/get-session'
import { upsertDoc } from '@/lib/services/vehicle-document'
import { z } from 'zod'

export type VehicleDocumentFormState = {
  success?: boolean
  error?: string
  data?: { id: string }
}

const uploadSchema = z.object({
  vehicleId: z.string().uuid('ID de vehículo inválido'),
  type: z.enum(['cedula', 'carnet'], { message: 'Tipo de documento inválido' }),
})

export async function uploadVehicleDocumentAction(
  _prev: VehicleDocumentFormState | null,
  formData: FormData,
): Promise<VehicleDocumentFormState> {
  const session = await getSession()
  if (!session) {
    return { error: 'No hay sesión activa. Inicie sesión nuevamente.' }
  }

  const parsed = uploadSchema.safeParse({
    vehicleId: formData.get('vehicleId'),
    type: formData.get('type'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues?.[0]?.message ?? 'Error de validación' }
  }

  const { vehicleId, type } = parsed.data
  const file = formData.get('file') as File | null

  if (!file || file.size === 0) {
    return { error: 'Debe seleccionar un archivo' }
  }

  try {
    const timestamp = Date.now()
    const minioKey = `vehicles/${vehicleId}/documents/${type}/${timestamp}-${file.name}`

    await putObject(minioKey, file)

    const doc = await upsertDoc(vehicleId, type, minioKey, file.name)

    revalidatePath(`/inspections/${formData.get('inspectionId') || ''}`)
    revalidatePath(`/vehicles/${vehicleId}`)

    return { success: true, data: { id: doc.id } }
  } catch (e) {
    console.error('Error uploading vehicle document:', e)
    return { error: 'Error al subir el documento. Intente de nuevo.' }
  }
}
