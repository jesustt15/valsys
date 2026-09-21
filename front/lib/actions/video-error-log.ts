// Client-video-error logger.
//
// Fire-and-forget server action used by the background video queue to surface
// client-side failures (compression errors, FFmpeg hangs, transport errors)
// in the server logs. Field issues are otherwise invisible because the
// failure happens on a tablet behind a Cloudflare Tunnel with no DevTools.
//
// Design:
//   - Session-gated: rejects unauthenticated calls.
//   - Never awaited/blocking: callers invoke this without `await` so a slow
//     logger cannot delay queue retries.
//   - Swallows its own failures: if the action itself fails, the queue must
//     not retry the logger.

'use server'

import { getSession } from '@/lib/auth/get-session'

export interface ClientVideoErrorPayload {
  /** 'compressor' | 'queue' | 'upload' | 'duration-probe' */
  source: string
  inspectionId: string | null
  itemId: string | null
  fileName: string | null
  fileSize: number | null
  stage: string | null
  error: string
  /** Free-form context (raw-fallback reason, watchdog trigger, etc.). */
  context?: string
}

export async function logClientVideoErrorAction(
  payload: ClientVideoErrorPayload,
): Promise<void> {
  // Fire-and-forget semantics — we don't block the caller on auth, but we
  // do gate to prevent anonymous noise.
  let session
  try {
    session = await getSession()
  } catch {
    return
  }
  if (!session) return

  // Structured line so it's greppable in Railway / docker logs.
  // Deliberately NOT throwing — if logging fails, the queue must continue.
  try {
    console.error(
      JSON.stringify({
        level: 'client-video-error',
        actor: session.sub,
        source: payload.source,
        inspectionId: payload.inspectionId,
        itemId: payload.itemId,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
        stage: payload.stage,
        error: payload.error,
        context: payload.context,
        at: new Date().toISOString(),
      }),
    )
  } catch {
    // swallow — never let logging break the queue
  }
}
