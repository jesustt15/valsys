'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PhotoCamera } from './photo-camera'
import { compressVideo, validateVideoDuration, validateVideoFile } from '@/lib/video-compressor'

interface PhotoUploadProps {
  category: 'initial' | 'removal' | 'post_mount'
  label: string
  onFilesChange?: (files: File[]) => void
  /**
   * Files to seed the picker with (e.g. restored from an IndexedDB draft).
   * Must be available on FIRST render — this component is uncontrolled and
   * only reads it during state initialization. Gate rendering until your
   * draft has finished loading.
   */
  initialFiles?: File[]
}

const MAX_PHOTOS = 25
const MAX_VIDEOS = 2
const MAX_FILE_SIZE = 15 * 1024 * 1024
const MAX_VIDEO_SIZE = 100 * 1024 * 1024
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

export function PhotoUpload({ category, label, onFilesChange, initialFiles }: PhotoUploadProps) {
  // Seeded synchronously from `initialFiles` so the very first render already
  // holds restored photos. This matters because the notify effect below fires
  // on mount — if previews started empty it would push [] to the parent and
  // clobber the restored draft (and its IndexedDB copy).
  const [previews, setPreviews] = useState<{ file: File; url: string; type: 'image' | 'video' }[]>(() =>
    (initialFiles ?? []).map((file) => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
    })),
  )
  const [error, setError] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<{ url: string; type: 'image' | 'video' } | null>(null)
  const [isMultiShot, setIsMultiShot] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const accumulatorRef = useRef<HTMLInputElement>(null)
  const multiShotRef = useRef(false)
  const cameraTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTouch = useIsTouchDevice()
  const [cameraSupported, setCameraSupported] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [videoCompressing, setVideoCompressing] = useState(false)
  const [compressProgress, setCompressProgress] = useState(0)

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
    async (files: File[] | FileList | null) => {
      setError(null)
      if (!files) return

      const fileArray = Array.from(files as ArrayLike<File>)

      // Separate images and videos
      const images = fileArray.filter(f => f.type.startsWith('image/'))
      const videos = fileArray.filter(f => f.type.startsWith('video/'))

      // Handle videos (if any)
      const compressedVideos: { file: File; url: string; type: 'video' }[] = []
      
      if (videos.length > 0) {
        const currentVideos = previews.filter(p => p.type === 'video').length
        
        if (currentVideos + videos.length > MAX_VIDEOS) {
          setError(`Máximo ${MAX_VIDEOS} videos permitidos (ya tenés ${currentVideos})`)
          return
        }

        // Validate all videos first
        for (const video of videos) {
          const sizeError = validateVideoFile(video)
          if (sizeError) {
            setError(sizeError)
            return
          }
          
          const durationError = await validateVideoDuration(video)
          if (durationError) {
            setError(durationError)
            return
          }
        }

        // Compress videos
        setVideoCompressing(true)
        setCompressProgress(0)

        try {
          for (let i = 0; i < videos.length; i++) {
            const video = videos[i]
            const compressed = await compressVideo(video, (progress) => {
              const overallProgress = ((i + progress / 100) / videos.length) * 100
              setCompressProgress(overallProgress)
            })
            
            compressedVideos.push({
              file: compressed,
              url: URL.createObjectURL(compressed),
              type: 'video',
            })
          }
        } catch (err) {
          setVideoCompressing(false)
          setCompressProgress(0)
          setError(err instanceof Error ? err.message : 'Error al comprimir video')
          return
        } finally {
          setVideoCompressing(false)
          setCompressProgress(0)
        }
      }

      // Handle images (if any)
      const validImages: { file: File; url: string; type: 'image' }[] = []
      
      if (images.length > 0) {
        const currentImages = previews.filter(p => p.type === 'image').length
        
        if (currentImages + images.length > MAX_PHOTOS) {
          setError(`Máximo ${MAX_PHOTOS} fotos permitidas (ya tenés ${currentImages})`)
          return
        }

        for (const file of images) {
          if (file.size > MAX_FILE_SIZE) {
            setError(`La imagen "${file.name}" supera los 15MB`)
            return
          }

          validImages.push({ file, url: URL.createObjectURL(file), type: 'image' })
        }
      }

      // Add both videos and images to previews
      setPreviews((prev) => [...prev, ...compressedVideos, ...validImages])
    },
    [previews],
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

  // Revoke object URLs only on unmount.
  //
  // This previously depended on `previews`, which meant its cleanup closed
  // over the PREVIOUS array and revoked URLs that were still rendered after an
  // add — producing broken thumbnails. Individual removals are already revoked
  // inside removePhoto().
  const previewsRef = useRef(previews)
  previewsRef.current = previews
  useEffect(() => {
    return () => {
      previewsRef.current.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [])

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
        accept="image/*,video/*"
        multiple
        onChange={handleGallerySelect}
        className="hidden"
      />

      {/* Accumulator input — holds ALL files for form submission */}
      <input
        ref={accumulatorRef}
        name="photos"
        type="file"
        accept="image/*,video/*"
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
                📁 Fotos o videos
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
            accept="image/*,video/*"
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
            Máximo {MAX_PHOTOS} fotos (15MB c/u) o {MAX_VIDEOS} videos (100MB, 2 min máximo). Formatos: JPG, PNG, WEBP, MP4, MOV
          </p>
        </>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {videoCompressing && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-3 py-2">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">
            Comprimiendo video... {Math.round(compressProgress)}%
          </p>
          <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${compressProgress}%` }}
            />
          </div>
        </div>
      )}

      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {previews.map((preview, index) => (
            <div key={preview.url} className="relative group">
              {preview.type === 'video' ? (
                <div
                  className="relative w-full h-24 rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity bg-black overflow-hidden"
                  onClick={() => setPreviewImage({ url: preview.url, type: 'video' })}
                >
                  <video
                    src={preview.url}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                      <span className="text-2xl ml-0.5">▶</span>
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={preview.url}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setPreviewImage({ url: preview.url, type: 'image' })}
                />
              )}
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className={
                  isTouch
                    ? 'absolute top-1 right-1 w-7 h-7 rounded-full bg-red-500/80 text-white flex items-center justify-center text-xs'
                    : 'absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs'
                }
                aria-label={`Eliminar ${preview.type === 'video' ? 'video' : 'foto'}`}
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
              {preview.type === 'video' && (
                <span className="absolute top-1 left-1 text-[10px] text-white bg-blue-500/80 px-1.5 py-0.5 rounded">
                  VIDEO
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Media Preview Modal ───────────────────────────────── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            {previewImage.type === 'video' ? (
              <video
                src={previewImage.url}
                controls
                autoPlay
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
              />
            ) : (
              <img
                src={previewImage.url}
                alt="Vista previa"
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
            )}
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
