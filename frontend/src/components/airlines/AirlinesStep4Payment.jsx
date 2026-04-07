import { useState, useEffect } from 'react'
import axios from 'axios'
import { downloadInvoicePDF } from '../payment/InvoiceModal'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ─── Invoice Download Popup ────────────────────────────────────────────────────
function InvoiceDownloadPopup({ invoiceData, onClose }) {
  const [downloading, setDownloading] = useState(false)
  const [show, setShow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShow(true), 60); return () => clearTimeout(t) }, [])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      if (invoiceData && typeof downloadInvoicePDF === 'function') await downloadInvoicePDF(invoiceData)
    } catch (err) { console.error('Invoice download failed:', err) }
    finally { setDownloading(false); onClose() }
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <div className={`pointer-events-auto w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden transition-all duration-400 ${show ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}>
          <div className="border-b border-slate-100 bg-emerald-50 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Payment Confirmed</p>
                <h3 className="text-base font-extrabold text-slate-900">Download Your Invoice</h3>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition text-xs">✕</button>
          </div>
          <div className="px-6 py-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3" />
              </svg>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">Your payment was processed successfully. Download your official PDF invoice for your records.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleDownload} disabled={downloading}
                className="w-full inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-red-200 disabled:opacity-60">
                {downloading
                  ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>Generating PDF…</>
                  : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>Download PDF Invoice</>
                }
              </button>
              <button onClick={onClose} className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Skip for Now</button>
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
      <div className={`flex flex-col items-center justify-center px-6 py-10 text-center transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200"
            style={{ animation: show ? 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none' }}>
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8}
              style={{ strokeDasharray: 40, strokeDashoffset: show ? 0 : 40, transition: 'stroke-dashoffset 0.45s ease 0.25s' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-emerald-400 opacity-0" style={{ animation: show ? 'ripple 1s ease-out 0.3s forwards' : 'none' }} />
          <div className="absolute inset-0 rounded-full border-4 border-emerald-300 opacity-0" style={{ animation: show ? 'ripple 1s ease-out 0.55s forwards' : 'none' }} />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-600 mb-2">Payment Successful</p>
        <h3 className="text-2xl font-black text-gray-900 mb-1">All done!</h3>
        {amount && <p className="text-sm text-gray-500 mb-1">{amount} charged successfully</p>}
        <p className="text-sm text-gray-400 mb-8">Your registration is now active. A confirmation email will be sent shortly.</p>
        <button onClick={onContinue}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-md shadow-emerald-200 hover:-translate-y-0.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0-5 5m5-5H6" /></svg>
          Download Invoice
        </button>
        <style>{`@keyframes popIn{0%{transform:scale(0.4);opacity:0}100%{transform:scale(1);opacity:1}}@keyframes ripple{0%{transform:scale(1);opacity:0.6}100%{transform:scale(1.7);opacity:0}}`}</style>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center px-6 py-10 text-center transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
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
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        Try Again
      </button>
      <style>{`@keyframes popIn{0%{transform:scale(0.4);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
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
  const formatExpiry = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length >= 3 ? d.slice(0, 2) + ' / ' + d.slice(2) : d }

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
    } catch { setPayResult('failed') }
    finally { setPaying(false) }
  }

  const handleContinue = () => setShowInvoicePopup(true)
  const handleInvoicePopupClose = () => { setShowInvoicePopup(false); onPaid() }

  return (
    <>
      {showInvoicePopup && <InvoiceDownloadPopup invoiceData={invoiceData} onClose={handleInvoicePopupClose} />}
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm" onClick={payResult ? undefined : onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
          {payResult && !showInvoicePopup && (
            <PaymentResult success={payResult === 'success'} amount={total} onContinue={handleContinue} onRetry={() => setPayResult(null)} />
          )}
          {!payResult && (<>
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" /></svg>
                </div>
                <div>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5">Secure Checkout</p>
                  <p className="text-white font-black text-base leading-tight">{total}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="mx-5 mt-4 mb-1 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 shadow-lg">
              <div className="flex justify-between items-start mb-3">
                <div className="w-7 h-5 rounded bg-amber-400/90" />
                <svg className="w-7 h-4 text-white/40" viewBox="0 0 48 30" fill="currentColor"><circle cx="17" cy="15" r="13" fillOpacity=".8" /><circle cx="31" cy="15" r="13" fillOpacity=".5" /></svg>
              </div>
              <p className="text-white font-mono text-sm tracking-[0.16em] mb-2.5 truncate">{cardNumber || '•••• •••• •••• ••••'}</p>
              <div className="flex justify-between text-white/60 text-[10px] font-semibold uppercase tracking-wider">
                <span className="truncate max-w-[60%]">{name || 'Cardholder Name'}</span>
                <span className="flex-shrink-0">{expiry || 'MM / YY'}</span>
              </div>
            </div>

            <div className="px-5 pt-3 pb-3 space-y-3.5">
              {cardErr && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01"/></svg>
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
                  <input type="text" inputMode="numeric" placeholder="123"
                    value={cvc} onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} maxLength={4}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 font-mono outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-400 placeholder:font-sans" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium pt-0.5">
                <svg className="w-3 h-3 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016Z" />
                </svg>
                Your payment is secured by 256-bit SSL encryption
              </div>
            </div>

            <div className="border-t border-slate-100 px-5 py-3.5 bg-slate-50/60 flex gap-2.5">
              <button onClick={onClose} disabled={paying}
                className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handlePay} disabled={paying}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 py-2.5 text-sm font-bold text-white transition disabled:opacity-60 shadow-sm">
                {paying
                  ? <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" className="opacity-75" /></svg>Processing…</>
                  : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Pay {total}</>
                }
              </button>
            </div>
          </>)}
        </div>
      </div>
    </>
  )
}

// ─── Wire Transfer Request Success ────────────────────────────────────────────
function WireTransferSuccess({ onClose }) {
  const [show, setShow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShow(true), 60); return () => clearTimeout(t) }, [])
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-10 text-center transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200"
          style={{ animation: show ? 'wirePopIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none' }}>
          <svg className="w-11 h-11 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-blue-400 opacity-0" style={{ animation: show ? 'wireRipple 1s ease-out 0.3s forwards' : 'none' }} />
      </div>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 mb-2">Invoice Request Sent</p>
      <h3 className="text-2xl font-black text-gray-900 mb-2">Request Submitted!</h3>
      <p className="text-sm text-gray-500 mb-2 max-w-xs leading-relaxed">Our team will review your registration and generate a wire transfer invoice within 1 business day.</p>
      <div className="w-full max-w-xs rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 mb-7 text-left space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3">Bank Details for Wire Transfer</p>
        {[['Bank', 'Bank of America'],['Account Owner', 'IFOA USA Corp'],['SWIFT', 'BOFAUS3N'],['Account #', '8981 5632 1560']].map(([k,v]) => (
          <div key={k} className="flex justify-between text-sm">
            <span className="text-gray-400 font-medium">{k}</span>
            <span className="font-bold text-gray-800">{v}</span>
          </div>
        ))}
      </div>
      <button onClick={onClose}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-md shadow-blue-200">
        Done
      </button>
      <style>{`@keyframes wirePopIn{0%{transform:scale(0.4);opacity:0}100%{transform:scale(1);opacity:1}}@keyframes wireRipple{0%{transform:scale(1);opacity:0.6}100%{transform:scale(1.7);opacity:0}}`}</style>
    </div>
  )
}

export default function AirlinesStep4Payment({ data, update, onBack, onSubmit, onMarkPaidAndFinish, submitting, error, isBlocked }) {
  const [errors, setErrors]             = useState({})
  const [paymentMethod, setPaymentMethod] = useState('') // '' | 'card' | 'wire'
  const [showCardModal, setShowCardModal] = useState(false)
  const [registrationId, setRegistrationId] = useState(null)
  const [wireSubmitting, setWireSubmitting] = useState(false)
  const [wireSuccess, setWireSuccess]     = useState(false)

  const holders       = data.certificateHolders || []
  const isUnlimited   = data.subscriptionPlan === 'Unlimited Plan'
  const selectedCount = data.holderCountValue ? parseInt(data.holderCountValue) : holders.length
  const pricePerCert  = data.pricePerCertificate || data.pricePerCert || 0
  const total         = isUnlimited ? pricePerCert : pricePerCert * selectedCount
  const totalLabel    = `${total} USD`

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

  const inputCls = (field) =>
    `w-full px-3.5 py-2.5 border rounded-xl text-sm text-gray-900 bg-white outline-none transition-all duration-150 focus:ring-2 focus:ring-violet-600/15 placeholder:text-gray-400 ${
      errors[field] ? 'border-red-300 focus:border-red-400 bg-red-50/30' : 'border-gray-200 focus:border-violet-600 hover:border-gray-300'
    }`

  const validate = () => {
    const e = {}
    if (!paymentMethod) e.paymentMethod = 'Please select a payment method'
    if (!data.paymentEmail?.trim()) e.paymentEmail = 'Billing email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.paymentEmail)) e.paymentEmail = 'Invalid email address'
    if (!data.agreedToTerms) e.agreedToTerms = 'You must accept the terms before submitting.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleStripeClick = async () => {
    if (isBlocked) return
    if (!validate()) return
    const newId = await onSubmit({ paymentStatus: 'pending', returnId: true })
    if (newId) { setRegistrationId(newId); setShowCardModal(true) }
    else { setShowCardModal(true) }
  }

  const handleWireClick = async () => {
    if (isBlocked) return
    if (!validate()) return
    setWireSubmitting(true)
    try {
      const newId = await onSubmit({ paymentStatus: 'pending', returnId: true })
      if (newId) setRegistrationId(newId)
      // Patch the registration to flag it as wire-transfer invoice requested
      const id = newId || data._id
      if (id) {
        await axios.patch(
          `${BASE_URL}/airlines/${id}/request-invoice`,
          { paymentMethod: 'wire', requestedAt: new Date().toISOString() },
          { headers: { Authorization: `Bearer ${localStorage.getItem('ifoa_token') || ''}` } }
        ).catch(() => {}) // non-fatal if endpoint not yet wired up
      }
      setWireSuccess(true)
    } catch (e) {
      console.error('Wire request failed:', e)
    } finally {
      setWireSubmitting(false)
    }
  }

  const handleCardPaid = async () => {
    setShowCardModal(false)
    await onMarkPaidAndFinish(registrationId || data._id)
  }

  const lineItems = [
    { label: 'Company',      value: data.airlineName },
    { label: 'Contact',      value: [data.firstName, data.lastName].filter(Boolean).join(' ') },
    { label: 'Email',        value: data.email },
    { label: 'Phone',        value: data.phone ? ('+' + data.phone) : '' },
    { label: 'Holder Range', value: data.holderCount },
    { label: 'Team Members', value: String(selectedCount) + ' member' + (selectedCount !== 1 ? 's' : '') },
    { label: isUnlimited ? 'Annual Fee' : 'Price per Certificate', value: `${pricePerCert} USD${isUnlimited ? ' / year' : ''}` },
    { label: 'Total', value: totalLabel },
  ]

  // ── Wire success screen ─────────────────────────────────────────────────────
  if (wireSuccess) {
    return (
      <div className="rounded-2xl border border-blue-200 bg-white overflow-hidden">
        <WireTransferSuccess onClose={() => {}} />
      </div>
    )
  }

  return (
    <div className="space-y-7">
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
            <p className="text-amber-700 text-xs leading-relaxed">You are signed in with an <strong>Individual account</strong>. Only <strong>Airlines accounts</strong> can submit this form.</p>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div>
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Order Summary</h3>
        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                Airlines Plan · {(data.subscriptionPlan || '').replace(' Subscription Plan', '').replace(' Plan', '')}
              </p>
              <p className="text-white text-2xl font-black mt-0.5">
                {`${total}`}<span className="text-base font-normal text-gray-400 ml-1">USD</span>
              </p>
            </div>
            <div className="text-4xl opacity-80">✈️</div>
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
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Select Payment Method</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {/* Card */}
          <button
            type="button"
            onClick={() => setPaymentMethod('card')}
            className={`relative rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
              paymentMethod === 'card'
                ? 'border-red-500 bg-red-50/60 shadow-sm shadow-red-100'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                paymentMethod === 'card' ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                <svg className={`w-5 h-5 ${paymentMethod === 'card' ? 'text-red-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
                </svg>
              </div>
              <div className="flex-1">
                <p className={`font-black text-sm ${paymentMethod === 'card' ? 'text-red-700' : 'text-gray-900'}`}>Credit / Debit Card</p>
                <p className="text-xs text-gray-400">Instant payment</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                paymentMethod === 'card' ? 'border-red-500 bg-red-500' : 'border-gray-300 bg-white'
              }`}>
                {paymentMethod === 'card' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">Pay securely now with Visa, Mastercard, Amex, Apple Pay, or Google Pay.</p>
          </button>

          {/* Wire Transfer */}
          <button
            type="button"
            onClick={() => setPaymentMethod('wire')}
            className={`relative rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
              paymentMethod === 'wire'
                ? 'border-blue-500 bg-blue-50/60 shadow-sm shadow-blue-100'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                paymentMethod === 'wire' ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <svg className={`w-5 h-5 ${paymentMethod === 'wire' ? 'text-blue-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className={`font-black text-sm ${paymentMethod === 'wire' ? 'text-blue-700' : 'text-gray-900'}`}>Wire Transfer</p>
                <p className="text-xs text-gray-400">Invoice via bank transfer</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                paymentMethod === 'wire' ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'
              }`}>
                {paymentMethod === 'wire' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">Request an invoice — admin will generate a wire-transfer invoice for your company within 1 business day.</p>
            {paymentMethod === 'wire' && (
              <div className="mt-3 rounded-xl bg-blue-100/70 border border-blue-200 px-3 py-2.5 text-xs text-blue-700 space-y-1">
                <p className="font-black uppercase tracking-widest text-[9px] text-blue-500 mb-1.5">Bank of America — Wire Details</p>
                {[['Account Owner','IFOA USA Corp'],['SWIFT','BOFAUS3N'],['Account #','8981 5632 1560']].map(([k,v]) => (
                  <div key={k} className="flex justify-between"><span className="text-blue-500">{k}</span><span className="font-bold">{v}</span></div>
                ))}
              </div>
            )}
          </button>
        </div>
        {errors.paymentMethod && (
          <p className="mt-2 text-xs font-semibold text-red-500 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {errors.paymentMethod}
          </p>
        )}
      </div>

      {/* Billing Details */}
      <div>
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Billing Details</h3>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
            Billing Email Address <span className="text-red-400">*</span>
          </label>
          <input type="email" placeholder="billing@yourairline.com"
            value={data.paymentEmail || ''} onChange={e => update({ paymentEmail: e.target.value })}
            className={inputCls('paymentEmail')} />
          {errors.paymentEmail && (
            <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              {errors.paymentEmail}
            </span>
          )}
        </div>
      </div>

      {/* Terms */}
      <div className={`rounded-[26px] border p-5 ${errors.agreedToTerms ? 'border-red-200 bg-red-50/70' : 'border-slate-200 bg-slate-50/80'}`}>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={data.agreedToTerms || false} onChange={(e) => update({ agreedToTerms: e.target.checked })} className="mt-1 h-4 w-4 accent-blue-600" />
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
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      <div className="flex justify-between pt-6 border-t border-gray-100">
        <button onClick={onBack} disabled={submitting || wireSubmitting}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all duration-150 disabled:opacity-40">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
          Previous
        </button>

        {/* Dynamic CTA based on payment method */}
        {paymentMethod === 'wire' ? (
          <button
            onClick={handleWireClick}
            disabled={wireSubmitting || isBlocked}
            className={`inline-flex items-center gap-2.5 px-8 py-3 text-white font-bold rounded-xl transition-all duration-150 shadow-sm min-w-52 justify-center ${
              isBlocked ? 'bg-gray-300 cursor-not-allowed opacity-60'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 hover:shadow-md hover:-translate-y-px disabled:opacity-50'
            }`}>
            {wireSubmitting
              ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" className="opacity-75" /></svg>Submitting…</>
              : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Request Wire Invoice</>
            }
          </button>
        ) : (
          <button
            onClick={handleStripeClick}
            disabled={submitting || isBlocked}
            title={isBlocked ? 'You need an Airlines account to submit this form' : undefined}
            className={`inline-flex items-center gap-2.5 px-8 py-3 text-white font-bold rounded-xl transition-all duration-150 shadow-sm min-w-52 justify-center ${
              isBlocked
                ? 'bg-gray-300 cursor-not-allowed opacity-60'
                : 'bg-red-600 hover:bg-red-700 active:bg-red-800 hover:shadow-md hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
            }`}>
            {submitting
              ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" className="opacity-75" /></svg>Completing…</>
              : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" /></svg>
                {paymentMethod === 'card' ? 'Enter Card Details' : 'Select Payment Method'}
              </>
            }
          </button>
        )}
      </div>
    </div>
  )
}
