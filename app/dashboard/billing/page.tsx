'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PLANS, formatPrice, type PlanConfig } from '@/lib/stripe/config'

interface SubscriptionData {
  plan: string
  status: string
  current_period_end: string | null
  cancel_at: string | null
  stripe_customer_id: string
}

export default function BillingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [error, setError] = useState<string | null>(null)
  const [invoiceCount, setInvoiceCount] = useState(0)
  const [clientCount, setClientCount] = useState(0)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Load subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan, status, current_period_end, cancel_at, stripe_customer_id')
        .eq('user_id', user.id)
        .single()

      setSubscription(sub)

      // Load usage counts for the current month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: invCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString())

      setInvoiceCount(invCount || 0)

      const { count: cliCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setClientCount(cliCount || 0)

      setLoading(false)
    }

    loadData()
  }, [supabase, router])

  async function handleCheckout(plan: PlanConfig) {
    if (!plan.prices) return
    const priceId = billingPeriod === 'monthly'
      ? plan.prices.monthly.stripePriceId
      : plan.prices.yearly.stripePriceId

    setCheckoutLoading(plan.slug)
    setError(null)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, planSlug: plan.slug }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Could not start checkout. Please try again.')
        setCheckoutLoading(null)
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setCheckoutLoading(null)
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Could not open billing portal.')
        setPortalLoading(false)
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setPortalLoading(false)
    }
  }

  const currentPlan = subscription?.plan || 'free'
  const currentPlanConfig = PLANS[currentPlan]
  const isActive = !subscription || subscription.status === 'active' || subscription.status === 'trialing'

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-100 rounded w-72" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-gray-100 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back to Dashboard */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to dashboard
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">
          Billing & Plans
        </h1>
        <p className="text-gray-600">
          Manage your subscription and see your usage.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Current Plan Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-display text-lg font-bold text-gray-900">
                Current Plan: {currentPlanConfig?.name || 'Free'}
              </h2>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {subscription?.status || 'active'}
              </span>
            </div>
            {subscription?.current_period_end && (
              <p className="text-sm text-gray-500">
                {subscription.cancel_at
                  ? `Cancels on ${new Date(subscription.cancel_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                  : `Renews on ${new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                }
              </p>
            )}
          </div>
          {subscription?.stripe_customer_id && (
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {portalLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Opening...
                </span>
              ) : (
                'Manage Billing'
              )}
            </button>
          )}
        </div>

        {/* Usage Meters */}
        {currentPlanConfig && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Invoices this month */}
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Invoices this month</span>
                <span className="text-sm font-bold text-gray-900">
                  {invoiceCount}{currentPlanConfig.limits.invoicesPerMonth > 0 ? ` / ${currentPlanConfig.limits.invoicesPerMonth}` : ''}
                </span>
              </div>
              {currentPlanConfig.limits.invoicesPerMonth > 0 ? (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      invoiceCount / currentPlanConfig.limits.invoicesPerMonth > 0.8
                        ? 'bg-red-500'
                        : invoiceCount / currentPlanConfig.limits.invoicesPerMonth > 0.5
                        ? 'bg-yellow-500'
                        : 'bg-brand-500'
                    }`}
                    style={{ width: `${Math.min(100, (invoiceCount / currentPlanConfig.limits.invoicesPerMonth) * 100)}%` }}
                  />
                </div>
              ) : (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full bg-brand-500 w-1/12" />
                </div>
              )}
              {currentPlanConfig.limits.invoicesPerMonth > 0 && invoiceCount >= currentPlanConfig.limits.invoicesPerMonth && (
                <p className="mt-1 text-xs text-red-600 font-medium">Limit reached — upgrade to keep invoicing</p>
              )}
            </div>

            {/* Clients */}
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Saved clients</span>
                <span className="text-sm font-bold text-gray-900">
                  {clientCount}{currentPlanConfig.limits.clients > 0 ? ` / ${currentPlanConfig.limits.clients}` : ''}
                </span>
              </div>
              {currentPlanConfig.limits.clients > 0 ? (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      clientCount / currentPlanConfig.limits.clients > 0.8
                        ? 'bg-red-500'
                        : 'bg-brand-500'
                    }`}
                    style={{ width: `${Math.min(100, (clientCount / currentPlanConfig.limits.clients) * 100)}%` }}
                  />
                </div>
              ) : (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full bg-brand-500 w-1/12" />
                </div>
              )}
            </div>

            {/* Voice minutes */}
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Voice minutes</span>
                <span className="text-sm font-bold text-gray-900">
                  {currentPlanConfig.limits.voiceMinutesPerMonth > 0
                    ? `${currentPlanConfig.limits.voiceMinutesPerMonth} min/mo`
                    : 'Unlimited'
                  }
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="h-2 rounded-full bg-brand-500 w-1/12" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Billing Period Toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>
          Monthly
        </span>
        <button
          onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          style={{ backgroundColor: billingPeriod === 'yearly' ? '#2563eb' : '#d1d5db' }}
          role="switch"
          aria-checked={billingPeriod === 'yearly'}
          aria-label="Toggle yearly billing"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
              billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${billingPeriod === 'yearly' ? 'text-gray-900' : 'text-gray-400'}`}>
          Yearly
        </span>
        {billingPeriod === 'yearly' && (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            Save ~17%
          </span>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.values(PLANS).map((plan) => {
          const isCurrentPlan = currentPlan === plan.slug
          const price = plan.prices
            ? billingPeriod === 'monthly'
              ? plan.prices.monthly.amount
              : plan.prices.yearly.amount
            : 0
          const monthlyEquivalent = plan.prices
            ? billingPeriod === 'yearly'
              ? Math.round(plan.prices.yearly.amount / 12)
              : plan.prices.monthly.amount
            : 0

          return (
            <div
              key={plan.slug}
              className={`relative rounded-2xl border-2 p-6 transition-all ${
                plan.highlighted
                  ? 'border-brand-600 shadow-lg shadow-brand-600/10'
                  : 'border-gray-200 shadow-sm'
              } ${isCurrentPlan ? 'ring-2 ring-brand-600 ring-offset-2' : ''}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <span className="inline-flex items-center rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white">
                    Current Plan
                  </span>
                </div>
              )}

              <h3 className="font-display text-lg font-bold text-gray-900 mb-1">
                {plan.name}
              </h3>
              <p className="text-sm text-gray-500 mb-4 min-h-[40px]">
                {plan.description}
              </p>

              <div className="mb-6">
                {plan.prices ? (
                  <>
                    <span className="font-display text-4xl font-bold text-gray-900">
                      {formatPrice(monthlyEquivalent)}
                    </span>
                    <span className="text-sm text-gray-500">/mo</span>
                    {billingPeriod === 'yearly' && (
                      <p className="text-xs text-gray-400 mt-1">
                        {formatPrice(price)} billed yearly
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <span className="font-display text-4xl font-bold text-gray-900">$0</span>
                    <span className="text-sm text-gray-500">/mo</span>
                    <p className="text-xs text-gray-400 mt-1">Free forever</p>
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-400 cursor-not-allowed"
                  >
                    Your current plan
                  </button>
                ) : plan.prices ? (
                  <button
                    onClick={() => handleCheckout(plan)}
                    disabled={!!checkoutLoading}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      plan.highlighted
                        ? 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'
                        : 'border border-brand-600 text-brand-600 hover:bg-brand-50'
                    }`}
                  >
                    {checkoutLoading === plan.slug ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Redirecting to checkout...
                      </span>
                    ) : (
                      `Get ${plan.name} — ${formatPrice(monthlyEquivalent)}/mo`
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-500 cursor-not-allowed"
                  >
                    Free forever
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <div className="mt-12 bg-gray-50 rounded-2xl p-6">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Common questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Can I cancel anytime?</h3>
            <p className="text-sm text-gray-600 mt-1">Yes! Cancel from the billing portal. You'll keep access until the end of your billing period.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">What happens when I hit my invoice limit?</h3>
            <p className="text-sm text-gray-600 mt-1">You can still view and manage existing invoices. To create new ones, upgrade your plan or wait for the next billing cycle.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Can I switch plans?</h3>
            <p className="text-sm text-gray-600 mt-1">Absolutely. Upgrade or downgrade anytime. We'll prorate the difference automatically.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Is my payment information secure?</h3>
            <p className="text-sm text-gray-600 mt-1">We never see or store your card details. All payments are processed securely by Stripe, which is PCI Level 1 certified.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
