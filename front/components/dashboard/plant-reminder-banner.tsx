'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Truck, CalendarClock, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { PlantWaitingInspection } from '@/lib/services/reminder'

interface PlantReminderBannerProps {
  inspections: PlantWaitingInspection[]
}

function formatEstimatedReturn(sentAt: Date): string {
  const returnDate = new Date(sentAt)
  returnDate.setDate(returnDate.getDate() + 7)
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const dayName = days[returnDate.getDay()]
  const dd = String(returnDate.getDate()).padStart(2, '0')
  const mm = String(returnDate.getMonth() + 1).padStart(2, '0')
  return `${dayName} ${dd}/${mm}`
}

export function PlantReminderBanner({ inspections }: PlantReminderBannerProps) {
  if (inspections.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ x: [0, 3, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0"
        >
          <Truck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Cilindros en Planta</h2>
            <Badge variant="warning">{inspections.length}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {inspections.length === 1
              ? '1 inspección esperando retorno de cilindros'
              : `${inspections.length} inspecciones esperando retorno de cilindros`}
          </p>
        </div>
      </div>

      {/* Inspection cards */}
      <div className="space-y-2">
        {inspections.map((insp, i) => (
          <motion.div
            key={insp.inspectionId}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 + 0.1 }}
            className="flex items-center justify-between gap-3 rounded-lg bg-white/60 dark:bg-white/5 border border-amber-100 dark:border-amber-900/50 p-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                <CalendarClock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold tracking-wider text-foreground bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
                    {insp.licensePlate?.toUpperCase() ?? 'S/P'}
                  </span>
                  {insp.ownerName && (
                    <span className="text-xs text-muted-foreground truncate">
                      {insp.ownerName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                  <span>
                    {insp.pendingCylinderCount} cilindro
                    {insp.pendingCylinderCount !== 1 ? 's' : ''}
                  </span>
                  <span>·</span>
                  <span
                    className={
                      insp.daysAtPlant >= 7
                        ? 'text-red-600 dark:text-red-400 font-semibold'
                        : ''
                    }
                  >
                    {insp.daysAtPlant} día{insp.daysAtPlant !== 1 ? 's' : ''} en planta
                  </span>
                  <span>·</span>
                  <span>Retorno: {formatEstimatedReturn(insp.sentAt)}</span>
                </div>
              </div>
            </div>
            <Link
              href={`/inspections/${insp.inspectionId}`}
              className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
            >
              Ver
              <ExternalLink className="w-3 h-3" />
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
