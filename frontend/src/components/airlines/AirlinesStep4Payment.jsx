import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import PaymentModal from '../payment/PaymentModal'
import { LegalModal } from '../legal/LegalModal'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ─── Summary row ──────────────────────────────────────────────────────────────
function SummaryItem({ label, value, mono = false }) {
  if (value === null || value === undefined || value === '' || value === '—') {
    return (
      <div className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 flex-shrink-0">{label}</span>
        <span className="text-sm sm:text-right text-slate-300 italic">—</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 flex-shrink-0">{label}</span>
      <span className={`text-sm sm:text-right sm:max-w-[62%] break-all ${mono ? 'font-mono text-slate-700' : 'font-semibold text-slate-800'}`}>{value}</span>
    </div>
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
      <p className="text-sm text-gray-500 mb-2 max-w-xs leading-relaxed">Notification has been sent to admin. Our team will review your registration and generate a wire transfer invoice within 1 business day.</p>
      <div className="w-full max-w-xs rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 mb-7 text-left space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3">Bank Details for Wire Transfer</p>
        {[['Bank', 'Banque Revolut Bank UAB'],['Account Owner', 'International Flight Operations Academy GmbH'],['BIC', 'REVOLT21'],['Intermediary BIC', 'CHASGB2L'],['Account #', 'LT04 3250 0415 2968 6697']].map(([k,v]) => (
          <div key={k} className="flex items-start justify-between gap-3 text-sm">
            <span className="text-gray-400 font-medium whitespace-nowrap">{k}</span>
            <span className="font-bold text-gray-800 text-right">{v}</span>
          </div>
        ))}
      </div>
      <button type="button" onClick={onClose}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-md shadow-blue-200">
        Done
      </button>
      <style>{`@keyframes wirePopIn{0%{transform:scale(0.4);opacity:0}100%{transform:scale(1);opacity:1}}@keyframes wireRipple{0%{transform:scale(1);opacity:0.6}100%{transform:scale(1.7);opacity:0}}`}</style>
    </div>
  )
}

export default function AirlinesStep4Payment({ data, update, onBack, onSubmit, onMarkPaidAndFinish, submitting, error, isBlocked, isExistingSubmission = false }) {
  const navigate = useNavigate()
  const [errors, setErrors]             = useState({})
  const [localError, setLocalError]     = useState('')
  const [legalModal, setLegalModal]     = useState(null)
  const [paymentMethod, setPaymentMethod] = useState(data.paymentMethod || 'card') // 'card' | 'wire'
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [registrationId, setRegistrationId] = useState(null)
  const [wireSubmitting, setWireSubmitting] = useState(false)
  const [wireSuccess, setWireSuccess]     = useState(false)
  const holders       = data.certificateHolders || []
  const isUnlimited   = data.subscriptionPlan === 'Unlimited Plan'
  const selectedCount = Number(data.holderCountValue || data.committedCount || holders.length || 0)
  const pricePerCert  = data.pricePerCertificate || data.pricePerCert || 0
  // Always multiply by count — Unlimited plan is $265/certificate too
  const total         = pricePerCert * selectedCount
  const amountCents   = Math.round(total * 100)
  const selectedPaymentMethod = data.paymentMethod || paymentMethod || 'card'

  useEffect(() => {
    if (!data.paymentMethod) {
      update({ paymentMethod: 'card' })
    } else {
      setPaymentMethod(data.paymentMethod)
    }
  }, [data.paymentMethod])

  const inputCls = (field) =>
    `w-full px-3.5 py-2.5 border rounded-xl text-sm text-gray-900 bg-white outline-none transition-all duration-150 focus:ring-2 focus:ring-violet-600/15 placeholder:text-gray-400 ${
      errors[field] ? 'border-red-300 focus:border-red-400 bg-red-50/30' : 'border-gray-200 focus:border-violet-600 hover:border-gray-300'
    }`

  const validate = () => {
    const e = {}
    if (!selectedPaymentMethod) e.paymentMethod = 'Please select a payment method'
    if (!data.paymentEmail?.trim()) e.paymentEmail = 'Billing email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.paymentEmail)) e.paymentEmail = 'Invalid email address'
    if (!data.agreedToTerms) e.agreedToTerms = 'You must accept the terms before submitting.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handlePayClick = async () => {
    if (isBlocked) return
    setPaymentMethod('card')
    update({ paymentMethod: 'card' })
    if (!validate()) return
    setLocalError('')
    const newId = await onSubmit({ paymentStatus: 'pending', returnId: true })
    const targetId = newId || data._id
    if (!targetId) {
      setLocalError('Could not prepare card payment. Please try again.')
      return
    }
    setRegistrationId(targetId)
    setShowPaymentModal(true)
  }

  const handleWireClick = async () => {
    if (isBlocked) return
    setPaymentMethod('wire')
    update({ paymentMethod: 'wire' })
    if (!isExistingSubmission && !validate()) return
    setLocalError('')
    setWireSubmitting(true)
    try {
      const newId = await onSubmit({ paymentStatus: 'pending', returnId: true })
      const id = newId || data?._id || registrationId
      if (!id) {
        throw new Error('Could not create subscription. Please try again.')
      }
      setRegistrationId(id)

      // Patch the registration to flag it as wire-transfer invoice requested
      const reqRes = await axios.patch(
        `${BASE_URL}/airlines/${id}/request-invoice`,
        { paymentMethod: 'wire', requestedAt: new Date().toISOString() },
        { headers: { Authorization: `Bearer ${localStorage.getItem('ifoa_token') || ''}` } }
      )

      if (!reqRes?.data?.success) {
        throw new Error(reqRes?.data?.message || 'Failed to submit wire request.')
      }

      setWireSuccess(true)
    } catch (e) {
      console.error('Wire request failed:', e)
      const msg = (e?.response?.data?.message || e?.message || '').toLowerCase()
      if (e?.response?.status === 409 || msg.includes('already')) {
        setWireSuccess(true)
        return
      }
      setLocalError(e?.response?.data?.message || e?.message || 'Wire request failed. Please try again.')
    } finally {
      setWireSubmitting(false)
    }
  }

  const handlePaymentSuccess = (_invoice, registration) => {
    setShowPaymentModal(false)
    onMarkPaidAndFinish(registration?._id || registrationId || data._id)
  }

  // ── Wire success screen ─────────────────────────────────────────────────────
  if (wireSuccess) {
    return (
      <div className="rounded-2xl border border-blue-200 bg-white overflow-hidden">
        <WireTransferSuccess onClose={() => navigate('/dashboard/subscription')} />
      </div>
    )
  }

  return (
    <div className="space-y-7">
      {showPaymentModal && (
        <PaymentModal
          registrationId={registrationId || data._id}
          registrationModel="Airlines"
          amount={amountCents}
          subscriptionData={data}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
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
      <section className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
        {/* Header with total */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">Order Summary</p>
            <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-slate-950">Final registration amount</h3>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-right flex-shrink-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Total</p>
            <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-slate-950">${Number(total || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* Company & Plan */}
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">Company & Plan</p>
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden divide-y divide-slate-100 mb-4">
          <SummaryItem label="Airline / Company" value={data.airlineName} />
          <SummaryItem label="Service Plan"       value={
            data.subscriptionPlan === 'Multiple Years Subscription Plan'
              ? `Multiple Years (${data.multiYearCount || 2} Years)`
              : (data.subscriptionPlan || '1 Year Subscription Plan')
          } />
          <SummaryItem label="Price / Certificate" value={pricePerCert ? `$${Number(pricePerCert).toFixed(2)}` : ''} />
          <SummaryItem label="Committed Slots"     value={selectedCount ? `${selectedCount} certificate holder${selectedCount !== 1 ? 's' : ''}` : ''} />
          <SummaryItem label="Holder Range"        value={data.holderCount} />
        </div>

        {/* Contact Info */}
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">Contact Information</p>
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden divide-y divide-slate-100 mb-4">
          <SummaryItem label="Point of Contact"  value={[data.firstName, data.lastName].filter(Boolean).join(' ')} />
          <SummaryItem label="Contact Email"     value={data.email} />
          <SummaryItem label="Phone"             value={data.phone ? `+${data.phone}` : ''} />
          {(data.addressLine1 || data.city) && (
            <SummaryItem label="Address" value={[data.addressLine1, data.city, data.state, data.postalCode, data.country].filter(Boolean).join(', ')} />
          )}
        </div>

        {/* Certificate Holders */}
        {holders.length > 0 && (
          <>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
              Certificate Holders ({holders.length})
            </p>
            <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden divide-y divide-slate-100 mb-4">
              {holders.map((h, i) => {
                const holderName = [h.firstName, h.lastName].filter(Boolean).join(' ') || h.name || `Holder ${i + 1}`
                const faaNum     = h.faaCertificateNumber || h.faaNumber || ''
                const iacraFtn   = h.iacraTrackingNumber  || h.iacraFtn  || ''
                const certType   = h.certificateType      || h.primaryCertificate || ''
                return (
                  <div key={i} className="px-4 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">#{i + 1}</span>
                      <span className="text-sm font-semibold text-slate-800">{holderName}</span>
                    </div>
                    {certType  && <div className="flex justify-between text-xs text-slate-500 mt-0.5"><span className="uppercase tracking-wide text-slate-400">Cert Type</span><span className="font-medium">{certType}</span></div>}
                    {faaNum    && <div className="flex justify-between text-xs text-slate-500 mt-0.5"><span className="uppercase tracking-wide text-slate-400">FAA Cert #</span><span className="font-mono">{faaNum}</span></div>}
                    {iacraFtn  && <div className="flex justify-between text-xs text-slate-500 mt-0.5"><span className="uppercase tracking-wide text-slate-400">IACRA FTN</span><span className="font-mono">{iacraFtn}</span></div>}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Billing */}
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">Billing</p>
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden divide-y divide-slate-100">
          <SummaryItem label="Billing Email"   value={data.paymentEmail || 'Will be entered below'} />
          <SummaryItem label="Payment Method"  value={
            data.paymentMethod === 'wire' ? 'Wire Transfer' : data.paymentMethod === 'card' ? 'Credit / Debit Card' : ''
          } />
        </div>
      </section>

      {isExistingSubmission && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-black mb-1.5">You already submitted your Company form</p>
          <p className="text-xs leading-relaxed">New registration is disabled. You can still request a wire invoice for your existing submission below.</p>
        </div>
      )}

      {/* Payment Method Selector */}
      {!isExistingSubmission && <div>
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Select Payment Method</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {/* Card */}
          <button
            type="button"
            onClick={() => { setPaymentMethod('card'); update({ paymentMethod: 'card' }) }}
            className={`relative rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
              paymentMethod === 'card'
                ? 'border-blue-600 bg-blue-50/40 shadow-sm shadow-blue-100'
                : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                'bg-gray-100'
              }`}>
                <svg className={`w-5 h-5 ${selectedPaymentMethod === 'card' ? 'text-blue-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
                </svg>
              </div>
              <div className="flex-1">
                <p className={`font-black text-sm ${selectedPaymentMethod === 'card' ? 'text-blue-900' : 'text-gray-900'}`}>Credit / Debit Card</p>
                <p className="text-xs text-gray-400">Instant payment</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                selectedPaymentMethod === 'card' ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
              }`}>
                {selectedPaymentMethod === 'card' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">Pay securely now with Visa, Mastercard, Amex, Apple Pay, or Google Pay.</p>
          </button>

          {/* Wire Transfer */}
          <button
            type="button"
            onClick={() => { setPaymentMethod('wire'); update({ paymentMethod: 'wire' }) }}
            className={`relative rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
              selectedPaymentMethod === 'wire'
                ? 'border-blue-600 bg-blue-50/40 shadow-sm shadow-blue-100'
                : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                'bg-gray-100'
              }`}>
                <svg className={`w-5 h-5 ${selectedPaymentMethod === 'wire' ? 'text-blue-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className={`font-black text-sm ${selectedPaymentMethod === 'wire' ? 'text-blue-900' : 'text-gray-900'}`}>Wire Transfer</p>
                <p className="text-xs text-gray-400">Invoice via bank transfer</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                selectedPaymentMethod === 'wire' ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
              }`}>
                {selectedPaymentMethod === 'wire' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">Request an invoice — admin will generate a wire-transfer invoice for your company within 1 business day.</p>
            {selectedPaymentMethod === 'wire' && (
              <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-700 space-y-1">
                <p className="font-black uppercase tracking-widest text-[9px] text-slate-400 mb-1.5">Banque Revolut Bank UAB — Wire Details</p>
                {[['Account Owner','International Flight Operations Academy GmbH'],['BIC','REVOLT21'],['Intermediary BIC','CHASGB2L'],['Account #','LT04 3250 0415 2968 6697']].map(([k,v]) => (
                  <div key={k} className="flex items-start justify-between gap-3"><span className="text-slate-400 whitespace-nowrap">{k}</span><span className="font-bold text-slate-800 text-right">{v}</span></div>
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
      </div>}

      {/* Billing Details */}
      {!isExistingSubmission && <div>
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
      </div>}

      <LegalModal open={!!legalModal} onClose={() => setLegalModal(null)} type={legalModal} />

      {/* Terms */}
      {!isExistingSubmission && <div className={`rounded-[26px] border p-5 ${errors.agreedToTerms ? 'border-red-200 bg-red-50/70' : 'border-slate-200 bg-slate-50/80'}`}>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={data.agreedToTerms || false} onChange={(e) => update({ agreedToTerms: e.target.checked })} className="mt-1 h-4 w-4 accent-blue-600" />
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
      </div>}

      {(error || localError) && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <p>{localError || error}</p>
        </div>
      )}

      <div className="flex justify-between pt-6 border-t border-gray-100">
        <button type="button" onClick={onBack} disabled={submitting || wireSubmitting}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all duration-150 disabled:opacity-40">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
          Previous
        </button>

        {isExistingSubmission ? (
          <button
            type="button"
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
        selectedPaymentMethod === 'wire' ? (
          <button
            type="button"
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
            type="button"
            onClick={handlePayClick}
            disabled={submitting || isBlocked}
            title={isBlocked ? 'You need an Airlines account to submit this form' : undefined}
            className="inline-flex items-center gap-2.5 px-8 py-3 text-white font-bold rounded-xl transition-all duration-150 shadow-sm min-w-52 justify-center hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            style={{ background: isBlocked ? '#d1d5db' : '#0000ff' }}
            onMouseEnter={e => { if (!isBlocked && !submitting) e.currentTarget.style.background='#0000e6' }}
            onMouseLeave={e => { if (!isBlocked) e.currentTarget.style.background='#0000ff' }}>
            {submitting
              ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" className="opacity-75" /></svg>Completing…</>
              : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" /></svg>Pay with Card</>
            }
          </button>
        )
        )}
      </div>
    </div>
  )
}
