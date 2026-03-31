import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import axios from 'axios'
import PaymentModal from '../../components/PaymentModal'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const API = axios.create({ baseURL: BASE_URL })

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

export default function SubscriptionPage() {
  const { user, token, linkRegistration } = useAuth()
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPayModal, setShowPayModal] = useState(false)

  const regId = user?.registrationId || sub?._id
  const regModel = user?.registrationModel ||
    (user?.role === 'airline' ? 'Airlines' : 'Individual')

  const isPending = sub && sub.paymentStatus !== 'paid' && sub.status !== 'Active'

  useEffect(() => {
    if (!user) { setLoading(false); return }

    const headers = { Authorization: `Bearer ${token}` }
    const isAirline = user.role === 'airline'

    const fetchAndLink = async (data) => {
      setSub(data)
      if (!user.registrationId && data?._id) {
        try {
          await linkRegistration(data._id, isAirline ? 'Airlines' : 'Individual')
        } catch (_) { /* non-fatal */ }
      }
    }

    const load = async () => {
      try {
        if (user.registrationId) {
          const url = isAirline ? `/airlines/${user.registrationId}` : `/individuals/${user.registrationId}`
          const r = await API.get(url, { headers })
          setSub(r.data.data)
          return
        }
        if (user.email) {
          const url = isAirline
            ? `/airlines/by-email?email=${encodeURIComponent(user.email)}`
            : `/individuals/by-email?email=${encodeURIComponent(user.email)}`
          const r = await API.get(url, { headers })
          await fetchAndLink(r.data.data)
          return
        }
        setSub(null)
      } catch {
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
        ) : !sub ? (
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
          <div className="space-y-5">
            {/* ── Pay Now CTA — BLUE instead of amber ── */}
            {isPending && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">Payment pending</p>
                    <p className="text-xs text-blue-700 leading-relaxed">Complete your payment to activate your FAA Agent for Service subscription.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPayModal(true)}
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
            <div className={`rounded-2xl p-6 text-white flex items-center justify-between ${
              (sub.paymentStatus === 'paid' || sub.status === 'Active')
                ? 'bg-gradient-to-r from-red-700 to-red-600'
                : (sub.paymentStatus === 'failed' || sub.status === 'Inactive')
                  ? 'bg-gradient-to-r from-slate-700 to-slate-600'
                  : 'bg-gradient-to-r from-blue-700 to-blue-600'
            }`}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-2">
                  {(sub.paymentStatus === 'paid' || sub.status === 'Active')
                    ? 'Active Subscription'
                    : (sub.paymentStatus === 'failed' || sub.status === 'Inactive')
                      ? 'Inactive Subscription'
                      : 'Pending Subscription'}
                </p>
                <PlanBadge plan={sub.subscriptionPlan} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">{user?.role === 'airline' ? 'Total Amount' : 'Plan Price'}</p>
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
                    {sub.certificateHolders?.length > 0 && (
                      <div className="mt-4 mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-3">Certificate Holders</p>
                        <div className="space-y-2">
                          {sub.certificateHolders.map((h, i) => (
                            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{h.fullName}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{h.certificateType}</p>
                                {h.faaCertificateNumber && <p className="text-xs text-slate-400">FAA #: {h.faaCertificateNumber}</p>}
                                {h.iacraFtnNumber && <p className="text-xs text-slate-400">FTN: {h.iacraFtnNumber}</p>}
                              </div>
                              <span className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-1 border flex-shrink-0 ${h.certificateStatus === 'EXISTING' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-100 border-slate-300 text-slate-600'}`}>{h.certificateStatus}</span>
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

      <AnimatePresence>
        {showPayModal && sub && (
          <PaymentModal
            sub={sub}
            registrationId={regId}
            registrationModel={regModel}
            onClose={() => setShowPayModal(false)}
            onSuccess={(updated) => {
              setSub(updated)
              setShowPayModal(false)
            }}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}
