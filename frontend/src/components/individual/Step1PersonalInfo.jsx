import { useState, useEffect } from 'react'
import PhoneInputLib from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'

const PhoneInput = PhoneInputLib.default || PhoneInputLib

// Map country names to ISO2 codes used by react-phone-input-2
const COUNTRY_TO_ISO2 = {
  'Afghanistan': 'af', 'Albania': 'al', 'Algeria': 'dz', 'American Samoa': 'as', 'Andorra': 'ad',
  'Angola': 'ao', 'Anguilla': 'ai', 'Antigua and Barbuda': 'ag', 'Argentina': 'ar', 'Armenia': 'am',
  'Aruba': 'aw', 'Australia': 'au', 'Austria': 'at', 'Azerbaijan': 'az', 'Bahamas': 'bs',
  'Bahrain': 'bh', 'Bangladesh': 'bd', 'Barbados': 'bb', 'Belarus': 'by', 'Belgium': 'be',
  'Belize': 'bz', 'Benin': 'bj', 'Bermuda': 'bm', 'Bhutan': 'bt', 'Bolivia': 'bo',
  'Bosnia and Herzegovina': 'ba', 'Botswana': 'bw', 'Brazil': 'br', 'Brunei': 'bn', 'Bulgaria': 'bg',
  'Burkina Faso': 'bf', 'Burundi': 'bi', 'Cabo Verde': 'cv', 'Cambodia': 'kh', 'Cameroon': 'cm',
  'Canada': 'ca', 'Cayman Islands': 'ky', 'Central African Republic': 'cf', 'Chad': 'td', 'Chile': 'cl',
  'China': 'cn', 'Colombia': 'co', 'Comoros': 'km', 'Congo': 'cg', 'Costa Rica': 'cr',
  'Croatia': 'hr', 'Cuba': 'cu', 'Cyprus': 'cy', 'Czech Republic': 'cz', 'Denmark': 'dk',
  'Dominican Republic': 'do', 'Ecuador': 'ec', 'Egypt': 'eg', 'El Salvador': 'sv', 'Eritrea': 'er',
  'Estonia': 'ee', 'Ethiopia': 'et', 'Finland': 'fi', 'France': 'fr', 'Germany': 'de',
  'Ghana': 'gh', 'Greece': 'gr', 'Guatemala': 'gt', 'Haiti': 'ht', 'Honduras': 'hn',
  'Hong Kong': 'hk', 'Hungary': 'hu', 'Iceland': 'is', 'India': 'in', 'Indonesia': 'id',
  'Iraq': 'iq', 'Ireland': 'ie', 'Israel': 'il', 'Italy': 'it', 'Jamaica': 'jm',
  'Japan': 'jp', 'Jordan': 'jo', 'Kazakhstan': 'kz', 'Kenya': 'ke', 'Korea (Republic of)': 'kr',
  'Kuwait': 'kw', 'Kyrgyzstan': 'kg', 'Latvia': 'lv', 'Lebanon': 'lb', 'Libya': 'ly',
  'Lithuania': 'lt', 'Luxembourg': 'lu', 'Malaysia': 'my', 'Maldives': 'mv', 'Mali': 'ml',
  'Malta': 'mt', 'Mexico': 'mx', 'Moldova': 'md', 'Monaco': 'mc', 'Mongolia': 'mn',
  'Morocco': 'ma', 'Mozambique': 'mz', 'Myanmar': 'mm', 'Nepal': 'np', 'Netherlands': 'nl',
  'New Zealand': 'nz', 'Nicaragua': 'ni', 'Nigeria': 'ng', 'Norway': 'no', 'Oman': 'om',
  'Pakistan': 'pk', 'Palestine': 'ps', 'Panama': 'pa', 'Paraguay': 'py', 'Peru': 'pe',
  'Philippines': 'ph', 'Poland': 'pl', 'Portugal': 'pt', 'Puerto Rico': 'pr', 'Qatar': 'qa',
  'Romania': 'ro', 'Russian Federation': 'ru', 'Rwanda': 'rw', 'Saudi Arabia': 'sa', 'Senegal': 'sn',
  'Serbia': 'rs', 'Singapore': 'sg', 'Slovakia': 'sk', 'Slovenia': 'si', 'Somalia': 'so',
  'South Africa': 'za', 'Spain': 'es', 'Sri Lanka': 'lk', 'Sudan': 'sd', 'Sweden': 'se',
  'Switzerland': 'ch', 'Syria': 'sy', 'Taiwan': 'tw', 'Tanzania': 'tz', 'Thailand': 'th',
  'Tunisia': 'tn', 'Turkey': 'tr', 'Uganda': 'ug', 'Ukraine': 'ua', 'United Arab Emirates': 'ae',
  'United Kingdom': 'gb', 'United States of America': 'us', 'Uruguay': 'uy', 'Uzbekistan': 'uz',
  'Venezuela': 've', 'Vietnam': 'vn', 'Yemen': 'ye', 'Zambia': 'zm', 'Zimbabwe': 'zw',
}

