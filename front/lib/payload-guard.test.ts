import { describe, it, expect } from 'vitest'
import {
  estimateFormDataSize,
  assertPayloadUnderLimit,
  computeWatchdogTimeout,
} from './payload-guard'
import {
  FORM_PAYLOAD_LIMIT_BYTES,
  SUBMIT_WATCHDOG_BASE_MS,
  SUBMIT_WATCHDOG_PER_MB_MS,
  SUBMIT_WATCHDOG_MAX_MS,
} from './video-policy'

function makeFile(size: number): File {
  return new File([new Uint8Array(size)], 'f.bin')
}

describe('payload-guard', () => {
  describe('estimateFormDataSize', () => {
    it('sums file sizes + 50KB overhead', () => {
      const files = [makeFile(1000), makeFile(2000)]
      expect(estimateFormDataSize(files)).toBe(3000 + 50 * 1024)
    })
    it('returns just overhead for empty array', () => {
      expect(estimateFormDataSize([])).toBe(50 * 1024)
    })
  })

  describe('assertPayloadUnderLimit', () => {
    it('returns null when under limit', () => {
      const files = [makeFile(1000)]
      expect(assertPayloadUnderLimit(files)).toBeNull()
    })
    it('returns null at exactly-at-limit', () => {
      const target = FORM_PAYLOAD_LIMIT_BYTES - 50 * 1024
      const files = [makeFile(target)]
      expect(assertPayloadUnderLimit(files)).toBeNull()
    })
    it('returns error message when over limit', () => {
      const files = [makeFile(FORM_PAYLOAD_LIMIT_BYTES)]
      const r = assertPayloadUnderLimit(files)
      expect(r).not.toBeNull()
      expect(r).toMatch(/supera/)
    })
  })

  describe('computeWatchdogTimeout', () => {
    it('returns base for empty payload', () => {
      const t = computeWatchdogTimeout([])
      // 0MB → base + ceil(0)*perMB = base (since estimateFormDataSize([])=50KB → ceil(0.05)=1 → base+perMB)
      // 50KB rounds up to 1MB, so base + 1*perMB.
      expect(t).toBe(SUBMIT_WATCHDOG_BASE_MS + SUBMIT_WATCHDOG_PER_MB_MS)
    })
    it('scales linearly with MB (ceiling)', () => {
      const files = [makeFile(10 * 1024 * 1024)] // 10MB
      const t = computeWatchdogTimeout(files)
      // estimateFormDataSize = 10MB + 50KB ≈ 10.05MB → ceil = 11
      // → base + 11*perMB
      expect(t).toBe(SUBMIT_WATCHDOG_BASE_MS + 11 * SUBMIT_WATCHDOG_PER_MB_MS)
    })
    it('caps at SUBMIT_WATCHDOG_MAX_MS', () => {
      const files = [makeFile(1000 * 1024 * 1024)] // 1000MB
      const t = computeWatchdogTimeout(files)
      expect(t).toBe(SUBMIT_WATCHDOG_MAX_MS)
    })
  })
})
