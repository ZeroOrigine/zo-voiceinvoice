import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// AUTH CONFIRM — Handles code exchange for OAuth and email confirm
// ============================================================

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirectParam = searchParams.get('redirect') || '/dashboard'
  const next = searchParams.get('next') || redirectParam
  const type = searchParams.get('type')

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=missing_confirmation_code`
    )
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch { /* ignored */ }
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/confirm] Code exchange failed:', error.message)
    return NextResponse.redirect(
      `${origin}/login?error=Could+not+confirm+your+account.+Please+try+again.`
    )
  }

  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/dashboard/settings?reset=true`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
