'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PhotoCamera } from './photo-camera'
import { validateVideoDuration, validateVideoFile } from '@/lib/video-compressor'

interface PhotoUploadProps {
  category: 'initial' | 'removal' | 'post_mount'
  label: string
  /** Called with only IMAGE files. These are the ones that travel in FormData. */
  onFilesChange?: (files: File[]) => void
  /**
   * CONTRACT — always emits the FULL current list of video Files in the
   * component (existing previews + new batch, after any removal). The parent
   * form should REPLACE its video state with this list (not append).
   *
   * Rationale: the component is the single source of truth for "which videos
   * are currently selected"; the parent does not track video identity itself.
   * Callers that appended the delta would silently drop previously-selected
   * videos (MAX_VIDEOS=2 → pick A then B → A lost if caller appended).
   *
   * Files are validated (duration ≤2min, size ≤100MB) but NOT compressed —
   * compression is deferred to the background video queue.
   */
  onVideosSelected?: (files: File[]) => void
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

export function PhotoUpload({ category, label, onFilesChange, onVideosSelected, initialFiles }: PhotoUploadProps) {
  // Seeded synchronously from `initialFiles` so the very first render already
  // holds restored photos. This matters because the notify effect below fires
  // on mount — if previews started empty it would push [] to the parent and
  // clobber the restored draft (and its IndexedDB copy).
  //
  // NOTE: initialFiles only restores IMAGES. Videos travel via a separate
  // callback (onVideosSelected) and are not persisted across navigation —
  // the queue holds them in memory and surfaces pending state on the detail
  // page via localStorage metadata.
  const [previews, setPreviews] = useState<{ file: File; url: string; type: 'image' | 'video' }[]>(() =>
    (initialFiles ?? [])
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        file,
        url: URL.createObjectURL(file),
        type: 'image' as const,
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
  const [videoValidating, setVideoValidating] = useState(false)

  // Feature detection: can we use getUserMedia for in-app camera?
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection needs client-side value after hydration
    setCameraSupported(
      typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
    )
  }, [])

  // syncAccumulator only puts IMAGE files into the hidden input that feeds
  // the form's FormData. Videos travel through a separate callback.
  const syncAccumulator = useCallback(() => {
    if (!accumulatorRef.current) return
    try {
      const dt = new DataTransfer()
      previews
        .filter((p) => p.type === 'image')
        .forEach((p) => dt.items.add(p.file))
      accumulatorRef.current.files = dt.files
    } catch {
      // DataTransfer not supported — fallback: files won't be in accumulator
      // This affects iOS Safari; photos will only be in previews state
    }
  }, [previews])

