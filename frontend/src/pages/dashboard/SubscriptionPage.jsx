import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { Link } from 'react-router-dom'
import axios from 'axios'

const API = axios.create({ baseURL: 'http://localhost:5000/api' })

function PlanBadge({ plan }) {
  const map = {
    '1 Year Subscription Plan': 'bg-blue-50 border-blue-200 text-blue-700',
    'Multiple Years Subscription Plan': 'bg-violet-50 border-violet-200 text-violet-700',
    'Unlimited Plan': 'bg-emerald-50 border-emerald-200 text-emerald-700',
  }
  return <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${map[plan] || 'bg-slate-50 border-slate-200 text-slate-600'}`}>{plan || 'Unknown Plan'}</span>
}

function PayBadge({ status }) {
  const map = { paid: 'bg-emerald-50 border-emerald-200 text-emerald-700', pending: 'bg-amber-50 border-amber-200 text-amber-600', failed: 'bg-red-50 border-red-200 text-red-700', Active: 'bg-emerald-50 border-emerald-200 text-emerald-700', Pending: 'bg-amber-50 border-amber-200 text-amber-600', Inactive: 'bg-slate-100 border-slate-200 text-slate-500' }
  const dot = { paid: 'bg-emerald-500', pending: 'bg-amber-400', failed: 'bg-red-500', Active: 'bg-emerald-500', Pending: 'bg-amber-400', Inactive: 'bg-slate-400' }
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${map[status] || 'bg-slate-50 border-slate-200 text-slate-600'}`}><span className={`w-1.5 h-1.5 rounded-full ${dot[status] || 'bg-slate-400'}`} />{status || 'Pending'}</span>
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

export default function SubscriptionPage() {
  const { user, token } = useAuth()
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.registrationId) { setLoading(false); return }
    const url = user.role === 'airline' ? `/airlines/${user.registrationId}` : `/individuals/${user.registrationId}`
    API.get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setSub(r.data.data))
      .catch(() => setSub(null))
      .finally(() => setLoading(false))
  }, [user])

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">My Account</p>
          <h1 className="text-2xl font-black text-slate-900">Subscription</h1>
          <p className="text-slate-500 text-sm mt-1">Your current plan and subscription details.</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-16 justify-center">
            <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>
            <span className="text-slate-400 text-sm">Loading subscription…</span>
          </div>
        ) : !sub ? (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Plan</p>
              </div>
              <div className="px-6 py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" /></svg>
                </div>
                <p className="text-slate-700 font-bold mb-1">No active subscription</p>
                <p className="text-slate-400 text-sm mb-5">Register to activate your FAA compliance service.</p>
                <Link to={user?.role === 'airline' ? '/airlines/register' : '/individual/register'}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all">
                  Register Now
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
              </div>
            </div>
            <div className="bg-slate-900 rounded-2xl p-6 text-center">
              <p className="text-white font-black text-lg mb-2">Choose a Plan</p>
              <p className="text-slate-400 text-sm mb-5">Starting from just $69/year for individuals.</p>
              <Link to="/#pricing" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all">
                View Plans
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
          </>
        ) : (
          <div className="space-y-5">
            {/* Plan banner */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-2">Active Subscription</p>
                <PlanBadge plan={sub.subscriptionPlan} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1">{user?.role === 'airline' ? 'Total Amount' : 'Plan Price'}</p>
                <p className="text-3xl font-black">{user?.role === 'airline' ? money(sub.totalAmount) : money(sub.price || sub.totalServiceFees)}</p>
              </div>
            </div>

            {/* Status + key info */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plan Details</p>
                <PayBadge status={sub.paymentStatus || sub.status} />
              </div>
              <div className="px-6 py-2">
                {user?.role === 'airline' ? (
                  <>
                    <Row label="Airline Name" value={sub.airlineName} />
                    <Row label="Subscription Plan" value={sub.subscriptionPlan} />
                    <Row label="Payment Status" value={<PayBadge status={sub.paymentStatus} />} />
                    <Row label="Price per Certificate" value={money(sub.pricePerCert)} />
                    <Row label="Certificate Holders" value={`${sub.certificateHolders?.length || 0} holder(s)`} />
                    <Row label="Total Amount Due" value={money(sub.totalAmount)} />
                    <Row label="Country" value={sub.country} />
                    <Row label="Submitted" value={fmt(sub.submittedAt || sub.createdAt)} />
                    {/* Holders list */}
                    {sub.certificateHolders?.length > 0 && (
                      <div className="mt-4 mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">Certificate Holders</p>
                        <div className="space-y-2">
                          {sub.certificateHolders.map((h, i) => (
                            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{h.fullName}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{h.certificateType}</p>
                                {h.faaCertificateNumber && <p className="text-xs text-slate-400">FAA #: {h.faaCertificateNumber}</p>}
                                {h.iacraFtnNumber && <p className="text-xs text-slate-400">FTN: {h.iacraFtnNumber}</p>}
                              </div>
                              <span className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-1 border flex-shrink-0 ${h.certificateStatus === 'EXISTING' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-violet-50 border-violet-200 text-violet-600'}`}>{h.certificateStatus}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Row label="Subscription Plan" value={sub.subscriptionPlan} />
                    <Row label="Status" value={<PayBadge status={sub.status || sub.paymentStatus} />} />
                    <Row label="Payment Status" value={<PayBadge status={sub.paymentStatus} />} />
                    <Row label="Plan Price" value={money(sub.price)} />
                    <Row label="Subscription Date" value={fmt(sub.subscriptionDate || sub.createdAt)} />
                    <Row label="Expiration Date" value={sub.subscriptionPlan === 'Unlimited Plan' ? 'Never (Unlimited)' : fmt(sub.expirationDate)} />
                    <Row label="Primary Certificate" value={sub.primaryCertificate} />
                    <Row label="Certificate Type" value={sub.primaryAirmanCertificate} />
                    {sub.faaCertificateNumber && <Row label="FAA Certificate #" value={sub.faaCertificateNumber} />}
                    {sub.iacraTrackingNumber && <Row label="IACRA Tracking # (FTN)" value={sub.iacraTrackingNumber} />}
                    <Row label="Submitted" value={fmt(sub.submittedAt || sub.createdAt)} />
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
