'use client'

import { AlertCircle, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { PendingItems } from '@/lib/services/inspection-pending'

interface Props {
  pending: PendingItems
  status: string
}

export function InspectionPendingSummary({ pending, status }: Props) {
  // Don't show anything if certificado and complete
  if (status === 'certificado' && pending.totalPending === 0 && pending.hasCertificate) {
    return null
  }

  // Don't show anything if inspeccion_inicial (too early, expected to have pending)
  if (status === 'inspeccion_inicial') {
    return null
  }

  // por_programar blocking notice
  if (status === 'por_programar') {
    return (
      <Card className="border-2 border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-amber-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Pendiente de programación
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                La inspección está lista para ser certificada. Complete el número correlativo para finalizar el proceso.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const items: { label: string; ok: boolean; blocking: boolean }[] = [
    {
      label: 'Ítems no conformes resueltos',
      ok: pending.nonCompliantCount === 0,
      blocking: true,
    },
    {
      label: 'Firma del titular',
      ok: pending.hasSignature,
      blocking: status === 'recalificacion' || status === 'por_programar',
    },
    {
      label: 'Fotos post-montaje',
      ok: pending.hasPostMountPhotos,
      blocking: status === 'recalificacion' || status === 'por_programar',
    },
    {
      label: 'Cilindros recertificados',
      ok: pending.cylindersInPlant === 0,
      blocking: false,
    },
    {
      label: 'Certificado emitido',
      ok: pending.hasCertificate,
      blocking: false,
    },
  ]

  const hasBlocking = items.some((i) => !i.ok && i.blocking)

  return (
    <Card
      className={`border-2 ${
        hasBlocking
          ? 'border-red-200 dark:border-red-800'
          : 'border-amber-200 dark:border-amber-800'
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 ${
              hasBlocking ? 'text-red-500' : 'text-amber-500'
            }`}
          >
            {hasBlocking ? (
              <XCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-semibold ${
                hasBlocking
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {hasBlocking
                ? 'Hay requisitos bloqueantes para cerrar la inspección'
                : 'Atención: hay tareas pendientes'}
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {items
                .filter((i) => status === 'recalificacion' || status === 'por_programar' || !i.blocking || !i.ok)
                .map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    {item.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : item.blocking ? (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span
                      className={
                        item.ok
                          ? 'text-muted-foreground'
                          : item.blocking
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : 'text-amber-600 dark:text-amber-400'
                      }
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
