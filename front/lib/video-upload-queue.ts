// Background video upload queue.
//
// Runs client-side after the inspection is created. The form page hands each
// selected video File to the queue; the queue compresses (if needed) and
// uploads via the dedicated `uploadInspectionVideoAction` server action.
//
// State model per item:
//   queued → compressing → uploading → attached
//                              ↘ error (retryable)
//
// Raw bytes live ONLY in memory. Metadata (stage, fileName, fileSize, error)
// is persisted to localStorage so the inspection detail page can show a
// "video pendiente" state with a re-upload control after navigation.
//
// Safety:
//   - `remove(id)` scopes to that single item — never wipes other inspections'
//     persisted metadata (P0-4 fix).
//   - `revive(inspectionId, persistedMeta, file)` re-inserts a previously-
//     persisted item that lost its in-memory reference after reload.
//   - `retry(id, file)` is guarded against items currently in
//     compressing/uploading — no-ops in those stages.
//   - Inactivity watchdog: if no progress event fires for VIDEO_POLICY.
//     inactivityTimeoutMs while compressing, the FFmpeg worker is terminated
//     and the item is marked error.
//   - Persist writes are throttled (>=2s between writes for the same item OR
//     >=5% progress delta).
//   - On queue init, persisted items older than 24h that aren't terminal are
//     swept into stage 'error' with "Sesión interrumpida" message.

import { compressVideo, resetFFmpeg, type CompressResult } from './video-compressor'
import { uploadInspectionVideoAction } from './actions/inspection'
import { logClientVideoErrorAction } from './actions/video-error-log'
import { VIDEO_POLICY } from './video-policy'

export type QueueStage =
  | 'queued'
  | 'compressing'
  | 'uploading'
  | 'attached'
  | 'error'

export interface QueueItem {
  id: string
  inspectionId: string
  fileName: string
  fileSize: number
  category: string
  stage: QueueStage
  /** 0-100 while compressing, -1 while uploading (indeterminate). */
  progress: number
  error: string | null
  startedAt: number
  attachmentId?: string
  /** Elapsed seconds while uploading (server actions don't give byte progress). */
  elapsedSeconds?: number
}

export type QueueListener = () => void

const STORAGE_KEY = 'valsys:video-queue'
const PERSIST_THROTTLE_MS = 2_000
const PERSIST_PROGRESS_DELTA = 0.05
const SWEEP_AGE_MS = 24 * 60 * 60 * 1000
/** Prune attached items older than this from persisted store (kills "Adjuntado" ghosts). */
const PRUNE_ATTACHED_AGE_MS = 7 * 24 * 60 * 60 * 1000

interface PersistedItem {
  id: string
  inspectionId: string
  fileName: string
  fileSize: number
  category: string
  stage: QueueStage
  error: string | null
  startedAt: number
  attachmentId?: string
}

interface PersistedState {
  [inspectionId: string]: PersistedItem[]
}

function readPersisted(): PersistedState {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as PersistedState
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writePersisted(state: PersistedState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked — best effort.
  }
}

// ─── Queue singleton ────────────────────────────────────────────

class VideoUploadQueue {
  private items: QueueItem[] = []
  private fileRefs: Map<string, File> = new Map()
  private listeners: Set<QueueListener> = new Set()
  private running = false
  private idCounter = 0

  // Cached snapshot array — identity is replaced ONLY on mutation so
  // useSyncExternalStore subscribers don't re-render on every getSnapshot().
  private snapshot: QueueItem[] = []
  private snapshotDirty = true

  // Per-inspection cached slices — identity is replaced ONLY when the
  // underlying snapshot changes. Prevents useSyncExternalStore infinite loops
  // from filter() producing a fresh array on every call (P1-13 fix).
  private inspectionSlices: Map<string, QueueItem[]> = new Map()

  // Per-item persist throttling.
  private lastPersistAt: Map<string, number> = new Map()
  private lastPersistProgress: Map<string, number> = new Map()

  constructor() {
    this.sweep()
  }

  private markDirty() {
    this.snapshotDirty = true
    // Per-inspection slices derive from the snapshot — invalidate them too.
    this.inspectionSlices.clear()
  }

  private getSnapshot(): QueueItem[] {
    if (this.snapshotDirty) {
      this.snapshot = this.items.slice()
      this.snapshotDirty = false
    }
    return this.snapshot
  }

