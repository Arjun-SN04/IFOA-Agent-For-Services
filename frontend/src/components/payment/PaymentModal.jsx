import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import InvoiceModal from './InvoiceModal'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY, {
  advancedFraudSignals: false,
})

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

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#0f172a',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '18px',
      '::placeholder': { color: '#94a3b8' },
      iconColor: '#64748b',
    },
    invalid: {
      color: '#dc2626',
      iconColor: '#dc2626',
    },
  },
}

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
function CheckoutForm({ clientSecret, registrationId, registrationModel, amount, subscriptionData, purpose, onSuccess, onCancel }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [cardholderName, setCardholderName] = useState('')
  const [loading,       setLoading]      = useState(false)
  const [error,         setError]        = useState(null)
  // phase: 'form' | 'success' | 'invoice'
  const [phase,         setPhase]        = useState('form')
  const [invoice,       setInvoice]      = useState(null)

  const fetchCanonicalInvoice = async (token) => {
    try {
      const res = await fetch(`${BASE_URL}/invoices/by-registration/${registrationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return null

      const json = await res.json()
      const docs = Array.isArray(json?.data) ? json.data : []
      if (!docs.length) return null

      // Prefer the newest canonical invoice document. The backend updates the
      // original invoice in place for holder-upgrades, so this usually returns
      // the airline's active invoice with the refreshed holder count.
      return docs[0]
    } catch {
      return null
    }
  }

  const invoiceDocToInvoice = (invDoc, fallbackPaymentId) => {
    if (!invDoc) return null
    const lineItem = Array.isArray(invDoc.lineItems) ? invDoc.lineItems[0] : null
    return {
      invoiceNumber:     invDoc.invoiceNumber || '—',
      paidAt:            invDoc.paidAt || invDoc.issueDate,
      subscriptionPlan:  invDoc.subscriptionPlan || '—',
      expirationDate:    invDoc.expirationDate || null,
      amount:            invDoc.totalAmount ?? invDoc.subtotal ?? 0,
      currency:          invDoc.currency || 'USD',
      paymentId:         invDoc.paymentId || fallbackPaymentId || '—',
      name:              invDoc.recipientName || invDoc.recipientCompany || '',
      email:             invDoc.recipientEmail || '',
      phone:             invDoc.recipientPhone || '',
      address:           [invDoc.recipientAddress1, invDoc.recipientAddress2, invDoc.recipientCountry].filter(Boolean).join(', '),
      isAirline:         invDoc.isAirline || registrationModel !== 'Individual',
      airlineName:       invDoc.recipientCompany || '',
      pricePerCert:      lineItem?.unitPrice ?? null,
      holderCount:       lineItem?.quantity ?? null,
      invoiceDraft:      invDoc.draft || null,
      _invoiceDocId:     invDoc._id,
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    try {
      const cardNumberEl = elements.getElement(CardNumberElement)
      if (!cardNumberEl) {
        throw new Error('Card form is not ready. Please try again.')
      }

      // 1. Confirm payment with Stripe card element
      const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberEl,
          billing_details: {
            name: cardholderName?.trim() || undefined,
            email: subscriptionData?.email || subscriptionData?.paymentEmail || undefined,
          },
        },
      })
      if (stripeErr) throw new Error(stripeErr.message)

      if (paymentIntent?.status === 'succeeded') {
        const token = localStorage.getItem('ifoa_token') || ''

        // 2. Call primary /payments/confirm endpoint — creates Payment record & marks subscription Active
        let confirmJson = { success: false }
        try {
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
              purpose:           purpose || 'payment',
              userAgent:         navigator.userAgent,
            }),
          })
          confirmJson = await confirmRes.json()
        } catch (networkErr) {
          console.warn('[PaymentModal] /payments/confirm network error:', networkErr.message)
        }

        // 3. Fallback: if the primary confirm failed, directly mark the registration paid
        //    This guarantees the user's profile shows Active even if the Payment record write failed
        if (!confirmJson.success) {
          console.warn('[PaymentModal] Primary confirm failed, running fallback mark-paid:', confirmJson.message)
          try {
            const markPaidUrl = registrationModel === 'Individual'
              ? `${BASE_URL}/individuals/${registrationId}/mark-paid`
              : `${BASE_URL}/airlines/${registrationId}/mark-paid`
            await fetch(markPaidUrl, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}` },
            })
          } catch (fallbackErr) {
            console.warn('[PaymentModal] Fallback mark-paid also failed:', fallbackErr.message)
          }
        }

        // 4. Prefer the canonical Invoice doc so airline holder-upgrades show
        // the refreshed active-plan invoice to both the airline and admin.
        const canonicalInvoice = await fetchCanonicalInvoice(token)
        const inv = canonicalInvoice
          ? invoiceDocToInvoice(canonicalInvoice, confirmJson.payment?.stripePaymentIntentId || paymentIntent.id)
          : (confirmJson.payment
              ? serverPaymentToInvoice(confirmJson.payment)
              : buildInvoice(subscriptionData, registrationModel, amount, paymentIntent, new Date()))

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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Card preview */}
      <div className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 shadow-lg">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Amount</p>
            <p className="text-white font-black text-base">
              ${(amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <svg className="w-7 h-4 text-white/40" viewBox="0 0 48 30" fill="currentColor">
            <circle cx="17" cy="15" r="13" fillOpacity=".8" />
            <circle cx="31" cy="15" r="13" fillOpacity=".5" />
          </svg>
        </div>
        <p className="text-white font-mono text-sm tracking-[0.16em] mb-2.5">•••• •••• •••• ••••</p>
        <div className="flex justify-between text-white/60 text-[10px] font-semibold uppercase tracking-wider">
          <span className="truncate max-w-[60%]">{cardholderName?.trim() || 'Cardholder Name'}</span>
          <span>MM / YY</span>
        </div>
      </div>

      {/* Cardholder */}
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
          Cardholder Name
        </label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="Name on card"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />
      </div>

      {/* Card fields (card-only checkout) */}
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
          Card Number
        </label>
        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
          <CardNumberElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
            Expiration Date
          </label>
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
            <CardExpiryElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
            Security Code
          </label>
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
            <CardCvcElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </div>
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
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={loading || !stripe}
          className="flex-[2] rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-3 text-sm transition disabled:opacity-60 flex items-center justify-center gap-2">
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Pay ${(amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </>
          )}
        </button>
      </div>

      <p className="text-center text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1.5">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Secured by Stripe · 256-bit SSL encryption
      </p>
    </form>
  )
}

