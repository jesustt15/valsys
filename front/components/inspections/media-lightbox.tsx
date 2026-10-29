'use client'

import { useCallback, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export interface LightboxItem {
  id: string
  url: string
  fileType: string
  fileName: string
}

interface MediaLightboxProps {
  items: LightboxItem[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

const SWIPE_THRESHOLD_PX = 50

/**
 * Full-screen media viewer with swipe navigation.
 *
 * Navigation channels:
 *   - touch swipe left/right (mobile)
 *   - on-screen prev/next buttons
 *   - keyboard ArrowLeft / ArrowRight / Escape (desktop)
 *
 * Backdrop click closes; clicks on the media itself do not.
 */
export function MediaLightbox({ items, index, onIndexChange, onClose }: MediaLightboxProps) {
  const touchStartX = useRef<number | null>(null)
  const item = items[index]

  const goPrev = useCallback(() => {
    onIndexChange(Math.max(0, index - 1))
  }, [index, onIndexChange])

  const goNext = useCallback(() => {
    onIndexChange(Math.min(items.length - 1, index + 1))
  }, [index, items.length, onIndexChange])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext, onClose])

  // Lock background scroll while the lightbox is open
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  if (!item) return null

  const isVideo = item.fileType.startsWith('video/')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${index + 1} de ${items.length}`}
      onClick={onClose}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return
        const delta = e.changedTouches[0].clientX - touchStartX.current
        touchStartX.current = null
        if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return
        if (delta < 0) goNext()
        else goPrev()
      }}
    >
      {/* Media content — clicks here must not close the lightbox */}
      <div
        className="relative max-w-[95vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            src={item.url}
            controls
            autoPlay
            className="max-w-[95vw] max-h-[85vh] rounded-lg shadow-2xl"
          />
        ) : (
          <img
            src={item.url}
            alt={item.fileName}
            className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
        )}
      </div>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
        {index + 1} / {items.length}
      </div>

      {/* Close */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
        aria-label="Cerrar vista"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Prev */}
      {index > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            goPrev()
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next */}
      {index < items.length - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            goNext()
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}
