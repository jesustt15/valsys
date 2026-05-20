import { z } from 'zod'

export const createCertificateSchema = z.object({
  inspectionId: z.string().uuid(),
  correlativeNumber: z.string().trim().min(1, 'El número correlativo es requerido'),
})

export type CreateCertificateInput = z.infer<typeof createCertificateSchema>
