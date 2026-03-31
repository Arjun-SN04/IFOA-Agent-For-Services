import { useState } from 'react'

const EMPTY_HOLDER = {
  fullName: '',
  dateOfBirth: '',
  certificateType: '',
  certificateStatus: 'EXISTING',
  faaCertificateNumber: '',
  iacraFtnNumber: '',
  email: '',
  hasSecondaryCertificate: false,
  secondaryCertificateType: '',
  secondaryFaaCertificateNumber: '',
  secondaryIacraFtnNumber: '',
}

const CERTIFICATE_TYPES = [
  'Part 61 - Pilot',
  'Part 61 - Flight or Ground Instructor',
  'Part 65 - Aircraft Dispatcher',
]

export default function AirlinesStep2Holders({ data, update, onNext, onBack }) {
  const [errors, setErrors] = useState([])
  const [expandedSecondary, setExpandedSecondary] = useState({})

  const holders = data.certificateHolders?.length > 0
    ? data.certificateHolders
    : [{ ...EMPTY_HOLDER }]

  const maxHolders = data.holderCountValue ? parseInt(data.holderCountValue) : null
  const atLimit = maxHolders !== null && holders.length >= maxHolders

  const isUnlimited = data.subscriptionPlan === 'Unlimited Plan'
  const numericTotal = isUnlimited
    ? (data.pricePerCertificate || 0)
    : (data.pricePerCertificate || 0) * holders.length

  const syncHolders = (newHolders) => update({ certificateHolders: newHolders })

  const onChange = (index, field, value) => {
    const updated = holders.map((h, i) => i === index ? { ...h, [field]: value } : h)
    syncHolders(updated)
  }

  const toggleSecondary = (index, checked) => {
    onChange(index, 'hasSecondaryCertificate', checked)
    setExpandedSecondary(prev => ({ ...prev, [index]: checked }))
  }

  const addHolder = () => {
    if (atLimit) return
    syncHolders([...holders, { ...EMPTY_HOLDER }])
  }

  const removeHolder = (index) => {
    if (holders.length > 1) {
      syncHolders(holders.filter((_, i) => i !== index))
      setExpandedSecondary(prev => {
        const next = { ...prev }
        delete next[index]
        return next
      })
    }
  }

  const validate = () => {
    const errs = holders.map(h => {
      const e = {}
      if (!h.fullName?.trim())              e.fullName              = 'Required'
      if (!h.dateOfBirth?.trim())           e.dateOfBirth           = 'Required'
      if (!h.certificateType)               e.certificateType       = 'Required'
      if (!h.faaCertificateNumber?.trim())  e.faaCertificateNumber  = 'Required'
      if (!h.iacraFtnNumber?.trim())        e.iacraFtnNumber        = 'Required'
      if (h.hasSecondaryCertificate) {
        if (!h.secondaryCertificateType)    e.secondaryCertificateType = 'Required'
      }
      return e
    })
    setErrors(errs)
    return errs.every(e => Object.keys(e).length === 0)
  }

  const inputCls = (idx, field) =>
    `w-full px-3 py-2.5 border rounded-lg text-sm text-gray-900 bg-white outline-none transition-all duration-150 focus:ring-2 focus:ring-blue-600/15 placeholder:text-gray-400 ${
      errors[idx]?.[field]
        ? 'border-red-300 focus:border-red-400 bg-red-50/30'
        : 'border-gray-200 focus:border-blue-600 hover:border-gray-300'
    }`

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">Register Your Team Members</h3>
        <p className="text-sm text-gray-500">
          Click <span className="font-bold text-blue-700">Add Member</span> to add a team member, or the{' '}
          <span className="font-bold text-red-500">✕</span> button to remove one.
        </p>
      </div>

      {/* Summary bar */}
      {data.subscriptionPlan && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center justify-between text-sm">
          <span className="text-blue-700 font-semibold">
            {data.subscriptionPlan}
            {maxHolders
              ? ` · ${maxHolders} holder${maxHolders !== 1 ? 's' : ''} selected`
              : ` · ${holders.length} added`}
          </span>
          <span className="font-black text-blue-900">
            {isUnlimited ? 'Flat: ' : 'Total: '}
            <span className="text-green-700">${numericTotal} USD</span>
          </span>
        </div>
      )}

      {/* Holder limit warning — blue instead of yellow/amber */}
      {atLimit && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-300 rounded-xl p-4 text-sm text-blue-800">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="font-bold">Maximum holders reached ({maxHolders})</p>
            <p>
              You selected <strong>{maxHolders}</strong> holder{maxHolders !== 1 ? 's' : ''} in Step 1.
              To add more, go back and increase the exact holder count.
            </p>
          </div>
        </div>
      )}

      {/* Holder cards */}
      <div className="space-y-5">
        {holders.map((h, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-gray-50/50 overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                  {i + 1}
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {h.fullName?.trim() ? h.fullName : `Team Member #${i + 1}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeHolder(i)}
                disabled={holders.length <= 1}
                title="Remove this member"
                className="w-7 h-7 flex items-center justify-center rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Card body */}
            <div className="px-5 py-5 space-y-4">
              {/* Row 1: Full Name + DOB */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input type="text" placeholder="Full legal name" value={h.fullName || ''}
                    onChange={e => onChange(i, 'fullName', e.target.value)}
                    className={inputCls(i, 'fullName')} />
                  {errors[i]?.fullName && <p className="text-red-500 text-xs">{errors[i].fullName}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    Date of Birth <span className="text-red-400">*</span>
                  </label>
                  <input type="date" value={h.dateOfBirth || ''}
                    onChange={e => onChange(i, 'dateOfBirth', e.target.value)}
                    className={inputCls(i, 'dateOfBirth')} />
                  {errors[i]?.dateOfBirth && <p className="text-red-500 text-xs">{errors[i].dateOfBirth}</p>}
                </div>
              </div>

              {/* Row 2: Certificate Type + Status */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    Certificate Type <span className="text-red-400">*</span>
                  </label>
                  <select value={h.certificateType || ''}
                    onChange={e => onChange(i, 'certificateType', e.target.value)}
                    className={inputCls(i, 'certificateType') + ' cursor-pointer'}>
                    <option value="">Select certificate type…</option>
                    {CERTIFICATE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors[i]?.certificateType && <p className="text-red-500 text-xs">{errors[i].certificateType}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Certificate Status</label>
                  <div className="flex gap-3 pt-1">
                    {['NEW', 'EXISTING'].map(val => (
                      <label key={val} className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-150 flex-1 justify-center ${
                        h.certificateStatus === val
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-200 text-gray-600 bg-white'
                      }`}>
                        <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          h.certificateStatus === val ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                        }`}>
                          {h.certificateStatus === val && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <input type="radio" name={`status-${i}`} value={val}
                          checked={h.certificateStatus === val}
                          onChange={e => onChange(i, 'certificateStatus', e.target.value)}
                          className="hidden" />
                        {val === 'NEW' ? 'New' : 'Existing'}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 3: FAA Cert # + IACRA FTN */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    FAA Certificate # <span className="text-red-400">*</span>
                  </label>
                  <input type="text" placeholder="FAA Certificate Number" value={h.faaCertificateNumber || ''}
                    onChange={e => onChange(i, 'faaCertificateNumber', e.target.value)}
                    className={inputCls(i, 'faaCertificateNumber')} />
                  {errors[i]?.faaCertificateNumber && <p className="text-red-500 text-xs">{errors[i].faaCertificateNumber}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    IACRA FTN # <span className="text-red-400">*</span>
                  </label>
                  <input type="text" placeholder="FTN-XXXXXXXX" value={h.iacraFtnNumber || ''}
                    onChange={e => onChange(i, 'iacraFtnNumber', e.target.value)}
                    className={inputCls(i, 'iacraFtnNumber')} />
                  {errors[i]?.iacraFtnNumber && <p className="text-red-500 text-xs">{errors[i].iacraFtnNumber}</p>}
                </div>
              </div>

              {/* Row 4: Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="team.member@example.com"
                  value={h.email || ''}
                  onChange={e => onChange(i, 'email', e.target.value)}
                  className={inputCls(i, 'email')}
                />
                {errors[i]?.email && <p className="text-red-500 text-xs">{errors[i].email}</p>}
              </div>

              {/* Secondary Certificate toggle */}
              <div className="pt-1">
                <label className={`flex items-center gap-3 cursor-pointer p-3.5 rounded-xl border transition-all duration-150 ${
                  h.hasSecondaryCertificate ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 hover:border-blue-200 bg-white'
                }`}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150 flex-shrink-0 ${
                    h.hasSecondaryCertificate ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                  }`}>
                    {h.hasSecondaryCertificate && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <input type="checkbox" checked={h.hasSecondaryCertificate || false}
                    onChange={e => toggleSecondary(i, e.target.checked)} className="sr-only" />
                  <span className="text-sm font-semibold text-gray-700">This holder has a secondary FAA certificate</span>
                </label>

                {/* Secondary certificate fields */}
                {h.hasSecondaryCertificate && (
                  <div className="mt-3 ml-2 pl-4 border-l-2 border-blue-200 space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                        Secondary Certificate Type <span className="text-red-400">*</span>
                      </label>
                      <select value={h.secondaryCertificateType || ''}
                        onChange={e => onChange(i, 'secondaryCertificateType', e.target.value)}
                        className={inputCls(i, 'secondaryCertificateType') + ' cursor-pointer'}>
                        <option value="">Select secondary type…</option>
                        {CERTIFICATE_TYPES.filter(t => t !== h.certificateType).map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      {errors[i]?.secondaryCertificateType && <p className="text-red-500 text-xs">{errors[i].secondaryCertificateType}</p>}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Secondary FAA Cert #</label>
                        <input type="text" placeholder="Secondary FAA Cert #" value={h.secondaryFaaCertificateNumber || ''}
                          onChange={e => onChange(i, 'secondaryFaaCertificateNumber', e.target.value)}
                          className={inputCls(i, 'secondaryFaaCertificateNumber')} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Secondary IACRA FTN #</label>
                        <input type="text" placeholder="FTN-XXXXXXXX" value={h.secondaryIacraFtnNumber || ''}
                          onChange={e => onChange(i, 'secondaryIacraFtnNumber', e.target.value)}
                          className={inputCls(i, 'secondaryIacraFtnNumber')} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-between pt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={addHolder}
          disabled={atLimit}
          title={atLimit ? `Limit of ${maxHolders} holders reached — go back to Step 1 to change` : 'Add a team member'}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 font-semibold rounded-lg transition-all ${
            atLimit ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Member
          {maxHolders !== null && (
            <span className="ml-1 text-xs opacity-60 font-normal">({holders.length}/{maxHolders})</span>
          )}
        </button>

        <div className="flex gap-3">
          <button type="button" onClick={onBack}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
            Back
          </button>
          <button type="button" onClick={() => { if (validate()) onNext() }}
            className="inline-flex items-center gap-2 px-8 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg transition-all">
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
