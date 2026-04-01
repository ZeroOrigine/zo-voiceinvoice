import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ============================================================
// CANONICAL MIDDLEWARE — Single source of truth
// Uses getUser() (not getSession) for security.
// Protects dashboard routes, redirects auth pages for logged-in users.
// ============================================================

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            })
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Routes that never need auth
  const isWebhookRoute = pathname.startsWith('/api/webhooks')
  if (isWebhookRoute) return supabaseResponse

  const isAuthRoute = ['/login', '/signup', '/forgot-password'].includes(pathname)
  const isAuthConfirm = pathname.startsWith('/auth/confirm') || pathname.startsWith('/api/auth')
  const isProtectedRoute = pathname.startsWith('/dashboard')
  const isProtectedApi = pathname.startsWith('/api/') && !pathname.startsWith('/api/webhooks') && !pathname.startsWith('/api/auth')

  // Allow auth confirmation routes without redirect
  if (isAuthConfirm) return supabaseResponse

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Protect dashboard routes
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Protect API routes (return 401 instead of redirect)
  if (!user && isProtectedApi) {
    return NextResponse.json(
      { data: null, error: 'Authentication required.', status: 401 },
      { status: 401 }
    )
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
