'use client'

import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { VideoQueuePanel } from './video-queue-panel'
import { useVideoUploadQueueForInspection } from '@/hooks/use-video-upload-queue'

interface CreatedWithVideosViewProps {
  inspectionId: string
  /** "Inspección" | "Inspección UTP" — used in the title. */
  inspectionLabel?: string
  inspectionHref: string
  listHref: string
  onBackToList: () => void
}

/**
 * Shared "Inspección creada" success view shown by both the unified and UTP
 * inspection forms when the user submitted with pending videos. The form
 * page stays mounted to show live queue progress; when all videos are
 * attached, a "Ver inspección" CTA becomes available.
 *
 * Subscribes to the video queue via useSyncExternalStore so the panel
 * re-renders on stage transitions (P1-13 fix).
 */
export function CreatedWithVideosView({
  inspectionId,
  inspectionLabel = 'Inspección',
  inspectionHref,
  listHref,
  onBackToList,
}: CreatedWithVideosViewProps) {
  const queueItems = useVideoUploadQueueForInspection(inspectionId)
  const allAttached =
    queueItems.length > 0 && queueItems.every((i) => i.stage === 'attached')

  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-6">
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <div className="w-14 h-14 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold">{inspectionLabel} creada</h2>
          <p className="text-sm text-muted-foreground">
            La {inspectionLabel.toLowerCase()} fue registrada. Los videos se
            están procesando en segundo plano.
          </p>
        </CardContent>
      </Card>
      <VideoQueuePanel
        inspectionId={inspectionId}
        showGoToInspection={allAttached}
        inspectionHref={inspectionHref}
      />
      <div className="flex gap-3 justify-center">
        <Button onClick={() => (window.location.href = inspectionHref)}>
          Ver {inspectionLabel.toLowerCase()}
        </Button>
        <Button variant="outline" onClick={onBackToList}>
          Volver al listado
        </Button>
      </div>
      {/* listHref is provided for future a11y / deep-link use; currently the
          back-to-list CTA uses the onBackToList callback which handles draft
          cleanup in the caller. */}
      <span className="sr-only" data-list-href={listHref} />
    </div>
  )
}
