import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaQuery } from '@/hooks/use-media-query'

describe('useMediaQuery', () => {
  let listeners: Set<(e: MediaQueryListEvent) => void>

  beforeEach(() => {
    listeners = new Set()
    const matchMediaMock = vi.fn((query: string) => {
      const mql = {
        matches: query === '(min-width: 1024px)',
        media: query,
        addEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
          listeners.add(handler)
        }),
        removeEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
          listeners.delete(handler)
        }),
      } as unknown as MediaQueryList
      return mql
    })
    vi.stubGlobal('matchMedia', matchMediaMock)
  })

  it('returns initial boolean based on matchMedia.matches', () => {
    // Desktop (matches = true)
    const { result: desktop } = renderHook(() => useMediaQuery('(min-width: 1024px)'))
    expect(desktop.current).toBe(true)

    // Mobile (matches = false) — different query
    vi.mocked(window.matchMedia).mockImplementationOnce(() => ({
      matches: false,
      media: '(pointer: coarse)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList))
    const { result: mobile } = renderHook(() => useMediaQuery('(pointer: coarse)'))
    expect(mobile.current).toBe(false)
  })

  it('updates on change event', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'))
    expect(result.current).toBe(true)

    // Simulate resize event
    const handler = [...listeners][0]
    act(() => {
      handler({ matches: false } as MediaQueryListEvent)
    })
    expect(result.current).toBe(false)
  })

  it('starts false when query does not match', () => {
    vi.mocked(window.matchMedia).mockClear()
    vi.mocked(window.matchMedia).mockImplementation(() => ({
      matches: false,
      media: '(min-width: 1024px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList))

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'))
    expect(result.current).toBe(false)
  })
})
