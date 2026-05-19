import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useDataCache } from '../../context/DataCacheContext'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { Link } from 'react-router-dom'
import axios from 'axios'
import InvoiceModal from '../../components/payment/InvoiceModal'
import { buildInvoice } from '../../components/payment/PaymentModal'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const API = axios.create({ baseURL: BASE_URL })

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 py-3 border-b border-slate-100 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:w-48 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 break-words min-w-0">{value || '—'}</span>
    </div>
  )
}

function PlanBadge({ plan }) {
  const colors = {
    '1 Year Subscription Plan': '#0f172a',
    'Multiple Years Subscription Plan': '#0f172a',
    'Unlimited Plan': '#047857',
  }
  return (
    <span className='text-sm font-bold' style={{ color: colors[plan] || '#0f172a' }}>
      {plan}
    </span>
  )
}

function StatusBadge({ status }) {
  const map = {
    paid:     '#047857',
    Active:   '#047857',
    pending:  '#b45309',
    Pending:  '#b45309',
    failed:   '#dc2626',
    Inactive: '#64748b',
  }
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : '—'
  return (
    <span className='text-sm font-semibold' style={{ color: map[status] || '#64748b' }}>
      {label}
    </span>
  )
}

/* ── Edit Profile Modal (name + airline name combined) ────────────────────── */
function EditProfileModal({ user, isAirline, onClose, onSaveName, onSaveAirlineName }) {
  const [firstName, setFirstName]     = useState(user?.firstName || '')
  const [lastName, setLastName]       = useState(user?.lastName || '')
  const [airlineName, setAirlineName] = useState(user?.airlineName || '')
  const [saving, setSaving]           = useState(false)
  const [err, setErr]                 = useState('')

  const handleSave = async () => {
    if (!firstName.trim() && !lastName.trim()) {
      setErr('Please enter at least a first name or last name.')
      return
    }
    if (isAirline && !airlineName.trim()) {
      setErr('Airline name cannot be empty.')
      return
    }
    setSaving(true)
    setErr('')
    try {
      await onSaveName(firstName.trim(), lastName.trim())
      if (isAirline && airlineName.trim() !== (user?.airlineName || '')) {
        await onSaveAirlineName(airlineName.trim())
      }
      onClose()
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-50">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-0.5">Edit Profile</p>
            <h3 className="text-base sm:text-lg font-black text-slate-900">Update Your Details</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition flex-shrink-0">✕</button>
        </div>
        <div className="px-4 sm:px-6 py-5 space-y-4">
          {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
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
          {isAirline && (
            <>
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
                  value={airlineName}
                  onChange={e => setAirlineName(e.target.value)}
                  placeholder="e.g. Skyline Airways Inc."
                />
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-slate-100 bg-slate-50 px-4 sm:px-6 py-4">
          <button onClick={onClose} disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1a1aff 0%, #0000ff 100%)' }}>
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

/* ── ProfilePage ──────────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const { user, token, updateProfile, updateAirlineName } = useAuth()
  const { getOrFetch, invalidate } = useDataCache()
  const [subs, setSubs] = useState([])
  const [sub, setSub] = useState(null)
  const [subLoading, setSubLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [viewInvoice, setViewInvoice] = useState(null)

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'

  useEffect(() => {
    if (!user) { setSubLoading(false); return }
    const headers = { Authorization: `Bearer ${token}` }
    const isAirline = user.role === 'airline'
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

    const fetchByIds = async (basePath, resolvedIds) => {
      if (!resolvedIds || resolvedIds.length === 0) return []
      const fetched = await Promise.allSettled(
        resolvedIds.map(id => API.get(`${basePath}/${id}`, { headers }))
      )
      return fetched
        .filter(r => r.status === 'fulfilled' && r.value?.data?.data)
        .map(r => r.value.data.data)
    }

    const load = async () => {
      try {
        const merged = await getOrFetch(cacheKey, async () => {
          const basePath = isAirline ? '/airlines' : '/individuals'
          const emailEndpoint = isAirline ? '/airlines/by-email' : '/individuals/by-email'
          const emailSubs = user.email
            ? await API.get(`${emailEndpoint}?email=${encodeURIComponent(user.email)}`, { headers })
                .then(r => r.data.all || (r.data.data ? [r.data.data] : []))
                .catch(() => [])
            : []
          const resolvedIds = new Set(emailSubs.map(s => s._id?.toString()).filter(Boolean))
          const remainingIds = [
            ...(user.subscriptionIds || []),
            ...(user.registrationId ? [user.registrationId] : []),
          ].map(id => id?.toString()).filter(Boolean).filter(id => !resolvedIds.has(id))
          const idSubs = await fetchByIds(basePath, [...new Set(remainingIds)])
          return mergeAndSort(idSubs, emailSubs)
        })
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
  }, [user, token, getOrFetch, invalidate])

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
  const fmtYMD = (d) => {
    if (!d) return '—'
    const dt = new Date(d)
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  }
  const money = (n) => n != null ? `$${Number(n).toFixed(2)}` : '—'

  return (
    <DashboardLayout>
      {editOpen && (
        <EditProfileModal
          user={user}
          isAirline={user?.role === 'airline'}
          onClose={() => setEditOpen(false)}
          onSaveName={updateProfile}
          onSaveAirlineName={updateAirlineName}
        />
      )}

      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 mb-6">My Profile</h1>

        {/* ── Avatar card ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Avatar + info row */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl text-white text-xl sm:text-2xl font-black flex items-center justify-center flex-shrink-0"
                style={{ background: '#0000ff' }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">{fullName}</h2>
                <p className="text-slate-500 text-sm truncate">{user?.email}</p>
                <span className="inline-flex items-center mt-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-[10px] font-bold tracking-widest text-slate-600 capitalize">
                  {user?.role}
                </span>
              </div>
            </div>

            {/* Edit button */}
            <button
              onClick={() => setEditOpen(true)}
              className="self-start sm:self-auto flex-shrink-0 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" />
              </svg>
              Edit Profile
            </button>
          </div>
        </div>

        {/* ── Account Details ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Details</p>
            <button onClick={() => setEditOpen(true)} className="text-xs text-blue-600 font-semibold hover:underline">
              Edit Profile →
            </button>
          </div>
          <div className="px-4 sm:px-6 py-2">
            <InfoRow label="First Name" value={user?.firstName} />
            <InfoRow label="Last Name" value={user?.lastName} />
            <InfoRow label="Email Address" value={user?.email} />
            <InfoRow label="Account Role" value={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)} />
            {user?.role === 'airline' && <InfoRow label="Airline / Company" value={user?.airlineName || '—'} />}
            <InfoRow label="Account ID" value={user?.id} />
          </div>
        </div>

        {/* ── Subscription Plan ── */}
        {viewInvoice && <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subscription Plan</p>
            {sub && <StatusBadge status={sub.paymentStatus || sub.status} />}
          </div>

          {subLoading ? (
            <div className="px-4 sm:px-6 py-10 flex items-center justify-center">
              <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
                <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" />
              </svg>
              <span className="ml-3 text-sm text-slate-400">Loading subscription…</span>
            </div>
          ) : subs.length === 0 ? (
            <div className="px-4 sm:px-6 py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
                </svg>
              </div>
              <p className="text-slate-700 font-bold mb-1">No active subscription</p>
              <p className="text-slate-500 text-sm mb-4">Register to activate your FAA compliance service.</p>
              <Link to="/register"
                className="inline-flex items-center gap-2 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
                style={{ background: 'linear-gradient(135deg, #1a1aff 0%, #0000ff 100%)' }}>
                Register Now
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="px-4 sm:px-6 py-4 space-y-6">
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

                    {/* Plan banner */}
                    <div className={`rounded-xl p-4 mb-3 border ${
                      active ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100'
                             : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${active ? 'text-emerald-600' : 'text-amber-500'}`}>
                            {active ? 'Active Plan' : 'Pending Plan'}
                          </p>
                          <PlanBadge plan={s.subscriptionPlan} />
                        </div>
                        <div className="sm:text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                            {isAirline ? 'Total Amount' : 'Plan Price'}
                          </p>
                          <p className="text-xl sm:text-2xl font-black text-slate-900">
                            {isAirline ? money(s.totalAmount) : money(s.price || s.totalServiceFees)}
                          </p>
                        </div>
                      </div>

                      {/* Expiry row */}
                      <div className="mt-3 pt-3 border-t border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Expires</p>
                          <p className={`text-xs font-bold ${
                            s.subscriptionPlan === 'Unlimited Plan' ? 'text-emerald-600'
                              : s.expirationDate ? 'text-slate-800' : 'text-slate-400'
                          }`}>
                            {s.subscriptionPlan === 'Unlimited Plan'
                              ? 'Never (Unlimited ∞)'
                              : s.expirationDate ? fmtYMD(s.expirationDate)
                              : active ? '—' : 'Activates on payment'}
                          </p>
                        </div>
                        {active && (
                          <button
                            onClick={() => {
                              const inv = buildInvoice(
                                s, isAirline ? 'Airlines' : 'Individual',
                                Math.round((s.price || s.totalAmount || s.totalServiceFees || 0) * 100),
                                { id: s.invoiceNumber || '—' },
                                s.subscriptionDate || s.updatedAt || s.createdAt
                              )
                              setViewInvoice(inv)
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-white hover:border-red-300 hover:text-red-600 transition flex-shrink-0 self-start sm:self-auto"
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
                        <InfoRow label="Subscription Date" value={s.subscriptionDate ? fmtYMD(s.subscriptionDate) : (s.paymentStatus === 'paid' ? fmtYMD(s.updatedAt) : 'Activates on payment')} />
                        <InfoRow
                          label="Expiration Date"
                          value={
                            s.subscriptionPlan === 'Unlimited Plan' ? 'Never (Unlimited)'
                              : s.expirationDate ? fmt(s.expirationDate)
                              : s.paymentStatus === 'paid' ? '—' : 'Activates on payment'
                          }
                        />
                        <InfoRow label="Payment Status" value={<StatusBadge status={s.paymentStatus} />} />
                        <InfoRow label="Submitted" value={fmt(s.submittedAt || s.createdAt)} />
                        {s.certificateHolders?.length > 0 && (
                          <div className="mt-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Certificate Holders</p>
                            <div className="space-y-2">
                              {s.certificateHolders.map((h, i) => (
                                <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 px-3 sm:px-4 py-3">
                                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-bold text-slate-900">{h.fullName}</p>
                                      <p className="text-xs text-slate-500 mt-0.5">{h.certificateType}</p>
                                      {h.faaCertificateNumber && <p className="text-xs text-slate-400">FAA #: {h.faaCertificateNumber}</p>}
                                      {h.iacraFtnNumber && <p className="text-xs text-slate-400">FTN: {h.iacraFtnNumber}</p>}
                                    </div>
                                    <span className='text-[10px] font-bold uppercase tracking-widest flex-shrink-0' style={{ color: h.certificateStatus === 'EXISTING' ? '#047857' : '#64748b' }}>{h.certificateStatus}</span>
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
                        <InfoRow label="Subscription Date" value={s.subscriptionDate ? fmtYMD(s.subscriptionDate) : (active ? fmtYMD(s.updatedAt) : 'Activates on payment')} />
                        <InfoRow
                          label="Expiration Date"
                          value={
                            s.subscriptionPlan === 'Unlimited Plan' ? 'Never (Unlimited ∞)'
                              : s.expirationDate ? fmtYMD(s.expirationDate)
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
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 hover:border-blue-200 hover:shadow-md transition-all flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">Documents</p>
            <p className="text-xs text-slate-500">Access your FAA correspondence and uploaded files.</p>
          </div>
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </DashboardLayout>
  )
}