// ── Utility: build a local invoice object from subscription + paymentIntent ───
export function buildInvoice(sub, registrationModel, amountCents, paymentIntent, now) {
  const isAirline = registrationModel !== 'Individual'
  const expirationDate = (() => {
    if (!sub?.subscriptionPlan) return null
    const d = new Date(now)
    if (sub.subscriptionPlan === '1 Year Subscription Plan') {
      d.setFullYear(d.getFullYear() + 1)
      return d.toISOString()
    }
    if (sub.subscriptionPlan === 'Multiple Years Subscription Plan') {
      const years = sub.multiYearCount || 3
      d.setFullYear(d.getFullYear() + years)
      return d.toISOString()
    }
    return null // Unlimited
  })()

  return {
    invoiceNumber:    sub?.invoiceNumber || paymentIntent?.id?.slice(-8).toUpperCase() || '—',
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
    // committedCount is the billed quantity — always prefer it over the current
    // certificateHolders length, which may be partially filled.
    holderCount:  sub?.committedCount || sub?.holderCountValue || sub?.certificateHolders?.length || null,
    primaryCertificate: sub?.primaryCertificate || null,
    faaCertificateNumber: sub?.faaCertificateNumber || null,
    iacraTrackingNumber: sub?.iacraTrackingNumber || null,
  }
}

