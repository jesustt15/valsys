import { eq } from 'drizzle-orm'
import { hash } from '@node-rs/bcrypt'
import { db } from '@/lib/db'
import { users } from '@/db/schema'
import type { CreateUserInput, UpdateUserInput } from '@/lib/validations/user'

export type UserRecord = typeof users.$inferSelect

export async function getAllUsers(): Promise<UserRecord[]> {
  return db.select().from(users).orderBy(users.createdAt)
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return user ?? null
}

export async function createUser(data: CreateUserInput): Promise<UserRecord> {
  const passwordHash = await hash(data.password, 10)
  const [user] = await db
    .insert(users)
    .values({
      username: data.username,
      fullName: data.fullName,
      email: data.email,
      passwordHash,
      role: data.role,
    })
    .returning()
  return user
}

export async function updateUser(id: string, data: UpdateUserInput): Promise<UserRecord> {
  const updateData: Record<string, string | null> = {
    username: data.username,
    fullName: data.fullName,
    email: data.email ?? null,
    role: data.role,
  }

  // Only hash password if provided and non-empty
  if (data.password && data.password.length > 0) {
    updateData.passwordHash = await hash(data.password, 10)
  }

  const [user] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning()

  return user
}

export async function deleteUser(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id))
}
