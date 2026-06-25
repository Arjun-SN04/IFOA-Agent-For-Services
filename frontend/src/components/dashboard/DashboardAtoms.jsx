import { motion } from 'framer-motion'

// ── Modern stat card for admin overview ───────────────────────────────────────
export function StatCard({ label, value, sub, icon, accent = 'default' }) {
  const cfg = {
    blue:    { border: 'border-blue-100',    iconBg: 'bg-blue-50',    iconColor: 'text-blue-600',    bar: 'bg-blue-500'    },
    emerald: { border: 'border-emerald-100', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', bar: 'bg-emerald-500' },
    violet:  { border: 'border-violet-100',  iconBg: 'bg-violet-50',  iconColor: 'text-violet-600',  bar: 'bg-violet-500'  },
    amber:   { border: 'border-amber-100',   iconBg: 'bg-amber-50',   iconColor: 'text-amber-600',   bar: 'bg-amber-500'   },
    default: { border: 'border-slate-200',   iconBg: 'bg-slate-50',   iconColor: 'text-slate-500',   bar: 'bg-slate-400'   },
  }
  const c = cfg[accent] || cfg.default
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`bg-white rounded-2xl border ${c.border} overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
    >
      <div className={`h-1 ${c.bar}`} />
      <div className="p-5">
        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.iconBg}`}>
            <span className={c.iconColor}>{icon}</span>
          </div>
        )}
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
      </div>
    </motion.div>
  )
}

// ── Overview panel with modern charts ─────────────────────────────────────────
export function OverviewPanel({ individuals, airlines }) {
  const indTotal   = individuals.reduce((s, r) => s + (Number(r.price) || 0), 0)
  const airTotal   = airlines.reduce((s, r) => s + (Number(r.totalAmount) || Number(r.totalServiceFees) || 0), 0)
  const indPaid    = individuals.filter(r => r.isPaid === true || (r.isPaid == null && r.paymentStatus === 'paid')).length
  const airPaid    = airlines.filter(r => r.isPaid === true || (r.isPaid == null && r.paymentStatus === 'paid')).length
  const allHolders = airlines.reduce((s, r) => s + (r.certificateHolders?.length || 0), 0)

  const planCounts = {
    '1 Year':     individuals.filter(r => r.subscriptionPlan === '1 Year Subscription Plan').length,
    'Multi-Year': individuals.filter(r => r.subscriptionPlan === 'Multiple Years Subscription Plan').length,
    'Unlimited':  individuals.filter(r => r.subscriptionPlan === 'Unlimited Plan').length,
  }

  const countryCounts = {}
  individuals.forEach(r => { if (r.country) countryCounts[r.country] = (countryCounts[r.country] || 0) + 1 })
  const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxCountryCount = topCountries[0]?.[1] || 1

  const airlineCountryCounts = {}
  airlines.forEach(r => { if (r.country) airlineCountryCounts[r.country] = (airlineCountryCounts[r.country] || 0) + 1 })
  const topAirlineCountries = Object.entries(airlineCountryCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxAirlineCount = topAirlineCountries[0]?.[1] || 1

  return (
    <div className="space-y-6 page-enter">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Individuals" value={individuals.length} sub="Registered" accent="blue"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="9.5" cy="7" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /></svg>} />
        <StatCard label="Airlines" value={airlines.length} sub="Operators" accent="violet"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>} />
        <StatCard label="Cert Holders" value={allHolders} sub="Airline total" accent="amber"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="4" width="18" height="16" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6M15 16l-1 3 2-1 2 1-1-3" /><circle cx="16" cy="14" r="2" /></svg>} />
        <StatCard label="Indiv. Revenue" value={'$' + indTotal.toLocaleString('en-US')} sub="Individual fees" accent="emerald"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12M15 8H10.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H9" /></svg>} />
        <StatCard label="Airline Revenue" value={'$' + airTotal.toLocaleString('en-US')} sub="Airline fees" accent="emerald"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 12h.01M18 12h.01" /></svg>} />
        <StatCard label="Paid" value={indPaid + airPaid} sub={`${indPaid} ind · ${airPaid} air`} accent="emerald"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>} />
      </div>

      {/* ── Charts row ── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Plan Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-1" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Plan Distribution</p>
          <p className="text-sm font-bold text-slate-700 mb-5">Individual subscriptions</p>
          <div className="space-y-4">
            {Object.entries(planCounts).map(([plan, count], i) => {
              const pct = individuals.length ? Math.round((count / individuals.length) * 100) : 0
              const colors = ['bg-red-500', 'bg-blue-500', 'bg-emerald-500']
              return (
                <div key={plan}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700">{plan}</span>
                    <span className="font-bold text-slate-900">{count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${colors[i]}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Revenue donut summary */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Revenue Split</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-0.5">Individual</p>
                <p className="text-base font-black text-slate-900">${indTotal.toLocaleString()}</p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-0.5">Airline</p>
                <p className="text-base font-black text-slate-900">${airTotal.toLocaleString()}</p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-0.5">Total</p>
                <p className="text-base font-black text-red-600">${(indTotal + airTotal).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top countries — individuals */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Top Countries</p>
          <p className="text-sm font-bold text-slate-700 mb-5">Individual registrations</p>
          {topCountries.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {topCountries.map(([country, count]) => (
                <div key={country} className="flex items-center gap-3">
                  <span className="text-sm text-slate-700 font-medium w-28 truncate flex-shrink-0">{country}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-red-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((count / maxCountryCount) * 100)}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600 w-4 text-right flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top countries — airlines */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Top Countries</p>
          <p className="text-sm font-bold text-slate-700 mb-5">Airline registrations</p>
          {topAirlineCountries.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {topAirlineCountries.map(([country, count]) => (
                <div key={country} className="flex items-center gap-3">
                  <span className="text-sm text-slate-700 font-medium w-28 truncate flex-shrink-0">{country}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-violet-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((count / maxAirlineCount) * 100)}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600 w-4 text-right flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Payment status summary */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Payment Status</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                <p className="text-xl font-black text-emerald-700">{airPaid}</p>
                <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Paid</p>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
                <p className="text-xl font-black text-amber-700">{airlines.length - airPaid}</p>
                <p className="text-[10px] font-bold text-amber-600 mt-0.5">Pending</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
