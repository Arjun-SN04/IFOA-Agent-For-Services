import { useState, useRef } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import OtpTimer from '../../components/OtpTimer'

/* ── ConfirmPasswordModal ─────────────────────────────────────────────────── */
function ConfirmPasswordModal({ title, onConfirm, onClose }) {
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!pwd) { setErr('Password is required.'); return }
    setLoading(true); setErr('')
    try {
      await onConfirm(pwd)
      onClose()
    } catch (e) {
      setErr(e?.response?.data?.message || 'Incorrect password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-black text-slate-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition">✕</button>
        </div>
        <div className="px-5 py-5 space-y-3">
          {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Password</label>
            <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Enter your password"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} disabled={loading} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">Cancel</button>
          <button onClick={handleConfirm} disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-bold text-white transition disabled:opacity-50">
            {loading && <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>}
            Confirm Remove
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, error, helper }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      {children}
      {helper && !error && <p className="text-xs text-slate-400">{helper}</p>}
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

const inputCls = (hasError) =>
  `w-full rounded-xl border px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 ${
    hasError
      ? 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100'
      : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-blue-100 hover:border-slate-300'
  }`

export default function SettingsPage() {
  const { user, updateCredentials, addSecondaryEmail, removeSecondaryEmail, sendSecondaryEmailOtp, verifyOtpAndAddSecondary, sendCredentialChangeOtp, verifyOtpAndUpdateCredentials } = useAuth()

  // Secondary email state (airline only)
  const [secEmail, setSecEmail]           = useState('')
  const [secAdding, setSecAdding]         = useState(false)
  const [secStep, setSecStep]             = useState('pwd')  // 'pwd' | 'otp'
  const [secPwd, setSecPwd]               = useState('')
  const [secError, setSecError]           = useState('')
  const [secSuccess, setSecSuccess]       = useState('')
  const [removeTarget, setRemoveTarget]   = useState(null)

  const [currentPwd, setCurrentPwd] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [showCurrentPwd, setShowCurrentPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)

  // OTP step for credential change
  const [credOtpVisible, setCredOtpVisible] = useState(false)
  const [credOtpDigits, setCredOtpDigits]   = useState(['', '', '', '', '', ''])
  const [credOtpError, setCredOtpError]     = useState('')
  const [credOtpSaving, setCredOtpSaving]   = useState(false)
  const [credOtpResent, setCredOtpResent]   = useState(false)
  const [credOtpTimerKey, setCredOtpTimerKey] = useState(0)
  const credOtpRefs = useRef([])

  const handleAddSecondaryEmail = async (password) => {
    if (!secEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(secEmail)) {
      setSecError('Enter a valid email address.'); return
    }
    setSecError('')
    setSecPwd(password)
    await sendSecondaryEmailOtp(secEmail.trim())
    setSecStep('otp')
  }

  const handleVerifySecondaryOtp = async (code) => {
    await verifyOtpAndAddSecondary(secEmail.trim(), code, secPwd)
    setSecEmail('')
    setSecPwd('')
    setSecAdding(false)
    setSecStep('pwd')
    setSecSuccess('Secondary email verified and added.')
    setTimeout(() => setSecSuccess(''), 4000)
  }

  const validate = () => {
    const e = {}
    if (!currentPwd) e.currentPwd = 'Current password is required.'
    if (!newEmail && !newPwd) e.general = 'Enter a new email or a new password (or both).'
    if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) e.newEmail = 'Enter a valid email address.'
    if (newEmail && newEmail.toLowerCase() === user?.email?.toLowerCase()) e.newEmail = 'New email must be different from current email.'
    if (newPwd && newPwd.length < 8) e.newPwd = 'Password must be at least 8 characters.'
    if (newPwd && confirmPwd !== newPwd) e.confirmPwd = 'Passwords do not match.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    setSuccess('')
    setErrors({})
    try {
      await sendCredentialChangeOtp(currentPwd)
      setCredOtpDigits(['', '', '', '', '', ''])
      setCredOtpError('')
      setCredOtpTimerKey(0)
      setCredOtpVisible(true)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to send verification code.'
      setErrors({ general: msg })
    } finally {
      setSaving(false)
    }
  }

  const handleCredOtpDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...credOtpDigits]; next[i] = val; setCredOtpDigits(next)
    if (val && i < 5) credOtpRefs.current[i + 1]?.focus()
  }

  const handleCredOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !credOtpDigits[i] && i > 0) credOtpRefs.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft' && i > 0) credOtpRefs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) credOtpRefs.current[i + 1]?.focus()
  }

  const handleCredOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return; e.preventDefault()
    setCredOtpDigits(pasted.split('').concat(Array(6).fill('')).slice(0, 6))
    credOtpRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleCredOtpSubmit = async () => {
    const code = credOtpDigits.join('')
    if (code.length < 6) { setCredOtpError('Enter the full 6-digit code.'); return }
    setCredOtpSaving(true); setCredOtpError('')
    try {
      await verifyOtpAndUpdateCredentials(currentPwd, code, newEmail || undefined, newPwd || undefined)
      setCredOtpVisible(false)
      setSuccess('Your credentials have been updated successfully.')
      setCurrentPwd(''); setNewEmail(''); setNewPwd(''); setConfirmPwd('')
    } catch (err) {
      setCredOtpError(err?.response?.data?.message || 'Invalid or expired code.')
      setCredOtpDigits(['', '', '', '', '', ''])
      credOtpRefs.current[0]?.focus()
    } finally {
      setCredOtpSaving(false)
    }
  }

  const handleCredOtpResend = async () => {
    setCredOtpError(''); setCredOtpResent(false)
    try {
      await sendCredentialChangeOtp(currentPwd)
      setCredOtpDigits(['', '', '', '', '', ''])
      setCredOtpTimerKey(k => k + 1)
      setCredOtpResent(true)
      credOtpRefs.current[0]?.focus()
      setTimeout(() => setCredOtpResent(false), 4000)
    } catch (err) {
      setCredOtpError(err?.response?.data?.message || 'Failed to resend.')
    }
  }

  return (
    <DashboardLayout>
      {removeTarget && (
        <ConfirmPasswordModal
          title={`Remove ${removeTarget}?`}
          onClose={() => setRemoveTarget(null)}
          onConfirm={async (pwd) => {
            await removeSecondaryEmail(pwd, removeTarget)
            setRemoveTarget(null)
          }}
        />
      )}
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 mb-6">Settings</h1>

        {/* Current account info */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Account</p>
          </div>
          <div className="px-4 sm:px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white text-lg font-black flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-600/20">
              {(user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'}
              </p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Update credentials form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Update Credentials</p>
          </div>

          <div className="px-4 sm:px-6 py-6 space-y-5">
            {/* Success message */}
            {success && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-semibold text-emerald-700">{success}</p>
              </div>
            )}

            {/* General error */}
            {errors.general && (
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                </svg>
                <p className="text-sm font-semibold text-red-600">{errors.general}</p>
              </div>
            )}

            {/* Current Password — always required */}
            <Field label="Current Password *" error={errors.currentPwd}>
              <div className="relative">
                <input
                  type={showCurrentPwd ? 'text' : 'password'}
                  name="settings-current-password"
                  autoComplete="off"
                  placeholder="Enter your current password"
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  className={inputCls(!!errors.currentPwd) + ' pr-11'}
                />
                <button type="button" onClick={() => setShowCurrentPwd(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showCurrentPwd
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 0 1 1.563-3.029m5.858.908a3 3 0 1 1 4.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532 3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0 1 12 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 0 1-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                  }
                </button>
              </div>
            </Field>

            <div className="border-t border-slate-100 pt-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">What would you like to change?</p>

              {/* New Email */}
              <div className="space-y-4">
                <Field label="New Email Address" error={errors.newEmail} helper="Leave blank to keep your current email">
                  <input
                    type="email"
                    name="settings-new-email"
                    autoComplete="off"
                    placeholder="Enter new email address"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className={inputCls(!!errors.newEmail)}
                  />
                </Field>

                {/* New Password */}
                <Field label="New Password" error={errors.newPwd} helper="Minimum 8 characters — leave blank to keep current">
                  <div className="relative">
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      name="settings-new-password"
                      autoComplete="new-password"
                      placeholder="New password (min 8 chars)"
                      value={newPwd}
                      onChange={e => setNewPwd(e.target.value)}
                      className={inputCls(!!errors.newPwd) + ' pr-11'}
                    />
                    <button type="button" onClick={() => setShowNewPwd(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showNewPwd
                        ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 0 1 1.563-3.029m5.858.908a3 3 0 1 1 4.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532 3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0 1 12 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 0 1-4.132 5.411m0 0L21 21" /></svg>
                        : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                      }
                    </button>
                  </div>
                </Field>

                {/* Confirm Password */}
                {newPwd && (
                  <Field label="Confirm New Password" error={errors.confirmPwd}>
                    <div className="relative">
                      <input
                        type={showConfirmPwd ? 'text' : 'password'}
                        name="settings-confirm-new-password"
                        autoComplete="new-password"
                        placeholder="Confirm new password"
                        value={confirmPwd}
                        onChange={e => setConfirmPwd(e.target.value)}
                        className={inputCls(!!errors.confirmPwd) + ' pr-11'}
                      />
                      <button type="button" onClick={() => setShowConfirmPwd(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        {showConfirmPwd
                          ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 0 1 1.563-3.029m5.858.908a3 3 0 1 1 4.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532 3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0 1 12 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 0 1-4.132 5.411m0 0L21 21" /></svg>
                          : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                        }
                      </button>
                    </div>
                  </Field>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400 text-center sm:text-left">
              Need help?{' '}
              <a href="mailto:agent@theifoa.com" className="text-blue-600 hover:underline font-medium">Contact support</a>
            </p>
            <button onClick={handleSave} disabled={saving}
              style={{ background: 'linear-gradient(135deg, #1a1aff 0%, #0000ff 100%)' }}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50 w-full sm:w-auto">
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
                    <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* OTP verification panel for credential change */}
        {credOtpVisible && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-4">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verify Identity</p>
                <OtpTimer resetKey={credOtpTimerKey} />
              </div>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">Code sent to <strong>{user?.email}</strong></p>
            </div>
            <div className="px-4 sm:px-6 py-5 space-y-4">
              {credOtpError && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></svg>
                  <p className="text-sm font-semibold text-red-600">{credOtpError}</p>
                </div>
              )}
              {credOtpResent && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <p className="text-sm font-semibold text-emerald-700">New code sent!</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Enter 6-digit code</p>
                <div className="flex gap-2" onPaste={handleCredOtpPaste}>
                  {credOtpDigits.map((d, i) => (
                    <input key={i} ref={el => credOtpRefs.current[i] = el}
                      type="text" inputMode="numeric" maxLength={1} value={d}
                      onChange={e => handleCredOtpDigit(i, e.target.value)}
                      onKeyDown={e => handleCredOtpKeyDown(i, e)}
                      className="w-11 h-12 text-center text-lg font-black rounded-xl border-2 outline-none transition"
                      style={{ borderColor: d ? '#0000ff' : '#e2e8f0', background: d ? '#f0f4ff' : '#f8fafc', color: '#0f172a' }}
                      onFocus={e => { e.target.style.borderColor = '#0000ff'; e.target.style.boxShadow = '0 0 0 3px rgba(0,0,255,0.12)' }}
                      onBlur={e => { if (!d) { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' } }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <button onClick={handleCredOtpResend} disabled={credOtpSaving} className="text-xs text-slate-500 hover:text-slate-700 font-semibold transition-colors disabled:opacity-50 text-left">
                  Didn't receive it? Resend code
                </button>
                <div className="flex gap-2">
                  <button onClick={() => setCredOtpVisible(false)} disabled={credOtpSaving}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
                    Cancel
                  </button>
                  <button onClick={handleCredOtpSubmit} disabled={credOtpSaving || credOtpDigits.join('').length < 6}
                    style={{ background: 'linear-gradient(135deg, #1a1aff 0%, #0000ff 100%)' }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50">
                    {credOtpSaving ? (
                      <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>Verifying…</>
                    ) : (
                      <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>Confirm Changes</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Secondary Emails — airline only */}
        {user?.role === 'airline' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Secondary Login Emails</p>
              <p className="text-xs text-slate-500 mt-1">Additional emails that can log into this account. Same password applies to all.</p>
            </div>

            <div className="px-4 sm:px-6 py-5 space-y-4">
              {/* Feedback */}
              {secSuccess && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <p className="text-sm font-semibold text-emerald-700">{secSuccess}</p>
                </div>
              )}
              {secError && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></svg>
                  <p className="text-sm font-semibold text-red-600">{secError}</p>
                </div>
              )}

              {/* Existing secondary emails list */}
              {(user?.secondaryEmails || []).length > 0 ? (
                <div className="space-y-2">
                  {user.secondaryEmails.map((email) => (
                    <div key={email} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-slate-800 truncate">{email}</p>
                      </div>
                      <button onClick={() => setRemoveTarget(email)}
                        className="ml-3 flex-shrink-0 w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-red-300 hover:text-red-500 transition flex items-center justify-center">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No secondary emails added yet.</p>
              )}

              {/* Add new secondary email */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Add New Secondary Email</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={secEmail}
                    onChange={e => { setSecEmail(e.target.value); setSecError('') }}
                    placeholder="email@example.com"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-slate-300"
                  />
                  <button
                    onClick={() => {
                      if (!secEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(secEmail)) {
                        setSecError('Enter a valid email address.'); return
                      }
                      setRemoveTarget(null)
                      setSecStep('pwd')
                      setSecAdding(true)
                    }}
                    disabled={secAdding}
                    style={{ background: 'linear-gradient(135deg, #1a1aff 0%, #0000ff 100%)' }}
                    className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-50 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add
                  </button>
                </div>
                {secAdding && secStep === 'pwd' && (
                  <AddSecondaryConfirm
                    email={secEmail}
                    onConfirm={async (pwd) => { await handleAddSecondaryEmail(pwd) }}
                    onCancel={() => { setSecAdding(false); setSecStep('pwd') }}
                  />
                )}
                {secAdding && secStep === 'otp' && (
                  <AddSecondaryOtp
                    email={secEmail}
                    onVerify={handleVerifySecondaryOtp}
                    onResend={() => sendSecondaryEmailOtp(secEmail.trim())}
                    onCancel={() => { setSecAdding(false); setSecStep('pwd'); setSecPwd('') }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

/* ── Inline password confirm for adding secondary email ───────────────────── */
function AddSecondaryConfirm({ email, onConfirm, onCancel }) {
  const [pwd, setPwd]         = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!pwd) { setErr('Password is required.'); return }
    setLoading(true); setErr('')
    try {
      await onConfirm(pwd)
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed.')
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-3">
      <p className="text-xs font-semibold text-slate-800">Confirm your password to add <span className="font-black">{email}</span></p>
      <p className="text-xs text-slate-500">A verification code will then be sent to {email}.</p>
      {err && <p className="text-xs font-semibold text-red-600">{err}</p>}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input type={showPwd ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Your current password"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-9 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <button type="button" onClick={() => setShowPwd(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
            {showPwd
              ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 0 1 1.563-3.029m5.858.908a3 3 0 1 1 4.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532 3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0 1 12 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 0 1-4.132 5.411m0 0L21 21" /></svg>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
            }
          </button>
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-bold text-white transition disabled:opacity-50 flex-shrink-0">
          {loading && <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>}
          Send Code
        </button>
        <button onClick={onCancel} disabled={loading}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
          Cancel
        </button>
      </div>
    </div>
  )
}

/* ── Inline OTP entry for verifying secondary email ─────────────────────────── */
function AddSecondaryOtp({ email, onVerify, onResend, onCancel }) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [err, setErr]       = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [timerKey, setTimerKey] = useState(0)
  const inputRefs = useRef([])

  const code = digits.join('')

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
    if (!pasted) return; e.preventDefault()
    setDigits(pasted.split('').concat(Array(6).fill('')).slice(0, 6))
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleSubmit = async () => {
    if (code.length < 6) { setErr('Enter the full 6-digit code.'); return }
    setLoading(true); setErr('')
    try {
      await onVerify(code)
    } catch (e) {
      setErr(e?.response?.data?.message || 'Invalid or expired code.')
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true); setErr(''); setResent(false)
    try {
      await onResend()
      setResent(true)
      setTimerKey(k => k + 1)
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      setTimeout(() => setResent(false), 4000)
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to resend.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">Code sent to <span className="font-black">{email}</span></p>
        <OtpTimer resetKey={timerKey} />
      </div>
      {err && <p className="text-xs font-semibold text-red-600">{err}</p>}
      {resent && <p className="text-xs font-semibold text-emerald-600">New code sent!</p>}

      <div className="flex gap-1.5 justify-start" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input key={i} ref={el => inputRefs.current[i] = el}
            type="text" inputMode="numeric" maxLength={1} value={d}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className="w-9 h-10 text-center text-base font-black rounded-xl border-2 outline-none transition"
            style={{ borderColor: d ? '#0000ff' : '#e2e8f0', background: d ? '#f0f4ff' : '#f8fafc', color: '#0f172a' }}
            onFocus={e => { e.target.style.borderColor = '#0000ff'; e.target.style.boxShadow = '0 0 0 2px rgba(0,0,255,0.12)' }}
            onBlur={e => { if (!d) { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' } }}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={loading || code.length < 6}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-bold text-white transition disabled:opacity-50 flex-shrink-0">
          {loading && <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>}
          Verify & Add
        </button>
        <button onClick={handleResend} disabled={resending || loading} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
          {resending ? 'Sending…' : 'Resend'}
        </button>
        <button onClick={onCancel} disabled={loading} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
          Cancel
        </button>
      </div>
    </div>
  )
}
