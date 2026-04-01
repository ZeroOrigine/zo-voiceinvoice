'use client'

import { useState, useEffect } from 'react'
import { useDashboard } from '../layout'

// ============================================================
// SETTINGS — Profile & business info
// ============================================================

interface Profile {
  id: string
  email: string
  full_name: string
  business_name: string
  business_email: string
  business_phone: string
  business_address: string
  currency: string
}

export default function SettingsPage() {
  const { showToast } = useDashboard()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [currency, setCurrency] = useState('USD')

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile')
        const json = await res.json()
        if (json.data) {
          const p = json.data
          setProfile(p)
          setFullName(p.full_name)
          setBusinessName(p.business_name)
          setBusinessEmail(p.business_email)
          setBusinessPhone(p.business_phone)
          setBusinessAddress(p.business_address)
          setCurrency(p.currency)
        }
      } catch {
        showToast('error', 'Couldn\'t load your profile.')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          business_name: businessName,
          business_email: businessEmail,
          business_phone: businessPhone,
          business_address: businessAddress,
          currency,
        }),
      })
      const json = await res.json()
      if (json.error) {
        showToast('error', json.error)
      } else {
        showToast('success', 'Settings saved!')
        setProfile(json.data)
      }
    } catch {
      showToast('error', 'Couldn\'t save your settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="h-8 w-32 rounded skeleton" />
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 rounded skeleton" />
              <div className="h-10 w-full rounded skeleton" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Your profile and business details appear on invoices</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Personal Info</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={profile?.email || ''} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500" />
              <p className="mt-1 text-xs text-gray-400">Email can't be changed here</p>
            </div>
          </div>
        </div>

        {/* Business Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Business Details</h2>
          <p className="text-sm text-gray-500 mb-4">This info appears on your invoices</p>
          <div className="space-y-4">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input id="businessName" type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="Your Company LLC" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="businessEmail" className="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
                <input id="businessEmail" type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="billing@company.com" />
              </div>
              <div>
                <label htmlFor="businessPhone" className="block text-sm font-medium text-gray-700 mb-1">Business Phone</label>
                <input id="businessPhone" type="tel" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="(555) 123-4567" />
              </div>
            </div>
            <div>
              <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
              <textarea id="businessAddress" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="123 Main St, Suite 100, City, State 12345" />
            </div>
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
              <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="AUD">AUD — Australian Dollar</option>
                <option value="INR">INR — Indian Rupee</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
