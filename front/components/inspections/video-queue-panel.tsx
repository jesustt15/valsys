'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { CheckCircle, AlertCircle, Loader2, Upload, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  queue,
  getPersistedQueue,
  type QueueItem,
  type PersistedItem,
  type QueueStage,
} from '@/lib/video-upload-queue'

interface VideoQueuePanelProps {
  inspectionId: string
  /** When true, show the "Ver inspección" button at the bottom. */
  showGoToInspection?: boolean
  inspectionHref?: string
}

const stageLabel: Record<QueueStage, string> = {
  queued: 'En cola',
  compressing: 'Comprimiendo',
  uploading: 'Subiendo',
  attached: 'Adjuntado',
  error: 'Error',
}

function stageIcon(stage: QueueStage) {
  switch (stage) {
    case 'queued':
      return <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
    case 'compressing':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
    case 'uploading':
      return <Upload className="w-4 h-4 text-indigo-500 animate-pulse" />
    case 'attached':
      return <CheckCircle className="w-4 h-4 text-green-600" />
    case 'error':
      return <AlertCircle className="w-4 h-4 text-destructive" />
  }
}

/**
 * Renders queue progress for videos attached to a given inspection.
 *
 * Subscribes to the queue via `queue.subscribe()` (no polling). Persisted-only
 * items are read from localStorage AFTER mount to avoid hydration mismatch
 * (P1-6 fix — matches the anti-pattern documented in utp-inspection-form).
 */
