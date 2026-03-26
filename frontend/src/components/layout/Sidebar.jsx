import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/logo.png'

// ─── Nav item config per role ───────────────────────────────────────────────
const adminNav = [
  {
    group: 'Dashboard',
    items: [
      { to: '/admin', label: 'Overview', exact: true, icon: <GridIcon /> },
      { to: '/admin/individuals', label: 'Individuals', icon: <UserIcon /> },
      { to: '/admin/airlines', label: 'Airlines', icon: <PlaneIcon /> },
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
      { to: '/dashboard', label: 'Dashboard', exact: true, icon: <GridIcon /> },
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
          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <span className={`flex-shrink-0 w-5 h-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`}>
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

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen flex flex-col border-r border-slate-200 bg-white shadow-sm transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-[240px]'
      }`}
    >
      {/* Logo */}
      <div className={`flex h-16 flex-shrink-0 items-center border-b border-slate-100 ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="IFOA" className="h-7 w-auto object-contain" />
          </Link>
        )}
        {collapsed && (
          <Link to="/">
            <img src={logo} alt="IFOA" className="h-7 w-auto object-contain" />
          </Link>
        )}
        <button
          onClick={onToggle}
          className={`rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors ${collapsed ? 'mx-auto' : ''}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {collapsed
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            }
          </svg>
        </button>
      </div>

      {/* User badge */}
      {!collapsed && (
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white text-sm font-black flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 capitalize">{user?.role}</p>
          </div>
        </div>
      )}

      {collapsed && (
        <div className="flex justify-center py-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white text-sm font-black flex items-center justify-center">
            {initials}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {nav.map(group => (
          <div key={group.group}>
            {!collapsed && (
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 px-3 mb-2">{group.group}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-slate-100 pt-3">
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-6 0v-1m0-8V7a3 3 0 0 1 6 0v1" />
          </svg>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}

// ─── Icon components ──────────────────────────────────────────────────────────
function GridIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}
function UserIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <circle cx="9.5" cy="7" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
    </svg>
  )
}
function PlaneIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2 14 8.5-2.5L13 4l2 1-1 7 5.5 1.5a2 2 0 0 1 0 3L14 18l1 7-2 1-2.5-7.5L2 16v-2Z" />
    </svg>
  )
}
function ProfileIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}
function SubscriptionIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
    </svg>
  )
}
function DocumentIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
    </svg>
  )
}
function SettingsIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
