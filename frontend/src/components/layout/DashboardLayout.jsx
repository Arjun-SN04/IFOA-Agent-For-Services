import HeaderNav from './HeaderNav'

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <HeaderNav />
      <main className="mx-auto w-full max-w-7xl px-5 pt-[78px] pb-10 sm:px-7 lg:px-10">
        {children}
      </main>
    </div>
  )
}
