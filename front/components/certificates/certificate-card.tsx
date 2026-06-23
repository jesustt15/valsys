'use client'

import { useRef, useState, useActionState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createCertificateAction, type CertificateFormState } from '@/lib/actions/certificate'
import { type CertificateRecord } from '@/lib/services/certificate'
import { CorrelativeInputDialog } from '@/components/inspections/correlative-input-dialog'
import { DocumentScanner } from '@/components/ui/document-scanner'
import { FileText, Upload, CheckCircle, AlertCircle, Clock, ScanLine, X } from 'lucide-react'

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

  // File input ref + scanner state
  const plantDocRef = useRef<HTMLInputElement>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [plantDocName, setPlantDocName] = useState<string | null>(null)

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
    <>
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
              <label className="text-sm font-medium">
                Documento de Planta (PDF)
              </label>
              <div className="flex flex-col gap-2">
                {plantDocName ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-teal-200 bg-teal-50 dark:bg-teal-900/20">
                    <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="text-sm text-teal-700 dark:text-teal-300 truncate flex-1">{plantDocName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPlantDocName(null)
                        if (plantDocRef.current) plantDocRef.current.value = ''
                      }}
                      className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <label
                      htmlFor="plantDoc"
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 cursor-pointer transition-all text-sm text-muted-foreground"
                    >
                      <FileText className="w-4 h-4" />
                      Seleccionar PDF
                      <input
                        ref={plantDocRef}
                        id="plantDoc"
                        name="plantDoc"
                        type="file"
                        accept=".pdf,application/pdf"
                        className="sr-only"
                        onChange={(e) => {
                          setPlantDocName(e.target.files?.[0]?.name ?? null)
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      disabled={isPending}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all text-sm disabled:opacity-50"
                      title="Escanear documento con la cámara"
                    >
                      <ScanLine className="w-4 h-4" />
                      Escanear
                    </button>
                  </div>
                )}
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
              {isPending ? 'Subiendo...' : 'Crear Certificado'}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* ── Document Scanner Modal ──────────────────────── */}
      {scannerOpen && (
        <DocumentScanner
          label="Escanear Documento de Planta"
          onCapture={(file) => {
            // Set the scanned PDF on the file input via DataTransfer
            if (plantDocRef.current) {
              const dt = new DataTransfer()
              dt.items.add(file)
              plantDocRef.current.files = dt.files
              setPlantDocName(file.name)
            }
            setScannerOpen(false)
          }}
          onClose={() => setScannerOpen(false)}
          disabled={isPending}
        />
      )}
    </>
  )
}
