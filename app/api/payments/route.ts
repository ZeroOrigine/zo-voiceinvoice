import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// ============================================================
// PAYMENTS — List & Record payments
// GET  /api/payments?page=1&limit=20
// POST /api/payments  (manually record a payment against an invoice)
// ============================================================

// --- Types ---

interface PaymentRecord {
  id: string
  user_id: string
  invoice_id: string | null
  stripe_payment_intent_id: string
  amount: number
  currency: string
  method: string
  notes: string
  paid_at: string
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

const createPaymentSchema = z.object({
  invoice_id: z.string().uuid({ message: 'Please select a valid invoice' }),
  amount: z.number().positive({ message: 'Payment amount must be greater than zero' }),
  currency: z.string().length(3, { message: 'Currency must be a 3-letter code like USD' }).optional().default('USD'),
  method: z.string().min(1, { message: 'Please specify the payment method' }).max(100, { message: 'Payment method is too long' }),
  notes: z.string().max(2000, { message: 'Notes cannot exceed 2000 characters' }).optional().default(''),
  paid_at: z.string().optional(),
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

  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    return { supabase: null, userId: null }
  }

  return { supabase, userId: session.user.id }
}

const SELECT_COLUMNS = 'id, user_id, invoice_id, stripe_payment_intent_id, amount, currency, method, notes, paid_at, created_at, updated_at'

// --- GET: List payments ---

export async function GET(request: NextRequest): Promise<NextResponse<PaginatedResponse<PaymentRecord>>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()
    if (!supabase || !userId) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to view your payments.', status: 401 },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const offset = (page - 1) * limit

    const { data: payments, count, error } = await supabase
      .from('payments')
      .select(SELECT_COLUMNS, { count: 'exact' })
      .eq('user_id', userId)
      .order('paid_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[payments/GET] Query failed:', error.message)
      return NextResponse.json(
        { data: null, error: 'We couldn\'t load your payments right now. Please try again.', status: 500 },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          items: (payments || []) as PaymentRecord[],
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
    console.error('[payments/GET] Unexpected error:', err)
    return NextResponse.json(
      { data: null, error: 'Something unexpected happened. Please try again.', status: 500 },
      { status: 500 }
    )
  }
}

// --- POST: Record a manual payment ---

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<PaymentRecord>>> {
  try {
    const { supabase, userId } = await getAuthenticatedClient()
    if (!supabase || !userId) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to record a payment.', status: 401 },
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

    const validation = createPaymentSchema.safeParse(body)
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

    // Verify the invoice belongs to this user
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, user_id, status')
      .eq('id', input.invoice_id)
      .eq('user_id', userId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { data: null, error: 'We couldn\'t find that invoice. Please check and try again.', status: 404 },
        { status: 404 }
      )
    }

    if (invoice.status === 'void') {
      return NextResponse.json(
        { data: null, error: 'This invoice has been voided and can\'t accept payments.', status: 400 },
        { status: 400 }
      )
    }

    if (invoice.status === 'paid') {
      return NextResponse.json(
        { data: null, error: 'This invoice has already been paid.', status: 400 },
        { status: 400 }
      )
    }

    // Insert the payment
    const { data: payment, error: insertError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        invoice_id: input.invoice_id,
        stripe_payment_intent_id: '',
        amount: input.amount,
        currency: input.currency,
        method: input.method,
        notes: input.notes,
        paid_at: input.paid_at || new Date().toISOString(),
      })
      .select(SELECT_COLUMNS)
      .single()

    if (insertError) {
      console.error('[payments/POST] Insert failed:', insertError.message)
      return NextResponse.json(
        { data: null, error: 'We couldn\'t record this payment. Please try again.', status: 500 },
        { status: 500 }
      )
    }

    // Mark the invoice as paid using the database function
    await supabase.rpc('mark_invoice_paid', {
      p_invoice_id: input.invoice_id,
      p_user_id: userId,
    })

    return NextResponse.json(
      { data: payment as PaymentRecord, error: null, status: 201 },
      { status: 201 }
    )
  } catch (err) {
    console.error('[payments/POST] Unexpected error:', err)
    return NextResponse.json(
      { data: null, error: 'Something unexpected happened. Please try again.', status: 500 },
      { status: 500 }
    )
  }
}
