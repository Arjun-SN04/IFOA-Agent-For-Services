import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { Link } from 'react-router-dom'
import axios from 'axios'
import InvoiceModal from '../../components/payment/InvoiceModal'
import { buildInvoice } from '../../components/payment/PaymentModal'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const API = axios.create({ baseURL: BASE_URL })

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-3 border-b border-slate-100 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:w-48 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value || '—'}</span>
    </div>
  )
}

function PlanBadge({ plan }) {
  const colors = {
    '1 Year Subscription Plan': 'bg-red-50 border-red-200 text-red-700',
    'Multiple Years Subscription Plan': 'bg-slate-100 border-slate-300 text-slate-700',
    'Unlimited Plan': 'bg-emerald-50 border-emerald-200 text-emerald-700',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${colors[plan] || 'bg-slate-50 border-slate-200 text-slate-600'}`}>
      {plan}
    </span>
  )
}

function StatusBadge({ status }) {
  const map = {
    paid:    'bg-emerald-50 border-emerald-200 text-emerald-700',
    Active:  'bg-emerald-50 border-emerald-200 text-emerald-700',
    pending: 'bg-blue-50 border-blue-200 text-blue-700',
    Pending: 'bg-blue-50 border-blue-200 text-blue-700',
    failed:  'bg-red-50 border-red-200 text-red-700',
    Inactive:'bg-slate-100 border-slate-200 text-slate-600',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${map[status] || 'bg-slate-50 border-slate-200 text-slate-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        (status === 'paid' || status === 'Active') ? 'bg-emerald-500' :
        (status === 'pending' || status === 'Pending') ? 'bg-blue-500' :
        status === 'failed' ? 'bg-red-500' : 'bg-slate-400'
      }`} />
      {status}
    </span>
  )
}

