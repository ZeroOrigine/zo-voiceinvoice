'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useDashboard } from '../layout'

// ============================================================
// INVOICES LIST — All invoices with status filter
// ============================================================

interface Invoice {
  id: string
  invoice_number: string
  status: string
  total: number
  currency: string
  client_id: string | null
  issue_date: string
  due_date: string
  created_at: string
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

const statusFilters = ['all', 'draft', 'sent', 'viewed', 'paid', 'overdue', 'void']

export default function InvoicesPage() {
  const { showToast } = useDashboard()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadInvoices()
  }, [filter])

  async function loadInvoices() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (filter !== 'all') params.set('status', filter)
      const res = await fetch(`/api/invoices?${params}`)
      const json = await res.json()
      if (json.data) {
        setInvoices(json.data.items)
        setTotal(json.data.total)
      }
    } catch {
      showToast('error', 'Couldn\'t load invoices. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">{total} invoice{total !== 1 ? 's' : ''} total</p>
        </div>
        <Link href="/dashboard/invoices/new" className="btn-primary gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          New Voice Invoice
        </Link>
      </div>

      {/* Status Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === s
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between border-b border-gray-100 px-5 py-4 last:border-0">
              <div className="space-y-2">
                <div className="h-4 w-24 rounded skeleton" />
                <div className="h-3 w-40 rounded skeleton" />
              </div>
              <div className="h-5 w-20 rounded skeleton" />
            </div>
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            {filter === 'all' ? 'No invoices yet' : `No ${filter} invoices`}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {filter === 'all' ? 'Create your first invoice with your voice' : 'Try a different filter'}
          </p>
          {filter === 'all' && (
            <Link href="/dashboard/invoices/new" className="btn-primary mt-6 gap-2">
              Create your first invoice
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {invoices.map((invoice) => (
            <Link
              key={invoice.id}
              href={`/dashboard/invoices/${invoice.id}`}
              className="flex items-center justify-between border-b border-gray-100 px-5 py-4 last:border-0 transition-colors hover:bg-gray-50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{invoice.invoice_number}</span>
                  <StatusBadge status={invoice.status} />
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  Issued {new Date(invoice.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' · '}
                  Due {new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <span className="text-sm font-bold text-gray-900 ml-4">{formatCurrency(Number(invoice.total))}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
