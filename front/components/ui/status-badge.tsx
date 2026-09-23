import * as React from 'react'
import { cn } from '@/lib/utils'
import { STATUS_META, getStatusLabel, getStatusVariant } from '@/lib/status-display'

interface StatusBadgeProps {
  status: string
  className?: string
}

/**
 * Accessible status badge — renders icon + label + token colors.
 * Never icon-only: always includes text for grayscale/screen-reader accessibility.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = STATUS_META[status]
  const variant = meta?.variant ?? getStatusVariant(status)
  const label = meta?.label ?? getStatusLabel(status)
  const Icon = meta?.icon

  const variantClasses: Record<string, string> = {
    info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    success: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        variantClasses[variant],
        className
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      <span>{label}</span>
    </span>
  )
}
