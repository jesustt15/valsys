'use client'

import { useState, useActionState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, CheckCircle, AlertCircle, Edit2, Camera, RotateCcw, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { PhotoUpload } from '@/components/inspections/photo-upload'
import { SignaturePad } from '@/components/inspections/signature-pad'
import { createCylinderAction, updateCylinderStatusAction, type CylinderFormState } from '@/lib/actions/cylinder'

interface Cylinder {
  id: string
  brand: string
  capacity: string
  initialSerial: string
  actualSerial: string | null
  status: string
  location: string
  recalificationDate: string | null
}

interface Props {
  inspectionId: string
  vehicleId: string
  cylinders: Cylinder[]
}

export function CylinderManager({ inspectionId, vehicleId, cylinders }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [signature, setSignature] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  const [createState, createFormAction, createPending] = useActionState<CylinderFormState | null, FormData>(
    createCylinderAction,
    null
  )

  const [updateState, updateFormAction, updatePending] = useActionState<CylinderFormState | null, FormData>(
    updateCylinderStatusAction,
    null
  )

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Cilindros GNC</CardTitle>
          <CardDescription>Gestión de cilindros asociados al vehículo</CardDescription>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} variant="outline">
          {showAdd ? 'Cancelar' : <><Plus className="w-4 h-4 mr-2" /> Añadir Cilindro</>}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 flex-1">
        
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form action={createFormAction} className="bg-muted/30 p-4 rounded-xl border border-border space-y-4 mb-6">
                <h4 className="font-medium text-sm">Registrar Nuevo Cilindro</h4>
                <input type="hidden" name="vehicleId" value={vehicleId} />
                <input type="hidden" name="inspectionId" value={inspectionId} />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand" required>Marca</Label>
                    <Input id="brand" name="brand" required disabled={createPending} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity" required>Capacidad (L)</Label>
                    <Input id="capacity" name="capacity" required disabled={createPending} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="initialSerial" required>Nº Serie</Label>
                    <Input id="initialSerial" name="initialSerial" required disabled={createPending} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" required>Ubicación</Label>
                    <Input id="location" name="location" required disabled={createPending} placeholder="Ej: Baúl" />
                  </div>
                </div>

                {createState?.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{createState.error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={createPending}>
                  {createPending ? 'Guardando...' : 'Guardar Cilindro'}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {cylinders.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-xl">
            No hay cilindros registrados para este vehículo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Marca</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Capacidad</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Serie</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Estado</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cylinders.map((cyl) => (
                  <tr key={cyl.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm">{cyl.brand}</td>
                    <td className="px-4 py-3 text-sm">{cyl.capacity}</td>
                    <td className="px-4 py-3 text-sm font-mono">{cyl.actualSerial || cyl.initialSerial}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={
                        cyl.status === 'desmontado' ? 'warning'
                          : cyl.status === 'en_planta' ? 'warning'
                          : cyl.status === 'pendiente_reinstalacion' ? 'warning'
                          : cyl.status === 'condenado' ? 'destructive'
                          : cyl.status === 'instalado' ? 'success'
                          : cyl.status === 'reinstalado' ? 'success'
                          : 'info'
                      }>
                        {cyl.status === 'instalado' ? 'Instalado'
                          : cyl.status === 'desmontado' ? 'Desmontado'
                          : cyl.status === 'reinstalado' ? 'Reinstalado'
                          : cyl.status === 'condenado' ? 'Condenado (De baja)'
                          : cyl.status === 'en_planta' ? 'En Planta'
                          : cyl.status === 'pendiente_reinstalacion' ? 'Pendiente de Reinstalación'
                          : cyl.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(editingId === cyl.id ? null : cyl.id)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit Form Modal/Inline */}
        <AnimatePresence>
          {editingId && (() => {
            const cyl = cylinders.find(c => c.id === editingId)
            const currentStatus = cyl?.status

            if (currentStatus === 'en_planta') {
              return (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-4"
                >
                  <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200 dark:border-amber-800 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-sm text-amber-800 dark:text-amber-300">
                          Cilindro en Planta
                        </h4>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                          Usá el panel de <strong>Recertificación de Cilindros</strong> (más arriba) para recertificar o dar de baja este cilindro.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                        Cerrar
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )
            }

            if (currentStatus === 'pendiente_reinstalacion') {
              return (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-4"
                >
                  <form action={updateFormAction} className="bg-green-50/50 dark:bg-green-900/10 p-4 rounded-xl border border-green-200 dark:border-green-800 space-y-4">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-green-600" />
                      Reinstalación de Cilindro
                    </h4>
                    <input type="hidden" name="id" value={editingId} />
                    <input type="hidden" name="inspectionId" value={inspectionId} />
                    <input type="hidden" name="status" value="reinstalado" />

                    <div className="flex items-start gap-3 p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                      <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <div className="text-sm text-green-800 dark:text-green-300">
                        <p className="font-medium">{cyl?.brand} — {cyl?.capacity}L</p>
                        <p className="text-green-700 dark:text-green-400 mt-1">
                          Serial: <code className="font-mono">{cyl?.actualSerial || cyl?.initialSerial}</code>
                        </p>
                        <p className="text-green-700 dark:text-green-400 mt-1">
                          Confirmá que el cilindro fue reinstalado en el vehículo.
                        </p>
                      </div>
                    </div>

                    {updateState?.error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{updateState.error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={updatePending} className="bg-green-600 hover:bg-green-700 text-white">
                        {updatePending ? 'Guardando...' : '✓ Marcar como Reinstalado'}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )
            }

            if (currentStatus === 'condenado') {
              return (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-4"
                >
                  <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">
                          Cilindro Condenado
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Este cilindro fue dado de baja. No se pueden realizar más acciones.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                        Cerrar
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )
            }

            // Default: instalado / reinstalado — show dismount form (no status dropdown)
            return (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-4"
              >
                <form action={updateFormAction} className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200 dark:border-amber-800 space-y-4">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Camera className="w-4 h-4 text-amber-600" />
                    Desmontaje de Cilindro
                  </h4>
                  <input type="hidden" name="id" value={editingId} />
                  <input type="hidden" name="inspectionId" value={inspectionId} />
                  <input type="hidden" name="status" value="en_planta" />
                  <input type="hidden" name="category" value="removal" />

                  <div className="flex items-start gap-3 p-3 bg-amber-100 dark:bg-amber-900/20 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-300">
                      <p className="font-medium">{cyl?.brand} — {cyl?.capacity}L</p>
                      <p className="text-amber-700 dark:text-amber-400 mt-1">
                        Serial: <code className="font-mono">{cyl?.actualSerial || cyl?.initialSerial}</code>
                      </p>
                      <p className="text-amber-700 dark:text-amber-400 mt-1">
                        El cilindro pasará a estado <strong>En Planta</strong>. Capture fotos de evidencia y la firma del propietario.
                      </p>
                    </div>
                  </div>

                  {/* Firma del propietario — obligatoria al desmontaje */}
                  <div className="space-y-2 pt-2">
                    <Label className="flex items-center gap-2">
                      <PenLine className="w-4 h-4 text-violet-500" />
                      Firma del Propietario <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      El titular firma confirmando el retiro de los cilindros.
                    </p>
                    <SignaturePad onChange={setSignature} disabled={updatePending} />
                    <input type="hidden" name="signature" value={signature} />
                  </div>

                  <div className="space-y-2">
                    <Label>Fotos de Evidencia</Label>
                    <PhotoUpload category="removal" label="Fotos del cilindro/desmontaje" />
                  </div>

                  {updateState?.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{updateState.error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={updatePending} className="bg-amber-600 hover:bg-amber-700 text-white">
                      {updatePending ? 'Guardando...' : '✓ Desmontar Cilindro'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )
          })()}
        </AnimatePresence>

      </CardContent>
    </Card>
  )
}
