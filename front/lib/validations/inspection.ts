import { z } from 'zod'

// ─── Checklist Answer ───────────────────────────────────────
export const checklistAnswerSchema = z.object({
  section: z.enum(['front', 'rear']),
  questionKey: z.string(),
  answer: z.boolean().nullable(),
  observations: z.string().optional(),
})

export const checklistAnswersSchema = z.array(checklistAnswerSchema).min(18)

// ─── Create Inspection ──────────────────────────────────────
export const createInspectionSchema = z.object({
  vehicleId: z.string().uuid('Seleccione un vehículo válido'),
  kmCurrent: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().min(1, 'Los kilómetros deben ser mayores a 0').nullable().optional()
  ),
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

// ─── Toggle Answer ────────────────────────────────────────────
export const toggleAnswerSchema = z.object({
  answerId: z.string().uuid('ID de respuesta inválido'),
  expectedAnswer: z.boolean().nullable(),
})

export type ToggleAnswerInput = z.infer<typeof toggleAnswerSchema>

// ─── Unified Inspection (branch-aware) ──────────────────────
// Shared field groups used across both branches
const ownerFieldsShape = {
  documentType: z.enum(['V', 'E', 'J']),
  documentNumber: z.string().min(6).max(10).regex(/^\d+$/),
  fullName: z.string().min(3).max(50),
  phone: z.string().optional(),
  email: z.string().optional(),
} as const

const vehicleFieldsShape = {
  codigoUnicoGnc: z.string().toUpperCase().optional().or(z.literal('')),
  licensePlate: z
    .string()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]{5,6}$/, 'La placa debe comenzar con una letra y tener entre 6 y 7 caracteres alfanuméricos'),
  vehicleType: z.enum(['sedan', 'autobus', 'camion', 'pickup', 'camioneta', 'van']),
  brand: z.string().min(2).max(50),
  model: z.string().min(1).max(50),
  marcaKit: z.enum(['Landi Renzo', 'Tomasetto', 'BRC', 'MAT', 'Tartarini', 'OMVL']),
  specificAttributes: z.record(z.string(), z.unknown()).optional(),
} as const

export const cylinderInputSchema = z.object({
  brand: z.enum(['MAT', 'Sinoma', 'Kioshi', 'Cilbras', 'Faber', 'Inflex'], {
    message: 'Seleccione una marca de cilindro',
  }),
  capacity: z.enum(['27', '40', '50', '57', '60', '80', '90', '115'], {
    message: 'Seleccione una capacidad',
  }),
  initialSerial: z.string().min(1, 'Número de serie es requerido'),
  location: z.string().min(1, 'Ubicación es requerida'),
  status: z.enum(['en_planta', 'condenado']).optional(),
})

const montadosSchema = z.object({
  branch: z.literal('montados'),
  existingOwnerDocumentId: z.string().optional(),
  existingLicensePlate: z.string().optional(),
  ...ownerFieldsShape,
  ...vehicleFieldsShape,
  kmCurrent: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().min(1, 'Kilómetros deben ser mayor a 0').nullable().optional()
  ),
  observations: z.string().optional(),
  answers: z.array(checklistAnswerSchema).min(18, 'Todas las preguntas del checklist son requeridas'),
  signature: z.string().min(1, 'La firma del propietario es obligatoria'),
  cylinders: z.array(cylinderInputSchema).optional(),
})

const desmontadosSchema = z.object({
  branch: z.literal('desmontados'),
  existingOwnerDocumentId: z.string().optional(),
  existingLicensePlate: z.string().optional(),
  ...ownerFieldsShape,
  ...vehicleFieldsShape,
  kmCurrent: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().min(1, 'Kilómetros deben ser mayor a 0').nullable().optional()
  ),
  observations: z.string().optional(),
  answers: z.array(checklistAnswerSchema).max(0, 'No se permiten respuestas de checklist en desmontados'),
  signature: z.string().optional(),
  cylinders: z.array(cylinderInputSchema).min(1, 'Al menos un cilindro es requerido'),
})

export const unifiedInspectionSchema = z.discriminatedUnion('branch', [montadosSchema, desmontadosSchema])

export type UnifiedMontadosInput = z.infer<typeof montadosSchema>
export type UnifiedDesmontadosInput = z.infer<typeof desmontadosSchema>
export type UnifiedInspectionInput = z.infer<typeof unifiedInspectionSchema>

// ─── Schedule Appointment ─────────────────────────────────────
const isValidFutureDate = (val: string) => {
  const date = new Date(val)
  if (isNaN(date.getTime())) return false
  return date > new Date()
}

export const scheduleAppointmentSchema = z.object({
  id: z.string().uuid('ID de inspección inválido'),
  appointmentDate: z
    .string()
    .min(1, 'La fecha de la cita es obligatoria')
    .refine(isValidFutureDate, {
      message: 'La fecha de la cita debe ser una fecha futura válida',
    }),
})

export type ScheduleAppointmentInput = z.infer<typeof scheduleAppointmentSchema>
