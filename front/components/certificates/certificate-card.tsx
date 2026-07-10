'use client'

import { useRef, useState, useActionState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createCertificateAction, type CertificateFormState } from '@/lib/actions/certificate'
import { type CertificateRecord } from '@/lib/services/certificate'
import { CorrelativeInputDialog } from '@/components/inspections/correlative-input-dialog'
import { FileText, Upload, CheckCircle, AlertCircle, Clock, ScanLine } from 'lucide-react'

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
  // Status gating: hide for inspeccion_inicial and recalificacion
  // (plant documents are handled by CylinderFatePanel during recalificacion)
  if (inspectionStatus === 'inspeccion_inicial' || inspectionStatus === 'recalificacion') {
    return null
  }

  const [state, formAction, isPending] = useActionState<
    CertificateFormState | null,
    FormData
  >(createCertificateAction, null)

  // File input ref for optional scan upload
  const scanRef = useRef<HTMLInputElement>(null)
  const [scanName, setScanName] = useState<string | null>(null)

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
              Descargar certificado escaneado
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
            <Clock className="w-5 h-5 text-red-500" />
            Certificado — Pendiente
          </CardTitle>
          <CardDescription>
            La inspección está lista para ser certificada. Ingrese el correlativo para finalizar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm space-y-2">
            <p className="text-red-700 dark:text-red-400 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Pendiente de certificación
            </p>
            <p className="text-red-600 dark:text-red-500 text-xs">
              Antes de certificar, asegúrese de que todos los ítems no conformes estén resueltos
              y las fotos de post-montaje estén cargadas.
            </p>
          </div>
          <CorrelativeInputDialog inspectionId={inspectionId} />
        </CardContent>
      </Card>
    )
  }

  // Simplified form: correlative-only + optional scan upload
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
          Ingrese el número correlativo. Opcionalmente, escanee el certificado físico.
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
            <label className="text-sm font-medium">
              Escaneo del Certificado (opcional)
            </label>
            <div className="flex gap-2">
              <label
                htmlFor="plantDoc"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 cursor-pointer transition-all text-sm text-muted-foreground"
              >
                <FileText className="w-4 h-4" />
                {scanName ? scanName : 'Seleccionar archivo'}
                <input
                  ref={scanRef}
                  id="plantDoc"
                  name="plantDoc"
                  type="file"
                  accept=".pdf,application/pdf,image/*"
                  className="sr-only"
                  onChange={(e) => {
                    setScanName(e.target.files?.[0]?.name ?? null)
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => scanRef.current?.click()}
                disabled={isPending}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all text-sm disabled:opacity-50"
                title="Escanear certificado con la cámara"
              >
                <ScanLine className="w-4 h-4" />
                Escanear
              </button>
            </div>
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
            {isPending ? 'Creando...' : 'Crear Certificado'}
          </button>
        </form>
      </CardContent>
    </Card>
  )
}
