// Video compression pipeline.
//
// Load order: @ffmpeg/core UMD bundle is served same-origin from /public/ffmpeg
// (no external CDN — the previous unpkg fetch silently dropped the video under
// COEP require-corp if the request failed).
//
// The pipeline NEVER throws unhandled. Callers receive a typed CompressResult
// and decide what to do (upload raw, queue again, or surface an error).
//
// Failure safety:
//   - getVideoDuration races an HTMLMediaElement probe against a 15s timer
//     so a stuck decoder cannot freeze the caller.
//   - exec() is called with a 5-minute timeout; on timeout the worker is
//     terminated and the singleton is reset so the next call gets a fresh one.
//   - The 'progress' listener is always unregistered in a finally block to
//     prevent accumulation across calls on the reused singleton.

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { VIDEO_POLICY } from './video-policy'

export type CompressResult =
  | { kind: 'skipped'; file: File; reason: 'small' }
  | { kind: 'compressed'; file: File }
  | { kind: 'raw-fallback'; file: File; reason: string }
  | { kind: 'error'; error: string }

let ffmpeg: FFmpeg | null = null
let ffmpegLoadPromise: Promise<FFmpeg> | null = null
/**
 * The instance currently being loaded — held in module state so resetFFmpeg()
 * can terminate it even while .load() is still in flight. Without this, a
 * hung `toBlobURL` fetch or `instance.load()` never settles and any queue
 * built on the singleton is bricked for the session.
 */
let ffmpegLoadingInstance: FFmpeg | null = null

async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg
  if (ffmpegLoadPromise) return ffmpegLoadPromise

  const instance = new FFmpeg()
  ffmpegLoadingInstance = instance

  ffmpegLoadPromise = (async () => {
    // Same-origin URLs — files live in front/public/ffmpeg/.
    // toBlobURL fetches them and rewraps as blob: URLs so the FFmpeg worker
    // can import them under COEP require-corp.
    const coreURL = await toBlobURL(`/ffmpeg/ffmpeg-core.js`, 'text/javascript')
    const wasmURL = await toBlobURL(`/ffmpeg/ffmpeg-core.wasm`, 'application/wasm')

    await instance.load({ coreURL, wasmURL })
    // Guard: only assign to module state if this instance is still the
    // in-flight one. A late resolve after timeout/reset must NOT revive a
    // terminated worker.
    if (ffmpegLoadingInstance === instance) {
      ffmpeg = instance
      ffmpegLoadingInstance = null
    }
    return instance
  })()

  try {
    // Race the load against a timeout — a hung `toBlobURL` or `load()` call
    // must not brick the queue forever.
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`FFmpeg load timeout (${VIDEO_POLICY.ffmpegLoadTimeoutMs / 1000}s)`)),
        VIDEO_POLICY.ffmpegLoadTimeoutMs,
      )
    })
    return await Promise.race([ffmpegLoadPromise, timeout])
  } catch (err) {
    // Allow retries on next call instead of caching the rejection.
    ffmpegLoadPromise = null
    ffmpegLoadingInstance = null
    // Best-effort terminate the in-flight instance.
    try {
      instance.terminate()
    } catch {
      // ignore
    }
    throw err
  }
}

/**
 * Terminate the current FFmpeg singleton AND any in-flight loading instance,
 * then reset the module state so the next call to loadFFmpeg() provisions a
 * fresh worker. Used by the queue inactivity watchdog and load-timeout path
 * when the worker appears stuck.
 */
export function resetFFmpeg(): void {
  if (ffmpeg) {
    try {
      ffmpeg.terminate()
    } catch {
      // ignore
    }
  }
  if (ffmpegLoadingInstance && ffmpegLoadingInstance !== ffmpeg) {
    try {
      ffmpegLoadingInstance.terminate()
    } catch {
      // ignore
    }
  }
  ffmpeg = null
  ffmpegLoadingInstance = null
  ffmpegLoadPromise = null
}

// ─── Duration / size validation ─────────────────────────────────

/**
 * Resolves the duration of a video File by racing an HTMLMediaElement probe
 * against a timer. Prevents the queue from hanging forever if the browser
 * decoder never fires loadedmetadata/error (e.g. OOM-killed worker,
 * corrupted blob URL, exotic codec).
 */
export async function getVideoDuration(file: File): Promise<number> {
  const timeoutMs = VIDEO_POLICY.durationProbeTimeoutMs

  const probe = new Promise<number>((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('No se pudo leer la duración del video'))
    }

    video.src = URL.createObjectURL(file)
  })

  const timeout = new Promise<number>((_, reject) => {
    setTimeout(
      () => reject(new Error(`No se pudo leer la duración del video (timeout ${timeoutMs / 1000}s)`)),
      timeoutMs,
    )
  })

  return Promise.race([probe, timeout])
}

