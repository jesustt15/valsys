import { z } from 'zod'

// ─── Regex ────────────────────────────────────────────────
const PLATE_RE = /^[A-Z][A-Z0-9]{5,6}$/

export const createVehicleSchema = z.object({
  ownerId: z.string().uuid('Seleccioná un dueño válido'),

  codigoUnicoGnc: z
    .string()
    .toUpperCase()
    .optional()
    .or(z.literal('')),

  licensePlate: z
    .string()
    .toUpperCase()
    .min(6, 'La placa debe tener al menos 6 caracteres')
    .max(7, 'La placa no puede exceder 7 caracteres')
    .regex(PLATE_RE, 'La placa debe comenzar con una letra y tener entre 6 y 7 caracteres alfanuméricos'),

  vehicleType: z.enum(['sedan', 'autobus', 'camion', 'pickup', 'camioneta', 'van'], {
    message: 'Seleccioná un tipo de vehículo válido',
  }),

  brand: z
    .string()
    .min(2, 'Marca debe tener al menos 2 caracteres')
    .max(50, 'Marca no puede exceder 50 caracteres'),

  model: z
    .string()
    .min(1, 'Modelo es requerido')
    .max(50, 'Modelo no puede exceder 50 caracteres'),

  marcaKit: z
    .string()
    .max(50, 'Marca de KIT no puede exceder 50 caracteres')
    .optional()
    .or(z.literal('')),
})

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>

// ─── Update Vehicle (partial, no ownerId) ─────────────────────
export const updateVehicleSchema = createVehicleSchema.omit({ ownerId: true }).partial()

export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>
