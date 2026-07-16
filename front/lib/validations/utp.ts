import { z } from 'zod'
import { checklistAnswerSchema } from '@/lib/validations/inspection'

// ─── UTP Cylinder Schema (simplified — cylinders stay installed) ──────
export const utpCylinderInputSchema = z.object({
  brand: z.enum(['MAT', 'Sinoma', 'Kioshi', 'Cilbras', 'Faber', 'Inflex'], {
    message: 'Seleccione una marca de cilindro',
  }),
  capacity: z.enum(['27', '40', '50', '57', '60', '80', '90', '115'], {
    message: 'Seleccione una capacidad',
  }),
  initialSerial: z.string().min(1, 'Número de serial es requerido'),
  manufactureDate: z.string().min(1, 'La fecha de prueba es requerida'),
  location: z.string().min(1, 'Ubicación es requerida'),
})

// ─── UTP Inspection Schema (simplified — no branch, no appointment) ──────

const ownerFieldsShape = {
  documentType: z.enum(['V', 'E', 'J']),
  documentNumber: z.string().min(6).max(10).regex(/^\d+$/),
  fullName: z.string().min(3).max(50),
  phone: z.string().optional(),
  email: z.string().optional(),
} as const

const vehicleFieldsShape = {
  vinSerial: z.string().min(1, 'El serial VIN es obligatorio').max(50),
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

export const utpInspectionSchema = z.object({
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
  cylinders: z.array(utpCylinderInputSchema).optional(),
})

export type UtpInspectionInput = z.infer<typeof utpInspectionSchema>
export type UtpCylinderInput = z.infer<typeof utpCylinderInputSchema>
