import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// ============================================================
// INVOICE BY ID — Get, Update, Delete a single invoice
// GET    /api/invoices/[id]
// PATCH  /api/invoices/[id]
// DELETE /api/invoices/[id]
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

// --- Validation Schemas ---

const lineItemSchema = z.object({
  description: z.string().min(1, { message: 'Each line item needs a description' }),
  quantity: z.number().positive({ message: 'Quantity must be greater than zero' }),
  unit_price: z.number().min(0, { message: 'Unit price cannot be negative' }),
  amount: z.number().min(0, { message: 'Amount cannot be negative' }),
})

const updateInvoiceSchema = z.object({
  client_id: z.string().uuid({ message: 'Please select a valid client' }).nullable().optional(),
  status: z.enum(['draft', 'sent', 'viewed', 'paid', 'overdue', 'void'], {
    errorMap: () => ({ message: 'Please choose a valid invoice status' }),
  }).optional(),
  line_items: z.array(lineItemSchema).min(1, { message: 'An invoice needs at least one line item' }).optional(),
  tax_rate: z.number().min(0).max(100, { message: 'Tax rate must be between 0 and 100' }).optional(),
  notes: z.string().max(2000, { message: 'Notes cannot exceed 2000 characters' }).optional(),
  voice_transcript: z.string().max(10000, { message: 'Voice transcript is too long' }).optional(),
  currency: z.string().length(3, { message: 'Currency must be a 3-letter code like USD' }).optional(),
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

const SELECT_COLUMNS = 'id, user_id, client_id, invoice_number, status, currency, line_items, subtotal, tax_rate, tax_amount, total, notes, voice_transcript, issue_date, due_date, paid_at, created_at, updated_at'

// --- GET: Fetch a single invoice ---

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<InvoiceRecord>>> {
  try {
    const { id } = await params
    const { supabase, userId } = await getAuthenticatedClient()

    if (!supabase || !userId) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to view this invoice.', status: 401 },
        { status: 401 }
      )
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(SELECT_COLUMNS)
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error || !invoice) {
      return NextResponse.json(
        { data: null, error: 'We couldn\'t find that invoice. It may have been deleted.', status: 404 },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { data: invoice as InvoiceRecord, error: null, status: 200 },
      { status: 200 }
    )
  } catch (err) {
    console.error('[invoices/[id]/GET] Unexpected error:', err)
    return NextResponse.json(
      { data: null, error: 'Something unexpected happened. Please try again.', status: 500 },
      { status: 500 }
    )
  }
}

// --- PATCH: Update an invoice ---

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<InvoiceRecord>>> {
  try {
    const { id } = await params
    const { supabase, userId } = await getAuthenticatedClient()

    if (!supabase || !userId) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to update this invoice.', status: 401 },
        { status: 401 }
      )
    }

    // Parse and validate
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { data: null, error: 'We couldn\'t read your request. Please check the data and try again.', status: 400 },
        { status: 400 }
      )
    }

    const validation = updateInvoiceSchema.safeParse(body)
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

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (input.client_id !== undefined) updateData.client_id = input.client_id
    if (input.status !== undefined) updateData.status = input.status
    if (input.notes !== undefined) updateData.notes = input.notes
    if (input.voice_transcript !== undefined) updateData.voice_transcript = input.voice_transcript
    if (input.currency !== undefined) updateData.currency = input.currency
    if (input.issue_date !== undefined) updateData.issue_date = input.issue_date
    if (input.due_date !== undefined) updateData.due_date = input.due_date
    if (input.tax_rate !== undefined) updateData.tax_rate = input.tax_rate

    // Recalculate totals if line items or tax rate changed
    if (input.line_items) {
      updateData.line_items = input.line_items
      const subtotal = input.line_items.reduce((sum, item) => sum + item.amount, 0)
      const taxRate = input.tax_rate ?? 0
      const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
      const total = Math.round((subtotal + taxAmount) * 100) / 100

      updateData.subtotal = subtotal
      updateData.tax_amount = taxAmount
      updateData.total = total
    } else if (input.tax_rate !== undefined) {
      // Tax rate changed but line items didn't — fetch current subtotal
      const { data: currentInvoice } = await supabase
        .from('invoices')
        .select('subtotal')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (currentInvoice) {
        const subtotal = Number(currentInvoice.subtotal)
        const taxAmount = Math.round(subtotal * (input.tax_rate / 100) * 100) / 100
        updateData.tax_amount = taxAmount
        updateData.total = Math.round((subtotal + taxAmount) * 100) / 100
      }
    }

    // Handle paid status
    if (input.status === 'paid') {
      updateData.paid_at = new Date().toISOString()
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { data: null, error: 'Nothing to update. Please provide at least one field to change.', status: 400 },
        { status: 400 }
      )
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select(SELECT_COLUMNS)
      .single()

    if (error || !invoice) {
      console.error('[invoices/[id]/PATCH] Update failed:', error?.message)
      return NextResponse.json(
        { data: null, error: 'We couldn\'t update that invoice. It may have been deleted.', status: 404 },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { data: invoice as InvoiceRecord, error: null, status: 200 },
      { status: 200 }
    )
  } catch (err) {
    console.error('[invoices/[id]/PATCH] Unexpected error:', err)
    return NextResponse.json(
      { data: null, error: 'Something unexpected happened. Please try again.', status: 500 },
      { status: 500 }
    )
  }
}

// --- DELETE: Remove an invoice ---

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const { id } = await params
    const { supabase, userId } = await getAuthenticatedClient()

    if (!supabase || !userId) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to delete this invoice.', status: 401 },
        { status: 401 }
      )
    }

    const { error, count } = await supabase
      .from('invoices')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('[invoices/[id]/DELETE] Delete failed:', error.message)
      return NextResponse.json(
        { data: null, error: 'We couldn\'t delete that invoice. Please try again.', status: 500 },
        { status: 500 }
      )
    }

    if (count === 0) {
      return NextResponse.json(
        { data: null, error: 'We couldn\'t find that invoice. It may have already been deleted.', status: 404 },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { data: { deleted: true }, error: null, status: 200 },
      { status: 200 }
    )
  } catch (err) {
    console.error('[invoices/[id]/DELETE] Unexpected error:', err)
    return NextResponse.json(
      { data: null, error: 'Something unexpected happened. Please try again.', status: 500 },
      { status: 500 }
    )
  }
}
