'use client'

import { useState, useEffect } from 'react'

interface PhotoUploadProps {
  category: 'initial' | 'removal' | 'post_mount'
  label: string
}

const MAX_PHOTOS = 10
const MAX_FILE_SIZE = 5 * 1024 * 1024

export function PhotoUpload({ category, label }: PhotoUploadProps) {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[PhotoUpload] input changed')
    setError(null)

    const files = e.target.files
    if (!files) return

    const fileArray = Array.from(files)

    if (fileArray.length > MAX_PHOTOS) {
      setError(`Máximo ${MAX_PHOTOS} fotos permitidas`)
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

    setPreviews(valid)
  }

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [previews])

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">{label}</label>

      <input
        name="photos"
        type="file"
        accept="image/*"
        multiple
        onChange={handleInputChange}
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

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {previews.map((preview, index) => (
            <div key={preview.url} className="relative">
              <img
                src={preview.url}
                alt={`Foto ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-border"
              />
            </div>
          ))}
        </div>
      )}

      <input type="hidden" name="category" value={category} />
    </div>
  )
}
