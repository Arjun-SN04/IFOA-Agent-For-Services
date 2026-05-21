import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/IFOA_USA_white.png'
import { Lock, ShieldCheck, MapPin } from 'lucide-react'
import OtpTimer from '../components/OtpTimer'

const EyeOff = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
const EyeOn  = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><circle cx="12" cy="12" r="3" /></svg>

const INP_CLS = `w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100 placeholder:text-slate-400`

function PasswordField({ label, hint, placeholder, value, onChange, show, onToggle }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
        {label}{hint && <span className="text-slate-400 ml-1 normal-case font-normal tracking-normal">{hint}</span>}
      </label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)} className={INP_CLS + ' pr-11'} />
        <button type="button" onClick={onToggle}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
          {show ? <EyeOff /> : <EyeOn />}
        </button>
      </div>
    </div>
  )
}

// ── Forced password-change modal ──────────────────────────────────────────────
// Shown immediately after first login when admin created the account.
// The user cannot dismiss it — they MUST set a new password to continue.
function MustChangePasswordModal({ onChanged }) {
  const { updateCredentials, user } = useAuth()
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd]         = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError]           = useState('')
  const [saving, setSaving]         = useState(false)

  const isAirline = user?.role === 'airline'
  const defaultPwdHint = isAirline
    ? `Your temporary password is your airline name in lowercase with no spaces (e.g. "Air India" → airindia).`
    : `Your temporary password is your first name in lowercase (e.g. "John" → john).`

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ border: '1px solid #e2e8f0' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#0000ff' }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Action Required</p>
            <h2 className="text-base font-black text-slate-900 leading-tight">Set Your Password</h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Info banner */}
          <div className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-0.5">Account created by an administrator.</p>
              <p className="text-xs text-slate-500 leading-relaxed">{defaultPwdHint}</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
              </svg>
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <PasswordField
              label="Current (Temporary) Password"
              placeholder="Enter temporary password"
              value={currentPwd} onChange={setCurrentPwd}
              show={showCurrent} onToggle={() => setShowCurrent(v => !v)}
            />
            <PasswordField
              label="New Password"
              hint="— min 8 characters"
              placeholder="Choose a strong password"
              value={newPwd} onChange={setNewPwd}
              show={showNew} onToggle={() => setShowNew(v => !v)}
            />
            <PasswordField
              label="Confirm New Password"
              placeholder="Repeat new password"
              value={confirmPwd} onChange={setConfirmPwd}
              show={showConfirm} onToggle={() => setShowConfirm(v => !v)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button onClick={handle} disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: saving ? '#3333ff' : '#0000ff' }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#0000e6' }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#0000ff' }}>
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

