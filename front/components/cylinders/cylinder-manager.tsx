'use client'

import { useState, useActionState, useEffect, useRef, useMemo, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, CheckCircle, AlertCircle, Edit2, Unlink, Send, PackageCheck, ScanLine, X, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { MonthYearPicker } from '@/components/ui/month-year-picker'
import { DocumentScanner } from '@/components/ui/document-scanner'
import {
  createCylinderAction,
  updateCylinderAction,
  unlinkCylinderAction,
  sendToPlantAction,
  receiveFromPlantAction,
  bulkSendToPlantAction,
  bulkReceiveFromPlantAction,
  type CylinderFormState,
  type SendToPlantFormState,
  type ReceiveFromPlantFormState,
  type BulkSendFormState,
  type BulkReceiveFormState,
} from '@/lib/actions/cylinder'
import { formatMonthYear } from '@/lib/utils/format-month-year'

interface Cylinder {
  id: string
  brand: string
  capacity: string
  initialSerial: string
  actualSerial: string | null
  status: string
  location: string
  manufactureDate: string | null
  recalificationDate: string | null
}

interface Props {
  inspectionId: string
  vehicleId: string
  cylinders: Cylinder[]
}

// ─── Helpers ──────────────────────────────────────────────────────

function statusBadgeVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'activo': return 'success'
    case 'en_certificacion': return 'warning'
    case 'de_baja': return 'destructive'
    default: return 'secondary'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'activo': return 'Activo'
    case 'en_certificacion': return 'En certificación'
    case 'de_baja': return 'De baja'
    default: return status
  }
}

const TODAY_ISO = () => new Date().toISOString().split('T')[0]

// ─── Shared form sub-components (F2 — reduce markup duplication) ─────

/** File input + scanner button. Owns its own ref (F3) and scanner state. */
function PlantDocInput({ disabled, scannerLabel }: { disabled: boolean; scannerLabel: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const id = useId()

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={id}>Documento de Planta (PDF, máx. 20MB)</Label>
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            id={id}
            name="plantDoc"
            type="file"
            accept=".pdf,application/pdf"
            disabled={disabled}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            disabled={disabled}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all text-sm shrink-0 disabled:opacity-50"
            title="Escanear documento con la cámara"
          >
            <ScanLine className="w-4 h-4" />
          </button>
        </div>
      </div>
      {scannerOpen && (
        <DocumentScanner
          label={scannerLabel}
          onCapture={(file) => {
            if (inputRef.current) {
              const dt = new DataTransfer()
              dt.items.add(file)
              inputRef.current.files = dt.files
            }
            setScannerOpen(false)
          }}
          onClose={() => setScannerOpen(false)}
          disabled={disabled}
        />
      )}
    </>
  )
}

function ResultSelect({ disabled }: { disabled: boolean }) {
  const id = useId()
  return (
    <div className="space-y-2">
      <Label htmlFor={id} required>Resultado</Label>
      <select
        id={id}
        name="result"
        required
        disabled={disabled}
        className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm bg-white dark:bg-card"
      >
        <option value="">Seleccionar...</option>
        <option value="bueno">Bueno (vuelve al vehículo)</option>
        <option value="malo">Malo (dar de baja)</option>
      </select>
    </div>
  )
}

function DateField({
  name,
  label,
  required,
  disabled,
  defaultValue,
}: {
  name: string
  label: string
  required?: boolean
  disabled?: boolean
  defaultValue?: string
}) {
  const id = useId()
  return (
    <div className="space-y-2">
      <Label htmlFor={id} required={required}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="date"
        required={required}
        disabled={disabled}
        defaultValue={defaultValue}
      />
    </div>
  )
}

// ─── Create Cylinder Form (G8 — per-instance, own useActionState) ────

