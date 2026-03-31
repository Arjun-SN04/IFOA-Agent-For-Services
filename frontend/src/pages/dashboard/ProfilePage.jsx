import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { Link } from 'react-router-dom'
import axios from 'axios'

const API = axios.create({ baseURL: 'http://localhost:5000/api' })

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

export default function ProfilePage() {
  const { user, token, updateProfile } = useAuth()
  const [sub, setSub] = useState(null)
  const [subLoading, setSubLoading] = useState(true)
  const [editNameOpen, setEditNameOpen] = useState(false)

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'

  useEffect(() => {
    if (!user) { setSubLoading(false); return }
    const headers = { Authorization: `Bearer ${token}` }
    const isAirline = user.role === 'airline'

    const load = async () => {
      try {
        if (user.registrationId) {
          const url = isAirline
            ? `/airlines/${user.registrationId}`
            : `/individuals/${user.registrationId}`
          const r = await API.get(url, { headers })
          setSub(r.data.data)
          return
        }
        if (user.email) {
          const url = isAirline
            ? `/airlines/by-email?email=${encodeURIComponent(user.email)}`
            : `/individuals/by-email?email=${encodeURIComponent(user.email)}`
          const r = await API.get(url, { headers })
          setSub(r.data.data)
          return
        }
        setSub(null)
      } catch {
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
            <span className="inline-flex items-center gap-1.5 mt-2 rounded-full bg-white/70 border border-blue-200 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-700 capitalize">
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

        {/* ── SUBSCRIPTION PLAN SECTION ── */}
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
          ) : !sub ? (
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
          ) : user?.role === 'airline' ? (
            /* ── AIRLINE SUBSCRIPTION DETAILS ── */
            <div className="px-6 py-4">
              <div className={`rounded-xl p-4 mb-4 flex items-center justify-between border ${
                (sub.paymentStatus === 'paid' || sub.status === 'Active')
                  ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100'
                  : 'bg-gradient-to-r from-blue-50 to-sky-50 border-blue-100'
              }`}>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                    (sub.paymentStatus === 'paid' || sub.status === 'Active') ? 'text-emerald-600' : 'text-blue-600'
                  }`}>
                    {(sub.paymentStatus === 'paid' || sub.status === 'Active') ? 'Active Plan' : 'Pending Plan'}
                  </p>
                  <PlanBadge plan={sub.subscriptionPlan} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Amount</p>
                  <p className="text-2xl font-black text-slate-900">{money(sub.totalAmount)}</p>
                </div>
              </div>

              <InfoRow label="Airline Name" value={sub.airlineName} />
              <InfoRow label="Contact Person" value={`${sub.contactFirstName || ''} ${sub.contactLastName || ''}`.trim()} />
              <InfoRow label="Contact Email" value={sub.contactEmail} />
              <InfoRow label="Contact Phone" value={sub.contactPhone} />
              <InfoRow label="Country" value={sub.country} />
              <InfoRow label="Price per Certificate" value={money(sub.pricePerCert)} />
              <InfoRow label="Certificate Holders" value={`${sub.certificateHolders?.length || 0} holder(s)`} />
              <InfoRow label="Payment Status" value={<StatusBadge status={sub.paymentStatus} />} />
              <InfoRow label="Submitted" value={fmt(sub.submittedAt || sub.createdAt)} />

              {sub.certificateHolders?.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Certificate Holders</p>
                  <div className="space-y-2">
                    {sub.certificateHolders.map((h, i) => (
                      <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{h.fullName}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{h.certificateType}</p>
                            {h.faaCertificateNumber && <p className="text-xs text-slate-400">FAA #: {h.faaCertificateNumber}</p>}
                            {h.iacraFtnNumber && <p className="text-xs text-slate-400">FTN: {h.iacraFtnNumber}</p>}
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-1 border ${
                            h.certificateStatus === 'EXISTING'
                              ? 'bg-red-50 border-red-200 text-red-600'
                              : 'bg-slate-100 border-slate-300 text-slate-600'
                          }`}>{h.certificateStatus}</span>
                        </div>
                        {h.hasSecondary && (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Secondary Certificate</p>
                            <p className="text-xs text-slate-600">{h.secondaryCertificateType}</p>
                            {h.secondaryFaaCertificateNumber && <p className="text-xs text-slate-400">FAA #: {h.secondaryFaaCertificateNumber}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── INDIVIDUAL SUBSCRIPTION DETAILS ── */
            <div className="px-6 py-4">
              <div className={`rounded-xl p-4 mb-4 flex items-center justify-between border ${
                (sub.paymentStatus === 'paid' || sub.status === 'Active')
                  ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100'
                  : 'bg-gradient-to-r from-blue-50 to-sky-50 border-blue-100'
              }`}>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                    (sub.paymentStatus === 'paid' || sub.status === 'Active') ? 'text-emerald-600' : 'text-blue-600'
                  }`}>
                    {(sub.paymentStatus === 'paid' || sub.status === 'Active') ? 'Active Plan' : 'Pending Plan'}
                  </p>
                  <PlanBadge plan={sub.subscriptionPlan} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Plan Price</p>
                  <p className="text-2xl font-black text-slate-900">{money(sub.price || sub.totalServiceFees)}</p>
                </div>
              </div>

              <InfoRow label="Status" value={<StatusBadge status={sub.status || sub.paymentStatus} />} />
              <InfoRow label="Subscription Date" value={fmt(sub.subscriptionDate || sub.createdAt)} />
              <InfoRow label="Expiration Date" value={sub.subscriptionPlan === 'Unlimited Plan' ? 'Never (Unlimited)' : fmt(sub.expirationDate)} />
              <InfoRow label="Primary Certificate" value={sub.primaryCertificate} />
              <InfoRow label="Certificate Type" value={sub.primaryAirmanCertificate} />
              {sub.faaCertificateNumber && <InfoRow label="FAA Certificate #" value={sub.faaCertificateNumber} />}
              {sub.iacraTrackingNumber && <InfoRow label="IACRA Tracking # (FTN)" value={sub.iacraTrackingNumber} />}
              {sub.hasSecondaryCertificate && (
                <>
                  <InfoRow label="Secondary Certificate" value={sub.secondaryCertificate} />
                  {sub.secondaryFaaCertificateNumber && <InfoRow label="Secondary FAA #" value={sub.secondaryFaaCertificateNumber} />}
                  {sub.secondaryIacraTrackingNumber && <InfoRow label="Secondary FTN" value={sub.secondaryIacraTrackingNumber} />}
                </>
              )}
              <InfoRow label="Payment Status" value={<StatusBadge status={sub.paymentStatus} />} />
              <InfoRow label="Submitted" value={fmt(sub.submittedAt || sub.createdAt)} />
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
