import { z } from 'zod'

// ─── Checklist Answer ───────────────────────────────────────
export const checklistAnswerSchema = z.object({
  section: z.enum(['front', 'rear']),
  questionKey: z.string(),
  answer: z.boolean().nullable(),
  observations: z.string().optional(),
})

export const checklistAnswersSchema = z.array(checklistAnswerSchema).min(20)

// ─── Create Inspection ──────────────────────────────────────
export const createInspectionSchema = z.object({
  vehicleId: z.string().uuid('Seleccione un vehículo válido'),
  kmCurrent: z.coerce.number().min(1, 'Los kilómetros deben ser mayores a 0'),
  observations: z.string().optional(),
})

export type CreateInspectionInput = z.infer<typeof createInspectionSchema>

// ─── Photo Upload ───────────────────────────────────────────
export const photoUploadSchema = z.object({
  inspectionId: z.string().uuid(),
  category: z.enum(['initial', 'removal', 'post_mount']),
})

export type ChecklistAnswer = z.infer<typeof checklistAnswerSchema>
export type PhotoUploadInput = z.infer<typeof photoUploadSchema>

// ─── Close Inspection ─────────────────────────────────────────
export const closeInspectionSchema = z.object({
  inspectionId: z.string().uuid('ID de inspección inválido'),
})

export type CloseInspectionInput = z.infer<typeof closeInspectionSchema>
