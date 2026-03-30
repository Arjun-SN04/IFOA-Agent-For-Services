import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'

const API = axios.create({ baseURL: 'http://localhost:5000/api' })

/* ─── tiny helpers ─── */
const money = (n) => `$${Number(n).toFixed(2)}`

function formatCardNumber(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}
function formatExpiry(val) {
  const d = val.replace(/\D/g, '').slice(0, 4)
  return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}
function formatCVV(val) {
  return val.replace(/\D/g, '').slice(0, 4)
}

/* ─── card brand detector ─── */
function cardBrand(num) {
  const n = num.replace(/\s/g, '')
  if (/^4/.test(n)) return 'visa'
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard'
  if (/^3[47]/.test(n)) return 'amex'
  if (/^6/.test(n)) return 'discover'
  return null
}

function CardIcon({ brand, className = 'w-8 h-5' }) {
  if (brand === 'visa')
    return (
      <svg className={className} viewBox="0 0 48 30" fill="none">
        <rect width="48" height="30" rx="4" fill="#1A1F71" />
        <text x="50%" y="21" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">VISA</text>
      </svg>
    )
  if (brand === 'mastercard')
    return (
      <svg className={className} viewBox="0 0 48 30" fill="none">
        <rect width="48" height="30" rx="4" fill="#252525" />
        <circle cx="18" cy="15" r="9" fill="#EB001B" />
        <circle cx="30" cy="15" r="9" fill="#F79E1B" />
        <path d="M24 7.8a9 9 0 0 1 0 14.4A9 9 0 0 1 24 7.8Z" fill="#FF5F00" />
      </svg>
    )
  if (brand === 'amex')
    return (
      <svg className={className} viewBox="0 0 48 30" fill="none">
        <rect width="48" height="30" rx="4" fill="#2E77BC" />
        <text x="50%" y="20" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="Arial">AMERICAN EXPRESS</text>
      </svg>
    )
  return (
    <svg className={className} viewBox="0 0 48 30" fill="none">
      <rect width="48" height="30" rx="4" fill="#e2e8f0" />
      <rect x="8" y="10" width="32" height="4" rx="1" fill="#94a3b8" />
      <rect x="8" y="18" width="14" height="3" rx="1" fill="#94a3b8" />
    </svg>
  )
}

/* ─── Success animation ─── */
function SuccessView({ amount, plan, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="py-10 px-6 flex flex-col items-center text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-300 flex items-center justify-center mb-5"
      >
        <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>
      <h3 className="text-2xl font-black text-slate-900 mb-2">Payment Successful!</h3>
      <p className="text-slate-500 text-sm mb-1">Your subscription is now <span className="text-emerald-600 font-bold">Active</span>.</p>
      <p className="text-slate-400 text-xs mb-6">{plan} · {money(amount)} paid</p>
      <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 mb-6 text-left">
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">What happens next</p>
        <ul className="text-xs text-emerald-800 space-y-1.5">
          <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Your FAA Agent for Service is now active</li>
          <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> An invoice has been generated for your records</li>
          <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Our team will process your FAA correspondence immediately</li>
        </ul>
      </div>
      <button
        onClick={onClose}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-all"
      >
        Back to Dashboard
      </button>
    </motion.div>
  )
}

