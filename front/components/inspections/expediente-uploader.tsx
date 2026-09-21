'use client'

import { useState, useActionState, useRef, useCallback } from 'react'
import { UploadCloud, CheckCircle, AlertCircle, X, Video } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { uploadInspectionFileAction, type InspectionFormState } from '@/lib/actions/inspection'
import { queue as videoQueue } from '@/lib/video-upload-queue'
import { validateVideoFile, validateVideoDuration } from '@/lib/video-compressor'

interface Props {
  inspectionId: string
}

const CATEGORIES = [
  { value: 'plant', label: 'Documentación de Planta' },
  { value: 'post_mount', label: 'Post-Montaje' },
  { value: 'initial', label: 'Inicial / Adicional' },
  { value: 'removal', label: 'Desmontaje Adicional' },
]

export function ExpedienteUploader({ inspectionId }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="w-full">
        <UploadCloud className="w-4 h-4 mr-2" />
        Subir Archivos al Expediente
      </Button>

      <AnimatePresence>
        {isOpen && (
          <UploaderModal
            key={formKey}
            inspectionId={inspectionId}
            onClose={() => setIsOpen(false)}
            onReset={() => setFormKey((k) => k + 1)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function UploaderModal({
  inspectionId,
  onClose,
  onReset,
}: {
  inspectionId: string
  onClose: () => void
  onReset: () => void
}) {
  const [state, formAction, pending] = useActionState<InspectionFormState | null, FormData>(
    uploadInspectionFileAction,
    null
  )
  const [videoError, setVideoError] = useState<string | null>(null)
  const [videoEnqueued, setVideoEnqueued] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [photosOnlySuccess, setPhotosOnlySuccess] = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const filesInputRef = useRef<HTMLInputElement>(null)

  const handleClose = () => {
    if (!pending) onClose()
  }

  const handleReset = useCallback(() => {
    setVideoError(null)
    setVideoEnqueued(false)
    setFormError(null)
    setPhotosOnlySuccess(false)
    if (videoInputRef.current) videoInputRef.current.value = ''
    if (filesInputRef.current) filesInputRef.current.value = ''
    onReset()
  }, [onReset])

  const handleVideoSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoError(null)
    setVideoEnqueued(false)
    const file = e.target.files?.[0]
    if (!file) return

    const sizeError = validateVideoFile(file)
    if (sizeError) {
      setVideoError(sizeError)
      e.target.value = ''
      return
    }

    const durationError = await validateVideoDuration(file)
    if (durationError) {
      setVideoError(durationError)
      e.target.value = ''
      return
    }

    const category = (formRef.current?.querySelector('select[name="category"]') as HTMLSelectElement)?.value || 'initial'
    videoQueue.enqueue(inspectionId, category, file)
    setVideoEnqueued(true)
    e.target.value = ''
  }, [inspectionId])

  const handleSubmit = useCallback((formData: FormData) => {
    setFormError(null)
    setPhotosOnlySuccess(false)
    const files = formData.getAll('files')
    const hasPhotos = files.some((f) => f instanceof File && f.size > 0)

    if (!hasPhotos && !videoEnqueued) {
      setFormError('Seleccione al menos una foto/video.')
      return
    }

    if (!hasPhotos && videoEnqueued) {
      setPhotosOnlySuccess(true)
      return
    }

    formAction(formData)
  }, [videoEnqueued, formAction])

  return (
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
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-card p-6 rounded-2xl shadow-xl z-50 border border-border max-h-[90vh] overflow-y-auto"
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
          ref={formRef}
          action={handleSubmit}
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
            <Label>Archivos / Fotos</Label>
            <input
              ref={filesInputRef}
              type="file"
              name="files"
              multiple
              disabled={pending}
              className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
              accept="image/*,application/pdf"
            />
            <p className="text-xs text-muted-foreground">Soporta imágenes y PDFs. Opcional si sube un video.</p>
          </div>

          <div className="space-y-2">
            <Label>
              <Video className="w-4 h-4 inline mr-1 text-indigo-500" />
              Video
            </Label>
            <input
              ref={videoInputRef}
              type="file"
              disabled={pending}
              onChange={handleVideoSelected}
              className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
              accept="video/mp4,video/quicktime,video/webm"
            />
            <p className="text-xs text-muted-foreground">MP4, MOV o WebM. Máx 100MB, 2 min. Se comprime automáticamente.</p>
            {videoError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{videoError}</AlertDescription>
              </Alert>
            )}
            {videoEnqueued && !videoError && (
              <Alert variant="success" className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>Video encolado. Se procesará en segundo plano.</AlertDescription>
              </Alert>
            )}
          </div>

          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {(state?.success || photosOnlySuccess) && (
            <Alert variant="success" className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                {photosOnlySuccess && !state?.success
                  ? 'Video encolado correctamente. Se procesará en segundo plano.'
                  : 'Archivos subidos correctamente.'}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-2">
            {(state?.success || photosOnlySuccess) && (
              <Button type="button" variant="outline" onClick={handleReset}>
                Subir más
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleClose} disabled={pending}>
              {(state?.success || photosOnlySuccess) ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!state?.success && !photosOnlySuccess && (
              <Button type="submit" disabled={pending}>
                {pending ? 'Subiendo...' : 'Subir Archivos'}
              </Button>
            )}
          </div>
        </form>
      </motion.div>
    </>
  )
}
