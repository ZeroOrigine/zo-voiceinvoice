import { getStripe } from './client'
import type Stripe from 'stripe'

export async function createCheckoutSession({
  userId,
  userEmail,
  priceId,
  customerId,
}: {
  userId: string
  userEmail: string
  priceId: string
  customerId?: string
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard?checkout=canceled`,
    client_reference_id: userId,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
    },
    allow_promotion_codes: true,
  }

  if (customerId) {
    sessionParams.customer = customerId
  } else {
    sessionParams.customer_email = userEmail
  }

  const session = await stripe.checkout.sessions.create(sessionParams)
  return session
}
