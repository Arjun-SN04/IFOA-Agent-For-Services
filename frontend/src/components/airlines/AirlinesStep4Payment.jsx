import { useState } from 'react'

export default function AirlinesStep4Payment({ data, update, onBack, onSubmit, submitting, error, isBlocked }) {
  const [errors, setErrors] = useState({})

  const holders = data.certificateHolders || []
  const isUnlimited = data.subscriptionPlan === 'Unlimited Plan'
  const selectedCount = data.holderCountValue ? parseInt(data.holderCountValue) : holders.length
  // Support both field name variants (pricePerCertificate is the canonical model name)
  const pricePerCert = data.pricePerCertificate || data.pricePerCert || 0
  const total = isUnlimited ? pricePerCert : pricePerCert * selectedCount

  const validate = () => {
    const e = {}
    if (!data.paymentEmail?.trim()) e.paymentEmail = 'PayPal email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.paymentEmail)) e.paymentEmail = 'Invalid email address'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const inputCls = (field) =>
    `w-full px-3.5 py-2.5 border rounded-xl text-sm text-gray-900 bg-white outline-none transition-all duration-150 focus:ring-2 focus:ring-blue-600/15 placeholder:text-gray-400 ${
      errors[field]
        ? 'border-red-300 focus:border-red-400 bg-red-50/30'
        : 'border-gray-200 focus:border-blue-600 hover:border-gray-300'
    }`

  const lineItems = [
    { label: 'Company',              value: data.airlineName },
    { label: 'Contact',              value: [data.firstName, data.lastName].filter(Boolean).join(' ') },
    { label: 'Email',                value: data.email },
    { label: 'Phone',                value: data.phone ? ('+' + data.phone) : '' },
    { label: 'Holder Range',         value: data.holderCount },
    { label: 'Team Members',         value: String(selectedCount) + ' member' + (selectedCount !== 1 ? 's' : '') },
    {
      label: isUnlimited ? 'Annual Fee' : 'Price per Certificate',
      value: '$' + pricePerCert + ' USD' + (isUnlimited ? ' / year' : ''),
    },
    { label: 'Total',                value: '$' + total + ' USD' },
  ]

  return (
    <div className="space-y-7">

      {/* Wrong-role warning — shown when an individual user reaches step 4 */}
      {isBlocked && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-800">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="font-bold mb-0.5">Submission blocked — wrong account type</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              You are signed in with an <strong>Individual account</strong>. Only users with an{' '}
              <strong>Airlines account</strong> can submit this form. Please create a new Airlines account
              or sign in with one to complete your registration.
            </p>
          </div>
        </div>
      )}

      {/* Saved notification */}
      <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="font-semibold">Your registration has been saved</p>
          <p className="text-green-600 mt-0.5">
            Your airline data was securely saved when you agreed to the terms in the previous step.
          </p>
        </div>
      </div>

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
                {'$' + total}
                <span className="text-base font-normal text-blue-200 ml-1">USD</span>
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

      {/* Payment via PayPal */}
      <div>
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Payment via PayPal</h3>
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 mb-5">
          <span className="text-lg flex-shrink-0">&#128161;</span>
          <p>
            Enter your PayPal email below. After submitting you will receive a PayPal invoice to complete
            payment and activate your Airlines Agent for Service plan.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
            PayPal Email Address <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            placeholder="your-paypal@email.com"
            value={data.paymentEmail || ''}
            onChange={e => update({ paymentEmail: e.target.value })}
            className={inputCls('paymentEmail')}
          />
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

      {/* API Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <span className="text-lg flex-shrink-0">&#9888;&#65039;</span>
          <p>{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-6 border-t border-gray-100">
        <button
          onClick={onBack}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all duration-150 disabled:opacity-40"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Previous
        </button>
        <button
          onClick={() => { if (!isBlocked && validate()) onSubmit() }}
          disabled={submitting || isBlocked}
          title={isBlocked ? 'You need an Airlines account to submit this form' : undefined}
          className={`inline-flex items-center gap-2.5 px-8 py-3 text-white font-bold rounded-xl transition-all duration-150 shadow-sm min-w-52 justify-center ${
            isBlocked
              ? 'bg-gray-300 cursor-not-allowed opacity-60'
              : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 hover:shadow-md hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
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
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Complete Registration
            </>
          )}
        </button>
      </div>
    </div>
  )
}
