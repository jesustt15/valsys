'use client'

import { useActionState, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, FileText, Clock } from 'lucide-react'
import {
  issueUtpCertificateAction,
  markUtpStandbyAction,
  type UtpCertificateState,
  type UtpStandbyState,
} from '@/lib/actions/utp'

const GATE_MESSAGES: Record<string, string> = {
  inspection_not_found: 'Inspección UTP no encontrada',
  non_compliant_answers: 'Hay respuestas no conformes o pendientes en el checklist',
  signature_required: 'Se requiere la firma del propietario',
}

interface Props {
  inspectionId: string
  status: string
  canIssue: boolean
  missingReasons: string[]
}

export function UtpActions({ inspectionId, status, canIssue, missingReasons }: Props) {
  const router = useRouter()
  const [showCertificateForm, setShowCertificateForm] = useState(false)
  const [showStandbyForm, setShowStandbyForm] = useState(false)

  // Certificate action
  const [certState, certAction, certPending] = useActionState(issueUtpCertificateAction, null)

  // Standby action
  const [standbyState, standbyAction, standbyPending] = useActionState(markUtpStandbyAction, null)

  // Handle success redirects with useEffect to avoid calling setState during render
  useEffect(() => {
    if (certState?.success || standbyState?.success) {
      router.refresh()
    }
  }, [certState?.success, standbyState?.success, router])

  const isTerminal = status === 'certificado'
  const isActionable = status === 'inspeccion_inicial' || status === 'standby'

  // Show gate reasons
  const gateMessages = missingReasons.map((key) => GATE_MESSAGES[key] ?? key)

  return (
    <Card className="p-4 sm:p-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg">Acciones</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0 space-y-4">
        {isTerminal && (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-base font-semibold text-green-600">Certificado emitido</p>
            <p className="text-sm text-muted-foreground mt-1">Esta inspección ya fue certificada.</p>
          </div>
        )}

        {isActionable && (
          <>
            {/* Certificate button */}
            {!showCertificateForm && !showStandbyForm && (
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={() => setShowCertificateForm(true)}
                  disabled={!canIssue}
                  className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-500"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Emitir Certificado
                </Button>

                {!canIssue && gateMessages.length > 0 && (
                  <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-3 space-y-1.5">
                    {gateMessages.map((msg, i) => (
                      <p key={i} className="text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{msg}</span>
                      </p>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowStandbyForm(true)}
                  className="w-full h-12 text-base"
                >
                  <Clock className="w-5 h-5 mr-2" />
                  Marcar Standby
                </Button>
              </div>
            )}

            {/* Certificate Form */}
            {showCertificateForm && (
              <form action={certAction} className="space-y-4">
                <input type="hidden" name="id" value={inspectionId} />

                {certState?.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>{certState.error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Número Correlativo</Label>
                  <Input name="correlativeNumber" placeholder="Ej: UTP-2025-001" required className="h-12" />
                </div>

                <div className="space-y-2">
                  <Label>Documento Escaneado (opcional)</Label>
                  <Input name="scanDoc" type="file" accept=".pdf,.jpg,.jpeg,.png" className="h-12" />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="submit"
                    disabled={certPending}
                    className="flex-1 h-12 bg-green-600 hover:bg-green-500"
                  >
                    {certPending ? 'Emitiendo...' : 'Confirmar Emisión'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCertificateForm(false)}
                    className="h-12"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

            {/* Standby Form */}
            {showStandbyForm && (
              <form action={standbyAction} className="space-y-4">
                <input type="hidden" name="id" value={inspectionId} />

                {standbyState?.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>{standbyState.error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Observaciones (requeridas)</Label>
                  <Textarea
                    name="observations"
                    placeholder="Describa el motivo del standby..."
                    rows={3}
                    required
                    className="min-h-[120px]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="submit"
                    disabled={standbyPending}
                    variant="outline"
                    className="flex-1 h-12 border-amber-500 text-amber-600 hover:bg-amber-50"
                  >
                    {standbyPending ? 'Marcando...' : 'Confirmar Standby'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowStandbyForm(false)}
                    className="h-12"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
