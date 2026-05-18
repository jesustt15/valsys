'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createUserSchema, updateUserSchema } from '@/lib/validations/user'
import * as userService from '@/lib/services/user'

export type UserFormState = {
  success?: boolean
  error?: string
  data?: { id: string }
}

// ── Guard helper ──────────────────────────────────────────────
async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    redirect('/dashboard')
  }
  return session
}

// ── Create User ───────────────────────────────────────────────
export async function createUserAction(
  _prev: UserFormState | null,
  formData: FormData,
): Promise<UserFormState> {
  await requireAdmin()

  const raw = {
    username: formData.get('username') as string,
    fullName: formData.get('fullName') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    role: formData.get('role') as string,
  }

  const result = createUserSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues?.[0]?.message ?? 'Error de validación' }
  }

  try {
    const user = await userService.createUser(result.data)
    revalidatePath('/admin/users')
    return { success: true, data: { id: user.id } }
  } catch (err: any) {
    // Duplicate key
    if (err?.code === '23505') {
      if (err.detail?.includes('username')) {
        return { error: 'El nombre de usuario ya existe' }
      }
      if (err.detail?.includes('email')) {
        return { error: 'El email ya existe' }
      }
    }
    return { error: 'Error al crear el usuario' }
  }
}

// ── Update User ───────────────────────────────────────────────
export async function updateUserAction(
  _prev: UserFormState | null,
  formData: FormData,
): Promise<UserFormState> {
  await requireAdmin()

  const id = formData.get('id') as string
  if (!id) return { error: 'ID de usuario requerido' }

  const raw = {
    username: formData.get('username') as string,
    fullName: formData.get('fullName') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    role: formData.get('role') as string,
  }

  const result = updateUserSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues?.[0]?.message ?? 'Error de validación' }
  }

  try {
    await userService.updateUser(id, result.data)
    revalidatePath('/admin/users')
    return { success: true }
  } catch (err: any) {
    if (err?.code === '23505') {
      if (err.detail?.includes('username')) {
        return { error: 'El nombre de usuario ya existe' }
      }
      if (err.detail?.includes('email')) {
        return { error: 'El email ya existe' }
      }
    }
    return { error: 'Error al actualizar el usuario' }
  }
}

// ── Delete User ───────────────────────────────────────────────
export async function deleteUserAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireAdmin()

  const id = formData.get('id') as string
  if (!id) return { error: 'ID de usuario requerido' }

  // Self-deletion guard
  if (id === session.sub) {
    return { error: 'No puedes eliminar tu propio usuario' }
  }

  try {
    await userService.deleteUser(id)
    revalidatePath('/admin/users')
    return { success: true }
  } catch {
    return { error: 'Error al eliminar el usuario' }
  }
}