  /**
   * Returns a cached slice for a given inspection. Identity is stable until
   * the underlying snapshot changes (P1-13 fix — safe to use inside
   * useSyncExternalStore getSnapshot without infinite render loops).
   */
  private getInspectionSlice(inspectionId: string): QueueItem[] {
    const cached = this.inspectionSlices.get(inspectionId)
    if (cached) return cached
    const slice = this.getSnapshot().filter((i) => i.inspectionId === inspectionId)
    this.inspectionSlices.set(inspectionId, slice)
    return slice
  }

  /**
   * On init:
   *   - Sweep non-terminal persisted items older than 24h → stage 'error'
   *     with "Sesión interrumpida" (prevents stale queues lingering).
   *   - Prune terminal ('attached') items older than 7 days (kills "Adjuntado"
   *     ghosts and bounds localStorage growth).
   */
  private sweep() {
    const all = readPersisted()
    const now = Date.now()
    let changed = false
    for (const key of Object.keys(all)) {
      const list = all[key]
      const next: PersistedItem[] = []
      for (const item of list) {
        const age = now - item.startedAt
        if (item.stage === 'attached' && age > PRUNE_ATTACHED_AGE_MS) {
          // Terminal + old → drop.
          changed = true
          continue
        }
        if (age > SWEEP_AGE_MS && item.stage !== 'attached' && item.stage !== 'error') {
          item.stage = 'error'
          item.error = 'Sesión interrumpida — vuelva a seleccionar el video'
          changed = true
        }
        next.push(item)
      }
      if (next.length === 0) {
        delete all[key]
      } else {
        all[key] = next
      }
    }
    if (changed) writePersisted(all)
  }

  enqueue(inspectionId: string, category: string, file: File): string {
    const id = `vq-${Date.now()}-${++this.idCounter}`
    const item: QueueItem = {
      id,
      inspectionId,
      fileName: file.name,
      fileSize: file.size,
      category,
      stage: 'queued',
      progress: 0,
      error: null,
      startedAt: Date.now(),
    }
    this.items.push(item)
    this.fileRefs.set(id, file)
    this.persistItem(item, { force: true })
    this.markDirty()
    this.notify()
    if (!this.running) {
      this.run()
    }
    return id
  }

  getItems(): QueueItem[] {
    return this.getSnapshot()
  }

  getItemsFor(inspectionId: string): QueueItem[] {
    return this.getInspectionSlice(inspectionId)
  }

  hasPendingFor(inspectionId: string): boolean {
    return this.items.some(
      (i) => i.inspectionId === inspectionId && i.stage !== 'attached',
    )
  }

  /**
   * Retrieve the in-memory File for a live item. Returns null for persisted-
   * only items (bytes are gone after reload).
   */
  getFileFor(id: string): File | null {
    return this.fileRefs.get(id) ?? null
  }

  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Re-insert a persisted-only item into the in-memory queue with a fresh
   * File. Used by the detail page when the user re-selects a video for a
   * queue entry that survived across navigations.
   */
  revive(inspectionId: string, meta: PersistedItem, file: File): void {
    // If already in memory, delegate to retry (which guards busy stages).
    const existing = this.items.find((i) => i.id === meta.id)
    if (existing) {
      this.retry(meta.id, file)
      return
    }
    const item: QueueItem = {
      id: meta.id,
      inspectionId,
      fileName: file.name,
      fileSize: file.size,
      category: meta.category,
      stage: 'queued',
      progress: 0,
      error: null,
      startedAt: Date.now(),
    }
    this.items.push(item)
    this.fileRefs.set(meta.id, file)
    this.persistItem(item, { force: true })
    this.markDirty()
    this.notify()
    if (!this.running) {
      this.run()
    }
  }

  /**
   * Retry a live item from error. No-op if the item is currently in
   * compressing/uploading — those stages already own the pipeline.
   */
  async retry(id: string, file: File): Promise<void> {
    const item = this.items.find((i) => i.id === id)
    if (!item) return
    if (item.stage === 'compressing' || item.stage === 'uploading') {
      // Already being processed — retry is redundant.
      return
    }
    item.stage = 'queued'
    item.progress = 0
    item.error = null
    item.startedAt = Date.now()
    this.fileRefs.set(id, file)
    this.persistItem(item, { force: true })
    this.markDirty()
    this.notify()
    if (!this.running) {
      this.run()
    }
  }

