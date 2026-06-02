'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { markAsScheduledAction, type MarkScheduledState } from '@/lib/actions/inspection'
import { AlertCircle, CheckCircle, Calendar } from 'lucide-react'

interface Props {
  inspectionId: string
  onComplete?: () => void
}

export function CorrelativeInputDialog({ inspectionId, onComplete }: Props) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<MarkScheduledState | null, FormData>(
    markAsScheduledAction,
    null,
  )

  const isSuccess = state?.success
  const hasError = state?.error

  // Auto-close on success
  if (isSuccess && open) {
    setTimeout(() => {
      setOpen(false)
      onComplete?.()
    }, 1500)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Calendar className="w-4 h-4" />
        Marcar como Programado
      </button>

      {/* Dialog overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-card rounded-2xl shadow-xl border border-border w-full max-w-md mx-4 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Marcar como Programado
            </h3>
            <p className="text-sm text-muted-foreground">
              Ingrese el número correlativo del certificado para finalizar la inspección.
            </p>

            <form action={action} className="space-y-4">
              <input type="hidden" name="id" value={inspectionId} />

              <div className="space-y-2">
                <label htmlFor="correlativeNumber" className="text-sm font-medium">
                  Número Correlativo
                </label>
                <input
                  id="correlativeNumber"
                  name="correlativeNumber"
                  type="text"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Ej: CERT-2026-0001"
                  disabled={pending}
                />
              </div>

              {hasError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{hasError}</span>
                </div>
              )}

              {isSuccess && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg p-3">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Inspección certificada exitosamente.</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending || isSuccess}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {pending ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
