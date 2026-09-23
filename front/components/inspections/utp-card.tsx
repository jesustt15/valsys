import Link from 'next/link'
import { FileText } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import type { UtpInspectionRow } from '@/lib/services/utp'

interface UtpCardProps {
  inspection: UtpInspectionRow
}

/**
 * Mobile vertical card for UTP inspection list.
 * Plate badge (Stitch style) + StatusBadge in header,
 * owner/date/correlative/operator rows, ≥48px action button.
 */
export function UtpCard({ inspection: row }: UtpCardProps) {
  const formatDate = (d: Date | null) => {
    if (!d) return '—'
    return new Intl.DateTimeFormat('es-VE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(d))
  }

  return (
    <Link
      href={`/utp/${row.id}`}
      className="block rounded-2xl border border-border bg-card p-4 hover:shadow-md transition-shadow active:scale-[0.99]"
    >
      {/* Header: plate badge + status */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="inline-block rounded-full border-2 border-[#334155] bg-[#020617] px-3 py-1 font-mono text-[15px] font-bold tracking-[0.12em] text-[#F8FAFC] uppercase"
        >
          {row.licensePlate ?? '—'}
        </span>
        <StatusBadge status={row.status ?? 'inspeccion_inicial'} />
      </div>

      {/* Body rows */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Propietario</span>
          <span className="text-foreground font-medium truncate max-w-[60%] text-right">
            {row.ownerName ?? '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Fecha</span>
          <span className="text-foreground">{formatDate(row.inspectionDate)}</span>
        </div>
        {row.correlativeNumber && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Correlativo</span>
            <span className="font-mono text-foreground">{row.correlativeNumber}</span>
          </div>
        )}
        {row.operatorName && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Operador</span>
            <span className="text-foreground truncate max-w-[60%] text-right">
              {row.operatorName}
            </span>
          </div>
        )}
      </div>

      {/* Footer action */}
      <div className="flex items-center justify-end mt-3 pt-3 border-t border-border">
        <span className="inline-flex items-center gap-1.5 h-12 px-4 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium">
          <FileText className="w-4 h-4" />
          Ver Detalle
        </span>
      </div>
    </Link>
  )
}
