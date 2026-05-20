const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

export function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Fecha desconocida'

  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffMin = Math.round(diffMs / 60_000)
  const diffHr = Math.round(diffMs / 3_600_000)
  const diffDay = Math.round(diffMs / 86_400_000)

  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute')
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour')
  if (Math.abs(diffDay) < 7) return rtf.format(diffDay, 'day')

  return date.toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
