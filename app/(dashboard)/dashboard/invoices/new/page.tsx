'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboard } from '../../layout'

// ============================================================
// NEW INVOICE — THE KERNEL: Voice-to-Invoice Creation
// This is the 10x feature. User speaks → invoice appears.
// Uses Web Speech API for voice recognition.
// Falls back to manual text input if speech not available.
// ============================================================

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

interface Client {
  id: string
  name: string
  email: string
  company: string
}

function parseVoiceToInvoice(transcript: string): { lineItems: LineItem[]; clientName: string; notes: string } {
  const lineItems: LineItem[] = []
  let clientName = ''
  let notes = ''

  // Extract client name patterns: "invoice [client]" or "for [client]" or "bill [client]"
  const clientPatterns = [
    /(?:invoice|bill|for)\s+([A-Z][a-zA-Z\s]+?)\s+(?:for|at|\$|\d)/i,
    /(?:invoice|bill)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|$)/i,
    /(?:to|client|customer)\s*:?\s*([A-Z][a-zA-Z\s]+?)(?:\s+for|\.|,|$)/i,
  ]
  for (const pattern of clientPatterns) {
    const match = transcript.match(pattern)
    if (match) {
      clientName = match[1].trim()
      break
    }
  }

  // Extract line items: "X hours of Y at $Z" or "$X for Y" patterns
  const itemPatterns = [
    /(\d+(?:\.\d+)?)\s*hours?\s+(?:of\s+)?([\w\s]+?)\s+(?:at|@)\s*\$?(\d+(?:\.\d+)?)/gi,
    /(\d+(?:\.\d+)?)\s*(?:units?|items?|pieces?)\s+(?:of\s+)?([\w\s]+?)\s+(?:at|@)\s*\$?(\d+(?:\.\d+)?)/gi,
    /\$?(\d+(?:\.\d+)?)\s+(?:for|per)\s+([\w\s]+?)(?:\.|,|and|plus|$)/gi,
  ]

  for (const pattern of itemPatterns) {
    let match
    while ((match = pattern.exec(transcript)) !== null) {
      if (match.length === 4) {
        const qty = parseFloat(match[1])
        const desc = match[2].trim()
        const rate = parseFloat(match[3])
        if (qty > 0 && rate > 0 && desc.length > 0) {
          lineItems.push({
            description: desc.charAt(0).toUpperCase() + desc.slice(1),
            quantity: qty,
            unit_price: rate,
            amount: Math.round(qty * rate * 100) / 100,
          })
        }
      }
    }
  }

  // Try flat amount pattern: "plus $X for Y" or "$X for Y"
  const flatPatterns = /(?:plus|and|also)?\s*\$?(\d+(?:\.\d+)?)\s+for\s+([\w\s]+?)(?:\.|,|and|plus|due|$)/gi
  let flatMatch
  while ((flatMatch = flatPatterns.exec(transcript)) !== null) {
    const amount = parseFloat(flatMatch[1])
    const desc = flatMatch[2].trim()
    if (amount > 0 && desc.length > 0) {
      const alreadyAdded = lineItems.some(
        (item) => item.description.toLowerCase() === desc.toLowerCase()
      )
      if (!alreadyAdded) {
        lineItems.push({
          description: desc.charAt(0).toUpperCase() + desc.slice(1),
          quantity: 1,
          unit_price: amount,
          amount,
        })
      }
    }
  }

  // If no items parsed, create a single item from the transcript
  if (lineItems.length === 0) {
    const amountMatch = transcript.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)(?:\s|$)/)
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''))
      lineItems.push({
        description: 'Services rendered',
        quantity: 1,
        unit_price: amount,
        amount,
      })
    }
  }

  // Extract notes: "note" or "notes" or "memo"
  const notesMatch = transcript.match(/(?:note|notes|memo)\s*:?\s*(.+?)(?:\.|$)/i)
  if (notesMatch) {
    notes = notesMatch[1].trim()
  }

  return { lineItems, clientName, notes }
}

