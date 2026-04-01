'use client'

import { useState, useEffect } from 'react'
import { useDashboard } from '../layout'

// ============================================================
// BILLING — Subscription management
// ============================================================

interface Subscription {
  plan: string
  status: string
  current_period_end: string | null
  cancel_at: string | null
}

export default function BillingPage() {
  const { showToast } = useDashboard()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    async function loadSubscription() {
      try {
        const res = await fetch('/api/profile')
        const json = await res.json()
        if (json.data) {
          // We don't have a direct subscription endpoint, so we check the profile
          // In a real app, we'd have /api/subscription
          setSubscription({
            plan: 'free',
            status: 'active',
            current_period_end: null,
            cancel_at: null,
          })
        }
      } catch {
        showToast('error', 'Couldn\'t load billing info.')
      } finally {
        setLoading(false)
      }
    }
    loadSubscription()
  }, [])

  async function handleUpgrade() {
    setUpgrading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_placeholder',
        }),
      })
      const json = await res.json()
      if (json.data?.checkout_url) {
        window.location.href = json.data.checkout_url
      } else {
        showToast('error', json.error || 'Couldn\'t start checkout. Please try again.')
      }
    } catch {
      showToast('error', 'Something went wrong. Please try again.')
    } finally {
      setUpgrading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="h-8 w-32 rounded skeleton" />
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="h-6 w-40 rounded skeleton" />
          <div className="h-4 w-64 rounded skeleton" />
        </div>
      </div>
    )
  }

  const isPro = subscription?.plan === 'pro'

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your subscription</p>
      </div>

      {/* Current Plan */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{isPro ? 'Pro' : 'Free'} Plan</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isPro ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {subscription?.status === 'active' ? 'Active' : subscription?.status || 'Active'}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {isPro
                ? 'Unlimited invoices, clients, and analytics'
                : '5 invoices per month, up to 10 clients'
              }
            </p>
            {subscription?.current_period_end && (
              <p className="mt-2 text-xs text-gray-400">
                {subscription.cancel_at ? 'Cancels' : 'Renews'} on{' '}
                {new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-gray-900">{isPro ? '$19' : '$0'}</p>
            <p className="text-xs text-gray-500">/month</p>
          </div>
        </div>
      </div>

      {/* Upgrade CTA */}
      {!isPro && (
        <div className="rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 to-blue-50 p-6">
          <h3 className="text-lg font-bold text-gray-900">Upgrade to Pro</h3>
          <p className="mt-1 text-sm text-gray-600">Unlock unlimited invoices, clients, and revenue analytics</p>
          <ul className="mt-4 space-y-2">
            {[
              'Unlimited voice invoices',
              'Unlimited clients',
              'Revenue analytics dashboard',
              'Payment tracking',
              'Priority support',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                <svg className="h-4 w-4 flex-shrink-0 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="btn-primary mt-6"
          >
            {upgrading ? 'Redirecting to checkout...' : 'Get Pro — $19/mo'}
          </button>
        </div>
      )}

      {/* Pro management */}
      {isPro && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Manage Subscription</h3>
          <p className="text-sm text-gray-500">To update your payment method or cancel, contact us at support@voiceinvoice.com</p>
        </div>
      )}
    </div>
  )
}
