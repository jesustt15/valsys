import { db } from '@/lib/db'
import { notifications, notificationType } from '@/db/schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'

// ─── Types ────────────────────────────────────────────────────

export type NotificationType = typeof notificationType[number]

export interface CreateNotificationInput {
  type: NotificationType
  title: string
  message: string
  relatedEntityType: 'inspection' | 'cylinder'
  relatedEntityId: string
}

export interface NotificationRow {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  relatedEntityType: string
  relatedEntityId: string
  readAt: Date | null
  createdAt: Date | null
  updatedAt: Date | null
}

// ─── Functions ────────────────────────────────────────────────
// All receive `userId` explicitly — no session dependency.

export async function createNotification(
  userId: string,
  data: CreateNotificationInput,
): Promise<void> {
  await db.insert(notifications).values({
    userId,
    type: data.type,
    title: data.title,
    message: data.message,
    relatedEntityType: data.relatedEntityType,
    relatedEntityId: data.relatedEntityId,
  })
}

export async function getUserNotifications(
  userId: string,
  opts?: { limit?: number },
): Promise<NotificationRow[]> {
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(opts?.limit ?? 20)
}

export async function getUnreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ),
    )
  return Number(row?.value ?? 0)
}

export async function markAsRead(
  notificationId: string,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .update(notifications)
    .set({ readAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
      ),
    )
    .returning({ id: notifications.id })
  return !!row
}

export async function markAllAsRead(userId: string): Promise<number> {
  const rows = await db
    .update(notifications)
    .set({ readAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id })
  return rows.length
}
