import { z } from 'zod'

export const createCylinderSchema = z.object({
  vehicleId: z.string().uuid(),
  brand: z.string().min(1, 'La marca es obligatoria'),
  capacity: z.string().min(1, 'La capacidad es obligatoria'),
  initialSerial: z.string().min(1, 'El número de serial es obligatorio'),
  manufactureDate: z.string().min(1, 'La fecha de prueba es obligatoria'),
  location: z.string().min(1, 'La ubicación es obligatoria'),
})

export const updateCylinderSchema = z.object({
  id: z.string().uuid(),
  brand: z.string().min(1, 'La marca es obligatoria'),
  capacity: z.string().min(1, 'La capacidad es obligatoria'),
  initialSerial: z.string().min(1, 'El número de serial es obligatorio'),
  manufactureDate: z.string().min(1, 'La fecha de prueba es obligatoria'),
  location: z.string().min(1, 'La ubicación es obligatoria'),
})

export const unlinkCylinderSchema = z.object({
  id: z.string().uuid(),
  inspectionId: z.string().uuid(),
})

// ─── Send / receive cylinder plant flow ─────────────────────────────

export const sendToPlantSchema = z.object({
  cylinderId: z.string().uuid(),
  inspectionId: z.string().uuid(),
  sentAt: z.string().min(1, 'La fecha de envío es requerida'),
})

export const receiveFromPlantSchema = z.object({
  cylinderId: z.string().uuid(),
  inspectionId: z.string().uuid(),
  result: z.enum(['bueno', 'malo']),
  receivedAt: z.string().min(1, 'La fecha de recepción es requerida'),
  actualSerial: z.string().optional().or(z.literal('')),
  recalificationDate: z.string().optional().or(z.literal('')),
})

// ─── Bulk send / receive ────────────────────────────────────────────

export const bulkSendToPlantSchema = z.object({
  cylinderIds: z.array(z.string().uuid()).min(1, 'Debe seleccionar al menos un cilindro').max(20, 'No se pueden seleccionar más de 20 cilindros'),
  inspectionId: z.string().uuid(),
  sentAt: z.string().min(1, 'La fecha de envío es requerida'),
})

export const bulkReceiveFromPlantSchema = z.object({
  cylinderIds: z.array(z.string().uuid()).min(1, 'Debe seleccionar al menos un cilindro').max(20, 'No se pueden seleccionar más de 20 cilindros'),
  inspectionId: z.string().uuid(),
  result: z.enum(['bueno', 'malo']),
  receivedAt: z.string().min(1, 'La fecha de recepción es requerida'),
  recalificationDate: z.string().optional().or(z.literal('')),
})
