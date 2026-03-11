import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/auth',
  '/api',
  '/_next',
  '/favicon.ico',
  '/',
]

const PROTECTED_PATH_PREFIXES = ['/dashboard', '/onboarding']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public paths (exact match or prefix match)
  for (const publicPath of PUBLIC_PATHS) {
    if (pathname === publicPath || pathname.startsWith(publicPath + '/')) {
      return NextResponse.next()
    }
  }
  
  // Allow static assets
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.includes('.') // Files with extensions (images, fonts, etc.)
  ) {
    return NextResponse.next()
  }
  
  // Check for auth cookie on protected paths
  const hasAuthCookie = request.cookies.has('chidi_access_token')
  const hasIndicatorCookie = request.cookies.has('chidi_logged_in')
  const isAuthenticated = hasAuthCookie || hasIndicatorCookie
  
  // Protected routes require authentication
  const isProtectedRoute = PROTECTED_PATH_PREFIXES.some(prefix => 
    pathname.startsWith(prefix)
  )
  
  if (isProtectedRoute && !isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    // Preserve the original URL so we can redirect back after login
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