  /**
   * Remove a single item. Scoped to the specific item id — does NOT wipe
   * persisted metadata for other inspections (P0-4 fix).
   *
   * Handles BOTH cases:
   *   - Live item (in memory): drops from items + fileRefs + persisted.
   *   - Persisted-only item (survived navigation, no File bytes): still
   *     purges the persisted row by scanning for the id (fixes the "X
   *     button never clears a persisted-only error" bug).
   */
  remove(id: string): void {
    const liveItem = this.items.find((i) => i.id === id)

    if (liveItem) {
      this.items = this.items.filter((i) => i.id !== id)
      this.fileRefs.delete(id)
      this.lastPersistAt.delete(id)
      this.lastPersistProgress.delete(id)
    }

    // Always purge the persisted row — covers both the live case (where we
    // know inspectionId from liveItem) AND the persisted-only case (where we
    // must scan to find which inspection owns the id).
    const persisted = readPersisted()
    let changed = false
    for (const key of Object.keys(persisted)) {
      const list = persisted[key]
      const next = list.filter((p) => p.id !== id)
      if (next.length !== list.length) {
        changed = true
        if (next.length === 0) {
          delete persisted[key]
        } else {
          persisted[key] = next
        }
      }
    }
    if (changed) writePersisted(persisted)

    if (liveItem) {
      this.markDirty()
      this.notify()
    }
  }

  notify() {
    for (const l of this.listeners) {
      try {
        l()
      } catch {
        // listener errors shouldn't break the queue
      }
    }
  }

  /**
   * Persist an item to localStorage with throttling: at most once per
   * PERSIST_THROTTLE_MS OR when progress jumps by PERSIST_PROGRESS_DELTA.
   * `force: true` bypasses the throttle (used on stage transitions).
   */
  private persistItem(
    item: QueueItem,
    opts: { force?: boolean } = {},
  ): void {
    const now = Date.now()
    const lastAt = this.lastPersistAt.get(item.id) ?? 0
    const lastProgress = this.lastPersistProgress.get(item.id) ?? -1
    const progressDelta = Math.abs(item.progress - lastProgress) / 100

    if (
      !opts.force &&
      now - lastAt < PERSIST_THROTTLE_MS &&
      progressDelta < PERSIST_PROGRESS_DELTA
    ) {
      return
    }
    this.lastPersistAt.set(item.id, now)
    this.lastPersistProgress.set(item.id, item.progress)

    const all = readPersisted()
    const list = all[item.inspectionId] ?? []
    const idx = list.findIndex((x) => x.id === item.id)
    const persisted: PersistedItem = {
      id: item.id,
      inspectionId: item.inspectionId,
      fileName: item.fileName,
      fileSize: item.fileSize,
      category: item.category,
      stage: item.stage,
      error: item.error,
      startedAt: item.startedAt,
      attachmentId: item.attachmentId,
    }
    if (idx >= 0) {
      list[idx] = persisted
    } else {
      list.push(persisted)
    }
    all[item.inspectionId] = list
    writePersisted(all)
  }

  private updateItem(id: string, patch: Partial<QueueItem>, forcePersist = false) {
    const item = this.items.find((i) => i.id === id)
    if (!item) return
    Object.assign(item, patch)
    this.persistItem(item, { force: forcePersist })
    this.markDirty()
    this.notify()
  }

  private logError(
    payload: Omit<Parameters<typeof logClientVideoErrorAction>[0], never>,
  ) {
    // Fire-and-forget — swallow errors.
    try {
      void logClientVideoErrorAction(payload)
    } catch {
      // ignore
    }
    console.error('[video-queue]', payload)
  }

  private async run() {
    if (this.running) return
    this.running = true

    try {
      while (true) {
        const next = this.items.find((i) => i.stage === 'queued')
        if (!next) break

        const file = this.fileRefs.get(next.id)
        if (!file) {
          this.updateItem(
            next.id,
            {
              stage: 'error',
              error: 'Archivo no disponible. Selecciónelo de nuevo desde el detalle de la inspección.',
            },
            true,
          )
          this.logError({
            source: 'queue',
            inspectionId: next.inspectionId,
            itemId: next.id,
            fileName: next.fileName,
            fileSize: next.fileSize,
            stage: 'queued',
            error: 'file-ref missing at run loop',
          })
          continue
        }

        await this.processItem(next, file)
      }
    } finally {
      this.running = false
    }
  }

