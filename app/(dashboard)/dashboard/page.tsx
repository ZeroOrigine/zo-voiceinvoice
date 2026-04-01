'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useDashboard } from './layout'

// ============================================================
// DASHBOARD HOME — Revenue overview + recent invoices
// The first thing a user sees after login.
// Shows value immediately: your money at a glance.
// ============================================================

interface DashboardStats {
  total_invoices: number
  total_revenue: number
  outstanding_amount: number
  overdue_count: number
}

interface Invoice {
  id: string
  invoice_number: string
  status: string
  total: number
  client_id: string | null
  issue_date: string
  due_date: string
  created_at: string
}

function StatCard({ label, value, subtext, color }: { label: string; value: string; subtext?: string; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</p>
      {subtext && <p className="mt-1 text-xs text-gray-400">{subtext}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    viewed: 'bg-purple-100 text-purple-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    void: 'bg-gray-100 text-gray-400',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export default function DashboardPage() {
  const { user } = useDashboard()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, invoicesRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/invoices?limit=5'),
        ])
        const statsJson = await statsRes.json()
        const invoicesJson = await invoicesRes.json()

        if (statsJson.data) setStats(statsJson.data)
        if (invoicesJson.data?.items) setInvoices(invoicesJson.data.items)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const greeting = user?.full_name
    ? `Welcome back, ${user.full_name.split(' ')[0]}!`
    : 'Welcome back!'

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">{greeting}</h1>
        <p className="mt-1 text-sm text-gray-500">Here's how your invoicing is going</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="h-4 w-20 rounded skeleton mb-2" />
              <div className="h-7 w-28 rounded skeleton" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(stats.total_revenue)}
            subtext="From paid invoices"
            color="text-green-600"
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(stats.outstanding_amount)}
            subtext="Waiting for payment"
            color="text-amber-600"
          />
          <StatCard
            label="Total Invoices"
            value={stats.total_invoices.toString()}
            subtext="All time"
            color="text-gray-900"
          />
          <StatCard
            label="Overdue"
            value={stats.overdue_count.toString()}
            subtext={stats.overdue_count > 0 ? 'Need attention' : 'All clear!'}
            color={stats.overdue_count > 0 ? 'text-red-600' : 'text-green-600'}
          />
        </div>
      ) : null}

      {/* Quick Action */}
      <div className="mb-8 rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 to-blue-50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create an invoice with your voice</h2>
            <p className="mt-1 text-sm text-gray-600">Tap the mic, describe your work, and we'll handle the rest</p>
          </div>
          <Link
            href="/dashboard/invoices/new"
            className="btn-primary gap-2 whitespace-nowrap"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            New Voice Invoice
          </Link>
        </div>
      </div>

      {/* Recent Invoices */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Recent Invoices</h2>
          <Link href="/dashboard/invoices" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between border-b border-gray-100 px-5 py-4 last:border-0">
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded skeleton" />
                  <div className="h-3 w-32 rounded skeleton" />
                </div>
                <div className="h-5 w-16 rounded skeleton" />
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
              <svg className="h-8 w-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Your first invoice is a voice away</h3>
            <p className="mt-2 text-sm text-gray-500">Tap the mic, describe your work, and watch the magic happen</p>
            <Link href="/dashboard/invoices/new" className="btn-primary mt-6 gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create your first invoice
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/dashboard/invoices/${invoice.id}`}
                className="flex items-center justify-between border-b border-gray-100 px-5 py-4 last:border-0 transition-colors hover:bg-gray-50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{invoice.invoice_number}</span>
                    <StatusBadge status={invoice.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Due {new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(Number(invoice.total))}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
