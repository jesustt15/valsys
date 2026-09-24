'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertTriangle, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatRelativeTime } from '@/lib/utils/format-relative-time'
import type { PendingAlert } from '@/lib/services/inspection-pending'

interface Props {
  alerts: PendingAlert[]
}

export function PendingAlerts({ alerts }: Props) {
  const blockingCount = alerts.filter((a) => a.pending.totalBlocking > 0).length

  if (alerts.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-status-success" />
          <h2 className="text-sm font-semibold text-foreground">Alertas y Pendientes</h2>
          <Badge variant="success" className="ml-auto">0</Badge>
        </div>
        <div className="rounded-xl bg-card border border-border p-6 flex flex-col items-center justify-center text-center">
          <CheckCircle2 className="w-10 h-10 mb-2 text-status-success/50" />
          <p className="text-sm text-muted-foreground">Todo al día — no hay pendientes que requieran atención.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Section header */}
      <div className="flex items-center gap-2">
        {blockingCount > 0 ? (
          <AlertCircle className="w-4 h-4 text-status-danger" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-status-warning" />
        )}
        <h2 className="text-sm font-semibold text-foreground">Alertas y Pendientes</h2>
        <Badge variant={blockingCount > 0 ? 'destructive' : 'warning'} className="ml-auto">
          {alerts.length}
        </Badge>
      </div>

      {/* Alert cards */}
      <div className="space-y-2">
        {alerts.map((alert, i) => {
          const isBlocking = alert.pending.totalBlocking > 0
          return (
            <motion.div
              key={alert.inspectionId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                href={`/inspections/${alert.inspectionId}`}
                className="rounded-xl bg-card border border-border p-3 flex items-center justify-between gap-3 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Icon */}
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isBlocking
                        ? 'bg-status-danger/10'
                        : 'bg-status-warning/10'
                    }`}
                  >
                    {isBlocking ? (
                      <AlertCircle className="w-[18px] h-[18px] text-status-danger" />
                    ) : (
                      <AlertTriangle className="w-[18px] h-[18px] text-status-warning" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-bold tracking-wider text-foreground truncate">
                        {alert.licensePlate?.toUpperCase() ?? 'SIN PLACA'}
                      </span>
                      <span className="text-[16px] font-semibold text-foreground truncate hidden sm:inline">
                        {alert.ownerName ?? 'Sin propietario'}
                      </span>
                    </div>
                    {/* Verbose pending summary — hidden on mobile for compactness */}
                    <div className="hidden md:block mt-0.5">
                      {isBlocking && (
                        <p className="text-[11px] text-status-danger">
                          {alert.pending.nonCompliantCount} ítem(s) no conforme(s)
                          {alert.pending.cylindersInPlant > 0 &&
                            ` · ${alert.pending.cylindersInPlant} cilindro(s)`}
                        </p>
                      )}
                      {!isBlocking && alert.pending.totalWarnings > 0 && (
                        <p className="text-[11px] text-status-warning">
                          {alert.pending.cylindersInPlant > 0 &&
                            `${alert.pending.cylindersInPlant} cilindro(s) en planta`}
                          {!alert.pending.hasPostMountPhotos &&
                            `${alert.pending.cylindersInPlant > 0 ? ' · ' : ''}Sin fotos post-montaje`}
                        </p>
                      )}
                      {!isBlocking && alert.pending.totalWarnings === 0 && (
                        <p className="text-[11px] text-status-success">
                          {alert.pending.hasCertificate ? 'Completo' : 'Sin certificado'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={alert.status} className="hidden sm:inline-flex" />
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    {formatRelativeTime(alert.createdAt)}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      <div className="text-center pt-1">
        <Link
          href="/inspections"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          Ver todas las inspecciones
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
