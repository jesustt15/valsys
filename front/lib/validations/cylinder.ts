import { z } from 'zod'

export const createCylinderSchema = z.object({
  vehicleId: z.string().uuid(),
  brand: z.string().min(1, 'La marca es obligatoria'),
  capacity: z.string().min(1, 'La capacidad es obligatoria'),
  initialSerial: z.string().min(1, 'El número de serie inicial es obligatorio'),
  location: z.string().min(1, 'La ubicación es obligatoria'),
})

export const updateCylinderStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['montado', 'en_planta', 'pendiente_reinstalacion', 'de_baja']),
  actualSerial: z.string().optional(),
})
