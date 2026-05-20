import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getInspectionById } from '@/lib/services/inspection'
import { getCylindersByVehicleId } from '@/lib/services/cylinder'
import { getObjectUrl } from '@/lib/minio'
import { InspectionStatusUpdater } from '@/components/inspections/inspection-status-updater'
import { CylinderManager } from '@/components/cylinders/cylinder-manager'
import { ExpedienteUploader } from '@/components/inspections/expediente-uploader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Camera, CheckSquare, Truck, User, Calendar } from 'lucide-react'

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

  const cylinders = await getCylindersByVehicleId(inspection.vehicleId)

  // Resolve presigned URLs for images
  const attachmentsWithUrls = await Promise.all(
    inspection.attachments.map(async (att) => {
      const url = await getObjectUrl(att.minioKey)
      return { ...att, url }
    })
  )

  let signatureUrl = null
  if (inspection.signature) {
    signatureUrl = await getObjectUrl(inspection.signature.minioKey)
  }

  const formatBool = (val: boolean | null) => {
    if (val === true) return <Badge variant="success">Sí</Badge>
    if (val === false) return <Badge variant="destructive">No</Badge>
    return <Badge variant="warning">Pendiente</Badge>
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Breadcrumb */}
      <nav>
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/dashboard" className="hover:text-gray-700 transition-colors">
              Inicio
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/inspections" className="hover:text-gray-700 transition-colors">
              Inspecciones
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900 font-medium font-mono truncate max-w-[200px]">
            {resolvedParams.id}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Expediente de Inspección</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">ID: {resolvedParams.id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Status Updater */}
          <InspectionStatusUpdater 
            inspectionId={resolvedParams.id} 
            currentStatus={inspection.status || 'inspeccion_inicial'} 
          />
          
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
                  <span className="text-muted-foreground">VIN:</span>
                  <span className="font-mono font-medium">{inspection.vehicle.vin}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Marca/Modelo:</span>
                  <span className="font-medium">{inspection.vehicle.brand} {inspection.vehicle.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kilómetros:</span>
                  <span className="font-medium">{inspection.kmCurrent.toLocaleString('es-AR')}</span>
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
              recalificationDate: c.recalificationDate ? new Date(c.recalificationDate).toISOString() : null
            }))}
          />
          
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
                        {formatBool(a.answer)}
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
                        {formatBool(a.answer)}
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
                <div className="border-2 border-dashed rounded-xl overflow-hidden bg-white p-2">
                  <img src={signatureUrl} alt="Firma del titular" className="w-full h-auto object-contain" />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No hay firma registrada.
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
        </div>
      </div>
    </div>
  )
}
