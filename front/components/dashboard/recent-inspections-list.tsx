'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { History, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatRelativeTime } from '@/lib/utils/format-relative-time'
import type { RecentInspectionRow } from '@/lib/services/inspection'

interface RecentInspectionsListProps {
  inspections: RecentInspectionRow[]
}

export function RecentInspectionsList({ inspections }: RecentInspectionsListProps) {
  if (inspections.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Inspecciones Recientes</h2>
        </div>
        <div className="rounded-xl bg-card border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">No hay inspecciones recientes</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Inspecciones Recientes</h2>
        <span className="ml-auto text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          En vivo
        </span>
      </div>

      <div className="space-y-2">
        {inspections.map((insp, i) => (
          <motion.div
            key={insp.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.04 }}
          >
            <Link
              href={`/inspections/${insp.id}`}
              className="rounded-xl bg-card border border-border p-3 flex items-center justify-between gap-3 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Plate badge */}
                <div className="w-24 h-11 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 overflow-hidden">
                  <span className="font-mono text-[15px] font-bold tracking-[0.12em] text-foreground px-1 truncate max-w-full">
                    {insp.licensePlate?.toUpperCase() ?? 'SIN PLACA'}
                  </span>
                </div>

                {/* Owner + meta */}
                <div className="flex flex-col min-w-0">
                  <span className="text-[16px] text-foreground font-semibold truncate">
                    {insp.ownerName ?? 'Sin propietario'}
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <StatusBadge status={insp.status} />
                    <span className="text-muted-foreground" aria-hidden="true">·</span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      {formatRelativeTime(insp.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chevron button */}
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                <ChevronRight className="w-5 h-5" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
