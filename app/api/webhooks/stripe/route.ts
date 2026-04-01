import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// ============================================================
// STRIPE WEBHOOK — CANONICAL VERSION
// Handles subscription lifecycle events.
// Verifies signature, processes events, updates subscriptions table.
// Uses Supabase service role client (bypasses RLS).
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

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase service role credentials')
  }
  return createClient(url, serviceKey)
}

function mapStripeStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    trialing: 'trialing',
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete_expired',
    paused: 'paused',
  }
  return statusMap[stripeStatus] || 'active'
}

async function upsertSubscription(
  subscription: Stripe.Subscription,
  customerId: string
) {
  const supabase = getSupabaseAdmin()

  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  let userId = existingSubscription?.user_id

  if (!userId) {
    const stripe = getStripe()
    const customer = await stripe.customers.retrieve(customerId)
    if (customer.deleted) return
    userId = (customer as Stripe.Customer).metadata?.user_id
  }

  if (!userId && subscription.metadata?.userId) {
    userId = subscription.metadata.userId
  }

  if (!userId) {
    console.error('[webhook] Cannot find user_id for customer:', customerId)
    return
  }

  const planName = subscription.items.data[0]?.price?.lookup_key
    || subscription.items.data[0]?.price?.nickname
    || 'pro'

  const subscriptionData = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan: planName,
    status: mapStripeStatus(subscription.status),
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at: subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000).toISOString()
      : null,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('subscriptions')
    .upsert(subscriptionData, { onConflict: 'user_id' })

  if (error) {
    console.error('[webhook] Failed to upsert subscription:', error.message)
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const supabase = getSupabaseAdmin()
  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id
  const userId = session.client_reference_id || session.metadata?.user_id || session.metadata?.userId

  if (!customerId || !userId) {
    console.error('[webhook] checkout.session.completed missing customer or user_id')
    return
  }

  if (subscriptionId) {
    const stripe = getStripe()
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    await upsertSubscription(subscription, customerId)
  } else {
    const { error } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        stripe_payment_intent_id: typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || '',
        amount: (session.amount_total || 0) / 100,
        currency: session.currency || 'usd',
        method: 'stripe_checkout',
        notes: 'One-time payment via Stripe Checkout',
      })

    if (error) {
      console.error('[webhook] Failed to record payment:', error.message)
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = getSupabaseAdmin()
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id

  if (!customerId) return

  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('[webhook] Failed to update subscription on payment failure:', error.message)
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const supabase = getSupabaseAdmin()
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id

  if (!customerId) return

  await supabase
    .from('subscriptions')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('stripe_customer_id', customerId)
    .eq('status', 'past_due')
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[webhook] Missing STRIPE_WEBHOOK_SECRET')
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[webhook] Signature verification failed:', message)
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const cid = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        await upsertSubscription(sub, cid)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const cid = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        await upsertSubscription(sub, cid)
        break
      }
      case 'invoice.payment_failed': {
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      }
      case 'invoice.paid': {
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      }
      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[webhook] Error processing ${event.type}:`, message)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
