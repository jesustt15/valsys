import Link from 'next/link'
import { FileText } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { PendingBadge } from '@/components/inspections/pending-badge'
import type { PendingItems } from '@/lib/services/inspection-pending'

interface InspectionCardProps {
  inspection: {
    id: string
    inspectionDate: Date | null
    licensePlate: string | null
    brand: string | null
    model: string | null
    status: string
    correlativeNumber: string | null
    ownerName: string | null
    appointmentDate?: Date | string | null
  }
  pending?: PendingItems
}

/**
 * Mobile vertical card for inspection list.
 * Plate + StatusBadge in header, owner/vehicle/date/correlative rows,
 * PendingBadge, and ≥48px action button. Tap navigates to detail.
 */
export function InspectionCard({ inspection: insp, pending }: InspectionCardProps) {
  const vehicleLabel = insp.brand && insp.model
    ? `${insp.brand} ${insp.model}`
    : insp.brand || insp.model || '—'

  return (
    <Link
      href={`/inspections/${insp.id}`}
      className="block rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow active:scale-[0.99]"
    >
      {/* Header: plate badge (Stitch style) + status */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="inline-block rounded-full border-2 border-[#334155] bg-[#020617] px-3 py-1 font-mono text-[15px] font-bold tracking-[0.12em] text-[#F8FAFC] uppercase"
        >
          {insp.licensePlate ?? '—'}
        </span>
        <StatusBadge status={insp.status} />
      </div>

      {/* Body rows */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Propietario</span>
          <span className="text-foreground font-medium truncate max-w-[60%] text-right">
            {insp.ownerName ?? '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Vehículo</span>
          <span className="text-foreground truncate max-w-[60%] text-right">
            {vehicleLabel}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Fecha</span>
          <span className="text-foreground">
            {insp.inspectionDate
              ? new Date(insp.inspectionDate).toLocaleDateString('es-AR')
              : '—'}
          </span>
        </div>
        {insp.correlativeNumber && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Correlativo</span>
            <span className="font-mono text-foreground">
              {insp.correlativeNumber}
            </span>
          </div>
        )}
      </div>

      {/* Footer: pending + action */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <PendingBadge pending={pending} status={insp.status} />
        <span className="inline-flex items-center gap-1.5 h-12 px-4 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium">
          <FileText className="w-4 h-4" />
          Ver Expediente
        </span>
      </div>
    </Link>
  )
}
