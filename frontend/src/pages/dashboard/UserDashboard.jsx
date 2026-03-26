import { useAuth } from '../../context/AuthContext'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

function StatCard({ label, value, icon, accent = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${colors[accent]}`}>
        {icon}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-black text-slate-900">{value}</p>
    </div>
  )
}

export default function UserDashboard() {
  const { user } = useAuth()
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Welcome back</p>
          <h1 className="text-3xl font-black text-slate-900">Hello, {user?.firstName || fullName} 👋</h1>
          <p className="text-slate-500 text-sm mt-1">
            Here's an overview of your IFOA USA account.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Account Status"
            value="Active"
            accent="emerald"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
          />
          <StatCard
            label="Account Type"
            value={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
            accent="blue"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="8" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>}
          />
          <StatCard
            label="Documents"
            value="0 Pending"
            accent="amber"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" /></svg>}
          />
        </div>

        {/* Info section */}
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          {/* Account info */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Info</p>
              <Link to="/dashboard/profile" className="text-xs text-blue-600 font-semibold hover:underline">View all</Link>
            </div>
            <div className="px-5 py-4 space-y-3">
              {[
                { label: 'Name', value: fullName },
                { label: 'Email', value: user?.email },
                { label: 'Role', value: user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-slate-400 font-medium">{r.label}</span>
                  <span className="text-slate-900 font-semibold truncate max-w-[200px]">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Actions</p>
            </div>
            <div className="px-5 py-4 space-y-2">
              <Link to="/dashboard/profile"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="8" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                Edit Profile
              </Link>
              <Link to="/dashboard/subscription"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
                </svg>
                View Subscription
              </Link>
              <a href="mailto:agent@theifoa.com"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                Contact Support
              </a>
            </div>
          </div>
        </div>

        {/* CTA to register */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-white font-bold text-base mb-1">Complete your registration</p>
            <p className="text-slate-400 text-sm">Submit your FAA certificate details to activate your service.</p>
          </div>
          <Link
            to={user?.role === 'airline' ? '/airlines/register' : '/individual/register'}
            className="flex-shrink-0 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
          >
            {user?.role === 'airline' ? '✈ Airlines Registration' : 'Individual Registration'}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
