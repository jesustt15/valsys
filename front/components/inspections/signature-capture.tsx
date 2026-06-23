'use client'

import { useState, useActionState } from 'react'
import { SignaturePad } from '@/components/inspections/signature-pad'
import { captureSignatureAction, type SignatureCaptureState } from '@/lib/actions/inspection'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, PenLine } from 'lucide-react'

interface Props {
  inspectionId: string
  hasExistingSignature: boolean
  signatureUrl?: string | null
}

export function SignatureCapture({ inspectionId, hasExistingSignature, signatureUrl }: Props) {
  const [showCapture, setShowCapture] = useState(false)
  const [signature, setSignature] = useState('')
  const [state, action, pending] = useActionState<SignatureCaptureState | null, FormData>(
    captureSignatureAction,
    null,
  )

  const handleSubmit = (formData: FormData) => {
    if (!signature) return
    formData.set('inspectionId', inspectionId)
    formData.set('signature', signature)
    action(formData)
  }

  // Show existing signature
  if (hasExistingSignature && signatureUrl) {
    return (
      <div className="border-2 border-dashed rounded-xl overflow-hidden bg-card p-2">
        <img src={signatureUrl} alt="Firma del titular" className="w-full h-auto object-contain" />
        {state?.success && (
          <div className="mt-2 flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-2">
            <CheckCircle className="w-4 h-4" />
            <span>Firma actualizada</span>
          </div>
        )}
      </div>
    )
  }

  // Show existing signature without URL (shouldn't happen, but handle it)
  if (hasExistingSignature) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Firma registrada. Recargue la página para verla.
      </div>
    )
  }

  // No signature yet — show capture pad or prompt
  return (
    <div className="space-y-3">
      {!showCapture ? (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground text-center py-4">
            No hay firma registrada.
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowCapture(true)}
            className="w-full"
          >
            <PenLine className="w-4 h-4 mr-2" />
            Capturar Firma
          </Button>
        </div>
      ) : (
        <form action={handleSubmit} className="space-y-4">
          <SignaturePad onChange={setSignature} disabled={pending} />

          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {state?.success && (
            <Alert variant="success" className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>Firma guardada correctamente.</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCapture(false)}
              disabled={pending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pending || !signature}
              className="flex-1"
            >
              {pending ? 'Guardando...' : 'Guardar Firma'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
