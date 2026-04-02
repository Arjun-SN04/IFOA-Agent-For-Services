import { useState } from 'react'

const PRIMARY_TYPES = [
  'Part 61 - Pilot',
  'Part 61 - Flight or Ground Instructor',
  'Part 65 - Aircraft Dispatcher',
]

const SECONDARY_TYPES = [
  'Part 61 - Pilot',
  'Part 61 - Flight or Ground Instructor',
  'Part 65 - Aircraft Dispatcher',
]

function Field({ label, required, error, helper, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {helper && !error && <p className="text-xs text-slate-400">{helper}</p>}
      {error && (
        <p className="flex items-center gap-2 text-xs font-medium text-red-600">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
          {error}
        </p>
      )}
    </div>
  )
}

const sectionClass = 'rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6'

export default function Step2Certificates({ data, update, onNext, onBack }) {
  const [errors, setErrors] = useState({})

  const validate = () => {
    const nextErrors = {}

    if (!data.primaryCertificate) nextErrors.primaryCertificate = 'Select the primary certificate type.'
    if (!data.primaryAirmanCertificate) nextErrors.primaryAirmanCertificate = 'Select the certificate status.'
    if (data.hasSecondaryCertificate && !data.secondaryCertificate) {
      nextErrors.secondaryCertificate = 'Select the secondary certificate type.'
    }

    setErrors(nextErrors)

    // Scroll to first invalid field
    const firstKey = Object.keys(nextErrors)[0]
    if (firstKey) {
      setTimeout(() => {
        const el = document.getElementById(`field-${firstKey}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
    }

    return Object.keys(nextErrors).length === 0
  }

  const inputCls = (field) =>
    `w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400 ${
      errors[field]
        ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-4 focus:ring-red-100'
        : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
    }`

  return (
    <div className="space-y-6">
      <section className={sectionClass}>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">Primary Certificate</p>
        <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-slate-950">Enter the primary FAA certificate details.</h3>

        <div className="mt-5 space-y-5">
          <Field label="Certificate Type" required error={errors.primaryCertificate}>
            <select
              id="field-primaryCertificate"
              value={data.primaryCertificate}
              onChange={(e) => update({ primaryCertificate: e.target.value })}
              className={inputCls('primaryCertificate')}
            >
              <option value="">Select certificate type</option>
              {PRIMARY_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Certificate Status"
            required
            error={errors.primaryAirmanCertificate}
            helper="Choose NEW if you are still applying. Choose EXISTING if you already hold the certificate."
          >
            <div id="field-primaryAirmanCertificate" className="grid gap-3 sm:grid-cols-2">
              {['EXISTING', 'NEW'].map((value) => {
                const selected = data.primaryAirmanCertificate === value

                return (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-3xl border p-5 transition-all ${
                      selected
                        ? 'border-blue-600 bg-white shadow-[0_16px_45px_-30px_rgba(37,99,235,0.55)]'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="primaryAirmanCertificate"
                      value={value}
                      checked={selected}
                      onChange={() => update({ primaryAirmanCertificate: value })}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{value === 'EXISTING' ? 'Existing Certificate' : 'New Certificate'}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {value === 'EXISTING'
                            ? 'Use this if you already have an FAA certificate number.'
                            : 'Use this if you are still in the application process.'}
                        </p>
                      </div>
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                          selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-transparent'
                        }`}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    </div>
                  </label>
                )
              })}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="FAA Certificate Number" helper="Your FAA-issued certificate number.">
              <input
                type="text"
                placeholder="e.g. 2443157"
                value={data.faaCertificateNumber || ''}
                onChange={(e) => update({ faaCertificateNumber: e.target.value })}
                className={inputCls('faaCertificateNumber')}
              />
            </Field>
            <Field
              label="IACRA / FTN Tracking Number"
              helper="Optional — for matching with FAA portal records."
            >
              <input
                type="text"
                placeholder="Enter your IACRA or FTN number"
                value={data.iacraTrackingNumber}
                onChange={(e) => update({ iacraTrackingNumber: e.target.value })}
                className={inputCls('iacraTrackingNumber')}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">Additional Certificate</p>
        <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-slate-950">Add a secondary FAA certificate if you hold one.</h3>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-3xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/40">
          <input
            type="checkbox"
            checked={data.hasSecondaryCertificate}
            onChange={(e) => update({ hasSecondaryCertificate: e.target.checked })}
            className="mt-1 h-4 w-4 accent-blue-600"
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">I hold an additional FAA certificate.</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Enable this only if you need the registration to include another certificate profile.
            </p>
          </div>
        </label>

        {data.hasSecondaryCertificate && (
          <div className="mt-5 space-y-4 rounded-3xl border border-blue-100 bg-white p-5">
            <Field label="Secondary Certificate Type" required error={errors.secondaryCertificate}>
              <select
                id="field-secondaryCertificate"
                value={data.secondaryCertificate}
                onChange={(e) => update({ secondaryCertificate: e.target.value })}
                className={inputCls('secondaryCertificate')}
              >
                <option value="">Select certificate type</option>
                {SECONDARY_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Secondary FAA Certificate Number">
                <input
                  type="text"
                  placeholder="Certificate number"
                  value={data.secondaryFaaCertificateNumber}
                  onChange={(e) => update({ secondaryFaaCertificateNumber: e.target.value })}
                  className={inputCls('secondaryFaaCertificateNumber')}
                />
              </Field>

              <Field label="Secondary IACRA Tracking Number">
                <input
                  type="text"
                  placeholder="Tracking number"
                  value={data.secondaryIacraTrackingNumber}
                  onChange={(e) => update({ secondaryIacraTrackingNumber: e.target.value })}
                  className={inputCls('secondaryIacraTrackingNumber')}
                />
              </Field>
            </div>
          </div>
        )}
      </section>

      <div className="rounded-[26px] border border-blue-100 bg-blue-50/80 p-5 text-sm leading-6 text-blue-900">
        If you already have an FAA certificate number, you can usually confirm it on your existing certificate documents or FAA records before proceeding.
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
          onClick={() => {
            if (validate()) onNext()
          }}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700"
        >
          Continue to review
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
