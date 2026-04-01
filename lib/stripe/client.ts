import Stripe from 'stripe'

// ============================================================
// CANONICAL Stripe client — single API version across the app
// ============================================================

const STRIPE_API_VERSION = '2025-02-24.acacia' as const

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error(
        'Missing STRIPE_SECRET_KEY environment variable. ' +
        'Set it in your .env.local file or hosting environment variables.'
      )
    }
    _stripe = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    })
  }
  return _stripe
}
