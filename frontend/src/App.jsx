import { Routes, Route, Outlet, useLocation, Navigate } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import './App.css'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'
import { DataCacheProvider } from './context/DataCacheContext'
import ChatBot from './components/ChatBot'
import HeaderNav from './components/layout/HeaderNav'

// Public pages — eagerly loaded
import Home from './pages/Home'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'

// Lazy-loaded pages — only downloaded when first visited
const RegisterPage        = lazy(() => import('./pages/RegisterPage'))
const AdminDashboard      = lazy(() => import('./pages/AdminDashboard'))
const AdminProfilePage    = lazy(() => import('./pages/dashboard/AdminProfilePage'))
const SeedAdminSignupPage = lazy(() => import('./pages/SeedAdminSignupPage'))
const SeedAdminLoginPage  = lazy(() => import('./pages/SeedAdminLoginPage'))
const UserDashboard       = lazy(() => import('./pages/dashboard/UserDashboard'))
const ProfilePage         = lazy(() => import('./pages/dashboard/ProfilePage'))
const SubscriptionPage    = lazy(() => import('./pages/dashboard/SubscriptionPage'))
const DocumentsPage       = lazy(() => import('./pages/dashboard/DocumentsPage'))
const SettingsPage        = lazy(() => import('./pages/dashboard/SettingsPage'))

// Tiny blank-slate while a lazy chunk loads — no spinner flash
function PageFallback() {
  return <div className="min-h-screen bg-slate-50" />
}

// Auth guard — memoised so it never re-mounts children on unrelated renders
function RequireAuth({ roles }) {
  const { user, loading, mustChangePassword } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
  }
  // If the user must change their password, send them back to login page
  // which will show the MustChangePasswordModal on top (they're already logged in,
  // AuthContext still has the token, the modal will render immediately).
  if (mustChangePassword) {
    return <Navigate to="/login" state={{ from: location, mustChangePassword: true }} replace />
  }
  return <Outlet />
}

// ── Persistent dashboard shell ──────────────────────────────────────────────
// HeaderNav stays mounted the entire time the user is inside /dashboard/*
// Only the <main> content swaps — no header remount, no layout flicker.
function DashboardShell() {
  return (
    <div className="min-h-screen bg-slate-50">
      <HeaderNav />
      <main className="mx-auto w-full max-w-7xl px-5 pt-[100px] pb-14 sm:px-7 lg:px-10">
        <Suspense fallback={<div className="py-20 flex justify-center"><div className="w-6 h-6 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" /></div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}

// Same shell for admin routes
function AdminShell() {
  return (
    <div className="min-h-screen bg-slate-50">
      <HeaderNav />
      <main className="mx-auto w-full max-w-7xl px-5 pt-[100px] pb-14 sm:px-7 lg:px-10">
        <Suspense fallback={<div className="py-20 flex justify-center"><div className="w-6 h-6 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" /></div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function App() {
  return (
    <AuthProvider>
      <DataCacheProvider>
        <ScrollToTop />
        <ChatBot />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* ── Public ── */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/seed-admin-signup" element={<SeedAdminSignupPage />} />
            <Route path="/seed-admin-login" element={<SeedAdminLoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* ── Admin — single shell, header never remounts ── */}
            <Route element={<RequireAuth roles={['admin']} />}>
              <Route element={<AdminShell />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/individuals" element={<AdminDashboard />} />
                <Route path="/admin/airlines" element={<AdminDashboard />} />
                <Route path="/admin/add-airline" element={<AdminDashboard />} />
                <Route path="/admin/add-individual" element={<AdminDashboard />} />
                <Route path="/admin/profile" element={<AdminProfilePage />} />
              </Route>
            </Route>

            {/* ── User dashboard — single shell, header never remounts ── */}
            <Route element={<RequireAuth roles={['individual', 'airline']} />}>
              <Route element={<DashboardShell />}>
                <Route path="/dashboard" element={<UserDashboard />} />
                <Route path="/dashboard/profile" element={<ProfilePage />} />
                <Route path="/dashboard/subscription" element={<SubscriptionPage />} />
                <Route path="/dashboard/documents" element={<DocumentsPage />} />
                <Route path="/dashboard/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </DataCacheProvider>
    </AuthProvider>
  )
}

export default App
