import { z } from 'zod'

// ─── Regex ────────────────────────────────────────────────
const DOCUMENT_RE = /^[VEJ]-\d{6,10}$/
const NAME_RE = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{3,50}$/
const PHONE_RE = /^[\d\s\-\(\)\+]{7,20}$/

export const createOwnerSchema = z.object({
  fullName: z
    .string()
    .min(3, 'Nombre debe tener al menos 3 caracteres')
    .max(50, 'Nombre no puede exceder 50 caracteres')
    .regex(NAME_RE, 'Nombre solo puede contener letras y espacios'),

  documentType: z.enum(['V', 'E', 'J'], {
    errorMap: () => ({ message: 'Tipo de documento inválido' }),
  }),

  documentNumber: z
    .string()
    .min(6, 'Número debe tener al menos 6 dígitos')
    .max(10, 'Número no puede exceder 10 dígitos')
    .regex(/^\d+$/, 'Solo se permiten números'),

  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || PHONE_RE.test(val),
      { message: 'Teléfono inválido. Ej: 0414-1234567' }
    ),

  email: z
    .string()
    .optional()
    .refine(
      (val) => !val || z.string().email().safeParse(val).success,
      { message: 'Email inválido' }
    ),
})

export type CreateOwnerInput = z.infer<typeof createOwnerSchema>

// Helper para construir el documentId completo
export function buildDocumentId(
  type: 'V' | 'E' | 'J',
  number: string
): string {
  return `${type}-${number}`
}
