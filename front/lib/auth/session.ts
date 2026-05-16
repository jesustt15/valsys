import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE_NAME = 'valsys_session'
export const SESSION_MAX_AGE = 8 * 60 * 60 // 8 hours in seconds

export interface SessionPayload {
  sub: string
  role: string
  fullName: string
  iat: number
  exp: number
}

const encoder = new TextEncoder()
const secret = encoder.encode(process.env.JWT_SECRET!)

export async function createSession(
  userId: string,
  role: string,
  fullName: string,
): Promise<string> {
  const token = await new SignJWT({ role, fullName })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret)

  return token
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return {
      sub: payload.sub as string,
      role: payload.role as string,
      fullName: payload.fullName as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    }
  } catch {
    return null
  }
}
