import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import InvoiceModal from './InvoiceModal'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

const ELEMENTS_APPEARANCE = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#dc2626',
    colorBackground: '#ffffff',
    colorText: '#0f172a',
    colorDanger: '#dc2626',
    fontFamily: 'system-ui, sans-serif',
    spacingUnit: '4px',
    borderRadius: '10px',
  },
  rules: {
    '.Input': { border: '1px solid #e2e8f0', boxShadow: 'none', padding: '10px 14px' },
    '.Input:focus': { border: '1px solid #dc2626', boxShadow: '0 0 0 3px rgba(220,38,38,0.12)' },
    '.Label': { fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' },
    '.Tab': { border: '1px solid #e2e8f0', boxShadow: 'none' },
    '.Tab:hover': { border: '1px solid #dc2626' },
    '.Tab--selected': { border: '2px solid #dc2626', boxShadow: '0 0 0 3px rgba(220,38,38,0.12)' },
  },
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── Payment Success Screen (shown before invoice) ─────────────────────────────
function PaymentSuccessScreen({ amount, onViewInvoice }) {
  const [show, setShow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShow(true), 60); return () => clearTimeout(t) }, [])

  return (
    <div className={`flex flex-col items-center justify-center px-6 py-10 text-center transition-all duration-500 ${
      show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      {/* Animated green circle + tick */}
      <div className="relative mb-6">
        <div
          className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200"
          style={{ animation: show ? 'pmPopIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none' }}
        >
          <svg
            className="w-12 h-12 text-white"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8}
            style={{
              strokeDasharray: 40,
              strokeDashoffset: show ? 0 : 40,
              transition: 'stroke-dashoffset 0.45s ease 0.25s',
            }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        {/* Ripple rings */}
        <div className="absolute inset-0 rounded-full border-4 border-emerald-400 opacity-0"
          style={{ animation: show ? 'pmRipple 1s ease-out 0.3s forwards' : 'none' }} />
        <div className="absolute inset-0 rounded-full border-4 border-emerald-300 opacity-0"
          style={{ animation: show ? 'pmRipple 1s ease-out 0.55s forwards' : 'none' }} />
      </div>

      <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-600 mb-2">Payment Successful</p>
      <h3 className="text-2xl font-black text-gray-900 mb-1">All done!</h3>
      {amount && (
        <p className="text-sm text-gray-500 mb-1">
          ${(amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} charged successfully
        </p>
      )}
      <p className="text-sm text-gray-400 mb-8">
        Your subscription is now active. A confirmation email will be sent shortly.
      </p>

      <button
        onClick={onViewInvoice}
        className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-md shadow-red-200 hover:-translate-y-0.5"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        View &amp; Download Invoice
      </button>

      <style>{`
        @keyframes pmPopIn  { 0%{transform:scale(0.4);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes pmRipple { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.7);opacity:0} }
      `}</style>
    </div>
  )
}

// ── Inner checkout form ───────────────────────────────────────────────────────
function CheckoutForm({ registrationId, registrationModel, amount, subscriptionData, onSuccess, onCancel }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [loading,       setLoading]      = useState(false)
  const [error,         setError]        = useState(null)
  // phase: 'form' | 'success' | 'invoice'
  const [phase,         setPhase]        = useState('form')
  const [invoice,       setInvoice]      = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    try {
      // 1. Submit Stripe Elements (validates fields)
      const { error: submitErr } = await elements.submit()
      if (submitErr) throw new Error(submitErr.message)

      // 2. Confirm payment with Stripe
      const { error: stripeErr, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      })
      if (stripeErr) throw new Error(stripeErr.message)

      if (paymentIntent?.status === 'succeeded') {
        // 3. Call our backend /confirm endpoint
        const token = localStorage.getItem('ifoa_token') || ''
        const confirmRes = await fetch(`${BASE_URL}/payments/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            paymentIntentId:   paymentIntent.id,
            registrationId,
            registrationModel,
            userAgent:         navigator.userAgent,
          }),
        })
        const confirmJson = await confirmRes.json()
        if (!confirmJson.success) {
          console.warn('[PaymentModal] Backend confirm failed:', confirmJson.message)
        }

        // 4. Build invoice
        const inv = confirmJson.payment
          ? serverPaymentToInvoice(confirmJson.payment)
          : buildInvoice(subscriptionData, registrationModel, amount, paymentIntent, new Date())

        setInvoice(inv)
        // Show success tick screen first
        setPhase('success')
        onSuccess?.(inv, confirmJson.registration)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Success tick screen (before invoice) ────────────────────────────────────
  if (phase === 'success') {
    return (
      <PaymentSuccessScreen
        amount={amount}
        onViewInvoice={() => setPhase('invoice')}
      />
    )
  }

  // ── Invoice modal screen ─────────────────────────────────────────────────────
  if (phase === 'invoice' && invoice) {
    return (
      <InvoiceModal
        invoice={invoice}
        onClose={() => { setPhase('success'); onCancel?.() }}
      />
    )
  }

  // ── Payment form ─────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Amount */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount Due</p>
          <p className="text-2xl font-black text-slate-900 mt-0.5">
            ${(amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          SSL Secured
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div>
        <PaymentElement
          options={{
            layout: { type: 'tabs', defaultCollapsed: false },
            wallets: { applePay: 'auto', googlePay: 'auto' },
          }}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} disabled={loading}
          className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={!stripe || loading}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 py-3 text-sm font-bold text-white transition disabled:opacity-50 shadow-md shadow-red-200">
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
                <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" />
              </svg>
              Processing…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
              </svg>
              Pay ${(amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </>
          )}
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Secured by SSL · Card · Apple Pay · Google Pay · Link — all supported
      </div>
    </form>
  )
}

