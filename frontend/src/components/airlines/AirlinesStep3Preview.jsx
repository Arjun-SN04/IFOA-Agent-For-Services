import React, { useState } from 'react'

function SectionHeader({ title }) {
  return (
    <tr>
      <td
        colSpan={2}
        className="bg-blue-700 text-white text-xs font-black uppercase tracking-widest px-4 py-2"
      >
        {title}
      </td>
    </tr>
  )
}

function Row({ label, value }) {
  return (
    <tr className="even:bg-gray-50">
      <td className="px-4 py-2.5 text-sm font-semibold text-gray-600 w-48 border-b border-gray-100 align-top">
        {label}
      </td>
      <td className="px-4 py-2.5 text-sm text-gray-900 border-b border-gray-100">
        {value || <span className="text-gray-400">&#8212;</span>}
      </td>
    </tr>
  )
}

export default function AirlinesStep3Preview({ data, update, onSaved, onNext, onBack }) {
  const holders = data.certificateHolders || []
  const isUnlimited = data.subscriptionPlan === 'Unlimited Plan'
  const selectedCount = data.holderCountValue ? parseInt(data.holderCountValue) : holders.length
  const actualCount = holders.length
  const total = isUnlimited
    ? (data.pricePerCertificate || 0)
    : (data.pricePerCertificate || 0) * actualCount

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

  const fmtPrice = (n) => (n !== undefined && n !== null ? '$' + n : '—')

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong className="block mb-1">&#9888;&#65039; Please review your information carefully</strong>
        Make sure all details are correct before agreeing and proceeding to payment.
      </div>

      {/* Preview table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <tbody>
            {/* Plan */}
            <SectionHeader title="Subscription Plan" />
            <Row label="Plan" value={data.subscriptionPlan} />
            <Row label="Holder Range" value={data.holderCount} />
            <Row label="Holders Selected" value={String(selectedCount)} />
            <Row label="Holders Added (Billed)" value={String(actualCount)} />
            <Row
              label={isUnlimited ? 'Annual Fee' : 'Price / Certificate'}
              value={fmtPrice(data.pricePerCertificate) + ' USD' + (isUnlimited ? ' / year' : '')}
            />
            <Row label="Total Amount" value={'$' + total + ' USD'} />

            {/* Company */}
            <SectionHeader title="Company Information" />
            <Row label="Company" value={data.airlineName} />
            <Row label="Address" value={data.addressLine1} />
            {data.addressLine2 && <Row label="Address Line 1" value={data.addressLine2} />}
            <Row label="City" value={data.city} />
            <Row label="State" value={data.state} />
            <Row label="Postal Code" value={data.postalCode} />
            <Row label="Country" value={data.country} />

            {/* Contact */}
            <SectionHeader title="Point of Contact" />
            <Row label="First Name" value={data.firstName} />
            {data.middleName && <Row label="Middle Name" value={data.middleName} />}
            <Row label="Last Name" value={data.lastName} />
            {data.dateOfBirth && <Row label="Date of Birth" value={data.dateOfBirth} />}
            <Row label="Email" value={data.email} />
            <Row label="Phone" value={data.phone ? '+' + data.phone : ''} />

            {/* Team Members */}
            {holders.map((h, i) => (
              <React.Fragment key={i}>
                <SectionHeader title={'Team Member #' + (i + 1)} />
                <Row label="Full Name" value={h.fullName} />
                <Row
                  label="Date of Birth"
                  value={
                    h.dateOfBirth
                      ? new Date(h.dateOfBirth).toLocaleDateString()
                      : ''
                  }
                />
                <Row label="Certificate Type" value={h.certificateType} />
                <Row label="Certificate Status" value={h.certificateStatus} />
                <Row label="FAA Certificate #" value={h.faaCertificateNumber} />
                <Row label="IACRA FTN #" value={h.iacraFtnNumber} />
                {h.hasSecondaryCertificate && (
                  <>
                    <Row label="Secondary Cert Type" value={h.secondaryCertificateType} />
                    <Row label="Secondary FAA #" value={h.secondaryFaaCertificateNumber} />
                    <Row label="Secondary IACRA FTN #" value={h.secondaryIacraFtnNumber} />
                  </>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total Due */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Total Due</p>
          <p className="text-2xl font-black text-blue-900">
            {'$' + total}{' '}
            <span className="text-sm font-normal text-blue-600">USD</span>
          </p>
        </div>
        <div className="text-right text-sm text-blue-700">
          <p>
            {actualCount} team member{actualCount !== 1 ? 's' : ''} added
          </p>
          {isUnlimited ? (
            <p className="font-semibold">{'$' + data.pricePerCertificate + ' flat / year'}</p>
          ) : (
            <p className="font-semibold">{'$' + data.pricePerCertificate + ' per certificate'}</p>
          )}
        </div>
      </div>

      {/* Terms */}
      <div>
        <p className="text-sm font-bold text-gray-900 mb-3">
          Terms and Conditions <span className="text-red-400">*</span>
        </p>

        <label
          className={
            'flex items-start gap-3 cursor-pointer p-4 rounded-xl border transition-all duration-150 ' +
            (termsError ? 'border-red-300 bg-red-50/30 ' : 'border-gray-200 hover:border-blue-300 ') +
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
                (data.agreedToTerms ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300')
              }
            >
              {data.agreedToTerms ? (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : null}
            </div>
          </div>
          <span className="text-sm text-gray-600 leading-relaxed">
            I agree to the Terms &amp; Conditions. I consent to the collection and storage of my
            team&#39;s personal data in accordance with the Data Protection Policy. Data will be used
            solely for the purposes outlined, and I may request deletion at any time.
          </span>
        </label>

        {termsError && (
          <p className="text-red-500 text-xs mt-2 font-medium">
            You must agree to the terms to continue.
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-100">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0 5-5m-5 5h12" />
          </svg>
          Previous
        </button>
        <button
          onClick={handleNext}
          className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm"
        >
          Next
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
