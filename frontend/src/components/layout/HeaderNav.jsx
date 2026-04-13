import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getNotifications } from '../../services/api'
import ifoaLogo from '../../assets/IFOA_USA_white.png'

const adminNav = [
  { to: '/admin',             label: 'Overview',    exact: true },
  { to: '/admin/individuals', label: 'Individuals', exact: true  },
  { to: '/admin/airlines',    label: 'Airlines',    exact: true  },
  { to: '/admin/profile',     label: 'Profile',     exact: true  },
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
      className={`relative inline-flex h-9 min-w-[98px] items-center justify-center px-4 text-center text-sm font-semibold rounded-full transition-all duration-200 ease-out whitespace-nowrap transform-gpu overflow-hidden select-none
        ${active
          ? 'text-white shadow-sm'
          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
        }`}
      style={active ? {} : { WebkitTapHighlightColor: 'transparent' }}
    >
      {active && (
        <span
          className="absolute inset-0 rounded-full"
          style={{ background: '#000021' }}
        />
      )}
      <span className="relative z-10" style={active ? { color: '#fff' } : {}}>{item.label}</span>
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
        setNotifications(prev => {
          // Skip re-render if data hasn't changed
          if (JSON.stringify(prev.map(n => n.id)) === JSON.stringify(incoming.map(n => n.id))) return prev
          return incoming
        })
      } catch {
        if (active) setNotifications([])
      } finally {
        if (active && isInitial) setNotifLoading(false)
      }
    }

    loadNotifications(true)
    // Poll every 20s for near-real-time updates (wire requests, new registrations)
    timer = setInterval(() => loadNotifications(false), 20000)

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
    if (item.link) {
      // For wire-request notifications, append the entityId so AdminDashboard
      // can auto-select and highlight that specific airline row.
      if (item.type === 'wire-request' && item.entityId) {
        navigate(`${item.link}?highlight=${item.entityId}`)
      } else {
        navigate(item.link)
      }
    }
  }

  const notifIcon = (n) => {
    if (n.type === 'wire-request')        return { bg: 'bg-red-100',     svgPath: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', color: 'text-red-600',     dot: 'bg-red-500' }
    if (n.type === 'wire-pending')        return { bg: 'bg-orange-100',  svgPath: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', color: 'text-orange-600', dot: 'bg-orange-400' }
    if (n.type === 'payment-pending')     return { bg: 'bg-amber-100',   svgPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-amber-600',   dot: 'bg-amber-500' }
    if (n.type === 'subscription-active') return { bg: 'bg-emerald-100', svgPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-emerald-600', dot: 'bg-emerald-500' }
    if (n.type === 'expiry-soon')         return { bg: 'bg-yellow-100',  svgPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: 'text-yellow-600',  dot: 'bg-yellow-500' }
    if (n.type === 'new-registration')    return { bg: 'bg-blue-100',    svgPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 000 4h6a2 2 0 000-4M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'text-blue-600',     dot: 'bg-blue-500' }
    if (n.type === 'payment-confirmed')   return { bg: 'bg-emerald-100', svgPath: 'M5 13l4 4L19 7', color: 'text-emerald-600',                                                                                                          dot: 'bg-emerald-500' }
    if (n.type === 'invoice-ready')       return { bg: 'bg-indigo-100',  svgPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-indigo-600',  dot: 'bg-indigo-500' }
    if (n.severity === 'high')            return { bg: 'bg-red-100',     svgPath: 'M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', color: 'text-red-600',     dot: 'bg-red-500' }
    if (n.severity === 'warn')            return { bg: 'bg-amber-100',   svgPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: 'text-amber-600',   dot: 'bg-amber-500' }
    if (n.severity === 'success')         return { bg: 'bg-emerald-100', svgPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-emerald-600', dot: 'bg-emerald-500' }
    return { bg: 'bg-slate-100', svgPath: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V10a6 6 0 10-12 0v4.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9', color: 'text-slate-500', dot: 'bg-slate-400' }
  }

  const notifBorderColor = (severity) => {
    if (severity === 'high')    return 'border-red-100 hover:border-red-200'
    if (severity === 'warn')    return 'border-amber-100 hover:border-amber-200'
    if (severity === 'success') return 'border-emerald-100 hover:border-emerald-200'
    return 'border-slate-100 hover:border-slate-200'
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
          <nav className="hidden md:flex h-11 items-center gap-1 absolute left-1/2 -translate-x-1/2 bg-slate-50 rounded-full px-2.5 py-1 border border-slate-100">
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
                <div className="dd-in absolute right-0 top-[calc(100%+10px)] w-[400px] max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden z-50"
                  style={{ boxShadow: '0 20px 60px -10px rgba(15,23,42,0.18), 0 0 0 1px rgba(15,23,42,0.04)' }}>

                  {/* Header */}
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"
                    style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V10a6 6 0 1 0-12 0v4.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 leading-tight">Notifications</p>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={markAllRead}
                        className="px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                        Mark read
                      </button>
                      <button onClick={clearAllNotifications}
                        className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        Clear all
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="max-h-[440px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {notifLoading && (
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <div className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-slate-600 animate-spin" />
                        <p className="text-xs text-slate-400 font-medium">Loading…</p>
                      </div>
                    )}

                    {!notifLoading && visibleNotifications.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl">
                          🔕
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-700">No notifications</p>
                          <p className="text-xs text-slate-400 mt-0.5">You're all caught up!</p>
                        </div>
                      </div>
                    )}

                    {!notifLoading && visibleNotifications.length > 0 && (
                      <div className="p-2 space-y-1">
                        {visibleNotifications.map((n) => {
                          const isRead = readIds.includes(n.id)
                          const tone = notifIcon(n)
                          const isWireRequest = n.type === 'wire-request'
                          return (
                            <button
                              key={n.id}
                              onClick={() => openNotification(n)}
                              className={`group w-full text-left rounded-xl border p-3.5 transition-all duration-150 ${notifBorderColor(n.severity)} ${isRead ? 'bg-white opacity-70 hover:opacity-100' : 'bg-white hover:bg-slate-50/80'}`}
                              style={{ boxShadow: isRead ? 'none' : '0 1px 4px rgba(15,23,42,0.06)' }}
                            >
                              <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div className={`w-9 h-9 rounded-xl ${tone.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                  <svg className={`w-4 h-4 ${tone.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d={tone.svgPath} />
                                  </svg>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-wide leading-tight truncate">{n.title}</p>
                                    {!isRead && (
                                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tone.dot}`} />
                                    )}
                                  </div>
                                  <p className="text-[13px] text-slate-600 leading-snug">{n.message}</p>
                                  <div className="flex items-center justify-between mt-1.5">
                                    <p className="text-[11px] text-slate-400 font-medium">{fmtNotifTime(n.createdAt)}</p>
                                    {isWireRequest && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-red-600 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                        Action needed
                                      </span>
                                    )}
                                    {n.link && !isWireRequest && (
                                      <span className="text-[11px] font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
                                        View →
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {visibleNotifications.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                      <p className="text-[11px] text-slate-400">{visibleNotifications.length} notification{visibleNotifications.length !== 1 ? 's' : ''}</p>
                      
                    </div>
                  )}
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
