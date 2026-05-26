'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Truck, AlertTriangle, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  fetchNotificationsAction,
  markAllReadAction,
} from '@/lib/actions/notification'
import type { NotificationRow, NotificationType } from '@/lib/services/notification'

// ─── Time-ago utility ─────────────────────────────────────────

function timeAgo(date: Date | null): string {
  if (!date) return ''
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'ahora'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days}d`
  return new Date(date).toLocaleDateString('es-AR')
}

// ─── Icon map ─────────────────────────────────────────────────

const typeIcons: Record<NotificationType, typeof Truck> = {
  cylinder_sent_to_plant: Truck,
  cylinder_recertified: CheckCircle,
  cylinder_scrapped: XCircle,
  inspection_pending_items: AlertTriangle,
  inspection_non_compliant: AlertTriangle,
}

const typeIconColors: Record<NotificationType, string> = {
  cylinder_sent_to_plant: 'text-blue-500',
  cylinder_recertified: 'text-green-500',
  cylinder_scrapped: 'text-red-500',
  inspection_pending_items: 'text-amber-500',
  inspection_non_compliant: 'text-red-500',
}

// ─── Props ────────────────────────────────────────────────────

interface NotificationPanelProps {
  initialUnreadCount: number
}

// ─── Component ────────────────────────────────────────────────

export function NotificationPanel({ initialUnreadCount }: NotificationPanelProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [isLoading, setIsLoading] = useState(false)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const openDropdown = useCallback(async () => {
    setIsOpen(true)
    setIsLoading(true)
    try {
      const result = await fetchNotificationsAction()
      setNotifications(result.notifications)
      setUnreadCount(result.unreadCount)
    } catch (e) {
      console.error('Failed to fetch notifications:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    setIsMarkingAll(true)
    // Optimistic update
    setUnreadCount(0)
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        readAt: new Date(),
        updatedAt: n.updatedAt,
      })),
    )
    try {
      const result = await markAllReadAction()
      if (result.error) {
        // Rollback on error — refetch
        openDropdown()
      }
    } catch {
      // Rollback
      openDropdown()
    } finally {
      setIsMarkingAll(false)
    }
  }, [openDropdown])

  const handleNotificationClick = useCallback(
    (n: NotificationRow) => {
      setIsOpen(false)
      if (n.relatedEntityType === 'inspection') {
        router.push(`/inspections/${n.relatedEntityId}`)
      }
      // For cylinders, navigate via the parent inspection context
      // or to the vehicle detail if available
    },
    [router],
  )

  return (
    <div className="relative">
      {/* Bell Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={openDropdown}
        className="relative p-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-background"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 bg-popover border border-border rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-popover z-10">
                <span className="text-sm font-semibold text-foreground">Notificaciones</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={isMarkingAll}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
                  >
                    {isMarkingAll ? 'Marcando...' : 'Marcar todas como leídas'}
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="py-1">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Bell className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No hay notificaciones</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const Icon = typeIcons[n.type] || Bell
                    const iconColor = typeIconColors[n.type] || 'text-muted-foreground'
                    const isUnread = !n.readAt

                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors ${
                          isUnread ? 'border-l-2 border-primary bg-primary/5' : 'border-l-2 border-transparent'
                        }`}
                      >
                        <div className={`mt-0.5 ${iconColor}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {n.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-muted-foreground/70">
                              {timeAgo(n.createdAt)}
                            </span>
                            {isUnread && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                            {n.relatedEntityId && (
                              <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/50" />
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