function CreateCylinderForm({
  vehicleId,
  inspectionId,
  onDone,
  onCancel,
}: {
  vehicleId: string
  inspectionId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [state, formAction, pending] = useActionState<CylinderFormState | null, FormData>(
    createCylinderAction, null,
  )
  const [manufactureDate, setManufactureDate] = useState('')

  useEffect(() => {
    if (state?.success) onDone()
  }, [state?.success, onDone])

  const uid = useId()

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <form action={formAction} className="bg-muted/30 p-4 rounded-xl border border-border space-y-4 mb-6">
        <h4 className="font-medium text-sm">Registrar Nuevo Cilindro</h4>
        <input type="hidden" name="vehicleId" value={vehicleId} />
        <input type="hidden" name="inspectionId" value={inspectionId} />
        <input type="hidden" name="manufactureDate" value={manufactureDate} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${uid}-brand`} required>Marca</Label>
            <Input id={`${uid}-brand`} name="brand" required disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${uid}-capacity`} required>Capacidad (L)</Label>
            <Input id={`${uid}-capacity`} name="capacity" required disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${uid}-serial`} required>Nº Serial</Label>
            <Input id={`${uid}-serial`} name="initialSerial" required disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label required>Fecha de Prueba</Label>
            <MonthYearPicker
              value={manufactureDate || undefined}
              onChange={setManufactureDate}
              disabled={pending}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${uid}-location`} required>Ubicación</Label>
            <Input id={`${uid}-location`} name="location" required disabled={pending} placeholder="Ej: Baúl" />
          </div>
        </div>

        {state?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Guardando...' : 'Guardar Cilindro'}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}

// ─── Unlink Confirm Panel (G8 — per-instance, own useActionState) ────

function UnlinkConfirmPanel({
  cylinder,
  inspectionId,
  onDone,
  onCancel,
}: {
  cylinder: Cylinder
  inspectionId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [state, formAction, pending] = useActionState<CylinderFormState | null, FormData>(
    unlinkCylinderAction, null,
  )

  useEffect(() => {
    if (state?.success) onDone()
  }, [state?.success, onDone])

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden mt-4"
    >
      <form action={formAction} className="bg-red-50/50 dark:bg-red-900/10 p-4 rounded-xl border border-red-200 dark:border-red-800 space-y-4">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Unlink className="w-4 h-4 text-red-600" />
          Desvincular Cilindro
        </h4>
        <input type="hidden" name="id" value={cylinder.id} />
        <input type="hidden" name="inspectionId" value={inspectionId} />

        <div className="flex items-start gap-3 p-3 bg-red-100 dark:bg-red-900/20 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-800 dark:text-red-300">
            <p className="font-medium">{cylinder.brand} — {cylinder.capacity}L</p>
            <p className="text-red-700 dark:text-red-400 mt-1">
              Serial: <code className="font-mono">{cylinder.actualSerial || cylinder.initialSerial}</code>
            </p>
            <p className="text-red-700 dark:text-red-400 mt-1">
              Este cilindro se <strong>desvinculará del vehículo</strong> y quedará disponible para asignarlo a otro vehículo.
            </p>
          </div>
        </div>

        {state?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending} className="bg-red-600 hover:bg-red-700 text-white">
            {pending ? 'Desvinculando...' : 'Desvincular Cilindro'}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}

// ─── Edit Fields Form (F2 — owns its own useActionState) ───────────
function EditCylinderFieldsForm({
  cylinder,
  inspectionId,
  onDone,
  onCancel,
}: {
  cylinder: Cylinder
  inspectionId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [state, formAction, pending] = useActionState<CylinderFormState | null, FormData>(
    updateCylinderAction, null,
  )
  const [manufactureDate, setManufactureDate] = useState(cylinder.manufactureDate || '')

  // Close on success — state is fresh per instance, so reopening the same
  // cylinder gets a new component and fresh null state (F2a).
  useEffect(() => {
    if (state?.success) onDone()
  }, [state?.success, onDone])

  const uid = useId()

  return (
    <motion.div
      key="editar-campos"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden mt-4"
    >
      <form action={formAction} className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800 space-y-4">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Edit2 className="w-4 h-4 text-blue-600" />
          Editar Cilindro — {cylinder.brand} {cylinder.initialSerial}
        </h4>
        <input type="hidden" name="id" value={cylinder.id} />
        <input type="hidden" name="inspectionId" value={inspectionId} />
        <input type="hidden" name="manufactureDate" value={manufactureDate} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${uid}-brand`} required>Marca</Label>
            <Input id={`${uid}-brand`} name="brand" defaultValue={cylinder.brand} required disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${uid}-capacity`} required>Capacidad (L)</Label>
            <Input id={`${uid}-capacity`} name="capacity" defaultValue={cylinder.capacity} required disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${uid}-serial`} required>Nº Serial</Label>
            <Input id={`${uid}-serial`} name="initialSerial" defaultValue={cylinder.initialSerial} required disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label required>Fecha de Prueba</Label>
            <MonthYearPicker
              value={manufactureDate || undefined}
              onChange={setManufactureDate}
              disabled={pending}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${uid}-location`} required>Ubicación</Label>
            <Input id={`${uid}-location`} name="location" defaultValue={cylinder.location} required disabled={pending} placeholder="Ej: Baúl" />
          </div>
        </div>

        {state?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}

// ─── Send to Plant Form (F2 — owns its own useActionState) ─────────

function SendToPlantForm({
  cylinder,
  inspectionId,
  onDone,
  onCancel,
}: {
  cylinder: Cylinder
  inspectionId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [state, formAction, pending] = useActionState<SendToPlantFormState | null, FormData>(
    sendToPlantAction, null,
  )

  useEffect(() => {
    if (state?.success) onDone()
  }, [state?.success, onDone])

  return (
    <motion.div
      key={`send-${cylinder.id}`}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden mt-3"
    >
      <form action={formAction} className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200 dark:border-amber-800 space-y-4">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Send className="w-4 h-4 text-amber-600" />
          Enviar a Planta — {cylinder.brand} {cylinder.initialSerial}
        </h4>
        <input type="hidden" name="cylinderId" value={cylinder.id} />
        <input type="hidden" name="inspectionId" value={inspectionId} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DateField name="sentAt" label="Fecha de Envío" required disabled={pending} defaultValue={TODAY_ISO()} />
        </div>

        {state?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending} className="bg-amber-600 hover:bg-amber-700 text-white">
            {pending ? 'Enviando...' : 'Confirmar Envío'}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}

// ─── Receive from Plant Form (F2 + F3 — owns useActionState + own ref) ─

function ReceiveFromPlantForm({
  cylinder,
  inspectionId,
  onDone,
  onCancel,
}: {
  cylinder: Cylinder
  inspectionId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [state, formAction, pending] = useActionState<ReceiveFromPlantFormState | null, FormData>(
    receiveFromPlantAction, null,
  )

  // G4(a): only auto-close on success WITHOUT docError
  useEffect(() => {
    if (state?.success && !state?.docError) onDone()
  }, [state?.success, state?.docError, onDone])

  const actualSerialId = useId()

  return (
    <motion.div
      key={`receive-${cylinder.id}`}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden mt-3"
    >
      <form action={formAction} className="bg-green-50/50 dark:bg-green-900/10 p-4 rounded-xl border border-green-200 dark:border-green-800 space-y-4">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-green-600" />
          Recibir de Planta — {cylinder.brand} {cylinder.initialSerial}
        </h4>
        <input type="hidden" name="cylinderId" value={cylinder.id} />
        <input type="hidden" name="inspectionId" value={inspectionId} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ResultSelect disabled={pending} />
          <DateField name="receivedAt" label="Fecha de Recepción" required disabled={pending} defaultValue={TODAY_ISO()} />
          <div className="space-y-2">
            <Label htmlFor={actualSerialId}>Serial Nuevo (si cambió)</Label>
            <Input
              id={actualSerialId}
              name="actualSerial"
              placeholder="Opcional"
              disabled={pending}
            />
          </div>
          <DateField name="recalificationDate" label="Fecha de Recalificación" disabled={pending} />
        </div>

        <PlantDocInput
          disabled={pending}
          scannerLabel={`Escanear Documento de Planta — ${cylinder.brand} ${cylinder.capacity}L`}
        />

        {state?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {state?.success && !state?.docError && (
          <Alert className="bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Recepción registrada correctamente.</AlertDescription>
          </Alert>
        )}

        {state?.success && state?.docError && (
          <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Cilindro recibido, pero el documento de planta no se pudo subir. El documento queda pendiente.</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          {/* G4(a): when docError is set, show explicit Cerrar instead of Cancel */}
          {state?.success && state?.docError ? (
            <Button type="button" onClick={onDone}>
              Cerrar
            </Button>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending} className="bg-green-600 hover:bg-green-700 text-white">
                {pending ? 'Procesando...' : 'Confirmar Recepción'}
              </Button>
            </>
          )}
        </div>
      </form>
    </motion.div>
  )
}

// ─── Bulk Send Form (F2 — owns its own useActionState) ─────────────

function BulkSendForm({
  selectedIds,
  inspectionId,
  onDone,
  onCancel,
  onPendingChange,
}: {
  selectedIds: Set<string>
  inspectionId: string
  onDone: () => void
  onCancel: () => void
  onPendingChange: (pending: boolean) => void
}) {
  const [state, formAction, pending] = useActionState<BulkSendFormState | null, FormData>(
    bulkSendToPlantAction, null,
  )

  useEffect(() => { onPendingChange(pending) }, [pending, onPendingChange])
  useEffect(() => {
    if (state?.success) onDone()
  }, [state?.success, onDone])

  const sentAtId = useId()

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <form action={formAction} className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200 dark:border-amber-800 space-y-4">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Truck className="w-4 h-4 text-amber-600" />
          Enviar {selectedIds.size} cilindros a planta
        </h4>
        <input type="hidden" name="cylinderIds" value={JSON.stringify(Array.from(selectedIds))} />
        <input type="hidden" name="inspectionId" value={inspectionId} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={sentAtId} required>Fecha de Envío</Label>
            <Input
              id={sentAtId}
              name="sentAt"
              type="date"
              required
              disabled={pending}
              defaultValue={TODAY_ISO()}
            />
          </div>
        </div>

        {state?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending} className="bg-amber-600 hover:bg-amber-700 text-white">
            {pending ? 'Enviando...' : `Confirmar Envío (${selectedIds.size})`}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}

// ─── Bulk Receive Form (F2 + F5 — owns useActionState + destructive confirm) ─

function BulkReceiveForm({
  selectedIds,
  inspectionId,
  onDone,
  onCancel,
  onPendingChange,
}: {
  selectedIds: Set<string>
  inspectionId: string
  onDone: () => void
  onCancel: () => void
  onPendingChange: (pending: boolean) => void
}) {
  const [state, formAction, pending] = useActionState<BulkReceiveFormState | null, FormData>(
    bulkReceiveFromPlantAction, null,
  )
  const [resultValue, setResultValue] = useState<string>('')
  const [destructiveConfirmed, setDestructiveConfirmed] = useState(false)

  useEffect(() => { onPendingChange(pending) }, [pending, onPendingChange])
  // G4(a): only auto-close on success WITHOUT docError
  useEffect(() => {
    if (state?.success && !state?.docError) onDone()
  }, [state?.success, state?.docError, onDone])

  // Render-phase reset: result flip (malo→bueno→malo still requires re-confirm).
  // Replaces useEffect+setState to satisfy react-hooks/set-state-in-effect.
  const [prevResult, setPrevResult] = useState(resultValue)
  if (prevResult !== resultValue) {
    setPrevResult(resultValue)
    if (resultValue !== 'malo') setDestructiveConfirmed(false)
  }

  // G5: render-phase reset when selection changes to prevent stale-confirm
  // scraps of extra cylinders. Replaces useEffect+setState for lint-clean.
  const selectionSignature = useMemo(
    () => Array.from(selectedIds).sort().join(','),
    [selectedIds],
  )
  const [prevSignature, setPrevSignature] = useState(selectionSignature)
  if (prevSignature !== selectionSignature) {
    setPrevSignature(selectionSignature)
    setDestructiveConfirmed(false)
  }

  const isDestructive = resultValue === 'malo'
  const canSubmit = !isDestructive || destructiveConfirmed

  const receivedAtId = useId()
  const recalId = useId()
  const resultSelectId = useId()

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <form action={formAction} className="bg-green-50/50 dark:bg-green-900/10 p-4 rounded-xl border border-green-200 dark:border-green-800 space-y-4">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-green-600" />
          Recibir {selectedIds.size} cilindros de planta
        </h4>
        <input type="hidden" name="cylinderIds" value={JSON.stringify(Array.from(selectedIds))} />
        <input type="hidden" name="inspectionId" value={inspectionId} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={resultSelectId} required>Resultado</Label>
            <select
              id={resultSelectId}
              name="result"
              required
              disabled={pending}
              value={resultValue}
              onChange={(e) => setResultValue(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm bg-white dark:bg-card"
            >
              <option value="">Seleccionar...</option>
              <option value="bueno">Bueno (vuelven al vehículo)</option>
              <option value="malo">Malo (dar de baja)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={receivedAtId} required>Fecha de Recepción</Label>
            <Input
              id={receivedAtId}
              name="receivedAt"
              type="date"
              required
              disabled={pending}
              defaultValue={TODAY_ISO()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={recalId}>Fecha de Recalificación</Label>
            <Input
              id={recalId}
              name="recalificationDate"
              type="date"
              disabled={pending}
            />
          </div>
        </div>

        <PlantDocInput
          disabled={pending}
          scannerLabel="Escanear Documento de Planta"
        />

        {/* F5: Destructive confirmation panel for 'malo' result */}
        {isDestructive && !destructiveConfirmed && (
          <div className="flex items-start gap-3 p-3 bg-red-100 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800 dark:text-red-300 space-y-2">
              <p className="font-medium">
                Vas a dar de baja {selectedIds.size} cilindros
              </p>
              <p className="text-red-700 dark:text-red-400">
                Esta acción es <strong>irreversible</strong>. Los cilindros seleccionados pasarán a estado &quot;De baja&quot; y no podrán volver al vehículo.
              </p>
              <Button
                type="button"
                onClick={() => setDestructiveConfirmed(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
                size="sm"
              >
                Confirmar baja de {selectedIds.size} cilindros
              </Button>
            </div>
          </div>
        )}

        {state?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {state?.success && !state?.docError && (
          <Alert className="bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Recepción registrada correctamente.</AlertDescription>
          </Alert>
        )}

        {state?.success && state?.docError && (
          <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Cilindros recibidos, pero el documento de planta no se pudo subir. El documento queda pendiente.</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          {/* G4(a): when docError is set, show explicit Cerrar instead of Cancel */}
          {state?.success && state?.docError ? (
            <Button type="button" onClick={onDone}>
              Cerrar
            </Button>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={pending || !canSubmit}
                className={isDestructive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
              >
                {pending ? 'Procesando...' : `Confirmar Recepción (${selectedIds.size})`}
              </Button>
            </>
          )}
        </div>
      </form>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────

export function CylinderManager({ inspectionId, vehicleId, cylinders }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingFieldsId, setEditingFieldsId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [receivingId, setReceivingId] = useState<string | null>(null)
  const [unlinkConfirmId, setUnlinkConfirmId] = useState<string | null>(null)

  // G8: removed parent-level createState / unlinkState — per-instance
  // components own their own useActionState, so state dies on unmount.

  // G11: open-nonce counters — incremented each time a form is opened so
  // that reopening within the AnimatePresence exit window forces a fresh
  // instance (avoids retained success state re-firing auto-close).
  const [sendNonce, setSendNonce] = useState(0)
  const [receiveNonce, setReceiveNonce] = useState(0)
  const [editNonce, setEditNonce] = useState(0)
  const [createNonce, setCreateNonce] = useState(0)
  const [unlinkNonce, setUnlinkNonce] = useState(0)

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkSendOpen, setBulkSendOpen] = useState(false)
  const [bulkReceiveOpen, setBulkReceiveOpen] = useState(false)
  const [bulkSendPending, setBulkSendPending] = useState(false)
  const [bulkReceivePending, setBulkReceivePending] = useState(false)

  // F10: derive global lock flag
  const bulkInFlight = bulkSendPending || bulkReceivePending

  // Derive selection mode (only meaningful when all selected share the same status)
  const selectionMode = useMemo<'homogeneous' | 'mixed' | 'none'>(() => {
    if (selectedIds.size === 0) return 'none'
    const statuses = new Set(cylinders.filter(c => selectedIds.has(c.id)).map(c => c.status))
    if (statuses.size > 1) return 'mixed'
    return 'homogeneous'
  }, [selectedIds, cylinders])

  const selectionStatus = useMemo<string | null>(() => {
    if (selectionMode !== 'homogeneous') return null
    const first = cylinders.find(c => selectedIds.has(c.id))
    return first?.status ?? null
  }, [selectionMode, selectedIds, cylinders])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllSelectable() {
    const targetStatus = selectionStatus ?? 'activo'
    const selectableIds = cylinders.filter(c => c.status === targetStatus).map(c => c.id)
    const allSelected = selectableIds.every(id => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        selectableIds.forEach(id => next.delete(id))
      } else {
        next.clear()
        selectableIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  function isSelectable(c: Cylinder) {
    return c.status === 'activo' || c.status === 'en_certificacion'
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Cilindros GNC</CardTitle>
          <CardDescription>Gestión de cilindros asociados al vehículo</CardDescription>
        </div>
        <Button onClick={() => { setShowAdd(!showAdd); if (!showAdd) setCreateNonce(n => n + 1) }} variant="outline">
          {showAdd ? 'Cancelar' : <><Plus className="w-4 h-4 mr-2" /> Añadir Cilindro</>}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 flex-1">

        {/* ── Add cylinder form (G8 — per-instance component) ── */}
        <AnimatePresence>
          {showAdd && (
            <CreateCylinderForm
              key={`create-${createNonce}`}
              vehicleId={vehicleId}
              inspectionId={inspectionId}
              onDone={() => setShowAdd(false)}
              onCancel={() => setShowAdd(false)}
            />
          )}
        </AnimatePresence>

        {/* ── Cylinder list ──────────────────────────────────── */}
        {cylinders.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-xl">
            No hay cilindros registrados para este vehículo.
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {cylinders.map((cyl) => {
                const selectable = isSelectable(cyl)
                const checked = selectedIds.has(cyl.id)
                return (
                <div key={cyl.id} className="p-3 bg-muted/50 rounded-lg text-sm space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      {selectable && (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelect(cyl.id)}
                          disabled={bulkInFlight}
                          className="w-4 h-4 rounded border-border accent-primary shrink-0 disabled:opacity-50"
                          aria-label={`Seleccionar ${cyl.brand} ${cyl.initialSerial}`}
                        />
                      )}
                      <span className="font-medium truncate">{cyl.brand} — {cyl.capacity}L</span>
                    </div>
                    <Badge variant={statusBadgeVariant(cyl.status)} className="shrink-0">
                      {statusLabel(cyl.status)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-muted-foreground">
                    <div className="flex justify-between gap-2">
                      <span>Serial:</span>
                      <span className="font-mono font-medium text-foreground text-right break-all">{cyl.actualSerial || cyl.initialSerial}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Prueba:</span>
                      <span className="font-medium text-foreground">{formatMonthYear(cyl.manufactureDate)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                    <span className="text-muted-foreground truncate">{cyl.location || '—'}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {cyl.status === 'activo' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReceivingId(null); setEditingFieldsId(null); setUnlinkConfirmId(null)
                            setSendingId(sendingId === cyl.id ? null : cyl.id)
                            if (sendingId !== cyl.id) setSendNonce(n => n + 1)
                          }}
                          disabled={bulkInFlight}
                          title="Enviar a planta"
                        >
                          <Send className="w-4 h-4 text-amber-600" />
                        </Button>
                      )}
                      {cyl.status === 'en_certificacion' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSendingId(null); setEditingFieldsId(null); setUnlinkConfirmId(null)
                            setReceivingId(receivingId === cyl.id ? null : cyl.id)
                            if (receivingId !== cyl.id) setReceiveNonce(n => n + 1)
                          }}
                          disabled={bulkInFlight}
                          title="Recibir de planta"
                        >
                          <PackageCheck className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      {(cyl.status === 'activo' || cyl.status === 'de_baja') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSendingId(null); setReceivingId(null); setUnlinkConfirmId(null)
                            setEditingFieldsId(editingFieldsId === cyl.id ? null : cyl.id)
                            if (editingFieldsId !== cyl.id) setEditNonce(n => n + 1)
                          }}
                          disabled={bulkInFlight}
                          title="Editar datos del cilindro"
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </Button>
                      )}
                      {cyl.status === 'en_certificacion' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSendingId(null); setReceivingId(null); setEditingFieldsId(null)
                            setUnlinkConfirmId(unlinkConfirmId === cyl.id ? null : cyl.id)
                            if (unlinkConfirmId !== cyl.id) setUnlinkNonce(n => n + 1)
                          }}
                          disabled={bulkInFlight}
                          title="Desvincular del vehículo"
                        >
                          <Unlink className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Inline forms for mobile — each form owns its useActionState (F2) */}
                  <AnimatePresence>
                    {sendingId === cyl.id && (
                      <SendToPlantForm
                        key={`send-${cyl.id}-${sendNonce}`}
                        cylinder={cyl}
                        inspectionId={inspectionId}
                        onDone={() => setSendingId(null)}
                        onCancel={() => setSendingId(null)}
                      />
                    )}
                    {receivingId === cyl.id && (
                      <ReceiveFromPlantForm
                        key={`receive-${cyl.id}-${receiveNonce}`}
                        cylinder={cyl}
                        inspectionId={inspectionId}
                        onDone={() => setReceivingId(null)}
                        onCancel={() => setReceivingId(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size > 0 && cylinders.filter(isSelectable).every(c => selectedIds.has(c.id))}
                        onChange={toggleSelectAllSelectable}
                        disabled={bulkInFlight}
                        className="w-4 h-4 rounded border-border accent-primary disabled:opacity-50"
                        aria-label="Seleccionar todos los cilindros aptos"
                      />
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Marca</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Capacidad</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Serial</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Fecha Prueba</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Estado</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cylinders.map((cyl) => {
                    const selectable = isSelectable(cyl)
                    const checked = selectedIds.has(cyl.id)
                    return (
                    <tr key={cyl.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm">
                        {selectable && (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelect(cyl.id)}
                            disabled={bulkInFlight}
                            className="w-4 h-4 rounded border-border accent-primary disabled:opacity-50"
                            aria-label={`Seleccionar ${cyl.brand} ${cyl.initialSerial}`}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{cyl.brand}</td>
                      <td className="px-4 py-3 text-sm">{cyl.capacity}</td>
                      <td className="px-4 py-3 text-sm font-mono">{cyl.actualSerial || cyl.initialSerial}</td>
                      <td className="px-4 py-3 text-sm">{formatMonthYear(cyl.manufactureDate)}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={statusBadgeVariant(cyl.status)}>
                          {statusLabel(cyl.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {cyl.status === 'activo' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setReceivingId(null); setEditingFieldsId(null); setUnlinkConfirmId(null)
                                setSendingId(sendingId === cyl.id ? null : cyl.id)
                                if (sendingId !== cyl.id) setSendNonce(n => n + 1)
                              }}
                              disabled={bulkInFlight}
                              title="Enviar a planta"
                            >
                              <Send className="w-4 h-4 text-amber-600" />
                            </Button>
                          )}
                          {cyl.status === 'en_certificacion' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSendingId(null); setEditingFieldsId(null); setUnlinkConfirmId(null)
                                setReceivingId(receivingId === cyl.id ? null : cyl.id)
                                if (receivingId !== cyl.id) setReceiveNonce(n => n + 1)
                              }}
                              disabled={bulkInFlight}
                              title="Recibir de planta"
                            >
                              <PackageCheck className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          {(cyl.status === 'activo' || cyl.status === 'de_baja') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSendingId(null); setReceivingId(null); setUnlinkConfirmId(null)
                                setEditingFieldsId(editingFieldsId === cyl.id ? null : cyl.id)
                                if (editingFieldsId !== cyl.id) setEditNonce(n => n + 1)
                              }}
                              disabled={bulkInFlight}
                              title="Editar datos del cilindro"
                            >
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </Button>
                          )}
                          {cyl.status === 'en_certificacion' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSendingId(null); setReceivingId(null); setEditingFieldsId(null)
                                setUnlinkConfirmId(unlinkConfirmId === cyl.id ? null : cyl.id)
                                if (unlinkConfirmId !== cyl.id) setUnlinkNonce(n => n + 1)
                              }}
                              disabled={bulkInFlight}
                              title="Desvincular del vehículo"
                            >
                              <Unlink className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Desktop inline forms (each form owns its useActionState — F2) ─── */}
        <div className="hidden md:block">
          <AnimatePresence>
            {sendingId && (() => {
              const cyl = cylinders.find(c => c.id === sendingId)
              if (!cyl) return null
              return (
                <SendToPlantForm
                  key={`send-d-${cyl.id}-${sendNonce}`}
                  cylinder={cyl}
                  inspectionId={inspectionId}
                  onDone={() => setSendingId(null)}
                  onCancel={() => setSendingId(null)}
                />
              )
            })()}
          </AnimatePresence>

          <AnimatePresence>
            {receivingId && (() => {
              const cyl = cylinders.find(c => c.id === receivingId)
              if (!cyl) return null
              return (
                <ReceiveFromPlantForm
                  key={`receive-d-${cyl.id}-${receiveNonce}`}
                  cylinder={cyl}
                  inspectionId={inspectionId}
                  onDone={() => setReceivingId(null)}
                  onCancel={() => setReceivingId(null)}
                />
              )
            })()}
          </AnimatePresence>
        </div>

        {/* ── Bulk action bar ───────────────────────────────── */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="sticky bottom-0 z-10 bg-background/95 backdrop-blur border border-border rounded-xl p-3 shadow-lg flex flex-col sm:flex-row items-start sm:items-center gap-3"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Badge variant="secondary" className="shrink-0">{selectedIds.size} seleccionados</Badge>
                {selectionMode === 'mixed' && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 truncate">
                    Seleccioná cilindros del mismo estado
                  </span>
                )}
                {selectionMode === 'homogeneous' && selectionStatus === 'activo' && (
                  <span className="text-xs text-muted-foreground truncate">
                    Cilindros activos — listos para enviar a planta
                  </span>
                )}
                {selectionMode === 'homogeneous' && selectionStatus === 'en_certificacion' && (
                  <span className="text-xs text-muted-foreground truncate">
                    Cilindros en certificación — listos para recibir
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                  disabled={bulkInFlight}
                  className="gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Limpiar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={selectionMode !== 'homogeneous' || selectionStatus !== 'activo' || bulkInFlight}
                  onClick={() => { setBulkSendOpen(true); setBulkReceiveOpen(false) }}
                  className="gap-1 bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200"
                >
                  <Truck className="w-3.5 h-3.5" /> Enviar a planta ({selectedIds.size})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={selectionMode !== 'homogeneous' || selectionStatus !== 'en_certificacion' || bulkInFlight}
                  onClick={() => { setBulkReceiveOpen(true); setBulkSendOpen(false) }}
                  className="gap-1 bg-green-50 border-green-200 text-green-800 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200"
                >
                  <PackageCheck className="w-3.5 h-3.5" /> Recibir de planta ({selectedIds.size})
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Bulk send inline form (F2 — own useActionState) ── */}
        <AnimatePresence>
          {bulkSendOpen && selectedIds.size > 0 && (
            <BulkSendForm
              selectedIds={selectedIds}
              inspectionId={inspectionId}
              onDone={() => { setBulkSendOpen(false); setSelectedIds(new Set()) }}
              onCancel={() => setBulkSendOpen(false)}
              onPendingChange={setBulkSendPending}
            />
          )}
        </AnimatePresence>

        {/* ── Bulk receive inline form (F2 + F5 — own useActionState + destructive confirm) ── */}
        <AnimatePresence>
          {bulkReceiveOpen && selectedIds.size > 0 && (
            <BulkReceiveForm
              selectedIds={selectedIds}
              inspectionId={inspectionId}
              onDone={() => { setBulkReceiveOpen(false); setSelectedIds(new Set()) }}
              onCancel={() => setBulkReceiveOpen(false)}
              onPendingChange={setBulkReceivePending}
            />
          )}
        </AnimatePresence>

        {/* ── Edit fields form (F2 — own useActionState) ────── */}
        <AnimatePresence>
          {editingFieldsId && (() => {
            const cyl = cylinders.find(c => c.id === editingFieldsId)
            if (!cyl) return null
            return (
              <EditCylinderFieldsForm
                key={`edit-${cyl.id}-${editNonce}`}
                cylinder={cyl}
                inspectionId={inspectionId}
                onDone={() => setEditingFieldsId(null)}
                onCancel={() => setEditingFieldsId(null)}
              />
            )
          })()}
        </AnimatePresence>

        {/* ── Unlink confirmation (G8 — per-instance component) ── */}
        <AnimatePresence>
          {unlinkConfirmId && (() => {
            const cyl = cylinders.find(c => c.id === unlinkConfirmId)
            if (!cyl) return null
            return (
              <UnlinkConfirmPanel
                key={`unlink-${cyl.id}-${unlinkNonce}`}
                cylinder={cyl}
                inspectionId={inspectionId}
                onDone={() => setUnlinkConfirmId(null)}
                onCancel={() => setUnlinkConfirmId(null)}
              />
            )
          })()}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
