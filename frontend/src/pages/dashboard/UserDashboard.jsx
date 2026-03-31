import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'

const API = axios.create({ baseURL: 'http://localhost:5000/api' })

function StatCard({ label, value, icon, accent = 'red', sub }) {
  const configs = {
    red:     { wrap: 'bg-red-50 border-red-100',         icon: 'bg-red-600 text-white',     badge: 'text-red-700' },
    emerald: { wrap: 'bg-emerald-50 border-emerald-100', icon: 'bg-emerald-600 text-white', badge: 'text-emerald-700' },
    blue:    { wrap: 'bg-blue-50 border-blue-100',       icon: 'bg-blue-600 text-white',    badge: 'text-blue-700' },
    sky:     { wrap: 'bg-sky-50 border-sky-100',         icon: 'bg-sky-600 text-white',     badge: 'text-sky-700' },
  }
  const c = configs[accent] || configs.red
  return (
    <div className={`rounded-2xl border p-5 flex items-center gap-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 ${c.wrap}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
        <p className={`text-lg font-black ${c.badge}`}>{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function ActionRow({ icon, label, to, href }) {
  const cls = "flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700 group"
  const inner = (
    <>
      <span className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600 group-hover:bg-red-100 transition-colors flex-shrink-0">
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
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'
  const [sub, setSub] = useState(null)
  const [subLoading, setSubLoading] = useState(true)

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
      } catch { /* no sub yet */ }
      finally { setSubLoading(false) }
    }
    load()
  }, [user])

  const getSubStatus = () => {
    if (subLoading) return { label: 'Loading…', accent: 'sky', sub: 'Checking subscription' }
    if (!sub) return { label: 'No Plan', accent: 'blue', sub: 'Register to activate' }
    const paid = sub.paymentStatus === 'paid' || sub.status === 'Active'
    const failed = sub.paymentStatus === 'failed' || sub.status === 'Inactive'
    if (paid)   return { label: 'Active', accent: 'emerald', sub: sub.subscriptionPlan }
    if (failed) return { label: 'Inactive', accent: 'red', sub: sub.subscriptionPlan }
    return { label: 'Pending', accent: 'blue', sub: sub.subscriptionPlan }
  }
  const subStatus = getSubStatus()

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Welcome banner — LIGHT THEME ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative rounded-2xl overflow-hidden border border-blue-100"
          style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 45%, #e0f2fe 100%)' }}
        >
          {/* Decorative blue glow */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }} />
          <div className="relative z-10 px-7 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Welcome back</p>
              <h1 className="text-2xl font-black text-slate-900">Hello, {user?.firstName || fullName} 👋</h1>
              <p className="text-slate-500 text-sm mt-1">Here's an overview of your IFOA USA account.</p>
            </div>
            {!subLoading && !sub && (
              <Link
                to={user?.role === 'airline' ? '/airlines/register' : '/individual/register'}
                className="flex-shrink-0 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all shadow-lg"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}
              >
                {user?.role === 'airline' ? '✈ Airlines Registration' : 'Complete Registration'}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            )}
          </div>
        </motion.div>

        {/* ── Stat cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
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
            accent="red"
            sub="Current role"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="8" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>}
          />
          <StatCard
            label="Plan"
            value={sub ? sub.subscriptionPlan?.split(' ')[0] + (sub.subscriptionPlan?.includes('Unlimited') ? ' Unlimited' : ' Year') : 'None'}
            accent={sub ? 'sky' : 'blue'}
            sub={sub ? `${sub.price ?? sub.totalAmount ?? 0}` : 'No plan selected'}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
          />
        </motion.div>

        {/* ── Info grid ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-5"
        >
          {/* Account info */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="8" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Info</p>
              </div>
              <Link to="/dashboard/profile" className="text-xs text-red-600 font-semibold hover:underline">Edit →</Link>
            </div>
            <div className="px-5 py-4 space-y-3">
              {[
                { label: 'Full Name', value: fullName },
                { label: 'Email', value: user?.email },
                { label: 'Role', value: user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center text-sm py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-400 font-medium">{r.label}</span>
                  <span className="text-slate-800 font-semibold truncate max-w-[200px]">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Actions</p>
            </div>
            <div className="px-2 py-2 space-y-0.5">
              <ActionRow
                to="/dashboard/profile"
                label="Edit Profile"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="8" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>}
              />
              <ActionRow
                to="/dashboard/subscription"
                label="View Subscription"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" /></svg>}
              />
              <ActionRow
                to="/dashboard/documents"
                label="My Documents"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" /></svg>}
              />
              <ActionRow
                href="mailto:agent@theifoa.com"
                label="Contact Support"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>}
              />
            </div>
          </div>
        </motion.div>

        {/* ── Info notice — only shown if not yet registered ── */}
        {!subLoading && !sub && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.22 }}
            className="rounded-2xl border border-blue-200 bg-blue-50 p-5 flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-blue-900 mb-1">Complete your FAA registration</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Submit your FAA certificate details to activate your U.S. Agent for Service. This is required to receive and manage your FAA correspondence.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Subscription summary — shown when registered ── */}
        {!subLoading && sub && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.22 }}
            className={`rounded-2xl border p-5 flex items-start gap-4 ${
              sub.paymentStatus === 'paid' || sub.status === 'Active'
                ? 'border-emerald-100 bg-emerald-50'
                : 'border-blue-200 bg-blue-50'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              sub.paymentStatus === 'paid' || sub.status === 'Active' ? 'bg-emerald-100' : 'bg-blue-100'
            }`}>
              <svg className={`w-5 h-5 ${
                sub.paymentStatus === 'paid' || sub.status === 'Active' ? 'text-emerald-600' : 'text-blue-600'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {sub.paymentStatus === 'paid' || sub.status === 'Active'
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  : <><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></>}
              </svg>
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold mb-1 ${
                sub.paymentStatus === 'paid' || sub.status === 'Active' ? 'text-emerald-900' : 'text-blue-900'
              }`}>
                {sub.paymentStatus === 'paid' || sub.status === 'Active'
                  ? 'Your subscription is active'
                  : 'Payment pending — your plan is awaiting confirmation'}
              </p>
              <p className={`text-xs leading-relaxed ${
                sub.paymentStatus === 'paid' || sub.status === 'Active' ? 'text-emerald-700' : 'text-blue-700'
              }`}>
                Plan: <strong>{sub.subscriptionPlan}</strong>.
                {sub.paymentStatus !== 'paid' && sub.status !== 'Active'
                  ? ' Our team will process your invoice and update your status shortly.'
                  : ' Your U.S. Agent for Service is active and ready to receive FAA correspondence.'}
              </p>
            </div>
            <Link
              to="/dashboard/subscription"
              className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                sub.paymentStatus === 'paid' || sub.status === 'Active'
                  ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}
            >
              View Details →
            </Link>
          </motion.div>
        )}

      </div>
    </DashboardLayout>
  )
}
