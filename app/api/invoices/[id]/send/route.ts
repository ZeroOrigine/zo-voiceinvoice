import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// SEND INVOICE — Mark an invoice as sent
// POST /api/invoices/[id]/send
// In v1 this updates the status. Email delivery is a future feature.
// ============================================================

// --- Types ---

interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
}

interface InvoiceSendResult {
  id: string
  invoice_number: string
  status: string
  client_email: string | null
}

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

// --- POST: Send an invoice ---

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<InvoiceSendResult>>> {
  try {
    const { id } = await params
    const { supabase, userId } = await getAuthenticatedClient()

    if (!supabase || !userId) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to send this invoice.', status: 401 },
        { status: 401 }
      )
    }

    // Fetch the invoice to validate it can be sent
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, client_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json(
        { data: null, error: 'We couldn\'t find that invoice.', status: 404 },
        { status: 404 }
      )
    }

    if (invoice.status === 'void') {
      return NextResponse.json(
        { data: null, error: 'This invoice has been voided and can\'t be sent.', status: 400 },
        { status: 400 }
      )
    }

    if (invoice.status === 'paid') {
      return NextResponse.json(
        { data: null, error: 'This invoice has already been paid.', status: 400 },
        { status: 400 }
      )
    }

    // Get client email if a client is attached
    let clientEmail: string | null = null
    if (invoice.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('email')
        .eq('id', invoice.client_id)
        .single()

      clientEmail = client?.email || null
    }

    // Update invoice status to 'sent'
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ status: 'sent' })
      .eq('id', id)
      .eq('user_id', userId)

    if (updateError) {
      console.error('[invoices/[id]/send/POST] Update failed:', updateError.message)
      return NextResponse.json(
        { data: null, error: 'We couldn\'t mark this invoice as sent. Please try again.', status: 500 },
        { status: 500 }
      )
    }

    // In v1, we mark as sent. Email delivery is a future feature.
    // When email is added, it will send to clientEmail here.

    return NextResponse.json(
      {
        data: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          status: 'sent',
          client_email: clientEmail,
        },
        error: null,
        status: 200,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('[invoices/[id]/send/POST] Unexpected error:', err)
    return NextResponse.json(
      { data: null, error: 'Something unexpected happened. Please try again.', status: 500 },
      { status: 500 }
    )
  }
}
