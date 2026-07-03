'use client'

import { useState, useActionState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, ChevronDown, ChevronUp, FileText, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { DocumentScanner } from '@/components/ui/document-scanner'
import { recertifyCylinderAction, type CylinderFormState } from '@/lib/actions/cylinder'

interface Cylinder {
  id: string
  brand: string
  capacity: string
  initialSerial: string
  actualSerial: string | null
  status: string
  recalificationDate: string | null
}

interface Props {
  inspectionId: string
  cylinders: Cylinder[]
}

const statusLabels: Record<string, string> = {
  pendiente_reinstalacion: 'Pendiente Reinstalación',
  condenado: 'Condenado (De baja)',
}

function CylinderForm({
  cylinder,
  inspectionId,
}: {
  cylinder: Cylinder
  inspectionId: string
}) {
  const [state, formAction, pending] = useActionState<CylinderFormState | null, FormData>(
    recertifyCylinderAction,
    null
  )

  const [expanded, setExpanded] = useState(true)
  const [scannerOpen, setScannerOpen] = useState(false)
  const plantDocRef = useRef<HTMLInputElement>(null)

  // Clear state after successful submission
  useEffect(() => {
    if (state?.success) {
      setExpanded(false)
    }
  }, [state?.success])

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-border rounded-xl overflow-hidden"
      >
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="font-medium text-sm">{cylinder.brand} — {cylinder.capacity}L</span>
            <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{cylinder.initialSerial}</code>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="warning">En Planta</Badge>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.form
              key={`form-${cylinder.id}`}
              action={formAction}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">
                <input type="hidden" name="id" value={cylinder.id} />
                <input type="hidden" name="inspectionId" value={inspectionId} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`status-${cylinder.id}`} required>Estado de Recertificación</Label>
                    <select
                      id={`status-${cylinder.id}`}
                      name="status"
                      required
                      disabled={pending}
                      className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm bg-white dark:bg-card"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="pendiente_reinstalacion">Pendiente Reinstalación (Recertificado)</option>
                      <option value="condenado">Condenado (De baja)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`serial-${cylinder.id}`}>Nº Serie Post-Planta</Label>
                    <Input
                      id={`serial-${cylinder.id}`}
                      name="actualSerial"
                      placeholder="Número de serie tras recertificación"
                      disabled={pending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`date-${cylinder.id}`}>Fecha de Recalificación</Label>
                    <Input
                      id={`date-${cylinder.id}`}
                      name="recalificationDate"
                      type="date"
                      disabled={pending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`doc-${cylinder.id}`}>Documento de Planta (PDF)</Label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Input
                          ref={plantDocRef}
                          id={`doc-${cylinder.id}`}
                          name="plantDoc"
                          type="file"
                          accept=".pdf,application/pdf"
                          disabled={pending}
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => setScannerOpen(true)}
                          disabled={pending}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all text-sm shrink-0 disabled:opacity-50"
                          title="Escanear documento con la cámara"
                        >
                          <ScanLine className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">Solo se aceptan archivos PDF. También puede escanear con la cámara.</p>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {state?.error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{state.error}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                  {state?.success && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-700 dark:text-green-400">
                          Cilindro recertificado correctamente.
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-end">
                  <Button type="submit" disabled={pending}>
                    {pending ? 'Guardando...' : 'Guardar Recertificación'}
                  </Button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Document Scanner Modal ──────────────────────── */}
      {scannerOpen && (
        <DocumentScanner
          label={`Escanear Documento de Planta — ${cylinder.brand} ${cylinder.capacity}L`}
          onCapture={(file) => {
            if (plantDocRef.current) {
              const dt = new DataTransfer()
              dt.items.add(file)
              plantDocRef.current.files = dt.files
            }
            setScannerOpen(false)
          }}
          onClose={() => setScannerOpen(false)}
          disabled={pending}
        />
      )}
    </>
  )
}

function ResolvedCylinder({ cylinder }: { cylinder: Cylinder }) {
  const [expanded, setExpanded] = useState(false)

  const statusBadge = cylinder.status === 'pendiente_reinstalacion'
    ? <Badge variant="info">Pendiente Reinstalación</Badge>
    : cylinder.status === 'condenado'
      ? <Badge variant="destructive">Condenado</Badge>
      : <Badge variant="secondary">{cylinder.status}</Badge>

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border border-border rounded-xl overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="font-medium text-sm text-muted-foreground">{cylinder.brand} — {cylinder.capacity}L</span>
          <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">{cylinder.initialSerial}</code>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2 text-sm text-muted-foreground">
              {cylinder.actualSerial && (
                <div className="flex justify-between">
                  <span>Nº Serie Post-Planta:</span>
                  <code className="font-mono">{cylinder.actualSerial}</code>
                </div>
              )}
              {cylinder.recalificationDate && (
                <div className="flex justify-between">
                  <span>Fecha de Recalificación:</span>
                  <span>{new Date(cylinder.recalificationDate).toLocaleDateString('es-AR')}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function CylinderRecertificationPanel({ inspectionId, cylinders }: Props) {
  // Progress: total cylinders, how many still en_planta (pending)
  const total = cylinders.length
  const pendingCount = cylinders.filter(c => c.status === 'en_planta').length
  const resolved = total - pendingCount

  // If all are resolved, show completion state
  const isComplete = pendingCount === 0

  return (
    <Card className={isComplete ? 'border-green-200 dark:border-green-800' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {isComplete ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <FileText className="w-5 h-5 text-amber-500" />
              )}
              Recertificación de Cilindros
            </CardTitle>
            <CardDescription>
              {isComplete
                ? 'Todos los cilindros han sido resueltos'
                : `Gestión de recertificación de cilindros desmontados`
              }
            </CardDescription>
          </div>
          <Badge variant={isComplete ? 'success' : 'warning'}>
            {resolved} de {total} resueltos
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${isComplete ? 'bg-green-500' : 'bg-amber-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${total > 0 ? (resolved / total) * 100 : 0}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pending cylinders (en_planta) */}
        {pendingCount > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Pendientes ({pendingCount})
            </h4>
            <div className="space-y-3">
              {cylinders
                .filter(c => c.status === 'en_planta')
                .map(cylinder => (
                  <CylinderForm
                    key={cylinder.id}
                    cylinder={cylinder}
                    inspectionId={inspectionId}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Resolved cylinders */}
        {resolved > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Resueltos ({resolved})
            </h4>
            <div className="space-y-2">
              {cylinders
                .filter(c => c.status !== 'en_planta')
                .map(cylinder => (
                  <ResolvedCylinder key={cylinder.id} cylinder={cylinder} />
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
