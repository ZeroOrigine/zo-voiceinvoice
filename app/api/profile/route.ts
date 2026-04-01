import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// ============================================================
// PROFILE — Get & Update the authenticated user's profile
// GET   /api/profile
// PATCH /api/profile
// ============================================================

// --- Types ---

interface ProfileRecord {
  id: string
  email: string
  full_name: string
  role: string
  business_name: string
  business_email: string
  business_phone: string
  business_address: string
  currency: string
  created_at: string
  updated_at: string
}

interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
}

// --- Validation ---

const updateProfileSchema = z.object({
  full_name: z.string().min(1, { message: 'Your name is required' }).max(200, { message: 'Name is too long' }).optional(),
  business_name: z.string().max(200, { message: 'Business name is too long' }).optional(),
  business_email: z.string().email({ message: 'Please enter a valid business email' }).or(z.literal('')).optional(),
  business_phone: z.string().max(50, { message: 'Phone number is too long' }).optional(),
  business_address: z.string().max(500, { message: 'Address is too long' }).optional(),
  currency: z.string().length(3, { message: 'Currency must be a 3-letter code like USD' }).optional(),
})

// --- Supabase Client Helper ---

async function getAuthenticatedClient() {
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
            // Ignored in Server Component context
          }
        },
      },
    }
  )

  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    return { supabase: null, userId: null }
  }

  return { supabase, userId: session.user.id }
}

const SELECT_COLUMNS = 'id, email, full_name, role, business_name, business_email, business_phone, business_address, currency, created_at, updated_at'

// --- GET: Fetch current user's profile ---

export async function GET(): Promise<NextResponse<ApiResponse<ProfileRecord>>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()
    if (!supabase || !userId) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to view your profile.', status: 401 },
        { status: 401 }
      )
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(SELECT_COLUMNS)
      .eq('id', userId)
      .single()

    if (error || !profile) {
      console.error('[profile/GET] Query failed:', error?.message)
      return NextResponse.json(
        { data: null, error: 'We couldn\'t load your profile. Please try signing in again.', status: 404 },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { data: profile as ProfileRecord, error: null, status: 200 },
      { status: 200 }
    )
  } catch (err) {
    console.error('[profile/GET] Unexpected error:', err)
    return NextResponse.json(
      { data: null, error: 'Something unexpected happened. Please try again.', status: 500 },
      { status: 500 }
    )
  }
}

// --- PATCH: Update current user's profile ---

export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<ProfileRecord>>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()
    if (!supabase || !userId) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to update your profile.', status: 401 },
        { status: 401 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { data: null, error: 'We couldn\'t read your request. Please check the data and try again.', status: 400 },
        { status: 400 }
      )
    }

    const validation = updateProfileSchema.safeParse(body)
    if (!validation.success) {
      const fieldErrors = validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
      return NextResponse.json(
        { data: null, error: fieldErrors[0]?.message || 'Please check your input and try again.', status: 400 },
        { status: 400 }
      )
    }

    const input = validation.data

    const updateData: Record<string, unknown> = {}
    if (input.full_name !== undefined) updateData.full_name = input.full_name
    if (input.business_name !== undefined) updateData.business_name = input.business_name
    if (input.business_email !== undefined) updateData.business_email = input.business_email
    if (input.business_phone !== undefined) updateData.business_phone = input.business_phone
    if (input.business_address !== undefined) updateData.business_address = input.business_address
    if (input.currency !== undefined) updateData.currency = input.currency

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { data: null, error: 'Nothing to update. Please provide at least one field to change.', status: 400 },
        { status: 400 }
      )
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select(SELECT_COLUMNS)
      .single()

    if (error || !profile) {
      console.error('[profile/PATCH] Update failed:', error?.message)
      return NextResponse.json(
        { data: null, error: 'We couldn\'t update your profile. Please try again.', status: 500 },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { data: profile as ProfileRecord, error: null, status: 200 },
      { status: 200 }
    )
  } catch (err) {
    console.error('[profile/PATCH] Unexpected error:', err)
    return NextResponse.json(
      { data: null, error: 'Something unexpected happened. Please try again.', status: 500 },
      { status: 500 }
    )
  }
}