export function validateVideoFile(file: File): string | null {
  if (!file.type.startsWith('video/')) {
    return 'El archivo debe ser un video'
  }
  if (file.size > VIDEO_POLICY.maxRawSize) {
    return `El video supera los 100MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`
  }
  return null
}

export async function validateVideoDuration(file: File): Promise<string | null> {
  try {
    const duration = await getVideoDuration(file)
    if (duration > VIDEO_POLICY.maxDurationSeconds) {
      return `El video dura ${Math.round(duration)}s. Máximo permitido: ${VIDEO_POLICY.maxDurationSeconds}s (2 minutos)`
    }
    return null
  } catch {
    return 'No se pudo validar la duración del video'
  }
}

// ─── Compression ────────────────────────────────────────────────
// Returns a CompressResult. NEVER throws unhandled — all failure modes are
// captured and reported to the caller so the queue can decide what to do.

export async function compressVideo(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<CompressResult> {
  // Delegate validation to the shared helpers (single source of error text).
  const sizeError = validateVideoFile(file)
  if (sizeError) {
    return { kind: 'error', error: sizeError }
  }
  const durationError = await validateVideoDuration(file)
  if (durationError) {
    return { kind: 'error', error: durationError }
  }

  // Skip compression if already small enough.
  if (file.size < VIDEO_POLICY.skipCompressionBelow) {
    return { kind: 'skipped', file, reason: 'small' }
  }

  let ffmpegInstance: FFmpeg
  try {
    ffmpegInstance = await loadFFmpeg()
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Error al cargar FFmpeg'
    if (file.size <= VIDEO_POLICY.maxUploadSize) {
      return { kind: 'raw-fallback', file, reason }
    }
    return {
      kind: 'error',
      error: `No se pudo comprimir el video (${reason}) y el archivo supera los ${Math.round(VIDEO_POLICY.maxUploadSize / 1024 / 1024)}MB.`,
    }
  }

  const inputName = `input-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const outputName = `output-${inputName.replace(/\.[^/.]+$/, '')}.mp4`

  // Progress handler — must be detached in finally so the singleton doesn't
  // accumulate callbacks across sequential compressVideo() calls.
  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(progress * 100, 100))
  }

  try {
    await ffmpegInstance.writeFile(inputName, await fetchFile(file))

    ffmpegInstance.on('progress', progressHandler)

    // exec() with timeout — the installed @ffmpeg/ffmpeg@0.12.15 accepts a
    // second timeout argument. On timeout the worker is considered stuck.
    await ffmpegInstance.exec(
      [
        '-i', inputName,
        '-vf', `scale=-2:${VIDEO_POLICY.targetResolution}`,
        '-c:v', 'libx264',
        '-b:v', VIDEO_POLICY.targetBitrate,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        outputName,
      ],
      VIDEO_POLICY.execTimeoutMs,
    )

    const data = await ffmpegInstance.readFile(outputName)

    if (typeof data === 'string') {
      throw new Error('Unexpected string output from FFmpeg')
    }

    // Copy to a fresh ArrayBuffer — required because FFmpeg returns a view
    // over the worker's SharedArrayBuffer that becomes detached after the
    // worker is released.
    const arrayBuffer = new ArrayBuffer(data.byteLength)
    const view = new Uint8Array(arrayBuffer)
    view.set(data)

    const blob = new Blob([arrayBuffer], { type: 'video/mp4' })
    const compressed = new File([blob], outputName, { type: 'video/mp4' })
    return { kind: 'compressed', file: compressed }
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Error desconocido al comprimir'
    // If exec timed out (or any error), reset the singleton so the next call
    // gets a fresh worker. Otherwise a stuck worker blocks the queue forever.
    resetFFmpeg()
    if (file.size <= VIDEO_POLICY.maxUploadSize) {
      return { kind: 'raw-fallback', file, reason }
    }
    return {
      kind: 'error',
      error: `No se pudo comprimir el video (${reason}) y el archivo supera los ${Math.round(VIDEO_POLICY.maxUploadSize / 1024 / 1024)}MB.`,
    }
  } finally {
    // ALWAYS detach the progress listener — singleton is reused across calls.
    try {
      ffmpegInstance.off('progress', progressHandler)
    } catch {
      // ignore
    }
    // Best-effort cleanup of worker temp files.
    try {
      await ffmpegInstance.deleteFile(inputName)
      await ffmpegInstance.deleteFile(outputName)
    } catch {
      // ignore
    }
  }
}
