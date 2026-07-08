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
  status: z.enum(['instalado', 'desmontado', 'en_planta', 'pendiente_reinstalacion', 'reinstalado', 'condenado']),
  actualSerial: z.string().optional(),
})

export const recertifyCylinderSchema = z.object({
  id: z.string().uuid(),
  inspectionId: z.string().uuid(),
  status: z.enum(['pendiente_reinstalacion', 'condenado']),
  actualSerial: z.string().optional(),
  recalificationDate: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.status === 'pendiente_reinstalacion') {
    if (!data.actualSerial || data.actualSerial.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El número de serie actual es obligatorio para recertificación',
        path: ['actualSerial'],
      })
    }
    if (!data.recalificationDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de recalificación es obligatoria para recertificación',
        path: ['recalificationDate'],
      })
    }
  }
})

export const decideCylinderFateSchema = z.object({
  id: z.string().uuid(),
  inspectionId: z.string().uuid(),
  status: z.enum(['pendiente_reinstalacion', 'condenado']),
  actualSerial: z.string().optional(),
  recalificationDate: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.status === 'pendiente_reinstalacion') {
    if (!data.actualSerial || data.actualSerial.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El número de serie actual es obligatorio para recertificación',
        path: ['actualSerial'],
      })
    }
    if (!data.recalificationDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de recalificación es obligatoria para recertificación',
        path: ['recalificationDate'],
      })
    }
  }
})
