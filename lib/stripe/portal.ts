import { getStripe } from './client'
import type Stripe from 'stripe'

export async function createBillingPortalSession({
  customerId,
}: {
  customerId: string
}): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/dashboard`,
  })

  return session
}