  // Emit only images via onFilesChange (the legacy photos channel).
  // Videos are emitted separately via onVideosSelected.
  useEffect(() => {
    syncAccumulator()
    const images = previews.filter((p) => p.type === 'image').map((p) => p.file)
    onFilesChange?.(images)
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
      const images = fileArray.filter((f) => f.type.startsWith('image/'))
      const rawVideos = fileArray.filter((f) => f.type.startsWith('video/'))

      // ── Videos: validate only, DO NOT compress ──
      // Compression is deferred to the background queue (see
      // use-video-upload-queue / video-upload-queue).
      //
      // Read the CURRENT previews (not the closure-captured state) so that
      // videos removed during the validation window don't get resurrected
      // via the onVideosSelected emit. previewsRef is synced with state on
      // every render.
      let videosToProcess = rawVideos
      if (rawVideos.length > 0) {
        // Read current video count from the ref — not the stale `previews`.
        const currentVideos = previewsRef.current.filter((p) => p.type === 'video').length
        const slotsAvailable = MAX_VIDEOS - currentVideos
        if (slotsAvailable <= 0) {
          setError(`Máximo ${MAX_VIDEOS} videos permitidos (ya tenés ${currentVideos})`)
          videosToProcess = []
        } else if (rawVideos.length > slotsAvailable) {
          // Reject only the EXCESS videos, keep the rest + process photos.
          setError(`Máximo ${MAX_VIDEOS} videos permitidos (ya tenés ${currentVideos}). Se tomaron solo ${slotsAvailable}.`)
          videosToProcess = rawVideos.slice(0, slotsAvailable)
        }
      }

      if (videosToProcess.length > 0) {
        setVideoValidating(true)
        try {
          // Validate all videos first (duration + size).
          const validated: File[] = []
          for (const video of videosToProcess) {
            const sizeError = validateVideoFile(video)
            if (sizeError) {
              setError(sizeError)
              break
            }
            const durationError = await validateVideoDuration(video)
            if (durationError) {
              setError(durationError)
              break
            }
            validated.push(video)
          }

          if (validated.length > 0) {
            // Add videos to previews (raw File — queue handles compression).
            const videoPreviews = validated.map((file) => ({
              file,
              url: URL.createObjectURL(file),
              type: 'video' as const,
            }))

            // Compute the NEXT previews value outside the updater so we can
            // emit from it without creating a side effect in the updater
            // (StrictMode could double-invoke the updater and double-fire
            // onVideosSelected). previewsRef is synced with state on every
            // render, so this is race-safe.
            const nextPreviews = [...previewsRef.current, ...videoPreviews]
            setPreviews(nextPreviews)

            // Emit the FULL video list AFTER the state update — see
            // onVideosSelected contract. Parent must REPLACE state.
            const nextVideos = nextPreviews
              .filter((p) => p.type === 'video')
              .map((p) => p.file)
            onVideosSelected?.(nextVideos)
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error al validar video')
        } finally {
          setVideoValidating(false)
        }
      }

      // ── Images ──
      if (images.length > 0) {
        // Read current image count from the ref — not the stale `previews`.
        const currentImages = previewsRef.current.filter((p) => p.type === 'image').length

        if (currentImages + images.length > MAX_PHOTOS) {
          setError(`Máximo ${MAX_PHOTOS} fotos permitidas (ya tenés ${currentImages})`)
          return
        }

        const validImages: { file: File; url: string; type: 'image' }[] = []
        for (const file of images) {
          if (file.size > MAX_FILE_SIZE) {
            setError(`La imagen "${file.name}" supera los 15MB`)
            return
          }
          validImages.push({ file, url: URL.createObjectURL(file), type: 'image' })
        }

        setPreviews((prev) => [...prev, ...validImages])
      }
    },
    [onVideosSelected],
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

  const removePhoto = useCallback(
    (index: number) => {
      // Compute the remaining videos BEFORE calling setPreviews so the
      // onVideosSelected emit isn't inside the updater (StrictMode could
      // invoke the updater twice and double-fire the callback).
      const removed = previews[index]
      if (!removed) return
      URL.revokeObjectURL(removed.url)
      const next = previews.filter((_, i) => i !== index)
      setPreviews(next)
      if (removed.type === 'video') {
        // Emit the FULL remaining video list — parent must REPLACE state.
        // See onVideosSelected contract in PhotoUploadProps.
        const remainingVideos = next
          .filter((p) => p.type === 'video')
          .map((p) => p.file)
        onVideosSelected?.(remainingVideos)
      }
    },
    [previews, onVideosSelected],
  )

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

  const imageCount = previews.filter((p) => p.type === 'image').length
  const videoCount = previews.filter((p) => p.type === 'video').length

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

      {/* Accumulator input — holds ONLY IMAGES for form submission.
          Videos travel through a dedicated background queue. */}
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
                  {imageCount} / {MAX_PHOTOS}
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
                disabled={imageCount >= MAX_PHOTOS}
                className="inline-flex items-center gap-2 rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                📷 Tomar fotos
              </button>

              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                disabled={imageCount >= MAX_PHOTOS && videoCount >= MAX_VIDEOS}
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

      {videoValidating && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-3 py-2">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            Validando video...
          </p>
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
          maxPhotos={MAX_PHOTOS - imageCount}
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
