import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE_NAME } from './session'
import type { SessionPayload } from './session'

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}
