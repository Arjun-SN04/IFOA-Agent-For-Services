import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/IFOA_USA_blanc_V.png'

const roles = [
  { value: 'individual', label: 'Individual Pilot / Dispatcher', desc: 'Part 61/65 certificate holders' },
  { value: 'airline', label: 'Airline / Operator', desc: 'Companies with 3+ certificate holders' },
]

export default function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname

  const [role, setRole] = useState('individual')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [airlineName, setAirlineName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (role === 'airline' && !airlineName.trim()) { setError('Airline / company name is required.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPw) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const user = await signup(email, password, role, firstName, lastName, role === 'airline' ? airlineName.trim() : undefined)
      if (from && from !== '/signup' && from !== '/login') {
        navigate(from, { replace: true })
      } else {
        navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      {/* Left branding panel — fixed, always visible */}
      <div className="hidden lg:flex lg:w-[45%] flex-shrink-0 relative flex-col justify-between p-12 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=1400&q=85&auto=format&fit=crop&crop=center"
          alt="Aviation"
          className="absolute inset-0 w-full h-full object-cover"
          onError={e => {
            const fallbacks = [
              'https://images.unsplash.com/photo-1436491865332-7a61a109db56?w=1400&q=85&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=1400&q=85&auto=format&fit=crop',
            ]
            const idx = fallbacks.indexOf(e.target.src)
            if (idx < fallbacks.length - 1) {
              e.target.src = fallbacks[idx + 1]
            } else {
              e.target.onerror = null
              e.target.style.display = 'none'
            }
          }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.35) 100%)' }} />

        <div className="relative z-10">
          <Link to="/">
            <img src={logo} alt="IFOA USA" className="h-10 w-auto brightness-0 invert" />
          </Link>
        </div>

        <div className="relative z-10 space-y-5">
          <div className="inline-flex items-center rounded-full px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20">
            <span className="text-white text-xs font-semibold tracking-wide">
              Join IFOA USA
            </span>
          </div>
          <h1 className="text-4xl font-black leading-tight" style={{ color: '#ffffff', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
            Stay FAA<br />
            <span style={{ color: '#f87171' }}>Compliant</span>
          </h1>
          <div className="space-y-3">
            {[
              'Dedicated U.S. Mailing Address',
              'Real-Time Document Notifications',
              'FAA Compliance Guaranteed',
            ].map(f => (
              <div key={f} className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-5 h-5 rounded-full bg-red-600/30 border border-red-500/40 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-white/50 text-xs">
          Starting from $69/year
        </div>
      </div>

      {/* Right — single-view form panel (no scroll) */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
        <div className="flex-1 flex items-center justify-center px-6 lg:px-10 py-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-4">
              <Link to="/">
                <div className="bg-slate-900 rounded-xl px-3 py-2 flex items-center">
                  <img src={logo} alt="IFOA USA" className="h-8 w-auto" />
                </div>
              </Link>
            </div>

            <div className="mb-4">
              <h2 className="text-2xl font-black mb-1" style={{ color: '#0f172a' }}>Create account</h2>
              <p className="text-xs" style={{ color: '#64748b' }}>Join thousands of pilots using IFOA USA.</p>
            </div>

            {error && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-600">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Role selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#64748b' }}>Account Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map(r => (
                    <button key={r.value} type="button" onClick={() => setRole(r.value)}
                      className={`rounded-xl border p-2.5 text-left transition-all ${role === r.value ? 'border-red-600 bg-red-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                      <p className="text-xs font-bold leading-tight" style={{ color: role === r.value ? '#dc2626' : '#475569' }}>{r.label}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: role === r.value ? '#ef4444' : '#94a3b8', opacity: 0.85 }}>{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Airline Name — only for airline role */}
              {role === 'airline' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#64748b' }}>
                    Airline / Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={role === 'airline'}
                    value={airlineName}
                    onChange={e => setAirlineName(e.target.value)}
                    placeholder="e.g. Skyline Airways Inc."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm placeholder-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    style={{ color: '#0f172a' }}
                  />
                </div>
              )}

              {/* Name */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#64748b' }}>First Name</label>
                  <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm placeholder-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    style={{ color: '#0f172a' }} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#64748b' }}>Last Name</label>
                  <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm placeholder-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    style={{ color: '#0f172a' }} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#64748b' }}>Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm placeholder-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  style={{ color: '#0f172a' }} />
              </div>

              {/* Password + Confirm — side by side */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#64748b' }}>Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 chars"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-sm placeholder-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                      style={{ color: '#0f172a' }} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 transition p-0.5" style={{ color: '#94a3b8' }}>
                      {showPw
                        ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                        : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><circle cx="12" cy="12" r="3" /></svg>
                      }
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#64748b' }}>Confirm Password</label>
                  <input type={showPw ? 'text' : 'password'} required value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm placeholder-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    style={{ color: '#0f172a' }} />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 px-6 py-3 text-sm font-bold text-white transition-all flex items-center justify-center gap-2 mt-1">
                {loading ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>Creating account…</>
                ) : 'Create Account'}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm" style={{ color: '#64748b' }}>
                Already have an account?{' '}
                <Link to="/login" className="font-semibold transition-colors" style={{ color: '#dc2626' }}>Sign in</Link>
              </p>
              <Link to="/" className="text-xs transition-colors" style={{ color: '#94a3b8' }}>← Back to home</Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
