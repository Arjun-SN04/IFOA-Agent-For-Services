import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutGroup } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { getNotifications } from '../../services/api'
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
      className={`relative inline-flex h-9 min-w-[98px] items-center justify-center px-4 text-center text-sm font-semibold rounded-full transition-all duration-300 ease-out whitespace-nowrap transform-gpu overflow-hidden
        ${active
          ? 'text-white shadow-sm'
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:-translate-y-px'
        }`}
    >
      {active && (
        <span
          className="absolute inset-0 rounded-full"
          style={{ background: '#000021' }}
        />
      )}
      <span className="relative z-10">{item.label}</span>
    </Link>
  )
}

export default function HeaderNav() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [readIds, setReadIds] = useState([])
  const [dismissedIds, setDismissedIds] = useState([])
  const dropdownRef = useRef(null)
  const notifRef = useRef(null)
  const nav = user?.role === 'admin' ? adminNav : userNav

  const readKey = user?.id ? `ifoa_notif_read_${user.id}` : 'ifoa_notif_read_anon'
  const dismissedKey = user?.id ? `ifoa_notif_dismissed_${user.id}` : 'ifoa_notif_dismissed_anon'
  const visibleNotifications = notifications.filter(n => !dismissedIds.includes(n.id))
  const unreadCount = visibleNotifications.filter(n => !readIds.includes(n.id)).length

  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target))
        setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(readKey) || '[]')
      setReadIds(Array.isArray(stored) ? stored : [])
    } catch {
      setReadIds([])
    }
  }, [readKey])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(dismissedKey) || '[]')
      setDismissedIds(Array.isArray(stored) ? stored : [])
    } catch {
      setDismissedIds([])
    }
  }, [dismissedKey])

  useEffect(() => {
    if (!user) return

    let active = true
    let timer

    const loadNotifications = async (isInitial = false) => {
      try {
        if (isInitial) setNotifLoading(true)
        const res = await getNotifications({ limit: 20 })
        if (!active) return
        const incoming = res?.data?.notifications || []
        setNotifications(incoming)
      } catch {
        if (active) setNotifications([])
      } finally {
        if (active && isInitial) setNotifLoading(false)
      }
    }

    loadNotifications(true)
    timer = setInterval(() => loadNotifications(false), 15000)

    return () => {
      active = false
      if (timer) clearInterval(timer)
    }
  }, [user])

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 768) setMobileOpen(false) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setDropdownOpen(false)
    setMobileOpen(false)
    setNotifOpen(false)
  }, [pathname])

  const markAllRead = () => {
    const ids = visibleNotifications.map(n => n.id)
    setReadIds(ids)
    localStorage.setItem(readKey, JSON.stringify(ids))
  }

  const clearAllNotifications = () => {
    const ids = Array.from(new Set([...dismissedIds, ...visibleNotifications.map(n => n.id)]))
    setDismissedIds(ids)
    localStorage.setItem(dismissedKey, JSON.stringify(ids))
  }

  const openNotification = (item) => {
    const next = Array.from(new Set([...readIds, item.id]))
    setReadIds(next)
    localStorage.setItem(readKey, JSON.stringify(next))
    setNotifOpen(false)
    if (item.link) navigate(item.link)
  }

  const notifTone = (severity) => {
    if (severity === 'high') return 'border-red-200 bg-red-50 text-red-700'
    if (severity === 'warn') return 'border-amber-200 bg-amber-50 text-amber-700'
    if (severity === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }

  const fmtNotifTime = (dateVal) => {
    const d = new Date(dateVal)
    if (Number.isNaN(d.getTime())) return 'Just now'
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

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
      <header className="fixed top-0 left-0 right-0 z-50 h-[72px] bg-white border-b border-slate-100"
        style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.06)' }}>
        <div className="h-full max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-50 transition-colors">
            <img src={ifoaLogo} alt="IFOA USA" className="h-7 w-auto object-contain" />
          </Link>

          {/* Centre nav — pills */}
          <LayoutGroup id="header-nav-pills">
            <nav className="hidden md:flex h-11 items-center gap-1 absolute left-1/2 -translate-x-1/2 bg-slate-50 rounded-full px-2.5 py-1 border border-slate-100 transition-all duration-300">
              {nav.map(item => <NavLink key={item.to} item={item} />)}
            </nav>
          </LayoutGroup>

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
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {user.role}
              </span>
            )}

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen(o => !o)
                  if (!notifOpen) markAllRead()
                }}
                className="relative w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all"
                title="Notifications"
                aria-label="Notifications"
              >
                <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V10a6 6 0 1 0-12 0v4.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-[3px] rounded-full bg-red-600 text-white text-[9px] leading-[14px] font-black">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="dd-in absolute right-0 top-[calc(100%+8px)] w-[360px] max-w-[90vw] bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">Notifications</p>
                      <p className="text-[11px] text-slate-500">Live updates for your account</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={markAllRead}
                        className="text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        Mark all read
                      </button>
                      <button
                        onClick={clearAllNotifications}
                        className="text-[11px] font-bold text-slate-600 hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
                    {notifLoading && (
                      <div className="px-3 py-6 text-sm text-slate-400 text-center">Loading notifications...</div>
                    )}

                    {!notifLoading && visibleNotifications.length === 0 && (
                      <div className="px-3 py-8 text-center">
                        <p className="text-sm font-semibold text-slate-600">No notifications</p>
                        <p className="text-xs text-slate-400 mt-1">You are all caught up.</p>
                      </div>
                    )}

                    {!notifLoading && visibleNotifications.map((n) => {
                      const isRead = readIds.includes(n.id)
                      return (
                        <button
                          key={n.id}
                          onClick={() => openNotification(n)}
                          className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all hover:border-slate-300 ${notifTone(n.severity)} ${isRead ? 'opacity-75' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-black uppercase tracking-wider">{n.title}</p>
                              <p className="text-sm font-medium mt-1 leading-snug">{n.message}</p>
                              <p className="text-[11px] mt-1.5 opacity-80">{fmtNotifTime(n.createdAt)}</p>
                            </div>
                            {!isRead && <span className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

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
                        : 'bg-blue-50 text-blue-700 border-blue-200'
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
          <div className="mob-in fixed top-[72px] left-0 right-0 z-40 bg-white border-b border-slate-100 shadow-xl md:hidden">
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
                      active ? 'text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                    style={active ? { background: '#000021' } : undefined}
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
