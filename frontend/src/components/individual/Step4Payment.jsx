import { useState } from 'react'

export default function Step4Payment({ data, update, onBack, onSubmit, submitting, error, isBlocked }) {
  const [errors, setErrors] = useState({})

  const validate = () => {
    const nextErrors = {}

    if (!data.paymentEmail.trim()) nextErrors.paymentEmail = 'PayPal email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.paymentEmail)) nextErrors.paymentEmail = 'Enter a valid email address.'

    if (!data.agreedToTerms) nextErrors.agreedToTerms = 'You must accept the terms before submitting.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) onSubmit()
  }

  return (
    <div className="space-y-6">

      {/* Wrong-role warning — shown when an airlines user reaches step 4 */}
      {isBlocked && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-800">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="font-bold mb-0.5">Submission blocked — wrong account type</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              You are signed in with an <strong>Airlines account</strong>. Only users with an{' '}
              <strong>Individual account</strong> can submit this form. Please create a new Individual account
              or sign in with one to complete your registration.
            </p>
          </div>
        </div>
      )}

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
            { label: 'Service plan', value: data.subscriptionPlan === 'Multiple Years Subscription Plan' ? `Multiple Years Subscription Plan (${data.multiYearCount || 2} Years)` : data.subscriptionPlan },
            { label: 'Registration email', value: data.email },
            { label: 'PayPal invoice email', value: data.paymentEmail || 'Will be entered below' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-1 rounded-2xl border border-white/70 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm font-semibold text-slate-500">{item.label}</span>
              <span className="text-sm text-slate-900 sm:max-w-[60%] sm:text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">Payment Method</p>
        <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-slate-950">Submit your invoice destination.</h3>

        <div className="mt-5 rounded-3xl border border-blue-100 bg-blue-50/80 p-4 text-sm leading-6 text-blue-900">
          After you submit, the service team can use this email to send your PayPal invoice and continue activation.
        </div>

        <div className="mt-5">
          <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            PayPal Email Address
            <span className="ml-1 text-red-500">*</span>
          </label>
          <input
            type="email"
            placeholder="billing@example.com"
            value={data.paymentEmail}
            onChange={(e) => update({ paymentEmail: e.target.value })}
            className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400 ${
              errors.paymentEmail
                ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
            }`}
          />
          {errors.paymentEmail && (
            <p className="mt-2 flex items-center gap-2 text-xs font-medium text-red-600">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
              {errors.paymentEmail}
            </p>
          )}
        </div>
      </section>

      <section
        className={`rounded-[26px] border p-5 sm:p-6 ${
          errors.agreedToTerms ? 'border-red-200 bg-red-50/70' : 'border-slate-200 bg-slate-50/80'
        }`}
      >
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={data.agreedToTerms}
            onChange={(e) => update({ agreedToTerms: e.target.checked })}
            className="mt-1 h-4 w-4 accent-blue-600"
          />
          <span className="text-sm leading-6 text-slate-700">
            I confirm the submitted information is accurate, and I agree to the{' '}
            <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-blue-700 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-blue-700 hover:underline">
              Privacy Policy
            </a>
            .
          </span>
        </label>

        {errors.agreedToTerms && (
          <p className="mt-3 flex items-center gap-2 text-xs font-medium text-red-600">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
            {errors.agreedToTerms}
          </p>
        )}
      </section>

      {error && (
        <div className="rounded-[26px] border border-red-200 bg-red-50/80 p-5 text-sm leading-6 text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 border-t border-slate-100 pt-2 sm:flex-row">
        <button
          onClick={onBack}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0 5-5m-5 5h12" />
          </svg>
          Back
        </button>

        <button
          onClick={() => { if (!isBlocked) handleSubmit() }}
          disabled={submitting || isBlocked}
          title={isBlocked ? 'You need an Individual account to submit this form' : undefined}
          className={`inline-flex min-w-[14rem] items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all ${
            isBlocked
              ? 'bg-gray-300 cursor-not-allowed opacity-60'
              : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none'
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
          ) : (
            <>
              Submit registration
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
