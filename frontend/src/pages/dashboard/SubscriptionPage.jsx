import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import axios from 'axios'
import PaymentModal from '../../components/payment/PaymentModal'
import InvoiceModal, { downloadInvoicePDF } from '../../components/payment/InvoiceModal'
import { buildInvoice, serverPaymentToInvoice } from '../../components/payment/PaymentModal'

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

// Fetch the server-stored Payment record for a registration
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
    '1 Year Subscription Plan': 'bg-red-50 border-red-200 text-red-700',
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
  const dot = {
    paid: 'bg-emerald-500',
    pending: 'bg-blue-500',
    failed: 'bg-red-500',
    Active: 'bg-emerald-500',
    Pending: 'bg-blue-500',
    Inactive: 'bg-slate-400'
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${map[status] || 'bg-slate-50 border-slate-200 text-slate-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] || 'bg-slate-400'}`} />
      {status || 'Pending'}
    </span>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-3 border-b border-slate-100 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:w-52 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value ?? '—'}</span>
    </div>
  )
}

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
const money = (n) => n != null ? `${Number(n).toFixed(2)}` : '—'

function AddHoldersModal({ sub, token, onClose, onSuccess }) {
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const API = axios.create({ baseURL: BASE_URL })

  const currentCount = sub.certificateHolders?.length || 0
  const committedCount = sub.committedCount || currentCount
  const remainingSlots = committedCount - currentCount
  const pricePerCert = sub.pricePerCertificate || 0

  const [holders, setHolders] = useState([{ ...EMPTY_HOLDER }])
  const [errors, setErrors] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  const atLimit = holders.length >= remainingSlots

  const onChange = (i, field, val) =>
    setHolders(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: val } : h))

  const addRow = () => {
    if (!atLimit) setHolders(prev => [...prev, { ...EMPTY_HOLDER }])
  }

  const removeRow = (i) => {
    if (holders.length > 1) setHolders(prev => prev.filter((_, idx) => idx !== i))
  }

  const validate = () => {
    const errs = holders.map(h => {
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
    if (!validate()) return
    setSubmitting(true)
    setApiError('')
    try {
      const res = await API.patch(`/airlines/${sub._id}/add-holders`, { newHolders: holders })
      onSuccess(res.data)
    } catch (err) {
      setApiError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const extraDue = pricePerCert * holders.length
  const inp = (err) => `w-full px-3 py-2 border rounded-lg text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-600/15 ${err ? 'border-red-300 bg-red-50/30' : 'border-gray-200 focus:border-blue-600'}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-black text-gray-900">Add Team Members</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining · ${pricePerCert}/cert
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Cost banner */}
        <div className="mx-6 mt-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm flex items-center justify-between">
          <span className="text-blue-700 font-semibold">Adding {holders.length} member{holders.length !== 1 ? 's' : ''}</span>
          <span className="font-black text-blue-900">Amount due: <span className="text-green-700">${extraDue} USD</span></span>
        </div>

        {/* Holder forms */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {holders.map((h, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Member #{i + 1}</span>
                <button onClick={() => removeRow(i)} disabled={holders.length <= 1}
                  className="w-6 h-6 flex items-center justify-center rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-25">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
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
              <div className="grid sm:grid-cols-2 gap-3">
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
                    {['NEW','EXISTING'].map(v => (
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
              <div className="grid sm:grid-cols-2 gap-3">
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
                <div className="ml-2 pl-3 border-l-2 border-blue-200 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Secondary Certificate Type *</label>
                    <select value={h.secondaryCertificateType || ''}
                      onChange={e => onChange(i, 'secondaryCertificateType', e.target.value)}
                      className={inp(false) + ' cursor-pointer'}>
                      <option value="">Select…</option>
                      {CERTIFICATE_TYPES.filter(t => t !== h.certificateType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
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
            + Add Another Member {atLimit ? `(max ${remainingSlots})` : `(${holders.length}/${remainingSlots})`}
          </button>

          {apiError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{apiError}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-all">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50">
            {submitting ? 'Saving…' : `Submit & Pay ${extraDue} USD`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
  const { user, token, linkRegistration } = useAuth()
  const [subs, setSubs] = useState([])       // all subscriptions
  const [sub, setSub] = useState(null)        // primary / most recent (for modal targets)
  const [loading, setLoading] = useState(true)
  const [showPayModal,  setShowPayModal]  = useState(false)
  const [payTarget,     setPayTarget]     = useState(null)
  const [showAddHolders, setShowAddHolders] = useState(false)
  const [viewInvoice,   setViewInvoice]   = useState(null)  // invoice to preview

  const regId = user?.registrationId || sub?._id
  const regModel = user?.registrationModel ||
    (user?.role === 'airline' ? 'Airlines' : 'Individual')

  const isPending = (s) => s && s.paymentStatus !== 'paid' && s.status !== 'Active'

  useEffect(() => {
    if (!user) { setLoading(false); return }

    const headers = { Authorization: `Bearer ${token}` }
    const isAirline = user.role === 'airline'

    const mergeAndSort = (...groups) => {
      const seen = new Set()
      return groups
        .flat()
        .filter(Boolean)
        .filter((item) => {
          const key = item?._id?.toString()
          if (!key || seen.has(key)) return false
          seen.add(key)
          return true
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    const fetchByIds = async (basePath) => {
      const ids = [...(user.subscriptionIds || [])]
      if (user.registrationId) {
        const regId = user.registrationId?.toString()
        if (!ids.map(i => i?.toString()).includes(regId)) ids.push(user.registrationId)
      }
      if (ids.length === 0) return []

      const fetched = await Promise.allSettled(
        ids.map(id => API.get(`${basePath}/${id}`, { headers }))
      )
      return fetched
        .filter(r => r.status === 'fulfilled' && r.value?.data?.data)
        .map(r => r.value.data.data)
    }

    const load = async () => {
      try {
        if (isAirline) {
          // ── Strategy: fetch by subscriptionIds array first (most reliable),
          //   then merge in any email-matched records as a fallback/catch-all.
          const allById = []

          // 1. Fetch every ID stored in user.subscriptionIds
          const storedIds = user.subscriptionIds || []
          if (user.registrationId) {
            const regIdStr = user.registrationId?.toString()
            if (!storedIds.map(i => i.toString()).includes(regIdStr)) {
              storedIds.push(user.registrationId)
            }
          }

          if (storedIds.length > 0) {
            const fetched = await Promise.allSettled(
              storedIds.map(id => API.get(`/airlines/${id}`, { headers }))
            )
            fetched.forEach(r => {
              if (r.status === 'fulfilled' && r.value?.data?.data) {
                allById.push(r.value.data.data)
              }
            })
          }

          // 2. Also fetch by email to catch older/unlinked subscriptions
          let emailSubs = []
          if (user.email) {
            try {
              const r2 = await API.get(`/airlines/by-email?email=${encodeURIComponent(user.email)}`, { headers })
              emailSubs = r2.data.all || (r2.data.data ? [r2.data.data] : [])
            } catch (_) {}
          }

          // 3. Merge, deduplicate by _id, sort newest first
          const seen = new Set()
          const merged = [...allById, ...emailSubs].filter(s => {
            const key = s._id?.toString()
            if (!key || seen.has(key)) return false
            seen.add(key)
            return true
          }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

          setSubs(merged)
          setSub(merged[0] || null)

          // 4. Auto-link if first time (no registrationId yet)
          if (!user.registrationId && merged[0]?._id) {
            try { await linkRegistration(merged[0]._id, 'Airlines') } catch (_) {}
          }
          return
        }

        // Individual: fetch all subscriptions via stored IDs + email fallback.
        const idSubs = await fetchByIds('/individuals')
        let emailSubs = []
        if (user.email) {
          try {
            const r = await API.get(`/individuals/by-email?email=${encodeURIComponent(user.email)}`, { headers })
            emailSubs = r.data.all || (r.data.data ? [r.data.data] : [])
          } catch {}
        }

        const merged = mergeAndSort(idSubs, emailSubs)
        setSubs(merged)
        setSub(merged[0] || null)

        if (!user.registrationId && merged[0]?._id) {
          try { await linkRegistration(merged[0]._id, 'Individual') } catch (_) {}
        }
      } catch {
        setSubs([])
        setSub(null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user, token])

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">My Account</p>
          <h1 className="text-2xl font-black text-slate-900">Subscription</h1>
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
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Plan</p>
              </div>
              <div className="px-6 py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
                  </svg>
                </div>
                <p className="text-slate-700 font-bold mb-1">No active subscription</p>
                <p className="text-slate-400 text-sm mb-5">Register to activate your FAA compliance service.</p>
                <Link to={user?.role === 'airline' ? '/airlines/register' : '/individual/register'}
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all">
                  Register Now
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
              </div>
            </div>
            <div className="bg-black rounded-2xl p-6 text-center">
              <p className="text-white font-black text-lg mb-2">Choose a Plan</p>
              <p className="text-slate-400 text-sm mb-5">Starting from just $69/year for individuals.</p>
              <Link to="/#pricing" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all">
                View Plans
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
          </>
        ) : (
          <div className="space-y-8">
            {/* Add another plan CTA when user already has subscriptions */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {subs.length} subscription{subs.length !== 1 ? 's' : ''} found
              </p>
              <Link
                to={user?.role === 'airline' ? '/airlines/register' : '/individual/register'}
                className="inline-flex items-center gap-2 border border-red-200 text-red-700 font-bold px-4 py-2 rounded-xl text-xs hover:bg-red-50 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add Another Plan
              </Link>
            </div>

            {subs.map((s, idx) => (
              <SubscriptionCard
                key={s._id || idx}
                s={s}
                idx={idx}
                total={subs.length}
                user={user}
                token={token}
                onPay={() => { setSub(s); setPayTarget(s); setShowPayModal(true) }}
                onAddHolders={() => { setSub(s); setShowAddHolders(true) }}
                onViewInvoice={(inv) => setViewInvoice(inv)}
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
            amount={Math.round((sub?.price || sub?.totalAmount || sub?.totalServiceFees || 0) * 100)}
            subscriptionData={sub}
            onClose={() => { setShowPayModal(false); setPayTarget(null) }}
            onSuccess={async (inv) => {
              // Optimistic update — show Active immediately
              const updated = { ...sub, paymentStatus: 'paid', status: 'Active', isPaid: true }
              setSubs(prev => prev.map(s => s._id === updated._id ? updated : s))
              setSub(updated)
              setShowPayModal(false)
              setPayTarget(null)
              if (inv) setViewInvoice(inv)
              // Re-fetch authoritative data from server so profile & subscription pages
              // both reflect the real DB state when the user navigates around
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
              } catch (_) { /* non-critical — optimistic state is already set */ }
            }}
          />
        )}
      </AnimatePresence>

      {/* Invoice preview modal (from subscription panel) */}
      {viewInvoice && (
        <InvoiceModal
          invoice={viewInvoice}
          onClose={() => setViewInvoice(null)}
        />
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
    </DashboardLayout>
  )
}

// ── Per-subscription card ────────────────────────────────────────────────────
function SubscriptionCard({ s, idx, total, user, token, onPay, onAddHolders, onViewInvoice }) {
  const isAirline = user?.role === 'airline'
  // Source of truth: isPaid field (set only after Payment record is saved in DB)
  // Fall back to legacy paymentStatus/status for records that predate this change
  const isPaid   = s.isPaid === true || s.paymentStatus === 'paid' || s.status === 'Active'
  const pending  = !isPaid && s.status !== 'Active'
  const active   = isPaid
  const inactive = !isPaid && (s.paymentStatus === 'failed' || s.status === 'Inactive')

  // Load payment record from DB for invoice (async, on button click)
  const handleInvoiceClick = async () => {
    try {
      // Try to get the authoritative Payment record from DB first
      const paymentDoc = await fetchPaymentRecord(s._id, token)
      if (paymentDoc?.isPaid) {
        onViewInvoice?.(serverPaymentToInvoice(paymentDoc))
        return
      }
    } catch (_) {}
    // Fallback: build invoice locally from subscription data
    try {
      const paidDate = s.subscriptionDate || s.updatedAt || s.createdAt
      onViewInvoice?.(buildInvoice(
        s,
        isAirline ? 'Airlines' : 'Individual',
        Math.round((s.price || s.totalAmount || s.totalServiceFees || 0) * 100),
        { id: s.stripePaymentIntentId || s.invoiceNumber || '—' },
        paidDate ? new Date(paidDate) : new Date()
      ))
    } catch (err) {
      console.error('Invoice build failed:', err)
    }
  }

  const bannerCls = active
    ? 'bg-gradient-to-r from-red-700 to-red-600'
    : inactive
    ? 'bg-gradient-to-r from-slate-700 to-slate-600'
    : 'bg-gradient-to-r from-blue-700 to-blue-600'

  return (
    <div className="space-y-5">
      {/* Label when multiple subs */}
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

      {/* Pay Now banner */}
      {pending && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
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
            className="flex-shrink-0 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-red-200 whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
            </svg>
            Pay Now
          </button>
        </div>
      )}

      {/* Plan banner */}
      <div className={`rounded-2xl p-6 text-white flex items-center justify-between ${bannerCls}`}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-2">
            {active ? 'Active Subscription' : inactive ? 'Inactive Subscription' : 'Pending Subscription'}
          </p>
          <PlanBadge plan={s.subscriptionPlan} />
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">
            {isAirline ? 'Total Amount' : 'Plan Price'}
          </p>
          <p className="text-3xl font-black">
            {isAirline ? money(s.totalAmount) : money(s.price || s.totalServiceFees)}
          </p>
        </div>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plan Details</p>
          <div className="flex items-center gap-2">
            {active && (
              <button
                onClick={handleInvoiceClick}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:border-red-300 hover:text-red-600 transition"
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
        <div className="px-6 py-2">
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
              <Row label="Certificate Holders" value={`${s.certificateHolders?.length || 0} / ${s.committedCount || s.certificateHolders?.length || 0} holder(s)`} />
              <Row label="Total Amount Due" value={money(s.totalAmount)} />
              {(() => {
                const remaining = (s.committedCount || 0) - (s.certificateHolders?.length || 0)
                const amountDue = (s.totalAmount || 0) - (s.amountPaid || 0)
                if (remaining > 0) return (
                  <div className="py-3 border-b border-slate-100">
                    <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                      <div>
                        <p className="text-xs font-bold text-blue-800">{remaining} slot{remaining !== 1 ? 's' : ''} not yet filled</p>
                        <p className="text-xs text-blue-600 mt-0.5">Remaining balance: <span className="font-black">${amountDue} USD</span></p>
                      </div>
                      <button onClick={onAddHolders}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-all">
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-3">Certificate Holders</p>
                  <div className="space-y-2">
                    {s.certificateHolders.map((h, i) => (
                      <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{h.fullName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{h.certificateType}</p>
                          {h.faaCertificateNumber && <p className="text-xs text-slate-400">FAA #: {h.faaCertificateNumber}</p>}
                          {h.iacraFtnNumber && <p className="text-xs text-slate-400">FTN: {h.iacraFtnNumber}</p>}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-1 border flex-shrink-0 ${
                          h.certificateStatus === 'EXISTING' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-100 border-slate-300 text-slate-600'
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
