import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/IFOA_USA_white.png'

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

  const inputStyle = {
    borderColor: '#e2e8f0',
    background: '#f8fafc',
    color: '#0f172a',
  }
  const focusStyle = (e) => { e.target.style.borderColor = '#0000ff'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,255,0.12)' }
  const blurStyle = (e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }

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
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-white">

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-lg"
      >
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
          {/* Simple white header */}
          <div className="px-8 py-7 text-center border-b border-slate-100">
            <Link to="/" className="inline-block">
              <img src={logo} alt="IFOA USA" className="h-12 w-auto mx-auto" />
            </Link>
            <p className="text-slate-500 text-sm mt-2 font-medium">Create Your Free Account</p>
          </div>

          {/* Form */}
          <div className="px-8 py-7">
            <div className="mb-5">
              <h2 className="text-xl font-black mb-1" style={{ color: '#0f172a' }}>Create account</h2>
              <p className="text-xs" style={{ color: '#64748b' }}>Join thousands of pilots using IFOA USA.</p>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Account Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map(r => (
                    <button key={r.value} type="button" onClick={() => setRole(r.value)}
                      className="rounded-xl border p-3 text-left transition-all"
                      style={{
                        borderColor: role === r.value ? '#0000ff' : '#e2e8f0',
                        background: role === r.value ? '#eff6ff' : '#f8fafc',
                        boxShadow: role === r.value ? '0 0 0 3px rgba(0,0,255,0.12)' : 'none',
                      }}>
                      <p className="text-xs font-bold leading-tight" style={{ color: role === r.value ? '#0000ff' : '#475569' }}>{r.label}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: role === r.value ? '#3333ff' : '#94a3b8' }}>{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Airline Name */}
              {role === 'airline' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>
                    Airline / Company Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={airlineName}
                    onChange={e => setAirlineName(e.target.value)}
                    placeholder="e.g. Skyline Airways Inc."
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition"
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>
              )}

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>First Name</label>
                  <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition"
                    style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Last Name</label>
                  <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition"
                    style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition"
                  style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
              </div>

              {/* Password + Confirm */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 chars"
                      className="w-full rounded-xl border px-4 py-2.5 pr-10 text-sm outline-none transition"
                      style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 transition-colors" style={{ color: '#94a3b8' }}>
                      {showPw
                        ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                        : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><circle cx="12" cy="12" r="3" /></svg>
                      }
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Confirm</label>
                  <input type={showPw ? 'text' : 'password'} required value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat password"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition"
                    style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
                style={{ background: loading ? '#8080ff' : '#0000ff' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#0000e6' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#0000ff' }}>
                {loading ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.2" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>Creating account…</>
                ) : 'Create Account'}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm" style={{ color: '#64748b' }}>
                Have an account?{' '}
                <Link to="/login" className="font-semibold transition-colors" style={{ color: '#0000ff' }}>Sign in</Link>
              </p>
              <Link to="/" className="text-xs" style={{ color: '#94a3b8' }}>← Back to home</Link>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-5 flex flex-wrap gap-3 justify-center">
          {[' Secure & Encrypted', ' FAA Compliant', ' U.S. Based Office'].map(b => (
            <span key={b} className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ background: 'white', color: '#475569', border: '1px solid #e2e8f0' }}>{b}</span>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
