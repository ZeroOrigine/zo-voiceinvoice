import { getStripe } from './client'
import { createClient } from '@supabase/supabase-js'
import { getPlanByPriceId } from './config'
import type Stripe from 'stripe'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase service role credentials for webhook processing')
  }
  return createClient(url, key)
}

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  const stripe = getStripe()
  const supabase = getServiceClient()
  const userId = session.client_reference_id || session.metadata?.userId

  if (!userId) {
    console.error('No userId found in checkout session', session.id)
    return
  }

  const subscriptionId = session.subscription as string
  const customerId = session.customer as string

  if (!subscriptionId) {
    console.error('No subscription in checkout session', session.id)
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price.id
  const plan = getPlanByPriceId(priceId)

  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan: plan?.slug || 'pro',
        status: subscription.status as string,
        current_period_start: new Date(
          subscription.current_period_start * 1000
        ).toISOString(),
        current_period_end: new Date(
          subscription.current_period_end * 1000
        ).toISOString(),
        cancel_at: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : null,
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
      },
      {
        onConflict: 'user_id',
      }
    )

  if (error) {
    console.error('Error upserting subscription after checkout:', error)
    throw error
  }
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  const supabase = getServiceClient()
  const userId = subscription.metadata?.userId
  const customerId = subscription.customer as string

  if (!userId) {
    // Try to find user by customer ID
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (!existingSub) {
      console.error(
        'Cannot find user for subscription update:',
        subscription.id
      )
      return
    }

    const priceId = subscription.items.data[0]?.price.id
    const plan = getPlanByPriceId(priceId)

    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan: plan?.slug || 'pro',
        status: subscription.status as string,
        current_period_start: new Date(
          subscription.current_period_start * 1000
        ).toISOString(),
        current_period_end: new Date(
          subscription.current_period_end * 1000
        ).toISOString(),
        cancel_at: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : null,
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
      })
      .eq('user_id', existingSub.user_id)

    if (error) {
      console.error('Error updating subscription:', error)
      throw error
    }
    return
  }

  const priceId = subscription.items.data[0]?.price.id
  const plan = getPlanByPriceId(priceId)

  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        plan: plan?.slug || 'pro',
        status: subscription.status as string,
        current_period_start: new Date(
          subscription.current_period_start * 1000
        ).toISOString(),
        current_period_end: new Date(
          subscription.current_period_end * 1000
        ).toISOString(),
        cancel_at: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : null,
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
      },
      {
        onConflict: 'user_id',
      }
    )

  if (error) {
    console.error('Error upserting subscription on update:', error)
    throw error
  }
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  const supabase = getServiceClient()
  const customerId = subscription.customer as string

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Error marking subscription as canceled:', error)
    throw error
  }
}

export async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Log successful payment — useful for analytics and audit trail
  const supabase = getServiceClient()
  const customerId = invoice.customer as string

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!sub) {
    console.warn('Invoice paid but no matching subscription found:', invoice.id)
    return
  }

  // Update subscription status to active if it was past_due
  await supabase
    .from('subscriptions')
    .update({ status: 'active' })
    .eq('stripe_customer_id', customerId)
    .eq('status', 'past_due')
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = getServiceClient()
  const customerId = invoice.customer as string

  await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_customer_id', customerId)
}
