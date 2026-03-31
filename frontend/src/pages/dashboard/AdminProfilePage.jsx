import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import DashboardLayout from '../../components/layout/DashboardLayout'

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-3 border-b border-slate-100 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:w-44 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 break-all">{value || '—'}</span>
    </div>
  )
}

// ── Inline edit name modal ───────────────────────────────────────────────────
function EditNameModal({ user, onClose, onSave }) {
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName]   = useState(user?.lastName || '')
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')

  const handleSave = async () => {
    if (!firstName.trim() && !lastName.trim()) {
      setErr('Please enter at least a first name or last name.')
      return
    }
    setSaving(true)
    setErr('')
    try {
      await onSave(firstName.trim(), lastName.trim())
      onClose()
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to update name.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-0.5">Edit Profile</p>
            <h3 className="text-lg font-black text-slate-900">Change Your Name</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {err && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">First Name</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-slate-300"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Enter first name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Last Name</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-slate-300"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Enter last name"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
          >
            {saving && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
                <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" />
              </svg>
            )}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminProfilePage() {
  const { user, updateProfile } = useAuth()
  const [editNameOpen, setEditNameOpen] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'A'
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Administrator'

  const handleSaveName = async (firstName, lastName) => {
    await updateProfile(firstName, lastName)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  return (
    <DashboardLayout>
      {editNameOpen && (
        <EditNameModal
          user={user}
          onClose={() => setEditNameOpen(false)}
          onSave={handleSaveName}
        />
      )}

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Admin</p>
          <h1 className="text-2xl font-black text-slate-900">Admin Profile</h1>
          <p className="text-slate-500 text-sm mt-1">Your administrator account details.</p>
        </div>

        {/* Success toast */}
        {saveSuccess && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-semibold">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Name updated successfully!
          </div>
        )}

        {/* ── Avatar card — LIGHT THEME ── */}
        <div
          className="rounded-2xl border border-blue-100 p-6 mb-6 flex items-center gap-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #e0f2fe 100%)' }}
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }} />
          <div
            className="w-16 h-16 rounded-2xl text-white text-2xl font-black flex items-center justify-center flex-shrink-0 shadow-md relative z-10"
            style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)', boxShadow: '0 4px 16px rgba(30,64,175,0.35)' }}
          >
            {initials}
          </div>
          <div className="relative z-10 flex-1 min-w-0">
            <h2 className="text-xl font-black text-slate-900">{fullName}</h2>
            <p className="text-slate-500 text-sm">{user?.email}</p>
            <span className="inline-flex items-center gap-1.5 mt-2 rounded-full bg-white/70 border border-blue-200 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-700">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Administrator
            </span>
          </div>
          <button
            onClick={() => setEditNameOpen(true)}
            className="relative z-10 flex-shrink-0 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white/80 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-white transition-all shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" />
            </svg>
            Edit Name
          </button>
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Details</p>
            <button
              onClick={() => setEditNameOpen(true)}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Edit Name →
            </button>
          </div>
          <div className="px-6 py-2">
            <InfoRow label="First Name" value={user?.firstName} />
            <InfoRow label="Last Name" value={user?.lastName} />
            <InfoRow label="Email Address" value={user?.email} />
            <InfoRow label="Role" value="Administrator" />
            <InfoRow label="Account ID" value={user?.id} />
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Permissions</p>
          </div>
          <div className="px-6 py-4 space-y-2">
            {['View all registrations', 'Edit individual records', 'Edit airline records', 'Delete records', 'Export data to Excel'].map(perm => (
              <div key={perm} className="flex items-center gap-3 text-sm text-slate-700">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {perm}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
