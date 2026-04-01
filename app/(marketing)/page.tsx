'use client'

import { useState } from 'react'
import Link from 'next/link'

// ============================================================
// LANDING PAGE — VoiceInvoice
// The 10x moment: user sees a live voice-to-invoice demo
// before signing up. They experience the magic FIRST.
// ============================================================

interface FeatureCardProps {
  icon: string
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-brand-200">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-600">{description}</p>
    </div>
  )
}

interface PricingCardProps {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  highlighted?: boolean
}

function PricingCard({ name, price, period, description, features, cta, highlighted }: PricingCardProps) {
  return (
    <div className={`rounded-2xl border p-8 transition-all ${
      highlighted
        ? 'border-brand-600 bg-brand-50/30 shadow-lg shadow-brand-100 ring-1 ring-brand-600'
        : 'border-gray-200 bg-white shadow-sm hover:shadow-md'
    }`}>
      {highlighted && (
        <span className="mb-4 inline-block rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
          Most Popular
        </span>
      )}
      <h3 className="text-xl font-bold text-gray-900">{name}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold text-gray-900">{price}</span>
        <span className="text-sm text-gray-500">{period}</span>
      </div>
      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-semibold transition-all ${
          highlighted
            ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        {cta}
      </Link>
    </div>
  )
}

function LiveDemoSection() {
  const [demoStep, setDemoStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const demoTranscript = '"Invoice Acme Corp for 10 hours of web development at $150 per hour, plus $200 for hosting setup. Due in 30 days."'

  const demoInvoice = {
    client: 'Acme Corp',
    number: 'VI-0001',
    items: [
      { description: 'Web Development', quantity: 10, rate: 150, amount: 1500 },
      { description: 'Hosting Setup', quantity: 1, rate: 200, amount: 200 },
    ],
    subtotal: 1700,
    total: 1700,
  }

  function runDemo() {
    if (isAnimating) return
    setIsAnimating(true)
    setDemoStep(1)
    setTimeout(() => setDemoStep(2), 1500)
    setTimeout(() => setDemoStep(3), 3000)
    setTimeout(() => setIsAnimating(false), 3500)
  }

  return (
    <section className="relative overflow-hidden bg-gray-50 py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">See it in action</h2>
          <p className="mt-3 text-lg text-gray-600">Click the microphone to watch voice become an invoice</p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {/* Voice Input Side */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Your voice
            </div>

            <div className="flex min-h-[120px] items-center justify-center">
              {demoStep === 0 && (
                <button
                  onClick={runDemo}
                  className="group relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all hover:bg-brand-700 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-brand-200"
                  aria-label="Start voice demo"
                >
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <span className="absolute -bottom-8 text-xs font-medium text-gray-500 group-hover:text-brand-600">Try it</span>
                </button>
              )}
              {demoStep >= 1 && (
                <div className="w-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-red-500">
                      <div className="absolute inset-0 rounded-full bg-red-400 voice-pulse" />
                      <svg className="relative h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-red-600">Listening...</span>
                  </div>
                  <p className="text-sm italic text-gray-700 leading-relaxed">{demoTranscript}</p>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Output Side */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generated invoice
            </div>

            {demoStep < 2 && (
              <div className="flex min-h-[120px] items-center justify-center">
                {demoStep === 0 && <p className="text-sm text-gray-400">Your invoice will appear here</p>}
                {demoStep === 1 && (
                  <div className="w-full space-y-3">
                    <div className="h-4 w-3/4 rounded skeleton" />
                    <div className="h-3 w-1/2 rounded skeleton" />
                    <div className="h-3 w-full rounded skeleton" />
                    <div className="h-3 w-2/3 rounded skeleton" />
                  </div>
                )}
              </div>
            )}

            {demoStep >= 2 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">{demoInvoice.number}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Draft</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">To: {demoInvoice.client}</p>
                <div className="border-t border-gray-100 pt-2">
                  {demoInvoice.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1 text-xs text-gray-700">
                      <span>{item.description} ({item.quantity} × ${item.rate})</span>
                      <span className="font-medium">${item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                  <span className="text-sm font-bold text-gray-900">Total</span>
                  <span className="text-lg font-extrabold text-brand-600">${demoInvoice.total.toLocaleString()}</span>
                </div>
                {demoStep >= 3 && (
                  <div className="flex gap-2 pt-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Ready to send
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {demoStep >= 3 && (
          <div className="mt-8 text-center">
            <p className="mb-4 text-sm text-gray-600">That took 3 seconds. Your old way takes 15 minutes.</p>
            <Link href="/signup" className="btn-primary text-base px-8 py-3.5">
              Create your first real invoice free →
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen">
      {/* ===== NAVIGATION ===== */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span className="font-display text-xl font-bold text-gray-900">VoiceInvoice</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900">Features</a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900">Pricing</a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900">Log in</Link>
            <Link href="/signup" className="btn-primary py-2 px-4 text-sm">Get Started Free</Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <a href="#features" className="text-sm font-medium text-gray-600" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#pricing" className="text-sm font-medium text-gray-600" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <hr className="border-gray-100" />
              <Link href="/login" className="text-sm font-medium text-gray-600">Log in</Link>
              <Link href="/signup" className="btn-primary text-center">Get Started Free</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/50 to-white py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            15 minutes → 3 seconds
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Speak it. <span className="text-brand-600">Send it.</span> Get paid.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
            Stop typing invoices. Just say what you did, who it's for, and how much — VoiceInvoice creates a professional invoice in seconds.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/signup" className="btn-primary w-full px-8 py-3.5 text-base sm:w-auto">
              Create your first invoice free
            </Link>
            <a href="#demo" className="btn-secondary w-full px-8 py-3.5 text-base sm:w-auto">
              Watch the demo ↓
            </a>
          </div>
          <p className="mt-4 text-xs text-gray-400">No credit card required · 5 free invoices/month</p>
        </div>
      </section>

      {/* ===== LIVE DEMO ===== */}
      <div id="demo">
        <LiveDemoSection />
      </div>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Everything you need to get paid faster</h2>
            <p className="mt-3 text-lg text-gray-600">Voice-first invoicing with all the professional touches</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon="🎙️"
              title="Voice-to-Invoice"
              description="Describe your work naturally. Our AI extracts client, line items, rates, and due dates from your words."
            />
            <FeatureCard
              icon="⚡"
              title="3-Second Creation"
              description="From speaking to a ready-to-send invoice in under 3 seconds. No forms, no templates, no friction."
            />
            <FeatureCard
              icon="👥"
              title="Smart Client Memory"
              description="VoiceInvoice remembers your clients. Say their name and it auto-fills their details next time."
            />
            <FeatureCard
              icon="📊"
              title="Revenue Dashboard"
              description="See your total revenue, outstanding invoices, and overdue payments at a glance. Know your numbers."
            />
            <FeatureCard
              icon="📤"
              title="One-Click Send"
              description="Send invoices directly to clients. Track when they view and pay. No more 'did you get my invoice?' emails."
            />
            <FeatureCard
              icon="💰"
              title="Payment Tracking"
              description="Record payments against invoices. See what's paid, what's pending, and what's overdue instantly."
            />
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Three seconds. Three steps.</h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { step: '1', title: 'Speak', desc: 'Tap the mic and describe your work. "Invoice Sarah for 5 hours of design at $120/hour."' },
              { step: '2', title: 'Review', desc: 'VoiceInvoice creates a professional invoice instantly. Edit anything with a tap.' },
              { step: '3', title: 'Send', desc: 'Hit send. Your client gets a clean invoice. You get paid faster.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Simple pricing. No surprises.</h2>
            <p className="mt-3 text-lg text-gray-600">Start free. Upgrade when you need more.</p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <PricingCard
              name="Free"
              price="$0"
              period="/month"
              description="Perfect for freelancers getting started"
              features={[
                '5 invoices per month',
                'Voice-to-invoice creation',
                'Up to 10 clients',
                'Basic dashboard',
                'Email support',
              ]}
              cta="Get Started Free"
            />
            <PricingCard
              name="Pro"
              price="$19"
              period="/month"
              description="For busy freelancers and small teams"
              features={[
                'Unlimited invoices',
                'Voice-to-invoice creation',
                'Unlimited clients',
                'Revenue analytics',
                'Payment tracking',
                'Priority support',
              ]}
              cta="Get Pro — $19/mo"
              highlighted
            />
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-gray-100 bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <span className="font-display text-sm font-bold text-gray-900">VoiceInvoice</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-700">Privacy</a>
              <a href="#" className="hover:text-gray-700">Terms</a>
              <a href="#" className="hover:text-gray-700">Contact</a>
            </div>
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} VoiceInvoice. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
