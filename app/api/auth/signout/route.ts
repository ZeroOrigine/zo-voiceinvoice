import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// SIGN OUT — Destroys the Supabase session and redirects home
// ============================================================

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ignored in Server Component context
          }
        },
      },
    }
  )

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('[auth/signout] Sign out failed:', error.message)
    return NextResponse.json(
      { data: null, error: 'We couldn\'t sign you out right now. Please try again.', status: 500 },
      { status: 500 }
    )
  }

  const origin = new URL(request.url).origin
  return NextResponse.redirect(new URL('/', origin), { status: 302 })
}
