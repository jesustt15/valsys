import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ShieldCheck, FileText, Calendar, Truck, User, CheckCircle2, AlertCircle } from 'lucide-react'
import { getCertificateByCorrelative } from '@/lib/services/certificate'
import { getObjectUrl } from '@/lib/minio'

interface PageProps {
  params: Promise<{ numero: string }>
}

const statusLabels: Record<string, string> = {
  inspeccion_inicial: 'Inspección Inicial',
  recalificacion: 'Recalificación',
  por_programar: 'Por Programar',
  certificado: 'Certificado',
}

export default async function CorrelativeResultPage({ params }: PageProps) {
  const { numero } = await params
  const result = await getCertificateByCorrelative(numero)

  if (!result) {
    notFound()
  }

  const { certificate, inspection, vehicle, owner } = result

  let certUrl: string | null = null
  if (certificate.finalCertKey) {
    try {
      certUrl = await getObjectUrl(certificate.finalCertKey)
    } catch {
      // Presigned URL failed — cert exists but can't be served
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/consulta"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Nueva consulta
        </Link>

        {/* Result Card */}
        <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
          {/* Header — Correlativo */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground font-mono tracking-wider">
                  {certificate.correlativeNumber}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Certificado GNC
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Vehicle Info */}
            {vehicle && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Truck className="w-4 h-4" />
                  Datos del Vehículo
                </div>
                <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patente:</span>
                    <span className="font-mono font-bold">{vehicle.licensePlate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VIN:</span>
                    <span className="font-mono font-medium">{vehicle.vin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Marca / Modelo:</span>
                    <span>{vehicle.brand} {vehicle.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span>{vehicle.vehicleType}</span>
                  </div>
                  {vehicle.year && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Año:</span>
                      <span>{vehicle.year}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Owner Info */}
            {owner && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="w-4 h-4" />
                  Titular
                </div>
                <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nombre:</span>
                    <span className="font-medium">{owner.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Documento:</span>
                    <span className="font-mono">{owner.documentId}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Inspection Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Inspección
              </div>

              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estado:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {statusLabels[inspection.status ?? ''] ?? inspection.status ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Fecha:</span>
                  <span className="text-sm font-medium">
                    {inspection.inspectionDate
                      ? new Date(inspection.inspectionDate).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Kilometraje:</span>
                  <span className="text-sm font-medium">
                    {inspection.kmCurrent.toLocaleString('es-AR')} km
                  </span>
                </div>
              </div>
            </div>

            {/* Certificate */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="w-4 h-4" />
                Certificado
              </div>

              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">N° Correlativo:</span>
                  <span className="text-sm font-mono font-bold">{certificate.correlativeNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Emisión:</span>
                  <span className="text-sm">
                    {certificate.issueDate
                      ? new Date(certificate.issueDate).toLocaleDateString('es-AR')
                      : '—'}
                  </span>
                </div>

                {certUrl ? (
                  <a
                    href={certUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all mt-2"
                  >
                    <FileText className="w-4 h-4" />
                    Descargar Certificado
                  </a>
                ) : certificate.plantDocKey ? (
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    El certificado está en proceso de emisión. Consulte más tarde.
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    No hay certificado disponible.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Sistema de Gestión de Certificados GNC — Valsys
        </p>
      </div>
    </div>
  )
}
