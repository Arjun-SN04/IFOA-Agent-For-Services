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

export default function AdminProfilePage() {
  const { user } = useAuth()
  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'A'
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Administrator'

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Admin</p>
          <h1 className="text-2xl font-black text-slate-900">Admin Profile</h1>
          <p className="text-slate-500 text-sm mt-1">Your administrator account details.</p>
        </div>

        {/* Avatar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white text-2xl font-black flex items-center justify-center flex-shrink-0 shadow-md">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">{fullName}</h2>
            <p className="text-slate-500 text-sm">{user?.email}</p>
            <span className="inline-flex items-center gap-1.5 mt-2 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-red-600">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Administrator
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Details</p>
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
