'use server'

import { getSession } from '@/lib/auth/get-session'
import { changePasswordSchema } from '@/lib/validations/settings'
import { changePassword } from '@/lib/services/settings'

export type ChangePasswordState = {
  success?: boolean
  error?: string
} | null

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await getSession()
  if (!session || (session.role !== 'operator' && session.role !== 'admin')) {
    return { error: 'No autorizado' }
  }

  const raw = {
    currentPassword: formData.get('currentPassword') as string,
    newPassword: formData.get('newPassword') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  const result = changePasswordSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    const serviceResult = await changePassword(
      session.sub,
      result.data.currentPassword,
      result.data.newPassword,
    )
    if ('error' in serviceResult) {
      return { error: serviceResult.error }
    }
    return { success: true }
  } catch {
    return { error: 'Error inesperado. Intentá nuevamente.' }
  }
}
