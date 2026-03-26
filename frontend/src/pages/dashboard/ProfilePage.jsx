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
    '1 Year Subscription Plan': 'bg-blue-50 border-blue-200 text-blue-700',
    'Multiple Years Subscription Plan': 'bg-violet-50 border-violet-200 text-violet-700',
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
    pending: 'bg-amber-50 border-amber-200 text-amber-700',
    Pending: 'bg-amber-50 border-amber-200 text-amber-700',
    failed:  'bg-red-50 border-red-200 text-red-700',
    Inactive:'bg-slate-100 border-slate-200 text-slate-600',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${map[status] || 'bg-slate-50 border-slate-200 text-slate-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        (status === 'paid' || status === 'Active') ? 'bg-emerald-500' :
        (status === 'pending' || status === 'Pending') ? 'bg-amber-500' :
        status === 'failed' ? 'bg-red-500' : 'bg-slate-400'
      }`} />
      {status}
    </span>
  )
}

export default function ProfilePage() {
  const { user, token } = useAuth()
  const [sub, setSub] = useState(null)
  const [subLoading, setSubLoading] = useState(true)

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'

  useEffect(() => {
    if (!user?.registrationId) { setSubLoading(false); return }
    const endpoint = user.role === 'airline'
      ? `/airlines/${user.registrationId}`
      : `/individuals/${user.registrationId}`
    API.get(endpoint, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setSub(r.data.data))
      .catch(() => setSub(null))
      .finally(() => setSubLoading(false))
  }, [user])

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
  const money = (n) => n != null ? `${Number(n).toFixed(2)}` : '—'

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Account</p>
          <h1 className="text-2xl font-black text-slate-900">My Profile</h1>
          <p className="text-slate-500 text-sm mt-1">Your account information and active subscription plan.</p>
        </div>

        {/* Avatar card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white text-2xl font-black flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-600/30">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">{fullName}</h2>
            <p className="text-slate-500 text-sm">{user?.email}</p>
            <span className="inline-flex items-center gap-1.5 mt-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-600 capitalize">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {user?.role}
            </span>
          </div>
        </div>

        {/* Account Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Details</p>
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
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
                </svg>
              </div>
              <p className="text-slate-700 font-bold mb-1">No active subscription</p>
              <p className="text-slate-500 text-sm mb-4">Register to activate your FAA compliance service.</p>
              <Link
                to={user?.role === 'airline' ? '/airlines/register' : '/individual/register'}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
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
              {/* Plan highlight banner */}
              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100 p-4 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Active Plan</p>
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

              {/* Certificate holders list */}
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
                              ? 'bg-blue-50 border-blue-200 text-blue-600'
                              : 'bg-violet-50 border-violet-200 text-violet-600'
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
              {/* Plan highlight banner */}
              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100 p-4 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Active Plan</p>
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
