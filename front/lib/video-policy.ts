// Shared isomorphic constants for the video upload pipeline.
//
// Imported by BOTH client (queue, compressor, forms) and server (upload action).
// No 'use client' or server-only imports here — this module is environment-neutral.

/**
 * Maximum bytes accepted by the dedicated video upload server action.
 * Leaves headroom below Next.js bodySizeLimit (100MB) for multipart envelope.
 */
export const VIDEO_UPLOAD_LIMIT_BYTES = 95 * 1024 * 1024

/**
 * Hard ceiling for the entire creation-form FormData payload (photos + docs +
 * signature + fields overhead). Exceeding this means the request dies at the
 * Cloudflare Tunnel / Next.js transport layer before the server action runs.
 * Mirrors `next.config.mjs` bodySizeLimit with a 5MB safety margin.
 */
export const FORM_PAYLOAD_LIMIT_BYTES = 95 * 1024 * 1024

/**
 * Watchdog timing constants for form submission.
 * The timeout scales with estimated payload size so legitimate big uploads
 * through Cloudflare Tunnel (~1MB/s) aren't mis-flagged as hung.
 */
export const SUBMIT_WATCHDOG_BASE_MS = 30_000
export const SUBMIT_WATCHDOG_PER_MB_MS = 3_000
export const SUBMIT_WATCHDOG_MAX_MS = 5 * 60_000

// FFmpeg / compression policy — single source of truth.
export const VIDEO_POLICY = {
  /** Files smaller than this skip compression entirely. */
  skipCompressionBelow: 30 * 1024 * 1024,
  /** Hard cap on incoming raw file size (validated at selection time). */
  maxRawSize: 100 * 1024 * 1024,
  /** Upload cap — kept in sync with VIDEO_UPLOAD_LIMIT_BYTES. */
  maxUploadSize: VIDEO_UPLOAD_LIMIT_BYTES,
  /** Maximum accepted video duration in seconds. */
  maxDurationSeconds: 120,
  /** Target output resolution (720p). */
  targetResolution: '720',
  /** Target video bitrate. */
  targetBitrate: '2000k',
  /** Timeout for the FFmpeg exec() call (5 min). */
  execTimeoutMs: 5 * 60_000,
  /** Race timeout for the HTMLMediaElement duration probe. */
  durationProbeTimeoutMs: 15_000,
  /** Inactivity watchdog in the queue — if no progress event fires for this
   *  long during compression, the worker is considered stuck. */
  inactivityTimeoutMs: 6 * 60_000,
  /** Load timeout for the FFmpeg singleton — a hung `toBlobURL` or
   *  `instance.load()` must not brick any sequential queue built on it. */
  ffmpegLoadTimeoutMs: 90_000,
} as const