const PRICES = {
  '1 Year Subscription Plan': 69,
  'Multiple Years Subscription Plan': 55, // base per year
  'Unlimited Plan': 299,
}

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'American Samoa', 'Andorra', 'Angola', 'Anguilla', 'Antarctica', 'Antigua and Barbuda', 'Argentina',
  'Armenia', 'Aruba', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize',
  'Benin', 'Bermuda', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Cayman Islands', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia',
  'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Eritrea', 'Estonia', 'Ethiopia', 'Finland', 'France', 'Germany', 'Ghana', 'Greece', 'Guatemala', 'Haiti', 'Honduras',
  'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan',
  'Kenya', 'Korea (Republic of)', 'Kuwait', 'Kyrgyzstan', 'Latvia', 'Lebanon', 'Libya', 'Lithuania', 'Luxembourg', 'Malaysia', 'Maldives',
  'Mali', 'Malta', 'Mexico', 'Moldova', 'Monaco', 'Mongolia', 'Morocco', 'Mozambique', 'Myanmar', 'Nepal', 'Netherlands', 'New Zealand',
  'Nicaragua', 'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Palestine', 'Panama', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Puerto Rico', 'Qatar', 'Romania', 'Russian Federation', 'Rwanda', 'Saudi Arabia', 'Senegal', 'Serbia', 'Singapore', 'Slovakia',
  'Slovenia', 'Somalia', 'South Africa', 'Spain', 'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tanzania', 'Thailand',
  'Tunisia', 'Turkey', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States of America', 'Uruguay',
  'Uzbekistan', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
]

