'use client'

import { useActionState } from 'react'
import { ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { closeInspectionAction, type InspectionFormState } from '@/lib/actions/inspection'

interface Props {
  inspectionId: string
}

export function CloseInspectionButton({ inspectionId }: Props) {
  const [state, action, pending] = useActionState(closeInspectionAction, null)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          Cerrar Inspección
        </CardTitle>
        <CardDescription>
          Valida todos los requisitos y genera el certificado automáticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={inspectionId} />

          <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
            <p className="font-medium">Se validará que:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Todos los ítems no conformes estén resueltos</li>
              <li>Existen fotos de post-montaje</li>
              <li>La firma del propietario fue capturada</li>
              <li>No exista un certificado previo</li>
            </ul>
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
              <AlertDescription>Inspección cerrada correctamente. Certificado generado.</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={pending}
            variant={state?.success ? 'outline' : 'default'}
            className="w-full h-11"
          >
            {pending ? 'Cerrando inspección...' : state?.success ? 'Inspección Cerrada' : 'Cerrar Inspección'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
