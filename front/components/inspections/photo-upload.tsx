'use client'

import { useRef, useState, useCallback } from 'react'

interface PhotoUploadProps {
  category: 'initial' | 'removal' | 'post_mount'
  label: string
  onFilesChange: (files: File[]) => void
}

const MAX_PHOTOS = 10
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function PhotoUpload({ category, label, onFilesChange }: PhotoUploadProps) {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setError(null)

      const fileArray = Array.from(newFiles)

      // Validate count
      if (previews.length + fileArray.length > MAX_PHOTOS) {
        setError(`Máximo ${MAX_PHOTOS} fotos permitidas`)
        return
      }

      // Validate each file
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
        const url = URL.createObjectURL(file)
        valid.push({ file, url })
      }

      const updated = [...previews, ...valid]
      setPreviews(updated)
      onFilesChange(updated.map((p) => p.file))
    },
    [previews, onFilesChange],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
      // Reset input so same file can be re-selected
      e.target.value = ''
    }
  }

  const removePhoto = (index: number) => {
    const removed = previews[index]
    URL.revokeObjectURL(removed.url)
    const updated = previews.filter((_, i) => i !== index)
    setPreviews(updated)
    onFilesChange(updated.map((p) => p.file))
  }

  // Expose files via ref for parent form to collect
  const getFiles = useCallback(() => previews.map((p) => p.file), [previews])

  // Attach getFiles to a ref that parent can access
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) {
        ;(el as any).getFiles = getFiles
      }
    },
    [getFiles],
  )

  return (
    <div ref={handleRef} className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {/* File input */}
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          name="photos"
          type="file"
          accept="image/*"
          multiple
          onChange={handleInputChange}
          className="block w-full text-sm text-gray-500
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-lg file:border-0
                     file:text-sm file:font-semibold
                     file:bg-blue-50 file:text-blue-700
                     hover:file:bg-blue-100
                     cursor-pointer"
        />
      </div>
      <p className="text-xs text-gray-400">
        Máximo {MAX_PHOTOS} fotos, 5MB cada una. Formatos: JPG, PNG, WEBP
      </p>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {previews.map((preview, index) => (
            <div key={preview.url} className="relative group">
              <img
                src={preview.url}
                alt={`Foto ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full
                           flex items-center justify-center text-xs font-bold
                           opacity-0 group-hover:opacity-100 transition-opacity
                           hover:bg-red-600 focus:opacity-100"
                aria-label={`Eliminar foto ${index + 1}`}
              >
                ×
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5 rounded-b-lg">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden input for form submission */}
      <input type="hidden" name="category" value={category} />
    </div>
  )
}
