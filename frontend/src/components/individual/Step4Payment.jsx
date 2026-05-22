import { useState } from 'react'
import { Link } from 'react-router-dom'
import PaymentModal from '../payment/PaymentModal'
import { LegalModal } from '../legal/LegalModal'

function SummaryItem({ label, value, mono = false }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 flex-shrink-0">{label}</span>
      <span className={`text-sm sm:text-right sm:max-w-[62%] break-all ${mono ? 'font-mono text-slate-700' : 'font-semibold text-slate-800'}`}>{value}</span>
    </div>
  )
}

// ── AlreadySubmittedBanner ────────────────────────────────────────────────────
// BLUE  = already paid   → "Go to Subscription"
// RED   = payment pending → "Go to Subscription to complete payment"
function AlreadySubmittedBanner({ paymentStatus }) {
  const isPaid = paymentStatus === 'paid'

  if (isPaid) {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #bfdbfe' }}>
        {/* Blue header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ background: '#0000ff' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.18)' }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-black text-white">Already Paid — Registration Complete</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Your payment has been confirmed and your subscription is active.
            </p>
          </div>
        </div>
        {/* Blue body — order summary hint */}
        <div className="px-5 py-3" style={{ background: '#eff6ff', borderTop: '1px solid #bfdbfe' }}>
          <p className="text-xs font-medium mb-3" style={{ color: '#1d4ed8' }}>
            Review your subscription details and download your invoice from the Subscription page.
          </p>
          <Link
            to="/dashboard/subscription"
            className="inline-flex items-center gap-2 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
            style={{ background: '#0000ff' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
            onMouseLeave={e => e.currentTarget.style.background = '#0000ff'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Go to My Subscription
          </Link>
        </div>
      </div>
    )
  }

  // ── Pending (red) ──────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #fecaca' }}>
      {/* Red header */}
      <div className="flex items-center gap-3 px-5 py-4" style={{ background: '#fff5f5' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fee2e2' }}>
          <svg className="w-5 h-5" style={{ color: '#ef4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-black" style={{ color: '#0f172a' }}>Individual registration already submitted</p>
          <p className="text-xs leading-relaxed mt-0.5" style={{ color: '#475569' }}>
            Only one subscription is allowed per account. Your form is already on file.
            Complete your pending payment from the Subscription page.
          </p>
        </div>
      </div>
      {/* Red footer */}
      <div className="flex items-center justify-between px-5 py-3" style={{ background: '#fff5f5', borderTop: '1px solid #fecaca' }}>
        <p className="text-xs font-medium" style={{ color: '#dc2626' }}>
          Payment is pending — go to Subscription to complete it.
        </p>
        <Link
          to="/dashboard/subscription"
          className="inline-flex items-center gap-1.5 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all whitespace-nowrap"
          style={{ background: '#ef4444' }}
          onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
          onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          Go to Subscription
        </Link>
      </div>
    </div>
  )
}

export default function Step4Payment({ data, update, onBack, onSubmit, onMarkPaidAndFinish, submitting, error, isBlocked, existingPaymentStatus, existingRecord }) {
  const [errors, setErrors]                 = useState({})
  const [legalModal, setLegalModal]         = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [registrationId, setRegistrationId] = useState(null)
  // Amount in cents for display in PaymentModal (backend independently recomputes from DB for actual charge)
  const amountCents = Math.round(Number(data.price || 0) * 100)

  // For the plan label, prefer the live DB record (existingRecord) over formData
  // because formData may still be in its INIT state when the component first renders.
  // For multi-year plans, ALWAYS derive year count from price ($55×yrs) — never
  // trust multiYearCount which defaults to 3 in the DB schema.
  const displayData = existingRecord ?? data
  const selectedPlan = (() => {
    const plan = displayData.subscriptionPlan || data.subscriptionPlan
    if (!plan) return '—'
    if (plan === 'Multiple Years Subscription Plan') {
      const priceNum = Number(displayData.price ?? data.price ?? 0)
      const yrs = priceNum >= 110
        ? Math.round(priceNum / 55)   // price is always correct: 55 × chosen years
        : (displayData.multiYearCount || data.multiYearCount || 2)
      return `Multiple Years Subscription Plan (${yrs} yr${yrs !== 1 ? 's' : ''})`
    }
    return plan
  })()

  const validate = () => {
    const nextErrors = {}
    if (!data.paymentEmail?.trim()) nextErrors.paymentEmail = 'Billing email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.paymentEmail)) nextErrors.paymentEmail = 'Enter a valid email address.'
    if (!data.agreedToTerms) nextErrors.agreedToTerms = 'You must accept the terms before submitting.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handlePayClick = async () => {
    if (isBlocked) return
    if (!validate()) return
    const newId = await onSubmit({ paymentStatus: 'pending', returnId: true })
    if (newId) setRegistrationId(newId)
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = (_invoice, registration) => {
    setShowPaymentModal(false)
    onMarkPaidAndFinish(registration?._id || registrationId || data._id)
  }

  // If user already has a registration on file (paid or pending), show banner & block re-submit
  const hasExistingRegistration = !!existingPaymentStatus

  return (
    <div className="space-y-6">
      {showPaymentModal && (
        <PaymentModal
          registrationId={registrationId || data._id}
          registrationModel="Individual"
          amount={amountCents}
          subscriptionData={data}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* ── Existing registration banner (BLUE = paid / RED = pending) ── */}
      {hasExistingRegistration && (
        <AlreadySubmittedBanner paymentStatus={existingPaymentStatus} />
      )}

      {/* Wrong-role warning */}
      {isBlocked && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-800">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="font-bold mb-0.5">Submission blocked — wrong account type</p>
            <p className="text-amber-700 text-xs leading-relaxed">You are signed in with an <strong>Airlines account</strong>. Only <strong>Individual accounts</strong> can submit this form.</p>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <section className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
        {/* Header with total */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">Order Summary</p>
            <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-slate-950">Final registration amount</h3>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-right flex-shrink-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Total</p>
            <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-slate-950">${Number(data.price || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* Registrant & Plan */}
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden divide-y divide-slate-100">
          <SummaryItem label="Registrant"    value={`${data.firstName || ''} ${data.lastName || ''}`.trim() || '—'} />
          <SummaryItem label="Service Plan"  value={selectedPlan} />
          <SummaryItem label="Reg. Email"    value={data.email || '—'} />
          <SummaryItem label="Phone"         value={data.phone || '—'} />
          {data.dateOfBirth && <SummaryItem label="Date of Birth" value={new Date(data.dateOfBirth).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })} />}
          {(data.addressLine1 || data.city) && <SummaryItem label="Address" value={[data.addressLine1, data.city, data.state, data.postalCode, data.country].filter(Boolean).join(', ')} />}
        </div>

        {/* Primary Certificate */}
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-4 mb-2 px-1">Primary Certificate</p>
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden divide-y divide-slate-100">
          <SummaryItem label="Certificate Type"   value={data.primaryCertificate        || '—'} />
          <SummaryItem label="Cert. Status"        value={data.primaryAirmanCertificate  || 'EXISTING'} />
          <SummaryItem label="FAA Certificate #"   value={data.faaCertificateNumber      || '—'} mono />
          <SummaryItem label="IACRA FTN #"         value={data.iacraTrackingNumber        || '—'} mono />
        </div>

        {/* Secondary Certificate (conditional) */}
        {data.hasSecondaryCertificate && (
          <>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-4 mb-2 px-1">Secondary Certificate</p>
            <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden divide-y divide-slate-100">
              <SummaryItem label="Sec. Cert. Type"   value={data.secondaryCertificate              || '—'} />
              <SummaryItem label="Sec. FAA Cert #"   value={data.secondaryFaaCertificateNumber     || '—'} mono />
              <SummaryItem label="Sec. IACRA FTN #"  value={data.secondaryIacraTrackingNumber      || '—'} mono />
            </div>
          </>
        )}

        {/* Billing */}
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-4 mb-2 px-1">Billing</p>
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden divide-y divide-slate-100">
          <SummaryItem label="Billing Email" value={data.paymentEmail || 'Will be entered below'} />
        </div>
      </section>

      {/* Hide payment fields if user already has a registration on file */}
      {!hasExistingRegistration && (
        <>
          {/* Billing email */}
          <section className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700 mb-1">Payment</p>
            <h3 className="text-xl font-bold tracking-[-0.03em] text-slate-950 mb-4">Card Payment</h3>
            <div className="rounded-3xl border border-blue-100 bg-blue-50/80 p-4 text-sm leading-6 text-blue-900 flex items-start gap-2 mb-5">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="11" width="18" height="11" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" /></svg>
              Enter your billing email. A secure Stripe card entry window will open on the next step.
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
                    : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                }`} />
              {errors.paymentEmail && (
                <p className="mt-2 flex items-center gap-2 text-xs font-medium text-red-600">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />{errors.paymentEmail}
                </p>
              )}
            </div>
          </section>

          <LegalModal open={!!legalModal} onClose={() => setLegalModal(null)} type={legalModal} />

          {/* Terms */}
          <section className={`rounded-[26px] border p-5 sm:p-6 ${errors.agreedToTerms ? 'border-red-200 bg-red-50/70' : 'border-slate-200 bg-slate-50/80'}`}>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={data.agreedToTerms} onChange={(e) => update({ agreedToTerms: e.target.checked })} className="mt-1 h-4 w-4 accent-blue-600" />
              <span className="text-sm leading-6 text-slate-700">
                I confirm the submitted information is accurate, and I agree to the{' '}
                <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setLegalModal('terms') }} className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900 transition">Terms of Service</button>
                {' '}and{' '}
                <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setLegalModal('privacy') }} className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900 transition">Privacy Policy</button>.
              </span>
            </label>
            {errors.agreedToTerms && (
              <p className="mt-3 flex items-center gap-2 text-xs font-medium text-red-600">
                {errors.agreedToTerms}
              </p>
            )}
          </section>
        </>
      )}

      {error && <div className="rounded-[26px] border border-red-200 bg-red-50/80 p-5 text-sm leading-6 text-red-700">{error}</div>}

      <div className="flex flex-col justify-between gap-3 border-t border-slate-100 pt-2 sm:flex-row">
        <button type="button" onClick={onBack} disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4"><path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0 5-5m-5 5h12" /></svg>
          Back
        </button>

        {/* Only show pay button if no existing registration */}
        {!hasExistingRegistration && (
          <button
            type="button"
            onClick={handlePayClick}
            disabled={submitting || isBlocked}
            title={isBlocked ? 'You need an Individual account to submit this form' : undefined}
            className={`inline-flex min-w-[14rem] items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all ${
              isBlocked
                ? 'cursor-not-allowed opacity-60'
                : 'hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none'
            }`}
            style={{ background: isBlocked ? '#d1d5db' : '#0000ff' }}
            onMouseEnter={e => { if (!isBlocked && !submitting) e.currentTarget.style.background = '#0000e6' }}
            onMouseLeave={e => { if (!isBlocked) e.currentTarget.style.background = '#0000ff' }}
          >
            {submitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 0 1 8-8v8Z" className="opacity-75" />
                </svg>
                Submitting...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
                </svg>
                Pay with Card
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