export function VideoQueuePanel({
  inspectionId,
  showGoToInspection,
  inspectionHref,
}: VideoQueuePanelProps) {
  // Live items from the in-memory queue. Init empty; populate via subscribe.
  const [items, setItems] = useState<QueueItem[]>([])
  // Persisted-only items (survived navigation). Init empty; populated post-mount.
  const [persistedItems, setPersistedItems] = useState<PersistedItem[]>([])
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  // Subscribe to live queue changes — the queue's getSnapshot() returns a
  // cached array so this doesn't over-render (P1-13 fix).
  useEffect(() => {
    setItems(queue.getItemsFor(inspectionId))
    const unsub = queue.subscribe(() => {
      setItems(queue.getItemsFor(inspectionId))
    })
    return unsub
  }, [inspectionId])

  // Hydrate persisted list AFTER mount (avoids SSR hydration mismatch).
  // Stop polling once the queue has no pending items for this inspection.
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    const refresh = () => {
      const next = getPersistedQueue(inspectionId)
      setPersistedItems((prev) => {
        // Content-compare to avoid setState churn.
        if (prev.length === next.length && prev.every((p, i) => p.id === next[i].id && p.stage === next[i].stage)) {
          return prev
        }
        return next
      })
      // Stop polling if nothing is pending in persisted state.
      const pending = next.some((p) => p.stage !== 'attached' && p.stage !== 'error')
      if (!pending && intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    refresh()
    intervalId = setInterval(refresh, 2000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [inspectionId])

  // Merge live items over persisted ones (live wins when available).
  const merged: Array<QueueItem & { needsReselect?: boolean; isLive: boolean }> = []
  const seenIds = new Set<string>()

  for (const item of items) {
    merged.push({ ...item, isLive: true })
    seenIds.add(item.id)
  }
  for (const p of persistedItems) {
    if (seenIds.has(p.id)) continue
    merged.push({
      ...p,
      inspectionId: p.inspectionId,
      progress: p.stage === 'attached' ? 100 : 0,
      elapsedSeconds: undefined,
      needsReselect: p.stage !== 'attached',
      isLive: false,
    })
  }

  // Retry a LIVE error item (queue still has the File bytes).
  const handleRetry = useCallback(
    async (id: string) => {
      const file = queue.getFileFor(id)
      if (!file) return
      await queue.retry(id, file)
    },
    [],
  )

  // Revive a PERSISTED-ONLY item (file bytes are gone — caller re-selected).
  const handleFilePicked = useCallback(
    (id: string, file: File | null, meta: PersistedItem) => {
      if (!file) return
      queue.revive(meta.inspectionId, meta, file)
    },
    [],
  )

  const handleReselect = useCallback((id: string) => {
    const input = fileInputRefs.current.get(id)
    if (input) input.click()
  }, [])

  // Dismiss: delegate entirely to the queue (P0-4 fix — queue owns persistence).
  const handleDismiss = useCallback((id: string) => {
    queue.remove(id)
  }, [])

  if (merged.length === 0) {
    return null
  }

  const hasErrors = merged.some((i) => i.stage === 'error')
  const allAttached = merged.every((i) => i.stage === 'attached')

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Upload className="w-4 h-4 text-indigo-500" />
          Videos de la inspección
        </h4>
        {allAttached && (
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
            Todos los videos fueron adjuntados
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {merged.map((item) => {
          const persistedMeta = persistedItems.find((p) => p.id === item.id)
          return (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2"
            >
              <div className="shrink-0 pt-0.5">{stageIcon(item.stage)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium truncate">
                    {item.fileName}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {(item.fileSize / 1024 / 1024).toFixed(1)}MB
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {stageLabel[item.stage]}
                  {item.stage === 'compressing' && ` — ${item.progress}%`}
                  {item.stage === 'uploading' &&
                    item.elapsedSeconds !== undefined &&
                    ` — ${item.elapsedSeconds}s`}
                  {item.error && ` — ${item.error}`}
                </div>
                {item.stage === 'compressing' && (
                  <div className="mt-1.5 w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.max(item.progress, 2)}%` }}
                    />
                  </div>
                )}
                {/* Persisted-only item (file gone): user must re-select. */}
                {item.needsReselect && !item.isLive && persistedMeta && (
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleReselect(item.id)}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Selecciónelo de nuevo
                    </Button>
                    <input
                      ref={(el) => {
                        if (el) fileInputRefs.current.set(item.id, el)
                      }}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null
                        handleFilePicked(item.id, file, persistedMeta)
                        e.target.value = ''
                      }}
                    />
                  </div>
                )}
                {/* Live error item with File bytes available → offer retry.
                    If getFileFor(id) is null (queue dropped the bytes), show
                    the same re-select control as for persisted-only items,
                    wired to queue.revive() with the live item's metadata. */}
                {item.stage === 'error' && item.isLive && queue.getFileFor(item.id) && (
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleRetry(item.id)}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Reintentar
                    </Button>
                  </div>
                )}
                {item.stage === 'error' && item.isLive && !queue.getFileFor(item.id) && (
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleReselect(item.id)}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Selecciónelo de nuevo
                    </Button>
                    <input
                      ref={(el) => {
                        if (el) fileInputRefs.current.set(item.id, el)
                      }}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null
                        if (file) {
                          // Revive with the live item's metadata (category,
                          // inspectionId) so the queue keeps its place.
                          queue.revive(
                            item.inspectionId,
                            {
                              id: item.id,
                              inspectionId: item.inspectionId,
                              fileName: item.fileName,
                              fileSize: item.fileSize,
                              category: item.category,
                              stage: item.stage,
                              error: item.error,
                              startedAt: item.startedAt,
                            },
                            file,
                          )
                        }
                        e.target.value = ''
                      }}
                    />
                  </div>
                )}
              </div>
              {item.stage === 'error' && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDismiss(item.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  title="Descartar"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {hasErrors && (
        <p className="text-xs text-muted-foreground">
          Los videos con error pueden reintentarse o descartarse.
        </p>
      )}

      {showGoToInspection && inspectionHref && (
        <div className="pt-2 flex justify-end">
          <a
            href={inspectionHref}
            className="inline-flex items-center justify-center rounded-lg font-medium border border-border bg-background hover:bg-secondary shadow-sm h-9 px-3.5 text-xs"
          >
            Ver inspección
          </a>
        </div>
      )}
    </div>
  )
}
