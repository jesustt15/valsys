'use client'

import { useState, useEffect, useRef } from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'

interface PhotoUploadProps {
  category: 'initial' | 'removal' | 'post_mount'
  label: string
}

const MAX_PHOTOS = 10
const MAX_FILE_SIZE = 5 * 1024 * 1024

export function PhotoUpload({ category, label }: PhotoUploadProps) {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const isTouch = useMediaQuery('(pointer: coarse)')

  const addFiles = (files: FileList | null, source: 'camera' | 'gallery') => {
    setError(null)
    if (!files) return

    const fileArray = Array.from(files)

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
        setError(`La imagen "${file.name}" supera los 5MB`)
        return
      }

      valid.push({ file, url: URL.createObjectURL(file) })
    }

    setPreviews((prev) => [...prev, ...valid])
  }

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files, 'camera')
    // Reset so the same file can be picked again
    if (cameraRef.current) cameraRef.current.value = ''
  }

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files, 'gallery')
    if (galleryRef.current) galleryRef.current.value = ''
  }

  const removePhoto = (index: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url)
      return prev.filter((_, i) => i !== index)
    })
  }

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [previews])

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">{label}</label>

      {isTouch ? (
        /* ── Mobile: two buttons (camera + gallery) ────────────────── */
        <div className="flex flex-wrap gap-2">
          {/* Camera button — single shot */}
          <input
            ref={cameraRef}
            name="photos"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            📷 Tomar foto
          </button>

          {/* Gallery button — multi-select */}
          <input
            ref={galleryRef}
            name="photos"
            type="file"
            accept="image/*"
            multiple
            onChange={handleGallerySelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            📁 Elegir varias
          </button>

          <p className="w-full text-xs text-muted-foreground">
            La cámara toma una foto por vez. Usá &quot;Elegir varias&quot; para seleccionar varias de la galería.
          </p>
        </div>
      ) : (
        /* ── Desktop: single file input with multi-select ────────── */
        <>
          <input
            name="photos"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => addFiles(e.target.files, 'gallery')}
            className="block w-full text-sm text-muted-foreground
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-lg file:border-0
                       file:text-sm file:font-semibold
                       file:bg-green-50 file:text-green-700
                       hover:file:bg-green-100
                       cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            Máximo {MAX_PHOTOS} fotos, 5MB cada una. Formatos: JPG, PNG, WEBP
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
                className="w-full h-24 object-cover rounded-lg border border-border"
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

      <input type="hidden" name="category" value={category} />
    </div>
  )
}
