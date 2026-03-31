import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/IFOA_USA_white.png'

export default function Navbar() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = (to) => (to === '/' ? pathname === '/' : pathname.startsWith(to))

  const initials = user
    ? ([user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || '?')
    : null

  const handleLogout = () => {
    logout()
    navigate('/')
    setProfileOpen(false)
    setMenuOpen(false)
  }

  const dashPath = user?.role === 'admin' ? '/admin' : '/dashboard'
  const profilePath = user?.role === 'admin' ? '/admin/profile' : '/dashboard/profile'

  return (
    <nav
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: '#ffffff',
        borderBottom: scrolled ? '1px solid #e2e8f0' : '1px solid #f1f5f9',
        boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[74px] items-center justify-between">

          {/* ── Logo ── */}
          <Link to="/" className="group flex shrink-0 items-center gap-3">
            <img
              src={logo}
              alt="IFOA USA"
              className="h-9 w-auto object-contain transition-all duration-200 group-hover:scale-105"
            />
            <div className="hidden h-5 w-px bg-slate-200 sm:block" />
            <span className="hidden text-[10px] font-black uppercase tracking-[0.22em] text-slate-800 group-hover:text-slate-600 transition-colors sm:block">
              Agent for Service
            </span>
          </Link>

          {/* ── Desktop nav ── */}
          <div className="hidden items-center gap-1.5 md:flex">
            <Link
              to="/"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 ${
                isActive('/')
                  ? 'bg-red-600 text-white shadow-sm shadow-red-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Home
            </Link>

            <div className="mx-2 h-5 w-px bg-slate-200" />

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(o => !o)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 transition-all duration-150 shadow-sm"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md text-white text-xs font-black" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', boxShadow: '0 2px 8px rgba(220,38,38,0.45)' }}>
                    {initials}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900 leading-tight">
                      {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email?.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-slate-400 capitalize">{user.role}</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                      </div>
                      <div className="p-2">
                        <Link to={dashPath} onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <rect x="3" y="3" width="7" height="7" rx="1.5" />
                            <rect x="14" y="3" width="7" height="7" rx="1.5" />
                            <rect x="3" y="14" width="7" height="7" rx="1.5" />
                            <rect x="14" y="14" width="7" height="7" rx="1.5" />
                          </svg>
                          Dashboard
                        </Link>
                        <Link to={profilePath} onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="8" r="4" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                          </svg>
                          Profile
                        </Link>
                        <button onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-6 0v-1m0-8V7a3 3 0 0 1 6 0v1" />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* ── Not logged in ── */
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-red-600 border-2 border-red-500 hover:bg-red-600 hover:text-white transition-all duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="rounded-xl px-5 py-2.5 text-sm font-bold bg-red-600 text-white border-2 border-red-600 hover:bg-red-700 hover:border-red-700 transition-all duration-200 shadow-md shadow-red-200"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 md:hidden"
          >
            <span className={`block h-[1.5px] w-5 origin-center rounded-full bg-current transition-all duration-300 ${menuOpen ? 'translate-y-[6.5px] rotate-45' : ''}`} />
            <span className={`block h-[1.5px] w-5 rounded-full bg-current transition-all duration-300 ${menuOpen ? 'scale-x-0 opacity-0' : ''}`} />
            <span className={`block h-[1.5px] w-5 origin-center rounded-full bg-current transition-all duration-300 ${menuOpen ? '-translate-y-[6.5px] -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-1.5 px-4 py-4 bg-white shadow-lg md:hidden"
            style={{ borderTop: '1px solid #f1f5f9' }}
          >
            <Link to="/" onClick={() => setMenuOpen(false)}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                isActive('/') ? 'bg-red-600 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}>
              Home
            </Link>

            {user ? (
              <>
                <Link to={dashPath} onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                  Dashboard
                </Link>
                <Link to={profilePath} onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                  Profile
                </Link>
                <div className="my-1 h-px bg-slate-100" />
                <button onClick={handleLogout}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors text-left">
                  Logout
                </button>
              </>
            ) : (
              <>
                <div className="my-1 h-px bg-slate-100" />
                <Link to="/login" onClick={() => setMenuOpen(false)}
                  className="rounded-xl border-2 border-red-500 px-4 py-3 text-center text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white transition-all">
                  Login
                </Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)}
                  className="rounded-xl bg-red-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-red-700 transition-all">
                  Sign Up
                </Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