function Field({ label, required, error, helper, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 flex items-center gap-1">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {helper && !error && <p className="text-xs text-slate-400 mt-0.5">{helper}</p>}
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-red-500 mt-0.5">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

const sectionClass = 'rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-gray-100/50'

export default function Step1PersonalInfo({ data, update, onNext }) {
  const [errors, setErrors] = useState({})
  const [phoneCountry, setPhoneCountry] = useState('us')

  // When user picks a country, auto-set the phone flag
  useEffect(() => {
    if (data.country) {
      const iso2 = COUNTRY_TO_ISO2[data.country]
      if (iso2) setPhoneCountry(iso2)
    }
  }, [data.country])

  const validate = () => {
    const nextErrors = {}

    if (!data.firstName.trim()) nextErrors.firstName = 'First name is required.'
    if (!data.lastName.trim()) nextErrors.lastName = 'Last name is required.'
    if (!data.dateOfBirth) nextErrors.dateOfBirth = 'Date of birth is required.'
    if (!data.phone || data.phone.length < 7) nextErrors.phone = 'Enter a valid phone number.'
    if (!data.email.trim()) nextErrors.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) nextErrors.email = 'Enter a valid email address.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const inputCls = (field) =>
    `w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 ${
      errors[field]
        ? 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-3 focus:ring-red-100'
        : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-100'
    }`

  return (
    <div className="space-y-6">
      <section className={sectionClass}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600 mb-1">Service Plan</p>
            <h3 className="text-lg font-bold text-slate-900">Select your registration term</h3>
          </div>
          <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-600">USD</span>
        </div>

        <Field label="Subscription Plan" required error={errors.subscriptionPlan}>
          <select
            value={data.subscriptionPlan || ''}
            onChange={(e) => {
              const val = e.target.value
              let p = PRICES[val] || 0
              if (val === 'Multiple Years Subscription Plan') {
                p = 55 * (data.multiYearCount || 2)
              }
              update({ subscriptionPlan: val, price: p })
            }}
            className={`${inputCls('subscriptionPlan')} appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M2.22%204.47a.75.75%200%20011.06%200L6%207.19l2.72-2.72a.75.75%200%20011.06%201.06l-3.25%203.25a.75.75%200%2001-1.06%200L2.22%205.53a.75.75%200%20010-1.06z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_1rem_center] pr-10 cursor-pointer text-sm font-semibold`}
          >
            <option value="">— Select a Plan —</option>
            <option value="1 Year Subscription Plan">1 Year Subscription Plan</option>
            <option value="Multiple Years Subscription Plan">Multiple Years Subscription Plan</option>
            <option value="Unlimited Plan">Unlimited Plan</option>
          </select>
        </Field>

        {data.subscriptionPlan && (
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-5">
            {data.subscriptionPlan === '1 Year Subscription Plan' && (
              <p className="text-sm font-bold text-slate-800">Agent for Service - Individual - 1 year</p>
            )}

            {data.subscriptionPlan === 'Multiple Years Subscription Plan' && (
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-800">Agent for Service - Individual - Up to 5 Years Subscription</p>
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-slate-600">Select Duration:</label>
                  <select
                    value={data.multiYearCount || 2}
                    onChange={(e) => {
                      const yrs = parseInt(e.target.value)
                      update({ multiYearCount: yrs, price: 55 * yrs })
                    }}
                    className="cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-4 py-2 pr-10 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M2.22%204.47a.75.75%200%20011.06%200L6%207.19l2.72-2.72a.75.75%200%20011.06%201.06l-3.25%203.25a.75.75%200%2001-1.06%200L2.22%205.53a.75.75%200%20010-1.06z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_1rem_center]"
                  >
                    {[2, 3, 4, 5].map((y) => (
                      <option key={y} value={y}>{y} Years</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {data.subscriptionPlan === 'Unlimited Plan' && (
              <p className="text-sm font-bold text-slate-800">Agent for Service - Individual - Unlimited</p>
            )}

            <div className="mt-5 flex items-end justify-between border-t border-blue-100 pt-4">
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Total Price</span>
                {data.subscriptionPlan === 'Multiple Years Subscription Plan' && (
                  <span className="text-xs font-semibold text-blue-600 mt-1 block">($55.00 / year)</span>
                )}
              </div>
              <span className="text-3xl font-black text-slate-900">
                ${data.subscriptionPlan === 'Multiple Years Subscription Plan'
                  ? (55 * (data.multiYearCount || 2)).toFixed(2)
                  : data.subscriptionPlan === '1 Year Subscription Plan'
                  ? '69.00'
                  : '299.00'}
              </span>
            </div>
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600 mb-1">Personal Details</p>
        <h3 className="text-lg font-bold text-slate-900 mb-5">Tell us who the registration is for.</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First Name" required error={errors.firstName}>
            <input
              type="text"
              placeholder="First name"
              value={data.firstName}
              onChange={(e) => update({ firstName: e.target.value })}
              className={inputCls('firstName')}
            />
          </Field>

          <Field label="Last Name" required error={errors.lastName}>
            <input
              type="text"
              placeholder="Last name"
              value={data.lastName}
              onChange={(e) => update({ lastName: e.target.value })}
              className={inputCls('lastName')}
            />
          </Field>

          <Field label="Middle Name" helper="Optional">
            <input
              type="text"
              placeholder="Middle name"
              value={data.middleName}
              onChange={(e) => update({ middleName: e.target.value })}
              className={inputCls('middleName')}
            />
          </Field>

          <Field label="Date of Birth" required error={errors.dateOfBirth}>
            <input
              type="date"
              value={data.dateOfBirth}
              onChange={(e) => update({ dateOfBirth: e.target.value })}
              className={inputCls('dateOfBirth')}
            />
          </Field>
        </div>
      </section>

      <section className={sectionClass}>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600 mb-1">Address</p>
        <h3 className="text-lg font-bold text-slate-900 mb-5">Add your mailing address.</h3>

        <div className="space-y-4">
          <Field label="Address Line 1">
            <input
              type="text"
              placeholder="Street address"
              value={data.addressLine1}
              onChange={(e) => update({ addressLine1: e.target.value })}
              className={inputCls('addressLine1')}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City">
              <input
                type="text"
                placeholder="City"
                value={data.city}
                onChange={(e) => update({ city: e.target.value })}
                className={inputCls('city')}
              />
            </Field>

            <Field label="State / Province">
              <input
                type="text"
                placeholder="State or province"
                value={data.state}
                onChange={(e) => update({ state: e.target.value })}
                className={inputCls('state')}
              />
            </Field>

            <Field label="Postal Code">
              <input
                type="text"
                placeholder="Postal code"
                value={data.postalCode}
                onChange={(e) => update({ postalCode: e.target.value })}
                className={inputCls('postalCode')}
              />
            </Field>
          </div>

          <Field label="Country">
            <select
              value={data.country}
              onChange={(e) => update({ country: e.target.value })}
              className={`${inputCls('country')} appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M2.22%204.47a.75.75%200%20011.06%200L6%207.19l2.72-2.72a.75.75%200%20011.06%201.06l-3.25%203.25a.75.75%200%2001-1.06%200L2.22%205.53a.75.75%200%20010-1.06z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_1rem_center] pr-10 cursor-pointer`}
            >
              <option value="">Select country</option>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className={sectionClass}>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600 mb-1">Contact</p>
        <h3 className="text-lg font-bold text-slate-900 mb-5">Where should updates and payment communication go?</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone Number" required error={errors.phone}>
            <PhoneInput
              country={phoneCountry}
              value={data.phone}
              onChange={(phone, countryData) => {
                update({ phone })
                if (countryData?.countryCode) setPhoneCountry(countryData.countryCode)
              }}
              inputClass={errors.phone ? 'error-field' : ''}
              enableSearch
              searchPlaceholder="Search country..."
              preferredCountries={['us', 'gb', 'ae', 'au', 'ca', 'in']}
              dropdownStyle={{ bottom: '100%', top: 'auto' }}
            />
          </Field>

          <Field label="Email Address" required error={errors.email}>
            <input
              type="email"
              placeholder="name@example.com"
              value={data.email}
              onChange={(e) => update({ email: e.target.value })}
              className={inputCls('email')}
            />
          </Field>
        </div>
      </section>

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <button
          onClick={() => {
            if (validate()) onNext()
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 px-7 py-3 text-sm font-bold text-white transition-all duration-150 shadow-sm hover:shadow-md hover:shadow-blue-200"
        >
          Continue to certificates
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
