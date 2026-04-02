import { useState, useEffect } from 'react'
import axios from 'axios'
import { downloadInvoicePDF } from '../payment/InvoiceModal'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ─── Pay Later Success Overlay ─────────────────────────────────────────────────
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

        <button onClick={onContinue}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-md shadow-emerald-200 hover:-translate-y-0.5">
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

  const handleContinue = () => {
    setShowInvoicePopup(true)
  }

  const handleInvoicePopupClose = () => {
    setShowInvoicePopup(false)
    onPaid()
  }

  return (
    <>
      {showInvoicePopup && (
        <InvoiceDownloadPopup
          invoiceData={invoiceData}
          onClose={handleInvoicePopupClose}
        />
      )}

      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm" onClick={payResult ? undefined : onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {payResult && !showInvoicePopup && (
            <PaymentResult
              success={payResult === 'success'}
              amount={total}
              onContinue={handleContinue}
              onRetry={() => setPayResult(null)}
            />
          )}

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

export default function AirlinesStep4Payment({ data, update, onBack, onSubmit, onMarkPaidAndFinish, submitting, error, isBlocked }) {
  const [errors, setErrors]               = useState({})
  const [showCardModal, setShowCardModal] = useState(false)
  const [registrationId, setRegistrationId] = useState(null)
  const [showPayLaterSuccess, setShowPayLaterSuccess] = useState(false)

  const holders = data.certificateHolders || []
  const isUnlimited = data.subscriptionPlan === 'Unlimited Plan'
  const selectedCount = data.holderCountValue ? parseInt(data.holderCountValue) : holders.length
  const pricePerCert = data.pricePerCertificate || data.pricePerCert || 0
  const total = isUnlimited ? pricePerCert : pricePerCert * selectedCount
  const totalLabel = '$' + total + ' USD'

  const paymentMethod = data.paymentMethod || 'stripe'

  // Build invoice data from current form data for the PDF
  const buildInvoiceData = () => ({
    name:             data.airlineName || [data.firstName, data.lastName].filter(Boolean).join(' '),
    email:            data.paymentEmail || data.email || '',
    phone:            data.phone ? ('+' + data.phone) : '',
    address:          [data.addressLine1, data.city, data.state, data.postalCode, data.country].filter(Boolean).join(', '),
    isAirline:        true,
    airlineName:      data.airlineName || '',
    subscriptionPlan: data.subscriptionPlan || '',
    paidAt:           new Date(),
    expirationDate:   null,
    holderCount:      selectedCount,
    pricePerCert,
    amount:           total,
    currency:         'USD',
    invoiceNumber:    `INV-${Date.now()}`,
    paymentId:        registrationId || '',
  })

  const validate = () => {
    const e = {}
    if (paymentMethod === 'stripe') {
      if (!data.paymentEmail?.trim()) e.paymentEmail = 'Billing email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.paymentEmail)) e.paymentEmail = 'Invalid email address'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const inputCls = (field) =>
    `w-full px-3.5 py-2.5 border rounded-xl text-sm text-gray-900 bg-white outline-none transition-all duration-150 focus:ring-2 focus:ring-violet-600/15 placeholder:text-gray-400 ${
      errors[field]
        ? 'border-red-300 focus:border-red-400 bg-red-50/30'
        : 'border-gray-200 focus:border-violet-600 hover:border-gray-300'
    }`

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
    setShowPayLaterSuccess(true)
  }

  const handlePayLaterDone = async () => {
    setShowPayLaterSuccess(false)
    await onSubmit({ paymentStatus: 'pending' })
  }

  const lineItems = [
    { label: 'Company',      value: data.airlineName },
    { label: 'Contact',      value: [data.firstName, data.lastName].filter(Boolean).join(' ') },
    { label: 'Email',        value: data.email },
    { label: 'Phone',        value: data.phone ? ('+' + data.phone) : '' },
    { label: 'Holder Range', value: data.holderCount },
    { label: 'Team Members', value: String(selectedCount) + ' member' + (selectedCount !== 1 ? 's' : '') },
    {
      label: isUnlimited ? 'Annual Fee' : 'Price per Certificate',
      value: '$' + pricePerCert + ' USD' + (isUnlimited ? ' / year' : ''),
    },
    { label: 'Total', value: totalLabel },
  ]

  return (
    <div className="space-y-7">

      {/* Pay Later success overlay */}
      {showPayLaterSuccess && (
        <PayLaterSuccessOverlay
          name={data.airlineName || data.firstName}
          onDone={handlePayLaterDone}
        />
      )}

      {showCardModal && (
        <StripeCardModal
          total={totalLabel}
          registrationId={registrationId || data._id}
          registrationModel="Airlines"
          invoiceData={buildInvoiceData()}
          onClose={() => setShowCardModal(false)}
          onPaid={handleCardPaid}
        />
      )}

      {isBlocked && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-800">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="font-bold mb-0.5">Submission blocked — wrong account type</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              You are signed in with an <strong>Individual account</strong>. Only users with an{' '}
              <strong>Airlines account</strong> can submit this form.
            </p>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div>
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Order Summary</h3>
        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">
                Airlines Plan &middot; {(data.subscriptionPlan || '').replace(' Subscription Plan', '').replace(' Plan', '')}
              </p>
              <p className="text-white text-2xl font-black mt-0.5">
                {'$' + total}<span className="text-base font-normal text-blue-200 ml-1">USD</span>
              </p>
            </div>
            <div className="text-4xl opacity-80">&#9992;&#65039;</div>
          </div>
          <div className="divide-y divide-gray-100">
            {lineItems.map(({ label, value }) => (
              <div key={label} className="flex justify-between px-5 py-3 text-sm">
                <span className="text-gray-400 font-medium">{label}</span>
                <span className="font-semibold text-gray-900 text-right max-w-xs truncate">{value || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Method Selector */}
      <div>
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Payment Method</h3>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => update({ paymentMethod: 'stripe' })}
            className={`relative flex flex-col items-center gap-2.5 rounded-2xl border-2 p-4 transition-all duration-150 text-left ${
              paymentMethod === 'stripe' ? 'border-violet-600 bg-violet-50/60 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}>
            {paymentMethod === 'stripe' && (
              <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Pay by Card</p>
              <p className="text-xs text-gray-500 mt-0.5">Credit / debit card — instant activation</p>
            </div>
          </button>

          <button type="button" onClick={() => update({ paymentMethod: 'pay_later' })}
            className={`relative flex flex-col items-center gap-2.5 rounded-2xl border-2 p-4 transition-all duration-150 text-left ${
              paymentMethod === 'pay_later' ? 'border-emerald-600 bg-emerald-50/60 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}>
            {paymentMethod === 'pay_later' && (
              <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Pay Later</p>
              <p className="text-xs text-gray-500 mt-0.5">Submit now, receive invoice by email</p>
            </div>
          </button>
        </div>
      </div>

      {paymentMethod === 'stripe' && (
        <div>
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Billing Details</h3>
          <div className="flex items-start gap-3 bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-800 mb-5">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <p>Enter your billing email. You'll enter your card details on the next screen to complete payment.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
              Billing Email Address <span className="text-red-400">*</span>
            </label>
            <input type="email" placeholder="billing@yourairline.com"
              value={data.paymentEmail || ''} onChange={e => update({ paymentEmail: e.target.value })}
              className={inputCls('paymentEmail')} />
            {errors.paymentEmail && (
              <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.paymentEmail}
              </span>
            )}
          </div>
        </div>
      )}

      {paymentMethod === 'pay_later' && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>
            Your registration will be submitted and our team will send an invoice to <strong>{data.email || 'your registered email'}</strong>.
            Your plan will be activated once payment is received.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <span className="text-lg flex-shrink-0">&#9888;&#65039;</span>
          <p>{error}</p>
        </div>
      )}

      <div className="flex justify-between pt-6 border-t border-gray-100">
        <button onClick={onBack} disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all duration-150 disabled:opacity-40">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Previous
        </button>
        <button
          onClick={() => {
            if (isBlocked) return
            if (paymentMethod === 'stripe') { handleStripeClick() }
            else { handlePayLater() }
          }}
          disabled={submitting || isBlocked}
          title={isBlocked ? 'You need an Airlines account to submit this form' : undefined}
          className={`inline-flex items-center gap-2.5 px-8 py-3 text-white font-bold rounded-xl transition-all duration-150 shadow-sm min-w-52 justify-center ${
            isBlocked
              ? 'bg-gray-300 cursor-not-allowed opacity-60'
              : paymentMethod === 'pay_later'
              ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 hover:shadow-md hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
              : 'bg-red-600 hover:bg-red-700 active:bg-red-800 hover:shadow-md hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
          }`}
        >
          {submitting ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" className="opacity-75" />
              </svg>
              Completing&#8230;
            </>
          ) : paymentMethod === 'pay_later' ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Submit & Pay Later
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
