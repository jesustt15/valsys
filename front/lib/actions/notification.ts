'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/get-session'
import {
  getUserNotifications,
  getUnreadCount,
  markAllAsRead,
} from '@/lib/services/notification'

// ─── Response types ───────────────────────────────────────────

export type FetchNotificationsResponse = {
  notifications: Awaited<ReturnType<typeof getUserNotifications>>
  unreadCount: number
}

export type MarkAllReadResponse = {
  success?: boolean
  error?: string
  updatedCount?: number
}

// ─── Actions ──────────────────────────────────────────────────

export async function fetchNotificationsAction(): Promise<FetchNotificationsResponse> {
  const session = await getSession()
  if (!session) return { notifications: [], unreadCount: 0 }

  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(session.sub),
    getUnreadCount(session.sub),
  ])

  return { notifications, unreadCount }
}

export async function markAllReadAction(): Promise<MarkAllReadResponse> {
  const session = await getSession()
  if (!session) return { error: 'No hay sesión activa' }

  const updatedCount = await markAllAsRead(session.sub)
  revalidatePath('/')
  return { success: true, updatedCount }
}
