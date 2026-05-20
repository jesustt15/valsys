'use client'

import { useState, useActionState } from 'react'
import { UploadCloud, CheckCircle, AlertCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PhotoUpload } from '@/components/inspections/photo-upload'
import { uploadInspectionFileAction, type InspectionFormState } from '@/lib/actions/inspection'

interface Props {
  inspectionId: string
}

const CATEGORIES = [
  { value: 'plant', label: 'Documentación de Planta' },
  { value: 'post_mount', label: 'Fotos Post-Montaje' },
  { value: 'initial', label: 'Fotos Iniciales Adicionales' },
  { value: 'removal', label: 'Fotos de Desmontaje Adicionales' },
]

export function ExpedienteUploader({ inspectionId }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [state, formAction, pending] = useActionState<InspectionFormState | null, FormData>(
    uploadInspectionFileAction,
    null
  )

  const handleClose = () => {
    if (!pending) setIsOpen(false)
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="w-full">
        <UploadCloud className="w-4 h-4 mr-2" />
        Subir Archivos al Expediente
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={handleClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-card p-6 rounded-2xl shadow-xl z-50 border border-border"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-primary" />
                  Subir Archivos
                </h3>
                <Button variant="ghost" size="sm" onClick={handleClose} disabled={pending}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form
                action={(formData) => {
                  formAction(formData).then((res) => {
                    // Si el componente todavía está montado y fue exitoso, podríamos cerrarlo o mostrar un success.
                    // React 19 maneja useActionState, el resultado se refleja en `state`.
                  })
                }}
                className="space-y-6"
              >
                <input type="hidden" name="inspectionId" value={inspectionId} />

                <div className="space-y-2">
                  <Label htmlFor="category" required>Tipo de Archivo</Label>
                  <select
                    name="category"
                    id="category"
                    required
                    disabled={pending}
                    className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base bg-white dark:bg-card"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label required>Archivos / Fotos</Label>
                  {/* PhotoUpload uses input name="photos", but our action expects "files". Wait, the action handles "files". PhotoUpload outputs name="photos". Let's use standard input. */}
                  <input
                    type="file"
                    name="files"
                    multiple
                    required
                    disabled={pending}
                    className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
                    accept="image/*,application/pdf"
                  />
                  <p className="text-xs text-muted-foreground">Soporta imágenes y PDFs.</p>
                </div>

                {state?.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{state.error}</AlertDescription>
                  </Alert>
                )}

                {state?.success && (
                  <Alert variant="success" className="bg-green-50 border-green-200 text-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>Archivos subidos correctamente.</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={handleClose} disabled={pending}>
                    {state?.success ? 'Cerrar' : 'Cancelar'}
                  </Button>
                  {!state?.success && (
                    <Button type="submit" disabled={pending}>
                      {pending ? 'Subiendo...' : 'Subir Archivos'}
                    </Button>
                  )}
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
