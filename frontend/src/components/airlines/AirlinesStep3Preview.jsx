import React, { useState } from 'react'

function ReviewSection({ title, rows }) {
  return (
    <section className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">{title}</p>
      <div className="mt-5 grid gap-3">
        {rows.map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col gap-1 rounded-2xl border border-white/70 bg-white px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <span className="text-sm font-semibold text-slate-500">{label}</span>
            <span className="text-sm text-slate-900 sm:max-w-[62%] sm:text-right">
              {value || <span className="text-slate-400">Not provided</span>}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function AirlinesStep3Preview({ data, update, onSaved, onNext, onBack, onEdit }) {
  const holders = data.certificateHolders || []
  const selectedCount = Number(data.holderCountValue || data.committedCount || holders.length || 0)
  const actualCount = holders.length
  const total = (data.pricePerCertificate || 0) * selectedCount

  const [termsError, setTermsError] = useState(false)

  const handleAgreementChange = () => {
    if (data.agreedToTerms) return
    update({ agreedToTerms: true })
    setTermsError(false)
  }

  const handleNext = () => {
    if (!data.agreedToTerms) {
      setTermsError(true)
      return
    }
    setTermsError(false)
    onNext()
  }

  const sections = [
    {
      title: 'Subscription Plan',
      rows: [
        { label: 'Plan', value: data.subscriptionPlan },
        { label: 'Holder Range', value: data.holderCount },
        { label: 'Holders Selected (Billed)', value: String(selectedCount) },
        { label: 'Holders Added So Far', value: String(actualCount) },
        { label: 'Price / Certificate', value: data.pricePerCertificate ? `$${data.pricePerCertificate} USD` : '' },
        { label: 'Total Amount', value: `$${total} USD` },
      ],
    },
    {
      title: 'Company Information',
      rows: [
        { label: 'Company', value: data.airlineName },
        { label: 'Address', value: data.addressLine1 },
        ...(data.addressLine2 ? [{ label: 'Address Line 2', value: data.addressLine2 }] : []),
        { label: 'City', value: data.city },
        { label: 'State', value: data.state },
        { label: 'Postal Code', value: data.postalCode },
        { label: 'Country', value: data.country },
      ],
    },
    {
      title: 'Point of Contact',
      rows: [
        { label: 'First Name', value: data.firstName },
        ...(data.middleName ? [{ label: 'Middle Name', value: data.middleName }] : []),
        { label: 'Last Name', value: data.lastName },
        ...(data.dateOfBirth ? [{ label: 'Date of Birth', value: data.dateOfBirth }] : []),
        { label: 'Email', value: data.email },
        { label: 'Phone', value: data.phone ? `+${data.phone}` : '' },
      ],
    },
  ]

  const holderSections = holders.map((h, i) => ({
    title: `Team Member #${i + 1}`,
    rows: [
      { label: 'Full Name', value: h.fullName },
      { label: 'Date of Birth', value: h.dateOfBirth ? new Date(h.dateOfBirth).toLocaleDateString() : '' },
      { label: 'Certificate Type', value: h.certificateType },
      { label: 'Certificate Status', value: h.certificateStatus },
      { label: 'FAA Certificate #', value: h.faaCertificateNumber },
      { label: 'IACRA FTN #', value: h.iacraFtnNumber },
      ...(h.hasSecondaryCertificate ? [
        { label: 'Secondary Cert Type', value: h.secondaryCertificateType },
        { label: 'Secondary FAA #', value: h.secondaryFaaCertificateNumber },
        { label: 'Secondary IACRA FTN #', value: h.secondaryIacraFtnNumber },
      ] : []),
    ],
  }))

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
      </div>

      <div className="rounded-[26px] border border-amber-200 bg-amber-50/80 p-5 text-sm leading-6 text-amber-900">
        Review each section before continuing. Make sure all details are correct before agreeing and proceeding to payment.
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <ReviewSection key={section.title} title={section.title} rows={section.rows} />
        ))}
        {holderSections.map((section) => (
          <ReviewSection key={section.title} title={section.title} rows={section.rows} />
        ))}
      </div>

      <div className="rounded-[26px] border border-blue-200 bg-blue-50/80 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Total Due</p>
          <p className="text-2xl font-black text-blue-900">
            ${total}{' '}
            <span className="text-sm font-normal text-blue-600">USD</span>
          </p>
        </div>
        <div className="text-right text-sm text-blue-700">
          <p>{actualCount} team member{actualCount !== 1 ? 's' : ''} added</p>
          <p className="font-semibold">${data.pricePerCertificate} per certificate</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-bold text-slate-900 mb-3">
          Terms and Conditions <span className="text-red-400">*</span>
        </p>
        <label
          className={
            'flex items-start gap-3 cursor-pointer p-4 rounded-2xl border transition-all duration-150 ' +
            (termsError ? 'border-red-300 bg-red-50/30 ' : 'border-slate-200 hover:border-blue-300 ') +
            (data.agreedToTerms ? 'bg-blue-50 border-blue-300' : '')
          }
        >
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={data.agreedToTerms || false}
              onChange={handleAgreementChange}
              disabled={data.agreedToTerms}
              className="sr-only"
            />
            <div
              className={
                'w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150 ' +
                (data.agreedToTerms ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300')
              }
            >
              {data.agreedToTerms && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-slate-600 leading-relaxed">
            I agree to the Terms &amp; Conditions. I consent to the collection and storage of my
            team&#39;s personal data in accordance with the Data Protection Policy. Data will be used
            solely for the purposes outlined, and I may request deletion at any time.
          </span>
        </label>
        {termsError && (
          <p className="text-red-500 text-xs mt-2 font-medium">You must agree to the terms to continue.</p>
        )}
      </div>

      <div className="flex flex-col justify-between gap-3 border-t border-slate-100 pt-2 sm:flex-row">
        <button
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0 5-5m-5 5h12" />
          </svg>
          Back
        </button>
        <button
          onClick={handleNext}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700"
        >
          Continue to payment
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
