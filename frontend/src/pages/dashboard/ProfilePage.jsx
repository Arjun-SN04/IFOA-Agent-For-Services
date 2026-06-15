import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useDataCache } from '../../context/DataCacheContext'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { EditSubscriptionFormModal } from './SubscriptionPage'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const API = axios.create({ baseURL: BASE_URL })

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 py-3 border-b border-slate-100 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:w-48 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 break-words min-w-0">{value || '—'}</span>
    </div>
  )
}

/* ── EditProfileModal ────────────────────────────────────────────────────── */
function EditProfileModal({ user, isAirline, onClose, onSaveName, onSaveAirlineName }) {
  const [firstName, setFirstName]     = useState(user?.firstName || '')
  const [lastName, setLastName]       = useState(user?.lastName || '')
  const [airlineName, setAirlineName] = useState(user?.airlineName || '')
  const [saving, setSaving]           = useState(false)
  const [err, setErr]                 = useState('')

  const handleSave = async () => {
    if (!firstName.trim() && !lastName.trim()) { setErr('Please enter at least a first name or last name.'); return }
    if (isAirline && !airlineName.trim()) { setErr('Airline name cannot be empty.'); return }
    setSaving(true); setErr('')
    try {
      await onSaveName(firstName.trim(), lastName.trim())
      if (isAirline && airlineName.trim() !== (user?.airlineName || '')) {
        await onSaveAirlineName(airlineName.trim())
      }
      onClose()
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-50">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-0.5">Edit Profile</p>
            <h3 className="text-base sm:text-lg font-black text-slate-900">Update Your Details</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition flex-shrink-0">✕</button>
        </div>
        <div className="px-4 sm:px-6 py-5 space-y-4">
          {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">First Name</label>
            <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-slate-300"
              value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Enter first name" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Last Name</label>
            <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-slate-300"
              value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Enter last name" />
          </div>
          {isAirline && (
            <>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-800">
                  ⚠️ Changing the airline name will update how it appears on <strong>all future form submissions</strong>. Existing submitted records are not affected.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Airline / Company Name</label>
                <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 hover:border-slate-300"
                  value={airlineName} onChange={e => setAirlineName(e.target.value)} placeholder="e.g. Skyline Airways Inc." />
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-slate-100 bg-slate-50 px-4 sm:px-6 py-4">
          <button onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1a1aff 0%, #0000ff 100%)' }}>
            {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── LogoUploadModal ──────────────────────────────────────────────────────── */
function LogoUploadModal({ currentLogoUrl, registrationId, token, onClose, onSuccess }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr]             = useState('')

  const handleFile = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setErr('Only image files accepted.'); return }
    if (file.size > 2 * 1024 * 1024) { setErr('Image must be under 2 MB.'); return }
    setErr(''); setUploading(true)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res = await fetch(`${BASE_URL}/airlines/${registrationId}/logo`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Upload failed.')
      onSuccess(json.url)
      onClose()
    } catch (e) {
      setErr(e.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-base font-black text-slate-900">Change Company Logo</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition">✕</button>
        </div>
        <div className="px-5 py-5 space-y-4">
          {currentLogoUrl && (
            <div className="flex justify-center">
              <img src={currentLogoUrl} alt="Current logo" className="w-20 h-20 rounded-xl object-contain border border-slate-200 bg-white" />
            </div>
          )}
          {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">
            {uploading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
            )}
            {uploading ? 'Uploading…' : 'Select Image'}
          </button>
          <p className="text-[11px] text-slate-400 text-center">PNG, JPG, WebP · Max 2 MB</p>
        </div>
      </div>
    </div>
  )
}

/* ── ProfilePage ──────────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const { user, token, updateProfile, updateAirlineName } = useAuth()
  const { getOrFetch, invalidate } = useDataCache()
  const [sub, setSub]                       = useState(null)
  const [editOpen, setEditOpen]             = useState(false)
  const [infoEditOpen, setInfoEditOpen]     = useState(false)
  const [logoModalOpen, setLogoModalOpen]   = useState(false)
  const [currentLogoUrl, setCurrentLogoUrl] = useState('')

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'
  const isAirline = user?.role === 'airline'

  useEffect(() => {
    if (!user) return
    const headers = { Authorization: `Bearer ${token}` }
    const base = isAirline ? 'airlines' : 'individuals'
    const cacheKey = `subs_${user.id || user.email}`
    invalidate(cacheKey)

    const load = async () => {
      try {
        const emailSubs = user.email
          ? await API.get(`/${base}/by-email?email=${encodeURIComponent(user.email)}`, { headers })
              .then(r => r.data.all || (r.data.data ? [r.data.data] : []))
              .catch(() => [])
          : []
        const seen = new Set(emailSubs.map(s => s._id?.toString()).filter(Boolean))
        const remainingIds = [
          ...(user.subscriptionIds || []),
          ...(user.registrationId ? [user.registrationId] : []),
        ].map(id => id?.toString()).filter(Boolean).filter(id => !seen.has(id))
        const idSubs = remainingIds.length
          ? await Promise.allSettled(remainingIds.map(id => API.get(`/${base}/${id}`, { headers })))
              .then(rs => rs.filter(r => r.status === 'fulfilled' && r.value?.data?.data).map(r => r.value.data.data))
          : []
        const merged = [...emailSubs, ...idSubs]
          .filter(Boolean)
          .filter((item, i, arr) => arr.findIndex(x => x._id?.toString() === item._id?.toString()) === i)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        const first = merged[0] || null
        setSub(first)
        if (first?.logoUrl) setCurrentLogoUrl(first.logoUrl)
      } catch {
        setSub(null)
      }
    }
    load()
  }, [user, token, isAirline, invalidate])

  return (
    <DashboardLayout>
      {editOpen && (
        <EditProfileModal user={user} isAirline={isAirline} onClose={() => setEditOpen(false)}
          onSaveName={updateProfile} onSaveAirlineName={updateAirlineName} />
      )}
      {infoEditOpen && sub?._id && (
        <EditSubscriptionFormModal
          sub={sub}
          role={user?.role}
          onClose={() => setInfoEditOpen(false)}
          onSaved={(updated) => { setSub(updated); setInfoEditOpen(false) }}
        />
      )}
      {logoModalOpen && sub?._id && (
        <LogoUploadModal
          currentLogoUrl={currentLogoUrl}
          registrationId={sub._id}
          token={token}
          onClose={() => setLogoModalOpen(false)}
          onSuccess={(url) => setCurrentLogoUrl(url)}
        />
      )}

      <div className="max-w-3xl mx-auto space-y-5">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">My Profile</h1>

        {/* ── Avatar card ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {isAirline && currentLogoUrl ? (
                <img src={currentLogoUrl} alt="Company logo"
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-contain border border-slate-200 bg-white flex-shrink-0 cursor-pointer hover:opacity-80 transition"
                  onClick={() => setLogoModalOpen(true)}
                  title="Click to change logo"
                />
              ) : (
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl text-white text-xl sm:text-2xl font-black flex items-center justify-center flex-shrink-0"
                  style={{ background: '#0000ff' }}
                >
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">{fullName}</h2>
                <p className="text-slate-500 text-sm truncate">{user?.email}</p>
                <span className="inline-flex items-center mt-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-[10px] font-bold tracking-widest text-slate-600 capitalize">
                  {user?.role}
                </span>
              </div>
            </div>

            <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
              <button onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" />
                </svg>
                Edit Profile
              </button>
              {sub?._id && (
                <button onClick={() => setInfoEditOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #1a1aff 0%, #0000ff 100%)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Edit Information
                </button>
              )}
              {isAirline && (
                <button onClick={() => setLogoModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                  {currentLogoUrl ? 'Change Logo' : 'Upload Logo'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Account Details ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Details</p>
          </div>
          <div className="px-4 sm:px-6 py-2">
            <InfoRow label="First Name" value={user?.firstName} />
            <InfoRow label="Last Name" value={user?.lastName} />
            <InfoRow label="Email Address" value={user?.email} />
            <InfoRow label="Account Role" value={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)} />
            {isAirline && <InfoRow label="Airline / Company" value={user?.airlineName || '—'} />}
            <InfoRow label="Account ID" value={user?.id} />
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
