import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ifoaLogo from '../../assets/IFOA_USA_white.png'

const adminNav = [
  { to: '/admin',             label: 'Overview',    exact: true },
  { to: '/admin/individuals', label: 'Individuals'              },
  { to: '/admin/airlines',    label: 'Airlines'                 },
  { to: '/admin/profile',     label: 'Profile'                  },
]

const userNav = [
  { to: '/dashboard',              label: 'Dashboard',   exact: true },
  { to: '/dashboard/profile',      label: 'Profile'                  },
  { to: '/dashboard/subscription', label: 'Subscription'             },
  { to: '/dashboard/documents',    label: 'Documents'                },
  { to: '/dashboard/settings',     label: 'Settings'                 },
]

function NavLink({ item }) {
  const { pathname } = useLocation()
  const active = item.exact ? pathname === item.to : pathname.startsWith(item.to)
  return (
    <Link
      to={item.to}
      className={`relative px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 whitespace-nowrap
        ${active
          ? 'bg-red-600 text-white shadow-sm'
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
        }`}
    >
      {item.label}
    </Link>
  )
}

export default function HeaderNav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropdownRef = useRef(null)
  const nav = user?.role === 'admin' ? adminNav : userNav

  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 768) setMobileOpen(false) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = () => {
    setDropdownOpen(false)
    setMobileOpen(false)
    logout()
    navigate('/')
  }

  return (
    <>
      <style>{`
        @keyframes dd-in { from { opacity:0; transform:translateY(-8px) scale(.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes mob-in { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
        .dd-in { animation: dd-in .18s cubic-bezier(.16,1,.3,1) both }
        .mob-in { animation: mob-in .2s cubic-bezier(.16,1,.3,1) both }
      `}</style>

      {/* ── Main header bar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-[68px] bg-white border-b border-slate-100"
        style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.06)' }}>
        <div className="h-full max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-50 transition-colors">
            <img src={ifoaLogo} alt="IFOA USA" className="h-7 w-auto object-contain" />
          </Link>

          {/* Centre nav — pills */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2 bg-slate-50 rounded-full px-2 py-1.5 border border-slate-100">
            {nav.map(item => <NavLink key={item.to} item={item} />)}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Home shortcut */}
            <Link to="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m3 12 9-9 9 9M5.25 10.5V19.5a.75.75 0 0 0 .75.75h4.5v-4.5h3v4.5h4.5a.75.75 0 0 0 .75-.75V10.5" />
              </svg>
              Home
            </Link>

            {/* Role pill */}
            {user?.role && (
              <span className={`hidden sm:inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider border ${
                user.role === 'admin'
                  ? 'bg-slate-900 text-white border-slate-800'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {user.role}
              </span>
            )}

            {/* Avatar dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(o => !o)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 transition-all bg-white group"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-white text-xs font-black">
                    {initials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
                </div>
                <span className="hidden sm:block text-sm font-semibold text-slate-700 group-hover:text-slate-900 max-w-[120px] truncate">
                  {fullName}
                </span>
                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="dd-in absolute right-0 top-[calc(100%+8px)] w-60 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                  {/* User info */}
                  <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/80">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{fullName}</p>
                        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center mt-2.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border ${
                      user?.role === 'admin'
                        ? 'bg-slate-900 text-white border-slate-800'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {user?.role ?? 'user'}
                    </span>
                  </div>

                  {/* Nav items */}
                  <div className="p-1.5">
                    <Link
                      to={user?.role === 'admin' ? '/admin/profile' : '/dashboard/profile'}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                    >
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <circle cx="12" cy="8" r="3.5" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.582-6 8-6s8 2 8 6" />
                      </svg>
                      {user?.role === 'admin' ? 'Profile' : 'My Profile'}
                    </Link>
                    <a
                      href="mailto:agent@theifoa.com"
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                    >
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0-9.75 6-9.75-6" />
                      </svg>
                      Contact Support
                    </a>
                  </div>

                  {/* Logout */}
                  <div className="p-1.5 border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 font-semibold transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
                      </svg>
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="mob-in fixed top-[68px] left-0 right-0 z-40 bg-white border-b border-slate-100 shadow-xl md:hidden">
            <nav className="p-3 space-y-0.5">
              {nav.map(item => {
                const { pathname } = window.location
                const active = item.exact ? pathname === item.to : pathname.startsWith(item.to)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                      active ? 'bg-red-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
              <div className="pt-2 mt-2 border-t border-slate-100 space-y-0.5">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Home
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  Log Out
                </button>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  )
}
