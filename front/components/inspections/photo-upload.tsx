'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PhotoCamera } from './photo-camera'

interface PhotoUploadProps {
  category: 'initial' | 'removal' | 'post_mount'
  label: string
  onFilesChange?: (files: File[]) => void
}

const MAX_PHOTOS = 25
const MAX_FILE_SIZE = 15 * 1024 * 1024
const CAMERA_TIMEOUT_MS = 120_000

function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    setIsTouch(
      typeof navigator !== 'undefined' &&
      (navigator.maxTouchPoints > 0 || 'ontouchstart' in window)
    )
  }, [])

  return isTouch
}

export function PhotoUpload({ category, label, onFilesChange }: PhotoUploadProps) {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isMultiShot, setIsMultiShot] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const accumulatorRef = useRef<HTMLInputElement>(null)
  const multiShotRef = useRef(false)
  const cameraTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTouch = useIsTouchDevice()
  const [cameraSupported, setCameraSupported] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)

  // Feature detection: can we use getUserMedia for in-app camera?
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection needs client-side value after hydration
    setCameraSupported(
      typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
    )
  }, [])

  const syncAccumulator = useCallback(() => {
    if (!accumulatorRef.current) return
    try {
      const dt = new DataTransfer()
      previews.forEach(p => dt.items.add(p.file))
      accumulatorRef.current.files = dt.files
    } catch {
      // DataTransfer not supported — fallback: files won't be in accumulator
      // This affects iOS Safari; photos will only be in previews state
    }
  }, [previews])

  useEffect(() => {
    syncAccumulator()
    onFilesChange?.(previews.map((p) => p.file))
  }, [previews, syncAccumulator, onFilesChange])

  const stopMultiShot = useCallback(() => {
    setIsMultiShot(false)
    multiShotRef.current = false
    if (cameraTimeoutRef.current) {
      clearTimeout(cameraTimeoutRef.current)
      cameraTimeoutRef.current = null
    }
  }, [])

  const triggerCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.value = ''
      cameraRef.current.click()
      cameraTimeoutRef.current = setTimeout(() => {
        stopMultiShot()
      }, CAMERA_TIMEOUT_MS)
    }
  }, [stopMultiShot])

  const addFiles = useCallback(
    (files: File[] | FileList | null) => {
      setError(null)
      if (!files) return

      const fileArray = Array.from(files as ArrayLike<File>)

      if (previews.length + fileArray.length > MAX_PHOTOS) {
        setError(`Máximo ${MAX_PHOTOS} fotos permitidas (ya tenés ${previews.length})`)
        return
      }

      const valid: { file: File; url: string }[] = []

      for (const file of fileArray) {
        if (!file.type.startsWith('image/')) {
          setError('Solo se permiten imágenes')
          return
        }

        if (file.size > MAX_FILE_SIZE) {
          setError(`La imagen "${file.name}" supera los 15MB`)
          return
        }

        valid.push({ file, url: URL.createObjectURL(file) })
      }

      setPreviews((prev) => [...prev, ...valid])
    },
    [previews.length],
  )

  const handleCameraCapture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (cameraTimeoutRef.current) {
        clearTimeout(cameraTimeoutRef.current)
        cameraTimeoutRef.current = null
      }

      const files = e.target.files
      if (cameraRef.current) cameraRef.current.value = ''

      if (!files || files.length === 0) {
        stopMultiShot()
        return
      }

      addFiles(files)

      if (multiShotRef.current) {
        const timer = setTimeout(() => {
          if (multiShotRef.current) triggerCamera()
        }, 400)
        cameraTimeoutRef.current = timer
      }
    },
    [addFiles, stopMultiShot, triggerCamera],
  )

  const startMultiShot = useCallback(() => {
    setIsMultiShot(true)
    multiShotRef.current = true
    triggerCamera()
  }, [triggerCamera])

  const handleGallerySelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(e.target.files)
      if (galleryRef.current) galleryRef.current.value = ''
    },
    [addFiles],
  )

  const removePhoto = useCallback((index: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  // ── In-app camera: receive captured files and feed them into addFiles ──
  const handleCameraPhotos = useCallback(
    (files: File[]) => {
      if (files.length > 0) addFiles(files)
    },
    [addFiles],
  )

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [previews])

  useEffect(() => {
    return () => {
      if (cameraTimeoutRef.current) clearTimeout(cameraTimeoutRef.current)
    }
  }, [])

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">{label}</label>

      {/* Hidden inputs for native camera/gallery UI (no name — not submitted) */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleGallerySelect}
        className="hidden"
      />

      {/* Accumulator input — holds ALL photos for form submission */}
      <input
        ref={accumulatorRef}
        name="photos"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
      />

      {isTouch ? (
        <div className="flex flex-wrap gap-2">
          {isMultiShot ? (
            <>
              <div className="flex items-center gap-2 w-full">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-medium text-green-800 dark:text-green-300">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  {previews.length} / {MAX_PHOTOS}
                </span>
                <button
                  type="button"
                  onClick={stopMultiShot}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
                >
                  ✕ Finalizar
                </button>
              </div>
              <p className="w-full text-xs text-muted-foreground">
                La cámara se reabre automáticamente. Presioná &quot;Finalizar&quot; o cancelá en la cámara para detener.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => (cameraSupported ? setCameraOpen(true) : startMultiShot())}
                disabled={previews.length >= MAX_PHOTOS}
                className="inline-flex items-center gap-2 rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                📷 Tomar fotos
              </button>

              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                disabled={previews.length >= MAX_PHOTOS}
                className="inline-flex items-center gap-2 rounded-xl border border-dashed border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                📁 Elegir de galería
              </button>

              <p className="w-full text-xs text-muted-foreground">
                {cameraSupported
                  ? 'Se abrirá la cámara en la app: tocá el obturador para cada foto y &quot;Listo&quot; al terminar.'
                  : 'La cámara se reabre automáticamente después de cada foto. Presioná &quot;Finalizar&quot; o cancelá para detener.'}
              </p>
            </>
          )}
        </div>
      ) : (
        /* ── Desktop: standard multi-file picker ────────── */
        <>
          <input
            name="photos"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => addFiles(e.target.files)}
            className="block w-full text-sm text-muted-foreground
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-lg file:border-0
                       file:text-sm file:font-semibold
                       file:bg-green-50 file:text-green-700
                       hover:file:bg-green-100
                       cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            Máximo {MAX_PHOTOS} fotos, 15MB cada una. Formatos: JPG, PNG, WEBP
          </p>
        </>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {previews.map((preview, index) => (
            <div key={preview.url} className="relative group">
              <img
                src={preview.url}
                alt={`Foto ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setPreviewImage(preview.url)}
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className={
                  isTouch
                    ? 'absolute top-1 right-1 w-7 h-7 rounded-full bg-red-500/80 text-white flex items-center justify-center text-xs'
                    : 'absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs'
                }
                aria-label="Eliminar foto"
              >
                ✕
              </button>
              <span className={
                isTouch
                  ? 'absolute bottom-1 left-1 text-[11px] text-white bg-black/50 px-1.5 py-0.5 rounded'
                  : 'absolute bottom-1 left-1 text-[10px] text-white bg-black/40 px-1.5 py-0.5 rounded'
              }>
                {index + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Image Preview Modal ───────────────────────────────── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={previewImage}
              alt="Vista previa"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors text-lg font-bold"
              aria-label="Cerrar vista previa"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {cameraOpen && (
        <PhotoCamera
          maxPhotos={MAX_PHOTOS - previews.length}
          onPhotos={handleCameraPhotos}
          onClose={() => setCameraOpen(false)}
          onFallback={() => {
            setCameraOpen(false)
            startMultiShot()
          }}
        />
      )}

      <input type="hidden" name="category" value={category} />
    </div>
  )
}
