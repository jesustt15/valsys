import {
  ClipboardCheck,
  RotateCcw,
  CalendarX,
  CalendarClock,
  Award,
  Pause,
  type LucideIcon,
} from 'lucide-react'

export type StatusVariant = 'info' | 'warning' | 'success' | 'danger' | 'purple'

interface StatusMeta {
  label: string
  icon: LucideIcon
  variant: StatusVariant
}

/**
 * Shared status metadata — dedupes STATUS_LABELS + STATUS_BADGE from inspections-table
 * and adds icons per status (grayscale-safe: each status has unique icon + label + color).
 */
export const STATUS_META: Record<string, StatusMeta> = {
  inspeccion_inicial: {
    label: 'Inspección Inicial',
    icon: ClipboardCheck,
    variant: 'info',
  },
  recalificacion: {
    label: 'Recalificación',
    icon: RotateCcw,
    variant: 'warning',
  },
  por_programar: {
    label: 'Por Programar',
    icon: CalendarX,
    variant: 'danger',
  },
  cita: {
    label: 'Cita',
    icon: CalendarClock,
    variant: 'purple',
  },
  certificado: {
    label: 'Certificado',
    icon: Award,
    variant: 'success',
  },
  standby: {
    label: 'Standby',
    icon: Pause,
    variant: 'warning',
  },
}

/** Get status label (fallback to raw value if unknown) */
export function getStatusLabel(status: string): string {
  return STATUS_META[status]?.label ?? status
}

/** Get status variant (fallback to info) */
export function getStatusVariant(status: string): StatusVariant {
  return STATUS_META[status]?.variant ?? 'info'
}
