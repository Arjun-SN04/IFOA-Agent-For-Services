import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/IFOA_USA_white.png'
import { Lock, ShieldCheck, MapPin } from 'lucide-react'

// ── Forced password-change modal ──────────────────────────────────────────────
// Shown immediately after first login when admin created the account.
// The user cannot dismiss it — they MUST set a new password to continue.
function MustChangePasswordModal({ onChanged }) {
  const { updateCredentials, user } = useAuth()
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd]         = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showNew, setShowNew]       = useState(false)
  const [error, setError]           = useState('')
  const [saving, setSaving]         = useState(false)

  const isAirline = user?.role === 'airline'
  const defaultPwdHint = isAirline
    ? `Your temporary password is your airline name in lowercase with no spaces (e.g. "Air India" → airindia).`
    : `Your temporary password is your first + last name in lowercase with no spaces (e.g. "John Doe" → johndoe).`

  const handle = async () => {
    setError('')
    if (!currentPwd) return setError('Enter your current (temporary) password.')
    if (newPwd.length < 8) return setError('New password must be at least 8 characters.')
    if (newPwd === currentPwd) return setError('New password must be different from the temporary one.')
    if (newPwd !== confirmPwd) return setError('Passwords do not match.')
    setSaving(true)
    try {
      await updateCredentials(currentPwd, undefined, newPwd)
      onChanged()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update password. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inp = `w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900
    outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100`

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Action Required</p>
            <h2 className="text-lg font-black text-white">Set Your Password</h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800 mb-1">Your account was created by an administrator.</p>
            <p className="text-xs text-amber-700 leading-relaxed">{defaultPwdHint}</p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
              </svg>
              <p className="text-sm font-semibold text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">Current (Temporary) Password</label>
              <input type="password" placeholder="Enter temporary password" value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">New Password <span className="text-slate-300">(min 8 chars)</span></label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} placeholder="Choose a strong password" value={newPwd}
                  onChange={e => setNewPwd(e.target.value)} className={inp + ' pr-11'} />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNew
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><circle cx="12" cy="12" r="3" /></svg>
                  }
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">Confirm New Password</label>
              <input type="password" placeholder="Repeat new password" value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)} className={inp} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button onClick={handle} disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 py-3.5 text-sm font-bold text-white transition disabled:opacity-50">
            {saving ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>Updating password…</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>Set New Password & Continue</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  const { login, mustChangePassword, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Show forced change modal if redirected here from RequireAuth while already logged in,
  // OR if we just completed a login and mustChangePassword is true.
  const redirectedForPwChange = location.state?.mustChangePassword === true
  const [awaitingPasswordChange, setAwaitingPasswordChange] = useState(
    () => redirectedForPwChange && mustChangePassword
  )
  const [pendingNavigate, setPendingNavigate] = useState(
    () => (redirectedForPwChange && from) ? from : null
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      if (user.role === 'admin') {
        setError('Admin accounts cannot log in here. Please use the admin portal.')
        return
      }
      const destination = (from && from !== '/login') ? from : '/dashboard'
      if (user.mustChangePassword) {
        // Show the forced change modal before navigating
        setPendingNavigate(destination)
        setAwaitingPasswordChange(true)
      } else {
        navigate(destination, { replace: true })
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChanged = () => {
    setAwaitingPasswordChange(false)
    navigate(pendingNavigate || '/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-white">
      {/* Forced password-change modal — shown on top of login page after first login */}
      <AnimatePresence>
        {awaitingPasswordChange && (
          <MustChangePasswordModal onChanged={handlePasswordChanged} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
          {/* Simple white header with logo */}
          <div className="px-5 sm:px-8 py-7 sm:py-8 text-center border-b border-slate-100">
            <Link to="/" className="inline-block">
              <img src={logo} alt="IFOA USA" className="h-11 w-auto mx-auto" />
            </Link>
            <p className="text-slate-500 text-sm mt-3 font-medium">FAA U.S. Agent for Service Platform</p>
          </div>

          {/* Form area */}
          <div className="px-5 sm:px-8 py-6 sm:py-8">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-black mb-1" style={{ color: '#0f172a' }}>Welcome back</h2>
              <p className="text-sm" style={{ color: '#64748b' }}>Sign in to your account to continue.</p>
            </div>

            {error && (
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition"
                  style={{
                    borderColor: '#e2e8f0',
                    background: '#f8fafc',
                    color: '#0f172a',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#0000ff'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,255,0.12)' }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border px-4 py-3 pr-12 text-sm outline-none transition"
                    style={{
                      borderColor: '#e2e8f0',
                      background: '#f8fafc',
                      color: '#0f172a',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#0000ff'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,255,0.12)' }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                    style={{ color: '#94a3b8' }}
                  >
                    {showPw
                      ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><circle cx="12" cy="12" r="3" /></svg>
                    }
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 mt-2"
                style={{ background: loading ? '#8080ff' : '#0000ff' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#0000e6' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#0000ff' }}
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.2" />
                      <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" />
                    </svg>
                    Signing in…
                  </>
                ) : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <p className="text-sm" style={{ color: '#64748b' }}>
                Don't have an account?{' '}
                <Link to="/signup" className="font-semibold transition-colors" style={{ color: '#0000ff' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#0000e6'}
                  onMouseLeave={e => e.currentTarget.style.color = '#0000ff'}>
                  Create one
                </Link>
              </p>
              <Link to="/" className="text-xs transition-colors block" style={{ color: '#94a3b8' }}>
                ← Back to home
              </Link>
            </div>
          </div>
        </div>

        {/* Trust badges below card */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          {[
            { icon: <Lock className="w-3.5 h-3.5" />, text: 'Secure & Encrypted' },
            { icon: <ShieldCheck className="w-3.5 h-3.5" />, text: 'FAA Compliant' },
            { icon: <MapPin className="w-3.5 h-3.5" />, text: 'U.S. Based Office' },
          ].map(b => (
            <span key={b.text} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium" style={{ background: 'white', color: '#475569', border: '1px solid #e2e8f0' }}>{b.icon}{b.text}</span>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
