import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useDataCache } from '../../context/DataCacheContext'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import axios from 'axios'
import PaymentModal from '../../components/payment/PaymentModal'
import InvoiceModal, { downloadInvoicePDF } from '../../components/payment/InvoiceModal'
import { buildInvoice, serverPaymentToInvoice } from '../../components/payment/PaymentModal'
import { getAirlineTotal } from '../../utils/airlineTotal'

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
]

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const API = axios.create({ baseURL: BASE_URL })

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('ifoa_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

async function fetchPaymentRecord(registrationId, token) {
  try {
    const res = await axios.get(`${BASE_URL}/payments/by-registration/${registrationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payments = res.data.data || []
    return payments.find(p => p.isPaid) || payments[0] || null
  } catch {
    return null
  }
}

function PlanBadge({ plan }) {
  const map = {
    '1 Year Subscription Plan': 'bg-blue-50 border-blue-200 text-blue-700',
    'Multiple Years Subscription Plan': 'bg-slate-100 border-slate-300 text-slate-700',
    'Unlimited Plan': 'bg-emerald-50 border-emerald-200 text-emerald-700',
  }
  return <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${map[plan] || 'bg-slate-50 border-slate-200 text-slate-600'}`}>{plan || 'Unknown Plan'}</span>
}

function PayBadge({ status }) {
  const map = {
    paid: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    pending: 'bg-blue-50 border-blue-200 text-blue-700',
    failed: 'bg-red-50 border-red-200 text-red-700',
    Active: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    Pending: 'bg-blue-50 border-blue-200 text-blue-700',
    Inactive: 'bg-slate-100 border-slate-200 text-slate-500'
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${map[status] || 'bg-slate-50 border-slate-200 text-slate-600'}`}>
      {status || 'Pending'}
    </span>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-3 border-b border-slate-100 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:w-52 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-slate-800 break-words min-w-0">{value ?? '—'}</span>
    </div>
  )
}

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
const money = (n) => n != null ? `${Number(n).toFixed(2)}` : '—'

const INDIVIDUAL_CERT_TYPES = [
  'Part 65 - Aircraft Dispatcher',
  'Part 61 - Pilot',
  'Part 61 - Flight or Ground Instructor',
]

const AIRLINE_CERT_TYPES = [
  'Part 61 - Pilot',
  'Part 61 - Flight or Ground Instructor',
  'Part 65 - Aircraft Dispatcher',
]

/* ─────────────────────────────────────────────────────────────────────────── */
/*  EditSubscriptionFormModal                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
function EditSubscriptionFormModal({ sub, role, onClose, onSaved }) {
  const isAirline = role === 'airline'
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [limitWarning, setLimitWarning] = useState('')
  const maxHolders = isAirline
    ? Number(sub.committedCount || sub.holderCountValue || sub.certificateHolders?.length || 0)
    : 0

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

  const addHolder = () => {
    const current = form.certificateHolders?.length || 0
    if (maxHolders > 0 && current >= maxHolders) {
      setLimitWarning(`You selected an exact count of ${maxHolders}. You cannot add more holders.`)
      setError('')
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

  const removeHolder = (index) => {
    setLimitWarning('')
    setForm((prev) => ({
      ...prev,
      certificateHolders: prev.certificateHolders.filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    if (isAirline && maxHolders > 0 && (form.certificateHolders?.length || 0) > maxHolders) {
      setError(`Holder count cannot exceed the selected exact count (${maxHolders}).`)
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = isAirline
        ? {
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
            certificateHolders: (form.certificateHolders || []).map((h) => ({
              ...h,
              dateOfBirth: h.dateOfBirth || null,
            })),
          }
        : {
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

  /* Lock body scroll when modal is open */
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal card — scrollable internally */}
      <div className="relative z-10 w-full max-w-4xl my-8 rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[calc(100vh-4rem)] overflow-y-auto">

        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between rounded-t-2xl sticky top-0 z-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Edit Form Details</p>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              {isAirline ? 'Airline Registration Data' : 'Individual Registration Data'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 flex items-center justify-center flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {isAirline ? (
            <>
              {/* ── Company & Contact ── */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Company &amp; Contact</p>
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
                    <input className={inp} placeholder="+1 555 000 0000" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Date of Birth</label>
                    <input type="date" className={inp + ' [color-scheme:light]'} value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* ── Address ── */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Address</p>
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
                    <input className={inp} placeholder="Country" value={form.country} onChange={(e) => setField('country', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* ── Certificate Holders ── */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Certificate Holders</p>
                  <button onClick={addHolder} className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">+ Add Holder</button>
                </div>
                {maxHolders > 0 && (
                  <p className="text-[11px] text-slate-500">
                    Committed slots: <span className="font-bold text-slate-700">{maxHolders}</span>&nbsp;·&nbsp;Currently filled: <span className="font-bold text-slate-700">{form.certificateHolders?.length || 0}</span>
                  </p>
                )}
                {limitWarning && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{limitWarning}</div>
                )}
                <div className="space-y-4">
                  {(form.certificateHolders || []).map((h, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white">
                      {/* Holder header */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100 rounded-t-xl">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">{i + 1}</div>
                          <span className="text-xs font-bold text-slate-700 truncate">{h.fullName?.trim() || `Holder #${i + 1}`}</span>
                        </div>
                        <button onClick={() => removeHolder(i)} className="text-xs font-semibold text-red-500 hover:text-red-600 hover:underline flex-shrink-0 ml-2">Remove</button>
                      </div>

                      {/* Holder fields */}
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Full Name <span className="text-red-400">*</span></label>
                            <input className={inpSm} placeholder="Full legal name" value={h.fullName} onChange={(e) => setHolder(i, 'fullName', e.target.value)} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Date of Birth <span className="text-red-400">*</span></label>
                            <input type="date" className={inpSm + ' [color-scheme:light]'} value={h.dateOfBirth || ''} onChange={(e) => setHolder(i, 'dateOfBirth', e.target.value)} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Certificate Type <span className="text-red-400">*</span></label>
                            <select className={inpSm + ' cursor-pointer'} value={h.certificateType} onChange={(e) => setHolder(i, 'certificateType', e.target.value)}>
                              <option value="">Select type…</option>
                              {AIRLINE_CERT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Certificate Status</label>
                            <select className={inpSm + ' cursor-pointer'} value={h.certificateStatus} onChange={(e) => setHolder(i, 'certificateStatus', e.target.value)}>
                              <option value="EXISTING">EXISTING</option>
                              <option value="NEW">NEW</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">FAA Certificate # <span className="text-red-400">*</span></label>
                            <input className={inpSm} placeholder="FAA Certificate #" value={h.faaCertificateNumber} onChange={(e) => setHolder(i, 'faaCertificateNumber', e.target.value)} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">IACRA FTN # <span className="text-red-400">*</span></label>
                            <input className={inpSm} placeholder="FTN-XXXXXXXX" value={h.iacraFtnNumber} onChange={(e) => setHolder(i, 'iacraFtnNumber', e.target.value)} />
                          </div>
                          <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Holder Email</label>
                            <input type="email" className={inpSm} placeholder="holder@airline.com" value={h.email || ''} onChange={(e) => setHolder(i, 'email', e.target.value)} />
                          </div>
                        </div>

                        {/* Secondary certificate toggle */}
                        <label className={`flex items-center gap-2.5 cursor-pointer p-3 rounded-lg border select-none transition-all ${
                          h.hasSecondaryCertificate ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-200 bg-white'
                        }`}>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            h.hasSecondaryCertificate ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
                          }`}>
                            {h.hasSecondaryCertificate && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={!!h.hasSecondaryCertificate}
                            onChange={(e) => setHolder(i, 'hasSecondaryCertificate', e.target.checked)}
                          />
                          <span className="text-xs font-semibold text-slate-700">This holder has a secondary FAA certificate</span>
                        </label>

                        {/* Secondary fields — rendered BELOW toggle, outside any overflow container */}
                        {h.hasSecondaryCertificate && (
                          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-3 mt-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Secondary Certificate</p>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Secondary Certificate Type <span className="text-red-400">*</span></label>
                              <select
                                className={inpSm + ' cursor-pointer'}
                                value={h.secondaryCertificateType || ''}
                                onChange={(e) => setHolder(i, 'secondaryCertificateType', e.target.value)}
                              >
                                <option value="">Select secondary type…</option>
                                {AIRLINE_CERT_TYPES.filter((t) => t !== h.certificateType).map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Secondary FAA Cert #</label>
                                <input
                                  className={inpSm}
                                  placeholder="Secondary FAA Cert #"
                                  value={h.secondaryFaaCertificateNumber || ''}
                                  onChange={(e) => setHolder(i, 'secondaryFaaCertificateNumber', e.target.value)}
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Secondary IACRA FTN #</label>
                                <input
                                  className={inpSm}
                                  placeholder="FTN-XXXXXXXX"
                                  value={h.secondaryIacraFtnNumber || ''}
                                  onChange={(e) => setHolder(i, 'secondaryIacraFtnNumber', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ── Personal Info ── */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Personal Information</p>
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
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Date of Birth <span className="text-red-400">*</span></label>
                    <input type="date" className={inp + ' [color-scheme:light]'} value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Address <span className="text-red-400">*</span></label>
                    <input type="email" className={inp} placeholder="your@email.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone Number <span className="text-red-400">*</span></label>
                    <input className={inp} placeholder="+1 555 000 0000" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* ── Address ── */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Address</p>
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
                    <input className={inp} placeholder="Country" value={form.country} onChange={(e) => setField('country', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* ── Certificate ── */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Certificate Information</p>
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
                <label className={`flex items-center gap-2.5 cursor-pointer p-3 rounded-lg border select-none transition-all ${
                  form.hasSecondaryCertificate ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-200 bg-white'
                }`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    form.hasSecondaryCertificate ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
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
function AddHoldersModal({ sub, token, onClose, onSuccess }) {
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const API = axios.create({ baseURL: BASE_URL })
  API.interceptors.request.use((config) => {
    const t = localStorage.getItem('ifoa_token')
    if (t) config.headers.Authorization = `Bearer ${t}`
    return config
  })

  const currentCount = sub.certificateHolders?.length || 0
  const committedCount = sub.committedCount || currentCount
  const remainingSlots = committedCount - currentCount
  const existingHolders = sub.certificateHolders || []

  const [holders, setHolders] = useState(() => {
    if (existingHolders.length > 0) {
      return existingHolders.map((h) => ({
        ...EMPTY_HOLDER,
        ...h,
        dateOfBirth: h.dateOfBirth ? String(h.dateOfBirth).slice(0, 10) : '',
      }))
    }
    return [{ ...EMPTY_HOLDER }]
  })
  const [errors, setErrors] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  const existingCount = existingHolders.length
  const newMembersCount = Math.max(0, holders.length - existingCount)
  const atLimit = newMembersCount >= remainingSlots

  const onChange = (i, field, val) =>
    setHolders(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: val } : h))

  const addRow = () => {
    if (!atLimit) setHolders(prev => [...prev, { ...EMPTY_HOLDER }])
  }

  const removeRow = (i) => {
    if (i < existingCount) return
    if (holders.length > 1) setHolders(prev => prev.filter((_, idx) => idx !== i))
  }

  const isHolderEmpty = (h) =>
    !h.fullName?.trim() && !h.dateOfBirth && !h.certificateType &&
    !h.iacraFtnNumber?.trim() && !h.faaCertificateNumber?.trim() && !h.email?.trim()

  const validate = (rows) => {
    const errs = rows.map(h => {
      const e = {}
      if (!h.fullName?.trim()) e.fullName = 'Required'
      if (!h.dateOfBirth) e.dateOfBirth = 'Required'
      if (!h.certificateType) e.certificateType = 'Required'
      if (!h.iacraFtnNumber?.trim()) e.iacraFtnNumber = 'Required'
      return e
    })
    setErrors(errs)
    return errs.every(e => Object.keys(e).length === 0)
  }

  const handleSubmit = async () => {
    const cleaned = holders.filter((h) => !isHolderEmpty(h))
    if (cleaned.length === 0) { setApiError('Add at least one member.'); return }
    if (cleaned.length > committedCount) {
      setApiError(`You selected ${committedCount} committed slot${committedCount !== 1 ? 's' : ''}.`)
      return
    }
    if (!validate(cleaned)) return
    setSubmitting(true)
    setApiError('')
    try {
      const newHolders = cleaned.slice(existingCount)
      const res = newHolders.length > 0
        ? await API.patch(`/airlines/${sub._id}/add-holders`, { newHolders })
        : await API.put(`/airlines/${sub._id}`, { certificateHolders: cleaned })
      onSuccess(res.data)
    } catch (err) {
      setApiError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const inp = (err) => `w-full px-3 py-2 border rounded-lg text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-600/15 ${err ? 'border-red-300 bg-red-50/30' : 'border-gray-200 focus:border-blue-600'}`

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-black text-gray-900">Add Team Members</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining · already covered by your committed plan
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Cost banner */}
        <div className="mx-4 sm:mx-6 mt-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm flex items-center justify-between">
          <span className="text-blue-700 font-semibold">
            {existingCount > 0
              ? `Editing ${existingCount} existing member${existingCount !== 1 ? 's' : ''}${newMembersCount > 0 ? ` + adding ${newMembersCount}` : ''}`
              : `Adding ${holders.length} member${holders.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Holder forms */}
        <div className="px-4 sm:px-6 py-4 space-y-4">
          {holders.map((h, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Member #{i + 1}</span>
                <button onClick={() => removeRow(i)} disabled={holders.length <= 1 || i < existingCount}
                  className="w-6 h-6 flex items-center justify-center rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-25">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Full Name *</label>
                  <input type="text" placeholder="Full legal name" value={h.fullName}
                    onChange={e => onChange(i, 'fullName', e.target.value)} className={inp(errors[i]?.fullName)} />
                  {errors[i]?.fullName && <p className="text-red-500 text-xs mt-0.5">{errors[i].fullName}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Date of Birth *</label>
                  <input type="date" value={h.dateOfBirth}
                    onChange={e => onChange(i, 'dateOfBirth', e.target.value)} className={inp(errors[i]?.dateOfBirth)} />
                  {errors[i]?.dateOfBirth && <p className="text-red-500 text-xs mt-0.5">{errors[i].dateOfBirth}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Certificate Type *</label>
                  <select value={h.certificateType} onChange={e => onChange(i, 'certificateType', e.target.value)} className={inp(errors[i]?.certificateType) + ' cursor-pointer'}>
                    <option value="">Select…</option>
                    {CERTIFICATE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors[i]?.certificateType && <p className="text-red-500 text-xs mt-0.5">{errors[i].certificateType}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Certificate Status</label>
                  <div className="flex gap-2 pt-1">
                    {['NEW', 'EXISTING'].map(v => (
                      <label key={v} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex-1 justify-center ${
                        h.certificateStatus === v ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
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
                  <input type="text" placeholder="FTN-XXXXXXXX" value={h.iacraFtnNumber}
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
              <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all ${
                h.hasSecondaryCertificate ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 hover:border-blue-200 bg-white'
              }`}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  h.hasSecondaryCertificate ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
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
            className={`w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-all ${
              atLimit ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400'
            }`}>
            + Add Another Member {atLimit ? `(max ${remainingSlots})` : `(${newMembersCount}/${remainingSlots})`}
          </button>

          {apiError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{apiError}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 px-4 sm:px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-all">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50">
            {submitting ? 'Saving…' : 'Add Members'}
          </button>
        </div>
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
  const [showPayModal,  setShowPayModal]  = useState(false)
  const [payTarget,     setPayTarget]     = useState(null)
  const [payingId,      setPayingId]      = useState(null)
  const [showAddHolders, setShowAddHolders] = useState(false)
  const [viewInvoice,   setViewInvoice]   = useState(null)
  const [editTarget, setEditTarget] = useState(null)

  const regId = user?.registrationId || sub?._id
  const regModel = user?.registrationModel ||
    (user?.role === 'airline' ? 'Airlines' : 'Individual')

  const isPending = (s) => s && s.paymentStatus !== 'paid' && s.status !== 'Active'

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
      }
    }
    load()
  }, [user, token, linkRegistration, getOrFetch, invalidate])

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-0 sm:px-0">
        <div className="mb-6 sm:mb-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">My Account</p>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Subscription</h1>
          <p className="text-slate-500 text-sm mt-1">Your current plan and subscription details.</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-16 justify-center">
            <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
              <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" />
            </svg>
            <span className="text-slate-400 text-sm">Loading subscription…</span>
          </div>
        ) : subs.length === 0 ? (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Plan</p>
              </div>
              <div className="px-4 sm:px-6 py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
                  </svg>
                </div>
                <p className="text-slate-700 font-bold mb-1">No active subscription</p>
                <p className="text-slate-400 text-sm mb-5">Register to activate your FAA compliance service.</p>
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
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {subs.length} subscription{subs.length !== 1 ? 's' : ''} found
              </p>
            </div>

            {subs.map((s, idx) => (
              <SubscriptionCard
                key={s._id || idx}
                s={s}
                idx={idx}
                total={subs.length}
                user={user}
                token={token}
                onPay={() => {
                  if (payingId === s._id) return
                  const isAirSub = user?.role === 'airline'
                  const correctTotal = isAirSub
                    ? (Number(s.pricePerCertificate || s.pricePerCert || 0) *
                       Number(s.committedCount || s.holderCountValue || s.certificateHolders?.length || 0)) ||
                      Number(s.totalAmount || s.totalServiceFees || 0)
                    : Number(s.price || s.totalServiceFees || 0)
                  const enrichedSub = { ...s, _computedTotal: correctTotal }
                  setSub(enrichedSub)
                  setPayTarget(enrichedSub)
                  setPayingId(s._id)
                  setShowPayModal(true)
                }}
                onAddHolders={() => { setSub(s); setShowAddHolders(true) }}
                onViewInvoice={(inv) => setViewInvoice(inv)}
                onEditForm={() => setEditTarget(s)}
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
              invalidate(`subs_${user?.id || user?.email}`)
              const updated = { ...sub, paymentStatus: 'paid', status: 'Active', isPaid: true }
              setSubs(prev => prev.map(s => s._id === updated._id ? updated : s))
              setSub(updated)
              setShowPayModal(false)
              setPayTarget(null)
              setPayingId(null)
              if (inv) setViewInvoice(inv)
              try {
                const headers = { Authorization: `Bearer ${token}` }
                const isAirline = user?.role === 'airline'
                const endpoint = isAirline
                  ? `${BASE_URL}/airlines/${updated._id}`
                  : `${BASE_URL}/individuals/${updated._id}`
                const r = await API.get(endpoint, { headers })
                const fresh = r.data.data
                if (fresh) {
                  setSubs(prev => prev.map(s => s._id === fresh._id ? fresh : s))
                  setSub(fresh)
                }
              } catch (_) { /* non-critical */ }
            }}
          />
        )}
      </AnimatePresence>

      {viewInvoice && (
        <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}

      {showAddHolders && sub && (
        <AddHoldersModal
          sub={sub}
          token={token}
          onClose={() => setShowAddHolders(false)}
          onSuccess={(result) => {
            setSubs(prev => prev.map(s => s._id === result.data?._id ? result.data : s))
            setSub(result.data)
            setShowAddHolders(false)
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
    </DashboardLayout>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  SubscriptionCard                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
function SubscriptionCard({ s, idx, total, user, token, onPay, onAddHolders, onViewInvoice, onEditForm }) {
  const isAirline = user?.role === 'airline'
  const isPaid   = s.isPaid === true || s.paymentStatus === 'paid'
  const pending  = !isPaid
  const active   = isPaid
  const inactive = !isPaid && (s.paymentStatus === 'failed' || s.status === 'Inactive')

  const handleInvoiceClick = async () => {
    try {
      const invRes = await axios.get(`${BASE_URL}/invoices/by-registration/${s._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const invDoc = (invRes.data?.data || [])[0]
      if (invDoc) {
        const invoiceDraft = invDoc.draft || null
        onViewInvoice?.({
          invoiceNumber:    invDoc.invoiceNumber,
          paidAt:           invDoc.paidAt || invDoc.issueDate,
          subscriptionPlan: invDoc.subscriptionPlan,
          expirationDate:   invDoc.expirationDate  || null,
          amount:           invDoc.totalAmount,
          name:             invDoc.recipientName   || invDoc.recipientCompany || '',
          email:            invDoc.recipientEmail  || '',
          address:          invDoc.recipientAddress1 || '',
          isAirline:        invDoc.isAirline,
          airlineName:      invDoc.recipientCompany || '',
          pricePerCert:     invDoc.lineItems?.[0]?.unitPrice  || null,
          holderCount:      invDoc.lineItems?.[0]?.quantity   || null,
          invoiceDraft,
          _invoiceDocId:    invDoc._id,
        })
        return
      }
    } catch (_) { /* fall through */ }

    if (s.invoiceDraft && typeof s.invoiceDraft === 'object' &&
        (s.invoiceDraft.lineItems?.length || s.invoiceDraft.invoiceNumber)) {
      const draft = s.invoiceDraft
      onViewInvoice?.({
        invoiceNumber:    s.invoiceNumber || draft.invoiceNumber,
        paidAt:           s.subscriptionDate || s.updatedAt,
        subscriptionPlan: s.subscriptionPlan,
        expirationDate:   s.expirationDate || null,
        amount:           draft.lineItems?.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0) ||
                          (isAirline ? getAirlineTotal(s) : (s.price || s.totalServiceFees || 0)),
        name:             draft.recipientCompany || draft.recipientName || s.airlineName || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        email:            s.email || '',
        address:          draft.recipientAddress1 || s.addressLine1 || '',
        isAirline,
        airlineName:      s.airlineName || '',
        pricePerCert:     s.pricePerCertificate || s.pricePerCert || null,
        holderCount:      s.certificateHolders?.length || s.committedCount || null,
        invoiceDraft: { ...draft, invoiceNumber: draft.invoiceNumber || s.invoiceNumber },
      })
      return
    }

    try {
      const paymentDoc = await fetchPaymentRecord(s._id, token)
      if (paymentDoc?.isPaid) {
        onViewInvoice?.(serverPaymentToInvoice(paymentDoc))
        return
      }
    } catch (_) { /* fall through */ }

    try {
      const paidDate = s.subscriptionDate || s.updatedAt || s.createdAt
      const correctAmountCents = isAirline
        ? Math.round(getAirlineTotal(s) * 100)
        : Math.round((s.price || s.totalServiceFees || 0) * 100)
      onViewInvoice?.(buildInvoice(
        s,
        isAirline ? 'Airlines' : 'Individual',
        correctAmountCents,
        { id: s.stripePaymentIntentId || s.invoiceNumber || '—' },
        paidDate ? new Date(paidDate) : new Date()
      ))
    } catch (err) {
      console.error('Invoice build failed:', err)
    }
  }

  const bannerCls = active
    ? 'bg-gradient-to-r from-slate-900 to-slate-700'
    : inactive
    ? 'bg-gradient-to-r from-slate-700 to-slate-600'
    : s.status === 'Active'
    ? 'bg-gradient-to-r from-slate-800 to-slate-600'
    : 'bg-gradient-to-r from-blue-700 to-blue-600'

  return (
    <div className="space-y-5">
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

      {pending && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-blue-900">Payment pending</p>
              <p className="text-xs text-blue-700 leading-relaxed">Complete your payment to activate this subscription.</p>
            </div>
          </div>
          <button
            onClick={onPay}
            className="flex-shrink-0 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-blue-200 w-full sm:w-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
            </svg>
            Pay Now
          </button>
        </div>
      )}

      <div className={`rounded-2xl p-4 sm:p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${bannerCls}`}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-2">
            {active ? 'Active Subscription' : inactive ? 'Inactive Subscription' : s.status === 'Active' ? 'Active — Payment Pending' : 'Pending Subscription'}
          </p>
          <PlanBadge plan={s.subscriptionPlan} />
        </div>
        <div className="sm:text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">
            {isAirline ? 'Total Amount' : 'Plan Price'}
          </p>
          <p className="text-2xl sm:text-3xl font-black">
            {isAirline ? money(getAirlineTotal(s)) : money(s.price || s.totalServiceFees)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2 sm:justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plan Details</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onEditForm}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" />
              </svg>
              Edit Form
            </button>
            {active && (
              <button
                onClick={handleInvoiceClick}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Invoice
              </button>
            )}
            <PayBadge status={s.paymentStatus || s.status} />
          </div>
        </div>
        <div className="px-4 sm:px-6 py-2">
          {isAirline ? (
            <>
              <Row label="Airline Name" value={s.airlineName} />
              <Row label="Subscription Plan" value={s.subscriptionPlan} />
              <Row label="Payment Status" value={<PayBadge status={s.paymentStatus} />} />
              <Row label="Subscription Date" value={s.subscriptionDate ? fmt(s.subscriptionDate) : (active ? fmt(s.updatedAt) : 'Activates on payment')} />
              <Row
                label="Expiration Date"
                value={
                  s.subscriptionPlan === 'Unlimited Plan'
                    ? 'Never (Unlimited ∞)'
                    : s.expirationDate
                    ? fmt(s.expirationDate)
                    : active ? '—' : 'Activates on payment'
                }
              />
              <Row label="Price per Certificate" value={money(s.pricePerCertificate || s.pricePerCert)} />
              <Row label="Certificate Holders" value={`${s.certificateHolders?.length || 0} / ${s.committedCount || s.holderCountValue || s.certificateHolders?.length || 0} holder(s)`} />
              <Row label="Total Amount Due" value={money(getAirlineTotal(s))} />
              {(() => {
                const remaining = (s.committedCount || 0) - (s.certificateHolders?.length || 0)
                if (remaining > 0) return (
                  <div className="py-3 border-b border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                      <div>
                        <p className="text-xs font-bold text-blue-800">{remaining} slot{remaining !== 1 ? 's' : ''} not yet filled</p>
                        <p className="text-xs text-blue-600 mt-0.5">Total payment covers all committed slots.</p>
                      </div>
                      <button onClick={onAddHolders}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-all w-full sm:w-auto">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        Add Members
                      </button>
                    </div>
                  </div>
                )
                return null
              })()}
              <Row label="Country" value={s.country} />
              <Row label="Submitted" value={fmt(s.submittedAt || s.createdAt)} />
              {s.certificateHolders?.length > 0 && (
                <div className="mt-4 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Certificate Holders</p>
                  <div className="space-y-2">
                    {s.certificateHolders.map((h, i) => (
                      <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{h.fullName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{h.certificateType}</p>
                          {h.faaCertificateNumber && <p className="text-xs text-slate-400">FAA #: {h.faaCertificateNumber}</p>}
                          {h.iacraFtnNumber && <p className="text-xs text-slate-400">FTN: {h.iacraFtnNumber}</p>}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-1 border flex-shrink-0 self-start ${
                          h.certificateStatus === 'EXISTING' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-100 border-slate-300 text-slate-600'
                        }`}>{h.certificateStatus}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <Row label="Subscription Plan" value={s.subscriptionPlan} />
              <Row label="Status" value={<PayBadge status={s.status || s.paymentStatus} />} />
              <Row label="Payment Status" value={<PayBadge status={s.paymentStatus} />} />
              <Row label="Plan Price" value={money(s.price)} />
              <Row label="Subscription Date" value={fmt(s.subscriptionDate || s.createdAt)} />
              <Row label="Expiration Date" value={s.subscriptionPlan === 'Unlimited Plan' ? 'Never (Unlimited)' : fmt(s.expirationDate)} />
              <Row label="Primary Certificate" value={s.primaryCertificate} />
              <Row label="Certificate Type" value={s.primaryAirmanCertificate} />
              {s.faaCertificateNumber && <Row label="FAA Certificate #" value={s.faaCertificateNumber} />}
              {s.iacraTrackingNumber && <Row label="IACRA Tracking # (FTN)" value={s.iacraTrackingNumber} />}
              <Row label="Submitted" value={fmt(s.submittedAt || s.createdAt)} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
