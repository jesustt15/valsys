'use client'

import { useState } from 'react'
import { AttachmentTile } from './attachment-tile'
import { LazyImage } from './lazy-image'
import { MediaLightbox, type LightboxItem } from './media-lightbox'

export interface GalleryAttachment {
  id: string
  fileName: string
  fileType: string
  category: string
  url?: string | null
}

interface AttachmentGalleryProps {
  attachments: GalleryAttachment[]
  /**
   * Mobile layout:
   *  - 'scroll': horizontal swipe-scroll gallery (inspections detail)
   *  - 'grid': 2-column grid (utp detail)
   */
  mobileLayout?: 'scroll' | 'grid'
}

/**
 * Attachment gallery for inspection detail pages.
 *
 * Owns the lightbox state: tapping an uploaded image opens the
 * MediaLightbox so the whole set can be browsed by swiping (mobile),
 * buttons or arrow keys (desktop). Videos keep inline playback and
 * non-media files keep their link-out behavior.
 */
export function AttachmentGallery({ attachments, mobileLayout = 'scroll' }: AttachmentGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const lightboxItems: LightboxItem[] = attachments
    .filter((a) => a.fileType.startsWith('image/') && Boolean(a.url))
    .map((a) => ({
      id: a.id,
      url: a.url as string,
      fileType: a.fileType,
      fileName: a.fileName,
    }))

  const isViewableImage = (a: GalleryAttachment) =>
    a.fileType.startsWith('image/') && Boolean(a.url)

  const openLightbox = (id: string) => {
    const idx = lightboxItems.findIndex((item) => item.id === id)
    if (idx >= 0) setLightboxIndex(idx)
  }

  return (
    <>
      {/* Mobile */}
      {mobileLayout === 'scroll' ? (
        <div className="md:hidden flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
          {attachments.map((att) => (
            <div key={att.id} className="shrink-0 w-[80vw] max-w-[300px] snap-start">
              {isViewableImage(att) ? (
                <button
                  type="button"
                  onClick={() => openLightbox(att.id)}
                  className="block w-full aspect-square rounded-xl overflow-hidden border border-border shadow-sm min-h-[200px] p-0"
                  aria-label={`Ver ${att.fileName || att.category}`}
                >
                  <LazyImage
                    src={att.url!}
                    alt={att.fileName || att.category}
                    className="w-full h-full"
                  />
                </button>
              ) : (
                <AttachmentTile
                  id={att.id}
                  fileName={att.fileName}
                  fileType={att.fileType}
                  category={att.category}
                  url={att.url}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="md:hidden grid grid-cols-2 gap-3">
          {attachments.map((att) => (
            <AttachmentTile
              key={att.id}
              id={att.id}
              fileName={att.fileName}
              fileType={att.fileType}
              category={att.category}
              url={att.url}
              onOpen={isViewableImage(att) ? () => openLightbox(att.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* Desktop */}
      <div className="hidden md:grid grid-cols-2 gap-3">
        {attachments.map((att) => (
          <AttachmentTile
            key={att.id}
            id={att.id}
            fileName={att.fileName}
            fileType={att.fileType}
            category={att.category}
            url={att.url}
            onOpen={isViewableImage(att) ? () => openLightbox(att.id) : undefined}
          />
        ))}
      </div>

      {lightboxIndex !== null && lightboxItems[lightboxIndex] && (
        <MediaLightbox
          items={lightboxItems}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
