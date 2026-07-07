import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession, SESSION_COOKIE_NAME } from './lib/auth/session'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  const isAuthPage = request.nextUrl.pathname === '/'
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/owners') ||
    request.nextUrl.pathname.startsWith('/vehicles') ||
    request.nextUrl.pathname.startsWith('/admin')

  if (token) {
    const payload = await verifySession(token)
    if (payload) {
      // User is authenticated
      if (isAuthPage) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      // Add user info to headers for downstream use
      const response = NextResponse.next()
      response.headers.set('x-user-id', payload.sub)
      response.headers.set('x-user-role', payload.role)
      response.headers.set('x-user-name', payload.fullName)
      return response
    }
  }

  // No valid token
  if (isProtectedRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/owners/:path*', '/vehicles/:path*', '/admin/:path*'],
}
