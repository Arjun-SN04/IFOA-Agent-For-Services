import { useState } from 'react'
import PhoneInputLib from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
const PhoneInput = PhoneInputLib.default || PhoneInputLib

/* ─── Pricing per holder range ─── */
const PRICE_MAP = {
  '3 to 5':       { '1 Year Subscription Plan': 60,  'Unlimited Plan': 265 },
  '5 to 10':      { '1 Year Subscription Plan': 55,  'Unlimited Plan': 255 },
  'More than 10': { '1 Year Subscription Plan': 49,  'Unlimited Plan': 245 },
}

const PRICE_LABEL = {
  '3 to 5':       '$60.00',
  '5 to 10':      '$55.00',
  'More than 10': '$49.00',
}

const UNLIMITED_PRICE_LABEL = {
  '3 to 5':       '$265.00',
  '5 to 10':      '$255.00',
  'More than 10': '$245.00',
}

const COUNT_OPTIONS = {
  '3 to 5':       [3, 4, 5],
  '5 to 10':      [5, 6, 7, 8, 9, 10],
  'More than 10': Array.from({ length: 90 }, (_, i) => i + 11),
}

const HOLDER_COUNTS = ['3 to 5', '5 to 10', 'More than 10']
const SUBSCRIPTION_PLANS = ['1 Year Subscription Plan', 'Unlimited Plan']

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','American Samoa','Andorra','Angola','Anguilla','Antigua and Barbuda','Argentina',
  'Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize',
  'Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi',
  'Cambodia','Cameroon','Canada','Cayman Islands','Chile','China','Colombia','Costa Rica','Croatia','Cuba','Cyprus',
  'Czech Republic','Denmark','Dominican Republic','Ecuador','Egypt','El Salvador','Estonia','Ethiopia','Finland','France',
  'Germany','Ghana','Greece','Guatemala','Haiti','Honduras','Hong Kong','Hungary','Iceland','India','Indonesia','Iraq',
  'Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Korea (Republic of)','Kuwait','Latvia',
  'Lebanon','Libya','Lithuania','Luxembourg','Malaysia','Maldives','Malta','Mexico','Moldova','Monaco','Mongolia',
  'Morocco','Mozambique','Myanmar','Nepal','Netherlands','New Zealand','Nicaragua','Nigeria','Norway','Oman','Pakistan',
  'Palestine','Panama','Paraguay','Peru','Philippines','Poland','Portugal','Puerto Rico','Qatar','Romania',
  'Russian Federation','Rwanda','Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','Somalia',
  'South Africa','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria','Taiwan','Tanzania','Thailand',
  'Tunisia','Türkiye','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States of America',
  'Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
]

/* ─── Field wrapper ─── */
function Field({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && (
        <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </span>
      )}
    </div>
  )
}

