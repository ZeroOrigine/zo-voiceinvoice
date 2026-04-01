'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDashboard } from '../../layout'

// ============================================================
// INVOICE DETAIL — View, edit status, send, delete
// ============================================================

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

interface Invoice {
  id: string
  invoice_number: string
  status: string
  currency: string
  line_items: LineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string
  voice_transcript: string
  issue_date: string
  due_date: string
  paid_at: string | null
  client_id: string | null
  created_at: string
}

interface Client {
  id: string
  name: string
  email: string
  company: string
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
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useDashboard()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')

  useEffect(() => {
    loadInvoice()
  }, [params.id])

  async function loadInvoice() {
    try {
      const res = await fetch(`/api/invoices/${params.id}`)
      const json = await res.json()
      if (json.data) {
        setInvoice(json.data)
        if (json.data.client_id) {
          const clientRes = await fetch(`/api/clients/${json.data.client_id}`)
          const clientJson = await clientRes.json()
          if (clientJson.data) setClient(clientJson.data)
        }
      } else {
        showToast('error', json.error || 'Invoice not found.')
        router.push('/dashboard/invoices')
      }
    } catch {
      showToast('error', 'Couldn\'t load this invoice.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    setActionLoading('send')
    try {
      const res = await fetch(`/api/invoices/${params.id}/send`, { method: 'POST' })
      const json = await res.json()
      if (json.error) {
        showToast('error', json.error)
      } else {
        showToast('success', `Invoice ${invoice?.invoice_number} marked as sent!`)
        setInvoice((prev) => prev ? { ...prev, status: 'sent' } : prev)
      }
    } catch {
      showToast('error', 'Couldn\'t send the invoice.')
    } finally {
      setActionLoading('')
    }
  }

  async function handleMarkPaid() {
    setActionLoading('paid')
    try {
      const res = await fetch(`/api/invoices/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      })
      const json = await res.json()
      if (json.error) {
        showToast('error', json.error)
      } else {
        showToast('success', 'Invoice marked as paid! 🎉')
        setInvoice((prev) => prev ? { ...prev, status: 'paid', paid_at: new Date().toISOString() } : prev)
      }
    } catch {
      showToast('error', 'Couldn\'t update the invoice.')
    } finally {
      setActionLoading('')
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this invoice? This can\'t be undone.')) return
    setActionLoading('delete')
    try {
      const res = await fetch(`/api/invoices/${params.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.error) {
        showToast('error', json.error)
      } else {
        showToast('success', 'Invoice deleted.')
        router.push('/dashboard/invoices')
      }
    } catch {
      showToast('error', 'Couldn\'t delete the invoice.')
    } finally {
      setActionLoading('')
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="h-8 w-48 rounded skeleton" />
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="h-5 w-32 rounded skeleton" />
          <div className="h-4 w-64 rounded skeleton" />
          <div className="h-4 w-full rounded skeleton" />
          <div className="h-4 w-3/4 rounded skeleton" />
        </div>
      </div>
    )
  }

  if (!invoice) return null

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <Link href="/dashboard/invoices" className="text-sm text-gray-500 hover:text-gray-700 mb-1 inline-block">← Back to invoices</Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-gray-900">{invoice.invoice_number}</h1>
            <StatusBadge status={invoice.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {invoice.status === 'draft' && (
            <button onClick={handleSend} disabled={!!actionLoading} className="btn-primary py-2 px-4 text-sm">
              {actionLoading === 'send' ? 'Sending...' : 'Send Invoice'}
            </button>
          )}
          {['draft', 'sent', 'viewed', 'overdue'].includes(invoice.status) && (
            <button onClick={handleMarkPaid} disabled={!!actionLoading} className="btn-secondary py-2 px-4 text-sm text-green-700 border-green-300 hover:bg-green-50">
              {actionLoading === 'paid' ? 'Updating...' : 'Mark as Paid'}
            </button>
          )}
          <button onClick={handleDelete} disabled={!!actionLoading} className="btn-secondary py-2 px-4 text-sm text-red-600 border-red-200 hover:bg-red-50">
            {actionLoading === 'delete' ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Invoice Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
        {/* Header Info */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 mb-1">{invoice.invoice_number}</p>
            <p className="text-sm text-gray-500">
              Issued {new Date(invoice.issue_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="text-sm text-gray-500">
              Due {new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          {client && (
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">Bill to:</p>
              <p className="text-sm text-gray-700">{client.name}</p>
              {client.company && <p className="text-sm text-gray-500">{client.company}</p>}
              {client.email && <p className="text-sm text-gray-500">{client.email}</p>}
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="border-t border-gray-200 pt-4">
          <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 px-1">
            <div className="col-span-6">Description</div>
            <div className="col-span-2 text-right">Qty</div>
            <div className="col-span-2 text-right">Rate</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>
          {(invoice.line_items as LineItem[]).map((item, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-2 py-3 border-b border-gray-100 last:border-0">
              <div className="sm:col-span-6 text-sm font-medium text-gray-900">{item.description}</div>
              <div className="sm:col-span-2 text-sm text-gray-600 sm:text-right">{item.quantity}</div>
              <div className="sm:col-span-2 text-sm text-gray-600 sm:text-right">{formatCurrency(item.unit_price)}</div>
              <div className="sm:col-span-2 text-sm font-medium text-gray-900 sm:text-right">{formatCurrency(item.amount)}</div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-8 text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-900 w-28 text-right">{formatCurrency(Number(invoice.subtotal))}</span>
            </div>
            {Number(invoice.tax_rate) > 0 && (
              <div className="flex items-center gap-8 text-sm">
                <span className="text-gray-500">Tax ({invoice.tax_rate}%)</span>
                <span className="font-medium text-gray-900 w-28 text-right">{formatCurrency(Number(invoice.tax_amount))}</span>
              </div>
            )}
            <div className="flex items-center gap-8 text-xl mt-2">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-extrabold text-brand-600 w-28 text-right">{formatCurrency(Number(invoice.total))}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-700">{invoice.notes}</p>
          </div>
        )}

        {/* Voice Transcript */}
        {invoice.voice_transcript && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Voice Transcript</p>
            <p className="text-sm italic text-gray-500">"{invoice.voice_transcript}"</p>
          </div>
        )}

        {/* Paid info */}
        {invoice.paid_at && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center gap-2 text-green-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold">
                Paid on {new Date(invoice.paid_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