  private async processItem(item: QueueItem, file: File) {
    // ── Step 1: compression ──
    this.updateItem(item.id, { stage: 'compressing', progress: 0 }, true)

    // Inactivity watchdog for compression — if no progress event fires for
    // inactivityTimeoutMs, terminate the worker and mark error. The queue
    // relies on compressVideo()'s own raw-fallback (returns raw file if
    // ≤95MB) instead of short-circuiting here.
    let lastProgressAt = Date.now()
    const inactivityTimer = setInterval(() => {
      if (Date.now() - lastProgressAt > VIDEO_POLICY.inactivityTimeoutMs) {
        clearInterval(inactivityTimer)
        this.logError({
          source: 'queue',
          inspectionId: item.inspectionId,
          itemId: item.id,
          fileName: item.fileName,
          fileSize: item.fileSize,
          stage: 'compressing',
          error: `FFmpeg inactivity watchdog (${VIDEO_POLICY.inactivityTimeoutMs / 1000}s sin progreso)`,
        })
        resetFFmpeg()
        // Mark as error — the user can retry via the panel. compressVideo()
        // itself will raw-fallback on a fresh attempt if the file is small.
        this.updateItem(
          item.id,
          {
            stage: 'error',
            error: `Compresión detenida por inactividad. Reintente o selecciónelo de nuevo.`,
          },
          true,
        )
      }
    }, 5_000)

    let uploadFile: File
    const result: CompressResult = await compressVideo(file, (p) => {
      lastProgressAt = Date.now()
      this.updateItem(item.id, { progress: Math.round(p) })
    })

    clearInterval(inactivityTimer)

    switch (result.kind) {
      case 'skipped':
      case 'compressed':
        uploadFile = result.file
        break
      case 'raw-fallback':
        uploadFile = file
        this.logError({
          source: 'compressor',
          inspectionId: item.inspectionId,
          itemId: item.id,
          fileName: item.fileName,
          fileSize: item.fileSize,
          stage: 'compressing',
          error: 'raw-fallback',
          context: result.reason,
        })
        break
      case 'error':
        this.updateItem(item.id, { stage: 'error', error: result.error }, true)
        this.logError({
          source: 'compressor',
          inspectionId: item.inspectionId,
          itemId: item.id,
          fileName: item.fileName,
          fileSize: item.fileSize,
          stage: 'compressing',
          error: result.error,
        })
        return
      default: {
        const exhaustive: never = result
        void exhaustive
        this.updateItem(
          item.id,
          { stage: 'error', error: 'Resultado de compresión inválido' },
          true,
        )
        return
      }
    }

    // ── Step 2: upload via dedicated server action ──
    const startedAt = Date.now()
    this.updateItem(
      item.id,
      {
        stage: 'uploading',
        progress: -1,
        elapsedSeconds: 0,
      },
      true,
    )

    // Elapsed timer — server actions don't report byte progress.
    const elapsedTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      this.updateItem(item.id, { elapsedSeconds: elapsed })
    }, 1000)

    try {
      const formData = new FormData()
      formData.set('inspectionId', item.inspectionId)
      formData.set('category', item.category)
      formData.set('file', uploadFile)
      // Idempotency key — derived from queue item id so retries of the same
      // item produce the same minioKey and the server can de-duplicate.
      formData.set('idempotencyKey', item.id)

      const response = await uploadInspectionVideoAction(null, formData)

      clearInterval(elapsedTimer)

      if (response.success && response.data?.attachmentId) {
        this.updateItem(
          item.id,
          {
            stage: 'attached',
            progress: 100,
            attachmentId: response.data.attachmentId,
            error: null,
            elapsedSeconds: undefined,
          },
          true,
        )
        // Free the in-memory file reference now that we're done.
        this.fileRefs.delete(item.id)
      } else {
        const errorMsg = response.error ?? 'Error al subir el video'
        this.updateItem(
          item.id,
          {
            stage: 'error',
            error: errorMsg,
            elapsedSeconds: undefined,
          },
          true,
        )
        this.logError({
          source: 'upload',
          inspectionId: item.inspectionId,
          itemId: item.id,
          fileName: item.fileName,
          fileSize: item.fileSize,
          stage: 'uploading',
          error: errorMsg,
        })
      }
    } catch (err) {
      clearInterval(elapsedTimer)
      const message =
        err instanceof Error ? err.message : 'Error de red al subir el video'
      this.updateItem(
        item.id,
        {
          stage: 'error',
          error: message,
          elapsedSeconds: undefined,
        },
        true,
      )
      this.logError({
        source: 'upload',
        inspectionId: item.inspectionId,
        itemId: item.id,
        fileName: item.fileName,
        fileSize: item.fileSize,
        stage: 'uploading',
        error: message,
      })
    }
  }
}

// Singleton instance shared across the app.
export const queue = new VideoUploadQueue()

// ─── Persisted-state read API (read-only for external consumers) ───

export type { PersistedItem }

export function getPersistedQueue(inspectionId: string): PersistedItem[] {
  return readPersisted()[inspectionId] ?? []
}
