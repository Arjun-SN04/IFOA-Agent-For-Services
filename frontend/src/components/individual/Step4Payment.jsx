import { useState, useEffect } from 'react'
import axios from 'axios'
import { downloadInvoicePDF } from '../payment/InvoiceModal'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ─── Pay Later Success Overlay ─────────────────────────────────────────────────
// Shows animated green tick, then calls onDone after a short delay
function PayLaterSuccessOverlay({ name, onDone }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 60)
    const t2 = setTimeout(() => onDone(), 2800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-slate-900/70 backdrop-blur-sm" />
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className={`flex flex-col items-center justify-center text-center transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Animated green circle + tick */}
          <div className="relative mb-6">
            <div
              className="w-28 h-28 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-500/40"
              style={{ animation: show ? 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none' }}
            >
              <svg
                className="w-14 h-14 text-white"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8}
                style={{ strokeDasharray: 40, strokeDashoffset: show ? 0 : 40, transition: 'stroke-dashoffset 0.45s ease 0.25s' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-emerald-400 opacity-0"
              style={{ animation: show ? 'ripple 1s ease-out 0.3s forwards' : 'none' }} />
            <div className="absolute inset-0 rounded-full border-4 border-emerald-300 opacity-0"
              style={{ animation: show ? 'ripple 1s ease-out 0.55s forwards' : 'none' }} />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-400 mb-2">Registration Submitted</p>
          <h3 className="text-3xl font-black text-white mb-2">All done{name ? `, ${name}` : ''}!</h3>
          <p className="text-sm text-white/60 max-w-xs leading-relaxed">Your registration is submitted. Our team will send an invoice to your email shortly.</p>
          <style>{`
            @keyframes popIn { 0%{transform:scale(0.4);opacity:0} 100%{transform:scale(1);opacity:1} }
            @keyframes ripple { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.7);opacity:0} }
          `}</style>
        </div>
      </div>
    </>
  )
}

// ─── Invoice Download Popup ────────────────────────────────────────────────────
function InvoiceDownloadPopup({ invoiceData, onClose }) {
  const [downloading, setDownloading] = useState(false)
  const [show, setShow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShow(true), 60); return () => clearTimeout(t) }, [])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      if (invoiceData && typeof downloadInvoicePDF === 'function') {
        await downloadInvoicePDF(invoiceData)
      }
    } catch (err) {
      console.error('Invoice download failed:', err)
    } finally {
      setDownloading(false)
      onClose()
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`pointer-events-auto w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden transition-all duration-400 ${
            show ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
          }`}
        >
          {/* Header */}
          <div className="border-b border-slate-100 bg-emerald-50 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Payment Confirmed</p>
                <h3 className="text-base font-extrabold text-slate-900">Download Your Invoice</h3>
              </div>
            </div>
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition text-xs">
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3" />
              </svg>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Your payment was processed successfully. Download your official PDF invoice for your records.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-red-200 disabled:opacity-60"
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
              <button
                onClick={onClose}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Skip for Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Payment Result Screen ─────────────────────────────────────────────────────
function PaymentResult({ success, amount, onContinue, onRetry }) {
  const [show, setShow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShow(true), 60); return () => clearTimeout(t) }, [])

  if (success) {
    return (
      <div className={`flex flex-col items-center justify-center px-6 py-10 text-center transition-all duration-500 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        {/* Animated green circle + tick */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200"
            style={{ animation: show ? 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none' }}>
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8}
              style={{ strokeDasharray: 40, strokeDashoffset: show ? 0 : 40, transition: 'stroke-dashoffset 0.45s ease 0.25s' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-emerald-400 opacity-0"
            style={{ animation: show ? 'ripple 1s ease-out 0.3s forwards' : 'none' }} />
          <div className="absolute inset-0 rounded-full border-4 border-emerald-300 opacity-0"
            style={{ animation: show ? 'ripple 1s ease-out 0.55s forwards' : 'none' }} />
        </div>

        <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-600 mb-2">Payment Successful</p>
        <h3 className="text-2xl font-black text-gray-900 mb-1">All done!</h3>
        {amount && <p className="text-sm text-gray-500 mb-1">{amount} charged successfully</p>}
        <p className="text-sm text-gray-400 mb-8">Your registration is now active. A confirmation email will be sent shortly.</p>

        <button
          onClick={onContinue}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-md shadow-emerald-200 hover:-translate-y-0.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0-5 5m5-5H6" />
          </svg>
          Download Invoice
        </button>

        <style>{`
          @keyframes popIn { 0%{transform:scale(0.4);opacity:0} 100%{transform:scale(1);opacity:1} }
          @keyframes ripple { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.7);opacity:0} }
        `}</style>
      </div>
    )
  }

  // Failure screen
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-10 text-center transition-all duration-500 ${
      show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-200 mb-6"
        style={{ animation: show ? 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none' }}>
        <svg className="w-11 h-11 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500 mb-2">Payment Failed</p>
      <h3 className="text-2xl font-black text-gray-900 mb-1">Something went wrong</h3>
      <p className="text-sm text-gray-400 mb-8">Your card was not charged. Please check your details and try again.</p>
      <button onClick={onRetry}
        className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-md shadow-red-200 hover:-translate-y-0.5">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Try Again
      </button>
      <style>{`@keyframes popIn { 0%{transform:scale(0.4);opacity:0} 100%{transform:scale(1);opacity:1} }`}</style>
    </div>
  )
}

// ─── Stripe Card Modal ─────────────────────────────────────────────────────────
function StripeCardModal({ total, registrationId, registrationModel, invoiceData, onClose, onPaid }) {
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry]         = useState('')
  const [cvc, setCvc]               = useState('')
  const [name, setName]             = useState('')
  const [paying, setPaying]         = useState(false)
  const [cardErr, setCardErr]       = useState('')
  const [payResult, setPayResult]   = useState(null)
  const [showInvoicePopup, setShowInvoicePopup] = useState(false)

  const formatCard   = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  const formatExpiry = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 4)
    return d.length >= 3 ? d.slice(0, 2) + ' / ' + d.slice(2) : d
  }

  const handlePay = async () => {
    setCardErr('')
    const rawCard = cardNumber.replace(/\s/g, '')
    if (!name.trim())          return setCardErr('Cardholder name is required.')
    if (rawCard.length !== 16) return setCardErr('Enter a valid 16-digit card number.')
    if (expiry.replace(/\s/g, '').replace('/', '').length < 4) return setCardErr('Enter a valid expiry date.')
    if (cvc.length < 3)        return setCardErr('CVC must be at least 3 digits.')
    setPaying(true)
    try {
      await axios.patch(
        `${BASE_URL}/${registrationModel === 'Airlines' ? 'airlines' : 'individuals'}/${registrationId}/mark-paid`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('ifoa_token') || ''}` } }
      ).catch(() => {})
      setPayResult('success')
    } catch {
      setPayResult('failed')
    } finally {
      setPaying(false)
    }
  }

  // "Download Invoice" button on success screen → show invoice popup
  const handleContinue = () => {
    setShowInvoicePopup(true)
  }

  // Invoice popup closed → finish and navigate away
  const handleInvoicePopupClose = () => {
    setShowInvoicePopup(false)
    onPaid()
  }

  return (
    <>
      {/* Invoice Download Popup (shown after payment success + Download Invoice click) */}
      {showInvoicePopup && (
        <InvoiceDownloadPopup
          invoiceData={invoiceData}
          onClose={handleInvoicePopupClose}
        />
      )}

      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm" onClick={payResult ? undefined : onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Result screen replaces entire modal content ── */}
          {payResult && !showInvoicePopup && (
            <PaymentResult
              success={payResult === 'success'}
              amount={total}
              onContinue={handleContinue}
              onRetry={() => setPayResult(null)}
            />
          )}

          {/* ── Normal card form ── */}
          {!payResult && (<>

          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
                </svg>
              </div>
              <div>
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5">Secure Checkout</p>
                <p className="text-white font-black text-base leading-tight">{total}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Card preview */}
          <div className="mx-5 mt-4 mb-1 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <div className="w-7 h-5 rounded bg-amber-400/90" />
              <svg className="w-7 h-4 text-white/40" viewBox="0 0 48 30" fill="currentColor">
                <circle cx="17" cy="15" r="13" fillOpacity=".8" />
                <circle cx="31" cy="15" r="13" fillOpacity=".5" />
              </svg>
            </div>
            <p className="text-white font-mono text-sm tracking-[0.16em] mb-2.5 truncate">
              {cardNumber || '•••• •••• •••• ••••'}
            </p>
            <div className="flex justify-between text-white/60 text-[10px] font-semibold uppercase tracking-wider">
              <span className="truncate max-w-[60%]">{name || 'Cardholder Name'}</span>
              <span className="flex-shrink-0">{expiry || 'MM / YY'}</span>
            </div>
          </div>

          {/* Form fields */}
          <div className="px-5 pt-3 pb-3 space-y-3.5">
            {cardErr && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01"/>
                </svg>
                {cardErr}
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Cardholder Name</label>
              <input type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-400" />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Card Number</label>
              <div className="relative">
                <input type="text" inputMode="numeric" placeholder="1234 5678 9012 3456"
                  value={cardNumber} onChange={e => setCardNumber(formatCard(e.target.value))} maxLength={19}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-3 pr-12 py-2.5 text-sm text-slate-900 font-mono outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-400 placeholder:font-sans" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5">
                  <div className="w-5 h-3.5 rounded-sm bg-red-500 opacity-80" />
                  <div className="w-5 h-3.5 rounded-sm bg-amber-400 opacity-80 -ml-2" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Expiry Date</label>
                <input type="text" inputMode="numeric" placeholder="MM / YY"
                  value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))} maxLength={7}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 font-mono outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-400 placeholder:font-sans" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">CVC</label>
                <div className="relative">
                  <input type="text" inputMode="numeric" placeholder="123"
                    value={cvc} onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} maxLength={4}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-3 pr-9 py-2.5 text-sm text-slate-900 font-mono outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-400 placeholder:font-sans" />
                  <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 0 0-4 0v2" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium pt-0.5">
              <svg className="w-3 h-3 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016Z" />
              </svg>
              Your payment is secured by 256-bit SSL encryption
            </div>
          </div>

          {/* Footer actions */}
          <div className="border-t border-slate-100 px-5 py-3.5 bg-slate-50/60 flex gap-2.5">
            <button onClick={onClose} disabled={paying}
              className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handlePay} disabled={paying}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 py-2.5 text-sm font-bold text-white transition disabled:opacity-60 shadow-sm">
              {paying ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" className="opacity-75" />
                  </svg>
                  Processing…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pay {total}
                </>
              )}
            </button>
          </div>
          </>)}
        </div>
      </div>
    </>
  )
}

export default function Step4Payment({ data, update, onBack, onSubmit, onMarkPaidAndFinish, submitting, error, isBlocked }) {
  const [errors, setErrors]               = useState({})
  const [showCardModal, setShowCardModal] = useState(false)
  const [registrationId, setRegistrationId] = useState(null)
  const [showPayLaterSuccess, setShowPayLaterSuccess] = useState(false)

  const paymentMethod = data.paymentMethod || 'stripe'
  const totalLabel    = data.price != null ? `$${Number(data.price).toFixed(2)} USD` : ''

  // Build invoice data from current form data for the PDF
  const buildInvoiceData = () => ({
    name:                [data.firstName, data.lastName].filter(Boolean).join(' '),
    email:               data.paymentEmail || data.email || '',
    phone:               data.phone || '',
    address:             [data.addressLine1, data.city, data.state, data.postalCode, data.country].filter(Boolean).join(', '),
    isAirline:           false,
    subscriptionPlan:    data.subscriptionPlan || '',
    paidAt:              new Date(),
    expirationDate:      null,
    primaryCertificate:  data.primaryCertificate || '',
    faaCertificateNumber: data.faaCertificateNumber || '',
    iacraTrackingNumber: data.iacraTrackingNumber || '',
    holderCount:         0,
    pricePerCert:        0,
    amount:              data.price || 0,
    currency:            'USD',
    invoiceNumber:       `INV-${Date.now()}`,
    paymentId:           registrationId || '',
  })

  const validate = () => {
    const nextErrors = {}
    if (paymentMethod === 'stripe') {
      if (!data.paymentEmail?.trim()) nextErrors.paymentEmail = 'Billing email is required.'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.paymentEmail)) nextErrors.paymentEmail = 'Enter a valid email address.'
    }
    if (!data.agreedToTerms) nextErrors.agreedToTerms = 'You must accept the terms before submitting.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleStripeClick = async () => {
    if (isBlocked) return
    if (!validate()) return
    const newId = await onSubmit({ paymentStatus: 'pending', returnId: true })
    if (newId) {
      setRegistrationId(newId)
      setShowCardModal(true)
    } else {
      setShowCardModal(true)
    }
  }

  const handleCardPaid = async () => {
    setShowCardModal(false)
    await onMarkPaidAndFinish(registrationId || data._id)
  }

  const handlePayLater = async () => {
    if (isBlocked || !validate()) return
    // Show green tick overlay first, then onSubmit will navigate to SuccessPage
    setShowPayLaterSuccess(true)
  }

  const handlePayLaterDone = async () => {
    setShowPayLaterSuccess(false)
    await onSubmit({ paymentStatus: 'pending' })
  }

  return (
    <div className="space-y-6">

      {/* Pay Later success overlay */}
      {showPayLaterSuccess && (
        <PayLaterSuccessOverlay
          name={data.firstName}
          onDone={handlePayLaterDone}
        />
      )}

      {/* Stripe card modal */}
      {showCardModal && (
        <StripeCardModal
          total={totalLabel}
          registrationId={registrationId || data._id}
          registrationModel="Individual"
          invoiceData={buildInvoiceData()}
          onClose={() => setShowCardModal(false)}
          onPaid={handleCardPaid}
        />
      )}

      {/* Wrong-role warning */}
      {isBlocked && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-800">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="font-bold mb-0.5">Submission blocked — wrong account type</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              You are signed in with an <strong>Airlines account</strong>. Only users with an{' '}
              <strong>Individual account</strong> can submit this form.
            </p>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <section className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">Order Summary</p>
            <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-slate-950">Final registration amount</h3>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-right">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Total</p>
            <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-slate-950">${data.price?.toFixed(2)}</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {[
            { label: 'Registrant', value: `${data.firstName} ${data.lastName}`.trim() },
            {
              label: 'Service plan',
              value: data.subscriptionPlan === 'Multiple Years Subscription Plan'
                ? `Multiple Years Subscription Plan (${data.multiYearCount || 2} Years)`
                : data.subscriptionPlan,
            },
            { label: 'Registration email', value: data.email },
            {
              label: 'Billing email',
              value: paymentMethod === 'pay_later'
                ? data.email || 'Your registered email'
                : data.paymentEmail || 'Will be entered below',
            },
          ].map((item) => (
            <div key={item.label}
              className="flex flex-col gap-1 rounded-2xl border border-white/70 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-semibold text-slate-500">{item.label}</span>
              <span className="text-sm text-slate-900 sm:max-w-[60%] sm:text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Payment Method Selector */}
      <section className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">Payment Method</p>
        <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-slate-950">How would you like to pay?</h3>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {/* Stripe */}
          <button type="button" onClick={() => update({ paymentMethod: 'stripe' })}
            className={`relative flex flex-col items-center gap-2.5 rounded-2xl border-2 p-4 transition-all duration-150 text-left ${
              paymentMethod === 'stripe' ? 'border-violet-600 bg-violet-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}>
            {paymentMethod === 'stripe' && (
              <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </span>
            )}
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Pay by Card</p>
              <p className="text-xs text-slate-500 mt-0.5">Card — instant activation</p>
            </div>
          </button>

          {/* Pay Later */}
          <button type="button" onClick={() => update({ paymentMethod: 'pay_later' })}
            className={`relative flex flex-col items-center gap-2.5 rounded-2xl border-2 p-4 transition-all duration-150 text-left ${
              paymentMethod === 'pay_later' ? 'border-emerald-600 bg-emerald-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}>
            {paymentMethod === 'pay_later' && (
              <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </span>
            )}
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Pay Later</p>
              <p className="text-xs text-slate-500 mt-0.5">Submit now, pay via invoice</p>
            </div>
          </button>
        </div>

        {/* Stripe billing email */}
        {paymentMethod === 'stripe' && (
          <div className="mt-5 space-y-4">
            <div className="rounded-3xl border border-violet-100 bg-violet-50/80 p-4 text-sm leading-6 text-violet-900 flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Enter your billing email. A card entry window will open on the next step.
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Billing Email Address <span className="ml-1 text-red-500">*</span>
              </label>
              <input type="email" placeholder="billing@example.com"
                value={data.paymentEmail || ''} onChange={(e) => update({ paymentEmail: e.target.value })}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400 ${
                  errors.paymentEmail
                    ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                    : 'border-slate-200 bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-100'
                }`} />
              {errors.paymentEmail && (
                <p className="mt-2 flex items-center gap-2 text-xs font-medium text-red-600">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />{errors.paymentEmail}
                </p>
              )}
            </div>
          </div>
        )}

        {paymentMethod === 'pay_later' && (
          <div className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm leading-6 text-emerald-900 flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Your registration will be submitted and our team will send an invoice to{' '}
            <strong>{data.email || 'your registered email'}</strong>. Your plan activates once payment is received.
          </div>
        )}
      </section>

      {/* Terms */}
      <section className={`rounded-[26px] border p-5 sm:p-6 ${errors.agreedToTerms ? 'border-red-200 bg-red-50/70' : 'border-slate-200 bg-slate-50/80'}`}>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={data.agreedToTerms} onChange={(e) => update({ agreedToTerms: e.target.checked })}
            className="mt-1 h-4 w-4 accent-blue-600" />
          <span className="text-sm leading-6 text-slate-700">
            I confirm the submitted information is accurate, and I agree to the{' '}
            <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-blue-700 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-blue-700 hover:underline">Privacy Policy</a>.
          </span>
        </label>
        {errors.agreedToTerms && (
          <p className="mt-3 flex items-center gap-2 text-xs font-medium text-red-600">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />{errors.agreedToTerms}
          </p>
        )}
      </section>

      {error && (
        <div className="rounded-[26px] border border-red-200 bg-red-50/80 p-5 text-sm leading-6 text-red-700">{error}</div>
      )}

      <div className="flex flex-col justify-between gap-3 border-t border-slate-100 pt-2 sm:flex-row">
        <button onClick={onBack} disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0 5-5m-5 5h12" />
          </svg>
          Back
        </button>

        <button
          onClick={() => {
            if (isBlocked) return
            if (paymentMethod === 'stripe') handleStripeClick()
            else handlePayLater()
          }}
          disabled={submitting || isBlocked}
          title={isBlocked ? 'You need an Individual account to submit this form' : undefined}
          className={`inline-flex min-w-[14rem] items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all ${
            isBlocked
              ? 'bg-gray-300 cursor-not-allowed opacity-60'
              : paymentMethod === 'pay_later'
              ? 'bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none'
              : 'bg-red-600 hover:bg-red-700 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none'
          }`}
        >
          {submitting ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 0 1 8-8v8Z" className="opacity-75" />
              </svg>
              Submitting...
            </>
          ) : paymentMethod === 'pay_later' ? (
            <>
              Submit & Pay Later
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0-5 5m5-5H6" />
              </svg>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                <rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
              </svg>
              Enter Card Details
            </>
          )}
        </button>
      </div>
    </div>
  )
}
