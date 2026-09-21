import { describe, it, expect } from 'vitest'
import {
  validateVideoUploadInputSync,
  sanitizeFileName,
  sanitizeIdempotencyKey,
  sniffVideoMagic,
  checkFileMagicBytes,
} from './validations/video-upload'

describe('video-upload validation (pure)', () => {
  const baseFile = {
    name: 'video.mp4',
    size: 1000,
    type: 'video/mp4',
    slice: async () => new ArrayBuffer(16),
  }

  describe('role gate', () => {
    it('rejects when role is missing', () => {
      const r = validateVideoUploadInputSync({
        role: null,
        inspectionId: 'x',
        file: baseFile,
        category: 'initial',
        idempotencyKey: 'k',
      })
      expect(r.ok).toBe(false)
    })
    it('accepts admin', () => {
      const r = validateVideoUploadInputSync({
        role: 'admin',
        inspectionId: 'x',
        file: baseFile,
        category: 'initial',
        idempotencyKey: 'k',
      })
      expect(r.ok).toBe(true)
    })
    it('accepts operator', () => {
      const r = validateVideoUploadInputSync({
        role: 'operator',
        inspectionId: 'x',
        file: baseFile,
        category: 'initial',
        idempotencyKey: 'k',
      })
      expect(r.ok).toBe(true)
    })
    it('rejects viewer', () => {
      const r = validateVideoUploadInputSync({
        role: 'viewer',
        inspectionId: 'x',
        file: baseFile,
        category: 'initial',
        idempotencyKey: 'k',
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toMatch(/permisos/)
    })
  })

  describe('size boundary', () => {
    it('rejects over-limit', () => {
      const over = { ...baseFile, size: 95 * 1024 * 1024 + 1 }
      const r = validateVideoUploadInputSync({
        role: 'admin',
        inspectionId: 'x',
        file: over,
        category: 'initial',
        idempotencyKey: 'k',
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toMatch(/supera/)
    })
    it('accepts exactly-at-limit', () => {
      const atLimit = { ...baseFile, size: 95 * 1024 * 1024 }
      const r = validateVideoUploadInputSync({
        role: 'admin',
        inspectionId: 'x',
        file: atLimit,
        category: 'initial',
        idempotencyKey: 'k',
      })
      expect(r.ok).toBe(true)
    })
    it('rejects empty file', () => {
      const empty = { ...baseFile, size: 0 }
      const r = validateVideoUploadInputSync({
        role: 'admin',
        inspectionId: 'x',
        file: empty,
        category: 'initial',
        idempotencyKey: 'k',
      })
      expect(r.ok).toBe(false)
    })
    it('rejects null file', () => {
      const r = validateVideoUploadInputSync({
        role: 'admin',
        inspectionId: 'x',
        file: null,
        category: 'initial',
        idempotencyKey: 'k',
      })
      expect(r.ok).toBe(false)
    })
  })

  describe('MIME check', () => {
    it('rejects non-video MIME', () => {
      const jpg = { ...baseFile, type: 'image/jpeg' }
      const r = validateVideoUploadInputSync({
        role: 'admin',
        inspectionId: 'x',
        file: jpg,
        category: 'initial',
        idempotencyKey: 'k',
      })
      expect(r.ok).toBe(false)
    })
    it('accepts video/* types', () => {
      for (const t of ['video/mp4', 'video/webm', 'video/quicktime']) {
        const f = { ...baseFile, type: t }
        const r = validateVideoUploadInputSync({
          role: 'admin',
          inspectionId: 'x',
          file: f,
          category: 'initial',
          idempotencyKey: 'k',
        })
        expect(r.ok).toBe(true)
      }
    })
  })

  describe('category allowlist', () => {
    for (const c of ['initial', 'removal', 'post_mount', 'plant']) {
      it(`accepts '${c}'`, () => {
        const r = validateVideoUploadInputSync({
          role: 'admin',
          inspectionId: 'x',
          file: baseFile,
          category: c,
          idempotencyKey: 'k',
        })
        expect(r.ok).toBe(true)
      })
    }
    it('coerces unknown category to initial (permissive — action normalizes)', () => {
      const r = validateVideoUploadInputSync({
        role: 'admin',
        inspectionId: 'x',
        file: baseFile,
        category: 'wat',
        idempotencyKey: 'k',
      })
      // Permissive — the action will coerce, validator doesn't reject.
      expect(r.ok).toBe(true)
    })
  })

  describe('magic-byte sniff', () => {
    it('recognizes MP4 (ftyp at offset 4)', () => {
      const bytes = new Uint8Array(16)
      bytes[4] = 0x66 // f
      bytes[5] = 0x74 // t
      bytes[6] = 0x79 // y
      bytes[7] = 0x70 // p
      expect(sniffVideoMagic(bytes)).toBe(true)
    })
    it('recognizes WebM (EBML at offset 0)', () => {
      const bytes = new Uint8Array(16)
      bytes[0] = 0x1a
      bytes[1] = 0x45
      bytes[2] = 0xdf
      bytes[3] = 0xa3
      expect(sniffVideoMagic(bytes)).toBe(true)
    })
    it('rejects garbage', () => {
      const bytes = new Uint8Array(16).fill(0)
      expect(sniffVideoMagic(bytes)).toBe(false)
    })
    it('rejects too-short buffer', () => {
      const bytes = new Uint8Array(4)
      expect(sniffVideoMagic(bytes)).toBe(false)
    })
  })

  describe('checkFileMagicBytes', () => {
    it('rejects file with non-matching bytes', async () => {
      const fakeFile = {
        name: 'x.mp4',
        size: 100,
        type: 'video/mp4',
        slice: () => ({ arrayBuffer: async () => new ArrayBuffer(16) }),
      }
      const r = await checkFileMagicBytes(fakeFile)
      expect(r.ok).toBe(false)
    })
    it('accepts file with ftyp bytes', async () => {
      const buf = new ArrayBuffer(16)
      const view = new Uint8Array(buf)
      view[4] = 0x66
      view[5] = 0x74
      view[6] = 0x79
      view[7] = 0x70
      const fakeFile = {
        name: 'x.mp4',
        size: 100,
        type: 'video/mp4',
        slice: () => ({ arrayBuffer: async () => buf }),
      }
      const r = await checkFileMagicBytes(fakeFile)
      expect(r.ok).toBe(true)
    })
  })

  describe('sanitizers', () => {
    it('sanitizeFileName strips unsafe chars and truncates', () => {
      // Note: '.', '-', '_' are kept; slashes and spaces replaced with '_'.
      expect(sanitizeFileName('../etc/passwd')).toBe('.._etc_passwd')
      // Dots in extensions are preserved.
      expect(sanitizeFileName('video con espacios.mp4')).toBe('video_con_espacios.mp4')
      expect(sanitizeFileName('a'.repeat(200))).toHaveLength(100)
    })
    it('sanitizeIdempotencyKey strips path separators', () => {
      // Note: idempotencyKey allows [a-zA-Z0-9_-] only — dots become underscores.
      expect(sanitizeIdempotencyKey('vq-123/..\\x')).toBe('vq-123____x')
      expect(sanitizeIdempotencyKey(null)).toBe('')
      expect(sanitizeIdempotencyKey('')).toBe('')
    })
  })
})
