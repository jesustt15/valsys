'use client'

import { useActionState } from 'react'
import { updateInspectionStatusAction } from '@/lib/actions/inspection'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Props {
  inspectionId: string
  currentStatus: string
}

const STATUS_OPTIONS = [
  { value: 'inspeccion_inicial', label: 'Inspección Inicial' },
  { value: 'recalificacion', label: 'Recalificación' },
  { value: 'por_programar', label: 'Por Programar' },
]

export function InspectionStatusUpdater({ inspectionId, currentStatus }: Props) {
  const [state, action, pending] = useActionState(updateInspectionStatusAction, null)

  // Hide status updater for terminal statuses — use CertificateCard actions instead
  if (currentStatus === 'por_programar' || currentStatus === 'cita' || currentStatus === 'certificado') {
    return null
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-500" />
          Estado de la Inspección
        </CardTitle>
        <CardDescription>Actualice el estado del expediente según avance el trámite</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={inspectionId} />
          
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full sm:w-64 space-y-2">
              <select
                name="status"
                defaultValue={currentStatus}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm transition-all duration-200 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent bg-white dark:bg-card"
                disabled={pending}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" disabled={pending} className="h-11">
              {pending ? 'Actualizando...' : 'Actualizar Estado'}
            </Button>
          </div>

          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {state?.success && (
            <Alert variant="success" className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>Estado actualizado correctamente</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
