import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useDataCache } from '../../context/DataCacheContext'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Plane } from 'lucide-react'
import { getAirlineTotal } from '../../utils/airlineTotal'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const API = axios.create({ baseURL: BASE_URL })

function StatCard({ label, value, icon, accent = 'slate', sub }) {
  const configs = {
    slate:   { wrap: 'bg-white border-slate-200',           icon: 'bg-slate-100 text-slate-600',   badge: 'text-slate-800' },
    emerald: { wrap: 'bg-white border-emerald-100',         icon: 'bg-emerald-50 text-emerald-600', badge: 'text-emerald-700' },
    blue:    { wrap: 'bg-white border-blue-100',            icon: 'bg-blue-50 text-blue-600',       badge: 'text-blue-700' },
    amber:   { wrap: 'bg-white border-amber-100',           icon: 'bg-amber-50 text-amber-600',     badge: 'text-amber-700' },
    sky:     { wrap: 'bg-white border-sky-100',             icon: 'bg-sky-50 text-sky-600',         badge: 'text-sky-700' },
  }
  const c = configs[accent] || configs.slate
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-200 ${c.wrap}`}>
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
        <p className={`text-base sm:text-lg font-black truncate ${c.badge}`}>{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function ActionRow({ icon, label, to, href }) {
  const cls = "flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700 group"
  const inner = (
    <>
      <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-slate-200 transition-colors flex-shrink-0">
        {icon}
      </span>
      {label}
      <svg className="w-4 h-4 text-slate-300 ml-auto group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </>
  )
  if (href) return <a href={href} className={cls}>{inner}</a>
  return <Link to={to} className={cls}>{inner}</Link>
}

export default function UserDashboard() {
  const { user, token } = useAuth()
  const { getOrFetch, invalidate } = useDataCache()
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'
  const isAirline = user?.role === 'airline'
  const [sub, setSub] = useState(null)
  const [subLoading, setSubLoading] = useState(true)

  useEffect(() => {
    if (!user) { setSubLoading(false); return }
    const headers = { Authorization: `Bearer ${token}` }
    const isAirline = user.role === 'airline'
    const cacheKey = `sub_${user.id || user.email}`

    invalidate(cacheKey)

    const load = async () => {
      try {
        const result = await getOrFetch(cacheKey, async () => {
          const endpointById    = isAirline ? '/airlines'          : '/individuals'
          const endpointByEmail = isAirline ? '/airlines/by-email' : '/individuals/by-email'

          if (user.email) {
            try {
              const r = await API.get(`${endpointByEmail}?email=${encodeURIComponent(user.email)}`, { headers })
              if (r.data?.data) return r.data.data
            } catch { /* fall through */ }
          }

          if (user.registrationId) {
            try {
              const r = await API.get(`${endpointById}/${user.registrationId}`, { headers })
              if (r.data?.data) return r.data.data
            } catch { /* no record */ }
          }

          return null
        })
        setSub(result)
      } catch { /* no sub yet */ }
      finally { setSubLoading(false) }
    }
    load()
  }, [user, token, getOrFetch, invalidate])

  const getSubStatus = () => {
    if (subLoading) return { label: 'Loading…', accent: 'sky', sub: 'Checking subscription' }
    if (!sub) return { label: 'No Plan', accent: 'slate', sub: 'Register to activate' }
    const paid   = sub.isPaid === true || sub.paymentStatus === 'paid' || sub.status === 'Active'
    const failed = sub.paymentStatus === 'failed' || sub.status === 'Inactive'
    if (paid)   return { label: 'Active',   accent: 'emerald', sub: sub.subscriptionPlan }
    if (failed) return { label: 'Inactive', accent: 'slate',   sub: sub.subscriptionPlan }
    return { label: 'Pending', accent: 'amber', sub: sub.subscriptionPlan }
  }
  const subStatus = getSubStatus()

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">

        {/* ── Welcome banner ── */}
        <div
          className="relative rounded-2xl overflow-hidden border border-slate-200"
          style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}
        >
          <div className="relative z-10 px-5 sm:px-7 py-5 sm:py-6 flex flex-col items-center text-center gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Welcome back</p>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">Hello, {user?.firstName || fullName} 👋</h1>
              <p className="text-slate-500 text-sm mt-1">Here's an overview of your IFOA USA account.</p>
            </div>
            {!subLoading && !sub && (
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl px-4 sm:px-5 py-2.5 text-sm font-bold text-white transition-all"
                style={{ background: '#0000ff' }}
                onMouseEnter={e => e.currentTarget.style.background = '#0000e6'}
                onMouseLeave={e => e.currentTarget.style.background = '#0000ff'}
              >
                {isAirline ? <><Plane className="w-4 h-4" /> Airlines Registration</> : 'Complete Registration'}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            )}
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            label="Subscription Status"
            value={subStatus.label}
            accent={subStatus.accent}
            sub={subStatus.sub}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" /></svg>}
          />
          <StatCard
            label="Account Type"
            value={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
            accent="slate"
            sub="Current role"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="8" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>}
          />
          <StatCard
            label="Plan"
            value={sub
              ? sub.subscriptionPlan?.includes('Unlimited') ? 'Unlimited'
                : sub.subscriptionPlan?.includes('Multiple') ? `Multi-Year`
                : '1 Year'
              : 'None'}
            accent={sub ? 'sky' : 'slate'}
            sub={sub ? `$${isAirline ? getAirlineTotal(sub).toFixed(2) : Number(sub.price ?? sub.totalAmount ?? 0).toFixed(2)}` : 'No plan selected'}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
          />
        </div>

        {/* ── Info grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {/* Account info */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="8" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Info</p>
              </div>
              <Link to="/dashboard/profile" className="text-xs text-slate-500 font-semibold hover:text-slate-700 hover:underline">Edit →</Link>
            </div>
            <div className="px-4 sm:px-5 py-4 space-y-3">
              {[
                { label: 'Full Name', value: fullName },
                { label: 'Email', value: user?.email },
                { label: 'Role', value: user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center text-sm py-1 border-b border-slate-50 last:border-0 gap-2">
                  <span className="text-slate-400 font-medium flex-shrink-0">{r.label}</span>
                  <span className="text-slate-800 font-semibold truncate text-right">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Actions</p>
            </div>
            <div className="px-2 py-2 space-y-0.5">
              <ActionRow to="/dashboard/profile" label="Edit Profile"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="8" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>} />
              <ActionRow to="/dashboard/subscription" label="View Subscription"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" /></svg>} />
              <ActionRow to="/dashboard/documents" label="My Documents"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" /></svg>} />
              <ActionRow href="mailto:agent@theifoa.com" label="Contact Support"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>} />
            </div>
          </div>
        </div>

        {/* ── No subscription notice ── */}
        {!subLoading && !sub && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 mb-1">Complete your FAA registration</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Submit your FAA certificate details to activate your U.S. Agent for Service.
              </p>
            </div>
          </div>
        )}

        {/* ── Subscription summary ── */}
        {!subLoading && sub && (() => {
          const isPaid = sub.isPaid === true || sub.paymentStatus === 'paid' || sub.status === 'Active'
          const isUnlimited = sub.subscriptionPlan === 'Unlimited Plan'
          const daysToExpiry = sub.expirationDate
            ? Math.ceil((new Date(sub.expirationDate) - new Date()) / (1000 * 60 * 60 * 24))
            : null
          const isExpired = isPaid && !isUnlimited && daysToExpiry !== null && daysToExpiry <= 0

          if (isExpired) {
            return (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-900 mb-1">Subscription expired</p>
                  <p className="text-xs text-red-700 leading-relaxed">
                    Plan: <strong>{sub.subscriptionPlan}</strong>. Renew now to restore FAA compliance coverage.
                  </p>
                </div>
                <Link
                  to="/dashboard/subscription"
                  className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-100 transition-all"
                >
                  Renew Now →
                </Link>
              </div>
            )
          }

          return (
            <div className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-4 ${
              isPaid ? 'border-emerald-100 bg-emerald-50' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isPaid ? 'bg-emerald-100' : 'bg-slate-100'
              }`}>
                <svg className={`w-5 h-5 ${isPaid ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {isPaid
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    : <><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></>}
                </svg>
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold mb-1 ${isPaid ? 'text-emerald-900' : 'text-slate-800'}`}>
                  {isPaid ? 'Your subscription is active' : 'Payment pending — your plan is awaiting confirmation'}
                </p>
                <p className={`text-xs leading-relaxed ${isPaid ? 'text-emerald-700' : 'text-slate-500'}`}>
                  Plan: <strong>{sub.subscriptionPlan}</strong>.
                  {!isPaid ? ' Complete payment to activate your subscription.' : ' Your U.S. Agent for Service is active and ready.'}
                </p>
              </div>
              <Link
                to="/dashboard/subscription"
                className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                  isPaid ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                View Details →
              </Link>
            </div>
          )
        })()}
      </div>
    </DashboardLayout>
  )
}
