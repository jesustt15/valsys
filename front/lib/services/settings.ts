import { eq } from 'drizzle-orm'
import { verify, hash } from '@node-rs/bcrypt'
import { db } from '@/lib/db'
import { users } from '@/db/schema'

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ success: true } | { error: string }> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    return { error: 'Usuario no encontrado' }
  }

  const isValid = await verify(currentPassword, user.passwordHash)
  if (!isValid) {
    return { error: 'La contraseña actual es incorrecta' }
  }

  const passwordHash = await hash(newPassword, 10)

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId))

  return { success: true }
}
