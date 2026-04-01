export interface PlanConfig {
  name: string
  slug: string
  description: string
  features: string[]
  limits: {
    invoicesPerMonth: number
    clients: number
    voiceMinutesPerMonth: number
  }
  prices: {
    monthly: {
      amount: number
      stripePriceId: string
    }
    yearly: {
      amount: number
      stripePriceId: string
    }
  } | null
  highlighted: boolean
}

export const PLANS: Record<string, PlanConfig> = {
  free: {
    name: 'Free',
    slug: 'free',
    description: 'Perfect for freelancers just getting started with voice invoicing.',
    features: [
      '5 invoices per month',
      '3 saved clients',
      '10 minutes of voice input per month',
      'PDF export',
      'Email invoices to clients',
      'Basic dashboard',
    ],
    limits: {
      invoicesPerMonth: 5,
      clients: 3,
      voiceMinutesPerMonth: 10,
    },
    prices: null,
    highlighted: false,
  },
  pro: {
    name: 'Pro',
    slug: 'pro',
    description: 'For growing businesses that invoice regularly.',
    features: [
      'Unlimited invoices',
      'Unlimited clients',
      '120 minutes of voice input per month',
      'PDF & branded export',
      'Recurring invoices',
      'Payment tracking',
      'Overdue reminders',
      'Priority support',
    ],
    limits: {
      invoicesPerMonth: -1,
      clients: -1,
      voiceMinutesPerMonth: 120,
    },
    prices: {
      monthly: {
        amount: 2900,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
      },
      yearly: {
        amount: 29000,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
      },
    },
    highlighted: true,
  },
  enterprise: {
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'For teams and agencies with high-volume invoicing needs.',
    features: [
      'Everything in Pro',
      'Unlimited voice input',
      'Team members (up to 10)',
      'Custom invoice templates',
      'API access',
      'Accounting integrations (QuickBooks, Xero)',
      'Dedicated account manager',
      '99.9% uptime SLA',
      'Data export in CSV/JSON',
    ],
    limits: {
      invoicesPerMonth: -1,
      clients: -1,
      voiceMinutesPerMonth: -1,
    },
    prices: {
      monthly: {
        amount: 9900,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_enterprise_monthly',
      },
      yearly: {
        amount: 99000,
        stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_enterprise_yearly',
      },
    },
    highlighted: false,
  },
}

export function getPlanBySlug(slug: string): PlanConfig | undefined {
  return PLANS[slug]
}

export function getPlanByPriceId(priceId: string): PlanConfig | undefined {
  return Object.values(PLANS).find(
    (plan) =>
      plan.prices?.monthly.stripePriceId === priceId ||
      plan.prices?.yearly.stripePriceId === priceId
  )
}

export function formatPrice(amountInCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amountInCents / 100)
}
