import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// ─── Nav item config per role ───────────────────────────────────────────────
const adminNav = [
  {
    group: 'Dashboard',
    items: [
      { to: '/admin', label: 'Overview', exact: true, icon: <OverviewIcon /> },
      { to: '/admin/individuals', label: 'Individuals', icon: <IndividualsIcon /> },
      { to: '/admin/airlines', label: 'Airlines', icon: <AirlinesIcon /> },
    ],
  },
  {
    group: 'Account',
    items: [
      { to: '/admin/profile', label: 'Profile', icon: <ProfileIcon /> },
    ],
  },
]

const userNav = [
  {
    group: 'My Account',
    items: [
      { to: '/dashboard', label: 'Dashboard', exact: true, icon: <OverviewIcon /> },
      { to: '/dashboard/profile', label: 'My Profile', icon: <ProfileIcon /> },
      { to: '/dashboard/subscription', label: 'Subscription', icon: <SubscriptionIcon /> },
      { to: '/dashboard/documents', label: 'Documents', icon: <DocumentIcon /> },
    ],
  },
  {
    group: 'Support',
    items: [
      { to: '/dashboard/settings', label: 'Settings', icon: <SettingsIcon /> },
    ],
  },
]

function NavItem({ item, collapsed }) {
  const { pathname } = useLocation()
  const active = item.exact ? pathname === item.to : pathname.startsWith(item.to)

  return (
    <Link
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
        active
          ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md shadow-red-500/20'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      <span className={`flex-shrink-0 w-[18px] h-[18px] ${active ? 'text-white' : 'text-slate-400 group-hover:text-red-500'}`}>
        {item.icon}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const nav = user?.role === 'admin' ? adminNav : userNav

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    '?'

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen flex flex-col bg-white border-r border-slate-200/80 shadow-sm transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-[240px]'
      }`}
    >
      {/* ── Top strip: branding + collapse toggle ── */}
      <div
        className={`flex h-16 flex-shrink-0 items-center border-b border-slate-100 bg-white ${
          collapsed ? 'justify-center px-2' : 'justify-between px-3'
        }`}
      >
        {!collapsed && (
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1 select-none">
            Agent for Service
          </span>
        )}
        <button
          onClick={onToggle}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors flex-shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            {collapsed
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            }
          </svg>
        </button>
      </div>

      {/* ── Profile Badge ── */}
      <div
        className={`flex-shrink-0 border-b border-slate-100 bg-slate-50/80 ${
          collapsed ? 'px-2 py-3 flex justify-center' : 'px-4 py-3'
        }`}
      >
        {collapsed ? (
          <div
            title={`${fullName} (${user?.role ?? 'user'})`}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xs font-bold shadow shadow-red-400/30 cursor-default"
          >
            {initials}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xs font-bold shadow shadow-red-400/30 flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-700 truncate leading-tight">{fullName}</p>
              <p className="text-[10px] text-slate-400 truncate leading-tight">{user?.email}</p>
              <span
                className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide mt-0.5 ${
                  user?.role === 'admin'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-sky-100 text-sky-600'
                }`}
              >
                {user?.role ?? 'user'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Home Button ── */}
      <div className="flex-shrink-0 px-3 pt-3 pb-1">
        <Link
          to="/"
          title={collapsed ? 'Home' : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 text-slate-500 hover:bg-slate-100 hover:text-slate-800 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <span className="flex-shrink-0 w-[18px] h-[18px] text-slate-400">
            <HomeIcon />
          </span>
          {!collapsed && <span className="truncate">Home</span>}
        </Link>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 bg-white">
        {nav.map(group => (
          <div key={group.group}>
            {!collapsed && (
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400/70 px-3 mb-2">{group.group}</p>
            )}
            {collapsed && <div className="border-t border-slate-100 mb-2 mx-1" />}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom: support + logout ── */}
      <div className="px-3 pb-4 border-t border-slate-100 pt-3 space-y-1 bg-slate-50/60">
        {!collapsed && (
          <a
            href="mailto:agent@theifoa.com"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <svg className="w-[16px] h-[16px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            Contact Support
          </a>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
        >
          <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
          </svg>
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  )
}

// ─── Icon components ───────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.6} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.25 9.75 9 3l6.75 6.75" />
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.75 8.25V15a.75.75 0 0 0 .75.75h3.75v-3.75h1.5v3.75h3.75a.75.75 0 0 0 .75-.75V8.25" />
    </svg>
  )
}

function OverviewIcon() {
  return (
    <svg fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.6} className="w-full h-full">
      <rect x="1.5" y="1.5" width="6" height="6" rx="1.25" strokeLinejoin="round" />
      <rect x="10.5" y="1.5" width="6" height="6" rx="1.25" strokeLinejoin="round" />
      <rect x="1.5" y="10.5" width="6" height="6" rx="1.25" strokeLinejoin="round" />
      <rect x="10.5" y="10.5" width="6" height="6" rx="1.25" strokeLinejoin="round" />
    </svg>
  )
}

function IndividualsIcon() {
  return (
    <svg fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.6} className="w-full h-full">
      <circle cx="9" cy="5.5" r="2.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 16.5c0-3.45 3.05-5.25 6.75-5.25s6.75 1.8 6.75 5.25" />
    </svg>
  )
}

function AirlinesIcon() {
  return (
    <svg fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.6} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.75 8.25 10.5 5.25V2.25l-1.5.75V5.25L3 7.5v1.5l6-1.5v2.25l-1.5 1.5v1.5l2.25-.75 2.25.75v-1.5l-1.5-1.5V7.5l5.25 1.5v-0.75Z" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.6} className="w-full h-full">
      <circle cx="9" cy="5.5" r="2.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.25c0-3.2 2.7-5 6-5s6 1.8 6 5" />
    </svg>
  )
}

function SubscriptionIcon() {
  return (
    <svg fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.6} className="w-full h-full">
      <rect x="1.5" y="4.5" width="15" height="9" rx="1.5" strokeLinejoin="round" />
      <path strokeLinecap="round" d="M1.5 7.5h15" />
      <path strokeLinecap="round" d="M4.5 11.25h3" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.6} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M10.5 1.5H4.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5V6l-4.5-4.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5V6H15" />
      <path strokeLinecap="round" d="M6 9.75h6M6 12.75h3.75" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.6} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M7.65 2.1a1.5 1.5 0 0 1 2.7 0l.3.6a1.5 1.5 0 0 0 2.05.65l.6-.3a1.5 1.5 0 0 1 1.9 1.9l-.3.6a1.5 1.5 0 0 0 .65 2.05l.6.3a1.5 1.5 0 0 1 0 2.7l-.6.3a1.5 1.5 0 0 0-.65 2.05l.3.6a1.5 1.5 0 0 1-1.9 1.9l-.6-.3a1.5 1.5 0 0 0-2.05.65l-.3.6a1.5 1.5 0 0 1-2.7 0l-.3-.6a1.5 1.5 0 0 0-2.05-.65l-.6.3a1.5 1.5 0 0 1-1.9-1.9l.3-.6A1.5 1.5 0 0 0 2.45 9.9l-.6-.3a1.5 1.5 0 0 1 0-2.7l.6-.3a1.5 1.5 0 0 0 .65-2.05l-.3-.6a1.5 1.5 0 0 1 1.9-1.9l.6.3a1.5 1.5 0 0 0 2.05-.65l.3-.6Z" />
      <circle cx="9" cy="9" r="2" />
    </svg>
  )
}