export default function NewInvoicePage() {
  const router = useRouter()
  const { showToast } = useDashboard()

  // Voice state
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Invoice state
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', quantity: 1, unit_price: 0, amount: 0 }])
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientName, setClientName] = useState('')
  const [taxRate, setTaxRate] = useState(0)
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )

  // Clients
  const [clients, setClients] = useState<Client[]>([])
  const [saving, setSaving] = useState(false)
  const [parsed, setParsed] = useState(false)

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      setSpeechSupported(true)
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        for (let i = 0; i < event.results.length; i++) {
          finalTranscript += event.results[i][0].transcript
        }
        setTranscript(finalTranscript)
      }

      recognition.onerror = () => {
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }

    // Load clients
    fetch('/api/clients?limit=100')
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.items) setClients(json.data.items)
      })
      .catch(() => {})
  }, [])

  function toggleListening() {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setTranscript('')
      setParsed(false)
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  function processTranscript() {
    if (!transcript.trim()) {
      showToast('error', 'Please speak or type something first.')
      return
    }

    const result = parseVoiceToInvoice(transcript)

    if (result.lineItems.length > 0) {
      setLineItems(result.lineItems)
    }

    if (result.clientName) {
      setClientName(result.clientName)
      // Try to match with existing client
      const matchedClient = clients.find(
        (c) => c.name.toLowerCase().includes(result.clientName.toLowerCase()) ||
               c.company.toLowerCase().includes(result.clientName.toLowerCase())
      )
      if (matchedClient) {
        setClientId(matchedClient.id)
        setClientName(matchedClient.name)
      }
    }

    if (result.notes) {
      setNotes(result.notes)
    }

    setParsed(true)
    showToast('success', `Parsed ${result.lineItems.length} line item${result.lineItems.length !== 1 ? 's' : ''} from your voice!`)
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    setLineItems((prev) => {
      const updated = [...prev]
      const item = { ...updated[index] }
      if (field === 'description') item.description = value as string
      if (field === 'quantity') item.quantity = Number(value) || 0
      if (field === 'unit_price') item.unit_price = Number(value) || 0
      item.amount = Math.round(item.quantity * item.unit_price * 100) / 100
      updated[index] = item
      return updated
    })
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0, amount: 0 }])
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
  const total = Math.round((subtotal + taxAmount) * 100) / 100

  async function handleSave() {
    const validItems = lineItems.filter((item) => item.description.trim() && item.amount > 0)
    if (validItems.length === 0) {
      showToast('error', 'Add at least one line item with a description and amount.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          line_items: validItems,
          tax_rate: taxRate,
          notes,
          voice_transcript: transcript,
          due_date: dueDate,
        }),
      })

      const json = await res.json()
      if (json.error) {
        showToast('error', json.error)
        setSaving(false)
        return
      }

      showToast('success', `Invoice ${json.data.invoice_number} created! You just saved yourself 15 minutes.`)
      router.push(`/dashboard/invoices/${json.data.id}`)
    } catch {
      showToast('error', 'Couldn\'t save the invoice. Please try again.')
      setSaving(false)
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">New Invoice</h1>
        <p className="mt-1 text-sm text-gray-500">Speak or type — your invoice, your way</p>
      </div>

      {/* Voice Input Section */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <svg className="h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <h2 className="text-lg font-bold text-gray-900">Voice Input</h2>
        </div>

        {speechSupported ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleListening}
                className={`relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full transition-all ${
                  isListening
                    ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                    : 'bg-brand-600 text-white shadow-lg shadow-brand-200 hover:bg-brand-700'
                }`}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
              >
                {isListening && <div className="absolute inset-0 rounded-full bg-red-400 voice-pulse" />}
                <svg className="relative h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {isListening ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  )}
                </svg>
              </button>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">
                  {isListening ? 'Listening... speak naturally' : 'Tap the mic and describe your invoice'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Try: "Invoice Acme Corp for 10 hours of web development at $150 per hour"
                </p>
              </div>
            </div>

            <textarea
              value={transcript}
              onChange={(e) => { setTranscript(e.target.value); setParsed(false) }}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="Your voice transcript will appear here, or type manually..."
            />

            <button
              onClick={processTranscript}
              disabled={!transcript.trim()}
              className="btn-primary gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {parsed ? 'Re-parse transcript' : 'Generate invoice from voice'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Voice input isn't available in this browser. Type your invoice description below:</p>
            <textarea
              value={transcript}
              onChange={(e) => { setTranscript(e.target.value); setParsed(false) }}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder='e.g. "Invoice Acme Corp for 10 hours of web development at $150 per hour, plus $200 for hosting setup"'
            />
            <button onClick={processTranscript} disabled={!transcript.trim()} className="btn-primary gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate invoice
            </button>
          </div>
        )}
      </div>

      {/* Invoice Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-gray-900">Invoice Details</h2>

        {/* Client Selection */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select
              id="client"
              value={clientId || ''}
              onChange={(e) => {
                setClientId(e.target.value || null)
                const c = clients.find((cl) => cl.id === e.target.value)
                if (c) setClientName(c.name)
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="">{clientName || 'Select a client (optional)'}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Line Items</label>
            <button onClick={addLineItem} className="text-xs font-medium text-brand-600 hover:text-brand-700">
              + Add item
            </button>
          </div>

          <div className="space-y-3">
            {/* Header */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
              <div className="col-span-5">Description</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-2">Rate</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-1" />
            </div>

            {lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  placeholder="Description"
                  className="sm:col-span-5 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
                <input
                  type="number"
                  value={item.quantity || ''}
                  onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                  placeholder="Qty"
                  min="0"
                  step="0.5"
                  className="sm:col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
                <input
                  type="number"
                  value={item.unit_price || ''}
                  onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                  placeholder="Rate"
                  min="0"
                  step="0.01"
                  className="sm:col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
                <div className="sm:col-span-2 flex items-center px-3 py-2 text-sm font-medium text-gray-900">
                  {formatCurrency(item.amount)}
                </div>
                <button
                  onClick={() => removeLineItem(index)}
                  disabled={lineItems.length <= 1}
                  className="sm:col-span-1 flex items-center justify-center rounded-lg p-2 text-gray-400 hover:text-red-500 disabled:opacity-30"
                  aria-label="Remove line item"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tax & Notes */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
            <input
              id="taxRate"
              type="number"
              value={taxRate || ''}
              onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
              min="0"
              max="100"
              step="0.5"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="0"
            />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="Payment terms, thank you note, etc."
            />
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-8 text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-900 w-28 text-right">{formatCurrency(subtotal)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex items-center gap-8 text-sm">
                <span className="text-gray-500">Tax ({taxRate}%)</span>
                <span className="font-medium text-gray-900 w-28 text-right">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex items-center gap-8 text-lg mt-1">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-extrabold text-brand-600 w-28 text-right">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end border-t border-gray-200 pt-4">
          <button
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary gap-2"
          >
            {saving ? (
              'Creating...'
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Create Invoice
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