// ── Forgot Password Modal ─────────────────────────────────────────────────────
function ForgotPasswordModal({ onClose }) {
  const { requestPasswordReset, resetPasswordWithOtp } = useAuth()
  const [step, setStep] = useState('email') // 'email' | 'otp' | 'done'
  const [email, setEmail] = useState('')
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)
  const [timerKey, setTimerKey] = useState(0)
  const inputRefs = useRef([])

  const code = digits.join('')

  const handleSendCode = async (e) => {
    e.preventDefault()
    if (!email.trim()) { setError('Enter your email address.'); return }
    setLoading(true); setError('')
    try {
      await requestPasswordReset(email.trim().toLowerCase())
      setTimerKey(0)
      setStep('otp')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send reset code.')
    } finally {
      setLoading(false)
    }
  }

  const handleDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]; next[i] = val; setDigits(next)
    if (val && i < 5) inputRefs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft' && i > 0) inputRefs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) inputRefs.current[i + 1]?.focus()
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    setDigits(pasted.split('').concat(Array(6).fill('')).slice(0, 6))
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (code.length < 6) { setError('Enter the full 6-digit code.'); return }
    if (newPwd.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (newPwd !== confirmPwd) { setError('Passwords do not match.'); return }
    setLoading(true); setError('')
    try {
      await resetPasswordWithOtp(email.trim().toLowerCase(), code, newPwd)
      setStep('done')
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid or expired code.')
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setLoading(true); setError(''); setResent(false)
    try {
      await requestPasswordReset(email.trim().toLowerCase())
      setResent(true)
      setTimerKey(k => k + 1)
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      setTimeout(() => setResent(false), 4000)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to resend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ border: '1px solid #e2e8f0' }}
      >
        {/* Step: email */}
        {step === 'email' && (
          <div className="px-6 py-6">
            <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Account Recovery</p>
                  <h2 className="text-sm font-black text-slate-900 leading-tight">Forgot Password</h2>
                </div>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">Enter your account email and we'll send a reset code.</p>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></svg>
                {error}
              </div>
            )}
            <form onSubmit={handleSendCode} className="space-y-3">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition"
                style={{ borderColor: '#e2e8f0', background: '#f8fafc', color: '#0f172a' }}
                onFocus={e => { e.target.style.borderColor = '#0000ff'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,255,0.12)' }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
              />
              <button type="submit" disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#0000ff' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#0000e6' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#0000ff' }}>
                {loading ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>Sending…</> : 'Send Reset Code'}
              </button>
            </form>
          </div>
        )}

        {/* Step: OTP + new password */}
        {step === 'otp' && (
          <div className="px-6 py-6">
            <div className="flex items-center gap-3 pb-5 mb-5 border-b border-slate-100">
              <button onClick={() => { setStep('email'); setError('') }} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
              </button>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Step 2 of 2</p>
                <h2 className="text-sm font-black text-slate-900 leading-tight">Enter Code & New Password</h2>
              </div>
            </div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-500">Code sent to <strong className="text-slate-700">{email}</strong></p>
              <OtpTimer resetKey={timerKey} />
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></svg>
                {error}
              </div>
            )}
            {resent && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                New code sent!
              </div>
            )}

            <div className="flex gap-1.5 justify-center mb-4" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input key={i} ref={el => inputRefs.current[i] = el}
                  type="text" inputMode="numeric" maxLength={1} value={d}
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="w-10 h-11 text-center text-lg font-black rounded-xl border-2 outline-none transition"
                  style={{ borderColor: d ? '#0000ff' : '#e2e8f0', background: d ? '#f0f4ff' : '#f8fafc', color: '#0f172a' }}
                  onFocus={e => { e.target.style.borderColor = '#0000ff'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,255,0.12)' }}
                  onBlur={e => { if (!d) { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' } }}
                />
              ))}
            </div>

            <form onSubmit={handleReset} className="space-y-3">
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} required value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="New password (min 8 chars)"
                  className="w-full rounded-xl border px-4 py-2.5 pr-11 text-sm outline-none transition"
                  style={{ borderColor: '#e2e8f0', background: '#f8fafc', color: '#0f172a' }}
                  onFocus={e => { e.target.style.borderColor = '#0000ff'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,255,0.12)' }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                  {showPwd
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><circle cx="12" cy="12" r="3" /></svg>
                  }
                </button>
              </div>
              <input type="password" required value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Confirm new password"
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition"
                style={{ borderColor: '#e2e8f0', background: '#f8fafc', color: '#0f172a' }}
                onFocus={e => { e.target.style.borderColor = '#0000ff'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,255,0.12)' }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
              />
              <button type="submit" disabled={loading || code.length < 6}
                className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#0000ff' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#0000e6' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#0000ff' }}>
                {loading ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>Resetting…</> : 'Reset Password'}
              </button>
            </form>
            <button onClick={handleResend} disabled={loading} className="mt-3 text-xs text-slate-500 hover:text-blue-600 transition-colors w-full text-center disabled:opacity-50">
              Resend code
            </button>
          </div>
        )}

        {/* Step: done */}
        {step === 'done' && (
          <div className="px-6 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-base font-black text-slate-900 mb-2">Password Reset!</h3>
            <p className="text-sm text-slate-500 mb-5">Your password has been updated. You can now sign in.</p>
            <button onClick={onClose}
              className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all"
              style={{ background: '#0000ff' }}
              onMouseEnter={e => e.currentTarget.style.background = '#0000e6'}
              onMouseLeave={e => e.currentTarget.style.background = '#0000ff'}>
              Back to Sign In
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  const { login, logout, mustChangePassword, user, requestPasswordReset, resetPasswordWithOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  // Show the modal when:
  // 1. Redirected here from MustChangePasswordGate / RequireAuth (any page → /login)
  // 2. Just completed login and mustChangePassword is true
  // 3. Page reloaded / restored token still has mustChangePassword: true
  const [awaitingPasswordChange, setAwaitingPasswordChange] = useState(
    () => mustChangePassword
  )
  const [pendingNavigate, setPendingNavigate] = useState(
    () => (from && from !== '/login') ? from : '/dashboard'
  )

  // Sync: if mustChangePassword becomes true after initial render (async token verify),
  // immediately show the modal.
  useEffect(() => {
    if (mustChangePassword) setAwaitingPasswordChange(true)
  }, [mustChangePassword])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      if (user.role === 'admin') {
        logout()
        setError('Invalid email or password.')
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
    <div className="min-h-screen flex items-center justify-center px-4 py-10 sm:py-12 bg-white">
      {/* Forgot password modal */}
      <AnimatePresence>
        {showForgot && (
          <ForgotPasswordModal onClose={() => setShowForgot(false)} />
        )}
      </AnimatePresence>

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
            <p className="text-slate-500 text-sm mt-3 font-medium">FAA U.S. Agent for Service Portal</p>
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
              <button onClick={() => setShowForgot(true)} className="text-sm font-semibold transition-colors" style={{ color: '#0000ff' }}
                onMouseEnter={e => e.currentTarget.style.color = '#0000e6'}
                onMouseLeave={e => e.currentTarget.style.color = '#0000ff'}>
                Forgot password?
              </button>
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
