import { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useAuth } from '../../context/AuthContext'

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
  const { user, updateCredentials } = useAuth()

  const [currentPwd, setCurrentPwd] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [showCurrentPwd, setShowCurrentPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)

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
      await updateCredentials(
        currentPwd,
        newEmail || undefined,
        newPwd || undefined
      )
      setSuccess('Your credentials have been updated successfully.')
      setCurrentPwd('')
      setNewEmail('')
      setNewPwd('')
      setConfirmPwd('')
    } catch (err) {
      const msg = err?.response?.data?.message || 'Update failed. Please try again.'
      setErrors({ general: msg })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Account</p>
          <h1 className="text-2xl font-black text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Update your login credentials.</p>
        </div>

        {/* Current account info */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Account</p>
          </div>
          <div className="px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white text-lg font-black flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-600/20">
              {(user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'}
              </p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <span className="inline-flex items-center gap-1.5 mt-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-blue-600 capitalize">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Update credentials form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Update Credentials</p>
          </div>

          <div className="px-6 py-6 space-y-5">
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
                    placeholder={user?.email || 'new@example.com'}
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
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPwd}
                      onChange={e => setConfirmPwd(e.target.value)}
                      className={inputCls(!!errors.confirmPwd)}
                    />
                  </Field>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400">
              Need help?{' '}
              <a href="mailto:agent@theifoa.com" className="text-blue-600 hover:underline font-medium">Contact support</a>
            </p>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50">
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
      </div>
    </DashboardLayout>
  )
}
