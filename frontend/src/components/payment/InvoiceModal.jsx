/**
 * InvoiceModal.jsx
 * Renders an invoice preview modal and generates a professional PDF
 * using pdf-lib (https://pdf-lib.js.org) — a pure browser PDF toolkit.
 *
 * The company logo (IFOA_USA_blanc_V.png) is fetched from /src/assets at
 * runtime, embedded as a real image in the PDF — no print dialog, no popup.
 *
 * Install:  npm install pdf-lib
 */

import { useState } from 'react'
import { generateIFOAInvoicePDF, triggerInvoiceDownload } from '../../utils/ifoaInvoicePdf'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'

function toIsoDate(input) {
  if (!input) return ''
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function plusDays(dateIso, days) {
  const d = new Date(dateIso || Date.now())
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function mapToAdminInvoiceShape(inv) {
  const issueDate = toIsoDate(inv.paidAt) || toIsoDate(new Date())
  const amount = Number(inv.amount) || 0
  const quantity = inv.isAirline ? Number(inv.holderCount) || 1 : 1
  const unitPrice = inv.isAirline ? (Number(inv.pricePerCert) || amount) : amount

  const planDesc = `Agent For Service - ${(inv.subscriptionPlan || '1 Year Plan')
    .replace(' Subscription Plan', '')
    .replace(' Plan', '')}`

  return {
    invoiceNumber: inv.invoiceNumber || `INV-${Date.now()}`,
    issueDate,
    payableBy: plusDays(issueDate, 30),
    recipientCompany: inv.isAirline ? (inv.airlineName || inv.name || '') : '',
    recipientName: inv.name || '',
    recipientContact: inv.name || '',
    recipientAddress1: inv.address || '',
    recipientAddress2: '',
    recipientCountry: '',
    paymentMethod: 'card',
    lineItems: [
      {
        description: planDesc,
        quantity,
        unitPrice,
        totalPrice: amount,
      },
    ],
  }
}

// Export kept so existing callers continue importing from this file.
export async function downloadInvoicePDF(inv) {
  const payload = mapToAdminInvoiceShape(inv)
  const generated = await generateIFOAInvoicePDF(payload)
  triggerInvoiceDownload(generated)
}

// ── Invoice Preview Modal ─────────────────────────────────────────────────────
export default function InvoiceModal({ invoice, onClose }) {
  const [downloading, setDownloading] = useState(false)

  if (!invoice) return null

  const expiry = invoice.subscriptionPlan === 'Unlimited Plan'
    ? 'Never (Unlimited)'
    : invoice.expirationDate ? fmt(invoice.expirationDate) : '—'

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadInvoicePDF(invoice)
    } catch (err) {
      console.error('PDF generation failed:', err)
      alert('Could not generate PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Payment Successful</p>
            <h2 className="text-lg font-extrabold text-slate-900">Your Invoice</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition">
            ✕
          </button>
        </div>

        {/* Invoice Preview */}
        <div className="px-6 py-5 space-y-4">

          {/* Paid badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Paid
            </span>
            <span className="text-xs text-slate-400">{invoice.invoiceNumber}</span>
          </div>

          {/* Summary card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-100 overflow-hidden">
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subscription Plan</span>
              <span className="text-sm font-bold text-slate-900">{invoice.subscriptionPlan}</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Billed To</span>
              <span className="text-sm font-bold text-slate-900">{invoice.name}</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Date</span>
              <span className="text-sm font-bold text-slate-900">{fmt(invoice.paidAt)}</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expiration</span>
              <span className={`text-sm font-bold ${expiry === 'Never (Unlimited)' ? 'text-emerald-600' : 'text-slate-900'}`}>{expiry}</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center bg-slate-900 rounded-b-xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Paid</span>
              <span className="text-xl font-black text-white">${Number(invoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Payment ID: <span className="font-mono">{invoice.paymentId}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-red-200 disabled:opacity-60"
          >
            {downloading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
                  <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" />
                </svg>
                Generating PDF…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Download PDF Invoice
              </>
            )}
          </button>
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