/* ─── Main PaymentModal ─── */
export default function PaymentModal({ sub, registrationId, registrationModel, onClose, onSuccess }) {
  const [step, setStep] = useState('review') // review | pay | processing | success
  const [paymentToken, setPaymentToken] = useState(null)
  const [amount, setAmount] = useState(0)
  const [error, setError] = useState('')
  const [initiating, setInitiating] = useState(false)

  // Card form state
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [focus, setFocus] = useState(null)
  const cardRef = useRef(null)

  const token = localStorage.getItem('ifoa_token')
  const headers = { Authorization: `Bearer ${token}` }
  const brand = cardBrand(cardNumber)

  const isAirline = registrationModel === 'Airlines' || registrationModel === 'AirlinesSubscription'
  const planAmount = sub?.price || sub?.totalAmount || sub?.totalServiceFees || 0

  // Step 1: initiate payment intent
  const handleInitiate = async () => {
    setInitiating(true)
    setError('')
    try {
      const r = await API.post('/payments/initiate', { registrationId, registrationModel }, { headers })
      setPaymentToken(r.data.paymentToken)
      setAmount(r.data.amount)
      setStep('pay')
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not initiate payment. Please try again.')
    } finally {
      setInitiating(false)
    }
  }

  // Step 2: confirm payment
  const handleConfirm = async () => {
    // Basic client-side validation
    if (!cardName.trim()) return setError('Please enter the name on card.')
    const rawNum = cardNumber.replace(/\s/g, '')
    if (rawNum.length < 13) return setError('Please enter a valid card number.')
    if (!expiry || expiry.length < 5) return setError('Please enter a valid expiry date.')
    if (!cvv || cvv.length < 3) return setError('Please enter your CVV.')

    // Expiry check
    const [mm, yy] = expiry.split('/')
    const expDate = new Date(`20${yy}`, mm - 1)
    if (expDate <= new Date()) return setError('Your card appears to be expired.')

    setError('')
    setStep('processing')
    try {
      const r = await API.post('/payments/confirm', {
        registrationId,
        registrationModel,
        paymentToken,
        cardName,
        last4: rawNum.slice(-4),
        expiry,
      }, { headers })
      setStep('success')
      onSuccess(r.data.data) // pass updated record back
    } catch (e) {
      setError(e?.response?.data?.message || 'Payment failed. Please try again.')
      setStep('pay')
    }
  }

  const cardLast4 = cardNumber.replace(/\s/g, '').slice(-4)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={step !== 'processing' ? onClose : undefined}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 32, scale: 0.97 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        {step !== 'success' && (
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-md shadow-red-200">
                <svg className="w-4.5 h-4.5 text-white w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Secure Checkout</p>
                <p className="text-sm font-black text-slate-900">Complete Payment</p>
              </div>
            </div>
            {step !== 'processing' && (
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className="overflow-y-auto max-h-[80vh]">
          <AnimatePresence mode="wait">

            {/* ── REVIEW STEP ── */}
            {step === 'review' && (
              <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-4">
                {/* Order summary */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Order Summary</p>
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{sub?.subscriptionPlan || 'Subscription Plan'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {isAirline ? `${sub?.airlineName || 'Airlines'} · ${sub?.certificateHolders?.length || 0} holder(s)` : `${sub?.primaryCertificate || 'FAA Certificate'}`}
                        </p>
                      </div>
                      <p className="text-lg font-black text-slate-900 whitespace-nowrap">{money(planAmount)}</p>
                    </div>
                    <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between items-center">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Due</p>
                      <p className="text-xl font-black text-red-600">{money(planAmount)}</p>
                    </div>
                  </div>
                </div>

                {/* What's included */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">What's included</p>
                  <ul className="space-y-2">
                    {[
                      'U.S. Agent for Service (FAA compliance)',
                      'Physical Daytona Beach address for FAA mail',
                      'Real-time mail scanning & forwarding',
                      isAirline ? 'Team management & bulk certificate support' : 'Personal certificate holder support',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-slate-600">
                        <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-medium">{error}</div>
                )}

                <button
                  onClick={handleInitiate}
                  disabled={initiating}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-black py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200"
                >
                  {initiating ? (
                    <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>Preparing…</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" /></svg>Proceed to Payment · {money(planAmount)}</>
                  )}
                </button>

                <p className="text-center text-[10px] text-slate-400">
                  🔒 256-bit SSL encrypted · Secure checkout
                </p>
              </motion.div>
            )}

            {/* ── CARD PAYMENT STEP ── */}
            {step === 'pay' && (
              <motion.div key="pay" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 space-y-5">

                {/* Visual card preview */}
                <div
                  className="relative rounded-2xl p-5 overflow-hidden h-40 select-none"
                  style={{ background: brand === 'visa' ? 'linear-gradient(135deg,#1a1f71,#3b4dbf)' : brand === 'mastercard' ? 'linear-gradient(135deg,#1a1a1a,#444)' : brand === 'amex' ? 'linear-gradient(135deg,#2e77bc,#1a4e8c)' : 'linear-gradient(135deg,#dc2626,#991b1b)' }}
                >
                  {/* shimmer lines */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full" style={{ background: 'repeating-linear-gradient(135deg,transparent,transparent 40px,rgba(255,255,255,.1) 40px,rgba(255,255,255,.1) 41px)' }} />
                  </div>
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-7 rounded-md bg-amber-300/80 border border-amber-400/50" style={{ background: 'linear-gradient(135deg,#fcd34d,#d97706)' }}>
                        <div className="h-full grid grid-rows-3 gap-px p-1">
                          <div className="bg-amber-500/40 rounded-sm" />
                          <div className="bg-amber-500/40 rounded-sm" />
                          <div className="bg-amber-500/40 rounded-sm" />
                        </div>
                      </div>
                      <CardIcon brand={brand} className="w-12 h-8" />
                    </div>
                    <div>
                      <p className="text-white/60 font-mono text-xs tracking-widest mb-1">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </p>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-white/50 text-[9px] uppercase tracking-widest">Card Holder</p>
                          <p className="text-white font-bold text-sm truncate max-w-[160px]">{cardName || 'YOUR NAME'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/50 text-[9px] uppercase tracking-widest">Expires</p>
                          <p className="text-white font-bold text-sm">{expiry || 'MM/YY'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amount chip */}
                <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                  <p className="text-xs font-bold text-slate-500">Amount to charge</p>
                  <p className="text-lg font-black text-red-600">{money(amount)}</p>
                </div>

                {/* Card inputs */}
                <div className="space-y-3">
                  {/* Name */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Name on Card</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                      onFocus={() => setFocus('name')}
                      onBlur={() => setFocus(null)}
                      className={`w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-900 placeholder-slate-300 outline-none transition-all ${focus === 'name' ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 hover:border-slate-300'}`}
                    />
                  </div>

                  {/* Card number */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Card Number</label>
                    <div className="relative">
                      <input
                        ref={cardRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                        onFocus={() => setFocus('number')}
                        onBlur={() => setFocus(null)}
                        className={`w-full rounded-xl border px-4 py-3 text-sm font-mono text-slate-900 placeholder-slate-300 outline-none transition-all pr-12 ${focus === 'number' ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 hover:border-slate-300'}`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CardIcon brand={brand} className="w-10 h-6" />
                      </div>
                    </div>
                  </div>

                  {/* Expiry + CVV */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Expiry</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={e => setExpiry(formatExpiry(e.target.value))}
                        onFocus={() => setFocus('expiry')}
                        onBlur={() => setFocus(null)}
                        className={`w-full rounded-xl border px-4 py-3 text-sm font-mono text-slate-900 placeholder-slate-300 outline-none transition-all ${focus === 'expiry' ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 hover:border-slate-300'}`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">CVV</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder={brand === 'amex' ? '••••' : '•••'}
                        value={cvv}
                        onChange={e => setCvv(formatCVV(e.target.value))}
                        onFocus={() => setFocus('cvv')}
                        onBlur={() => setFocus(null)}
                        className={`w-full rounded-xl border px-4 py-3 text-sm font-mono text-slate-900 placeholder-slate-300 outline-none transition-all ${focus === 'cvv' ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 hover:border-slate-300'}`}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></svg>
                    {error}
                  </div>
                )}

                <button
                  onClick={handleConfirm}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Pay {money(amount)} Securely
                </button>

                <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400">
                  <span>🔒 SSL Encrypted</span>
                  <span>·</span>
                  <span>🛡 Secure Payment</span>
                  <span>·</span>
                  <span>✅ FAA Compliant</span>
                </div>

                <button onClick={() => { setStep('review'); setError('') }} className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors py-1">
                  ← Back to order summary
                </button>
              </motion.div>
            )}

            {/* ── PROCESSING STEP ── */}
            {step === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 px-6 flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-red-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">Processing Payment…</h3>
                <p className="text-slate-400 text-sm">Please do not close this window</p>
                <div className="mt-6 space-y-2 w-full max-w-xs">
                  {['Verifying card details', 'Processing transaction', 'Activating subscription'].map((s, i) => (
                    <motion.div
                      key={s}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.4 }}
                      className="flex items-center gap-2 text-xs text-slate-500"
                    >
                      <svg className="w-3.5 h-3.5 animate-spin text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
                        <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" />
                      </svg>
                      {s}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── SUCCESS STEP ── */}
            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <SuccessView amount={amount} plan={sub?.subscriptionPlan} onClose={onClose} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
