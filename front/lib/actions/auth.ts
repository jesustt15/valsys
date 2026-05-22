'use server'

import { cookies } from 'next/headers'
import { loginSchema } from '@/lib/validations/auth'
import { authenticateUser } from '@/lib/services/auth'
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth/session'

export type AuthActionResult =
  | { success: true }
  | { error: string }

export async function loginAction(
  _prevState: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  try {
    const username = formData.get('username') as string
    const password = formData.get('password') as string

    if (!username || !password) {
      return { error: 'Completa todos los campos' }
    }

    // Validate
    const result = loginSchema.safeParse({ username, password })
    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    // Authenticate
    const authResult = await authenticateUser(username, password)
    if ('error' in authResult) {
      return { error: authResult.error }
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, authResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    })

    return { success: true }
  } catch {
    return { error: 'Error inesperado. Intenta nuevamente.' }
  }
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
