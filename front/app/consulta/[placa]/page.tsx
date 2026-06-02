import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ShieldCheck, FileText, Calendar, Truck, User, CheckCircle2, AlertCircle } from 'lucide-react'
import { getVehicleByPlate } from '@/lib/services/vehicle'
import { getInspectionsByVehicleId } from '@/lib/services/inspection'
import { getCertificateByInspectionId } from '@/lib/services/certificate'
import { getObjectUrl } from '@/lib/minio'

interface PageProps {
  params: Promise<{ placa: string }>
}

export default async function ConsultaResultPage({ params }: PageProps) {
  const { placa } = await params
  const vehicle = await getVehicleByPlate(placa)

  if (!vehicle) {
    notFound()
  }

  // Get all inspections for this vehicle, sorted by date desc
  const inspections = await getInspectionsByVehicleId(vehicle.id)
  const sortedInspections = inspections
    .filter((i) => i.status === 'certificado')
    .sort((a, b) => {
      return (b.inspectionDate?.getTime() ?? 0) - (a.inspectionDate?.getTime() ?? 0)
    })

  const latestInspection = sortedInspections[0]

  // Try to get certificate
  let certificate = null
  let certUrl: string | null = null

  if (latestInspection) {
    certificate = await getCertificateByInspectionId(latestInspection.id)

    if (certificate?.finalCertKey) {
      try {
        certUrl = await getObjectUrl(certificate.finalCertKey)
      } catch {
        // Presigned URL failed — cert exists but can't be served
      }
    }
  }

  const statusLabels: Record<string, string> = {
    inspeccion_inicial: 'Inspección Inicial',
    recalificacion: 'Recalificación',
    por_programar: 'Por Programar',
    certificado: 'Certificado',
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
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground font-mono tracking-wider">
                  {vehicle.licensePlate}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {vehicle.brand} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Vehicle + Owner Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Truck className="w-4 h-4" />
                  Datos del Vehículo
                </div>
                <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VIN:</span>
                    <span className="font-mono font-medium">{vehicle.vin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span>{vehicle.vehicleType}</span>
                  </div>
                </div>
              </div>

              {vehicle.owner && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <User className="w-4 h-4" />
                    Titular
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nombre:</span>
                      <span className="font-medium">{vehicle.owner.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Documento:</span>
                      <span className="font-mono">{vehicle.owner.documentId}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Inspection + Certificate Status */}
            {latestInspection ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Última Inspección
                </div>

                <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estado:</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {statusLabels[latestInspection.status ?? ''] ?? latestInspection.status ?? '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Fecha:</span>
                    <span className="text-sm font-medium">
                      {latestInspection.inspectionDate
                        ? new Date(latestInspection.inspectionDate).toLocaleDateString('es-AR', {
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
                      {latestInspection.kmCurrent.toLocaleString('es-AR')} km
                    </span>
                  </div>
                </div>

                {/* Certificate */}
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  Certificado
                </div>

                <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                  {certificate ? (
                    <>
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
                          No hay certificado disponible para este vehículo.
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Este vehículo no tiene un certificado emitido aún.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Sin inspecciones certificadas
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                    Este vehículo no tiene inspecciones certificadas registradas en el sistema.
                  </p>
                </div>
              </div>
            )}
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
