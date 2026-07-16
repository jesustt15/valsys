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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Acciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isTerminal && (
          <div className="text-center py-4">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-600">Certificado emitido</p>
            <p className="text-xs text-muted-foreground mt-1">Esta inspección ya fue certificada.</p>
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
                  className="w-full bg-green-600 hover:bg-green-500"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Emitir Certificado
                </Button>

                {!canIssue && gateMessages.length > 0 && (
                  <div className="space-y-1">
                    {gateMessages.map((msg, i) => (
                      <p key={i} className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {msg}
                      </p>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowStandbyForm(true)}
                  className="w-full"
                >
                  <Clock className="w-4 h-4 mr-2" />
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

                <div>
                  <Label>Número Correlativo</Label>
                  <Input name="correlativeNumber" placeholder="Ej: UTP-2025-001" required />
                </div>

                <div>
                  <Label>Documento Escaneado (opcional)</Label>
                  <Input name="scanDoc" type="file" accept=".pdf,.jpg,.jpeg,.png" />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={certPending}
                    className="flex-1 bg-green-600 hover:bg-green-500"
                  >
                    {certPending ? 'Emitiendo...' : 'Confirmar Emisión'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCertificateForm(false)}
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

                <div>
                  <Label>Observaciones (requeridas)</Label>
                  <Textarea
                    name="observations"
                    placeholder="Describa el motivo del standby..."
                    rows={3}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={standbyPending}
                    variant="outline"
                    className="flex-1 border-amber-500 text-amber-600 hover:bg-amber-50"
                  >
                    {standbyPending ? 'Marcando...' : 'Confirmar Standby'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowStandbyForm(false)}
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
