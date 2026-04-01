import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// AUTH CALLBACK — Supabase OAuth / Magic Link code exchange
// Handles the redirect from Supabase auth (email confirm, OAuth)
// Exchanges the temporary code for a persistent session.
// ============================================================

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    // No code present — redirect to login with error
    return NextResponse.redirect(
      new URL('/login?error=missing_code', origin)
    )
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if middleware refreshes sessions.
          }
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] Code exchange failed:', error.message)
    return NextResponse.redirect(
      new URL('/login?error=auth_failed', origin)
    )
  }

  // Successful auth — redirect to the intended destination
  return NextResponse.redirect(new URL(next, origin))
}
