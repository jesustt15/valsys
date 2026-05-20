'use client'

import { useState, useActionState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, CheckCircle, AlertCircle, Edit2, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { PhotoUpload } from '@/components/inspections/photo-upload'
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

  const [createState, createFormAction, createPending] = useActionState<CylinderFormState | null, FormData>(
    createCylinderAction,
    null
  )

  const [updateState, updateFormAction, updatePending] = useActionState<CylinderFormState | null, FormData>(
    updateCylinderStatusAction,
    null
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Cilindros GNC</CardTitle>
          <CardDescription>Gestión de cilindros asociados al vehículo</CardDescription>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} variant="outline">
          {showAdd ? 'Cancelar' : <><Plus className="w-4 h-4 mr-2" /> Añadir Cilindro</>}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        
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
                      <Badge variant={cyl.status === 'en_planta' ? 'warning' : 'info'}>{cyl.status}</Badge>
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
          {editingId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-4"
            >
              <form action={updateFormAction} className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800 space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-500" />
                  Actualizar Estado de Cilindro
                </h4>
                <input type="hidden" name="id" value={editingId} />
                <input type="hidden" name="inspectionId" value={inspectionId} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Nuevo Estado</Label>
                      {cylinders.find(c => c.id === editingId)?.status === 'en_planta' ? (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="text-sm text-amber-700 dark:text-amber-400">
                            Use el panel de <strong>Recertificación de Cilindros</strong> para gestionar cilindros en planta.
                          </span>
                        </div>
                      ) : (
                        <select
                          name="status"
                          defaultValue={cylinders.find(c => c.id === editingId)?.status}
                          className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm bg-white dark:bg-card"
                        >
                          <option value="montado">Montado</option>
                          <option value="en_planta">En Planta (Desmontado)</option>
                          <option value="pendiente_reinstalacion">Pendiente Reinstalación</option>
                          <option value="de_baja">De Baja (Scrap)</option>
                        </select>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="actualSerial">Nuevo Nº Serie (Si aplica recertificación)</Label>
                      <Input name="actualSerial" defaultValue={cylinders.find(c => c.id === editingId)?.actualSerial || ''} placeholder="Ej: Nueva serie post-planta" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Fotos de Evidencia</Label>
                    <input type="hidden" name="category" value="removal" />
                    <PhotoUpload category="removal" label="Fotos del cilindro/desmontaje" />
                  </div>
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
                  <Button type="submit" disabled={updatePending}>
                    {updatePending ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

      </CardContent>
    </Card>
  )
}
