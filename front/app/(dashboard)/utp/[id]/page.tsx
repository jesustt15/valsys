import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getUtpInspectionById, canIssueUtpCertificate } from '@/lib/services/utp'
import { getObjectUrl } from '@/lib/minio'
import { ALL_QUESTIONS } from '@/lib/checklist'
import { UtpActions } from './utp-actions'
import { ChecklistCard } from '@/components/inspections/checklist-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Camera, CheckSquare, Truck, User, Database } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

const STATUS_LABELS: Record<string, string> = {
  inspeccion_inicial: 'Inspección Inicial',
  standby: 'Standby',
  certificado: 'Certificado',
}

const STATUS_BADGE: Record<string, 'info' | 'warning' | 'success'> = {
  inspeccion_inicial: 'info',
  standby: 'warning',
  certificado: 'success',
}

export default async function UtpDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const inspection = await getUtpInspectionById(resolvedParams.id)

  if (!inspection || !inspection.vehicle || !inspection.owner) {
    notFound()
  }

  // Get image URLs for attachments
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

  // Get signature URL
  let signatureUrl: string | null = null
  if (inspection.signature) {
    try {
      signatureUrl = await getObjectUrl(inspection.signature.minioKey)
    } catch {
      signatureUrl = null
    }
  }

  // Sort answers by checklist order
  const questionOrder = new Map(ALL_QUESTIONS.map((q, i) => [q.key, i]))
  const sortedAnswers = [...inspection.answers].sort(
    (a, b) => (questionOrder.get(a.questionKey) ?? 999) - (questionOrder.get(b.questionKey) ?? 999),
  )

  // Gate check
  const gate = await canIssueUtpCertificate(resolvedParams.id)

  function getAnswerBgClass(answer: boolean | null) {
    if (answer === true) return 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
    if (answer === false) return 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
    return 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
  }

  const status = inspection.status ?? 'inspeccion_inicial'

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
            <Link href="/utp" className="text-muted-foreground hover:text-foreground transition-colors">
              UTP
            </Link>
          </li>
          <li className="text-muted-foreground">/</li>
          <li className="font-medium text-foreground font-mono truncate max-w-[200px]">
            {resolvedParams.id}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inspección UTP</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">ID: {resolvedParams.id}</p>
        </div>
        <Badge variant={STATUS_BADGE[status] ?? 'info'} className="text-sm px-3 py-1">
          {STATUS_LABELS[status] ?? status}
        </Badge>
      </div>

      {/* Inspection Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Datos de la Inspección</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Fecha:</span>
            <p className="font-medium">
              {inspection.inspectionDate
                ? new Date(inspection.inspectionDate).toLocaleDateString('es-VE')
                : '—'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Origen:</span>
            <p className="font-medium">UTP</p>
          </div>
          <div>
            <span className="text-muted-foreground">Kilómetros:</span>
            <p className="font-medium">
              {inspection.kmCurrent != null ? `${inspection.kmCurrent.toLocaleString('es-AR')} km` : '—'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Operador:</span>
            <p className="font-medium">—</p>
          </div>
        </CardContent>
      </Card>

      {/* Observations */}
      {inspection.observations && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{inspection.observations}</p>
          </CardContent>
        </Card>
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
              <span className="text-muted-foreground">Placa:</span>
              <span className="font-mono font-medium">{inspection.vehicle.licensePlate}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">Marca/Modelo:</span>
              <span className="font-medium">{inspection.vehicle.brand ?? '—'} {inspection.vehicle.model ?? '—'}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground">Tipo:</span>
              <span className="font-medium">{inspection.vehicle.vehicleType ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kit:</span>
              <span className="font-medium">{inspection.vehicle.marcaKit ?? '—'}</span>
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

      {/* Cylinders (read-only list) */}
      {inspection.cylinders.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" />
              Cilindros Registrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inspection.cylinders.map((cyl) => (
                <div key={cyl.id} className="flex items-center gap-4 p-2 bg-muted/50 rounded-lg text-sm">
                  <span className="font-medium">{cyl.brand}</span>
                  <span className="text-muted-foreground">{cyl.capacity}L</span>
                  <span className="font-mono text-xs">{cyl.initialSerial}</span>
                  <span className="text-muted-foreground ml-auto">{cyl.location}</span>
                  <Badge variant="info" className="text-xs">{cyl.status ?? 'instalado'}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid: Checklist + Side Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-6">
          {/* Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-500" />
                Checklist
              </CardTitle>
              <CardDescription>
                {sortedAnswers.filter((a) => a.answer === true).length} / {sortedAnswers.length} items conformes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-base border-b pb-1">Frente</h3>
                  <div className="space-y-4">
                    {sortedAnswers.filter((a) => a.section === 'front').map((a) => (
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
                    {sortedAnswers.filter((a) => a.section === 'rear').map((a) => (
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

        {/* Right — Sidebar */}
        <div className="space-y-6">
          {/* Signature */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                Firma
              </CardTitle>
            </CardHeader>
            <CardContent>
              {signatureUrl ? (
                <div className="border-2 border-dashed rounded-xl overflow-hidden bg-card p-2">
                  <img
                    src={signatureUrl}
                    alt="Firma del propietario"
                    className="w-full h-auto object-contain"
                  />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-xl">
                  <p className="font-medium">Sin firma registrada</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="w-5 h-5 text-rose-500" />
                Fotos
              </CardTitle>
              <CardDescription>
                {attachmentsWithUrls.length} foto(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attachmentsWithUrls.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin fotos.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {attachmentsWithUrls.map((att) => (
                    <div key={att.id} className="relative aspect-square rounded-xl overflow-hidden border border-border">
                      {att.url ? (
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={att.url}
                            alt={att.fileName}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </a>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Camera className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Certificate info (if issued) */}
          {inspection.certificate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-500" />
                  Certificado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Correlativo:</span>
                  <span className="font-mono font-medium">{inspection.certificate.correlativeNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha:</span>
                  <span className="font-medium">{inspection.certificate.issueDate ?? '—'}</span>
                </div>
                {inspection.certificate.finalCertKey && (
                  <div className="pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Documento escaneado almacenado</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <UtpActions
            inspectionId={resolvedParams.id}
            status={status}
            canIssue={gate.canIssue}
            missingReasons={gate.missing}
          />
        </div>
      </div>
    </div>
  )
}