// ── Convert a server Payment document to the invoice shape InvoiceModal expects ─
export function serverPaymentToInvoice(payment) {
  const snap = payment.invoiceSnapshot || {}
  return {
    invoiceNumber:    payment.invoiceNumber,
    paidAt:           payment.paidAt || payment.createdAt,
    subscriptionPlan: snap.subscriptionPlan || '—',
    expirationDate:   snap.expirationDate   || null,
    amount:           payment.amountDollars,
    currency:         payment.currency || 'USD',
    paymentId:        payment.stripePaymentIntentId || '—',
    name:             snap.name    || '—',
    email:            snap.email   || '—',
    phone:            snap.phone   || '—',
    address:          snap.address || '—',
    isAirline:        snap.isAirline || false,
    pricePerCert:     snap.pricePerCert  || null,
    holderCount:      snap.holderCount   || null,
    primaryCertificate:   snap.primaryCertificate   || null,
    faaCertificateNumber: snap.faaCertificateNumber || null,
    iacraTrackingNumber:  snap.iacraTrackingNumber  || null,
    last4:     payment.last4     || null,
    cardBrand: payment.cardBrand || null,
    paymentMethodType: payment.paymentMethodType || null,
    _paymentDocId: payment._id,
  }
}

// ── Build invoice object from subscription data (local fallback) ──────────────
export function buildInvoice(sub, registrationModel, amountCents, paymentIntent, paidAt) {
  const isAirline = registrationModel === 'Airlines' || registrationModel === 'AirlinesSubscription'
  const now = paidAt || new Date()

  let expirationDate = sub?.expirationDate || null
  if (!expirationDate && sub?.subscriptionPlan) {
    if (sub.subscriptionPlan === '1 Year Subscription Plan') {
      const d = new Date(now); d.setFullYear(d.getFullYear() + 1)
      expirationDate = d
    } else if (sub.subscriptionPlan === 'Multiple Years Subscription Plan') {
      const d = new Date(now); d.setFullYear(d.getFullYear() + 3)
      expirationDate = d
    }
  }

  return {
    invoiceNumber: sub?.invoiceNumber || `INV-${Date.now()}`,
    paidAt:        now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    subscriptionPlan: sub?.subscriptionPlan || '—',
    expirationDate: expirationDate ? new Date(expirationDate).toISOString() : null,
    amount:        amountCents / 100,
    currency:      'USD',
    paymentId:     paymentIntent?.id || '—',
    name: isAirline
      ? sub?.airlineName || [sub?.firstName, sub?.lastName].filter(Boolean).join(' ')
      : [sub?.firstName, sub?.lastName].filter(Boolean).join(' '),
    email: sub?.email || sub?.contactEmail || sub?.paymentEmail || '—',
    phone: sub?.phone || sub?.contactPhone || '—',
    address: [sub?.addressLine1, sub?.city, sub?.state, sub?.postalCode, sub?.country].filter(Boolean).join(', '),
    isAirline,
    pricePerCert: sub?.pricePerCertificate || sub?.pricePerCert || null,
    holderCount:  sub?.certificateHolders?.length || sub?.committedCount || null,
    primaryCertificate: sub?.primaryCertificate || null,
    faaCertificateNumber: sub?.faaCertificateNumber || null,
    iacraTrackingNumber: sub?.iacraTrackingNumber || null,
  }
}

// ── Wrapper: fetches clientSecret then mounts Elements ────────────────────────
export default function PaymentModal({ registrationId, registrationModel, amount, subscriptionData, onClose, onSuccess }) {
  const [clientSecret, setClientSecret] = useState(null)
  const [fetchError,   setFetchError]   = useState(null)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    const create = async () => {
      try {
        const res = await fetch(`${BASE_URL}/payments/create-intent`, {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${localStorage.getItem('ifoa_token') || ''}`,
          },
          body: JSON.stringify({ registrationId, registrationModel }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.message || 'Could not create payment intent')
        setClientSecret(json.clientSecret)
      } catch (err) {
        setFetchError(err.message)
      } finally {
        setLoading(false)
      }
    }
    create()
  }, [registrationId, registrationModel])

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-4">

        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Secure Payment</p>
            <h2 className="text-lg font-extrabold text-slate-900">Complete Your Subscription</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition">
            ✕
          </button>
        </div>

        <div className="px-6 py-6">
          {loading && (
            <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
                <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" />
              </svg>
              <span className="text-sm">Preparing secure checkout…</span>
            </div>
          )}

          {fetchError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              <p className="font-bold mb-1">Failed to initialize payment</p>
              <p>{fetchError}</p>
              <button onClick={onClose} className="mt-3 text-xs font-semibold underline">Close</button>
            </div>
          )}

          {clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: ELEMENTS_APPEARANCE }}
            >
              <CheckoutForm
                registrationId={registrationId}
                registrationModel={registrationModel}
                amount={amount}
                subscriptionData={subscriptionData}
                onSuccess={onSuccess}
                onCancel={onClose}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  )
}
