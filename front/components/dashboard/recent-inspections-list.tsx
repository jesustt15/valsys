'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils/format-relative-time'
import type { RecentInspectionRow } from '@/lib/services/inspection'

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'info' | 'destructive'; label: string }> = {
  certificado: { variant: 'success', label: 'Certificado' },
  recalificacion: { variant: 'warning', label: 'Recalificación' },
  por_programar: { variant: 'destructive', label: 'Por Programar' },
  inspeccion_inicial: { variant: 'info', label: 'Inspecci\xf3n Inicial' },
}

interface RecentInspectionsListProps {
  inspections: RecentInspectionRow[]
}

export function RecentInspectionsList({ inspections }: RecentInspectionsListProps) {
  if (inspections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inspecciones Recientes</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-4">
          <p className="text-sm text-muted-foreground py-6 text-center">No hay inspecciones recientes</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspecciones Recientes</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-4">
        <div className="divide-y divide-border">
          {inspections.map((insp, i) => {
            const status = statusConfig[insp.status] ?? { variant: 'default' as const, label: insp.status }
            return (
              <motion.div
                key={insp.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-center justify-between py-3.5 hover:bg-secondary/30 rounded-lg px-2 -mx-2 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                    {insp.licensePlate ? insp.licensePlate.slice(-3) : '---'}
                  </div>
                  <div>
                    <p className="font-medium text-foreground font-mono">{insp.licensePlate ?? 'Sin placa'}</p>
                    <p className="text-sm text-muted-foreground">{insp.ownerName ?? 'Sin propietario'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {formatRelativeTime(insp.createdAt)}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
