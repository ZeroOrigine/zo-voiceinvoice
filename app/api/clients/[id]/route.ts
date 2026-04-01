import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// ============================================================
// CLIENT BY ID — Get, Update, Delete a single client
// GET    /api/clients/[id]
// PATCH  /api/clients/[id]
// DELETE /api/clients/[id]
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

// --- Validation ---

const updateClientSchema = z.object({
  name: z.string().min(1, { message: 'Client name is required' }).max(200, { message: 'Name is too long' }).optional(),
  email: z.string().email({ message: 'Please enter a valid email address' }).optional(),
  phone: z.string().max(50, { message: 'Phone number is too long' }).optional(),
  company: z.string().max(200, { message: 'Company name is too long' }).optional(),
  address: z.string().max(500, { message: 'Address is too long' }).optional(),
  notes: z.string().max(2000, { message: 'Notes cannot exceed 2000 characters' }).optional(),
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

// --- GET: Fetch a single client ---

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ClientRecord>>> {
  try {
    const { id } = await params
    const { supabase, userId } = await getAuthenticatedClient()

    if (!supabase || !userId) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to view this client.', status: 401 },
        { status: 401 }
      )
    }

    const { data: client, error } = await supabase
      .from('clients')
      .select(SELECT_COLUMNS)
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error || !client) {
      return NextResponse.json(
        { data: null, error: 'We couldn\'t find that client. They may have been removed.', status: 404 },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { data: client as ClientRecord, error: null, status: 200 },
      { status: 200 }
    )
  } catch (err) {
    console.error('[clients/[id]/GET] Unexpected error:', err)
    return NextResponse.json(
      { data: null, error: 'Something unexpected happened. Please try again.', status: 500 },
      { status: 500 }
    )
  }
}

// --- PATCH: Update a client ---

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ClientRecord>>> {
  try {
    const { id } = await params
    const { supabase, userId } = await getAuthenticatedClient()

    if (!supabase || !userId) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to update this client.', status: 401 },
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

    const validation = updateClientSchema.safeParse(body)
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

    // Build update object — only include provided fields
    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.email !== undefined) updateData.email = input.email
    if (input.phone !== undefined) updateData.phone = input.phone
    if (input.company !== undefined) updateData.company = input.company
    if (input.address !== undefined) updateData.address = input.address
    if (input.notes !== undefined) updateData.notes = input.notes

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { data: null, error: 'Nothing to update. Please provide at least one field to change.', status: 400 },
        { status: 400 }
      )
    }

    const { data: client, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select(SELECT_COLUMNS)
      .single()

    if (error || !client) {
      console.error('[clients/[id]/PATCH] Update failed:', error?.message)
      return NextResponse.json(
        { data: null, error: 'We couldn\'t update that client. They may have been removed.', status: 404 },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { data: client as ClientRecord, error: null, status: 200 },
      { status: 200 }
    )
  } catch (err) {
    console.error('[clients/[id]/PATCH] Unexpected error:', err)
    return NextResponse.json(
      { data: null, error: 'Something unexpected happened. Please try again.', status: 500 },
      { status: 500 }
    )
  }
}

// --- DELETE: Remove a client ---

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const { id } = await params
    const { supabase, userId } = await getAuthenticatedClient()

    if (!supabase || !userId) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to remove this client.', status: 401 },
        { status: 401 }
      )
    }

    const { error, count } = await supabase
      .from('clients')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('[clients/[id]/DELETE] Delete failed:', error.message)
      return NextResponse.json(
        { data: null, error: 'We couldn\'t remove that client. Please try again.', status: 500 },
        { status: 500 }
      )
    }

    if (count === 0) {
      return NextResponse.json(
        { data: null, error: 'We couldn\'t find that client. They may have already been removed.', status: 404 },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { data: { deleted: true }, error: null, status: 200 },
      { status: 200 }
    )
  } catch (err) {
    console.error('[clients/[id]/DELETE] Unexpected error:', err)
    return NextResponse.json(
      { data: null, error: 'Something unexpected happened. Please try again.', status: 500 },
      { status: 500 }
    )
  }
}
