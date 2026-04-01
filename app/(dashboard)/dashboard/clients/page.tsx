'use client'

import { useState, useEffect } from 'react'
import { useDashboard } from '../layout'

// ============================================================
// CLIENTS — List + inline create
// ============================================================

interface Client {
  id: string
  name: string
  email: string
  phone: string
  company: string
  address: string
  notes: string
  created_at: string
}

export default function ClientsPage() {
  const { showToast } = useDashboard()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')

  useEffect(() => {
    loadClients()
  }, [search])

  async function loadClients() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/clients?${params}`)
      const json = await res.json()
      if (json.data?.items) setClients(json.data.items)
    } catch {
      showToast('error', 'Couldn\'t load clients.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      showToast('error', 'Client name is required.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, company }),
      })
      const json = await res.json()
      if (json.error) {
        showToast('error', json.error)
      } else {
        showToast('success', `${name} added to your clients!`)
        setClients((prev) => [json.data, ...prev])
        setName('')
        setEmail('')
        setPhone('')
        setCompany('')
        setShowForm(false)
      }
    } catch {
      showToast('error', 'Couldn\'t save the client.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, clientName: string) {
    if (!confirm(`Remove ${clientName} from your clients?`)) return
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.error) {
        showToast('error', json.error)
      } else {
        showToast('success', `${clientName} removed.`)
        setClients((prev) => prev.filter((c) => c.id !== id))
      }
    } catch {
      showToast('error', 'Couldn\'t remove the client.')
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Clients</h1>
          <p className="mt-1 text-sm text-gray-500">People and companies you invoice</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Client
        </button>
      </div>

      {/* Add Client Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-brand-200 bg-brand-50/30 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">New Client</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="clientName" className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input id="clientName" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="Jane Smith" />
            </div>
            <div>
              <label htmlFor="clientEmail" className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input id="clientEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="jane@example.com" />
            </div>
            <div>
              <label htmlFor="clientCompany" className="block text-xs font-medium text-gray-600 mb-1">Company</label>
              <input id="clientCompany" type="text" value={company} onChange={(e) => setCompany(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="Acme Corp" />
            </div>
            <div>
              <label htmlFor="clientPhone" className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input id="clientPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="(555) 123-4567" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={saving} className="btn-primary py-2 px-4 text-sm">
              {saving ? 'Saving...' : 'Save Client'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary py-2 px-4 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="w-full sm:w-72 rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </div>

      {/* Client List */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between border-b border-gray-100 px-5 py-4 last:border-0">
              <div className="space-y-2">
                <div className="h-4 w-32 rounded skeleton" />
                <div className="h-3 w-48 rounded skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            {search ? 'No clients match your search' : 'No clients yet'}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {search ? 'Try a different search term' : 'Add your first client to speed up invoicing'}
          </p>
          {!search && (
            <button onClick={() => setShowForm(true)} className="btn-primary mt-6 gap-2">
              Add your first client
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {clients.map((client) => (
            <div key={client.id} className="flex items-center justify-between border-b border-gray-100 px-5 py-4 last:border-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{client.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[client.company, client.email].filter(Boolean).join(' · ') || 'No details'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(client.id, client.name)}
                className="flex-shrink-0 rounded-lg p-2 text-gray-400 hover:text-red-500 transition-colors"
                aria-label={`Remove ${client.name}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
