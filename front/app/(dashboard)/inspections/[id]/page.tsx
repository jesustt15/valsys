import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getInspectionById } from '@/lib/services/inspection'
import { getCertificateByInspectionId } from '@/lib/services/certificate'
import { getCylindersByVehicleId, getCylindersByInspectionId } from '@/lib/services/cylinder'
import { getDocsByVehicle } from '@/lib/services/vehicle-document'
import { getObjectUrl } from '@/lib/minio'
import { InspectionPendingSummary } from '@/components/inspections/inspection-pending-summary'
import { InspectionStatusUpdater } from '@/components/inspections/inspection-status-updater'
import { AppointmentScheduler } from '@/components/inspections/appointment-scheduler'
import { PostMountPhotos } from '@/components/inspections/post-mount-photos'
import { CylinderManager } from '@/components/cylinders/cylinder-manager'
import { CylinderFatePanel } from '@/components/cylinders/cylinder-fate-panel'
import { ExpedienteUploader } from '@/components/inspections/expediente-uploader'
import { CertificateCard } from '@/components/certificates/certificate-card'
import { getPendingSummary } from '@/lib/services/inspection-pending'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Camera, CheckSquare, Truck, User } from 'lucide-react'
import { ChecklistCard } from '@/components/inspections/checklist-card'
import { ALL_QUESTIONS } from '@/lib/checklist'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function InspectionExpedientePage({ params }: PageProps) {
  const resolvedParams = await params
  const inspection = await getInspectionById(resolvedParams.id)

  if (!inspection || !inspection.vehicle || !inspection.owner) {
    notFound()
  }

  const cylinders = await getCylindersByVehicleId(inspection.vehicle.id)
  const recertCylinders = await getCylindersByInspectionId(resolvedParams.id)

  const showFatePanel = inspection.status === 'por_programar'
    && recertCylinders.some(c => c.status === 'en_planta')

  const attachmentsWithUrls = await Promise.all(
    inspection.attachments.map(async (att) => {
      try {
        const url = await getObjectUrl(att.minioKey)
        return { ...att, url }
      } catch {
        return { ...att, url: undefined }
      }
    }),
  )

  const postMountPhotos = attachmentsWithUrls.filter(
    (att) => att.category === 'post_mount',
  )

  const pendingSummary = await getPendingSummary(resolvedParams.id)

  const questionOrder = new Map(ALL_QUESTIONS.map((q, i) => [q.key, i]))
  const sortedAnswers = [...inspection.answers].sort(
    (a, b) => (questionOrder.get(a.questionKey) ?? 999) - (questionOrder.get(b.questionKey) ?? 999),
  )

  let signatureUrl: string | null = null
  if (inspection.signature) {
    try {
      signatureUrl = await getObjectUrl(inspection.signature.minioKey)
    } catch {
      signatureUrl = null
    }
  }

  const certificate = await getCertificateByInspectionId(resolvedParams.id)

  const vehicleDocs = await getDocsByVehicle(inspection.vehicle.id)
  const vehicleDocsWithUrls = await Promise.all(
    vehicleDocs.map(async (doc) => {
      try {
        const url = await getObjectUrl(doc.minioKey)
        return { ...doc, url }
      } catch {
        return { ...doc, url: null }
      }
    }),
  )

  function getAnswerBgClass(answer: boolean | null) {
    if (answer === true) return 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
    if (answer === false) return 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
    return 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Breadcrumb */}
      <nav>
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Inicio
            </Link>
          </li>
          <li className="text-muted-foreground">/</li>
          <li>
            <Link href="/inspections" className="text-muted-foreground hover:text-foreground transition-colors">
              Inspecciones
            </Link>
          </li>
          <li className="text-muted-foreground">/</li>
          <li className="font-medium text-foreground font-mono truncate max-w-[200px]">
            {resolvedParams.id}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Expediente de Inspección</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">ID: {resolvedParams.id}</p>
      </div>

      {/* Pending Summary Alert */}
      {pendingSummary && (
        <InspectionPendingSummary
          pending={pendingSummary}
          status={inspection.status || 'inspeccion_inicial'}
        />
      )}

      {/* Main Layout: Content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <InspectionStatusUpdater
            inspectionId={resolvedParams.id}
            currentStatus={inspection.status || 'inspeccion_inicial'}
          />

          <AppointmentScheduler
            inspectionId={resolvedParams.id}
            inspectionStatus={inspection.status || 'inspeccion_inicial'}
            appointmentDate={inspection.appointmentDate}
          />

          {inspection.status === 'cita' && (
            <PostMountPhotos
              inspectionId={resolvedParams.id}
              existingPhotos={postMountPhotos}
            />
          )}

          {/* Vehicle + Owner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-500" />
                  Vehículo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Patente:</span>
                  <span className="font-mono font-medium">{inspection.vehicle.licensePlate}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Código Único GNC:</span>
                  <span className="font-mono font-medium">{inspection.vehicle.codigoUnicoGnc || '—'}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Marca/Modelo:</span>
                  <span className="font-medium">{inspection.vehicle.brand} {inspection.vehicle.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kilómetros:</span>
                  <span className="font-medium">
                    {inspection.kmCurrent != null
                      ? inspection.kmCurrent.toLocaleString('es-AR') + ' km'
                      : '—'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-violet-500" />
                  Propietario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Nombre:</span>
                  <span className="font-medium">{inspection.owner.fullName}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Documento:</span>
                  <span className="font-mono font-medium">{inspection.owner.documentId}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Teléfono:</span>
                  <span className="font-medium">{inspection.owner.phone || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{inspection.owner.email || '—'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cylinder Manager */}
          <CylinderManager
            inspectionId={resolvedParams.id}
            vehicleId={inspection.vehicle.id}
            cylinders={cylinders.map((c) => ({
              ...c,
              status: c.status ?? 'instalado',
              recalificationDate: c.recalificationDate ? new Date(c.recalificationDate).toISOString() : null,
            }))}
          />

          {/* Cylinder Fate Panel */}
          {showFatePanel && (
            <CylinderFatePanel
              inspectionId={resolvedParams.id}
              cylinders={recertCylinders.map((c) => ({
                ...c,
                status: c.status ?? 'instalado',
                recalificationDate: c.recalificationDate ? new Date(c.recalificationDate).toISOString() : null,
              }))}
            />
          )}

          {/* Checklist Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-500" />
                Respuestas del Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-base border-b pb-1">Frente</h3>
                  <div className="space-y-4">
                    {sortedAnswers
                      .filter((a) => a.section === 'front')
                      .map((a) => (
                        <ChecklistCard
                          key={a.id}
                          answerId={a.id}
                          inspectionId={resolvedParams.id}
                          currentAnswer={a.answer}
                          questionKey={a.questionKey}
                          observations={a.observations}
                          bgClass={getAnswerBgClass(a.answer)}
                        />
                      ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-base border-b pb-1">Trasera</h3>
                  <div className="space-y-4">
                    {sortedAnswers
                      .filter((a) => a.section === 'rear')
                      .map((a) => (
                        <ChecklistCard
                          key={a.id}
                          answerId={a.id}
                          inspectionId={resolvedParams.id}
                          currentAnswer={a.answer}
                          questionKey={a.questionKey}
                          observations={a.observations}
                          bgClass={getAnswerBgClass(a.answer)}
                        />
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Sidebar */}
        <div className="space-y-6">
          {/* Signature */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                Firma del Titular
              </CardTitle>
            </CardHeader>
            <CardContent>
              {signatureUrl ? (
                <div className="border-2 border-dashed rounded-xl overflow-hidden bg-card p-2">
                  <img
                    src={signatureUrl}
                    alt="Firma del titular"
                    className="w-full h-auto object-contain"
                  />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed rounded-xl space-y-1">
                  <p className="font-medium">Sin firma registrada</p>
                  <p className="text-xs">La firma del propietario se captura al desmontar los cilindros.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evidence Photos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-rose-500" />
                  Evidencia Fotográfica
                </div>
              </CardTitle>
              <CardDescription>
                {attachmentsWithUrls.length} archivo(s) adjunto(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ExpedienteUploader inspectionId={resolvedParams.id} />

              {attachmentsWithUrls.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No hay fotos registradas.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {attachmentsWithUrls.map((att) => {
                    const isLink = att.url != null
                    const content = att.fileType.startsWith('image/') && att.url ? (
                      <img
                        src={att.url}
                        alt={att.fileName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                        <FileText className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-xs text-center px-2 truncate w-full">{att.fileName}</span>
                        {!att.url && <span className="text-[10px] text-muted-foreground mt-1">No disponible</span>}
                      </div>
                    )
                    const className = 'group block relative aspect-square rounded-xl overflow-hidden border border-border shadow-sm ' + (isLink ? 'hover:ring-2 hover:ring-primary transition-all' : 'opacity-60')

                    if (isLink) {
                      return (
                        <a key={att.id} href={att.url!} target="_blank" rel="noopener noreferrer" className={className}>
                          {content}
                          <div className="absolute top-2 left-2">
                            <Badge variant="secondary" className="text-[10px] uppercase shadow-sm">
                              {att.category}
                            </Badge>
                          </div>
                        </a>
                      )
                    }
                    return (
                      <div key={att.id} className={className}>
                        {content}
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="text-[10px] uppercase shadow-sm">
                            {att.category}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-500" />
                Documentos del Vehículo
              </CardTitle>
              <CardDescription>Cédula y carnet de circulación</CardDescription>
            </CardHeader>
            <CardContent>
              {vehicleDocsWithUrls.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No hay documentos registrados para este vehículo.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {vehicleDocsWithUrls.map((doc) => {
                    const isLink = doc.url != null
                    const className = 'group block relative aspect-square rounded-xl overflow-hidden border border-border shadow-sm ' + (isLink ? 'hover:ring-2 hover:ring-primary transition-all' : 'opacity-60')

                    const content = doc.url ? (
                      <img
                        src={doc.url}
                        alt={doc.originalName || doc.type}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                        <FileText className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-xs text-center px-2">{doc.originalName || doc.type}</span>
                        <span className="text-[10px] text-muted-foreground mt-1">No disponible</span>
                      </div>
                    )

                    const badge = (
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-[10px] uppercase shadow-sm">
                          {doc.type === 'cedula' ? 'Cédula' : 'Carnet'}
                        </Badge>
                      </div>
                    )

                    if (isLink) {
                      return (
                        <a key={doc.id} href={doc.url!} target="_blank" rel="noopener noreferrer" className={className}>
                          {content}
                          {badge}
                        </a>
                      )
                    }
                    return (
                      <div key={doc.id} className={className}>
                        {content}
                        {badge}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Certificate */}
          <CertificateCard
            certificate={certificate}
            inspectionId={resolvedParams.id}
            inspectionStatus={inspection.status || 'inspeccion_inicial'}
          />
        </div>
      </div>
    </div>
  )
}
