'use client'

import { useState } from 'react'
import { FileText, Camera } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DeleteAttachmentButton } from '@/components/inspections/delete-attachment-button'

interface AttachmentTileProps {
  id: string
  fileName: string
  fileType: string
  category: string
  url?: string | null
  /** When true, renders the tile with pointer cursor and hover effect. */
  clickable?: boolean
}

/**
 * Single attachment tile for inspection detail pages.
 *
 * Dispatches rendering by file type:
 *   - image/* → <img>
 *   - video/* → <video controls preload="metadata">
 *   - other → generic file icon
 *
 * Used by both inspections/[id] and utp/[id] to keep the app/ folder
 * structure-only (architecture skill: "No logic in app/").
 */
export function AttachmentTile({
  id,
  fileName,
  fileType,
  category,
  url,
  clickable = true,
}: AttachmentTileProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const isLink = Boolean(url)
  const isVideo = fileType.startsWith('video/')
  const isImage = fileType.startsWith('image/')

  let content: React.ReactNode
  if (isVideo && url) {
    content = (
      <video
        src={url}
        controls
        preload="metadata"
        className="w-full h-full object-cover bg-black"
      />
    )
  } else if (isImage && url) {
    content = (
      <>
        {!imageLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse" aria-hidden="true" />
        )}
        <img
          src={url}
          alt={fileName}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </>
    )
  } else {
    content = (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
        {isVideo ? (
          <Camera className="w-8 h-8 text-muted-foreground mb-2" />
        ) : (
          <FileText className="w-8 h-8 text-muted-foreground mb-2" />
        )}
        <span className="text-xs text-center px-2 truncate w-full">
          {fileName}
        </span>
        {!url && (
          <span className="text-[10px] text-muted-foreground mt-1">
            No disponible
          </span>
        )}
      </div>
    )
  }

  const baseClassName =
    'group block relative aspect-square rounded-xl overflow-hidden border border-border shadow-sm ' +
    (isLink && clickable
      ? 'hover:ring-2 hover:ring-primary transition-all cursor-pointer'
      : 'opacity-60')

  const badge = (
    <div className="absolute top-2 left-2">
      <Badge variant="secondary" className="text-[10px] uppercase shadow-sm">
        {category}
      </Badge>
    </div>
  )

  // Videos render inline (no link-out — browsers handle play controls).
  if (isVideo && url) {
    return (
      <div key={id} className={baseClassName}>
        {content}
        {badge}
        <DeleteAttachmentButton attachmentId={id} />
      </div>
    )
  }

  if (isLink && clickable) {
    return (
      <a
        key={id}
        href={url!}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClassName}
      >
        {content}
        {badge}
        <DeleteAttachmentButton attachmentId={id} />
      </a>
    )
  }

  return (
    <div key={id} className={baseClassName}>
      {content}
      {badge}
      <DeleteAttachmentButton attachmentId={id} />
    </div>
  )
}
