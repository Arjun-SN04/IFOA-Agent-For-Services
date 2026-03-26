import DashboardLayout from '../../components/layout/DashboardLayout'

export default function DocumentsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">My Account</p>
          <h1 className="text-2xl font-black text-slate-900">Documents</h1>
          <p className="text-slate-500 text-sm mt-1">FAA correspondence and scanned documents forwarded to you.</p>
        </div>

        {/* Empty state */}
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-20 text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
            </svg>
          </div>
          <p className="text-base font-bold text-slate-900">No documents yet</p>
          <p className="text-sm text-slate-400 mt-1">Documents forwarded from the FAA will appear here.</p>
        </div>
      </div>
    </DashboardLayout>
  )
}
