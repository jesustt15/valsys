import { z } from 'zod'

// ─── Regex ────────────────────────────────────────────────
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/
const PLATE_RE = /^[A-Z]{2,3}-?\d{3,4}$/

export const createVehicleSchema = z.object({
  ownerId: z.string().uuid('Seleccioná un dueño válido'),

  vin: z
    .string()
    .toUpperCase()
    .length(17, 'El VIN debe tener exactamente 17 caracteres')
    .regex(VIN_RE, 'VIN inválido. Solo letras (sin I, O, Q) y números'),

  licensePlate: z
    .string()
    .toUpperCase()
    .min(6, 'Patente debe tener al menos 6 caracteres')
    .max(8, 'Patente no puede exceder 8 caracteres')
    .regex(PLATE_RE, 'Formato: ABC-123 o ABC123'),

  vehicleType: z.enum(['camion', 'pickup', 'furgon', 'van', 'acoplado', 'otro'], {
    message: 'Seleccioná un tipo de vehículo',
  }),

  brand: z
    .string()
    .min(2, 'Marca debe tener al menos 2 caracteres')
    .max(50, 'Marca no puede exceder 50 caracteres'),

  model: z
    .string()
    .min(1, 'Modelo es requerido')
    .max(50, 'Modelo no puede exceder 50 caracteres'),

  year: z.coerce
    .number()
    .min(1990, 'Año mínimo: 1990')
    .max(new Date().getFullYear() + 1, `Año máximo: ${new Date().getFullYear() + 1}`),
})

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>

// ─── Update Vehicle (partial, no ownerId) ─────────────────────
export const updateVehicleSchema = createVehicleSchema.omit({ ownerId: true }).partial()

export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>
