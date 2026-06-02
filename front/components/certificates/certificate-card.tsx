'use client'

import { useActionState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createCertificateAction, type CertificateFormState } from '@/lib/actions/certificate'
import { type CertificateRecord } from '@/lib/services/certificate'
import { CorrelativeInputDialog } from '@/components/inspections/correlative-input-dialog'
import { FileText, Upload, CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface CertificateCardProps {
  certificate: CertificateRecord | null
  inspectionId: string
  inspectionStatus: string
  plantDocUrl?: string | null
}

export function CertificateCard({
  certificate,
  inspectionId,
  inspectionStatus,
  plantDocUrl,
}: CertificateCardProps) {
  // Status gating: hide for inspeccion_inicial
  if (inspectionStatus === 'inspeccion_inicial') {
    return null
  }

  const [state, formAction, isPending] = useActionState<
    CertificateFormState | null,
    FormData
  >(createCertificateAction, null)

  // Show existing certificate info
  if (certificate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" />
            Certificado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <Badge variant="success">Emitido</Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">Nro. Correlativo:</span>
              <span className="font-mono font-medium">{certificate.correlativeNumber}</span>
            </div>
            {certificate.issueDate && (
              <div className="flex justify-between border-b pb-1">
                <span className="text-muted-foreground">Fecha de emisión:</span>
                <span className="font-medium">
                  {new Date(certificate.issueDate + 'T00:00:00').toLocaleDateString('es-AR')}
                </span>
              </div>
            )}
          </div>
          {plantDocUrl && (
            <a
              href={plantDocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <FileText className="w-4 h-4" />
              Descargar documento de planta
            </a>
          )}
        </CardContent>
      </Card>
    )
  }

  // por_programar: show blocking notice with correlative input dialog
  if (inspectionStatus === 'por_programar') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Certificado — Pendiente
          </CardTitle>
          <CardDescription>
            La inspección está lista para ser certificada. Ingrese el correlativo para finalizar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-sm space-y-2">
            <p className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Pendiente de certificación
            </p>
            <p className="text-amber-600 dark:text-amber-500 text-xs">
              Antes de certificar, asegúrese de que todos los ítems no conformes estén resueltos,
              las fotos de post-montaje estén cargadas y la firma del titular esté presente.
            </p>
          </div>
          <CorrelativeInputDialog inspectionId={inspectionId} />
        </CardContent>
      </Card>
    )
  }

  // Show creation form for recalificacion and certificado
  const hasError = state?.error
  const isSuccess = state?.success

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-500" />
          Certificado
        </CardTitle>
        <CardDescription>
          Cargue el documento de recertificación de planta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="inspectionId" value={inspectionId} />

          <div className="space-y-2">
            <label htmlFor="correlativeNumber" className="text-sm font-medium">
              Número Correlativo
            </label>
            <input
              id="correlativeNumber"
              name="correlativeNumber"
              type="text"
              defaultValue={state?.fields?.correlativeNumber ?? ''}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Ej: ABC-1234"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="plantDoc" className="text-sm font-medium">
              Documento de Planta (PDF)
            </label>
            <input
              id="plantDoc"
              name="plantDoc"
              type="file"
              accept=".pdf,application/pdf"
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90"
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
              <span>Certificado creado exitosamente.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="w-4 h-4" />
            {isPending ? 'Subiendo...' : 'Crear Certificado'}
          </button>
        </form>
      </CardContent>
    </Card>
  )
}
