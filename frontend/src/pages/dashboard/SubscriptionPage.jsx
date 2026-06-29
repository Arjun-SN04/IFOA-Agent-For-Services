import { useEffect, useRef, useState, useLayoutEffect, useMemo } from 'react'

import { useAuth } from '../../context/AuthContext'
import { useDataCache } from '../../context/DataCacheContext'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import axios from 'axios'
import PaymentModal from '../../components/payment/PaymentModal'
import InvoiceModal, { downloadInvoicePDF } from '../../components/payment/InvoiceModal'
import { buildInvoice, serverPaymentToInvoice } from '../../components/payment/PaymentModal'
import { getAirlineTotal, isActiveHolderGroup, isCurrentBaseGroup, activeGroupSlots, allGroupSlots, activeCoverageAnchor } from '../../utils/airlineTotal'
import { getExpiryStatus } from '../../utils/expiryStatus'
import { getInvoiceStatus } from '../../utils/invoiceStatus'
import PhoneInputLib from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
const PhoneInput = PhoneInputLib.default || PhoneInputLib

// ── Shared country data + dropdown (mirrors Step1PersonalInfo) ────────────────
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

const COUNTRY_LIST = [
  'Afghanistan', 'Albania', 'Algeria', 'American Samoa', 'Andorra', 'Angola', 'Anguilla', 'Antarctica',
  'Antigua and Barbuda', 'Argentina', 'Armenia', 'Aruba', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas',
  'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bermuda', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Cayman Islands', 'Central African Republic', 'Chad',
  'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus',
  'Czech Republic', 'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Eritrea',
  'Estonia', 'Ethiopia', 'Finland', 'France', 'Germany', 'Ghana', 'Greece', 'Guatemala', 'Haiti',
  'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iraq', 'Ireland', 'Israel',
  'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Korea (Republic of)', 'Kuwait',
  'Kyrgyzstan', 'Latvia', 'Lebanon', 'Libya', 'Lithuania', 'Luxembourg', 'Malaysia', 'Maldives', 'Mali',
  'Malta', 'Mexico', 'Moldova', 'Monaco', 'Mongolia', 'Morocco', 'Mozambique', 'Myanmar', 'Nepal',
  'Netherlands', 'New Zealand', 'Nicaragua', 'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Palestine',
  'Panama', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Puerto Rico', 'Qatar', 'Romania',
  'Russian Federation', 'Rwanda', 'Saudi Arabia', 'Senegal', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia',
  'Somalia', 'South Africa', 'Spain', 'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland', 'Syria', 'Taiwan',
  'Tanzania', 'Thailand', 'Tunisia', 'Turkey', 'Uganda', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'United States of America', 'Uruguay', 'Uzbekistan', 'Venezuela', 'Vietnam',
  'Yemen', 'Zambia', 'Zimbabwe',
]

// Reverse map (iso2 → full name) so stored codes like "CZ" display as "Czech Republic".
const ISO2_TO_COUNTRY = Object.fromEntries(
  Object.entries(COUNTRY_TO_ISO2).map(([name, iso]) => [iso, name])
)
function countryDisplayName(val) {
  if (!val) return val
  const s = String(val).trim()
  if (s.length === 2) return ISO2_TO_COUNTRY[s.toLowerCase()] || s.toUpperCase()
  return s
}

function EditCountrySelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = COUNTRY_LIST.filter(c => c.toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="relative">
      <button type="button" onClick={() => { setOpen(v => !v); setSearch('') }}
        className={`w-full text-left px-3 py-2 border rounded-lg text-sm bg-white outline-none transition flex items-center justify-between ${open ? 'border-slate-400 ring-2 ring-slate-100' : 'border-slate-200 hover:border-slate-300'
          } ${value ? 'text-slate-900' : 'text-slate-500'}`}>
        <span>{value || '— Select country —'}</span>
        <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus type="text" placeholder="Search country…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-slate-50 text-slate-800 placeholder:text-slate-500" />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && <div className="px-4 py-3 text-sm text-slate-500">No results</div>}
            {filtered.map(c => (
              <div key={c} onClick={() => { onChange(c); setOpen(false); setSearch('') }}
                className={`px-4 py-2 text-sm cursor-pointer transition-colors ${c === value ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}>
                {c}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const EMPTY_HOLDER = {
  fullName: '', dateOfBirth: '', certificateType: '',
  certificateStatus: 'EXISTING', faaCertificateNumber: '',
  iacraFtnNumber: '', email: '',
  hasSecondaryCertificate: false,
  secondaryCertificateType: '', secondaryFaaCertificateNumber: '', secondaryIacraFtnNumber: '',
}
const CERTIFICATE_TYPES = [
  'Part 61 - Pilot',
  'Part 61 - Flight or Ground Instructor',
  'Part 65 - Aircraft Dispatcher',
  'Part 107 - Remote Pilot',
]

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const API = axios.create({ baseURL: BASE_URL })

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('ifoa_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

async function fetchPaymentRecord(registrationId, token, preferredInvoiceNumber, queuedInvoiceNumber) {
  try {
    const res = await axios.get(`${BASE_URL}/payments/by-registration/${registrationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payments = res.data.data || []
    const paid = payments.filter(p => p?.isPaid)

    const preferred = String(preferredInvoiceNumber || '').trim()
    if (preferred) {
      const exact = paid.find((p) => String(p?.invoiceNumber || '').trim() === preferred)
      if (exact) return exact
    }

    const queued = String(queuedInvoiceNumber || '').trim()
    if (queued) {
      const nonQueued = paid.find((p) => String(p?.invoiceNumber || '').trim() !== queued)
      if (nonQueued) return nonQueued
    }

    return paid[0] || payments[0] || null
  } catch {
    return null
  }
}

function PlanBadge({ plan }) {
  return <span className='text-sm font-bold' style={{ color: 'rgba(255,255,255,0.92)' }}>{plan || 'Unknown Plan'}</span>
}

function PayBadge({ status }) {
  const s = (status || '').toLowerCase()
  const color = (s === 'paid' || s === 'active') ? '#047857' : (s === 'failed' || s === 'inactive') ? '#dc2626' : '#b45309'
  const label = (s === 'paid' || s === 'active') ? 'Paid' : (s === 'failed' || s === 'inactive') ? status : 'Pending'
  return <span className='text-sm font-semibold' style={{ color }}>{label}</span>
}

function Row({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 py-3 border-b border-slate-100 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 sm:w-52 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 break-words min-w-0">{value ?? '—'}</span>
    </div>
  )
}

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
const fmtYMD = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
const money = (n) => n != null ? `$${Number(n).toFixed(2)}` : '—'

const INDIVIDUAL_CERT_TYPES = [
  'Part 65 - Aircraft Dispatcher',
  'Part 61 - Pilot',
  'Part 61 - Flight or Ground Instructor',
  'Part 107 - Remote Pilot',
]

const AIRLINE_CERT_TYPES = [
  'Part 61 - Pilot',
  'Part 61 - Flight or Ground Instructor',
  'Part 65 - Aircraft Dispatcher',
  'Part 107 - Remote Pilot',
]

/* ─────────────────────────────────────────────────────────────────────────── */
/*  EditSubscriptionFormModal                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
export function EditSubscriptionFormModal({ sub, role, onClose, onSaved }) {
  const navigate = useNavigate()
  const isAirline = role === 'airline'
  const isPaid = sub.isPaid === true || sub.paymentStatus === 'paid'
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [limitWarning, setLimitWarning] = useState('')
  const modalRef = useRef(null)

  // Phone country flag — init from existing country value
  const [phoneCountry, setPhoneCountry] = useState(() => {
    const existing = sub.country || ''
    return COUNTRY_TO_ISO2[existing] || 'us'
  })

  // Pre-payment count state (airline only)
  const [exactCount, setExactCount] = useState(Number(sub.holderCountValue || sub.committedCount || sub.certificateHolders?.length || 1))

  const pricePerCert = Number(sub.pricePerCertificate || sub.pricePerCert || 0)

  // Live-computed amounts (only relevant pre-payment)
  const computedAirlineTotal = pricePerCert > 0 ? pricePerCert * exactCount : getAirlineTotal(sub)

  const maxHolders = isPaid
    ? Number(sub.committedCount || sub.holderCountValue || sub.certificateHolders?.length || 0)
    : 0  // pre-payment: no max (user is defining the count)

  const [form, setForm] = useState(() => {
    if (isAirline) {
      return {
        airlineName: sub.airlineName || '',
        firstName: sub.firstName || '',
        lastName: sub.lastName || '',
        middleName: sub.middleName || '',
        dateOfBirth: sub.dateOfBirth ? String(sub.dateOfBirth).slice(0, 10) : '',
        email: sub.email || '',
        phone: sub.phone || '',
        addressLine1: sub.addressLine1 || '',
        addressLine2: sub.addressLine2 || '',
        city: sub.city || '',
        state: sub.state || '',
        postalCode: sub.postalCode || '',
        country: sub.country || '',
        pointOfContact: sub.pointOfContact || '',
        pointOfContactEmail: sub.pointOfContactEmail || '',
        pointOfContactPhone: sub.pointOfContactPhone || '',
        certificateHolders: (sub.certificateHolders || []).map((h) => ({
          ...h,
          fullName: h.fullName || '',
          dateOfBirth: h.dateOfBirth ? String(h.dateOfBirth).slice(0, 10) : '',
          certificateType: h.certificateType || '',
          certificateStatus: h.certificateStatus || 'EXISTING',
          faaCertificateNumber: h.faaCertificateNumber || '',
          iacraFtnNumber: h.iacraFtnNumber || '',
          email: h.email || '',
          hasSecondaryCertificate: !!h.hasSecondaryCertificate,
          secondaryCertificateType: h.secondaryCertificateType || '',
          secondaryFaaCertificateNumber: h.secondaryFaaCertificateNumber || '',
          secondaryIacraFtnNumber: h.secondaryIacraFtnNumber || '',
        })),
      }
    }

    return {
      firstName: sub.firstName || '',
      lastName: sub.lastName || '',
      middleName: sub.middleName || '',
      dateOfBirth: sub.dateOfBirth ? String(sub.dateOfBirth).slice(0, 10) : '',
      addressLine1: sub.addressLine1 || '',
      city: sub.city || '',
      state: sub.state || '',
      postalCode: sub.postalCode || '',
      country: sub.country || '',
      phone: sub.phone || '',
      email: sub.email || '',
      primaryAirmanCertificate: sub.primaryAirmanCertificate || 'EXISTING',
      primaryCertificate: sub.primaryCertificate || '',
      faaCertificateNumber: sub.faaCertificateNumber || '',
      iacraTrackingNumber: sub.iacraTrackingNumber || '',
      hasSecondaryCertificate: !!sub.hasSecondaryCertificate,
      secondaryCertificate: sub.secondaryCertificate || '',
      secondaryFaaCertificateNumber: sub.secondaryFaaCertificateNumber || '',
      secondaryIacraTrackingNumber: sub.secondaryIacraTrackingNumber || '',
    }
  })

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }))

  const setHolder = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      certificateHolders: prev.certificateHolders.map((h, i) => i === index ? { ...h, [field]: value } : h),
    }))
  }

  // The effective holder limit: pre-payment = exactCount the user selected;
  // post-payment = committedCount locked at payment time.
  const effectiveMax = isPaid ? maxHolders : (isAirline ? exactCount : 0)

  const addHolder = () => {
    const current = form.certificateHolders?.length || 0
    if (effectiveMax > 0 && current >= effectiveMax) {
      setLimitWarning(`Holder limit reached — you have used all ${effectiveMax} committed slot${effectiveMax !== 1 ? 's' : ''}. To add more certificate holders, increase your committed count first using "Expand Holder Count".`)
      setError('')
      modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setError('')
    setLimitWarning('')
    setForm((prev) => ({
      ...prev,
      certificateHolders: [
        ...(prev.certificateHolders || []),
        {
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
        },
      ],
    }))
  }

  // When exactCount decreases pre-payment, trim the holders list to match.
  useEffect(() => {
    if (!isPaid && isAirline) {
      setForm((prev) => ({
        ...prev,
        certificateHolders: (prev.certificateHolders || []).slice(0, exactCount),
      }))
      setLimitWarning('')
    }
  }, [exactCount, isPaid, isAirline])

  const removeHolder = (index) => {
    setLimitWarning('')
    setForm((prev) => ({
      ...prev,
      certificateHolders: prev.certificateHolders.filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    if (isAirline && effectiveMax > 0 && (form.certificateHolders?.length || 0) > effectiveMax) {
      setError(`Holder count cannot exceed the selected exact count (${effectiveMax}).`)
      return
    }
    setSaving(true)
    setError('')
    try {
      const airlineBase = {
        airlineName: form.airlineName,
        firstName: form.firstName,
        lastName: form.lastName,
        middleName: form.middleName,
        dateOfBirth: form.dateOfBirth || null,
        email: form.email,
        phone: form.phone,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        country: form.country,
        pointOfContact: form.pointOfContact,
        pointOfContactEmail: form.pointOfContactEmail,
        pointOfContactPhone: form.pointOfContactPhone,
        certificateHolders: (form.certificateHolders || [])
          .filter((h) => h.fullName?.trim())
          .map((h) => ({
            ...h,
            dateOfBirth: h.dateOfBirth || null,
          })),
      }
      const individualBase = {
        firstName: form.firstName,
        lastName: form.lastName,
        middleName: form.middleName,
        dateOfBirth: form.dateOfBirth || null,
        addressLine1: form.addressLine1,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        country: form.country,
        phone: form.phone,
        email: form.email,
        primaryAirmanCertificate: form.primaryAirmanCertificate,
        primaryCertificate: form.primaryCertificate,
        faaCertificateNumber: form.faaCertificateNumber,
        iacraTrackingNumber: form.iacraTrackingNumber,
        hasSecondaryCertificate: !!form.hasSecondaryCertificate,
        secondaryCertificate: form.hasSecondaryCertificate ? form.secondaryCertificate : '',
        secondaryFaaCertificateNumber: form.hasSecondaryCertificate ? form.secondaryFaaCertificateNumber : '',
        secondaryIacraTrackingNumber: form.hasSecondaryCertificate ? form.secondaryIacraTrackingNumber : '',
      }

      // Pre-payment: include count changes for airline so backend can recompute price
      if (!isPaid) {
        if (isAirline) {
          airlineBase.holderCountValue = exactCount
          airlineBase.committedCount = exactCount
        }
      }

      const payload = isAirline ? airlineBase : individualBase
      const endpoint = isAirline ? `/airlines/${sub._id}` : `/individuals/${sub._id}`
      const res = await API.put(endpoint, payload)
      onSaved(res.data.data)
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update details.')
    } finally {
      setSaving(false)
    }
  }

  /* input / select shared style */
  const inp = 'rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition w-full'
  const inpSm = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition w-full'

  const handleChangePlan = () => {
    onClose?.()
    navigate('/register', {
      state: {
        forcePlanChangeStart: true,
        forceRegType: isAirline ? 'airline' : 'individual',
      },
    })
  }

  /* Lock body scroll when modal is open */
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[88px] sm:pt-[96px] pb-4 overflow-hidden animate-modal-backdrop">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal card — scrollable internally */}
      <div ref={modalRef} className="relative z-10 w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[calc(100vh-104px)] sm:max-h-[calc(100vh-120px)] overflow-y-auto animate-modal-panel">

        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-t-2xl sticky top-0 z-10">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Edit Form Details</p>
            <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
              {isAirline ? 'Airline Registration Data' : 'Individual Registration Data'}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 justify-end">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 bg-slate-50/70">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {limitWarning && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <div>
                <p className="text-xs font-bold text-amber-800">Holder limit reached</p>
                <p className="text-xs text-amber-700 mt-0.5">All {effectiveMax} committed slot{effectiveMax !== 1 ? 's' : ''} are used. To add more certificate holders, close this form and click <span className="font-bold">"Expand Holder Count"</span> to increase your committed count first.</p>
              </div>
              <button onClick={() => setLimitWarning('')} className="ml-auto text-amber-400 hover:text-amber-600 flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* ── Pre-payment: plan / count selection ── */}
          {!isPaid && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Subscription Plan {isAirline ? '& Holder Count' : ''}</p>
              {isAirline ? (
                <div className="space-y-3">
                  {/* Current plan — read-only, changed via registration form */}
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Plan</p>
                      <p className="text-sm font-bold text-slate-800">{sub.subscriptionPlan || '—'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleChangePlan}
                      className="text-[10px] font-bold text-blue-600 hover:underline whitespace-nowrap flex-shrink-0"
                    >
                      Change plan ↗
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Exact Certificate Holder Count</label>
                    <input
                      type="number"
                      min="1"
                      className={inp}
                      value={exactCount}
                      onChange={(e) => setExactCount(Math.max(1, Number(e.target.value) || 1))}
                    />
                    <p className="text-xs text-slate-500">Price per cert: ${pricePerCert > 0 ? pricePerCert.toFixed(2) : '—'} &nbsp;·&nbsp; {exactCount} holder{exactCount !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">New total amount</span>
                    <span className="text-sm font-black text-indigo-600">${computedAirlineTotal.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Plan</p>
                      <p className="text-sm font-bold text-slate-800">{sub.subscriptionPlan || '—'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleChangePlan}
                      className="text-[10px] font-bold text-blue-600 hover:underline whitespace-nowrap flex-shrink-0"
                    >
                      Change plan ↗
                    </button>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Plan price</span>
                    <span className="text-sm font-black text-indigo-600">${Number(sub.price || sub.totalServiceFees || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {isAirline ? (
            <>
              {/* ── Company & Contact ── */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3.5 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-700 pb-2.5 border-b border-slate-100">Company &amp; Contact</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Airline Name</label>
                    <input className={inp} placeholder="e.g. Air India" value={form.airlineName} onChange={(e) => setField('airlineName', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Address</label>
                    <input type="email" className={inp} placeholder="contact@airline.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">First Name</label>
                    <input className={inp} placeholder="First name" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Last Name</label>
                    <input className={inp} placeholder="Last name" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone Number</label>
                    <PhoneInput
                      country={phoneCountry}
                      value={form.phone}
                      onChange={(phone, countryData) => {
                        setField('phone', phone)
                        if (countryData?.countryCode) setPhoneCountry(countryData.countryCode)
                      }}
                      enableSearch
                      searchPlaceholder="Search country..."
                      preferredCountries={['us', 'gb', 'ae', 'au', 'ca', 'in']}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Date of Birth</label>
                    <input type="date" className={inp + ' [color-scheme:light]'} value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* ── Address ── */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3.5 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-700 pb-2.5 border-b border-slate-100">Address</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Address Line 1</label>
                    <input className={inp} placeholder="Street address" value={form.addressLine1} onChange={(e) => setField('addressLine1', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Address Line 2 <span className="text-slate-300 font-normal normal-case">(optional)</span></label>
                    <input className={inp} placeholder="Suite, floor, etc." value={form.addressLine2} onChange={(e) => setField('addressLine2', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">City</label>
                    <input className={inp} placeholder="City" value={form.city} onChange={(e) => setField('city', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">State / Province</label>
                    <input className={inp} placeholder="State" value={form.state} onChange={(e) => setField('state', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Postal / ZIP Code</label>
                    <input className={inp} placeholder="Postal code" value={form.postalCode} onChange={(e) => setField('postalCode', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Country</label>
                    <EditCountrySelect
                      value={form.country}
                      onChange={(val) => {
                        setField('country', val)
                        const iso2 = COUNTRY_TO_ISO2[val]
                        if (iso2) setPhoneCountry(iso2)
                      }}
                    />
                  </div>
                </div>
              </div>

            </>
          ) : (
            <>
              {/* ── Personal Info ── */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3.5 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-700 pb-2.5 border-b border-slate-100">Personal Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">First Name <span className="text-red-400">*</span></label>
                    <input className={inp} placeholder="First name" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Last Name <span className="text-red-400">*</span></label>
                    <input className={inp} placeholder="Last name" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Middle Name <span className="text-slate-300 font-normal normal-case">(optional)</span></label>
                    <input className={inp} placeholder="Middle name" value={form.middleName} onChange={(e) => setField('middleName', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Date of Birth</label>
                    <input type="date" className={inp + ' [color-scheme:light]'} value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Address <span className="text-red-400">*</span></label>
                    <input type="email" className={inp} placeholder="your@email.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone Number <span className="text-red-400">*</span></label>
                    <PhoneInput
                      country={phoneCountry}
                      value={form.phone}
                      onChange={(phone, countryData) => {
                        setField('phone', phone)
                        if (countryData?.countryCode) setPhoneCountry(countryData.countryCode)
                      }}
                      enableSearch
                      searchPlaceholder="Search country..."
                      preferredCountries={['us', 'gb', 'ae', 'au', 'ca', 'in']}
                    />
                  </div>
                </div>
              </div>

              {/* ── Address ── */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3.5 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-700 pb-2.5 border-b border-slate-100">Address</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Address Line 1</label>
                    <input className={inp} placeholder="Street address" value={form.addressLine1} onChange={(e) => setField('addressLine1', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">City</label>
                    <input className={inp} placeholder="City" value={form.city} onChange={(e) => setField('city', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">State / Province</label>
                    <input className={inp} placeholder="State" value={form.state} onChange={(e) => setField('state', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Postal / ZIP Code</label>
                    <input className={inp} placeholder="Postal code" value={form.postalCode} onChange={(e) => setField('postalCode', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Country</label>
                    <EditCountrySelect
                      value={form.country}
                      onChange={(val) => {
                        setField('country', val)
                        const iso2 = COUNTRY_TO_ISO2[val]
                        if (iso2) setPhoneCountry(iso2)
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* ── Certificate ── */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3.5 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-700 pb-2.5 border-b border-slate-100">Certificate Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Airman Certificate Status</label>
                    <select className={inp + ' cursor-pointer'} value={form.primaryAirmanCertificate} onChange={(e) => setField('primaryAirmanCertificate', e.target.value)}>
                      <option value="EXISTING">EXISTING</option>
                      <option value="NEW">NEW</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Primary Certificate Type</label>
                    <select className={inp + ' cursor-pointer'} value={form.primaryCertificate} onChange={(e) => setField('primaryCertificate', e.target.value)}>
                      <option value="">Select certificate…</option>
                      {INDIVIDUAL_CERT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">FAA Certificate Number</label>
                    <input className={inp} placeholder="FAA Certificate #" value={form.faaCertificateNumber} onChange={(e) => setField('faaCertificateNumber', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">IACRA Tracking # (FTN)</label>
                    <input className={inp} placeholder="FTN-XXXXXXXX" value={form.iacraTrackingNumber} onChange={(e) => setField('iacraTrackingNumber', e.target.value)} />
                  </div>
                </div>

                {/* Secondary certificate toggle */}
                <label className={`flex items-center gap-2.5 cursor-pointer p-3 rounded-lg border select-none transition-all ${form.hasSecondaryCertificate ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-200 bg-white'
                  }`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${form.hasSecondaryCertificate ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
                    }`}>
                    {form.hasSecondaryCertificate && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.hasSecondaryCertificate}
                    onChange={(e) => setField('hasSecondaryCertificate', e.target.checked)}
                  />
                  <span className="text-sm font-semibold text-slate-700">Has secondary FAA certificate</span>
                </label>

                {/* Secondary fields — rendered inline, never clipped */}
                {form.hasSecondaryCertificate && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Secondary Certificate</p>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Secondary Certificate Type</label>
                      <select
                        className={inp + ' cursor-pointer'}
                        value={form.secondaryCertificate}
                        onChange={(e) => setField('secondaryCertificate', e.target.value)}
                      >
                        <option value="">Select certificate…</option>
                        {INDIVIDUAL_CERT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Secondary FAA Certificate #</label>
                        <input className={inp} placeholder="Secondary FAA Cert #" value={form.secondaryFaaCertificateNumber} onChange={(e) => setField('secondaryFaaCertificateNumber', e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Secondary IACRA FTN #</label>
                        <input className={inp} placeholder="FTN-XXXXXXXX" value={form.secondaryIacraTrackingNumber} onChange={(e) => setField('secondaryIacraTrackingNumber', e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-end gap-3 rounded-b-2xl sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-2 text-sm font-bold text-white w-full sm:w-auto"
          >
            {saving ? 'Saving...' : 'Save Form Data'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  AddHoldersModal                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
function AddHoldersModal({ sub, token, onClose, onSuccess, initialGroupId = '' }) {
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const API = axios.create({ baseURL: BASE_URL })
  API.interceptors.request.use((config) => {
    const t = localStorage.getItem('ifoa_token')
    if (t) config.headers.Authorization = `Bearer ${t}`
    return config
  })

  const existingHolders = sub.certificateHolders || []
  const holderGroups = sub.holderGroups || []
  // Which plan batch these new holders are filled into ('' = base plan).
  // Pre-scoped to a specific upgrade group when opened from a group card.
  const [targetGroupId, setTargetGroupId] = useState(
    initialGroupId && holderGroups.some(g => String(g._id) === String(initialGroupId))
      ? String(initialGroupId)
      : ''
  )

  const currentCount = existingHolders.length
  const committedCount = sub.committedCount || currentCount

  // Capacity depends on the chosen target: a group has its own slots; the base
  // plan = committedCount minus ALL upgrade slots. committedCount accumulates every
  // group's slots (active or expired) and is never decremented, so subtracting all
  // group slots yields the pure base count (shared invariant, mirrors the backend).
  const totalGroupSlots = allGroupSlots(holderGroups)
  const baseCommitted = Math.max(0, committedCount - totalGroupSlots)
  const targetGroup = targetGroupId ? holderGroups.find(g => String(g._id) === String(targetGroupId)) : null
  const filledInTarget = existingHolders.filter(h =>
    targetGroupId ? String(h.holderGroupId || '') === String(targetGroupId) : !h.holderGroupId
  ).length
  const targetCapacity = targetGroup ? targetGroup.count : baseCommitted

  // Holders that already belong to the selected target (group or base plan).
  const holdersForTarget = (tid) => existingHolders
    .filter(h => tid ? String(h.holderGroupId || '') === String(tid) : !h.holderGroupId)
    .map(h => ({ ...EMPTY_HOLDER, ...h, dateOfBirth: h.dateOfBirth ? String(h.dateOfBirth).slice(0, 10) : '' }))

  const buildRows = (tid) => {
    const scoped = holdersForTarget(tid)
    return scoped.length > 0 ? scoped : [{ ...EMPTY_HOLDER }]
  }

  const [holders, setHolders] = useState(() => buildRows(''))
  const [errors, setErrors] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  // Re-scope the form whenever the target plan changes — only show holders that
  // belong to the selected plan (blank row when it has none yet).
  useEffect(() => {
    setHolders(buildRows(targetGroupId))
    setErrors([])
    setApiError('')
  }, [targetGroupId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Number of already-filled holders in the selected target (these are pre-loaded
  // as the first rows; only rows beyond this are genuinely new).
  const existingCount = holdersForTarget(targetGroupId).length
  const newMembersCount = Math.max(0, holders.length - existingCount)
  // Live remaining slots — based on rows currently in the form, so removing a holder
  // frees a slot and re-enables "Add Certificate Holder".
  const remainingSlots = Math.max(0, targetCapacity - holders.length)
  const atLimit = holders.length >= targetCapacity

  const onChange = (i, field, val) =>
    setHolders(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: val } : h))

  const addRow = () => {
    if (!atLimit) setHolders(prev => [...prev, { ...EMPTY_HOLDER }])
  }

  const removeRow = (i) => {
    // Allow removing any holder — existing members too. Saving the form persists the
    // remaining list, so a removed holder is dropped from the airline's record.
    if (holders.length > 1) setHolders(prev => prev.filter((_, idx) => idx !== i))
  }

  const isHolderEmpty = (h) =>
    !h.fullName?.trim() && !h.dateOfBirth && !h.certificateType &&
    !h.iacraFtnNumber?.trim() && !h.faaCertificateNumber?.trim() && !h.email?.trim()

  const validate = () => {
    const errs = holders.map(h => {
      const e = {}
      if (isHolderEmpty(h)) return e
      if (!h.fullName?.trim()) e.fullName = 'Required'
      if (!h.certificateType) e.certificateType = 'Required'
      if (!h.iacraFtnNumber?.trim()) e.iacraFtnNumber = 'Required'
      return e
    })
    setErrors(errs)

    const firstInvalidIdx = errs.findIndex(e => Object.keys(e).length > 0)
    if (firstInvalidIdx !== -1) {
      setTimeout(() => {
        const el = document.getElementById(`add-holder-card-${firstInvalidIdx}`)
        if (el) {
          let scrollParent = el.parentElement
          while (scrollParent && scrollParent !== document.body) {
            const { overflowY } = window.getComputedStyle(scrollParent)
            if (overflowY === 'auto' || overflowY === 'scroll') break
            scrollParent = scrollParent.parentElement
          }
          if (scrollParent && scrollParent !== document.body) {
            const elTop = el.getBoundingClientRect().top
            const containerTop = scrollParent.getBoundingClientRect().top
            scrollParent.scrollBy({ top: elTop - containerTop - 16, behavior: 'smooth' })
          } else {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          const firstField = Object.keys(errs[firstInvalidIdx])[0]
          const input = el.querySelector(`[data-field="${firstField}"]`)
          if (input) setTimeout(() => input.focus({ preventScroll: true }), 350)
        }
      }, 50)
    }

    return errs.every(e => Object.keys(e).length === 0)
  }

  const handleSubmit = async () => {
    const tag = targetGroupId || null
    // Rows for the selected plan, tagged with the target group (null = base).
    const cleaned = holders.filter((h) => !isHolderEmpty(h)).map(h => ({ ...h, holderGroupId: tag }))
    if (cleaned.length === 0) { setApiError('Add at least one member.'); return }
    const targetCapacity = targetGroup ? targetGroup.count : baseCommitted
    if (cleaned.length > targetCapacity) {
      setApiError(`This plan has ${targetCapacity} slot${targetCapacity !== 1 ? 's' : ''}.`)
      return
    }
    if (!validate()) return
    setSubmitting(true)
    setApiError('')
    try {
      // Preserve holders that belong to OTHER plans, then save the full list so
      // each holder keeps its correct plan assignment.
      const otherHolders = existingHolders.filter(h =>
        targetGroupId ? String(h.holderGroupId || '') !== String(targetGroupId) : !!h.holderGroupId
      )
      const fullList = [...otherHolders, ...cleaned]
      const res = await API.put(`/airlines/${sub._id}`, { certificateHolders: fullList })
      onSuccess(res.data)
    } catch (err) {
      setApiError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const inp = (err) => `w-full px-3 py-2 border rounded-lg text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-600/15 ${err ? 'border-red-300 bg-red-50/30' : 'border-gray-200 focus:border-blue-600'}`

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/50 px-4 pt-[88px] sm:pt-[96px] pb-4 animate-modal-backdrop">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col animate-modal-panel max-h-[calc(100vh-104px)] sm:max-h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-black text-gray-900">Certificate Holders</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining · already covered by your committed plan
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-600 transition-all flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Cost banner — fixed below header */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-slate-100 bg-slate-50/70 flex-shrink-0">
          <span className="text-sm text-slate-700 font-semibold">
            {existingCount > 0
              ? `Editing ${existingCount} existing member${existingCount !== 1 ? 's' : ''}${newMembersCount > 0 ? ` + adding ${newMembersCount}` : ''}`
              : `Adding ${holders.length} member${holders.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Group price summary — shown when scoped to a specific upgrade plan */}
        {targetGroup && (
          <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-blue-50/40 flex-shrink-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm font-black text-slate-900">{planShortLabel(targetGroup.plan, targetGroup.multiYearCount)} upgrade</span>
              <span className="text-sm font-black text-slate-900 tabular-nums">${Number(targetGroup.amount || 0).toFixed(2)}</span>
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
              <div><span className="block text-[9px] font-bold uppercase tracking-wide text-slate-500">Price / cert</span>${Number(targetGroup.pricePerCert || 0)}</div>
              <div><span className="block text-[9px] font-bold uppercase tracking-wide text-slate-500">Slots</span>{filledInTarget} / {targetGroup.count} filled</div>
              <div><span className="block text-[9px] font-bold uppercase tracking-wide text-slate-500">Expiry</span>{targetGroup.plan === 'Unlimited Plan' ? 'Never' : (targetGroup.expirationDate ? fmtYMD(targetGroup.expirationDate) : '—')}</div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">These slots are already paid for — fill them with certificate holders below at no extra charge.</p>
          </div>
        )}

        {/* Plan batch selector — assign new holders to a paid upgrade group */}
        {holderGroups.length > 0 && (
          <div className="px-4 sm:px-6 py-2.5 border-b border-slate-100 flex-shrink-0">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Fill into plan</label>
            <select value={targetGroupId} onChange={e => setTargetGroupId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition">
              <option value="">Base plan — {planShortLabel(sub.subscriptionPlan, sub.multiYearCount)} ({baseCommitted} slots)</option>
              {holderGroups.map((g, gi) => (
                <option key={String(g._id || gi)} value={String(g._id)}>
                  {planShortLabel(g.plan, g.multiYearCount)} upgrade ({g.count} slots)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Holder forms */}
        <div className="px-4 sm:px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {holders.map((h, i) => (
            <div key={i} id={`add-holder-card-${i}`} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Member #{i + 1}</span>
                <button onClick={() => removeRow(i)} disabled={holders.length <= 1}
                  title={holders.length <= 1 ? 'At least one holder must remain' : 'Remove this holder'}
                  className="w-6 h-6 flex items-center justify-center rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-25">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Full Name *</label>
                  <input type="text" placeholder="Full legal name" value={h.fullName} data-field="fullName"
                    onChange={e => onChange(i, 'fullName', e.target.value)} className={inp(errors[i]?.fullName)} />
                  {errors[i]?.fullName && <p className="text-red-500 text-xs mt-0.5">{errors[i].fullName}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Date of Birth</label>
                  <input type="date" value={h.dateOfBirth}
                    onChange={e => onChange(i, 'dateOfBirth', e.target.value)} className={inp(errors[i]?.dateOfBirth)} />
                  {errors[i]?.dateOfBirth && <p className="text-red-500 text-xs mt-0.5">{errors[i].dateOfBirth}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Certificate Type *</label>
                  <select value={h.certificateType} data-field="certificateType" onChange={e => onChange(i, 'certificateType', e.target.value)} className={inp(errors[i]?.certificateType) + ' cursor-pointer'}>
                    <option value="">Select…</option>
                    {CERTIFICATE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors[i]?.certificateType && <p className="text-red-500 text-xs mt-0.5">{errors[i].certificateType}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Certificate Status</label>
                  <div className="flex gap-2 pt-1">
                    {['NEW', 'EXISTING'].map(v => (
                      <label key={v} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex-1 justify-center ${h.certificateStatus === v ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-200 text-gray-500 hover:border-gray-400'
                        }`}>
                        <input type="radio" className="hidden" checked={h.certificateStatus === v} onChange={() => onChange(i, 'certificateStatus', v)} />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">FAA Certificate #</label>
                  <input type="text" placeholder="FAA Cert #" value={h.faaCertificateNumber}
                    onChange={e => onChange(i, 'faaCertificateNumber', e.target.value)} className={inp(false)} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">IACRA FTN # *</label>
                  <input type="text" placeholder="FTN-XXXXXXXX" value={h.iacraFtnNumber} data-field="iacraFtnNumber"
                    onChange={e => onChange(i, 'iacraFtnNumber', e.target.value)} className={inp(errors[i]?.iacraFtnNumber)} />
                  {errors[i]?.iacraFtnNumber && <p className="text-red-500 text-xs mt-0.5">{errors[i].iacraFtnNumber}</p>}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Email</label>
                <input type="email" placeholder="member@airline.com" value={h.email}
                  onChange={e => onChange(i, 'email', e.target.value)} className={inp(false)} />
              </div>

              {/* Secondary Certificate Toggle */}
              <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all ${h.hasSecondaryCertificate ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 hover:border-blue-200 bg-white'
                }`}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${h.hasSecondaryCertificate ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                  }`}>
                  {h.hasSecondaryCertificate && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  )}
                </div>
                <input type="checkbox" className="sr-only" checked={h.hasSecondaryCertificate || false}
                  onChange={e => onChange(i, 'hasSecondaryCertificate', e.target.checked)} />
                <span className="text-xs font-semibold text-gray-700">This holder has a secondary FAA certificate</span>
              </label>

              {h.hasSecondaryCertificate && (
                <div className="ml-2 pl-3 border-l-2 border-blue-200 space-y-3 mt-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Secondary Certificate Type *</label>
                    <select value={h.secondaryCertificateType || ''}
                      onChange={e => onChange(i, 'secondaryCertificateType', e.target.value)}
                      className={inp(false) + ' cursor-pointer'}>
                      <option value="">Select…</option>
                      {CERTIFICATE_TYPES.filter(t => t !== h.certificateType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Secondary FAA Cert #</label>
                      <input type="text" placeholder="Secondary FAA Cert #" value={h.secondaryFaaCertificateNumber || ''}
                        onChange={e => onChange(i, 'secondaryFaaCertificateNumber', e.target.value)} className={inp(false)} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Secondary IACRA FTN #</label>
                      <input type="text" placeholder="FTN-XXXXXXXX" value={h.secondaryIacraFtnNumber || ''}
                        onChange={e => onChange(i, 'secondaryIacraFtnNumber', e.target.value)} className={inp(false)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button onClick={addRow} disabled={atLimit}
            className={`w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-all ${atLimit ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400'
              }`}>
            + Add Certificate Holder {atLimit ? `(max ${targetCapacity})` : `(${holders.length}/${targetCapacity})`}
          </button>

          {apiError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{apiError}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 px-4 sm:px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-all">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50"
            style={{ background: '#0000ff' }}
            onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#0000e6' }}
            onMouseLeave={e => e.currentTarget.style.background = '#0000ff'}>
            {submitting ? 'Saving…' : 'Save Holders'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  UpgradeHoldersModal                                                          */
/*  Lets an active airline add more certificate holders (count-based pricing).    */
/* ─────────────────────────────────────────────────────────────────────────── */

// Airline pricing tiers — mirrors ONE_YEAR_PRICES / UNLIMITED_PRICES in airlinesController.js
const AIRLINE_ONE_YEAR_PPC = { '3 to 5': 60, '5 to 10': 55, 'More than 10': 49 }
const AIRLINE_UNLIMITED_PPC = { '3 to 5': 265, '5 to 10': 255, 'More than 10': 245 }

function airlineHolderRange(count) {
  if (count <= 5) return '3 to 5'
  if (count <= 10) return '5 to 10'
  return 'More than 10'
}

function airlineTierPpc(plan, totalCount) {
  const range = airlineHolderRange(totalCount)
  return plan === 'Unlimited Plan' ? AIRLINE_UNLIMITED_PPC[range] : AIRLINE_ONE_YEAR_PPC[range]
}

const HOLDER_PLAN_OPTIONS = [
  { value: '1 Year Subscription Plan', label: '1 Year', short: '1 Year' },
  { value: 'Unlimited Plan', label: 'Unlimited', short: 'Unlimited' },
]

// Short plan label for badges.
function planShortLabel(plan, years) {
  if (plan === 'Multiple Years Subscription Plan') return `Multi-Year${years ? ` ${years}y` : ''}`
  if (plan === 'Unlimited Plan') return 'Unlimited'
  if (plan === '1 Year Subscription Plan') return '1 Year'
  return plan || '—'
}

// Modern plan summary card — dark header strip + clean white body. Shared by the
// base plan and each added holder-upgrade plan on the airline Subscription page.
function PlanCard({
  accent = false, clickable = false, onClick, title, tag, name, amount,
  expired, queued, filled, total, holdersLabel = 'Holders', pricePerCert,
  unlimited, expiry, pct, invoice, note, nextRenewal, canRenew, onRenew,
}) {
  const handleClick = clickable && onClick ? () => onClick() : undefined
  const expiryLabel = unlimited ? 'No expiry' : (expiry ? fmtYMD(expiry) : '—')
  const clampedPct = Math.min(100, Math.max(0, pct))
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } } : undefined}
      title={clickable ? title : undefined}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition ${accent ? 'border-slate-900/10 ring-1 ring-blue-500/20' : 'border-slate-200'} ${clickable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300' : ''}`}
    >
      {/* Dark header strip */}
      <div className={`relative flex items-center justify-between gap-3 px-4 py-3 ${accent ? 'bg-gradient-to-r from-slate-900 to-slate-800' : 'bg-slate-900'}`}>
        <div className="flex items-center gap-2 min-w-0">
          {tag && <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider text-white/90 bg-white/10 border border-white/15 rounded px-1.5 py-0.5">{tag.label}</span>}
          <span className="text-sm font-bold text-white truncate">{name}</span>
        </div>
        <span className="text-sm font-extrabold text-white tabular-nums flex-shrink-0">{amount}</span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-4 py-3">
        {/* Status pills */}
        {(() => {
          const soon = !expired && !queued ? getExpiryStatus(expiry, { unlimited }) : null
          if (!expired && !queued && !soon) return null
          return (
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              {queued && <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Renewed</span>}
              {expired && <span className="text-[9px] font-bold uppercase tracking-wide text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">Expired</span>}
              {soon && <span className={`text-[9px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 ${soon.cls}`}>{soon.label}</span>}
            </div>
          )
        })()}

        {/* Holders + progress */}
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1.5">
          <span>{holdersLabel} <span className="text-slate-950 font-bold">{filled} / {total}</span></span>
          <span className="text-slate-500 font-bold tabular-nums">{clampedPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${filled >= total ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${clampedPct}%` }} />
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-700">
          <span><span className="font-extrabold text-slate-950">${pricePerCert}</span>/cert</span>
          <span className="text-slate-300">·</span>
          <span className={unlimited ? 'text-emerald-600 font-semibold' : (expired ? 'text-amber-600 font-semibold' : 'text-slate-700 font-medium')}>
            {unlimited ? 'No expiry' : `Expires ${expiryLabel}`}
          </span>
        </div>

        {note && <p className="mt-2 text-[10px] text-slate-600 font-medium leading-snug">{note}</p>}

        {/* Queued renewal note */}
        {nextRenewal && (
          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="truncate">{planShortLabel(nextRenewal.plan)} queued — activates {nextRenewal.activationDate ? fmtYMD(nextRenewal.activationDate) : 'at expiry'}</span>
          </div>
        )}

        {/* Spacer pushes footer to bottom for equal-height grid cards */}
        <div className="flex-1" />

        {/* Footer: invoice + renew */}
        {(invoice || (canRenew && onRenew)) && (
          <div className="mt-3 flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
            {invoice
              ? <span className="text-[10px] font-mono text-slate-500 font-medium truncate">Invoice {invoice}</span>
              : <span />}
            {canRenew && onRenew && (
              <button onClick={(e) => { e.stopPropagation(); onRenew() }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-white transition flex-shrink-0">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Renew
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// One compact, nested row for a holder-upgrade plan attached to the base plan.
function AttachedPlanRow({ s, g, active, onManageGroup, onRenewGroup, onConvertGroupUnlimited, highlight = false, onCancelPlan }) {
  const isUnlimited = g.plan === 'Unlimited Plan'
  const filled = (s.certificateHolders || []).filter(h => String(h.holderGroupId || '') === String(g._id)).length
  const gDays = g.expirationDate ? Math.ceil((new Date(g.expirationDate) - new Date()) / 86400000) : null
  const gExpired = !isUnlimited && gDays !== null && gDays <= 0
  const gQueued = !!g.nextRenewal?.paidAt
  const gCanRenew = active && !isUnlimited && !gQueued && gDays !== null && gDays <= 60
  const exp = getExpiryStatus(g.expirationDate, { unlimited: isUnlimited })
  const current = isCurrentBaseGroup(g, s.subscriptionDate)
  const pct = Math.min(100, Math.round((filled / Math.max(1, g.count)) * 100))
  const invNum = String(g.invoiceNumber || '').replace(/^invoice\s+/i, '')
  return (
    <div
      role={onManageGroup ? 'button' : undefined}
      tabIndex={onManageGroup ? 0 : undefined}
      onClick={onManageGroup ? () => onManageGroup(g) : undefined}
      onKeyDown={onManageGroup ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onManageGroup(g) } } : undefined}
      title={onManageGroup ? 'View holders & manage this plan' : undefined}
      className={`rounded-xl border bg-white px-3.5 py-3 transition ${onManageGroup ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm' : ''} ${g.isActive === false ? 'border-slate-300 bg-slate-50 opacity-75' : highlight && gCanRenew ? 'border-blue-400 ring-2 ring-blue-400/40 bg-blue-50/40 shadow-sm' : gExpired ? 'border-red-200' : 'border-slate-200'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-bold text-slate-900">
              {isUnlimited ? 'Lifetime' : 'Upgrade'}
            </span>
            {g.isActive === false && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-200 border border-slate-300 text-[9px] font-bold text-slate-500 uppercase tracking-wide">Inactive</span>}
            {g.cancelled && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-red-100 border border-red-200 text-[9px] font-bold text-red-700 uppercase tracking-wide">Cancellation requested</span>}
            {gQueued && <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Renewed</span>}
            {g.isActive !== false && !gQueued && exp && <span className={`text-[9px] font-bold uppercase tracking-wide ${exp.kind === 'expired' ? 'text-red-500' : 'text-amber-500'}`}>{exp.label}</span>}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">{filled}/{g.count}</span> holders
            <span className="text-slate-300"> · </span>
            <span className="font-semibold text-slate-700">${g.pricePerCert}</span>/cert
            <span className="text-slate-300"> · </span>
            {isUnlimited ? 'No expiry' : (g.expirationDate ? `Expires ${fmtYMD(g.expirationDate)}` : '—')}
          </p>
          <p className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
            <span className={`inline-flex items-center font-semibold ${current ? 'text-slate-400' : 'text-amber-600'}`}>
              {current ? 'Current base period' : 'Previous base period'}
            </span>
            {invNum && <span className="font-mono">Invoice {invNum}</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {gCanRenew && onRenewGroup && (
            <button
              onClick={(e) => { e.stopPropagation(); onRenewGroup(g) }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-white transition"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Renew
            </button>
          )}
          {/* Convert this add-on group → Unlimited (in place). Active, non-Unlimited, not expired, not queued. */}
          {onConvertGroupUnlimited && active && !isUnlimited && !gQueued && !gExpired && (
            <button
              onClick={(e) => { e.stopPropagation(); onConvertGroupUnlimited(g) }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
              To Unlimited
            </button>
          )}
          {onCancelPlan && !g.cancelled && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancelPlan(String(g._id)) }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      {gQueued && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Renewal queued — activates {g.nextRenewal.activationDate ? fmtYMD(g.nextRenewal.activationDate) : 'at expiry'}
        </div>
      )}
    </div>
  )
}

// The base/main plan rendered as a uniform card — same visual language as
// AttachedPlanRow so every plan in the expanded view reads consistently.
function BasePlanRow({ s, active, baseCommitted, onAddHolders, onRenew, onConvertUnlimited, highlight = false, onCancelPlan, wirePending = false }) {
  const baseFilled = (s.certificateHolders || []).filter(h => !h.holderGroupId).length
  const basePpc = Number(s.pricePerCertificate || s.pricePerCert || 0)
  const baseUnlimited = s.subscriptionPlan === 'Unlimited Plan'
  const baseDays = s.expirationDate ? Math.ceil((new Date(s.expirationDate) - new Date()) / 86400000) : null
  const baseExpired = !baseUnlimited && baseDays !== null && baseDays <= 0
  const baseQueued = !!s.nextRenewal?.paidAt
  const baseCanRenew = active && !baseUnlimited && !baseQueued && baseDays !== null && baseDays <= 60
  const baseExp = getExpiryStatus(s.expirationDate, { unlimited: baseUnlimited })
  const invNum = String(s.invoiceNumber || '').replace(/^invoice\s+/i, '')
  const wd = s.wireRequestDetails || {}
  const wireAmt = wirePending && wd.amount ? Number(wd.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : null
  const wireSubmitted = wirePending && s.wirePaymentRequestedAt
    ? new Date(s.wirePaymentRequestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  return (
    <div className={`rounded-xl border bg-white px-3.5 py-3 transition ${wirePending ? 'border-blue-300 ring-2 ring-blue-300/40 bg-blue-50/30' : highlight && baseCanRenew ? 'border-blue-400 ring-2 ring-blue-400/40 bg-blue-50/40 shadow-sm' : baseExpired ? 'border-red-200' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-bold text-slate-900">Base Plan</span>
            {s.status === 'Inactive' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-200 border border-slate-300 text-[9px] font-bold text-slate-600 uppercase tracking-wide">On Hold</span>
            )}
            {s.planCancelled && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 border border-red-200 text-[9px] font-bold text-red-700 uppercase tracking-wide">Cancellation requested</span>
            )}
            {wirePending && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100 border border-blue-200 text-[9px] font-bold text-blue-700 uppercase tracking-wide">
                <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse inline-block" />
                Pending
              </span>
            )}
            {!wirePending && baseQueued && <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Renewed</span>}
            {!wirePending && !baseQueued && baseExpired && <span className="text-[9px] font-bold uppercase tracking-wide text-red-500">Expired</span>}
            {!wirePending && !baseQueued && !baseExpired && baseExp && <span className="text-[9px] font-bold uppercase tracking-wide text-amber-500">{baseExp.label}</span>}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">{baseFilled}/{baseCommitted}</span> holders
            <span className="text-slate-300"> · </span>
            <span className="font-semibold text-slate-700">${basePpc}</span>/cert
            <span className="text-slate-300"> · </span>
            {baseUnlimited ? 'No expiry' : (s.expirationDate ? `Expires ${fmtYMD(s.expirationDate)}` : '—')}
          </p>
          <p className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
            {wirePending
              ? <><span className="font-semibold text-blue-500">Wire transfer under review</span>{wireAmt && <span>{wireAmt}</span>}{wireSubmitted && <span>Submitted {wireSubmitted}</span>}</>
              : <><span className="font-semibold">Main plan — drives holder capacity</span>{invNum && <span className="font-mono">Invoice {invNum}</span>}</>
            }
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {baseCanRenew && onRenew && (
            <button
              onClick={(e) => { e.stopPropagation(); onRenew() }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-white transition"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Renew
            </button>
          )}
          {/* Convert base plan → Unlimited (in place). Available while the base is
              active, not already Unlimited, not expired, not mid-queued-renewal.
              Expired plans must be renewed first (upgrade hidden). */}
          {onConvertUnlimited && active && !baseUnlimited && !baseQueued && !baseExpired && (
            <button
              onClick={(e) => { e.stopPropagation(); onConvertUnlimited() }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
              Convert to Unlimited
            </button>
          )}
          {onAddHolders && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddHolders() }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
            >
              Manage
            </button>
          )}
          {onCancelPlan && !s.planCancelled && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancelPlan('base') }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      {baseQueued && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Renewal queued — activates {s.nextRenewal.activationDate ? fmtYMD(s.nextRenewal.activationDate) : 'at expiry'}
        </div>
      )}
    </div>
  )
}

// Pending wire-transfer request rendered as a uniform plan card — same visual
// language as BasePlanRow / AttachedPlanRow so it reads like a plan awaiting
// approval rather than a banner stuck on the header.
function WirePendingRow({ s }) {
  const wd = s.wireRequestDetails || {}
  const purpose = s.wireRequestPurpose || 'renewal'
  const isHolderUpgrade = purpose === 'holder-upgrade'
  const isConversion = purpose === 'convert-unlimited'
  const isGroupConversion = isConversion && !!wd.holderGroupId
  const plan = wd.plan || s.wireRequestRenewalPlan || s.subscriptionPlan || '—'
  const addCount = wd.additionalHolderCount ?? s.wireRequestAdditionalCount ?? null
  const amt = wd.amount ? Number(wd.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : null
  const submittedAt = s.wirePaymentRequestedAt ? new Date(s.wirePaymentRequestedAt) : null
  const fmtDate = (d) => d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
  const invNum = String(wd.invoiceNumber || s.wireRequestInvoiceNumber || '').replace(/^invoice\s+/i, '')
  const title = isHolderUpgrade ? 'Holder Upgrade' : isConversion ? 'Convert to Unlimited' : 'Renewal'
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/40 px-3.5 py-3 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-bold text-slate-900">
              {title}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100 border border-blue-200 text-[9px] font-bold text-blue-700 uppercase tracking-wide">
              <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse inline-block" />
              Pending
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {isHolderUpgrade
              ? <>+<span className="font-semibold text-slate-700">{addCount != null ? addCount : '?'} holder{addCount !== 1 ? 's' : ''}</span> requested</>
              : isConversion
                ? <><span className="font-semibold text-slate-700">{isGroupConversion ? 'Add-on plan' : 'Base plan'}</span> → <span className="font-semibold text-blue-700">Unlimited</span></>
                : <>Plan <span className="font-semibold text-slate-700">{plan}</span></>
            }
            {amt && <><span className="text-slate-300"> · </span><span className="font-semibold text-slate-700">{amt}</span></>}
          </p>
          <p className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
            <span className="font-semibold">Wire transfer under review</span>
            {submittedAt && <span>Submitted {fmtDate(submittedAt)}</span>}
            {invNum && <span className="font-mono">Invoice {invNum}</span>}
          </p>
        </div>
      </div>
    </div>
  )
}

// Consolidated "current active subscription" — preview header summarises the active
// plan (and how many plans total); expanding reveals every plan (base + attached)
// as uniform detail cards.
function ActiveSubscriptionBlock({ s, active, onAddHolders, onManageGroup, onRenew, onRenewGroup, onCancelPlan, onConvertUnlimited, onConvertGroupUnlimited, onShowCredits, forceExpandKey }) {
  const [expanded, setExpanded] = useState(false)
  const [highlightRenew, setHighlightRenew] = useState(false)
  const [highlightBlock, setHighlightBlock] = useState(false)

  useEffect(() => {
    if (!forceExpandKey) return
    setExpanded(true)
    setHighlightBlock(true)
    const t = setTimeout(() => setHighlightBlock(false), 1500)
    return () => clearTimeout(t)
  }, [forceExpandKey])

  const groups = s.holderGroups || []
  // Wire request scope: an INITIAL request is for the base/existing subscription itself
  // (show its pending status INSIDE the base plan). renewal/holder-upgrade requests are
  // for a NEW additive plan → shown as their own pending row.
  const wirePurpose = s.wirePaymentRequested ? (s.wireRequestPurpose || 'initial') : null
  // Renewal / holder-upgrade / conversion render as their own pending plan card.
  const wireIsAdditive = wirePurpose === 'renewal' || wirePurpose === 'holder-upgrade' || wirePurpose === 'convert-unlimited'
  const baseWirePending = wirePurpose === 'initial'
  const baseCommitted = Math.max(0, Number(s.committedCount || s.holderCountValue || 0) - allGroupSlots(groups))
  const baseFilled = (s.certificateHolders || []).filter(h => !h.holderGroupId).length
  const basePpc = Number(s.pricePerCertificate || s.pricePerCert || 0)
  const baseUnlimited = s.subscriptionPlan === 'Unlimited Plan'
  const baseDays = s.expirationDate ? Math.ceil((new Date(s.expirationDate) - new Date()) / 86400000) : null
  const baseExpired = !baseUnlimited && baseDays !== null && baseDays <= 0
  const baseQueued = !!s.nextRenewal?.paidAt
  const basePct = Math.min(100, Math.round((baseFilled / Math.max(1, baseCommitted)) * 100))
  // Whole-airline totals across every plan (base + all groups) for the preview bar.
  const totalCommitted = Number(s.committedCount || s.holderCountValue || 0)
  const totalFilled = (s.certificateHolders || []).length
  const totalPct = Math.min(100, Math.round((totalFilled / Math.max(1, totalCommitted)) * 100))
  const baseExp = getExpiryStatus(s.expirationDate, { unlimited: baseUnlimited })
  const money2 = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Total across the active subscription = base plan + every still-active upgrade plan.
  const activeGroupsAmount = groups.filter(isActiveHolderGroup).reduce((a, g) => a + Number(g.amount || 0), 0)
  const grandTotal = basePpc * baseCommitted + activeGroupsAmount
  const planCount = 1 + groups.length

  // ── Any plan currently renewable? (expiring ≤60d or expired, not queued) ─────
  // Drives the header Renew shortcut: clicking it expands the card and highlights
  // the plan rows that need renewing (each row carries its own Renew action).
  const baseCanRenew = active && !baseUnlimited && !baseQueued && baseDays !== null && baseDays <= 60
  const anyGroupCanRenew = groups.some((g) => {
    const isU = g.plan === 'Unlimited Plan'
    const gDays = g.expirationDate ? Math.ceil((new Date(g.expirationDate) - new Date()) / 86400000) : null
    const gQueued = !!g.nextRenewal?.paidAt
    return active && !isU && !gQueued && gDays !== null && gDays <= 60
  })
  const hasRenewable = (baseCanRenew && !!onRenew) || (anyGroupCanRenew && !!onRenewGroup)
  const triggerRenew = () => {
    setExpanded(true)
    setHighlightRenew(true)
  }

  const headBadges = (
    <>
      {baseQueued && <span className="text-[9px] font-black uppercase tracking-wide text-white">Renewed</span>}
      {!baseQueued && baseExpired && <span className="text-[9px] font-black uppercase tracking-wide text-red-300">Expired</span>}
      {!baseQueued && !baseExpired && baseExp && <span className="text-[9px] font-black uppercase tracking-wide text-amber-300">{baseExp.label}</span>}
    </>
  )

  return (
    <motion.div layout className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-shadow duration-500 ${highlightBlock ? 'border-blue-400 ring-2 ring-blue-400/40 shadow-blue-100' : 'border-slate-200'}`} transition={{ layout: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } }}>
      {/* ── Preview header — always visible, click to expand/collapse ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(v => { if (v) setHighlightRenew(false); return !v })}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(v => { if (v) setHighlightRenew(false); return !v }) } }}
        className="group cursor-pointer"
      >
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-white">Current Subscription</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {groups.length > 0 && (
                <span className="text-[9px] font-bold uppercase tracking-wide text-white">+{groups.length} more</span>
              )}
              {headBadges}
            </div>
            <p className="mt-1 text-[11px] text-white">
              {planCount} plan{planCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onShowCredits && (
              <button
                onClick={(e) => { e.stopPropagation(); onShowCredits() }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 ring-1 ring-inset ring-white/25 px-2.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm transition"
                title="Unused-time credit on each plan"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Credits
              </button>
            )}
            {hasRenewable && (
              <button
                onClick={(e) => { e.stopPropagation(); triggerRenew() }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 ring-1 ring-inset ring-white/25 px-2.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm transition"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Renewal Due
              </button>
            )}
            <motion.svg
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="w-4 h-4 text-white group-hover:text-white/90 transition-colors"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </motion.svg>
          </div>
        </div>

        {/* Collapsed preview: holder bar + plan chips */}
        <div className="px-4 sm:px-5 py-3">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-slate-500">Holders <span className="font-bold text-slate-900">{totalFilled} / {totalCommitted}</span></span>
            <span className={`font-bold tabular-nums ${totalPct >= 100 ? 'text-emerald-600' : 'text-slate-400'}`}>{totalPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${totalFilled >= totalCommitted ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${totalPct}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
              <span className="font-semibold text-slate-700">Base</span>
              <span className="text-slate-300">·</span>
              <span>{baseCommitted} slot{baseCommitted !== 1 ? 's' : ''}</span>
            </span>
            {groups.map((g, gi) => {
              const isU = g.plan === 'Unlimited Plan'
              const ex = getExpiryStatus(g.expirationDate, { unlimited: isU })
              const isExp = ex?.kind === 'expired'
              const slots = Number(g.count || 0)
              return (
                <span key={String(g._id || gi)} className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-700">{isU ? 'Lifetime' : 'Upgrade'}</span>
                  <span className="text-slate-300">·</span>
                  <span>{slots} slot{slots !== 1 ? 's' : ''}</span>
                  {isExp && <><span className="text-slate-300">·</span><span className="text-red-500 font-medium">expired</span></>}
                  {!isU && !isExp && ex?.kind === 'expiring' && <><span className="text-slate-300">·</span><span className="text-amber-500 font-medium">expiring</span></>}
                </span>
              )
            })}
          </div>
          <div className="mt-2.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-slate-600 transition-colors">
            <span>{expanded ? 'Hide details' : 'View full details'}</span>
          </div>
        </div>
      </div>

      {/* ── Expanded details — every plan as a uniform card ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="border-t border-slate-100 bg-slate-50/40">
              <div className="px-4 sm:px-5 pt-2.5 pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">All plans ({planCount + (wireIsAdditive ? 1 : 0)})</span>
              </div>
              <div className="px-3 sm:px-4 pb-3.5 space-y-2">
                <BasePlanRow s={s} active={active} baseCommitted={baseCommitted} onAddHolders={onAddHolders} onRenew={onRenew} onConvertUnlimited={onConvertUnlimited} highlight={highlightRenew} onCancelPlan={planCount > 1 ? onCancelPlan : null} wirePending={baseWirePending} />
                {groups.map((g, gi) => (
                  <AttachedPlanRow key={String(g._id || gi)} s={s} g={g} active={active} onManageGroup={(a, b) => { onManageGroup(a, b) }} onRenewGroup={onRenewGroup} onConvertGroupUnlimited={onConvertGroupUnlimited} highlight={highlightRenew} onCancelPlan={planCount > 1 ? onCancelPlan : null} />
                ))}
                {wireIsAdditive && <WirePendingRow s={s} />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Individual-side "Current Subscription" block — mirrors the airline
// ActiveSubscriptionBlock but for a single person (no holders/groups). Shows the
// active plan clearly and, when a renewal is queued, the upcoming plan below it.
function IndividualSubscriptionBlock({ s, active, onUpgrade, onShowCredits, onRenew, onEditCert, forceExpandKey }) {
  const [expanded, setExpanded] = useState(false)
  const [highlightBlock, setHighlightBlock] = useState(false)
  useEffect(() => {
    if (!forceExpandKey) return
    setExpanded(true)
    setHighlightBlock(true)
    const t = setTimeout(() => setHighlightBlock(false), 1500)
    return () => clearTimeout(t)
  }, [forceExpandKey])
  const money2 = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const unlimited = s.subscriptionPlan === 'Unlimited Plan'
  const exp = getExpiryStatus(s.expirationDate, { unlimited })
  const days = s.expirationDate ? Math.ceil((new Date(s.expirationDate) - new Date()) / 86400000) : null
  const expired = active && !unlimited && days !== null && days <= 0
  const nr = s.nextRenewal
  const queued = !!(nr?.paidAt && nr.activationDate && new Date(nr.activationDate) > new Date())
  // Upgrade available while the plan is active, not already Unlimited, not expired,
  // and no renewal already queued. ConvertToUnlimitedModal lets the individual move
  // to Multi-Year or Unlimited, crediting the unused portion of the current term.
  const canUpgrade = active && !unlimited && !expired && !queued
  // Renew once within 60 days of expiry (or already expired), not Unlimited, none queued.
  const canRenew = active && !unlimited && !queued && days !== null && days <= 60
  const planLabel = planShortLabel(s.subscriptionPlan, s.multiYearCount)
  const queuedLabel = queued ? planShortLabel(nr.plan, nr.multiYearCount) : ''
  const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

  const headBadge = queued
    ? <span className="text-[9px] font-black uppercase tracking-wide text-emerald-300">Renewed</span>
    : expired
      ? <span className="text-[9px] font-black uppercase tracking-wide text-red-300">Expired</span>
      : exp ? <span className="text-[9px] font-black uppercase tracking-wide text-amber-300">{exp.label}</span> : null

  return (
    <motion.div layout className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-shadow duration-500 ${highlightBlock ? 'border-blue-400 ring-2 ring-blue-400/40 shadow-blue-100' : 'border-slate-200'}`} transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(v => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(v => !v) } }}
        className="group cursor-pointer"
      >
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-white">Current Subscription</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm font-extrabold text-white">{planLabel}</span>
              {headBadge}
            </div>
            <p className="mt-1 text-[11px] text-white/80">{money2(s.price)}{!unlimited && s.expirationDate ? ` · expires ${fmtD(s.expirationDate)}` : unlimited ? ' · No expiry' : ''}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canRenew && onRenew && (
              <button
                onClick={(e) => { e.stopPropagation(); onRenew() }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 ring-1 ring-inset ring-white/25 px-2.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm transition"
                title="Renew this plan"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Renew
              </button>
            )}
            {onShowCredits && (
              <button
                onClick={(e) => { e.stopPropagation(); onShowCredits() }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 ring-1 ring-inset ring-white/25 px-2.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm transition"
                title="Unused-time credit applied toward an upgrade"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Credits
              </button>
            )}
            <motion.svg
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="w-4 h-4 text-white"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </motion.svg>
          </div>
        </div>

        {queued && (
          <div className="px-4 sm:px-5 py-2.5 bg-emerald-50 border-b border-emerald-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Upcoming Plan · Queued</p>
            <p className="mt-0.5 text-[11px] text-emerald-800 font-semibold">
              {queuedLabel}{nr.price != null ? ` · ${money2(nr.price)}` : ''} · activates {fmtD(nr.activationDate)}
            </p>
          </div>
        )}

        <div className="px-4 sm:px-5 py-2.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-slate-600 transition-colors">
          <span>{expanded ? 'Hide details' : 'View full details'}</span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 py-4 space-y-3 border-t border-slate-100">
              {/* Active plan card — click to edit certificate details */}
              <div
                role={onEditCert ? 'button' : undefined}
                tabIndex={onEditCert ? 0 : undefined}
                onClick={onEditCert ? (e) => { e.stopPropagation(); onEditCert() } : undefined}
                onKeyDown={onEditCert ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onEditCert() } } : undefined}
                className={`rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 ${onEditCert ? 'cursor-pointer hover:border-slate-300 hover:bg-slate-100/70 transition' : ''}`}
                title={onEditCert ? 'Edit your certificate details' : undefined}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white bg-slate-900 rounded-full px-2 py-0.5">Active Plan</span>
                  <div className="flex items-center gap-2">
                    {headBadge && <span className="text-[9px] font-black uppercase tracking-wide text-slate-600">{queued ? 'Renewed' : expired ? 'Expired' : exp?.label}</span>}
                    {onEditCert && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" /></svg>
                        Edit
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-extrabold text-slate-900">{planLabel}</p>
                  {canUpgrade && onUpgrade && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onUpgrade() }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition flex-shrink-0"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
                      Upgrade Plan
                    </button>
                  )}
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
                  <span>Price · <span className="font-bold text-slate-900">{money2(s.price)}</span></span>
                  <span>{unlimited ? 'Expiry · Never' : `Expires · ${fmtD(s.expirationDate)}`}</span>
                  <span>Start · {s.subscriptionDate ? fmtD(s.subscriptionDate) : '—'}</span>
                  {s.invoiceNumber && <span className="truncate">Invoice · {String(s.invoiceNumber).replace(/^Invoice\s+/i, '')}</span>}
                </div>
              </div>

              {/* Queued plan card */}
              {queued && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white bg-emerald-600 rounded-full px-2 py-0.5">Queued Plan</span>
                    <span className="text-[9px] font-black uppercase tracking-wide text-emerald-700">Activates {fmtD(nr.activationDate)}</span>
                  </div>
                  <p className="mt-2 text-sm font-extrabold text-slate-900">{queuedLabel}</p>
                  <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
                    {nr.price != null && <span>Price · <span className="font-bold text-slate-900">{money2(nr.price)}</span></span>}
                    {nr.expiresAt && <span>New expiry · {fmtD(nr.expiresAt)}</span>}
                  </div>
                  <p className="mt-2 text-[10px] text-emerald-700">This plan starts automatically when your current plan ends.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Resolve which plan a certificate holder is on. Holders in a holderGroup use the
// group's plan/expiry; otherwise they fall back to the airline's base plan.
function holderPlanInfo(h, sub) {
  const groups = sub.holderGroups || []
  if (h.holderGroupId) {
    const g = groups.find(grp => String(grp._id) === String(h.holderGroupId))
    if (g) return { label: planShortLabel(g.plan, g.multiYearCount), isGroup: true, expiry: g.expirationDate }
  }
  return { label: planShortLabel(sub.subscriptionPlan, sub.multiYearCount), isGroup: false, expiry: sub.expirationDate }
}

// ─── Payment method chooser (airlines) — Card vs Wire Transfer ────────────────
// Shown before any airline payment (renewal / holder expansion). Card continues
// to the Stripe modal as before; Wire submits an invoice request carrying the
// full requested change — admin approves (activates exactly what was requested)
// or declines it.
function PaymentMethodStep({ amountLabel, summary, onCard, onWire, onBack, submitting, error }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-modal-backdrop">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={submitting ? undefined : onBack} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-modal-panel">
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1">Choose Payment Method</p>
            <h3 className="text-lg font-black text-slate-900">How would you like to pay?</h3>
            {summary && <p className="text-xs text-slate-500 mt-1">{summary}</p>}
          </div>
          <button onClick={onBack} disabled={submitting}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-600 flex items-center justify-center transition flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-semibold">{error}</div>}

          <button onClick={onCard} disabled={submitting}
            className="w-full text-left rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 px-4 py-3.5 transition group disabled:opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h2m4 0h2M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-900">Credit / Debit Card</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Pay {amountLabel} now — activates instantly.</p>
              </div>
              <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>

          <button onClick={onWire} disabled={submitting}
            className="w-full text-left rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 px-4 py-3.5 transition group disabled:opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-900">{submitting ? 'Sending request…' : 'Wire Transfer'}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Request an invoice for {amountLabel} — admin reviews and activates your requested plan on approval.</p>
              </div>
              <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// Wire request submitted — confirmation with bank details (mirrors registration Step 4).
function WireRequestSentView({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-modal-backdrop">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-modal-panel">
        <div className="flex flex-col items-center justify-center px-6 py-9 text-center">
          <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 mb-5">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 mb-2">Request Sent to Admin</p>
          <h3 className="text-xl font-black text-slate-900 mb-2">Wire Request Submitted!</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-xs leading-relaxed">Our team will review your request. Once approved, your requested plan activates automatically.</p>
          <div className="w-full max-w-xs rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 mb-6 text-left space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3">Bank Details for Wire Transfer</p>
            {[['Bank', 'Banque Revolut Bank UAB'], ['Account Owner', 'International Flight Operations Academy GmbH'], ['BIC', 'REVOLT21'], ['Intermediary BIC', 'CHASGB2L'], ['Account #', 'LT04 3250 0415 2968 6697']].map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-slate-400 font-medium whitespace-nowrap">{k}</span>
                <span className="font-bold text-slate-800 text-right">{v}</span>
              </div>
            ))}
          </div>
          <button type="button" onClick={onClose}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-blue-200">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function UpgradeHoldersModal({ sub, token, onClose, onSaved }) {
  // "Current slots" = holders already covered by EVERY currently-active plan (base if
  // live + all active add-ons). Added holders stack on top, so the tier reads at
  // currentCount + additionalCount. SINGLE SOURCE activeCoverageAnchor — same anchor
  // the backend charges with, so the displayed price equals what's billed.
  const currentCount = activeCoverageAnchor(sub, {})
  // Min holders to add: when active coverage already exists the airline 3-holder floor
  // is met, so an upgrade can be as small as 1. With NO active coverage (every plan
  // expired) this batch stands alone and must meet the 3-holder floor itself.
  const minAdditional = currentCount > 0 ? 1 : 3

  const [additionalCount, setAdditionalCount] = useState(minAdditional)
  // Plan this batch of holders will be on (independent of the base plan).
  // Airlines only offer 1 Year / Unlimited — default to a valid option.
  const [batchPlan, setBatchPlan] = useState(
    HOLDER_PLAN_OPTIONS.some(o => o.value === sub.subscriptionPlan) ? sub.subscriptionPlan : '1 Year Subscription Plan'
  )
  const [batchYears, setBatchYears] = useState(2) // for Multi-Year
  const [showPayment, setShowPayment] = useState(false)
  // Payment-method chooser (Card vs Wire) + wire request lifecycle.
  const [showMethodStep, setShowMethodStep] = useState(false)
  const [wireSubmitting, setWireSubmitting] = useState(false)
  const [wireSent, setWireSent] = useState(false)
  const [wireErr, setWireErr] = useState('')
  // '' = create a separate independent plan (default). 'base' or a group _id = merge
  // the added holders into that existing plan (they adopt its expiry).
  const [mergeTarget, setMergeTarget] = useState('')

  const isMultiYear = batchPlan === 'Multiple Years Subscription Plan'

  // Existing plans the added holders can merge INTO — must be the same plan type.
  const mergeTargets = useMemo(() => {
    const list = []
    if (sub.subscriptionPlan === batchPlan)
      list.push({ id: 'base', label: `Base plan — ${planShortLabel(sub.subscriptionPlan, sub.multiYearCount)}`, expiry: sub.expirationDate })
        ; (sub.holderGroups || []).forEach((g) => {
          if (g.plan === batchPlan)
            list.push({ id: String(g._id), label: `${planShortLabel(g.plan, g.multiYearCount)} plan`, expiry: g.expirationDate })
        })
    return list
  }, [sub, batchPlan])

  // Reset the merge choice whenever the plan changes (eligibility changes).
  useEffect(() => { setMergeTarget('') }, [batchPlan])

  const mergeExpiry = mergeTarget
    ? (mergeTargets.find(t => t.id === mergeTarget)?.expiry || null)
    : null

  // Tier-based ppc: derived from NEW total count (currentCount + additionalCount)
  const totalCount = currentCount + additionalCount
  const newPpc = airlineTierPpc(batchPlan, totalCount)
  const currentPpc = airlineTierPpc(sub.subscriptionPlan, currentCount) // base-plan rate (display)
  // Tier comparison must stay within the SAME (batch) plan — otherwise a plan
  // switch (e.g. 1 Year → Unlimited) falsely reads as a tier change.
  const batchPpcAtCurrent = airlineTierPpc(batchPlan, currentCount)
  const tierChanged = newPpc !== batchPpcAtCurrent

  const yearsMult = isMultiYear ? Math.max(2, batchYears) : 1
  const dueAmount = Math.round(newPpc * additionalCount * yearsMult * 100) / 100

  const dueLabel = isMultiYear
    ? `$${newPpc}/cert x ${additionalCount} holder${additionalCount !== 1 ? 's' : ''} x ${yearsMult} yrs`
    : `$${newPpc}/cert x ${additionalCount} holder${additionalCount !== 1 ? 's' : ''}`
  const expectedCommittedCount = totalCount
  const expectedPpc = newPpc

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
    }
  }, [])

  const forceUnlockScroll = () => {
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  const fetchLatestUpgradeState = async (fallback) => {
    if (!token) return fallback

    let latest = fallback
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const fresh = await API.get(`/airlines/${sub._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const doc = fresh?.data?.data
        if (doc?._id) {
          latest = doc
          const committedNow = Number(doc.committedCount || doc.holderCountValue || 0)
          const ppcNow = Number(doc.pricePerCertificate || doc.pricePerCert || 0)
          if (committedNow >= expectedCommittedCount && ppcNow === expectedPpc) {
            break
          }
        }
      } catch { void 0 }
      if (attempt < 4) await sleep(700)
    }
    return latest
  }

  // ── Wire request: send the FULL requested holder expansion to admin ──────────
  const submitWireRequest = async () => {
    setWireSubmitting(true); setWireErr('')
    try {
      await API.patch(`/airlines/${sub._id}/request-invoice`, {
        purpose: 'holder-upgrade',
        additionalHolderCount: additionalCount,
        details: {
          plan: batchPlan,
          multiYearCount: isMultiYear ? Math.max(2, batchYears) : null,
          additionalHolderCount: additionalCount,
          mergeTarget: mergeTarget || null,
          amount: dueAmount,
        },
      })
      setWireSent(true)
    } catch (e) {
      setWireErr(e?.response?.data?.message || 'Could not send the wire request. Please try again.')
    } finally {
      setWireSubmitting(false)
    }
  }

  if (wireSent) {
    return (
      <WireRequestSentView onClose={() => {
        forceUnlockScroll()
        window.dispatchEvent(new Event('ifoa-subscription-refresh'))
        onClose()
      }} />
    )
  }

  if (showMethodStep) {
    return (
      <PaymentMethodStep
        amountLabel={`$${dueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        summary={`Expand holders — +${additionalCount} on ${planShortLabel(batchPlan, isMultiYear ? batchYears : null)}`}
        submitting={wireSubmitting}
        error={wireErr}
        onBack={() => { setWireErr(''); setShowMethodStep(false) }}
        onCard={() => { setShowMethodStep(false); setShowPayment(true) }}
        onWire={submitWireRequest}
      />
    )
  }

  if (showPayment) {
    return (
      <PaymentModal
        registrationId={sub._id}
        registrationModel="Airlines"
        amount={Math.round(dueAmount * 100)}
        subscriptionData={sub}
        purpose="holder-upgrade"
        additionalHolderCount={additionalCount}
        newSubscriptionPlan={batchPlan}
        renewalMultiYearCount={isMultiYear ? yearsMult : undefined}
        mergeTarget={mergeTarget || undefined}
        onClose={() => {
          setShowPayment(false)
          forceUnlockScroll()
          onClose()
        }}
        onSuccess={async (inv, updatedReg) => {
          const latest = await fetchLatestUpgradeState(updatedReg || sub)
          await Promise.resolve(onSaved(latest))
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[88px] sm:pt-[96px] pb-4 animate-modal-backdrop">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-modal-panel flex flex-col max-h-[calc(100vh-104px)] sm:max-h-[calc(100vh-120px)]">

        {/* Accent bar */}
        <div className="h-0.5 w-full bg-slate-200 flex-shrink-0" />

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-start justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Certificate Holders</p>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Expand Holder Count</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-600 hover:bg-slate-100 transition mt-0.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="px-5 pb-4 space-y-3.5 overflow-y-auto flex-1 min-h-0">

          {/* Current snapshot */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Current Slots</p>
              <p className="text-2xl font-black text-slate-900">{currentCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Current Rate</p>
              <p className="text-2xl font-black text-slate-900">${currentPpc}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">per certificate</p>
            </div>
          </div>

          {/* Plan picker — this batch of holders gets its own plan */}
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 space-y-2.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Plan for these holders</p>
            <div className="grid grid-cols-2 gap-2">
              {HOLDER_PLAN_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBatchPlan(opt.value)}
                  className={`rounded-lg border px-2 py-2 text-xs font-bold transition ${batchPlan === opt.value
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                >{opt.short}</button>
              ))}
            </div>
            {isMultiYear && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                <span className="text-xs font-semibold text-slate-500">Years</span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setBatchYears(y => Math.max(2, y - 1))}
                    className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center transition">−</button>
                  <span className="text-lg font-black text-slate-900 w-6 text-center">{yearsMult}</span>
                  <button type="button" onClick={() => setBatchYears(y => y + 1)}
                    className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center transition">+</button>
                </div>
              </div>
            )}
          </div>

          {/* Merge vs separate — only when an existing plan of the same type exists */}
          {mergeTargets.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Attach these holders to</p>
              <label className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition ${mergeTarget === '' ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" className="mt-0.5 accent-blue-600" checked={mergeTarget === ''} onChange={() => setMergeTarget('')} />
                <span>
                  <span className="block text-xs font-bold text-slate-800">New separate plan</span>
                  <span className="block text-[10px] text-slate-500">Independent — full-length term starting today, its own expiry.</span>
                </span>
              </label>
              {mergeTargets.map((t) => (
                <label key={t.id} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition ${mergeTarget === t.id ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" className="mt-0.5 accent-blue-600" checked={mergeTarget === t.id} onChange={() => setMergeTarget(t.id)} />
                  <span>
                    <span className="block text-xs font-bold text-slate-800">Merge into {t.label}</span>
                    <span className="block text-[10px] text-slate-500">
                      Shares that plan's dates{t.expiry ? ` — expires ${fmtYMD(t.expiry)}` : (batchPlan === 'Unlimited Plan' ? ' — no expiry' : '')}. Separate invoice.
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Selector */}
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Holders to Add</p>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setAdditionalCount(c => Math.max(minAdditional, c - 1))}
                className="w-9 h-9 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-lg flex items-center justify-center transition"
              >−</button>
              <div className="text-center">
                <span className="text-3xl font-black text-slate-900 leading-none">{additionalCount}</span>
                <p className="text-[10px] text-slate-500 mt-0.5">holders</p>
              </div>
              <button
                type="button"
                onClick={() => setAdditionalCount(c => c + 1)}
                className="w-9 h-9 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-lg flex items-center justify-center transition"
              >+</button>
            </div>
            <div className="border-t border-slate-100 pt-2.5 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">New total</span>
                <span className="font-bold text-slate-800">{totalCount} holders</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">New rate</span>
                <span className="font-bold text-slate-800">
                  ${newPpc}/cert
                  {tierChanged && <span className="ml-1.5 text-[9px] font-black text-emerald-600 uppercase tracking-wider">Tier updated</span>}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 pt-0.5">Minimum {minAdditional} holder{minAdditional !== 1 ? 's' : ''} per upgrade</p>
            </div>
          </div>

          {/* Amount due */}
          <div className="rounded-xl bg-slate-900 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white">Amount Due</p>
              <p className="text-[10px] text-white/70 mt-0.5 leading-none">{dueLabel}</p>
            </div>
            <span className="text-xl font-black text-white">${dueAmount.toFixed(2)}</span>
          </div>

        </div>

        {/* Sticky Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex-shrink-0 flex gap-2.5">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button onClick={() => setShowMethodStep(true)}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold text-white transition"
            style={{ background: '#0000ff' }}>
            Proceed to Payment →
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  CancelPlanModal — airline permanently deletes one of its plans               */
/*  Flow: (optional) move holders to an active plan → confirm → confirm again    */
/* ─────────────────────────────────────────────────────────────────────────── */
function CancelPlanModal({ sub, planRef, role, token, onClose, onDone }) {
  const isAirline = role === 'airline'
  const isBase = planRef === 'base'
  const grp = isBase ? null : (sub.holderGroups || []).find(g => String(g._id) === String(planRef))
  const planLabel = isBase
    ? `Base Plan — ${planShortLabel(sub.subscriptionPlan, sub.multiYearCount)}`
    : `${grp?.plan === 'Unlimited Plan' ? 'Lifetime' : 'Upgrade'} — ${planShortLabel(grp?.plan, grp?.multiYearCount)}`
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => {
    document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden'
    return () => { document.body.style.overflow = ''; document.documentElement.style.overflow = '' }
  }, [])
  const doCancel = async () => {
    setBusy(true); setErr('')
    try {
      const url = isAirline ? `/airlines/${sub._id}/cancel-plan` : `/individuals/${sub._id}/cancel-plan`
      const res = await API.post(url, { planRef }, { headers: { Authorization: `Bearer ${token}` } })
      onDone(res.data?.data)
    } catch (e) {
      setErr(e?.response?.data?.message || 'Could not request cancellation.')
      setBusy(false)
    }
  }
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[88px] sm:pt-[96px] pb-4">
        <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }}
          className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Cancel Plan</p>
              <p className="text-sm font-extrabold text-slate-900 truncate">{planLabel}</p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            {err && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{err}</div>}
            <p className="text-xs text-slate-600">
              This sends a <strong className="text-slate-900">cancellation request</strong> to the admin. Your plan stays
              active and nothing is deleted until the admin reviews it — they may keep, edit, or remove it.
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[11px] text-slate-600">
              Requesting cancellation of: <strong className="text-slate-800">{planLabel}</strong>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button onClick={onClose} disabled={busy} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">Keep plan</button>
            <button onClick={doCancel} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-3.5 py-2 text-[12px] font-bold text-white transition disabled:opacity-60">
              {busy ? 'Requesting…' : 'Request cancellation'}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  )
}

// (legacy hard-cancel modal with holder-move — retained, not rendered)
function _LegacyCancelPlanModal({ sub, planRef, token, onClose, onDone }) {
  const groups = sub.holderGroups || []
  const isBase = planRef === 'base'
  const grp = isBase ? null : groups.find(g => String(g._id) === String(planRef))
  const planLabel = isBase
    ? `Base Plan — ${planShortLabel(sub.subscriptionPlan, sub.multiYearCount)}`
    : `${grp?.plan === 'Unlimited Plan' ? 'Lifetime' : 'Upgrade'} — ${planShortLabel(grp?.plan, grp?.multiYearCount)}`

  const planHolders = (sub.certificateHolders || []).filter(h =>
    isBase ? !h.holderGroupId : String(h.holderGroupId || '') === String(planRef))
  const hasHolders = planHolders.length > 0

  const baseActive = (sub.isPaid || sub.status === 'Active') &&
    (sub.subscriptionPlan === 'Unlimited Plan' || !sub.expirationDate || new Date(sub.expirationDate) > new Date())

  // Move targets = currently-active plans other than the one being cancelled.
  const targets = []
  if (!isBase && baseActive) targets.push({ ref: 'base', label: `Base Plan — ${planShortLabel(sub.subscriptionPlan, sub.multiYearCount)}` })
  groups.forEach(g => {
    if (String(g._id) === String(planRef)) return
    if (!isActiveHolderGroup(g)) return
    targets.push({ ref: String(g._id), label: `${g.plan === 'Unlimited Plan' ? 'Lifetime' : 'Upgrade'} — ${planShortLabel(g.plan, g.multiYearCount)}` })
  })

  // Free slots on a target = its fixed capacity − holders already on it.
  const targetFreeFor = (ref) => {
    if (!ref) return 0
    if (ref === 'base') {
      const baseOwn = Math.max(0, Number(sub.committedCount || sub.holderCountValue || 0) - allGroupSlots(groups))
      const filled = (sub.certificateHolders || []).filter(h => !h.holderGroupId).length
      return Math.max(0, baseOwn - filled)
    }
    const g = groups.find(x => String(x._id) === String(ref))
    if (!g) return 0
    const filled = (sub.certificateHolders || []).filter(h => String(h.holderGroupId || '') === String(ref)).length
    return Math.max(0, Number(g.count || 0) - filled)
  }

  const holderName = (h) => h.fullName || h.faaCertificateNumber || h.email || 'Holder'

  const [step, setStep] = useState(hasHolders && targets.length ? 'holders' : 'confirm1')
  const [holderTarget, setHolderTarget] = useState('') // '' = delete holders with the plan
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  const chosenFree = holderTarget ? targetFreeFor(holderTarget) : 0
  const needsSelection = !!holderTarget && planHolders.length > chosenFree

  // When the target changes, pre-select the first `free` holders (the rest would be removed).
  const pickTarget = (ref) => {
    setHolderTarget(ref)
    const free = ref ? targetFreeFor(ref) : 0
    setSelectedIds(new Set(planHolders.slice(0, free).map(h => String(h._id))))
  }
  const toggleHolder = (hid) => setSelectedIds(prev => {
    const n = new Set(prev)
    if (n.has(hid)) n.delete(hid)
    else if (n.size < chosenFree) n.add(hid)
    return n
  })

  const movedCount = holderTarget ? (needsSelection ? selectedIds.size : planHolders.length) : 0
  const removedCount = planHolders.length - movedCount
  const targetLabel = targets.find(t => t.ref === holderTarget)?.label

  const holderActionLabel = holderTarget
    ? `Move ${movedCount} holder${movedCount !== 1 ? 's' : ''} to “${targetLabel}”${removedCount > 0 ? `, remove ${removedCount}` : ''}`
    : hasHolders
      ? `Permanently remove ${planHolders.length} holder${planHolders.length !== 1 ? 's' : ''} with this plan`
      : 'No holders on this plan'

  const doCancel = async () => {
    setBusy(true); setErr('')
    try {
      const moveHolderIds = holderTarget ? [...selectedIds] : null
      const res = await API.post(`/airlines/${sub._id}/cancel-plan`,
        { planRef, holderTarget: holderTarget || null, moveHolderIds },
        { headers: { Authorization: `Bearer ${token}` } })
      onDone(res.data?.data)
    } catch (e) {
      setErr(e?.response?.data?.message || 'Could not cancel the plan.')
      setBusy(false)
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[88px] sm:pt-[96px] pb-4">
        <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }}
          className="w-full max-w-md max-h-[calc(100vh-104px)] sm:max-h-[calc(100vh-120px)] overflow-y-auto rounded-2xl bg-white shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Cancel Plan</p>
              <p className="text-sm font-extrabold text-slate-900 truncate">{planLabel}</p>
            </div>
          </div>

          <div className="px-5 py-4 space-y-3">
            {step === 'holders' && (
              <>
                <p className="text-xs text-slate-600">
                  This plan has <strong className="text-slate-900">{planHolders.length} holder{planHolders.length !== 1 ? 's' : ''}</strong>.
                  Move them to another active plan so they keep coverage, or remove them with the plan.
                </p>
                <div className="space-y-1.5">
                  {targets.map(t => {
                    const free = targetFreeFor(t.ref)
                    return (
                      <label key={t.ref} className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition ${holderTarget === t.ref ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'}`}>
                        <span className="flex items-center gap-2.5 min-w-0">
                          <input type="radio" className="accent-blue-600" checked={holderTarget === t.ref} onChange={() => pickTarget(t.ref)} />
                          <span className="text-xs font-semibold text-slate-800 truncate">{t.label}</span>
                        </span>
                        <span className={`text-[10px] font-bold flex-shrink-0 ${free >= planHolders.length ? 'text-emerald-600' : 'text-amber-600'}`}>{free} free</span>
                      </label>
                    )
                  })}
                  <label className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition ${holderTarget === '' ? 'border-red-400 bg-red-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" className="accent-red-600" checked={holderTarget === ''} onChange={() => pickTarget('')} />
                    <span className="text-xs font-semibold text-slate-800">Remove the holders with this plan</span>
                  </label>
                </div>
                {needsSelection && (
                  <p className="text-[11px] font-semibold text-amber-700">
                    “{targetLabel}” has only {chosenFree} free slot{chosenFree !== 1 ? 's' : ''} — you'll choose which {chosenFree} of {planHolders.length} holders to move next.
                  </p>
                )}
              </>
            )}

            {step === 'select' && (
              <>
                <p className="text-xs text-slate-600">
                  Select up to <strong className="text-slate-900">{chosenFree}</strong> holder{chosenFree !== 1 ? 's' : ''} to move to “{targetLabel}”.
                  The <strong className="text-red-600">{removedCount}</strong> not selected will be permanently removed.
                </p>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {planHolders.map(h => {
                    const hid = String(h._id)
                    const checked = selectedIds.has(hid)
                    const disabled = !checked && selectedIds.size >= chosenFree
                    return (
                      <label key={hid} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition ${checked ? 'border-blue-500 bg-blue-50/60' : disabled ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed' : 'border-slate-200 hover:border-slate-300 cursor-pointer'}`}>
                        <input type="checkbox" className="accent-blue-600" checked={checked} disabled={disabled} onChange={() => toggleHolder(hid)} />
                        <span className="text-xs font-semibold text-slate-800 truncate">{holderName(h)}</span>
                      </label>
                    )
                  })}
                </div>
                <p className="text-[11px] text-slate-500">{selectedIds.size}/{chosenFree} selected to move · {removedCount} to remove</p>
              </>
            )}

            {step === 'confirm1' && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3">
                <p className="text-xs font-bold text-amber-800">Cancel this plan?</p>
                <p className="mt-1 text-[11px] text-amber-700">The plan will be permanently deleted. {holderActionLabel}.</p>
              </div>
            )}

            {step === 'confirm2' && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-3">
                <p className="text-xs font-bold text-red-700">This cannot be undone.</p>
                <p className="mt-1 text-[11px] text-red-600">Permanently delete <strong>{planLabel}</strong>? {holderActionLabel}.</p>
              </div>
            )}

            {err && <p className="text-[11px] font-semibold text-red-600">{err}</p>}
          </div>

          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex gap-2.5">
            <button
              onClick={() => {
                if (busy) return
                if (step === 'confirm2') return setStep('confirm1')
                if (step === 'confirm1') {
                  if (needsSelection) return setStep('select')
                  if (hasHolders && targets.length) return setStep('holders')
                  return onClose()
                }
                if (step === 'select') return setStep('holders')
                onClose()
              }}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
              {step === 'holders' ? 'Cancel' : 'Back'}
            </button>
            {step !== 'confirm2' ? (
              <button onClick={() => setStep(
                step === 'holders' ? (needsSelection ? 'select' : 'confirm1')
                  : step === 'select' ? 'confirm1'
                    : 'confirm2')}
                className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 py-2 text-sm font-bold text-white transition">
                Continue
              </button>
            ) : (
              <button onClick={doCancel} disabled={busy}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 py-2 text-sm font-bold text-white transition">
                {busy ? 'Deleting…' : 'Delete permanently'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  CreditsModal — per-plan unused-time credit (value toward an upgrade)         */
/* ─────────────────────────────────────────────────────────────────────────── */
function CreditsModal({ sub, role, token, onClose }) {
  const [loading, setLoading] = useState(true)
  const [credits, setCredits] = useState([])
  const [totalCredit, setTotalCredit] = useState(0)
  const [err, setErr] = useState('')
  const model = role === 'airline' ? 'Airlines' : 'Individual'
  const upgradeTargets = role === 'airline' ? 'Unlimited' : 'Multi-Year or Unlimited'
  useEffect(() => {
    document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden'
    return () => { document.body.style.overflow = ''; document.documentElement.style.overflow = '' }
  }, [])
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await axios.get(`${BASE_URL}/payments/credits/${sub._id}`, {
          params: { model }, headers: { Authorization: `Bearer ${token}` },
        })
        if (!alive) return
        setCredits(r.data?.credits || [])
        setTotalCredit(r.data?.totalCredit || 0)
      } catch (e) {
        if (alive) setErr(e?.response?.data?.message || 'Could not load credits.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
    // Refetch when the plan/term changes, not just the id.
  }, [sub._id, sub.subscriptionDate, sub.expirationDate, sub.subscriptionPlan, sub.pricePerCertificate, sub.price]) // eslint-disable-line react-hooks/exhaustive-deps
  const money = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const planLbl = (p) => p === 'Unlimited Plan' ? 'Unlimited' : p === 'Multiple Years Subscription Plan' ? 'Multi-Year' : '1 Year'

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[88px] sm:pt-[96px] pb-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Plan Credits</p>
            <p className="text-sm font-extrabold text-slate-900">Unused-time credit</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center">✕</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-[11px] text-slate-500">
            Each active plan earns credit for the time you have not used yet. This credit is applied automatically when you upgrade the plan to {upgradeTargets}.
          </p>
          {loading && <p className="text-sm text-slate-400 py-6 text-center">Loading…</p>}
          {err && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{err}</div>}
          {!loading && !err && credits.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-6 text-center text-sm text-slate-500">
              No credits available — plans are Unlimited or already expired.
            </div>
          )}
          {!loading && !err && credits.map((c) => (
            <div key={c.ref} className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-slate-900">{c.label} <span className="text-slate-400 font-medium">· {planLbl(c.plan)}</span></p>
                  <p className="mt-0.5 text-[10px] text-slate-400">Expires {fmtD(c.expiresAt)} · paid {money(c.currentTotal)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-extrabold ${c.credit > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{money(c.credit)}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">credit</p>
                </div>
              </div>
            </div>
          ))}
          {!loading && !err && credits.length > 0 && (
            <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
              <span className="text-[12px] font-bold text-slate-700">Total credit</span>
              <span className="text-base font-black text-emerald-600">{money(totalCredit)}</span>
            </div>
          )}
        </div>
        <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-slate-900 hover:bg-slate-800 px-4 py-2 text-[12px] font-bold text-white transition">Close</button>
        </div>
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  CertificateEditModal — focused edit of the holder's certificate details      */
/* ─────────────────────────────────────────────────────────────────────────── */
function CertificateEditModal({ sub, onClose, onSaved }) {
  const [form, setForm] = useState({
    primaryAirmanCertificate:      sub.primaryAirmanCertificate || '',
    primaryCertificate:            sub.primaryCertificate || '',
    faaCertificateNumber:          sub.faaCertificateNumber || '',
    iacraTrackingNumber:           sub.iacraTrackingNumber || '',
    hasSecondaryCertificate:       !!sub.hasSecondaryCertificate,
    secondaryCertificate:          sub.secondaryCertificate || '',
    secondaryFaaCertificateNumber: sub.secondaryFaaCertificateNumber || '',
    secondaryIacraTrackingNumber:  sub.secondaryIacraTrackingNumber || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])
  const CERT_TYPES = ['Part 61 - Pilot', 'Part 61 - Flight or Ground Instructor', 'Part 65 - Aircraft Dispatcher', 'Part 107 - Remote Pilot']

  const save = async () => {
    setErr(''); setSaving(true)
    try {
      const payload = {
        primaryAirmanCertificate: form.primaryAirmanCertificate,
        primaryCertificate:       form.primaryCertificate,
        faaCertificateNumber:     form.faaCertificateNumber,
        iacraTrackingNumber:      form.iacraTrackingNumber,
        hasSecondaryCertificate:  !!form.hasSecondaryCertificate,
        secondaryCertificate:          form.hasSecondaryCertificate ? form.secondaryCertificate : '',
        secondaryFaaCertificateNumber: form.hasSecondaryCertificate ? form.secondaryFaaCertificateNumber : '',
        secondaryIacraTrackingNumber:  form.hasSecondaryCertificate ? form.secondaryIacraTrackingNumber : '',
      }
      const res = await API.put(`/individuals/${sub._id}`, payload)
      onSaved(res.data.data)
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to update certificate details.')
      setSaving(false)
    }
  }

  const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition'
  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1'

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[88px] sm:pt-[96px] pb-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={saving ? undefined : onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }}
        className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Certificate Information</p>
            <p className="text-sm font-extrabold text-slate-900">Edit your certificate details</p>
          </div>
          <button onClick={onClose} disabled={saving} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center disabled:opacity-50">✕</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Airman Certificate Status</label>
              <select value={form.primaryAirmanCertificate} onChange={e => set('primaryAirmanCertificate', e.target.value)} className={inp}>
                <option value="">— Select —</option><option value="NEW">NEW</option><option value="EXISTING">EXISTING</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Primary Certificate Type</label>
              <select value={form.primaryCertificate} onChange={e => set('primaryCertificate', e.target.value)} className={inp}>
                <option value="">— Select —</option>{CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>FAA Certificate Number</label>
              <input value={form.faaCertificateNumber} onChange={e => set('faaCertificateNumber', e.target.value)} placeholder="FAA Certificate #" className={inp} />
            </div>
            <div>
              <label className={lbl}>IACRA Tracking # (FTN)</label>
              <input value={form.iacraTrackingNumber} onChange={e => set('iacraTrackingNumber', e.target.value)} className={inp} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <input type="checkbox" checked={form.hasSecondaryCertificate} onChange={e => set('hasSecondaryCertificate', e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm font-semibold text-slate-700">Has secondary FAA certificate</span>
          </label>
          {form.hasSecondaryCertificate && (
            <div className="grid grid-cols-1 gap-3 ml-1 pl-3 border-l-2 border-blue-200">
              <div>
                <label className={lbl}>Secondary Certificate Type</label>
                <select value={form.secondaryCertificate} onChange={e => set('secondaryCertificate', e.target.value)} className={inp}>
                  <option value="">— Select —</option>{CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Secondary FAA #</label><input value={form.secondaryFaaCertificateNumber} onChange={e => set('secondaryFaaCertificateNumber', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Secondary IACRA FTN</label><input value={form.secondaryIacraTrackingNumber} onChange={e => set('secondaryIacraTrackingNumber', e.target.value)} className={inp} /></div>
              </div>
            </div>
          )}
          {err && <p className="text-sm font-semibold text-red-600">{err}</p>}
        </div>
        <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50">Cancel</button>
          <button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2 text-sm font-bold text-white transition disabled:opacity-50">{saving ? 'Saving…' : 'Save Details'}</button>
        </div>
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  ConvertToUnlimitedModal                                                      */
/*  In-place conversion of the BASE plan to Unlimited. No new plan/group; the    */
/*  unused portion of the current term is credited. Backend (purpose=            */
/*  'convert-unlimited') computes the authoritative charge — PaymentModal shows   */
/*  the exact amount it returns.                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
function ConvertToUnlimitedModal({ sub, role, group = null, onClose, onSaved }) {
  const isAirline = role === 'airline'
  const isGroup = !!group
  // Individuals may upgrade to Multiple Years OR Unlimited. Airlines (and any group) → Unlimited only.
  const individualUpgrade = !isAirline && !isGroup
  const [targetPlan, setTargetPlan] = useState('Unlimited Plan')
  // Default Multi-Year upgrade to one year beyond the current term (so it always
  // extends, never downgrades). Current Multi-Year count → count + 1 (min 2).
  const [convYears, setConvYears] = useState(() => {
    const cur = sub.subscriptionPlan === 'Multiple Years Subscription Plan'
      ? Number(sub.multiYearCount) || 1 : 1
    return Math.max(2, cur + 1)
  })
  const [showPayment, setShowPayment] = useState(false)
  const [showMethodStep, setShowMethodStep] = useState(false)
  const [wireSubmitting, setWireSubmitting] = useState(false)
  const [wireSent, setWireSent] = useState(false)
  const [wireErr, setWireErr] = useState('')
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])
  // Effective target: individuals pick; everyone else upgrades to Unlimited.
  const effTarget = individualUpgrade ? targetPlan : 'Unlimited Plan'
  const tYears = effTarget === 'Multiple Years Subscription Plan' ? Math.max(2, Number(convYears) || 2) : 1
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    return () => { document.documentElement.style.overflow = '' }
  }, [])

  // baseCount = holders being converted (the group's slots, or the base plan's own slots).
  const baseCount = isGroup
    ? Math.max(1, Number(group.count || 1))
    : Math.max(1, Number(sub.committedCount || sub.holderCountValue || sub.certificateHolders?.length || 1) - allGroupSlots(sub.holderGroups))
  const currentPlanLabel = isGroup
    ? planShortLabel(group.plan, group.multiYearCount)
    : planShortLabel(sub.subscriptionPlan, sub.multiYearCount)
  const unitExpiry = isGroup ? group.expirationDate : sub.expirationDate
  const expiryLabel = unitExpiry ? fmt(unitExpiry) : '—'

  // ── Estimated price (display only — backend is authoritative) ───────────────
  // Mirrors compute(Group)ConversionCharge(): Unlimited tier ppc stacked on active
  // coverage (excluding the unit being converted), minus a prorated credit for the
  // unused portion of the unit's current term.
  const now = new Date()
  const exp = unitExpiry ? new Date(unitExpiry) : null
  const start = (isGroup ? group.subscriptionDate : sub.subscriptionDate)
    ? new Date(isGroup ? group.subscriptionDate : sub.subscriptionDate) : null
  const oldYears = (isGroup ? group.plan : sub.subscriptionPlan) === 'Multiple Years Subscription Plan'
    ? Math.max(2, Number((isGroup ? group.multiYearCount : sub.multiYearCount) || 2)) : 1
  const anchor = isGroup
    ? activeCoverageAnchor(sub, { excludeGroupId: group._id })
    : activeCoverageAnchor(sub, { excludeBase: true })
  const unlimitedPpc = isAirline
    ? getRenewPpc('Unlimited Plan', Math.max(3, anchor + baseCount))
    : (effTarget === 'Unlimited Plan' ? 299 : effTarget === 'Multiple Years Subscription Plan' ? 55 : 69)
  const unlimitedTotal = isAirline
    ? unlimitedPpc * baseCount
    : (effTarget === 'Multiple Years Subscription Plan' ? 55 * tYears : unlimitedPpc)
  const currentBaseTotal = isGroup
    ? Number(group.pricePerCert || 0) * baseCount * oldYears
    : isAirline
      ? Number(sub.pricePerCertificate || sub.pricePerCert || 0) * baseCount * oldYears
      : (Number(sub.price) > 0 ? Number(sub.price)
          : sub.subscriptionPlan === '1 Year Subscription Plan' ? 69
          : sub.subscriptionPlan === 'Multiple Years Subscription Plan' ? 55 * oldYears
          : 0)
  let credit = 0
  if (exp && exp > now && currentBaseTotal > 0) {
    const totalMs = (start && exp > start) ? (exp - start) : oldYears * 365 * 86400000
    const remMs = Math.max(0, exp - now)
    credit = Math.round(currentBaseTotal * Math.min(1, remMs / totalMs) * 100) / 100
  }
  const estCharge = Math.max(0, Math.round((unlimitedTotal - credit) * 100) / 100)
  const money = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const unitLabel = isGroup ? 'add-on plan' : 'base plan'
  const targetLabel = effTarget === 'Unlimited Plan' ? 'Unlimited'
    : effTarget === 'Multiple Years Subscription Plan' ? `${tYears} Years`
    : '1 Year'

  const submitWireRequest = async () => {
    setWireSubmitting(true); setWireErr('')
    try {
      await API.patch(`/airlines/${sub._id}/request-invoice`, {
        purpose: 'convert-unlimited',
        ...(isGroup ? { holderGroupId: String(group._id) } : {}),
      })
      setWireSent(true)
    } catch (e) {
      setWireErr(e?.response?.data?.message || 'Could not send the wire request. Please try again.')
    } finally {
      setWireSubmitting(false)
    }
  }

  if (wireSent) {
    return (
      <WireRequestSentView onClose={() => {
        window.dispatchEvent(new Event('ifoa-subscription-refresh'))
        onClose()
      }} />
    )
  }

  if (showMethodStep) {
    return (
      <PaymentMethodStep
        amountLabel={`~${money(estCharge)}`}
        summary={`Convert to Unlimited${isAirline ? ` · ${baseCount} holder${baseCount !== 1 ? 's' : ''}` : ''}`}
        submitting={wireSubmitting}
        error={wireErr}
        onBack={() => { setWireErr(''); setShowMethodStep(false) }}
        onCard={() => { setShowMethodStep(false); setShowPayment(true) }}
        onWire={submitWireRequest}
      />
    )
  }

  if (showPayment) {
    return (
      <PaymentModal
        registrationId={sub._id}
        registrationModel={isAirline ? 'Airlines' : 'Individual'}
        amount={0}
        subscriptionData={sub}
        purpose="convert-unlimited"
        newSubscriptionPlan={effTarget}
        renewalMultiYearCount={effTarget === 'Multiple Years Subscription Plan' ? tYears : undefined}
        holderGroupId={isGroup ? group._id : undefined}
        onClose={() => { setShowPayment(false); onClose() }}
        onSuccess={(inv, updatedReg) => { onSaved(updatedReg || sub) }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[88px] sm:pt-[96px] pb-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Upgrade Plan</p>
            <p className="text-sm font-extrabold text-slate-900 truncate">{individualUpgrade ? 'Upgrade your plan' : 'Switch to Unlimited'}</p>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-slate-600">
            Upgrade this <strong className="text-slate-900">{unitLabel}</strong> to <strong className="text-slate-900">{targetLabel}</strong>.
            {isGroup ? ' Your base plan and other add-ons are unchanged.' : ' Your existing add-on plans are unchanged.'} The unused portion of the current
            term is credited toward the price.
          </p>

          {/* Individual target picker — Multiple Years or Unlimited */}
          {individualUpgrade && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {[['Multiple Years Subscription Plan', 'Multiple Years'], ['Unlimited Plan', 'Unlimited']].map(([val, lbl]) => (
                  <button key={val} type="button" onClick={() => setTargetPlan(val)}
                    className={`rounded-xl border-2 px-3 py-2 text-[12px] font-bold transition ${targetPlan === val ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
              {targetPlan === 'Multiple Years Subscription Plan' && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-[12px] font-semibold text-slate-600">Years</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setConvYears(y => Math.max(2, Number(y) - 1))}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-100">−</button>
                    <span className="w-8 text-center text-sm font-extrabold text-slate-900">{tYears}</span>
                    <button type="button" onClick={() => setConvYears(y => Number(y) + 1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-100">+</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 space-y-1.5 text-[11px]">
            <div className="flex justify-between"><span className="text-slate-500">Current {unitLabel}</span><span className="font-semibold text-slate-800">{currentPlanLabel}</span></div>
            {isAirline && <div className="flex justify-between"><span className="text-slate-500">{isGroup ? 'Plan holders' : 'Base holders'}</span><span className="font-semibold text-slate-800">{baseCount}</span></div>}
            <div className="flex justify-between"><span className="text-slate-500">Expires</span><span className="font-semibold text-slate-800">{expiryLabel}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">After upgrade</span><span className="font-semibold text-blue-700">{effTarget === 'Unlimited Plan' ? 'Unlimited — no expiry' : `${targetLabel}`}</span></div>
          </div>
          {/* Estimated price breakdown */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-3.5 py-3 space-y-1.5 text-[11px]">
            <div className="flex justify-between"><span className="text-slate-500">{targetLabel}{isAirline ? ` (${money(unlimitedPpc)} × ${baseCount})` : ''}</span><span className="font-semibold text-slate-800">{money(unlimitedTotal)}</span></div>
            {credit > 0 && <div className="flex justify-between"><span className="text-slate-500">Credit — unused {currentPlanLabel}</span><span className="font-semibold text-emerald-600">−{money(credit)}</span></div>}
            <div className="flex justify-between border-t border-blue-100 pt-1.5"><span className="font-bold text-slate-700">Estimated total</span><span className="font-extrabold text-blue-700">{money(estCharge)}</span></div>
          </div>
          <p className="text-[10px] text-slate-400">
            Estimate only — the exact amount (recalculated at the moment of payment) is shown at checkout.
          </p>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button onClick={() => (isAirline ? setShowMethodStep(true) : setShowPayment(true))}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-[12px] font-bold text-white transition">
            Continue
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  RenewModal                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
const INDIVIDUAL_PLANS = [
  { value: '1 Year Subscription Plan', label: '1 Year — $69', price: 69 },
  { value: 'Multiple Years Subscription Plan', label: 'Multiple Years — $55/yr', price: null },
  { value: 'Unlimited Plan', label: 'Unlimited — $299', price: 299 },
]
const AIRLINE_PLANS = [
  { value: '1 Year Subscription Plan', label: '1 Year Plan' },
  { value: 'Unlimited Plan', label: 'Unlimited Plan' },
]

// ── Airline tier pricing for renewals — identical to Form 1 (AirlinesStep1PlanAndDetails) ──
// 1-Year:    3–5 → $60/cert, 5–10 → $55/cert, 10+ → $49/cert
// Unlimited: 3–5 → $265/cert, 5–10 → $255/cert, 10+ → $245/cert
const RENEW_PRICE_MAP = {
  '3 to 5': { '1 Year Subscription Plan': 60, 'Unlimited Plan': 265 },
  '5 to 10': { '1 Year Subscription Plan': 55, 'Unlimited Plan': 255 },
  'More than 10': { '1 Year Subscription Plan': 49, 'Unlimited Plan': 245 },
}

function airlineRenewRange(count) {
  if (count <= 5) return '3 to 5'
  if (count <= 10) return '5 to 10'
  return 'More than 10'
}

function getRenewPpc(plan, count) {
  const range = airlineRenewRange(Math.max(1, count))
  return RENEW_PRICE_MAP[range]?.[plan] ?? 49
}

function RenewModal({ sub, role, group = null, onClose, onSaved }) {
  const isAirline = role === 'airline'
  // Track the latest version of sub so edits in the review form are reflected here
  const [currentSub, setCurrentSub] = useState(sub)
  // When renewing a holder group, scope everything to that group.
  const isGroup = !!group
  // Holders belonging to the unit being renewed (group's holders, or base-plan
  // holders when renewing the base subscription).
  const unitHolders = (currentSub.certificateHolders || []).filter(h =>
    isGroup ? String(h.holderGroupId || '') === String(group._id) : !h.holderGroupId
  )
  const [plan, setPlan] = useState((isGroup ? group.plan : sub.subscriptionPlan) || '1 Year Subscription Plan')
  const [multiYearRenewCount, setMultiYearRenewCount] = useState(Number(sub.multiYearCount) || 3)

  // ── Group renewal = independent add-on ──────────────────────────────────────
  // A holder-upgrade group renews on its OWN terms (it is an add-on, not the base).
  // It defaults to its own slot count and may shrink to 1 holder while a base plan
  // is live (the base already satisfies the airline 3-holder floor). With no active
  // base plan this group stands alone and must meet the 3-holder minimum itself.
  const baseLiveNow = (sub.status === 'Active' || sub.isPaid) &&
    (sub.subscriptionPlan === 'Unlimited Plan' || !sub.expirationDate || new Date(sub.expirationDate) > new Date())
  // ── SINGLE SOURCE: holders already covered by every ACTIVE plan except the one
  // being renewed. Drives BOTH the tier position (stacking) AND the holder floor.
  //   Renewing the base  → active add-on groups (Lifetime/Upgrade) act as coverage.
  //   Renewing a group   → active base (if live) + other active groups.
  const tierAnchor = activeCoverageAnchor(sub, isGroup ? { excludeGroupId: group._id } : { excludeBase: true })
  // Any active coverage already meets the airline 3-holder floor → this renewal may
  // shrink to 1. With nothing active, it stands alone and must start at ≥3.
  const anyCoverageLive = tierAnchor > 0
  const countMin = anyCoverageLive ? 1 : 3

  // Merge option — a same-plan upgrade group can fold back into the live base plan:
  // its holders become base holders (inherit base plan + expiry) and its slots fold
  // into the base committed count. Offered only when the base is active AND shares
  // the group's plan type. Default is "keep separate" (renew as its own plan).
  const canMergeToBase = isGroup && baseLiveNow && group.plan === sub.subscriptionPlan
  const [mergeMode, setMergeMode] = useState(false)
  const baseExpiryLabel = sub.expirationDate ? fmt(sub.expirationDate) : '—'

  // The base plan's OWN holder count = committed grand total − ALL group slots.
  // Shown as a REFERENCE (what the active base covers); the add-on renewal stacks
  // on top of it (see renewTierAnchor) rather than defaulting to it.
  const baseOwnCount = Math.max(0, Number(sub.committedCount || sub.holderCountValue || 0) - allGroupSlots(sub.holderGroups))

  // Airline: committed holder count — user can adjust at renewal time.
  // A group renewal starts from THIS plan's own holder count and grows dynamically as the
  // user increases it; it is NOT pre-filled to the base coverage.
  const [exactCount, setExactCount] = useState(
    isGroup
      ? Number(group.count || unitHolders.length || 1)
      : Number(sub.committedCount || sub.holderCountValue || sub.certificateHolders?.length || 1)
  )
  const [showPayment, setShowPayment] = useState(false)
  const [showEditDetails, setShowEditDetails] = useState(false)
  const [showHolderSelector, setShowHolderSelector] = useState(false)
  // Airline payment-method chooser (Card vs Wire) + wire request lifecycle.
  const [showMethodStep, setShowMethodStep] = useState(false)
  const [wireSubmitting, setWireSubmitting] = useState(false)
  const [wireSent, setWireSent] = useState(false)
  const [wireErr, setWireErr] = useState('')

  // Holder decrease warning: which holders to KEEP when count drops below current
  const currentHolderCount = unitHolders.length
  const [selectedHolderIds, setSelectedHolderIds] = useState(() =>
    new Set(unitHolders.map(h => String(h._id)))
  )
  // When exactCount changes, auto-adjust selection (keep first N if decreasing)
  useEffect(() => {
    if (!isAirline) return
    const allHolders = unitHolders
    if (exactCount >= allHolders.length) {
      setSelectedHolderIds(new Set(allHolders.map(h => String(h._id))))
    } else {
      setSelectedHolderIds(new Set(allHolders.slice(0, exactCount).map(h => String(h._id))))
    }
  }, [exactCount, isAirline]) // eslint-disable-line react-hooks/exhaustive-deps

  const isDecreasingHolders = isAirline && exactCount < currentHolderCount
  const holdersToRemove = isDecreasingHolders
    ? unitHolders
      .filter(h => !selectedHolderIds.has(String(h._id)))
      .map(h => String(h._id))
    : null
  const selectionValid = !isDecreasingHolders || selectedHolderIds.size >= 1

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // ── Airline tier-based PPC — recalculated live from exactCount + plan ──
  // This mirrors the logic in AirlinesStep1PlanAndDetails.jsx exactly.
  // We never read the stored pricePerCertificate here because the count may
  // have changed, which means the tier (and therefore the rate) may change too.
  //
  // tierAnchor (computed above, single source) stacks this renewal on top of the
  // active coverage, so its tier is read at the cumulative position (anchor + count).
  // Example: active coverage = 6, renew 3 → holders sit at positions 7-9, tier read
  // at 9 ("5 to 10"), not 3. With no active coverage the anchor is 0 (tier from 1).
  const tierCount = Math.max(1, tierAnchor + exactCount)
  const renewPpc = isAirline ? getRenewPpc(plan, tierCount) : 0
  const renewRange = isAirline ? airlineRenewRange(tierCount) : null
  // "Tier updated" flag: the renewal rate differs from the rate this plan currently
  // carries (volume tier shifted because of the stacked position / new count).
  const renewPrevRate = Number(isGroup ? (group.pricePerCert || 0) : (sub.pricePerCertificate || sub.pricePerCert || 0))
  const renewRateChanged = isAirline && renewPrevRate > 0 && renewPpc !== renewPrevRate
  const newTotalHolders = tierAnchor + exactCount

  // For airlines with multi-year plan, multiply by year count (mirrors backend logic)
  const airlineRenewYears = isAirline && plan === 'Multiple Years Subscription Plan'
    ? Math.max(2, multiYearRenewCount || 3) : 1

  // Compute renewal price
  const renewalPrice = (() => {
    if (isAirline) {
      return renewPpc * Math.max(1, exactCount) * airlineRenewYears
    }
    // Individual plans — no certificate holders, fixed prices
    if (plan === 'Unlimited Plan') return 299
    if (plan === 'Multiple Years Subscription Plan') return 55 * Math.max(2, multiYearRenewCount)
    return 69 // 1 Year
  })()

  const renewalAmountCents = Math.round(renewalPrice * 100)
  const chargedCents = renewalAmountCents

  const plans = isAirline ? AIRLINE_PLANS : INDIVIDUAL_PLANS
  const unitExpiryDate = isGroup ? group.expirationDate : currentSub.expirationDate
  const currentExpiry = unitExpiryDate ? fmt(unitExpiryDate) : '—'
  const daysLeft = unitExpiryDate
    ? Math.ceil((new Date(unitExpiryDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  // Pricing breakdown label shown under the total for airlines
  const pricingLabel = isAirline
    ? `$${renewPpc}/cert × ${exactCount} holder${exactCount !== 1 ? 's' : ''}${airlineRenewYears > 1 ? ` × ${airlineRenewYears} years` : ''} (${renewRange})`
    : null

  // Show the edit-details form on top of the renew modal
  if (showEditDetails) {
    return (
      <EditSubscriptionFormModal
        sub={currentSub}
        role={role}
        onClose={() => setShowEditDetails(false)}
        onSaved={(updated) => {
          setCurrentSub(updated)
          // If the plan changed, mirror it in the plan selector
          if (updated.subscriptionPlan) setPlan(updated.subscriptionPlan)
          if (updated.multiYearCount) setMultiYearRenewCount(Number(updated.multiYearCount))
          setShowEditDetails(false)
        }}
      />
    )
  }

  // ── Wire request: send the FULL requested renewal to admin for approval ──────
  const submitWireRequest = async () => {
    setWireSubmitting(true); setWireErr('')
    try {
      await API.patch(`/airlines/${currentSub._id}/request-invoice`, {
        purpose: 'renewal',
        renewalPlan: plan,
        details: {
          plan,
          multiYearCount: plan === 'Multiple Years Subscription Plan' ? Math.max(2, multiYearRenewCount) : null,
          exactCount: isAirline ? exactCount : null,
          holdersToRemove: holdersToRemove && holdersToRemove.length ? holdersToRemove : null,
          holderGroupId: isGroup ? String(group._id) : null,
          mergeTarget: isGroup && mergeMode && canMergeToBase ? 'base' : null,
          amount: renewalPrice,
        },
      })
      setWireSent(true)
    } catch (e) {
      setWireErr(e?.response?.data?.message || 'Could not send the wire request. Please try again.')
    } finally {
      setWireSubmitting(false)
    }
  }

  if (wireSent) {
    return (
      <WireRequestSentView onClose={() => {
        window.dispatchEvent(new Event('ifoa-subscription-refresh'))
        onClose()
      }} />
    )
  }

  if (showMethodStep) {
    return (
      <PaymentMethodStep
        amountLabel={`$${renewalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        summary={`Renewal — ${planShortLabel(plan, multiYearRenewCount)}${isAirline ? ` · ${exactCount} holder${exactCount !== 1 ? 's' : ''}` : ''}`}
        submitting={wireSubmitting}
        error={wireErr}
        onBack={() => { setWireErr(''); setShowMethodStep(false) }}
        onCard={() => { setShowMethodStep(false); setShowPayment(true) }}
        onWire={submitWireRequest}
      />
    )
  }

  if (showPayment) {
    return (
      <PaymentModal
        registrationId={currentSub._id}
        registrationModel={isAirline ? 'Airlines' : 'Individual'}
        amount={chargedCents}
        subscriptionData={currentSub}
        purpose="renewal"
        newSubscriptionPlan={plan}
        renewalMultiYearCount={plan === 'Multiple Years Subscription Plan' ? multiYearRenewCount : undefined}
        renewalExactCount={isAirline ? exactCount : undefined}
        renewalHoldersToRemove={holdersToRemove}
        holderGroupId={isGroup ? group._id : undefined}
        mergeTarget={isGroup && mergeMode && canMergeToBase ? 'base' : undefined}
        onClose={() => { setShowPayment(false); onClose() }}
        onSuccess={(inv, updatedReg) => {
          onSaved(updatedReg || currentSub)
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[88px] sm:pt-[96px] pb-4 animate-modal-backdrop overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex flex-col lg:flex-row items-start gap-3">
        <div className="w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-slate-200 bg-white flex flex-col max-h-[calc(100vh-104px)] sm:max-h-[calc(100vh-120px)] animate-modal-panel">

          {/* Clean light header */}
          <div className="bg-white px-5 pt-5 pb-4 flex-shrink-0 border-b border-slate-100">
            <div className="flex items-start justify-between mb-3.5">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Renew Subscription</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">Extend Your Coverage</h3>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-600 flex items-center justify-center transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Expiry chip — light, urgency-coloured */}
            {(() => {
              const expired = daysLeft !== null && daysLeft <= 0
              const urgent = daysLeft !== null && daysLeft > 0 && daysLeft <= 7
              const chipCls = expired ? 'bg-red-50 border-red-100' : urgent ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'
              const iconCls = expired ? 'text-red-500' : urgent ? 'text-amber-500' : 'text-slate-500'
              const titleCls = expired ? 'text-red-700' : urgent ? 'text-amber-800' : 'text-slate-800'
              return (
                <div className={`flex items-center gap-2 rounded-xl px-3.5 py-2 border ${chipCls}`}>
                  <svg className={`w-4 h-4 flex-shrink-0 ${iconCls}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <div>
                    {expired ? (
                      <>
                        <p className={`text-sm font-semibold ${titleCls}`}>Expired — {currentExpiry}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Renewing starts a fresh period from today</p>
                      </>
                    ) : (
                      <>
                        <p className={`text-sm font-semibold leading-tight ${titleCls}`}>
                          {daysLeft !== null
                            ? `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — ${currentExpiry}`
                            : `Expires: ${currentExpiry}`}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Renewing extends from current expiry date</p>
                      </>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>

          <div className="bg-white overflow-y-auto flex-1 min-h-0">
            {/* Credentials slim row */}
            <div className="px-5 py-2.5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-slate-700">Registered details</p>
                  <p className="text-[10px] text-slate-500">Verify credentials before renewing</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditDetails(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" />
                </svg>
                Edit
              </button>
            </div>

            <div className="px-5 pt-2.5 pb-3.5 space-y-2">
              {/* Plan selector */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Select Renewal Plan</p>
                {plans.map((p) => (
                  <label key={p.value} className={`flex items-center gap-3 px-3.5 py-2 rounded-xl border-2 cursor-pointer transition-all ${plan === p.value
                    ? 'border-blue-500 bg-blue-50/70'
                    : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}>
                    <div className={`w-4.5 h-4.5 w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${plan === p.value ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                      }`}>
                      {plan === p.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <input type="radio" className="sr-only" value={p.value} checked={plan === p.value} onChange={() => setPlan(p.value)} />
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className={`text-sm font-bold ${plan === p.value ? 'text-blue-900' : 'text-slate-700'}`}>{p.label}</span>
                      {p.value === 'Unlimited Plan' && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700">No expiry</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {/* Participants renewed with the selected plan — compact, scrollable */}
              {isAirline && unitHolders.length > 0 && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Participants renewed</p>
                    <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-full px-2 py-0.5">{unitHolders.length}</span>
                  </div>
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white max-h-[120px] overflow-y-auto">
                    {unitHolders.map((h, i) => {
                      const willRemove = holdersToRemove && holdersToRemove.includes(String(h._id))
                      const initials = (h.fullName || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
                      return (
                        <div key={String(h._id || i)} className={`flex items-center gap-2 px-2.5 py-1.5 ${willRemove ? 'bg-red-50/50' : ''}`}>
                          <span className={`w-6 h-6 rounded-full text-[9px] font-black flex items-center justify-center flex-shrink-0 ${willRemove ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-500'}`}>{initials || (i + 1)}</span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-semibold truncate ${willRemove ? 'text-red-600 line-through' : 'text-slate-800'}`}>{h.fullName || '(unnamed)'}</p>
                            <p className="text-[10px] text-slate-400 truncate">{h.certificateType || '—'} · FTN {h.iacraFtnNumber || '—'}</p>
                          </div>
                          {willRemove
                            ? <span className="text-[9px] font-bold uppercase tracking-wide text-red-600 flex-shrink-0">Removed</span>
                            : <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Airline: holder count */}
              {isAirline && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 space-y-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Certificate Holders</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setExactCount(c => Math.max(countMin, c - 1))}
                      className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 font-bold text-lg flex items-center justify-center transition"
                    >−</button>
                    <span className="text-2xl font-black text-slate-900 w-10 text-center tabular-nums">{exactCount}</span>
                    <button
                      type="button"
                      onClick={() => setExactCount(c => c + 1)}
                      className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 font-bold text-lg flex items-center justify-center transition"
                    >+</button>
                    <span className="text-xs text-slate-500 ml-1">holders</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {isGroup ? 'This plan' : 'Current'}: <strong className="text-slate-700">{currentHolderCount}</strong>
                      {exactCount !== currentHolderCount && (
                        <span className="text-blue-600"> → <strong>{exactCount}</strong></span>
                      )}
                      {isGroup && baseLiveNow && (
                        <span className="text-slate-400"> · Base: <strong className="text-slate-600">{baseOwnCount}</strong></span>
                      )}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    {tierAnchor > 0
                      ? `Stacks on your active coverage (${tierAnchor}) — these are holders ${tierAnchor + 1}–${tierAnchor + exactCount} (total ${tierAnchor + exactCount}). Tier priced at ${tierCount}.`
                      : 'No active plan — renews independently (min 3 holders).'}
                  </p>
                  <div className="border-t border-slate-100 pt-2 mt-1 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">New total</span>
                      <span className="font-bold text-slate-800">{newTotalHolders} holder{newTotalHolders !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">New rate</span>
                      <span className="font-bold text-slate-800">
                        ${renewPpc}/cert
                        {renewRateChanged && <span className="ml-1.5 text-[9px] font-black text-emerald-600 uppercase tracking-wider">Tier updated</span>}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Group renewal: merge into base, or keep as a separate plan */}
              {isAirline && canMergeToBase && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">How to renew this upgrade</p>
                  <label className={`flex items-start gap-2.5 px-3 py-1.5 rounded-lg border cursor-pointer transition ${!mergeMode ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" className="mt-0.5 accent-blue-600" checked={!mergeMode} onChange={() => setMergeMode(false)} />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-slate-800">Keep as a separate plan</span>
                      <span className="block text-[10px] text-slate-500">Renews as its own upgrade with a fresh term.</span>
                    </span>
                  </label>
                  <label className={`flex items-start gap-2.5 px-3 py-1.5 rounded-lg border cursor-pointer transition ${mergeMode ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" className="mt-0.5 accent-blue-600" checked={mergeMode} onChange={() => setMergeMode(true)} />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-slate-800">Merge into base plan</span>
                      <span className="block text-[10px] text-slate-500">Folds these holders into the base — they take its expiry ({baseExpiryLabel}).</span>
                    </span>
                  </label>
                </div>
              )}

              {/* Holder decrease — compact trigger opens side panel */}
              {isDecreasingHolders && (
                <button
                  type="button"
                  onClick={() => setShowHolderSelector(v => !v)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 transition-all ${showHolderSelector
                    ? 'border-blue-500 bg-blue-50'
                    : selectionValid
                      ? 'border-emerald-300 bg-emerald-50/70'
                      : 'border-amber-300 bg-amber-50/70'
                    }`}
                >
                  <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0Z" />
                  </svg>
                  <div className="flex-1 text-left">
                    <p className="text-xs font-bold text-slate-800">Select Holders to Keep</p>
                    <p className={`text-[10px] mt-0.5 ${selectionValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {selectedHolderIds.size} of {exactCount} selected
                      {!selectionValid && ` — select at least 1`}
                    </p>
                  </div>
                  {selectionValid && (
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                  <svg
                    className={`w-4 h-4 flex-shrink-0 transition-transform ${showHolderSelector ? 'rotate-180 text-blue-500' : 'text-slate-500'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              )}

              {/* Multi-year */}
              {!isAirline && plan === 'Multiple Years Subscription Plan' && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Number of Years</p>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    value={multiYearRenewCount}
                    onChange={(e) => setMultiYearRenewCount(Math.max(2, Number(e.target.value) || 2))}
                  />
                  <p className="text-xs text-slate-500">$55 × {multiYearRenewCount} years</p>
                </div>
              )}

              {/* Renewal total — clean accent card */}
              <div className="rounded-xl border-2 border-blue-100 bg-blue-50/60 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Renewal Total</p>
                  {pricingLabel && <p className="text-[10px] text-slate-500 mt-1 tabular-nums">{pricingLabel}</p>}
                </div>
                <div className="text-right">
                  {plan === 'Unlimited Plan' && !isAirline ? (
                    <>
                      <p className="text-xl font-black text-emerald-600 tabular-nums">$299.00</p>
                      <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider leading-none">Lifetime</p>
                    </>
                  ) : (
                    <p className="text-xl font-black text-slate-900 tabular-nums">${(renewalAmountCents / 100).toFixed(2)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer — sticky at bottom */}
          <div className="bg-white border-t border-slate-100 px-5 py-3 flex-shrink-0">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => isAirline ? setShowMethodStep(true) : setShowPayment(true)}
                disabled={chargedCents <= 0 || !selectionValid}
                title={!selectionValid ? `Select at least 1 holder to keep` : undefined}
                className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:hover:bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition-all"
              >
                Proceed to Payment
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Side holder selector panel — always mounted when decreasing so CSS can animate */}
        {isDecreasingHolders && (
          <div
            className="flex-shrink-0 overflow-hidden rounded-2xl transition-all duration-300 ease-out"
            style={{ width: showHolderSelector ? '288px' : '0px', opacity: showHolderSelector ? 1 : 0, pointerEvents: showHolderSelector ? 'auto' : 'none' }}
          >
            <div className="w-72 rounded-2xl bg-white shadow-2xl shadow-black/30 overflow-hidden flex flex-col max-h-[76vh]">
              {/* Header */}
              <div className="flex items-center gap-2.5 px-3.5 py-3 bg-gradient-to-r from-slate-900 to-slate-800 flex-shrink-0">
                <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0Z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Select Holders to Keep</p>
                  <p className={`text-[10px] mt-0.5 tabular-nums font-semibold ${selectedHolderIds.size >= 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {selectedHolderIds.size} / {exactCount} selected
                  </p>
                </div>
                <button
                  onClick={() => setShowHolderSelector(false)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white flex items-center justify-center transition flex-shrink-0"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Holder list — scrollable */}
              <div className="divide-y divide-slate-100 overflow-y-auto flex-1 min-h-0">
                {(currentSub.certificateHolders || []).map((h) => {
                  const id = String(h._id)
                  const checked = selectedHolderIds.has(id)
                  const disabled = !checked && selectedHolderIds.size >= exactCount
                  return (
                    <label
                      key={id}
                      className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors select-none ${checked ? 'bg-white hover:bg-slate-50' : disabled ? 'bg-slate-50/60 opacity-40 cursor-not-allowed' : 'bg-slate-50/40 hover:bg-slate-50'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => {
                          setSelectedHolderIds(prev => {
                            const next = new Set(prev)
                            if (next.has(id)) next.delete(id)
                            else if (next.size < exactCount) next.add(id)
                            return next
                          })
                        }}
                        className="w-4 h-4 rounded flex-shrink-0 accent-slate-800"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{h.fullName || '—'}</p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{h.certificateType || ''}{h.faaCertificateNumber ? ` · ${h.faaCertificateNumber}` : ''}</p>
                      </div>
                      {checked && (
                        <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      )}
                    </label>
                  )
                })}
              </div>
              {/* Footer hint */}
              <div className={`px-3.5 py-2.5 border-t border-slate-100 flex-shrink-0 ${selectedHolderIds.size >= 1 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                {selectedHolderIds.size >= 1 ? (
                  <p className="text-[10px] font-semibold text-emerald-700">
                    {selectedHolderIds.size === exactCount ? 'Selection complete — ready to proceed' : `${selectedHolderIds.size} selected — remaining ${exactCount - selectedHolderIds.size} slot${exactCount - selectedHolderIds.size !== 1 ? 's' : ''} can be filled later`}
                  </p>
                ) : (
                  <p className="text-[10px] text-amber-700">Select at least 1 holder to continue</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  SubscriptionPage (main export)                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function SubscriptionPage() {
  const { user, token, linkRegistration } = useAuth()
  const { getOrFetch, set: cacheSet, invalidate } = useDataCache()
  const [subs, setSubs] = useState([])
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showPayModal, setShowPayModal] = useState(false)
  const [payTarget, setPayTarget] = useState(null)
  const [payingId, setPayingId] = useState(null)
  const [showAddHolders, setShowAddHolders] = useState(false)
  // When set, the AddHoldersModal opens pre-scoped to this holder-upgrade group.
  const [manageGroupId, setManageGroupId] = useState('')
  const [viewInvoice, setViewInvoice] = useState(null)
  const [viewAllInvoices, setViewAllInvoices] = useState(null) // array of invoice docs
  const [editTarget, setEditTarget] = useState(null)
  const [renewTarget, setRenewTarget] = useState(null)
  const [upgradeTarget, setUpgradeTarget] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null) // { sub, planRef }
  const [convertTarget, setConvertTarget] = useState(null) // base plan → Unlimited
  const [creditsTarget, setCreditsTarget] = useState(null) // show per-plan credits
  const [certTarget, setCertTarget] = useState(null) // focused certificate edit

  // ?highlight=<subscriptionId> — set when arriving from a notification "View →".
  // The matching SubscriptionCard scrolls into view and pulses a ring once.
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight') || null
  useEffect(() => {
    if (!highlightId || loading) return
    // Strip the param after a beat so a manual refresh doesn't re-trigger the pulse.
    const t = setTimeout(() => {
      setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete('highlight'); return p }, { replace: true })
    }, 2500)
    return () => clearTimeout(t)
  }, [highlightId, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const regId = user?.registrationId || sub?._id
  const regModel = user?.registrationModel ||
    (user?.role === 'airline' ? 'Airlines' : 'Individual')

  const isPending = (s) => s && s.paymentStatus !== 'paid' && s.status !== 'Active'

  useEffect(() => {
    const anyModalOpen = !!(
      showPayModal ||
      showAddHolders ||
      viewInvoice ||
      viewAllInvoices ||
      editTarget ||
      renewTarget ||
      upgradeTarget ||
      convertTarget ||
      creditsTarget
    )
    if (!anyModalOpen) {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [showPayModal, showAddHolders, viewInvoice, viewAllInvoices, editTarget, renewTarget, upgradeTarget, convertTarget, creditsTarget])

  useEffect(() => {
    if (!user) { setLoading(false); return }

    const headers = { Authorization: `Bearer ${token}` }
    const isAirline = user.role === 'airline'
    const basePath = isAirline ? '/airlines' : '/individuals'
    const modelName = isAirline ? 'Airlines' : 'Individual'
    const cacheKey = `subs_${user.id || user.email}`

    invalidate(cacheKey)

    const mergeAndSort = (...groups) => {
      const seen = new Set()
      return groups.flat().filter(Boolean).filter((item) => {
        const key = item?._id?.toString()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    const fetchByIds = async (idsToFetch) => {
      if (!idsToFetch || idsToFetch.length === 0) return []
      const fetched = await Promise.allSettled(
        idsToFetch.map(id => API.get(`${basePath}/${id}`, { headers }))
      )
      return fetched
        .filter(r => r.status === 'fulfilled' && r.value?.data?.data)
        .map(r => r.value.data.data)
    }

    const load = async () => {
      try {
        const merged = await getOrFetch(cacheKey, async () => {
          const emailSubs = user.email
            ? await API.get(`${basePath}/by-email?email=${encodeURIComponent(user.email)}`, { headers })
              .then((r) => r.data.all || (r.data.data ? [r.data.data] : []))
              .catch(() => [])
            : []

          const resolvedIds = new Set(emailSubs.map(s => s._id?.toString()).filter(Boolean))
          const remainingIds = [
            ...(user.subscriptionIds || []),
            ...(user.registrationId ? [user.registrationId] : []),
          ]
            .map(id => id?.toString())
            .filter(Boolean)
            .filter(id => !resolvedIds.has(id))
          const uniqueRemainingIds = [...new Set(remainingIds)]
          const idSubs = await fetchByIds(uniqueRemainingIds)
          return mergeAndSort(idSubs, emailSubs)
        })
        setSubs(merged)
        setSub(merged[0] || null)
        if (!user.registrationId && merged[0]?._id) {
          try { await linkRegistration(merged[0]._id, modelName) } catch { void 0 }
        }
      } catch {
        setSubs([])
        setSub(null)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }
    load()
  }, [user, token, linkRegistration, getOrFetch, invalidate, refreshKey])

  // Re-fetch when tab regains focus so admin changes are visible without manual refresh
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setRefreshKey(k => k + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Re-fetch when a holder action (remove/convert) completes in a child SubscriptionCard
  useEffect(() => {
    const onRefresh = () => { invalidate(`subs_${user?.id || user?.email}`); setRefreshKey(k => k + 1) }
    window.addEventListener('ifoa-subscription-refresh', onRefresh)
    return () => window.removeEventListener('ifoa-subscription-refresh', onRefresh)
  }, [user, invalidate])

  // ── Auto-activate any queued renewals whose activationDate has passed ─────────
  const autoActivateAttempted = useState(() => new Set())[0]
  useEffect(() => {
    if (!subs.length || !token || !user) return
    const regModel = user.role === 'airline' ? 'Airlines' : 'Individual'
    const now = new Date()

    subs.forEach(async (s) => {
      if (s._autoActivateFailed) return
      if (autoActivateAttempted.has(String(s._id))) return
      // Due if the base renewal OR any group renewal has reached its activation date.
      const baseDue = s.nextRenewal?.paidAt && s.nextRenewal.activationDate &&
        new Date(s.nextRenewal.activationDate) <= now
      const groupDue = (s.holderGroups || []).some(g =>
        g.nextRenewal?.paidAt && g.nextRenewal.activationDate &&
        new Date(g.nextRenewal.activationDate) <= now
      )
      if (!baseDue && !groupDue) return

      autoActivateAttempted.add(String(s._id))
      try {
        const res = await API.post('/payments/auto-activate-renewal', {
          registrationId: s._id,
          registrationModel: regModel,
        })
        if (res.data?.success && res.data?.data) {
          const activated = res.data.data
          setSubs(prev => prev.map(x => x._id === activated._id ? activated : x))
          setSub(prev => (prev?._id === activated._id ? activated : prev))
          cacheSet(`subs_${user?.id || user?.email}`, subs.map(x => x._id === activated._id ? activated : x))
        } else {
          setSubs(prev => prev.map(x => x._id === s._id ? { ...x, _autoActivateFailed: true } : x))
        }
      } catch (_) {
        setSubs(prev => prev.map(x => x._id === s._id ? { ...x, _autoActivateFailed: true } : x))
      }
    })
  }, [subs, token, user, autoActivateAttempted, cacheSet])

  const handleParentInvoiceClick = async (s) => {
    if (!s) return
    const activeInvoice = String(s.invoiceNumber || '').trim()
    const queuedInvoice = String(s.nextRenewal?.invoiceNumber || '').trim()

    let docs = []
    try {
      const resp = await axios.get(`${BASE_URL}/invoices/by-registration/${s._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      docs = resp.data?.data || []
    } catch {
      docs = []
    }

    if (docs.length > 0) {
      setViewAllInvoices({ docs, reg: s })
      return
    }

    const isAirline = user?.role === 'airline'
    const hasQueuedRenewal = !!(s.nextRenewal?.paidAt && s.nextRenewal?.activationDate && new Date(s.nextRenewal.activationDate) > new Date())
    const currentInvoiceNum = s.invoiceNumber || null
    const subscriptionStart = s.subscriptionDate ? new Date(s.subscriptionDate) : null
    const invoiceTotal = docs
      .filter(doc => {
        if (hasQueuedRenewal && doc.purpose === 'renewal') return false
        if (currentInvoiceNum && doc.invoiceNumber === currentInvoiceNum) return true
        if (doc.purpose === 'holder-upgrade' && (!subscriptionStart || (doc.paidAt && new Date(doc.paidAt) >= subscriptionStart))) return true
        if (!currentInvoiceNum && doc.purpose !== 'renewal') return true
        return false
      })
      .reduce((sum, doc) => sum + (Number(doc.totalAmount) || 0), 0)

    const _groups = s.holderGroups || []
    const _groupCounts = (g) => isActiveHolderGroup(g)
    const _groupsAmount = _groups
      .filter(_groupCounts)
      .reduce((a, g) => a + Number(g.amount || 0), 0)
    const _basePpc = Number(s.pricePerCertificate ?? s.pricePerCert ?? 0)
    const _baseCommitted = Math.max(0, Number(s.committedCount ?? s.holderCountValue ?? 0) - allGroupSlots(_groups))
    const _isMultiYear = (s.subscriptionPlan || '').includes('Multiple Year') && Number(s.multiYearCount) > 1
    const _baseYears = _isMultiYear ? Number(s.multiYearCount) : 1
    const _baseTotal = _basePpc > 0 && _baseCommitted > 0 ? _basePpc * _baseCommitted * _baseYears : 0
    const computedPlanTotal = isAirline
      ? (_baseTotal > 0 ? _baseTotal + _groupsAmount : getAirlineTotal(s))
      : 0
    const displayTotal = isAirline
      ? (computedPlanTotal > 0 ? computedPlanTotal : (invoiceTotal > 0 ? invoiceTotal : 0))
      : (s.price || s.totalServiceFees || 0)

    if (s.invoiceDraft && typeof s.invoiceDraft === 'object' &&
      (s.invoiceDraft.lineItems?.length || s.invoiceDraft.invoiceNumber)) {
      const draft = s.invoiceDraft
      setViewInvoice({
        invoiceNumber: s.invoiceNumber || draft.invoiceNumber,
        paidAt: s.subscriptionDate || s.updatedAt,
        subscriptionPlan: s.subscriptionPlan,
        expirationDate: s.expirationDate || null,
        amount: draft.lineItems?.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0) || displayTotal,
        name: draft.recipientCompany || draft.recipientName || s.airlineName || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        email: s.email || '',
        address: draft.recipientAddress1 || s.addressLine1 || '',
        isAirline,
        airlineName: s.airlineName || '',
        pricePerCert: s.pricePerCertificate || s.pricePerCert || null,
        holderCount: s.certificateHolders?.length || s.committedCount || null,
        invoiceDraft: { ...draft, invoiceNumber: draft.invoiceNumber || s.invoiceNumber },
      })
      return
    }

    try {
      const paymentDoc = await fetchPaymentRecord(s._id, token, activeInvoice, queuedInvoice)
      if (paymentDoc?.isPaid) {
        setViewInvoice(serverPaymentToInvoice(paymentDoc))
        return
      }
    } catch { /* fall through */ }

    try {
      const paidDate = s.subscriptionDate || s.updatedAt || s.createdAt
      setViewInvoice(buildInvoice(
        s,
        isAirline ? 'Airlines' : 'Individual',
        Math.round(displayTotal * 100),
        { id: s.stripePaymentIntentId || s.invoiceNumber || '—' },
        paidDate ? new Date(paidDate) : new Date()
      ))
    } catch (err) {
      console.error('Invoice build failed:', err)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-0 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Subscription</h1>
            {!loading && subs.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {subs.length} subscription{subs.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!loading && subs.length > 0 && (() => {
              const s = subs[0]
              const isAirline = user?.role === 'airline'
              const isPaid = s.isPaid === true || s.paymentStatus === 'paid'
              const active = isPaid
              return (
                <>
                  {active && (
                    <button
                      onClick={() => {
                        window.dispatchEvent(new Event('ifoa-subscription-manage-expand'))
                        setTimeout(() => {
                          const el = document.getElementById('current-subscription-section')
                          if (el) {
                            const yOffset = -120; // 120px offset for sticky header and margins
                            const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
                            window.scrollTo({ top: y, behavior: 'smooth' });
                          }
                        }, 400)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 hover:border-slate-300 hover:bg-slate-50 transition shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Manage Plan
                    </button>
                  )}
                  <button
                    onClick={() => setEditTarget(s)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 hover:border-slate-300 hover:bg-slate-50 transition shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" />
                    </svg>
                    Edit Form
                  </button>
                  {active && (
                    <button
                      onClick={() => handleParentInvoiceClick(s)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 hover:border-slate-300 hover:bg-slate-50 transition shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Invoices
                    </button>
                  )}
                  {isAirline && active && !s.wirePaymentRequested && (
                    <button
                      onClick={() => setUpgradeTarget(s)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Expand Holders
                    </button>
                  )}
                </>
              )
            })()}
            <button
              onClick={() => { setRefreshing(true); invalidate(`subs_${user?.id || user?.email}`); setRefreshKey(k => k + 1) }}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50 shadow-sm"
            >
              <svg className={`w-3.5 h-3.5 ${loading || refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-16 justify-center">
            <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
              <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" />
            </svg>
            <span className="text-slate-500 text-sm">Loading subscription…</span>
          </div>
        ) : subs.length === 0 ? (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Current Plan</p>
              </div>
              <div className="px-4 sm:px-6 py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
                  </svg>
                </div>
                <p className="text-slate-700 font-bold mb-1">No active subscription</p>
                <p className="text-slate-500 text-sm mb-5">Register to activate your FAA compliance service.</p>
                <Link to="/register"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all">
                  Register Now
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-center">
              <p className="text-white font-black text-lg mb-2">Choose a Plan</p>
              <p className="text-slate-300 text-sm mb-5">Starting from just $69/year for individuals.</p>
              <Link to="/#pricing" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all">
                View Plans
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
          </>
        ) : (
          <div className="space-y-8">
            {subs.map((s, idx) => (
              <SubscriptionCard
                key={s._id || idx}
                s={s}
                idx={idx}
                total={subs.length}
                user={user}
                token={token}
                highlighted={!!highlightId && String(s._id) === String(highlightId)}
                onPay={() => {
                  if (payingId === s._id) return
                  const isAirSub = user?.role === 'airline'
                  const ppcDisp = Number(s.pricePerCertificate || s.pricePerCert || 0)
                  const countDisp = Number(s.committedCount || s.holderCountValue || s.certificateHolders?.length || 0)
                  const yearsDisp = s.subscriptionPlan === 'Multiple Years Subscription Plan'
                    ? Math.max(2, Number(s.multiYearCount) || 3) : 1
                  const correctTotal = isAirSub
                    ? (ppcDisp * countDisp * yearsDisp) || Number(s.totalAmount || s.totalServiceFees || 0)
                    : Number(s.price || s.totalServiceFees || 0)
                  const enrichedSub = { ...s, _computedTotal: correctTotal }
                  setSub(enrichedSub)
                  setPayTarget(enrichedSub)
                  setPayingId(s._id)
                  setShowPayModal(true)
                }}
                onAddHolders={() => { setSub(s); setManageGroupId(''); setShowAddHolders(true) }}
                onManageGroup={(group) => { setSub(s); setManageGroupId(String(group._id || '')); setShowAddHolders(true) }}
                onUpgrade={() => setUpgradeTarget(s)}
                onViewInvoice={(inv) => setViewInvoice(inv)}
                onViewAllInvoices={(docs, reg) => setViewAllInvoices({ docs, reg })}
                onEditForm={() => setEditTarget(s)}
                onEditCert={() => setCertTarget(s)}
                onRenew={() => setRenewTarget({ sub: s, group: null })}
                onRenewGroup={(group) => setRenewTarget({ sub: s, group })}
                onCancelPlan={(planRef) => setCancelTarget({ sub: s, planRef })}
                onConvertUnlimited={() => setConvertTarget({ sub: s, group: null })}
                onConvertGroupUnlimited={(group) => setConvertTarget({ sub: s, group })}
                onShowCredits={() => setCreditsTarget(s)}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPayModal && sub && (
          <PaymentModal
            registrationId={sub?._id}
            registrationModel={user?.role === 'airline' ? 'Airlines' : 'Individual'}
            amount={Math.round((sub?._computedTotal ?? getAirlineTotal(sub) ?? sub?.price ?? sub?.totalAmount ?? sub?.totalServiceFees ?? 0) * 100)}
            subscriptionData={sub}
            onClose={() => { setShowPayModal(false); setPayTarget(null); setPayingId(null) }}
            onSuccess={async (inv) => {
              const updated = { ...sub, paymentStatus: 'paid', status: 'Active', isPaid: true }
              setSubs(prev => prev.map(s => s._id === updated._id ? updated : s))
              setSub(updated)
              cacheSet(`subs_${user?.id || user?.email}`, [updated])
              setShowPayModal(false)
              setPayTarget(null)
              setPayingId(null)
              if (inv) setViewInvoice(inv)
              try {
                const headers = { Authorization: `Bearer ${token}` }
                const isAirlineUser = user?.role === 'airline'
                const endpoint = isAirlineUser
                  ? `${BASE_URL}/airlines/${updated._id}`
                  : `${BASE_URL}/individuals/${updated._id}`
                const r = await API.get(endpoint, { headers })
                const fresh = r.data.data
                if (fresh) {
                  const freshIsPaid = fresh.isPaid === true || fresh.paymentStatus === 'paid' || fresh.status === 'Active'
                  const merged = freshIsPaid ? fresh : { ...fresh, paymentStatus: 'paid', status: 'Active', isPaid: true }
                  setSubs(prev => prev.map(s => s._id === merged._id ? merged : s))
                  setSub(merged)
                  cacheSet(`subs_${user?.id || user?.email}`, [merged])
                }
              } catch (_) { /* non-critical */ }
            }}
          />
        )}
      </AnimatePresence>

      {viewInvoice && (
        <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}

      {viewAllInvoices && (
        <AllInvoicesModal
          docs={viewAllInvoices.docs}
          reg={viewAllInvoices.reg}
          token={token}
          onClose={() => setViewAllInvoices(null)}
          onViewSingle={(inv) => { setViewAllInvoices(null); setViewInvoice(inv) }}
        />
      )}

      {showAddHolders && sub && (
        <AddHoldersModal
          sub={sub}
          token={token}
          initialGroupId={manageGroupId}
          onClose={() => { setShowAddHolders(false); setManageGroupId('') }}
          onSuccess={(result) => {
            setSubs(prev => prev.map(s => s._id === result.data?._id ? result.data : s))
            setSub(result.data)
            cacheSet(`subs_${user?.id || user?.email}`, [result.data])
            setShowAddHolders(false)
            setManageGroupId('')
          }}
        />
      )}

      {editTarget && (
        <EditSubscriptionFormModal
          sub={editTarget}
          role={user?.role}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            setSubs((prev) => prev.map((x) => x._id === updated._id ? updated : x))
            setSub((prev) => (prev?._id === updated._id ? updated : prev))
            setEditTarget(null)
          }}
        />
      )}

      {certTarget && (
        <CertificateEditModal
          sub={certTarget}
          onClose={() => setCertTarget(null)}
          onSaved={(updated) => {
            setSubs((prev) => prev.map((x) => x._id === updated._id ? updated : x))
            setSub((prev) => (prev?._id === updated._id ? updated : prev))
            setCertTarget(null)
          }}
        />
      )}

      {renewTarget && (
        <RenewModal
          sub={renewTarget.sub || renewTarget}
          group={renewTarget.group || null}
          role={user?.role}
          onClose={() => setRenewTarget(null)}
          onSaved={(updated) => {
            setSubs((prev) => prev.map((x) => x._id === updated._id ? updated : x))
            setSub((prev) => (prev?._id === updated._id ? updated : prev))
            invalidate(`subs_${user?.id || user?.email}`)
          }}
        />
      )}

      {creditsTarget && (
        <CreditsModal
          sub={creditsTarget}
          role={user?.role}
          token={token}
          onClose={() => setCreditsTarget(null)}
        />
      )}

      {convertTarget && (
        <ConvertToUnlimitedModal
          sub={convertTarget.sub || convertTarget}
          group={convertTarget.group || null}
          role={user?.role}
          onClose={() => setConvertTarget(null)}
          onSaved={(updated) => {
            if (updated) {
              setSubs((prev) => prev.map((x) => x._id === updated._id ? updated : x))
              setSub((prev) => (prev?._id === updated._id ? updated : prev))
              cacheSet(`subs_${user?.id || user?.email}`, [updated])
            }
            invalidate(`subs_${user?.id || user?.email}`)
            setConvertTarget(null)
            setRefreshKey((k) => k + 1)
          }}
        />
      )}

      {cancelTarget && (
        <CancelPlanModal
          sub={cancelTarget.sub}
          planRef={cancelTarget.planRef}
          role={user?.role}
          token={token}
          onClose={() => setCancelTarget(null)}
          onDone={(updated) => {
            if (updated) {
              setSubs((prev) => prev.map((x) => x._id === updated._id ? updated : x))
              setSub((prev) => (prev?._id === updated._id ? updated : prev))
              cacheSet(`subs_${user?.id || user?.email}`, [updated])
            }
            setCancelTarget(null)
          }}
        />
      )}

      {upgradeTarget && (
        <UpgradeHoldersModal
          sub={upgradeTarget}
          token={token}
          onClose={() => setUpgradeTarget(null)}
          onSaved={async (updated) => {
            setSubs((prev) => prev.map((x) => x._id === updated._id ? updated : x))
            setSub((prev) => (prev?._id === updated._id ? updated : prev))
            invalidate(`subs_${user?.id || user?.email}`)
            // Ensure UI reflects backend-confirmed values immediately after holder upgrade payment.
            try {
              let latest = updated
              for (let i = 0; i < 4; i += 1) {
                const fresh = await API.get(`/airlines/${updated._id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                if (fresh?.data?.data?._id) {
                  latest = fresh.data.data
                  const committedNow = Number(latest.committedCount || latest.holderCountValue || 0)
                  const committedExpected = Number(updated.committedCount || updated.holderCountValue || 0)
                  if (committedNow >= committedExpected) break
                }
                await new Promise((resolve) => setTimeout(resolve, 650))
              }
              setSubs((prev) => prev.map((x) => x._id === latest._id ? latest : x))
              setSub((prev) => (prev?._id === latest._id ? latest : prev))
              cacheSet(`subs_${user?.id || user?.email}`, [latest])
            } catch { void 0 }
          }}
        />
      )}
    </DashboardLayout>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  AllInvoicesModal                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
function AllInvoicesModal({ docs, reg, token, onClose, onViewSingle }) {
  const [selectedDoc, setSelectedDoc] = useState(null)

  const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'


  const isHolderUpgrade = (doc) =>
    doc.purpose === 'holder-upgrade' ||
    (doc.lineItems || doc.draft?.lineItems || []).some(
      li => String(li.description || '').toLowerCase().includes('upgrade') ||
        String(li.description || '').toLowerCase().includes('holder')
    )

  const isConversion = (doc) =>
    doc.purpose === 'convert-unlimited' ||
    (doc.lineItems || doc.draft?.lineItems || []).some(
      li => String(li.description || '').toLowerCase().includes('credit')
    )

  const purposeLabel = (doc) => {
    if (isConversion(doc)) return 'Upgrade to Unlimited'
    if (doc._source === 'renewal' || doc.plan) return 'Renewal'
    if (isHolderUpgrade(doc)) return 'Holder Upgrade'
    return 'Subscription'
  }

  const purposeColor = (doc) => {
    if (doc._source === 'renewal' || doc.plan) return 'bg-slate-800 text-white border-slate-700'
    if (isHolderUpgrade(doc)) return 'bg-slate-800 text-white border-slate-700'
    return 'bg-slate-800 text-white border-slate-700'
  }

  const handleView = (doc) => {
    const draftLines = doc.draft?.lineItems
    const lineItems = draftLines?.length ? draftLines : (doc.lineItems || [])
    const amount = lineItems.length
      ? lineItems.reduce((s, li) => s + (Number(li.totalPrice) || 0), 0)
      : doc.totalAmount
    const invoice = {
      invoiceNumber: doc.invoiceNumber,
      paidAt: doc.paidAt || doc.issueDate || doc.createdAt,
      subscriptionPlan: doc.subscriptionPlan || reg?.subscriptionPlan,
      expirationDate: doc.expirationDate || null,
      amount,
      name: (doc.draft?.recipientName || doc.recipientName || doc.draft?.recipientCompany || doc.recipientCompany || `${reg?.firstName || ''} ${reg?.lastName || ''}`.trim()),
      email: doc.recipientEmail || reg?.email || '',
      address: doc.draft?.recipientAddress1 || doc.recipientAddress1 || reg?.addressLine1 || '',
      isAirline: doc.isAirline ?? (reg?.airlineName ? true : false),
      airlineName: doc.draft?.recipientCompany || doc.recipientCompany || reg?.airlineName || '',
      pricePerCert: lineItems[0]?.unitPrice || null,
      holderCount: lineItems[0]?.quantity || null,
      invoiceDraft: doc.draft || null,
      paymentId: doc.stripePaymentIntentId || null,
      _invoiceDocId: doc._id,
    }
    onViewSingle(invoice)
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[88px] sm:pt-[96px] pb-4 animate-modal-backdrop">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[calc(100vh-104px)] sm:max-h-[calc(100vh-120px)] animate-modal-panel">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payment History</p>
            <h3 className="text-base font-black text-slate-900">All Invoices</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Invoice list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {(!docs || docs.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-semibold text-slate-500">No invoices available</p>
            </div>
          )}
          {docs.map((doc, i) => (
            <button
              key={String(doc._id || i)}
              onClick={() => handleView(doc)}
              className="w-full text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 hover:shadow-sm px-4 py-3 transition-all duration-150 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-bold text-slate-800">
                      {doc.invoiceNumber || '(no number)'}
                    </p>
                    <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${purposeColor(doc)}`}>
                      {purposeLabel(doc)}
                    </span>
                    {(() => {
                      // Shared status badge — single source of truth in utils/invoiceStatus.js,
                      // identical on client (individual & airline) + admin. Dynamic: follows
                      // the registration's active/queued plan.
                      const badge = getInvoiceStatus(doc, reg, { isHolderUpgrade: isHolderUpgrade(doc) })
                      if (!badge) return null
                      return <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
                    })()}
                  </div>
                  <p className="text-[11px] text-slate-500">{fmt(doc.paidAt || doc.issueDate || doc.createdAt)}</p>
                  {doc.subscriptionPlan && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{doc.subscriptionPlan}</p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-black text-slate-900">{money(
                    doc.draft?.lineItems?.length
                      ? doc.draft.lineItems.reduce((s, li) => s + (Number(li.totalPrice) || 0), 0)
                      : doc.totalAmount
                  )}</p>
                  <p className="text-[10px] text-blue-600 font-semibold mt-1 group-hover:underline">View →</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/*  SubscriptionCard                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
function SubscriptionCard({ s, idx, total, user, token, highlighted = false, onPay, onAddHolders, onManageGroup, onViewInvoice, onEditCert, onRenew, onRenewGroup, onCancelPlan, onConvertUnlimited, onConvertGroupUnlimited, onShowCredits }) {
  const navigate = useNavigate()
  const isAirline = user?.role === 'airline'
  const isPaid = s.isPaid === true || s.paymentStatus === 'paid'
  const pending = !isPaid
  const active = isPaid
  const inactive = !isPaid && (s.paymentStatus === 'failed' || s.status === 'Inactive')
  // Admin "On Hold" = account suspended (status Inactive). Surfaced in the banner even
  // when the plan was previously paid/active, so the client knows access is suspended.
  const onHold = s.status === 'Inactive'

  const isUnlimited = s.subscriptionPlan === 'Unlimited Plan'
  const daysToExpiry = s.expirationDate
    ? Math.ceil((new Date(s.expirationDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null
  const isExpired = isPaid && !isUnlimited && daysToExpiry !== null && daysToExpiry <= 0
  const hasQueuedRenewalDue = isExpired && s.nextRenewal?.paidAt &&
    s.nextRenewal.activationDate && new Date(s.nextRenewal.activationDate) <= new Date() &&
    !s._autoActivateFailed

  const [cachedInvoiceDocs, setCachedInvoiceDocs] = useState(null)

  // Holder action state
  const [holderAction, setHolderAction] = useState(null)   // { holder, holderId, action: 'remove'|'convert'|'edit' }
  const [holderActLoading, setHolderActLoading] = useState(false)
  const [holderActError, setHolderActError] = useState('')
  const [holderCredentials, setHolderCredentials] = useState(null) // { email, password, keepSubscription } shown after convert
  const [convertKeepSub, setConvertKeepSub] = useState(true)   // true = keep active, false = cancel
  const [editHolderForm, setEditHolderForm] = useState({})

  const closeHolderModal = () => { setHolderAction(null); setHolderActError(''); setConvertKeepSub(true); setEditHolderForm({}) }

  const openEditHolder = (h) => {
    setEditHolderForm({
      fullName: h.fullName || '',
      dateOfBirth: h.dateOfBirth ? h.dateOfBirth.split('T')[0] : '',
      certificateType: h.certificateType || '',
      certificateStatus: h.certificateStatus || 'EXISTING',
      faaCertificateNumber: h.faaCertificateNumber || '',
      iacraFtnNumber: h.iacraFtnNumber || '',
      email: h.email || '',
      hasSecondaryCertificate: h.hasSecondaryCertificate || false,
      secondaryCertificateType: h.secondaryCertificateType || '',
      secondaryFaaCertificateNumber: h.secondaryFaaCertificateNumber || '',
      secondaryIacraFtnNumber: h.secondaryIacraFtnNumber || '',
      holderGroupId: h.holderGroupId ? String(h.holderGroupId) : '',
    })
    setHolderAction({ holder: h, holderId: h._id, action: 'edit' })
  }

  const [showHoldersDrawer, setShowHoldersDrawer] = useState(false)
  const [holderSearch, setHolderSearch] = useState('')
  const holdersSectionRef = useRef(null)
  const subscriptionBlockRef = useRef(null)
  const cardRootRef = useRef(null)
  const [forceExpandKey, setForceExpandKey] = useState(0)

  useEffect(() => {
    const handleExpand = () => setForceExpandKey(k => k + 1)
    window.addEventListener('ifoa-subscription-manage-expand', handleExpand)
    return () => window.removeEventListener('ifoa-subscription-manage-expand', handleExpand)
  }, [])

  // Pulse + scroll when arriving from a notification "View →" for this listing.
  const [pulse, setPulse] = useState(false)
  useEffect(() => {
    if (!highlighted) return
    setPulse(true)
    const st = setTimeout(() => cardRootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120)
    const pt = setTimeout(() => setPulse(false), 2400)
    return () => { clearTimeout(st); clearTimeout(pt) }
  }, [highlighted])
  const [coords, setCoords] = useState(null)

  const updateCoords = () => {
    if (window.innerWidth < 1024) return
    if (holdersSectionRef.current) {
      const rect = holdersSectionRef.current.getBoundingClientRect()
      setCoords({
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      })
    }
  }

  useLayoutEffect(() => {
    if (showHoldersDrawer) {
      updateCoords()
      window.addEventListener('resize', updateCoords)
      window.addEventListener('scroll', updateCoords, true)
    }
    return () => {
      window.removeEventListener('resize', updateCoords)
      window.removeEventListener('scroll', updateCoords, true)
    }
  }, [showHoldersDrawer])

  const handleHolderRemove = async () => {
    if (!holderAction) return
    setHolderActLoading(true); setHolderActError('')
    try {
      await axios.delete(
        `${BASE_URL}/airlines/${s._id}/holders/${holderAction.holderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      closeHolderModal()
      // Trigger re-fetch by bumping refreshKey via parent — signal via window event
      window.dispatchEvent(new Event('ifoa-subscription-refresh'))
    } catch (err) {
      setHolderActError(err.response?.data?.message || 'Failed to remove holder.')
    } finally {
      setHolderActLoading(false)
    }
  }

  const handleHolderConvert = async () => {
    if (!holderAction) return
    setHolderActLoading(true); setHolderActError('')
    try {
      const res = await axios.post(
        `${BASE_URL}/airlines/${s._id}/holders/${holderAction.holderId}/convert`,
        { keepSubscription: convertKeepSub },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = res.data?.data || {}
      setHolderCredentials({ ...(data.credentials || {}), keepSubscription: data.keepSubscription !== false })
      closeHolderModal()
      window.dispatchEvent(new Event('ifoa-subscription-refresh'))
    } catch (err) {
      setHolderActError(err.response?.data?.message || 'Failed to convert holder.')
    } finally {
      setHolderActLoading(false)
    }
  }

  const handleHolderEdit = async () => {
    if (!holderAction) return
    setHolderActLoading(true); setHolderActError('')
    try {
      await axios.patch(
        `${BASE_URL}/airlines/${s._id}/holders/${holderAction.holderId}`,
        editHolderForm,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      closeHolderModal()
      window.dispatchEvent(new Event('ifoa-subscription-refresh'))
    } catch (err) {
      setHolderActError(err.response?.data?.message || 'Failed to update holder.')
    } finally {
      setHolderActLoading(false)
    }
  }

  useEffect(() => {
    if (!s._id || !token) return
    axios.get(`${BASE_URL}/invoices/by-registration/${s._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => setCachedInvoiceDocs(r.data?.data || [])).catch(() => setCachedInvoiceDocs([]))
  }, [s._id, token, s.nextRenewal?.paidAt, s.committedCount, s.updatedAt])

  // Only include invoices for the current subscription period.
  // Primary invoice = matches s.invoiceNumber (the live plan's invoice).
  // Holder-upgrades paid on or after s.subscriptionDate are current-period add-ons.
  // Queued renewal invoice is always excluded (future plan, not yet active).
  const hasQueuedRenewal = !!(s.nextRenewal?.paidAt && s.nextRenewal?.activationDate && new Date(s.nextRenewal.activationDate) > new Date())
  const currentInvoiceNum = s.invoiceNumber || null
  const subscriptionStart = s.subscriptionDate ? new Date(s.subscriptionDate) : null
  const invoiceTotal = cachedInvoiceDocs
    ? cachedInvoiceDocs
      .filter(doc => {
        if (hasQueuedRenewal && doc.purpose === 'renewal') return false
        if (currentInvoiceNum && doc.invoiceNumber === currentInvoiceNum) return true
        if (doc.purpose === 'holder-upgrade' && (!subscriptionStart || (doc.paidAt && new Date(doc.paidAt) >= subscriptionStart))) return true
        if (!currentInvoiceNum && doc.purpose !== 'renewal') return true
        return false
      })
      .reduce((sum, doc) => sum + (Number(doc.totalAmount) || 0), 0)
    : null

  // Grand total = current base plan + every ACTIVE holder-upgrade plan (Unlimited or
  // not-yet-expired). The base COUNT subtracts ALL group slots (committedCount = base +
  // allGroups), while the upgrade AMOUNTS added on top only include still-active plans —
  // an expired plan contributes $0.
  const _groups = s.holderGroups || []
  const _groupCounts = (g) => isActiveHolderGroup(g)
  const _groupsAmount = _groups
    .filter(_groupCounts)
    .reduce((a, g) => a + Number(g.amount || 0), 0)
  const _basePpc = Number(s.pricePerCertificate ?? s.pricePerCert ?? 0)
  const _baseCommitted = Math.max(0, Number(s.committedCount ?? s.holderCountValue ?? 0) - allGroupSlots(_groups))
  const _isMultiYear = (s.subscriptionPlan || '').includes('Multiple Year') && Number(s.multiYearCount) > 1
  const _baseYears = _isMultiYear ? Number(s.multiYearCount) : 1
  const _baseTotal = _basePpc > 0 && _baseCommitted > 0 ? _basePpc * _baseCommitted * _baseYears : 0
  // When base can be computed, add the upgrade plans on top; otherwise fall back to
  // the legacy stored total (which already bakes everything in).
  const computedPlanTotal = isAirline
    ? (_baseTotal > 0 ? _baseTotal + _groupsAmount : getAirlineTotal(s))
    : 0
  const displayTotal = isAirline
    ? (computedPlanTotal > 0 ? computedPlanTotal : (invoiceTotal != null && invoiceTotal > 0 ? invoiceTotal : 0))
    : (s.price || s.totalServiceFees)



  const bannerCls = onHold
    ? 'bg-gradient-to-r from-slate-700 to-slate-800'
    : active || isExpired
    ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
    : inactive
      ? 'bg-gradient-to-r from-slate-600 to-slate-700'
      : s.status === 'Active'
        ? 'bg-gradient-to-r from-slate-800 to-slate-700'
        : 'bg-gradient-to-br from-slate-500 to-slate-600'

  return (
    <div ref={cardRootRef} className={`space-y-5 relative scroll-mt-24 rounded-2xl transition-all duration-500 ${pulse ? 'ring-2 ring-blue-400/60 ring-offset-4 ring-offset-slate-50' : ''}`}>
      {total > 1 && (
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center">
            {idx + 1}
          </span>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            Subscription #{idx + 1}
          </p>
        </div>
      )}

      {hasQueuedRenewalDue && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 sm:p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
              <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-900">Activating your renewal…</p>
            <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
              Your new <strong>{s.nextRenewal.plan}</strong> plan is being activated. This page will update automatically.
            </p>
          </div>
        </div>
      )}

      {isExpired && !s.nextRenewal?.paidAt && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-stretch">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 flex-1 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Subscription Expired</p>
                  <p className="text-xs text-slate-500 mt-0.5">Renew to restore FAA compliance coverage and keep certifications active.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {pending && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Payment pending</p>
                <p className="text-xs text-slate-500 leading-relaxed">Complete your payment to activate this subscription.</p>
                <button
                  onClick={() => navigate('/register', {
                    state: {
                      forcePlanChangeStart: true,
                      forceRegType: isAirline ? 'airline' : 'individual',
                    },
                  })}
                  className="text-xs font-semibold text-blue-600 hover:underline mt-1 inline-block"
                >
                  Change plan ↗
                </button>
              </div>
            </div>
            <button
              onClick={onPay}
              className="flex-shrink-0 inline-flex items-center justify-center gap-2 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all w-full sm:w-auto" style={{ background: '#0000ff' }}
              onMouseEnter={e => e.currentTarget.style.background = '#0000e6'}
              onMouseLeave={e => e.currentTarget.style.background = '#0000ff'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
              </svg>
              Pay Now
            </button>
          </div>
        </div>
      )}

      <div className={`rounded-2xl p-5 sm:p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${bannerCls}`}>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
              {onHold
                ? 'On Hold'
                : active && !isExpired
                ? 'Active Subscription'
                : inactive
                  ? 'Inactive Subscription'
                  : s.status === 'Active'
                    ? 'Pending Payment'
                    : 'Pending Subscription'}
            </p>
            {isExpired && (
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 border border-amber-500/40 bg-amber-500/10 rounded-full px-2 py-0.5">
                Expired
              </span>
            )}
          </div>
          <PlanBadge plan={s.subscriptionPlan} />
          {isExpired && s.expirationDate && (
            <p className="text-[11px] text-white/40 mt-1.5">Expired {fmtYMD(s.expirationDate)}</p>
          )}
        </div>
        <div className="sm:text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
            {isAirline ? 'Total Amount' : 'Plan Price'}
          </p>
          <p className="text-2xl sm:text-3xl font-black text-white">
            {money(displayTotal)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Plan Details</p>
        </div>
        <div className="px-4 sm:px-6 py-2">
          {isAirline ? (
            <>
              <Row label="Airline Name" value={s.airlineName} />
              <Row label="Subscription Plan" value={s.subscriptionPlan} />
              <Row label="Payment Status" value={<PayBadge status={s.paymentStatus} />} />
              <Row
                label="Subscription Start Date"
                value={
                  s.subscriptionDate
                    ? <span className="font-semibold text-slate-900">{fmtYMD(s.subscriptionDate)}</span>
                    : active ? fmtYMD(s.updatedAt) : 'Activates on payment'
                }
              />
              <Row
                label="Expiration Date"
                value={
                  s.subscriptionPlan === 'Unlimited Plan'
                    ? 'Never (Unlimited ∞)'
                    : s.expirationDate
                      ? isExpired
                        ? <span className="inline-flex items-center gap-1.5"><span className="font-semibold text-slate-900">{fmtYMD(s.expirationDate)}</span><span className="text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-1.5 py-0.5">Expired</span></span>
                        : <span className="font-semibold text-slate-900">{fmtYMD(s.expirationDate)}</span>
                      : active ? '—' : 'Activates on payment'
                }
              />
              <Row label="Price per Certificate" value={money(s.pricePerCertificate || s.pricePerCert)} />
              <Row label="Certificate Holders" value={`${s.certificateHolders?.length || 0} / ${s.committedCount || s.holderCountValue || s.certificateHolders?.length || 0} holder(s)`} />
              {s.subscriptionPlan === 'Multiple Years Subscription Plan' && Number(s.multiYearCount) > 1 && (
                <Row label="Plan Duration" value={`${s.multiYearCount} years`} />
              )}
              <Row label="Total Amount" value={money(displayTotal)} />

              {/* ── Subscription Plans — base plan + each added counter plan ── */}
              {(() => {
                const groupCount = Array.isArray(s.holderGroups) ? s.holderGroups.length : 0
                return (
                  <div id="current-subscription-section" ref={subscriptionBlockRef} className="py-5 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-1 rounded-full bg-slate-900" />
                        <p className="text-sm font-extrabold text-slate-900">Current Subscription</p>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">{1 + groupCount} plan{groupCount ? 's' : ''}</span>
                    </div>
                    <ActiveSubscriptionBlock
                      s={s}
                      active={active}
                      onAddHolders={s.wirePaymentRequested ? null : onAddHolders}
                      onManageGroup={onManageGroup}
                      onRenew={s.wirePaymentRequested ? null : onRenew}
                      onRenewGroup={s.wirePaymentRequested ? null : onRenewGroup}
                      onCancelPlan={s.wirePaymentRequested ? null : onCancelPlan}
                      onConvertUnlimited={s.wirePaymentRequested ? null : onConvertUnlimited}
                      onConvertGroupUnlimited={s.wirePaymentRequested ? null : onConvertGroupUnlimited}
                      onShowCredits={onShowCredits}
                      forceExpandKey={forceExpandKey}
                    />
                  </div>
                )
              })()}

              {(() => {
                const remaining = (s.committedCount || 0) - (s.certificateHolders?.length || 0)
                if (remaining > 0) return (
                  <div className="py-3 border-b border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-xs font-bold text-slate-700">{remaining} slot{remaining !== 1 ? 's' : ''} not yet filled</p>
                        <p className="text-xs text-slate-500 mt-0.5">Total payment covers all committed slots.</p>
                      </div>
                      {!s.wirePaymentRequested && (
                        <button onClick={onAddHolders}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-white text-xs font-semibold rounded-lg transition-all w-full sm:w-auto"
                          style={{ background: '#0000ff' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#0000e6'}
                          onMouseLeave={e => e.currentTarget.style.background = '#0000ff'}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          Add Certificate Holder
                        </button>
                      )}
                    </div>
                  </div>
                )
                return null
              })()}
              <Row label="Country" value={countryDisplayName(s.country)} />
              <Row label="Submitted" value={fmt(s.submittedAt || s.createdAt)} />
              {s.certificateHolders?.length > 0 && (() => {
                return (
                  <div ref={holdersSectionRef} className="py-3 border-b border-slate-100">
                    <button
                      onClick={() => { setShowHoldersDrawer(v => !v); setHolderSearch('') }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-800">
                            {s.certificateHolders.length} Certificate Holder{s.certificateHolders.length !== 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-slate-500">{showHoldersDrawer ? 'Hide holders' : 'View all holders'}</p>
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: showHoldersDrawer ? 180 : 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                      >
                        <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </motion.div>
                    </button>
                  </div>
                )
              })()}
            </>
          ) : (
            <>
              <Row label="Subscription Plan" value={s.subscriptionPlan} />
              <Row label="Status" value={<PayBadge status={s.status || s.paymentStatus} />} />
              <Row label="Payment Status" value={<PayBadge status={s.paymentStatus} />} />
              <Row label="Plan Price" value={money(s.price)} />
              <Row
                label="Subscription Start Date"
                value={
                  active && s.subscriptionDate
                    ? <span className="font-semibold text-slate-900">{fmtYMD(s.subscriptionDate)}</span>
                    : 'Activates on payment'
                }
              />
              <Row
                label="Expiration Date"
                value={
                  !active
                    ? 'Activates on payment'
                    : s.subscriptionPlan === 'Unlimited Plan'
                      ? 'Never (Unlimited)'
                      : s.expirationDate
                        ? isExpired
                          ? <span className="inline-flex items-center gap-1.5"><span className="font-semibold text-slate-900">{fmtYMD(s.expirationDate)}</span><span className="text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-1.5 py-0.5">Expired</span></span>
                          : <span className="font-semibold text-slate-900">{fmtYMD(s.expirationDate)}</span>
                        : '—'
                }
              />
              <Row label="Primary Certificate" value={s.primaryCertificate} />
              <Row label="Certificate Type" value={s.primaryAirmanCertificate} />
              {/* Always show certificate numbers — primary and secondary — even when blank. */}
              <Row label="FAA Certificate #" value={s.faaCertificateNumber || '—'} />
              <Row label="IACRA Tracking # (FTN)" value={s.iacraTrackingNumber || '—'} />
              <Row label="Secondary FAA Certificate #" value={s.secondaryFaaCertificateNumber || '—'} />
              <Row label="Secondary IACRA FTN #" value={s.secondaryIacraTrackingNumber || '—'} />
              <Row label="Submitted" value={fmt(s.submittedAt || s.createdAt)} />
              <div id="current-subscription-section" ref={subscriptionBlockRef} className="py-5 scroll-mt-24">
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-4 w-1 rounded-full bg-slate-900" />
                  <p className="text-sm font-extrabold text-slate-900">Current Subscription</p>
                </div>
                <IndividualSubscriptionBlock
                  s={s}
                  active={active}
                  onUpgrade={s.wirePaymentRequested ? undefined : onConvertUnlimited}
                  onShowCredits={onShowCredits}
                  onRenew={s.wirePaymentRequested ? undefined : onRenew}
                  onEditCert={onEditCert}
                  forceExpandKey={forceExpandKey}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Certificate Holders Panel — absolute right of card, in viewport right-space ── */}
      <AnimatePresence>
        {showHoldersDrawer && s.certificateHolders?.length > 0 && (() => {
          const filteredHP = (s.certificateHolders || []).filter(h =>
            !holderSearch.trim() ||
            h.fullName?.toLowerCase().includes(holderSearch.toLowerCase()) ||
            h.faaCertificateNumber?.toLowerCase().includes(holderSearch.toLowerCase()) ||
            h.iacraFtnNumber?.toLowerCase().includes(holderSearch.toLowerCase())
          )

          // Calculate coordinates
          const popupWidth = 360
          const margin = 12
          let popupStyle = {}
          let isDesktopPositioned = false

          if (coords && window.innerWidth >= 1024) {
            const rightSpace = window.innerWidth - coords.right
            const leftSpace = coords.left

            let left = coords.right + margin
            let top = coords.top

            if (rightSpace < popupWidth + 24) {
              if (leftSpace > popupWidth + 24) {
                left = coords.left - popupWidth - margin
              } else {
                left = Math.max(margin, window.innerWidth - popupWidth - 24)
              }
            }

            const approxHeight = 580
            if (top + approxHeight > window.innerHeight) {
              top = Math.max(margin, window.innerHeight - approxHeight - 24)
            }

            popupStyle = {
              position: 'fixed',
              top: `${top}px`,
              left: `${left}px`,
              width: `${popupWidth}px`,
              // Bound the panel to the viewport so the list scrolls instead of
              // overflowing off-screen (bottom holders + their buttons were cut off).
              maxHeight: `${window.innerHeight - top - margin}px`,
              display: 'flex',
              flexDirection: 'column',
            }
            isDesktopPositioned = true
          }

          return (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className={`fixed z-50 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xl flex flex-col ${isDesktopPositioned
                ? ""
                : "top-24 bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-[360px] max-h-[calc(100vh-7rem)]"
                }`}
              style={popupStyle}
            >
              {/* Panel header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: '#000' }}>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-none mb-0.5">Certificate Holders</p>
                    <p className="text-sm font-black text-slate-900 leading-none">
                      {s.certificateHolders.length} <span className="text-slate-500 font-semibold text-xs">total</span>
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowHoldersDrawer(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search */}
              <div className="px-4 py-2 border-b border-slate-100 bg-white">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  <input
                    autoFocus
                    value={holderSearch}
                    onChange={e => setHolderSearch(e.target.value)}
                    placeholder="Search name, FAA #, FTN…"
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-50 transition"
                  />
                </div>
              </div>

              {/* Holder list */}
              <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
                {filteredHP.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-xs font-semibold text-slate-500">No match for "{holderSearch}"</p>
                  </div>
                ) : filteredHP.map((h, i) => (
                  <div key={h._id || i} className="px-4 py-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-start gap-2.5 mb-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-[9px] font-black text-slate-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate leading-tight">{h.fullName}</p>
                          <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border flex-shrink-0 bg-slate-100 border-slate-200 text-slate-500">
                            {h.certificateStatus || 'NEW'}
                          </span>
                        </div>
                        {(() => {
                          const pInfo = holderPlanInfo(h, s)
                          const exp = getExpiryStatus(pInfo.expiry)
                          return (
                            <span className="mt-1 inline-flex flex-wrap items-center gap-1">
                              <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${pInfo.isGroup
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                                }`}>
                                {pInfo.label}{pInfo.isGroup ? ' · upgrade' : ''}
                              </span>
                              {exp && <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${exp.cls}`}>{exp.label}</span>}
                            </span>
                          )
                        })()}
                        {h.certificateType && (
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{h.certificateType}</p>
                        )}
                        {/* Always show both primary and secondary certificate numbers (blank → —). */}
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                          <p className="text-[10px] text-slate-500"><span className="font-bold text-slate-500">FAA</span> {h.faaCertificateNumber || '—'}</p>
                          <p className="text-[10px] text-slate-500"><span className="font-bold text-slate-500">FTN</span> {h.iacraFtnNumber || '—'}</p>
                          <p className="text-[10px] text-slate-500"><span className="font-bold text-slate-500">Sec. FAA</span> {h.secondaryFaaCertificateNumber || '—'}</p>
                          <p className="text-[10px] text-slate-500"><span className="font-bold text-slate-500">Sec. FTN</span> {h.secondaryIacraFtnNumber || '—'}</p>
                        </div>
                      </div>
                    </div>
                    {active && h._id && (
                      <div className="flex items-center gap-1.5 pl-[34px]">
                        <button
                          onClick={() => openEditHolder(h)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>
                          Edit
                        </button>
                        <button
                          onClick={() => setHolderAction({ holder: h, holderId: h._id, action: 'convert' })}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          Convert
                        </button>
                        <button
                          onClick={() => setHolderAction({ holder: h, holderId: h._id, action: 'remove' })}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white text-[10px] font-bold text-slate-500 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer count when scrollable */}
              {s.certificateHolders.length > 4 && (
                <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
                  <p className="text-[10px] text-slate-500 font-medium text-center">
                    {filteredHP.length} of {s.certificateHolders.length} holders
                  </p>
                </div>
              )}
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* Upcoming/Queued Next Plan card removed — each plan now shows its own renewal status inline. */}
      {false && (() => {
        const nr = s.nextRenewal
        // Airline fallback: divide by (ppc × count) not just ppc
        const airlinePricePerYear = isAirline
          ? (s.pricePerCertificate || 55) * (nr.committedCount || s.committedCount || s.certificateHolders?.length || 1)
          : 55
        const nrPlanLabel = nr.plan === 'Multiple Years Subscription Plan'
          ? `Multiple Years (${Number(nr.multiYearCount) > 1
            ? Number(nr.multiYearCount)
            : Math.max(2, Math.round((nr.price || 0) / airlinePricePerYear))
          } yrs)`
          : nr.plan === 'Unlimited Plan'
            ? 'Unlimited Plan (Lifetime)'
            : (nr.plan || '—')

        const activationDate = nr.activationDate ? new Date(nr.activationDate) : null

        if (!activationDate || activationDate <= new Date()) return null

        return (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 overflow-hidden">
            <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-emerald-100 bg-emerald-100/60">
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-800">Next Subscription Plan</p>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                  Activates on {fmtYMD(activationDate)} — when your current plan expires
                </p>
              </div>
              <span className="ml-auto text-[10px] font-semibold text-emerald-600">
                Paid {fmt(nr.paidAt)}
              </span>
            </div>

            <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Plan</span>
                <span className="text-sm font-bold text-slate-800">{nrPlanLabel}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Starts On</span>
                <span className="text-sm font-semibold text-slate-800">{fmtYMD(activationDate)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                  {nr.plan === 'Unlimited Plan' ? 'Duration' : 'Expires On'}
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {nr.plan === 'Unlimited Plan' ? 'Lifetime (No Expiry)' : fmtYMD(nr.expiresAt)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Amount Paid</span>
                <span className="text-sm font-semibold text-slate-800">
                  {nr.price != null ? `$${Number(nr.price).toFixed(2)}` : '—'}
                </span>
              </div>
            </div>

            <div className="px-4 sm:px-6 pb-4">
              <div className="rounded-xl bg-emerald-100/70 border border-emerald-200 px-4 py-3">
                <p className="text-xs text-emerald-700 leading-relaxed">
                  ✓ Your renewal is confirmed and queued. Your current plan remains fully active until <strong>{fmtYMD(s.expirationDate)}</strong>. This new plan starts automatically on <strong>{fmtYMD(activationDate)}</strong> — no action needed.
                </p>
                {(nr.invoiceNumber || cachedInvoiceDocs?.find(d => d.purpose === 'renewal')?.invoiceNumber) && (() => {
                  const renewalInvoiceNum = cachedInvoiceDocs?.find(d => d.purpose === 'renewal')?.invoiceNumber || nr.invoiceNumber
                  return (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <p className="text-[10px] text-emerald-500 font-mono">Invoice: {renewalInvoiceNum}</p>
                      <button
                        onClick={() => {
                          const renewalDoc = cachedInvoiceDocs?.find(
                            d => d.purpose === 'renewal' &&
                              (d.invoiceNumber === renewalInvoiceNum || d.invoiceNumber === nr.invoiceNumber)
                          )
                          if (renewalDoc) {
                            onViewInvoice?.({
                              invoiceNumber: renewalDoc.invoiceNumber,
                              paidAt: renewalDoc.paidAt || renewalDoc.issueDate || renewalDoc.createdAt,
                              subscriptionPlan: renewalDoc.subscriptionPlan || nr.plan || s.subscriptionPlan,
                              multiYearCount: nr.multiYearCount || null,
                              expirationDate: renewalDoc.expirationDate || nr.expiresAt || null,
                              amount: renewalDoc.totalAmount,
                              name: renewalDoc.recipientName || renewalDoc.recipientCompany || (isAirline ? (s.airlineName || '') : `${s.firstName || ''} ${s.lastName || ''}`.trim()),
                              email: renewalDoc.recipientEmail || s.email || s.contactEmail || '',
                              address: renewalDoc.recipientAddress1 || s.addressLine1 || '',
                              isAirline: renewalDoc.isAirline ?? isAirline,
                              airlineName: renewalDoc.recipientCompany || s.airlineName || '',
                              pricePerCert: renewalDoc.lineItems?.[0]?.unitPrice || null,
                              holderCount: renewalDoc.lineItems?.[0]?.quantity || null,
                              invoiceDraft: renewalDoc.draft || null,
                              paymentId: renewalDoc.stripePaymentIntentId || null,
                              _invoiceDocId: renewalDoc._id,
                            })
                          } else {
                            onViewInvoice?.({
                              invoiceNumber: renewalInvoiceNum,
                              paidAt: nr.paidAt,
                              subscriptionPlan: nr.plan,
                              multiYearCount: nr.multiYearCount || null,
                              expirationDate: nr.expiresAt || null,
                              amount: nr.price,
                              name: isAirline ? (s.airlineName || '') : `${s.firstName || ''} ${s.lastName || ''}`.trim(),
                              email: s.email || s.contactEmail || '',
                              address: s.addressLine1 || '',
                              isAirline,
                              airlineName: s.airlineName || '',
                              holderCount: nr.committedCount || s.committedCount || s.certificateHolders?.length || null,
                            })
                          }
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 border border-emerald-300 bg-white rounded-md px-2 py-0.5 hover:bg-emerald-50 transition"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Preview Invoice
                      </button>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Holder Remove Confirm Modal ─────────────────────────────────── */}
      {holderAction?.action === 'remove' && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-modal-backdrop">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-modal-panel-sm">
            <div className="px-6 py-5 border-b border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-0.5">Remove Holder</p>
              <h2 className="text-base font-extrabold text-slate-900">Remove {holderAction.holder.fullName}?</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed">
                This will remove <strong>{holderAction.holder.fullName}</strong> from your airline subscription. Their access to the Agent for Service will be revoked.
              </p>
              {holderActError && <p className="text-xs text-red-600 font-semibold">{holderActError}</p>}
            </div>
            <div className="px-6 pb-5 flex gap-2.5">
              <button onClick={closeHolderModal} disabled={holderActLoading}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleHolderRemove} disabled={holderActLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition disabled:opacity-60">
                {holderActLoading ? 'Removing…' : 'Remove Holder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Holder Convert Confirm Modal ─────────────────────────────────── */}
      {holderAction?.action === 'convert' && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-modal-backdrop">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-modal-panel-sm">
            <div className="px-6 py-5 border-b border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Convert to Individual</p>
              <h2 className="text-base font-extrabold text-slate-900">Convert {holderAction.holder.fullName}?</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed">
                <strong>{holderAction.holder.fullName}</strong> will be removed from your airline plan and given their own login account.
              </p>

              {/* Subscription option */}
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Subscription after conversion:</p>
              <div className="space-y-2">
                <button type="button" onClick={() => setConvertKeepSub(true)}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition ${convertKeepSub ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${convertKeepSub ? 'border-emerald-500' : 'border-slate-300'}`}>
                      {convertKeepSub && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Keep subscription active</p>
                      <p className="text-xs text-slate-500 mt-0.5">Current plan, start date, and expiry are carried over. No new payment required — already covered.</p>
                    </div>
                  </div>
                </button>
                <button type="button" onClick={() => setConvertKeepSub(false)}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition ${!convertKeepSub ? 'border-slate-700 bg-slate-50 ring-2 ring-slate-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${!convertKeepSub ? 'border-slate-700' : 'border-slate-300'}`}>
                      {!convertKeepSub && <div className="w-2 h-2 rounded-full bg-slate-700" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Cancel subscription</p>
                      <p className="text-xs text-slate-500 mt-0.5">Account created with no active plan. Holder can subscribe independently when ready.</p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Login credentials:</p>
                <p className="text-sm text-slate-800 font-semibold">Email: {holderAction.holder.email || <span className="text-red-500">No email on file</span>}</p>
                <p className="text-sm text-slate-800 font-semibold">Password: <span className="font-mono">{(holderAction.holder.fullName || '').toLowerCase().replace(/\s+/g, '')}</span> <span className="text-[10px] font-medium text-slate-500">(full name, no spaces)</span></p>
              </div>
              {!holderAction.holder.email && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-xs text-red-600 font-semibold">This holder has no email address. Add their email first before converting.</p>
                </div>
              )}
              {holderActError && <p className="text-xs text-red-600 font-semibold">{holderActError}</p>}
            </div>
            <div className="px-6 pb-5 flex gap-2.5">
              <button onClick={closeHolderModal} disabled={holderActLoading}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleHolderConvert} disabled={holderActLoading || !holderAction.holder.email}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition disabled:opacity-60">
                {holderActLoading ? 'Converting…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Holder Edit Modal ─────────────────────────────────────────────── */}
      {holderAction?.action === 'edit' && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-modal-backdrop">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-modal-panel-sm">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-0.5">Edit Holder</p>
                <h2 className="text-base font-extrabold text-slate-900">{holderAction.holder.fullName}</h2>
              </div>
              <button onClick={closeHolderModal} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-3 max-h-[65vh] overflow-y-auto">
              {/* Row: Full Name + Date of Birth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input type="text" value={editHolderForm.fullName || ''}
                    onChange={e => setEditHolderForm(f => ({ ...f, fullName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Date of Birth</label>
                  <input type="date" value={editHolderForm.dateOfBirth || ''}
                    onChange={e => setEditHolderForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition" />
                </div>
              </div>
              {/* Row: Certificate Type + Certificate Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Certificate Type <span className="text-red-500">*</span></label>
                  <select value={editHolderForm.certificateType || ''}
                    onChange={e => setEditHolderForm(f => ({ ...f, certificateType: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition bg-white">
                    <option value="">Select type…</option>
                    {['Part 61 - Pilot', 'Part 61 - Flight or Ground Instructor', 'Part 65 - Aircraft Dispatcher', 'Part 107 - Remote Pilot'].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Certificate Status</label>
                  <select value={editHolderForm.certificateStatus || 'EXISTING'}
                    onChange={e => setEditHolderForm(f => ({ ...f, certificateStatus: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition bg-white">
                    <option value="EXISTING">EXISTING</option>
                    <option value="NEW">NEW</option>
                  </select>
                </div>
              </div>
              {/* Row: FAA # + IACRA FTN # */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">FAA Certificate # <span className="text-red-500">*</span></label>
                  <input type="text" value={editHolderForm.faaCertificateNumber || ''}
                    onChange={e => setEditHolderForm(f => ({ ...f, faaCertificateNumber: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">IACRA FTN # <span className="text-red-500">*</span></label>
                  <input type="text" value={editHolderForm.iacraFtnNumber || ''}
                    onChange={e => setEditHolderForm(f => ({ ...f, iacraFtnNumber: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition" />
                </div>
              </div>
              {/* Holder Email */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Holder Email</label>
                <input type="email" value={editHolderForm.email || ''} placeholder="holder@airline.com"
                  onChange={e => setEditHolderForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition" />
              </div>
              {/* Plan group assignment — which paid plan this holder is on */}
              {Array.isArray(s.holderGroups) && s.holderGroups.length > 0 && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Plan</label>
                  <select value={editHolderForm.holderGroupId || ''}
                    onChange={e => setEditHolderForm(f => ({ ...f, holderGroupId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition">
                    <option value="">Base plan — {planShortLabel(s.subscriptionPlan, s.multiYearCount)}</option>
                    {s.holderGroups.map((g, gi) => (
                      <option key={String(g._id || gi)} value={String(g._id)}>
                        {planShortLabel(g.plan, g.multiYearCount)} upgrade ({g.count} slots)
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {/* Secondary certificate checkbox */}
              <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${editHolderForm.hasSecondaryCertificate ? 'border-blue-400 bg-blue-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <input type="checkbox" checked={!!editHolderForm.hasSecondaryCertificate}
                  onChange={e => setEditHolderForm(f => ({ ...f, hasSecondaryCertificate: e.target.checked }))}
                  className="w-4 h-4 rounded accent-blue-600" />
                <span className="text-sm font-semibold text-slate-700">This holder has a secondary FAA certificate</span>
              </label>
              {/* Secondary certificate details */}
              {editHolderForm.hasSecondaryCertificate && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 px-4 py-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Secondary Certificate Details</p>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Secondary Certificate Type <span className="text-red-500">*</span></label>
                    <select value={editHolderForm.secondaryCertificateType || ''}
                      onChange={e => setEditHolderForm(f => ({ ...f, secondaryCertificateType: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition bg-white">
                      <option value="">Select secondary type…</option>
                      {['Part 61 - Pilot', 'Part 61 - Flight or Ground Instructor', 'Part 65 - Aircraft Dispatcher', 'Part 107 - Remote Pilot'].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Secondary FAA Cert #</label>
                      <input type="text" value={editHolderForm.secondaryFaaCertificateNumber || ''} placeholder="Secondary FAA Cert #"
                        onChange={e => setEditHolderForm(f => ({ ...f, secondaryFaaCertificateNumber: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Secondary IACRA FTN #</label>
                      <input type="text" value={editHolderForm.secondaryIacraFtnNumber || ''} placeholder="FTN-XXXXXXXX"
                        onChange={e => setEditHolderForm(f => ({ ...f, secondaryIacraFtnNumber: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition" />
                    </div>
                  </div>
                </div>
              )}
              {holderActError && <p className="text-xs text-red-600 font-semibold">{holderActError}</p>}
            </div>
            <div className="px-6 pb-5 flex gap-2.5">
              <button onClick={closeHolderModal} disabled={holderActLoading}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleHolderEdit} disabled={holderActLoading}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition disabled:opacity-60"
                style={{ background: '#0000ff' }}
                onMouseEnter={e => { if (!holderActLoading) e.currentTarget.style.background = '#0000e6' }}
                onMouseLeave={e => e.currentTarget.style.background = '#0000ff'}>
                {holderActLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Credentials Display Modal (after convert success) ─────────────── */}
      {holderCredentials && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-modal-backdrop">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-modal-panel-sm">
            <div className="px-6 py-5 border-b border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Conversion Successful</p>
              <h2 className="text-base font-extrabold text-slate-900">Individual Account Created</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              {holderCredentials.keepSubscription ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                  <p className="text-xs font-bold text-emerald-700">Subscription kept active — plan and expiry carried over from your airline account.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-xs font-bold text-slate-600">Account created with no active plan. Holder can subscribe independently when ready.</p>
                </div>
              )}
              <p className="text-sm text-slate-600">Share these login details with the holder. They can log in and change their password on first sign-in.</p>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 space-y-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Email (Username)</p>
                  <p className="font-mono text-sm font-bold text-slate-900 break-all">{holderCredentials.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Temporary Password</p>
                  <p className="font-mono text-sm font-bold text-slate-900">{holderCredentials.password}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">They will be prompted to change their password on first login.</p>
            </div>
            <div className="px-6 pb-5">
              <button onClick={() => setHolderCredentials(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