// ── Inline edit name modal ───────────────────────────────────────────────────
function EditNameModal({ user, onClose, onSave }) {
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName]   = useState(user?.lastName || '')
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')

  const handleSave = async () => {
    if (!firstName.trim() && !lastName.trim()) {
      setErr('Please enter at least a first name or last name.')
      return
    }
    setSaving(true)
    setErr('')
    try {
      await onSave(firstName.trim(), lastName.trim())
      onClose()
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to update name.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-0.5">Edit Profile</p>
            <h3 className="text-lg font-black text-slate-900">Change Your Name</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition">✕</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {err && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">First Name</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-slate-300"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Enter first name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Last Name</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-slate-300"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Enter last name"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
          >
            {saving && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
                <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" />
              </svg>
            )}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Airline Name modal ────────────────────────────────────────────────
function EditAirlineNameModal({ currentName, onClose, onSave }) {
  const [name, setName] = useState(currentName || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setErr('Airline name cannot be empty.'); return }
    setSaving(true)
    setErr('')
    try {
      await onSave(name.trim())
      onClose()
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to update airline name.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-0.5">Airline Account</p>
            <h3 className="text-lg font-black text-slate-900">Change Airline Name</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold text-amber-800">
              ⚠️ Changing the airline name will update how it appears on <strong>all future form submissions</strong>.
              Existing submitted records are not affected.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Airline / Company Name</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 hover:border-slate-300"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Skyline Airways Inc."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50">
            {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, token, updateProfile, updateAirlineName } = useAuth()
  const [subs, setSubs] = useState([])   // all subscriptions
  const [sub, setSub] = useState(null)    // most recent (kept for single-sub display compat)
  const [subLoading, setSubLoading] = useState(true)
  const [editNameOpen, setEditNameOpen] = useState(false)
  const [editAirlineNameOpen, setEditAirlineNameOpen] = useState(false)
  const [viewInvoice, setViewInvoice] = useState(null)

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'

  useEffect(() => {
    if (!user) { setSubLoading(false); return }
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
          const idSubs = await fetchByIds('/airlines')
          let emailSubs = []
          if (user.email) {
            try {
              const r = await API.get(`/airlines/by-email?email=${encodeURIComponent(user.email)}`, { headers })
              emailSubs = r.data.all || (r.data.data ? [r.data.data] : [])
            } catch {}
          }
          const merged = mergeAndSort(idSubs, emailSubs)
          setSubs(merged)
          setSub(merged[0] || null)
          return
        }

        // Individual: fetch from stored IDs first, then merge email matches.
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
      } catch {
        setSubs([])
        setSub(null)
      } finally {
        setSubLoading(false)
      }
    }
    load()
  }, [user])

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
  const money = (n) => n != null ? `${Number(n).toFixed(2)}` : '—'

  return (
    <DashboardLayout>
      {editNameOpen && (
        <EditNameModal
          user={user}
          onClose={() => setEditNameOpen(false)}
          onSave={updateProfile}
        />
      )}
      {editAirlineNameOpen && (
        <EditAirlineNameModal
          currentName={user?.airlineName}
          onClose={() => setEditAirlineNameOpen(false)}
          onSave={updateAirlineName}
        />
      )}

      <div className="max-w-3xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Account</p>
          <h1 className="text-2xl font-black text-slate-900">My Profile</h1>
          <p className="text-slate-500 text-sm mt-1">Your account information and active subscription plan.</p>
        </div>

        {/* ── Avatar card — LIGHT THEME ── */}
        <div
          className="rounded-2xl border border-blue-100 p-6 mb-6 flex items-center gap-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #e0f2fe 100%)' }}
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }} />
          {/* Avatar circle */}
          <div className="w-16 h-16 rounded-2xl text-white text-2xl font-black flex items-center justify-center flex-shrink-0 shadow-md relative z-10"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 16px rgba(37,99,235,0.35)' }}>
            {initials}
          </div>
          <div className="relative z-10 flex-1 min-w-0">
            <h2 className="text-xl font-black text-slate-900">{fullName}</h2>
            <p className="text-slate-500 text-sm">{user?.email}</p>
            <span className="inline-flex items-center gap-1.5 mt-2 rounded-full bg-white/70 border border-blue-200 px-3 py-1 text-[10px] font-bold tracking-widest text-blue-700 capitalize">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {user?.role}
            </span>
          </div>
          {/* Edit name button */}
          <button
            onClick={() => setEditNameOpen(true)}
            className="relative z-10 flex-shrink-0 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white/80 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-white transition-all shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" />
            </svg>
            Edit Name
          </button>
        </div>

        {/* Account Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Details</p>
            <button
              onClick={() => setEditNameOpen(true)}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Edit Name →
            </button>
          </div>
          <div className="px-6 py-2">
            <InfoRow label="First Name" value={user?.firstName} />
            <InfoRow label="Last Name" value={user?.lastName} />
            <InfoRow label="Email Address" value={user?.email} />
            <InfoRow label="Account Role" value={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)} />
            <InfoRow label="Account ID" value={user?.id} />
          </div>
        </div>

        {/* ── AIRLINE NAME CARD (airline role only) ── */}
        {user?.role === 'airline' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Airline / Company</p>
                <p className="text-xs text-slate-500 mt-0.5">Used as the company name on all form submissions.</p>
              </div>
              <button
                onClick={() => setEditAirlineNameOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" />
                </svg>
                Edit Airline Name
              </button>
            </div>
            <div className="px-6 py-4">
              {user?.airlineName ? (
                <div className="flex items-center gap-4">
                  {/* Airline icon */}
                  <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black text-slate-900 truncate">{user.airlineName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">This name is locked on registration forms.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-bold text-amber-800">Airline name not set</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Your airline name is missing. Click <strong>Edit Airline Name</strong> above to set it before submitting a registration form.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SUBSCRIPTION PLAN SECTION ── */}
        {viewInvoice && (
          <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subscription Plan</p>
            {sub && <StatusBadge status={sub.paymentStatus || sub.status} />}
          </div>

          {subLoading ? (
            <div className="px-6 py-10 flex items-center justify-center">
              <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
                <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" />
              </svg>
              <span className="ml-3 text-sm text-slate-400">Loading subscription…</span>
            </div>
          ) : subs.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
                </svg>
              </div>
              <p className="text-slate-700 font-bold mb-1">No active subscription</p>
              <p className="text-slate-500 text-sm mb-4">Register to activate your FAA compliance service.</p>
              <Link
                to={user?.role === 'airline' ? '/airlines/register' : '/individual/register'}
                className="inline-flex items-center gap-2 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
              >
                Register Now
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          ) : (
            /* ── ALL SUBSCRIPTIONS (airline & individual) ── */
            <div className="px-6 py-4 space-y-6">
              {subs.map((s, idx) => {
                const isAirline = user?.role === 'airline'
                const active = s.isPaid === true || s.paymentStatus === 'paid' || s.status === 'Active'
                return (
                  <div key={s._id || idx}>
                    {subs.length > 1 && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center">{idx + 1}</span>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subscription #{idx + 1}</p>
                      </div>
                    )}
                    <div className={`rounded-xl p-4 mb-3 border ${
                      active
                        ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100'
                        : 'bg-gradient-to-r from-blue-50 to-sky-50 border-blue-100'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${active ? 'text-emerald-600' : 'text-blue-600'}`}>
                            {active ? 'Active Plan' : 'Pending Plan'}
                          </p>
                          <PlanBadge plan={s.subscriptionPlan} />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                            {isAirline ? 'Total Amount' : 'Plan Price'}
                          </p>
                          <p className="text-2xl font-black text-slate-900">
                            {isAirline ? money(s.totalAmount) : money(s.price || s.totalServiceFees)}
                          </p>
                        </div>
                      </div>
                      {/* Expiry summary row */}
                      <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Expires</p>
                          <p className={`text-xs font-bold ${
                            s.subscriptionPlan === 'Unlimited Plan' ? 'text-emerald-600' :
                            s.expirationDate ? 'text-slate-800' : 'text-slate-400'
                          }`}>
                            {s.subscriptionPlan === 'Unlimited Plan'
                              ? 'Never (Unlimited ∞)'
                              : s.expirationDate
                              ? fmt(s.expirationDate)
                              : active ? '—' : 'Activates on payment'}
                          </p>
                        </div>
                        {active && (
                          <button
                            onClick={() => {
                              const inv = buildInvoice(
                                s,
                                isAirline ? 'Airlines' : 'Individual',
                                Math.round((s.price || s.totalAmount || s.totalServiceFees || 0) * 100),
                                { id: s.invoiceNumber || '—' },
                                s.subscriptionDate || s.updatedAt || s.createdAt
                              )
                              setViewInvoice(inv)
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-white hover:border-red-300 hover:text-red-600 transition flex-shrink-0"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            </svg>
                            Invoice PDF
                          </button>
                        )}
                      </div>
                    </div>

                    {isAirline ? (
                      <>
                        <InfoRow label="Airline Name" value={s.airlineName} />
                        <InfoRow label="Contact Person" value={`${s.firstName || s.contactFirstName || ''} ${s.lastName || s.contactLastName || ''}`.trim()} />
                        <InfoRow label="Contact Email" value={s.email || s.contactEmail} />
                        <InfoRow label="Contact Phone" value={s.phone || s.contactPhone} />
                        <InfoRow label="Country" value={s.country} />
                        <InfoRow label="Price per Certificate" value={money(s.pricePerCertificate || s.pricePerCert)} />
                        <InfoRow label="Certificate Holders" value={`${s.certificateHolders?.length || 0} holder(s)`} />
                        <InfoRow label="Subscription Date" value={s.subscriptionDate ? fmt(s.subscriptionDate) : (s.paymentStatus === 'paid' ? fmt(s.updatedAt) : 'Activates on payment')} />
                        <InfoRow
                          label="Expiration Date"
                          value={
                            s.subscriptionPlan === 'Unlimited Plan'
                              ? 'Never (Unlimited)'
                              : s.expirationDate
                              ? fmt(s.expirationDate)
                              : s.paymentStatus === 'paid'
                              ? '—'
                              : 'Activates on payment'
                          }
                        />
                        <InfoRow label="Payment Status" value={<StatusBadge status={s.paymentStatus} />} />
                        <InfoRow label="Submitted" value={fmt(s.submittedAt || s.createdAt)} />
                        {s.certificateHolders?.length > 0 && (
                          <div className="mt-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Certificate Holders</p>
                            <div className="space-y-2">
                              {s.certificateHolders.map((h, i) => (
                                <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-bold text-slate-900">{h.fullName}</p>
                                      <p className="text-xs text-slate-500 mt-0.5">{h.certificateType}</p>
                                      {h.faaCertificateNumber && <p className="text-xs text-slate-400">FAA #: {h.faaCertificateNumber}</p>}
                                      {h.iacraFtnNumber && <p className="text-xs text-slate-400">FTN: {h.iacraFtnNumber}</p>}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-1 border ${
                                      h.certificateStatus === 'EXISTING' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-100 border-slate-300 text-slate-600'
                                    }`}>{h.certificateStatus}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <InfoRow label="Status" value={<StatusBadge status={s.status || s.paymentStatus} />} />
                        <InfoRow label="Subscription Date" value={s.subscriptionDate ? fmt(s.subscriptionDate) : (active ? fmt(s.updatedAt) : 'Activates on payment')} />
                        <InfoRow
                          label="Expiration Date"
                          value={
                            s.subscriptionPlan === 'Unlimited Plan'
                              ? 'Never (Unlimited ∞)'
                              : s.expirationDate
                              ? fmt(s.expirationDate)
                              : active ? '—' : 'Activates on payment'
                          }
                        />
                        <InfoRow label="Primary Certificate" value={s.primaryCertificate} />
                        <InfoRow label="Certificate Type" value={s.primaryAirmanCertificate} />
                        {s.faaCertificateNumber && <InfoRow label="FAA Certificate #" value={s.faaCertificateNumber} />}
                        {s.iacraTrackingNumber && <InfoRow label="IACRA Tracking # (FTN)" value={s.iacraTrackingNumber} />}
                        {s.hasSecondaryCertificate && (
                          <>
                            <InfoRow label="Secondary Certificate" value={s.secondaryCertificate} />
                            {s.secondaryFaaCertificateNumber && <InfoRow label="Secondary FAA #" value={s.secondaryFaaCertificateNumber} />}
                            {s.secondaryIacraTrackingNumber && <InfoRow label="Secondary FTN" value={s.secondaryIacraTrackingNumber} />}
                          </>
                        )}
                        <InfoRow label="Payment Status" value={<StatusBadge status={s.paymentStatus} />} />
                        <InfoRow label="Submitted" value={fmt(s.submittedAt || s.createdAt)} />
                      </>
                    )}
                    {idx < subs.length - 1 && <div className="border-t border-slate-100 mt-4" />}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick link to documents */}
        <Link to="/dashboard/documents"
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition-all flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Documents</p>
            <p className="text-xs text-slate-500">Access your FAA correspondence and uploaded files.</p>
          </div>
          <svg className="w-4 h-4 text-slate-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </DashboardLayout>
  )
}
