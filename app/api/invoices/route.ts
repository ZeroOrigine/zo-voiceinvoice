import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// ============================================================
// INVOICES — List & Create
// GET  /api/invoices?page=1&limit=20&status=draft
// POST /api/invoices  (create from voice transcript or manual)
// ============================================================

// --- Types ---

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

interface InvoiceRecord {
  id: string
  user_id: string
  client_id: string | null
  invoice_number: string
  status: string
  currency: string
  line_items: LineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string
  voice_transcript: string
  issue_date: string
  due_date: string
  paid_at: string | null
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

// --- Validation Schemas ---

const lineItemSchema = z.object({
  description: z.string().min(1, { message: 'Each line item needs a description' }),
  quantity: z.number().positive({ message: 'Quantity must be greater than zero' }),
  unit_price: z.number().min(0, { message: 'Unit price cannot be negative' }),
  amount: z.number().min(0, { message: 'Amount cannot be negative' }),
})

const createInvoiceSchema = z.object({
  client_id: z.string().uuid({ message: 'Please select a valid client' }).nullable().optional(),
  line_items: z.array(lineItemSchema).min(1, { message: 'An invoice needs at least one line item' }),
  tax_rate: z.number().min(0).max(100, { message: 'Tax rate must be between 0 and 100' }).optional().default(0),
  notes: z.string().max(2000, { message: 'Notes cannot exceed 2000 characters' }).optional().default(''),
  voice_transcript: z.string().max(10000, { message: 'Voice transcript is too long' }).optional().default(''),
  currency: z.string().length(3, { message: 'Currency must be a 3-letter code like USD' }).optional().default('USD'),
  issue_date: z.string().optional(),
  due_date: z.string().optional(),
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

// --- GET: List invoices with pagination ---

export async function GET(request: NextRequest): Promise<NextResponse<PaginatedResponse<InvoiceRecord>>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()
    if (!supabase || !userId) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to view your invoices.', status: 401 },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const statusFilter = searchParams.get('status')
    const offset = (page - 1) * limit

    let query = supabase
      .from('invoices')
      .select(
        'id, user_id, client_id, invoice_number, status, currency, line_items, subtotal, tax_rate, tax_amount, total, notes, voice_transcript, issue_date, due_date, paid_at, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: invoices, count, error } = await query

    if (error) {
      console.error('[invoices/GET] Query failed:', error.message)
      return NextResponse.json(
        { data: null, error: 'We couldn\'t load your invoices right now. Please try again.', status: 500 },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          items: (invoices || []) as InvoiceRecord[],
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
    console.error('[invoices/GET] Unexpected error:', err)
    return NextResponse.json(
      { data: null, error: 'Something unexpected happened. Please try again.', status: 500 },
      { status: 500 }
    )
  }
}

// --- POST: Create a new invoice ---

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<InvoiceRecord>>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()
    if (!supabase || !userId) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to create an invoice.', status: 401 },
        { status: 401 }
      )
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { data: null, error: 'We couldn\'t read your request. Please check the data and try again.', status: 400 },
        { status: 400 }
      )
    }

    const validation = createInvoiceSchema.safeParse(body)
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

    // Calculate totals from line items
    const subtotal = input.line_items.reduce((sum, item) => sum + item.amount, 0)
    const taxAmount = Math.round(subtotal * (input.tax_rate / 100) * 100) / 100
    const total = Math.round((subtotal + taxAmount) * 100) / 100

    // Generate invoice number using the database function
    const { data: invoiceNumberResult, error: numberError } = await supabase
      .rpc('generate_invoice_number', { p_user_id: userId })

    if (numberError) {
      console.error('[invoices/POST] Invoice number generation failed:', numberError.message)
      return NextResponse.json(
        { data: null, error: 'We couldn\'t generate an invoice number. Please try again.', status: 500 },
        { status: 500 }
      )
    }

    const invoiceNumber = invoiceNumberResult as string

    // Insert the invoice
    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        client_id: input.client_id || null,
        invoice_number: invoiceNumber,
        status: 'draft',
        currency: input.currency,
        line_items: input.line_items,
        subtotal,
        tax_rate: input.tax_rate,
        tax_amount: taxAmount,
        total,
        notes: input.notes,
        voice_transcript: input.voice_transcript,
        issue_date: input.issue_date || new Date().toISOString().split('T')[0],
        due_date: input.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })
      .select(
        'id, user_id, client_id, invoice_number, status, currency, line_items, subtotal, tax_rate, tax_amount, total, notes, voice_transcript, issue_date, due_date, paid_at, created_at, updated_at'
      )
      .single()

    if (insertError) {
      console.error('[invoices/POST] Insert failed:', insertError.message)
      return NextResponse.json(
        { data: null, error: 'We couldn\'t create your invoice. Please try again.', status: 500 },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { data: invoice as InvoiceRecord, error: null, status: 201 },
      { status: 201 }
    )
  } catch (err) {
    console.error('[invoices/POST] Unexpected error:', err)
    return NextResponse.json(
      { data: null, error: 'Something unexpected happened. Please try again.', status: 500 },
      { status: 500 }
    )
  }
}
