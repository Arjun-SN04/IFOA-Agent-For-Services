import DashboardLayout from '../../components/layout/DashboardLayout'
import { useAuth } from '../../context/AuthContext'

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Account</p>
          <h1 className="text-2xl font-black text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your account preferences.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Information</p>
          </div>
          <div className="px-6 py-6 space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Email</label>
              <input
                type="email"
                readOnly
                value={user?.email || ''}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Role</label>
              <input
                type="text"
                readOnly
                value={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || ''}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 cursor-not-allowed capitalize"
              />
            </div>
            <p className="text-xs text-slate-400">To change your email or password, please contact <a href="mailto:agent@theifoa.com" className="text-blue-600 hover:underline">agent@theifoa.com</a>.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