// ── Utility: convert a server Payment document to invoice shape ───────────────
export function serverPaymentToInvoice(paymentDoc) {
  if (!paymentDoc) return null
  const snap = paymentDoc.invoiceSnapshot || {}
  const draft = paymentDoc.invoiceDraft || null
  return {
    invoiceNumber:    paymentDoc.invoiceNumber || snap.invoiceNumber || '—',
    paidAt:           paymentDoc.paidAt || snap.subscriptionDate,
    subscriptionPlan: snap.subscriptionPlan || '—',
    expirationDate:   snap.expirationDate || null,
    amount:           paymentDoc.amountDollars ?? snap.totalPaid ?? 0,
    currency:         paymentDoc.currency || 'USD',
    paymentId:        paymentDoc.stripePaymentIntentId || paymentDoc._id || '—',
    name:             snap.name || '—',
    email:            snap.email || '—',
    phone:            snap.phone || '',
    address:          snap.address || '',
    isAirline:        snap.isAirline || false,
    airlineName:      snap.airlineName || '',
    pricePerCert:     snap.pricePerCert || null,
    holderCount:      snap.holderCount || null,
    primaryCertificate:   snap.primaryCertificate || null,
    faaCertificateNumber: snap.faaCertificateNumber || null,
    iacraTrackingNumber:  snap.iacraTrackingNumber  || null,
    invoiceDraft: draft,
    _paymentDocId: paymentDoc._id,
  }
}

// ── Wrapper: fetches clientSecret then mounts Elements ────────────────────────
// newSubscriptionPlan: optional — pass when user changes plan at renewal time
export default function PaymentModal({ registrationId, registrationModel, amount, subscriptionData, purpose, onClose, onSuccess, newSubscriptionPlan, renewalMultiYearCount, renewalExactCount, additionalHolderCount }) {
  const [clientSecret, setClientSecret] = useState(null)
  const [fetchError,   setFetchError]   = useState(null)
  const [loading,      setLoading]      = useState(true)

  // Lock background page scroll without shifting viewport position.
  // This page uses its own fixed-height scroll container, so forcing
  // body to `position: fixed` can make the checkout panel render off-screen.
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
    }
  }, [])

  useEffect(() => {
    // Don't fire until we have a real registrationId — avoids 401 on first render
    if (!registrationId || !registrationModel) return
    const create = async () => {
      try {
        const body = {
          registrationId,
          registrationModel,
          purpose: purpose || 'payment',
        }
        // Forward plan-change request so backend can compute the correct amount
        if (newSubscriptionPlan) body.newSubscriptionPlan = newSubscriptionPlan
        // Forward user-selected year count for Multi-Year renewals
        if (renewalMultiYearCount) body.renewalMultiYearCount = renewalMultiYearCount
        // Forward user-adjusted holder count for airline renewals
        if (renewalExactCount) body.renewalExactCount = renewalExactCount
        // Forward additional holder count for holder-upgrade purchases
        if (additionalHolderCount) body.additionalHolderCount = additionalHolderCount

        const res = await fetch(`${BASE_URL}/payments/create-intent`, {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${localStorage.getItem('ifoa_token') || ''}`,
          },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        // 403 + mustChangePassword: redirect to login so user can set password first
        if (res.status === 403 && json?.mustChangePassword) {
          window.location.replace('/login')
          return
        }
        if (!res.ok || !json.success) throw new Error(json.message || 'Could not create payment intent')
        setClientSecret(json.clientSecret)
      } catch (err) {
        setFetchError(err.message)
      } finally {
        setLoading(false)
      }
    }
    create()
  }, [registrationId, registrationModel, newSubscriptionPlan, renewalMultiYearCount, renewalExactCount, additionalHolderCount])

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="w-full max-w-sm max-h-[90vh] rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col">

        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
              </svg>
            </div>
            <div>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5">Secure Checkout</p>
              <p className="text-white font-black text-base leading-tight">Complete Your Subscription</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
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
                clientSecret={clientSecret}
                registrationId={registrationId}
                registrationModel={registrationModel}
                amount={amount}
                subscriptionData={subscriptionData}
                purpose={purpose || 'payment'}
                onSuccess={onSuccess}
                onCancel={onClose}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
