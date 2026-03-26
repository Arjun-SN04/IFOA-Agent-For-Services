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

export default function Step3Preview({ data, onNext, onBack }) {
  const sections = [
    {
      title: 'Subscription',
      rows: [
        { label: 'Selected plan', value: data.subscriptionPlan === 'Multiple Years Subscription Plan' ? `Multiple Years Subscription Plan (${data.multiYearCount || 2} Years)` : data.subscriptionPlan },
        { label: 'Total', value: data.price ? `$${data.price.toFixed(2)} USD` : '' },
      ],
    },
    {
      title: 'Personal Information',
      rows: [
        {
          label: 'Full name',
          value: [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' '),
        },
        { label: 'Date of birth', value: data.dateOfBirth },
        { label: 'Email', value: data.email },
        { label: 'Phone', value: data.phone ? `+${data.phone}` : '' },
      ],
    },
    {
      title: 'Address',
      rows: [
        { label: 'Address line 1', value: data.addressLine1 },
        { label: 'City', value: data.city },
        { label: 'State / Province', value: data.state },
        { label: 'Postal code', value: data.postalCode },
        { label: 'Country', value: data.country },
      ],
    },
    {
      title: 'Primary Certificate',
      rows: [
        { label: 'Certificate type', value: data.primaryCertificate },
        { label: 'Status', value: data.primaryAirmanCertificate },
        { label: 'FAA Certificate Number', value: data.faaCertificateNumber },
        { label: 'IACRA / FTN', value: data.iacraTrackingNumber },
      ],
    },
  ]

  if (data.hasSecondaryCertificate) {
    sections.push({
      title: 'Secondary Certificate',
      rows: [
        { label: 'Certificate type', value: data.secondaryCertificate },
        { label: 'FAA certificate number', value: data.secondaryFaaCertificateNumber },
        { label: 'IACRA tracking number', value: data.secondaryIacraTrackingNumber },
      ],
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[26px] border border-amber-200 bg-amber-50/80 p-5 text-sm leading-6 text-amber-900">
        Review each section before continuing. This screen is a final check for your registration details before invoice and submission.
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <ReviewSection key={section.title} title={section.title} rows={section.rows} />
        ))}
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
