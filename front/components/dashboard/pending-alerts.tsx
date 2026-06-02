'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertTriangle, AlertCircle, CheckCircle2, ChevronRight, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils/format-relative-time'
import type { PendingAlert } from '@/lib/services/inspection-pending'

const statusLabels: Record<string, string> = {
  inspeccion_inicial: 'Inspección Inicial',
  recalificacion: 'Recalificación',
  por_programar: 'Por Programar',
  certificado: 'Certificado',
}

interface Props {
  alerts: PendingAlert[]
}

export function PendingAlerts({ alerts }: Props) {
  const blockingCount = alerts.filter((a) => a.pending.totalBlocking > 0).length

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <CardTitle>Alertas y Pendientes</CardTitle>
          </div>
          <CardDescription>No hay inspecciones con pendientes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mb-3 text-green-300" />
            <p className="text-sm">Todo al día — no hay pendientes que requieran atención.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {blockingCount > 0 ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
            <CardTitle>Alertas y Pendientes</CardTitle>
          </div>
          <Badge variant={blockingCount > 0 ? 'destructive' : 'warning'}>
            {alerts.length} pendiente{alerts.length > 1 ? 's' : ''}
          </Badge>
        </div>
        <CardDescription>
          {blockingCount > 0
            ? `${blockingCount} inspección(es) con ítems bloqueantes requieren atención inmediata`
            : 'Inspecciones con tareas pendientes'}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-4">
        <div className="divide-y divide-border">
          {alerts.map((alert, i) => (
            <motion.div
              key={alert.inspectionId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                href={`/inspections/${alert.inspectionId}`}
                className="flex items-center justify-between py-3.5 hover:bg-secondary/30 rounded-lg px-2 -mx-2 transition-colors group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Icon */}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      alert.pending.totalBlocking > 0
                        ? 'bg-red-50 dark:bg-red-900/20'
                        : 'bg-amber-50 dark:bg-amber-900/20'
                    }`}
                  >
                    {alert.pending.totalBlocking > 0 ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {alert.licensePlate ?? 'Sin placa'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {alert.ownerName ?? 'Sin propietario'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Status badge */}
                  <Badge
                    variant={
                      alert.status === 'certificado'
                        ? 'success'
                        : alert.status === 'por_programar'
                          ? 'destructive'
                          : alert.status === 'recalificacion'
                            ? 'warning'
                            : 'info'
                    }
                    className="hidden sm:inline-flex"
                  >
                    {statusLabels[alert.status] ?? alert.status}
                  </Badge>

                  {/* Pending summary */}
                  <div className="text-right hidden md:block">
                    {alert.pending.totalBlocking > 0 && (
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">
                        {alert.pending.nonCompliantCount} ítem(s) no conforme(s)
                        {alert.pending.cylindersInPlant > 0 &&
                          ` · ${alert.pending.cylindersInPlant} cilindro(s)`}
                      </p>
                    )}
                    {alert.pending.totalBlocking === 0 && alert.pending.totalWarnings > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {alert.pending.cylindersInPlant > 0 &&
                          `${alert.pending.cylindersInPlant} cilindro(s) en planta`}
                        {!alert.pending.hasPostMountPhotos &&
                          `${alert.pending.cylindersInPlant > 0 ? ' · ' : ''}Sin fotos post-montaje`}
                      </p>
                    )}
                    {alert.pending.totalBlocking === 0 && alert.pending.totalWarnings === 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {alert.pending.hasCertificate ? 'Completo' : 'Sin certificado'}
                      </p>
                    )}
                  </div>

                  {/* Time + arrow */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {formatRelativeTime(alert.createdAt)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/inspections"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Ver todas las inspecciones
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
