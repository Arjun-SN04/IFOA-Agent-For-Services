import React from 'react'

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

      <div className="rounded-[26px] overflow-hidden" style={{ border: '1px solid #e2e8f0', background: '#fff' }}>
        <div className="px-5 py-2 flex items-center gap-2" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#64748b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
          </svg>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#94a3b8' }}>Payment Summary</p>
        </div>
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Total Due</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black" style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>${total.toLocaleString()}</span>
              <span className="text-sm font-semibold" style={{ color: '#94a3b8' }}>USD</span>
            </div>
          </div>
          <div className="h-10 w-px" style={{ background: '#e2e8f0' }} />
          <div className="text-right space-y-1">
            <div className="flex items-center justify-end gap-1.5">
              <svg className="w-3.5 h-3.5" style={{ color: '#64748b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
              <p className="text-xs font-semibold" style={{ color: '#334155' }}>{selectedCount} holder{selectedCount !== 1 ? 's' : ''} billed</p>
            </div>
            <p className="text-xs" style={{ color: '#64748b' }}>${data.pricePerCertificate} <span style={{ color: '#cbd5e1' }}>×</span> {selectedCount} certificates</p>
          </div>
        </div>
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
          onClick={onNext}
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
