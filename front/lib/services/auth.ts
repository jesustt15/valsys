import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users } from '@/db/schema'
import { createSession } from '@/lib/auth/session'

export type User = typeof users.$inferSelect

export async function getUserByUsername(
  username: string,
): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1)

  return user ?? null
}

export async function authenticateUser(
  username: string,
  password: string,
): Promise<{ user: User; token: string } | { error: string }> {
  try {
    const user = await getUserByUsername(username)

    if (!user) {
      return { error: 'Usuario o contraseña incorrectos' }
    }

    // Fix bcrypt $2y$ vs $2b$ compatibility
    let passwordHash = user.passwordHash
    if (passwordHash.startsWith('$2y$')) {
      passwordHash = passwordHash.replace('$2y$', '$2a$')
    }
    
    const passwordValid = await bcrypt.compare(password, passwordHash)

    if (!passwordValid) {
      return { error: 'Usuario o contraseña incorrectos' }
    }

    const token = await createSession(user.id, user.role ?? 'operator', user.fullName)

    return { user, token }
  } catch (e) {
    console.error('[auth] authenticateUser error:', e)
    return { error: 'Error interno del servidor. Intenta nuevamente.' }
  }
}