/* ─── Searchable country dropdown ─── */
function CountrySelect({ value, onChange, error }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = COUNTRIES.filter(c => c.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setSearch('') }}
        className={`w-full text-left px-3.5 py-2.5 border rounded-xl text-sm bg-white outline-none transition-all duration-150 flex items-center justify-between ${
          error ? 'border-red-300' : open ? 'border-blue-600 ring-2 ring-blue-600/15' : 'border-gray-200 hover:border-gray-300'
        } ${value ? 'text-gray-900' : 'text-gray-400'}`}
      >
        <span>{value || '--- Select country ---'}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-blue-600 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <input
              autoFocus
              type="text"
              placeholder="Search country…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-600 bg-white text-gray-800 placeholder:text-gray-400"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && <div className="px-4 py-3 text-sm text-gray-400">No results</div>}
            {filtered.map(c => (
              <div
                key={c}
                onClick={() => { onChange(c); setOpen(false); setSearch('') }}
                className={`px-4 py-2 text-sm cursor-pointer transition-colors duration-100 border-l-2 ${
                  c === value
                    ? 'bg-blue-50 text-blue-700 font-semibold border-l-blue-600'
                    : 'text-gray-800 hover:bg-gray-50 border-l-transparent'
                }`}
              >
                {c}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AirlinesStep1PlanAndDetails({ data, update, onNext }) {
  const [errors, setErrors] = useState({})

  const inputCls = (field) =>
    `w-full px-3.5 py-2.5 border rounded-xl text-sm text-gray-900 bg-white outline-none transition-all duration-150 focus:ring-2 focus:ring-blue-600/15 placeholder:text-gray-400 ${
      errors[field]
        ? 'border-red-300 focus:border-red-400 bg-red-50/30'
        : 'border-gray-200 focus:border-blue-600 hover:border-gray-300'
    }`

  const serviceLabel = data.holderCount && data.subscriptionPlan === '1 Year Subscription Plan'
    ? `Agent for Service — ${data.holderCount === '3 to 5' ? 'Up to 5' : data.holderCount === '5 to 10' ? 'Up to 10' : 'More than 10'} — 1 Year Subscription`
    : data.holderCount && data.subscriptionPlan === 'Unlimited Plan'
    ? `Agent for Service — ${data.holderCount === '3 to 5' ? 'Up to 5' : data.holderCount === '5 to 10' ? 'Up to 10' : 'More than 10'} — Unlimited Plan`
    : null

  const validate = () => {
    const e = {}
    if (!data.holderCount)             e.holderCount      = 'Please select the number of holders'
    if (!data.holderCountValue)        e.holderCountValue  = 'Please select exact count'
    if (!data.subscriptionPlan)        e.subscriptionPlan  = 'Please select a plan'
    if (!data.airlineName?.trim())     e.airlineName       = 'Company name is required'
    if (!data.addressLine1?.trim())    e.addressLine1      = 'Address is required'
    if (!data.country)                 e.country           = 'Country is required'
    if (!data.firstName?.trim())       e.firstName         = 'First name is required'
    if (!data.lastName?.trim())        e.lastName          = 'Last name is required'
    if (!data.email?.trim())           e.email             = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = 'Invalid email'
    if (!data.phone || data.phone.length < 7) e.phone = 'Valid phone is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="space-y-8">

      {/* ── 1. Number of FAA Certificate Holders ── */}
      <div>
        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-1">
          Number of FAA Certificate Holders to Register
        </h3>
        {errors.holderCount && <p className="text-red-500 text-xs mb-2">{errors.holderCount}</p>}

        <div className="flex flex-wrap gap-3 mt-3">
          {HOLDER_COUNTS.map(count => {
            const active = data.holderCount === count
            return (
              <label key={count}
                className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-150 ${
                  active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 text-gray-600 bg-white'
                }`}>
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  active ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                }`}>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <input type="radio" name="holderCount" value={count} checked={active}
                  onChange={() => {
                    const plan = data.subscriptionPlan || '1 Year Subscription Plan'
                    update({ holderCount: count, holderCountValue: '', pricePerCertificate: PRICE_MAP[count]?.[plan] || 49 })
                  }}
                  className="hidden" />
                {count}
              </label>
            )
          })}
        </div>

        {data.holderCount && (
          <div className="mt-3">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1.5">
              Exact Number <span className="text-red-400">*</span>
            </label>
            <select
              value={data.holderCountValue || ''}
              onChange={e => update({ holderCountValue: e.target.value })}
              className={`w-40 px-3.5 py-2.5 border rounded-xl text-sm text-gray-900 bg-white outline-none cursor-pointer transition-all duration-150 focus:ring-2 focus:ring-blue-600/15 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M2.22%204.47a.75.75%200%20011.06%200L6%207.19l2.72-2.72a.75.75%200%20011.06%201.06l-3.25%203.25a.75.75%200%2001-1.06%200L2.22%205.53a.75.75%200%20010-1.06z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.75rem_center] pr-9 ${
                errors.holderCountValue ? 'border-red-300' : 'border-gray-200 focus:border-blue-600 hover:border-gray-300'
              }`}
            >
              <option value="">— Select —</option>
              {COUNT_OPTIONS[data.holderCount].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            {errors.holderCountValue && <p className="text-red-500 text-xs mt-1">{errors.holderCountValue}</p>}
          </div>
        )}
      </div>

      {/* ── 2. Subscription Plan ── */}
      <div>
        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-1">
          Subscription Plan <span className="text-red-400">*</span>
        </h3>
        {errors.subscriptionPlan && <p className="text-red-500 text-xs mb-2">{errors.subscriptionPlan}</p>}

        <div className="mt-3">
          <select
            value={data.subscriptionPlan || ''}
            onChange={e => {
              const plan = e.target.value
              const price = data.holderCount ? PRICE_MAP[data.holderCount]?.[plan] : null
              update({ subscriptionPlan: plan, pricePerCertificate: price || 0 })
            }}
            className={`w-full px-3.5 py-2.5 border rounded-xl text-sm text-gray-900 bg-white outline-none cursor-pointer transition-all duration-150 focus:ring-2 focus:ring-blue-600/15 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M2.22%204.47a.75.75%200%20011.06%200L6%207.19l2.72-2.72a.75.75%200%20011.06%201.06l-3.25%203.25a.75.75%200%2001-1.06%200L2.22%205.53a.75.75%200%20010-1.06z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.75rem_center] pr-10 ${
              errors.subscriptionPlan ? 'border-red-300' : 'border-gray-200 focus:border-blue-600 hover:border-gray-300'
            }`}
          >
            <option value="">— Select a plan —</option>
            {SUBSCRIPTION_PLANS.map(plan => (
              <option key={plan} value={plan}>{plan}</option>
            ))}
          </select>
        </div>

        {serviceLabel && (
          <div className="mt-3 px-4 py-3.5 rounded-xl border border-blue-100 bg-blue-50/40">
            <p className="text-sm font-semibold text-gray-700 mb-1">{serviceLabel}</p>
            <p className="text-sm font-bold text-gray-900">
              Price:{' '}
              <span className="text-green-600 text-base">
                {data.subscriptionPlan === '1 Year Subscription Plan' && data.holderCount
                  ? PRICE_LABEL[data.holderCount]
                  : data.subscriptionPlan === 'Unlimited Plan' && data.holderCount
                  ? UNLIMITED_PRICE_LABEL[data.holderCount]
                  : '—'}
              </span>
              {data.subscriptionPlan === '1 Year Subscription Plan' && (
                <span className="text-xs text-gray-400 font-normal ml-1.5">per certificate / year</span>
              )}
              {data.subscriptionPlan === 'Unlimited Plan' && (
                <span className="text-xs text-gray-400 font-normal ml-1.5">per year</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* ── 3. Company ── */}
      <div>
        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">Company</h3>
        <Field label="Company / Airline Name" required error={errors.airlineName}>
          <input type="text" placeholder="e.g. Skyline Airways Inc." value={data.airlineName || ''}
            onChange={e => update({ airlineName: e.target.value })} className={inputCls('airlineName')} />
        </Field>
      </div>

      {/* ── 4. Address ── */}
      <div>
        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">
          Address <span className="text-red-400">*</span>
        </h3>
        <div className="space-y-4">
          <Field label="Address Line 1" required error={errors.addressLine1}>
            <input type="text" placeholder="Street address" value={data.addressLine1 || ''}
              onChange={e => update({ addressLine1: e.target.value })} className={inputCls('addressLine1')} />
          </Field>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="City">
              <input type="text" placeholder="City" value={data.city || ''}
                onChange={e => update({ city: e.target.value })} className={inputCls('city')} />
            </Field>
            <Field label="State / Province">
              <input type="text" placeholder="State" value={data.state || ''}
                onChange={e => update({ state: e.target.value })} className={inputCls('state')} />
            </Field>
            <Field label="Postal Code">
              <input type="text" placeholder="Postal code" value={data.postalCode || ''}
                onChange={e => update({ postalCode: e.target.value })} className={inputCls('postalCode')} />
            </Field>
          </div>
          <Field label="Country" required error={errors.country}>
            <CountrySelect value={data.country} onChange={val => update({ country: val })} error={errors.country} />
          </Field>
        </div>
      </div>

      {/* ── 5. Point of Contact ── */}
      <div>
        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">Point of Contact Information</h3>
        <div className="space-y-4">
          {/* First Name + Last Name (separate — required by model) */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="First Name" required error={errors.firstName}>
              <input type="text" placeholder="First name" value={data.firstName || ''}
                onChange={e => update({ firstName: e.target.value })} className={inputCls('firstName')} />
            </Field>
            <Field label="Last Name" required error={errors.lastName}>
              <input type="text" placeholder="Last name" value={data.lastName || ''}
                onChange={e => update({ lastName: e.target.value })} className={inputCls('lastName')} />
            </Field>
          </div>
          {/* Middle Name (optional) */}
          <Field label="Middle Name">
            <input type="text" placeholder="Middle name (optional)" value={data.middleName || ''}
              onChange={e => update({ middleName: e.target.value })} className={inputCls('middleName')} />
          </Field>
          {/* Date of Birth */}
          <Field label="Date of Birth">
            <input type="date" value={data.dateOfBirth || ''}
              onChange={e => update({ dateOfBirth: e.target.value })} className={inputCls('dateOfBirth')} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Email" required error={errors.email}>
              <input type="email" placeholder="ops@airline.com" value={data.email || ''}
                onChange={e => update({ email: e.target.value })} className={inputCls('email')} />
            </Field>
            <Field label="Phone" required error={errors.phone}>
              <style>{`
                .airlines-phone .react-tel-input .form-control {
                  background: #ffffff !important; border: 1px solid #e5e7eb !important;
                  color: #111827 !important; border-radius: 0.75rem !important;
                  width: 100% !important; height: 42px !important;
                  font-size: 0.875rem !important; padding-left: 52px !important;
                  outline: none !important; box-shadow: none !important;
                }
                .airlines-phone .react-tel-input .form-control:focus {
                  border-color: #2563eb !important;
                  box-shadow: 0 0 0 3px rgba(37,99,235,0.12) !important;
                }
                .airlines-phone .react-tel-input .flag-dropdown {
                  background: #f9fafb !important; border: 1px solid #e5e7eb !important;
                  border-right: none !important; border-radius: 0.75rem 0 0 0.75rem !important;
                }
                .airlines-phone .react-tel-input .flag-dropdown.open { z-index: 9999 !important; }
                .airlines-phone .react-tel-input .selected-flag {
                  background: transparent !important; border-radius: 0.75rem 0 0 0.75rem !important; padding-left: 10px !important;
                }
                .airlines-phone .react-tel-input .country-list {
                  background: #ffffff !important; border: 1.5px solid #2563eb !important;
                  border-radius: 0.875rem !important; box-shadow: 0 32px 80px rgba(15,23,42,0.22) !important;
                  max-height: 420px !important; min-width: 360px !important; width: 360px !important;
                  margin-top: 4px !important; overflow-y: auto !important; z-index: 9999 !important;
                }
                .airlines-phone .react-tel-input .country-list .country {
                  color: #1f2937 !important; padding: 10px 14px !important;
                  display: flex !important; align-items: center !important; gap: 10px !important; font-size: 13.5px !important;
                }
                .airlines-phone .react-tel-input .country-list .country:hover,
                .airlines-phone .react-tel-input .country-list .country.highlight { background: #eff6ff !important; }
                .airlines-phone .react-tel-input .country-list .country-name { color: #1f2937 !important; font-size: 13.5px !important; }
                .airlines-phone .react-tel-input .country-list .dial-code { color: #64748b !important; font-size: 12.5px !important; }
                .airlines-phone .react-tel-input .country-list .search {
                  padding: 10px 10px 6px !important; position: sticky !important; top: 0 !important;
                  background: #fff !important; border-bottom: 1px solid #f1f5f9 !important; z-index: 1 !important;
                }
                .airlines-phone .react-tel-input .search-box {
                  background: #f8fafc !important; border: 1.5px solid #e2e8f0 !important;
                  color: #1f2937 !important; border-radius: 0.5rem !important;
                  padding: 8px 12px !important; width: 100% !important; font-size: 13px !important;
                  outline: none !important; box-sizing: border-box !important;
                }
                .airlines-phone .react-tel-input .search-box:focus { border-color: #2563eb !important; background: #ffffff !important; }
                .airlines-phone .react-tel-input .search-emoji { display: none !important; }
              `}</style>
              <div className="airlines-phone">
                <PhoneInput
                  country="us"
                  value={data.phone || ''}
                  onChange={phone => update({ phone })}
                  enableSearch
                  searchPlaceholder="Search country..."
                  preferredCountries={['us', 'gb', 'ae', 'au', 'ca', 'in']}
                />
              </div>
            </Field>
          </div>
        </div>
      </div>

      {/* ── Next button ── */}
      <div className="flex justify-end pt-6 border-t border-gray-100">
        <button onClick={() => { if (validate()) onNext() }}
          className="inline-flex items-center gap-2 px-8 py-3 bg-blue-700 hover:bg-blue-800 active:scale-95 text-white font-bold rounded-xl transition-all duration-150 shadow-sm hover:shadow-md hover:-translate-y-px">
          Next
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
