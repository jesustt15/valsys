'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { computeWatchdogTimeout } from '@/lib/payload-guard'

/**
 * Shared transport watchdog for form submissions.
 *
 * Problem: Server Actions don't expose byte progress. If the underlying
 * transport hangs (Cloudflare Tunnel idle timeout, tablet radio dropout,
 * Next.js bodySizeLimit exceeded), the form stays in `pending=true` with
 * no feedback until the user reloads. useActionState's `pending` flag
 * CANNOT be aborted from outside — reload IS the honest escape.
 *
 * This hook:
 *   - Arms a timer scaled by payload size when `arm(files)` is called.
 *   - Flips `banner` to a user-visible message when the timer fires OR when
 *     the browser reports offline.
 *   - Provides `reset()` so the consumer can clear the banner on any state
 *     change (success, error, or pending flipping to false).
 *   - Cleans up the timer + offline listener on reset AND on unmount.
 *
 * Usage:
 *   const { banner, arm, reset } = useSubmitWatchdog()
 *   // in handleSubmit:
 *   arm(files)
 *   formAction(data)
 *   // in effects:
 *   useEffect(() => { if (!pending) reset() }, [pending, reset])
 *   useEffect(() => { if (state) reset() }, [state, reset])
 */
export function useSubmitWatchdog() {
  const [banner, setBanner] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)
  const offlineHandlerRef = useRef<(() => void) | null>(null)

  const reset = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (offlineHandlerRef.current && typeof window !== 'undefined') {
      window.removeEventListener('offline', offlineHandlerRef.current)
      offlineHandlerRef.current = null
    }
    setBanner(null)
  }, [])

  const arm = useCallback(
    (files: File[]) => {
      reset()
      if (typeof window === 'undefined') return

      const timeoutMs = computeWatchdogTimeout(files)
      timerRef.current = window.setTimeout(() => {
        setBanner(
          'No se pudo completar el envío. Verifique la conexión o recargue la página. El borrador se guarda automáticamente.',
        )
      }, timeoutMs) as unknown as number

      const offlineHandler = () => {
        setBanner(
          'Sin conexión a la red. El envío puede fallar; verifique su conexión.',
        )
      }
      offlineHandlerRef.current = offlineHandler
      window.addEventListener('offline', offlineHandler, { once: true })
    },
    [reset],
  )

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
      if (offlineHandlerRef.current && typeof window !== 'undefined') {
        window.removeEventListener('offline', offlineHandlerRef.current)
      }
    }
  }, [])

  return { banner, arm, reset }
}
