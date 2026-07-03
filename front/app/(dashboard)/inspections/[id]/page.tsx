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
import { CylinderRecertificationPanel } from '@/components/cylinders/cylinder-recertification-panel'
import { ExpedienteUploader } from '@/components/inspections/expediente-uploader'
import { CertificateCard } from '@/components/certificates/certificate-card'
import { getPendingSummary } from '@/lib/services/inspection-pending'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Camera, CheckSquare, Truck, User, Calendar } from 'lucide-react'
import { ChecklistToggle } from '@/components/inspections/checklist-toggle'

// Types based on the expected params in Next.js 15+
interface PageProps {
  params: Promise<{ id: string }>
}

export default async function InspectionExpedientePage({ params }: PageProps) {
  // Await the params since in Next.js 15+ it's a promise
  const resolvedParams = await params;
  const inspection = await getInspectionById(resolvedParams.id)
  
  if (!inspection || !inspection.vehicle || !inspection.owner) {
    notFound()
  }

  const cylinders = await getCylindersByVehicleId(inspection.vehicle.id)

  // Fetch cylinders for recertification panel (ordered with en_planta first)
  const recertCylinders = await getCylindersByInspectionId(resolvedParams.id)

  // Determine if recertification panel should be shown
  const inspectionStatusOrder = ['inspeccion_inicial', 'recalificacion', 'por_programar', 'cita', 'certificado']
  const currentStatusIndex = inspectionStatusOrder.indexOf(inspection.status || 'inspeccion_inicial')
  const recalificacionStatusIndex = inspectionStatusOrder.indexOf('recalificacion')
  const showRecertPanel = currentStatusIndex >= recalificacionStatusIndex
    && recertCylinders.some(c => c.status === 'en_planta')

  // Resolve presigned URLs for images
  const attachmentsWithUrls = await Promise.all(
    inspection.attachments.map(async (att) => {
      const url = await getObjectUrl(att.minioKey)
      return { ...att, url }
    })
  )

  // Filter post-mount photos with resolved URLs
  const postMountPhotos = attachmentsWithUrls.filter((att) => att.category === 'post_mount')

  // Fetch pending summary
  const pendingSummary = await getPendingSummary(resolvedParams.id)

  let signatureUrl = null
  if (inspection.signature) {
    signatureUrl = await getObjectUrl(inspection.signature.minioKey)
  }

  // Fetch certificate data
  const certificate = await getCertificateByInspectionId(resolvedParams.id)

  // Fetch vehicle documents
  const vehicleDocs = await getDocsByVehicle(inspection.vehicle.id)
  const vehicleDocsWithUrls = await Promise.all(
    vehicleDocs.map(async (doc) => {
      const url = await getObjectUrl(doc.minioKey)
      return { ...doc, url }
    })
  )

  // Resolve presigned URL for plant document
  let plantDocUrl: string | null = null
  if (certificate?.plantDocKey) {
    plantDocUrl = await getObjectUrl(certificate.plantDocKey)
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Status Updater (show for inspeccion_inicial / recalificacion) */}
          <InspectionStatusUpdater 
            inspectionId={resolvedParams.id} 
            currentStatus={inspection.status || 'inspeccion_inicial'} 
          />

          {/* Appointment Scheduler (show for por_programar / cita) */}
          <AppointmentScheduler
            inspectionId={resolvedParams.id}
            inspectionStatus={inspection.status || 'inspeccion_inicial'}
            appointmentDate={inspection.appointmentDate}
          />
          
          {/* Post-Mount Photos (only when recalificacion, por_programar, or cita) */}
          {(inspection.status === 'recalificacion' || inspection.status === 'por_programar' || inspection.status === 'cita') && (
            <PostMountPhotos
              inspectionId={resolvedParams.id}
              existingPhotos={postMountPhotos}
            />
          )}
          
          {/* General Data */}
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
            cylinders={cylinders.map(c => ({
              ...c,
              status: c.status ?? 'instalado',
              recalificationDate: c.recalificationDate ? new Date(c.recalificationDate).toISOString() : null
            }))}
          />

          {/* Cylinder Recertification Panel */}
          {showRecertPanel && (
            <CylinderRecertificationPanel
              inspectionId={resolvedParams.id}
              cylinders={recertCylinders.map(c => ({
                ...c,
                status: c.status ?? 'instalado',
                recalificationDate: c.recalificationDate ? new Date(c.recalificationDate).toISOString() : null
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
                  <h3 className="font-semibold text-sm border-b pb-1">Frente</h3>
                  <div className="space-y-2">
                    {inspection.answers.filter(a => a.section === 'front').map(a => (
                      <div key={a.id} className="flex items-start justify-between text-sm p-2 rounded-lg bg-muted/30">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-muted-foreground">{a.questionKey}</span>
                          <span className="text-xs mt-1 text-muted-foreground">{a.observations || 'Sin observaciones'}</span>
                        </div>
                        <ChecklistToggle
                          answerId={a.id}
                          inspectionId={resolvedParams.id}
                          currentAnswer={a.answer}
                          questionKey={a.questionKey}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm border-b pb-1">Trasera</h3>
                  <div className="space-y-2">
                    {inspection.answers.filter(a => a.section === 'rear').map(a => (
                      <div key={a.id} className="flex items-start justify-between text-sm p-2 rounded-lg bg-muted/30">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-muted-foreground">{a.questionKey}</span>
                          <span className="text-xs mt-1 text-muted-foreground">{a.observations || 'Sin observaciones'}</span>
                        </div>
                        <ChecklistToggle
                          answerId={a.id}
                          inspectionId={resolvedParams.id}
                          currentAnswer={a.answer}
                          questionKey={a.questionKey}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Gallery */}
        <div className="space-y-6">
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
                  {attachmentsWithUrls.map(att => (
                    <a 
                      key={att.id} 
                      href={att.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group block relative aspect-square rounded-xl overflow-hidden border border-border shadow-sm hover:ring-2 hover:ring-primary transition-all"
                    >
                      {att.fileType.startsWith('image/') ? (
                        <img 
                          src={att.url} 
                          alt={att.fileName} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                          <FileText className="w-8 h-8 text-muted-foreground mb-2" />
                          <span className="text-xs text-center px-2 truncate w-full">{att.fileName}</span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-[10px] uppercase shadow-sm">
                          {att.category}
                        </Badge>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Documents Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-500" />
                Documentos del Vehículo
              </CardTitle>
              <CardDescription>
                Cédula y carnet de circulación
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vehicleDocsWithUrls.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No hay documentos registrados para este vehículo.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {vehicleDocsWithUrls.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block relative aspect-square rounded-xl overflow-hidden border border-border shadow-sm hover:ring-2 hover:ring-primary transition-all"
                    >
                      <img
                        src={doc.url}
                        alt={doc.originalName || doc.type}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-[10px] uppercase shadow-sm">
                          {doc.type === 'cedula' ? 'Cédula' : 'Carnet'}
                        </Badge>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Certificate Card */}
          <CertificateCard
            certificate={certificate}
            inspectionId={resolvedParams.id}
            inspectionStatus={inspection.status || 'inspeccion_inicial'}
            plantDocUrl={plantDocUrl}
          />
        </div>
      </div>
    </div>
  )
}
