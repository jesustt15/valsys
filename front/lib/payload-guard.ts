// Payload-size guard for form submissions.
//
// Estimates the size of the FormData that will be sent to the server action.
// Used by forms to block submission before hitting the transport cap
// (Cloudflare Tunnel / Next.js bodySizeLimit).

import {
  FORM_PAYLOAD_LIMIT_BYTES,
  SUBMIT_WATCHDOG_BASE_MS,
  SUBMIT_WATCHDOG_PER_MB_MS,
  SUBMIT_WATCHDOG_MAX_MS,
} from './video-policy'

/**
 * Approximates FormData size by summing File sizes + a fixed overhead for
 * non-file fields. The overhead is conservative (text fields are small).
 */
export function estimateFormDataSize(files: File[]): number {
  const overheadBytes = 50 * 1024
  return files.reduce((acc, f) => acc + f.size, 0) + overheadBytes
}

/**
 * Returns a Spanish user-facing error message when the payload exceeds the
 * transport cap, or null if the payload fits.
 */
export function assertPayloadUnderLimit(files: File[]): string | null {
  const estimated = estimateFormDataSize(files)
  if (estimated <= FORM_PAYLOAD_LIMIT_BYTES) return null
  const limitMB = Math.round(FORM_PAYLOAD_LIMIT_BYTES / 1024 / 1024)
  const actualMB = (estimated / 1024 / 1024).toFixed(1)
  return `El tamaño total del envío supera los ${limitMB}MB (${actualMB}MB). Reduzca la cantidad de fotos o documentos.`
}

/**
 * Computes the watchdog timeout scaled by the payload size.
 * A 90MB upload at ~1MB/s through Cloudflare Tunnel legitimately needs ~90s;
 * a fixed 30s would mis-fire. Capped at SUBMIT_WATCHDOG_MAX_MS.
 */
export function computeWatchdogTimeout(files: File[]): number {
  const mb = estimateFormDataSize(files) / 1024 / 1024
  const scaled = SUBMIT_WATCHDOG_BASE_MS + Math.ceil(mb) * SUBMIT_WATCHDOG_PER_MB_MS
  return Math.min(scaled, SUBMIT_WATCHDOG_MAX_MS)
}
