// Validation for the dedicated video-upload server action.
//
// Extracted as a near-pure helper so the server action stays thin AND the
// rules are unit-testable in Node (without needing to spin up a DB or MinIO).
//
// The action is the ONLY caller — keep this module server-compatible (no
// 'use client') and free of framework imports.

import { VIDEO_UPLOAD_LIMIT_BYTES } from '../video-policy'

export type VideoUploadValidation =
  | { ok: true }
  | { ok: false; error: string }

export interface VideoUploadInput {
  /** Caller must pass a non-empty string for inspectionId. */
  inspectionId: string | null | undefined
  /** Caller must pass a File-shaped object. */
  file: { name: string; size: number; type: string; slice: (start: number, end: number) => { arrayBuffer: () => Promise<ArrayBuffer> } } | null
  /** Caller must pass a role string (from session). */
  role: string | null | undefined
  /** Caller must pass a category string — allowlisted below. */
  category: string | null | undefined
  /** Caller may pass an idempotencyKey; we sanitize it. */
  idempotencyKey: string | null | undefined
}

const VALID_CATEGORIES = ['initial', 'removal', 'post_mount', 'plant'] as const

/**
 * Sanitize a file name for use in a MinIO key. Defensive — strips anything
 * that isn't `[a-zA-Z0-9._-]` and truncates to 100 chars.
 */
export function sanitizeFileName(name: string): string {
  return (name || 'video.mp4').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100)
}

/**
 * Sanitize an idempotency key for use as a stable path component.
 * Accepts `[a-zA-Z0-9_-]`, rejects everything else with `_`.
 */
export function sanitizeIdempotencyKey(key: string | null | undefined): string {
  if (!key) return ''
  return key.replace(/[^a-zA-Z0-9_-]/g, '_')
}

/**
 * Magic-byte sniff for MP4/MOV (ftyp box at offset 4) and WebM (EBML header).
 * Pure function — takes a Uint8Array of at least 12 bytes.
 */
export function sniffVideoMagic(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false
  // MP4/MOV: bytes 4-7 are "ftyp"
  const isFtyp =
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  if (isFtyp) return true
  // WebM/Matroska: EBML header 0x1A 0x45 0xDF 0xA3
  const isWebm =
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  return isWebm
}

/**
 * Reads the first 16 bytes of a File-shaped object and runs the magic-byte
 * sniff. Returns ok:true if the bytes match a known video container signature.
 */
export async function checkFileMagicBytes(
  file: VideoUploadInput['file'],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!file) return { ok: false, error: 'No se recibió ningún archivo de video' }
  try {
    const headBuffer = await file.slice(0, 16).arrayBuffer()
    if (!sniffVideoMagic(new Uint8Array(headBuffer))) {
      return {
        ok: false,
        error: 'Formato de video no soportado (use MP4, MOV o WebM).',
      }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'No se pudo verificar el contenido del video.' }
  }
}

/**
 * Near-pure validation of the input to `uploadInspectionVideoAction`.
 *
 * Runs synchronously for all checks EXCEPT the magic-byte sniff (which
 * requires reading file bytes). Callers should:
 *   1. Run validateVideoUploadInputSync for the cheap checks.
 *   2. If ok, await checkFileMagicBytes for the I/O check.
 *
 * We split this way so unit tests can cover the pure path without stubbing
 * File.arrayBuffer().
 */
export function validateVideoUploadInputSync(input: VideoUploadInput): VideoUploadValidation {
  // 1. Auth — must have a session (role is a non-empty string).
  //    Note: the ACTION also rejects missing session — this helper assumes
  //    the caller already verified the session exists and only passes the
  //    role. We gate the role matrix here (admin/operator pass; viewer/etc.
  //    reject). The pre-existing `uploadInspectionFileAction` (photos) has
  //    no role gate — that's a product decision pending unification, NOT a
  //    gap to close here.
  if (!input.role) {
    return { ok: false, error: 'No hay sesión activa. Inicie sesión nuevamente.' }
  }
  if (input.role !== 'admin' && input.role !== 'operator') {
    return { ok: false, error: 'No tiene permisos para subir videos a la inspección.' }
  }

  // 2. Required fields.
  if (!input.inspectionId) {
    return { ok: false, error: 'Falta el identificador de la inspección' }
  }
  if (!input.file || input.file.size === 0) {
    return { ok: false, error: 'No se recibió ningún archivo de video' }
  }

  // 3. MIME check.
  if (!input.file.type.startsWith('video/')) {
    return { ok: false, error: 'El archivo debe ser un video' }
  }

  // 4. Size cap (boundary: exactly-at-limit passes; over-limit rejects).
  if (input.file.size > VIDEO_UPLOAD_LIMIT_BYTES) {
    return {
      ok: false,
      error: `El video supera los ${Math.round(VIDEO_UPLOAD_LIMIT_BYTES / 1024 / 1024)}MB (${(input.file.size / 1024 / 1024).toFixed(1)}MB)`,
    }
  }

  // 5. Category allowlist.
  const category = input.category || 'initial'
  if (!(VALID_CATEGORIES as readonly string[]).includes(category)) {
    // Non-fatal — normalize to 'initial'. Callers should log this.
    // We keep the validator permissive here because the action coerces.
  }

  // 6. idempotencyKey sanitized — not a rejection, just note the output.
  //    Sanitization is done by the caller using sanitizeIdempotencyKey.

  return { ok: true }
}
