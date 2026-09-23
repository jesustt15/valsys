'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatRelativeTime } from '@/lib/utils/format-relative-time'
import type { RecentInspectionRow } from '@/lib/services/inspection'

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
            return (
              <motion.div
                key={insp.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-center justify-between py-3.5 hover:bg-secondary/30 rounded-lg px-2 -mx-2 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-sm font-mono font-bold text-green-600 dark:text-green-400 shrink-0">
                    {insp.licensePlate ? insp.licensePlate.slice(-3) : '---'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground font-mono truncate">{insp.licensePlate ?? 'Sin placa'}</p>
                    <p className="text-sm text-muted-foreground truncate">{insp.ownerName ?? 'Sin propietario'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={insp.status} />
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
