'use client'

import { useState, useActionState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { scheduleAppointmentAction, type InspectionFormState } from '@/lib/actions/inspection'

interface AppointmentSchedulerProps {
  inspectionId: string
  inspectionStatus: string
  appointmentDate?: Date | string | null
}

export function AppointmentScheduler({
  inspectionId,
  inspectionStatus,
  appointmentDate,
}: AppointmentSchedulerProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  const [state, formAction, pending] = useActionState<InspectionFormState | null, FormData>(
    scheduleAppointmentAction,
    null,
  )

  const isScheduled = inspectionStatus === 'cita'
  const canSchedule = inspectionStatus === 'por_programar'

  // Combine date + time into a single ISO-ish string for the server action
  const combinedDateTime = date && time ? `${date}T${time}:00` : ''

  // ── Read-only: appointment already scheduled ──────────────────
  if (isScheduled && appointmentDate) {
    const formatted = new Date(appointmentDate).toLocaleString('es-AR', {
      dateStyle: 'full',
      timeStyle: 'short',
    })

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-500" />
            Cita Programada
          </CardTitle>
          <CardDescription>Esta inspección tiene una cita agendada</CardDescription>
        </CardHeader>
        <CardContent>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800"
          >
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-green-900 dark:text-green-100">{formatted}</p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
                El vehículo tiene cita programada para inspección
              </p>
            </div>
            <Badge variant="info">Cita</Badge>
          </motion.div>
        </CardContent>
      </Card>
    )
  }

  // ── Not in a schedulable state ────────────────────────────────
  if (!canSchedule) {
    return null
  }

  // ── Success state ─────────────────────────────────────────────
  if (state?.success) {
    const formatted = date && time
      ? new Date(`${date}T${time}:00`).toLocaleString('es-AR', {
          dateStyle: 'full',
          timeStyle: 'short',
        })
      : ''

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-500" />
            Cita Programada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Alert variant="success">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                La cita fue programada exitosamente para el <strong>{formatted}</strong>.
                El estado de la inspección cambió a <Badge variant="info" className="ml-1">Cita</Badge>.
              </AlertDescription>
            </Alert>
          </motion.div>
        </CardContent>
      </Card>
    )
  }

  // ── Scheduling form ───────────────────────────────────────────
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5 text-green-500" />
          Programar Cita
        </CardTitle>
        <CardDescription>
          Seleccione fecha y hora para la cita de inspección
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={inspectionId} />
          <input type="hidden" name="appointmentDate" value={combinedDateTime} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appointment-date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Fecha
              </Label>
              <input
                id="appointment-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                disabled={pending}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm
                           transition-all duration-200 hover:border-primary/50
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                           bg-white dark:bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointment-time" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Hora
              </Label>
              <input
                id="appointment-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={pending}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm
                           transition-all duration-200 hover:border-primary/50
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                           bg-white dark:bg-card"
              />
            </div>
          </div>

          <AnimatePresence>
            {state?.error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={pending || !date || !time}
              className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
            >
              {pending ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Programando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Programar Cita
                </div>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
