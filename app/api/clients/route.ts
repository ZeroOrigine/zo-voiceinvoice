import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// ============================================================
// CLIENTS — List & Create
// GET  /api/clients?page=1&limit=20&search=acme
// POST /api/clients
// ============================================================

// --- Types ---

interface ClientRecord {
  id: string
  user_id: string
  name: string
  email: string
  phone: string
  company: string
  address: string
  notes: string
  created_at: string
  updated_at: string
}

interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
}

interface PaginatedResponse<T> {
  data: { items: T[]; total: number; page: number; limit: number } | null
  error: string | null
  status: number
}

// --- Validation ---

const createClientSchema = z.object({
  name: z.string().min(1, { message: 'Client name is required' }).max(200, { message: 'Name is too long' }),
  email: z.string().email({ message: 'Please enter a valid email address' }).optional().default(''),
  phone: z.string().max(50, { message: 'Phone number is too long' }).optional().default(''),
  company: z.string().max(200, { message: 'Company name is too long' }).optional().default(''),
  address: z.string().max(500, { message: 'Address is too long' }).optional().default(''),
  notes: z.string().max(2000, { message: 'Notes cannot exceed 2000 characters' }).optional().default(''),
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

const SELECT_COLUMNS = 'id, user_id, name, email, phone, company, address, notes, created_at, updated_at'

// --- GET: List clients ---

export async function GET(request: NextRequest): Promise<NextResponse<PaginatedResponse<ClientRecord>>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()
    if (!supabase || !userId) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to view your clients.', status: 401 },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const search = searchParams.get('search') || ''
    const offset = (page - 1) * limit

    let query = supabase
      .from('clients')
      .select(SELECT_COLUMNS, { count: 'exact' })
      .eq('user_id', userId)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    }

    const { data: clients, count, error } = await query

    if (error) {
      console.error('[clients/GET] Query failed:', error.message)
      return NextResponse.json(
        { data: null, error: 'We couldn\'t load your clients right now. Please try again.', status: 500 },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          items: (clients || []) as ClientRecord[],
          total: count || 0,
          page,
          limit,
        },
        error: null,
        status: 200,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('[clients/GET] Unexpected error:', err)
    return NextResponse.json(
      { data: null, error: 'Something unexpected happened. Please try again.', status: 500 },
      { status: 500 }
    )
  }
}

// --- POST: Create a new client ---

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ClientRecord>>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()
    if (!supabase || !userId) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to add a client.', status: 401 },
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

    const validation = createClientSchema.safeParse(body)
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

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        user_id: userId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        address: input.address,
        notes: input.notes,
      })
      .select(SELECT_COLUMNS)
      .single()

    if (error) {
      console.error('[clients/POST] Insert failed:', error.message)
      return NextResponse.json(
        { data: null, error: 'We couldn\'t save this client. Please try again.', status: 500 },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { data: client as ClientRecord, error: null, status: 201 },
      { status: 201 }
    )
  } catch (err) {
    console.error('[clients/POST] Unexpected error:', err)
    return NextResponse.json(
      { data: null, error: 'Something unexpected happened. Please try again.', status: 500 },
      { status: 500 }
    )
  }
}
