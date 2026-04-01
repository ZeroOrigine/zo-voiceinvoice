import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'

// ============================================================
// CHECKOUT — CANONICAL VERSION
// Accepts both price_id and priceId for compatibility.
// POST /api/checkout
// ============================================================

const STRIPE_API_VERSION = '2024-06-20' as const

let stripeInstance: Stripe | null = null
function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('Missing STRIPE_SECRET_KEY')
    stripeInstance = new Stripe(key, { apiVersion: STRIPE_API_VERSION })
  }
  return stripeInstance
}

const checkoutSchema = z.object({
  price_id: z.string().min(1).optional(),
  priceId: z.string().min(1).optional(),
  planSlug: z.string().optional(),
}).refine(
  (data) => data.price_id || data.priceId,
  { message: 'Please select a plan to continue' }
)

async function getAuthenticatedClient() {
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
          } catch { /* ignored in server component */ }
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { supabase: null, user: null }
  }
  return { supabase, user }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient()
    if (!supabase || !user) {
      return NextResponse.json(
        { data: null, error: 'Please sign in to upgrade your plan.', status: 401 },
        { status: 401 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { data: null, error: 'Invalid request body.', status: 400 },
        { status: 400 }
      )
    }

    const validation = checkoutSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { data: null, error: validation.error.issues[0]?.message || 'Please select a plan.', status: 400 },
        { status: 400 }
      )
    }

    const priceId = validation.data.price_id || validation.data.priceId!
    const stripe = getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let customerId = existingSubscription?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { user_id: user.id },
      })
      customerId = customer.id

      await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          plan: 'free',
          status: 'active',
        }, { onConflict: 'user_id' })
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard?checkout=canceled`,
      client_reference_id: user.id,
      metadata: { user_id: user.id, userId: user.id },
      subscription_data: { metadata: { userId: user.id } },
      allow_promotion_codes: true,
    })

    if (!checkoutSession.url) {
      return NextResponse.json(
        { data: null, error: 'Could not create checkout session.', status: 500 },
        { status: 500 }
      )
    }

    // Return both formats for compatibility
    return NextResponse.json(
      { data: { checkout_url: checkoutSession.url }, url: checkoutSession.url, error: null, status: 200 },
      { status: 200 }
    )
  } catch (err) {
    console.error('[checkout/POST] Unexpected error:', err)
    return NextResponse.json(
      { data: null, error: 'Something unexpected happened. Please try again.', status: 500 },
      { status: 500 }
    )
  }
}
