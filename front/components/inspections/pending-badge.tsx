import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { PendingItems } from '@/lib/services/inspection-pending'

/**
 * Extracted from inspections-table — shared by both table and card views.
 * Shows a compact indicator of pending items with icon + text.
 */
export function PendingBadge({
  pending,
  status,
}: {
  pending?: PendingItems
  status: string
}) {
  if (!pending) return <span className="text-xs text-muted-foreground">—</span>

  // Certificado con todo ok
  if (status === 'certificado' && pending.totalPending === 0 && pending.hasCertificate) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Completo
      </span>
    )
  }

  // Blocking issues
  if (pending.totalBlocking > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium" title={getPendingTitle(pending)}>
        <AlertCircle className="w-3.5 h-3.5" />
        {pending.totalBlocking} bloqueo{pending.totalBlocking > 1 ? 's' : ''}
      </span>
    )
  }

  // Warnings
  if (pending.totalWarnings > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400" title={getPendingTitle(pending)}>
        <AlertTriangle className="w-3.5 h-3.5" />
        {pending.totalWarnings} pendiente{pending.totalWarnings > 1 ? 's' : ''}
      </span>
    )
  }

  // No issues
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
      <CheckCircle2 className="w-3.5 h-3.5" />
      Sin novedad
    </span>
  )
}

export function getPendingTitle(pending: PendingItems): string {
  const parts: string[] = []
  if (pending.nonCompliantCount > 0) parts.push(`${pending.nonCompliantCount} ítem(s) no conforme(s)`)
  if (pending.cylindersInPlant > 0) parts.push(`${pending.cylindersInPlant} cilindro(s) en planta`)
  if (pending.cylindersPendingReinstall > 0) parts.push(`${pending.cylindersPendingReinstall} cilindro(s) pendiente(s) de reinstalación`)
  if (!pending.hasSignature) parts.push('Sin firma del titular')
  if (!pending.hasPostMountPhotos) parts.push('Sin fotos post-montaje')
  if (!pending.hasCertificate) parts.push('Sin certificado')
  return parts.join(' · ') || 'Sin novedad'
}
