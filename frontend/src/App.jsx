import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import './App.css'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import ChatBot from './components/ChatBot'

// Public pages
import Home from './pages/Home'
import IndividualForm from './pages/IndividualForm'
import AirlinesForm from './pages/AirlinesForm'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'

// Admin pages
import AdminDashboard from './pages/AdminDashboard'
import AdminProfilePage from './pages/dashboard/AdminProfilePage'

// Hidden admin auth pages (accessible only by typing URL manually)
import SeedAdminSignupPage from './pages/SeedAdminSignupPage'
import SeedAdminLoginPage from './pages/SeedAdminLoginPage'

// User dashboard pages
import UserDashboard from './pages/dashboard/UserDashboard'
import ProfilePage from './pages/dashboard/ProfilePage'
import SubscriptionPage from './pages/dashboard/SubscriptionPage'
import DocumentsPage from './pages/dashboard/DocumentsPage'
import SettingsPage from './pages/dashboard/SettingsPage'

// Scroll to top on every route change
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
      <ScrollToTop />
      <ChatBot />
      <Routes>
        {/* ── Public ─────────────────────────────────────────── */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/seed-admin-signup" element={<SeedAdminSignupPage />} />
        <Route path="/seed-admin-login" element={<SeedAdminLoginPage />} />
        <Route path="/individual/register" element={<IndividualForm />} />
        <Route path="/airlines/register" element={<AirlinesForm />} />

        {/* ── Admin only ─────────────────────────────────────── */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/individuals" element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/airlines" element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/profile" element={
          <ProtectedRoute roles={['admin']}>
            <AdminProfilePage />
          </ProtectedRoute>
        } />

        {/* ── Logged-in users (individual & airline) ─────────── */}
        <Route path="/dashboard" element={
          <ProtectedRoute roles={['individual', 'airline']}>
            <UserDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/profile" element={
          <ProtectedRoute roles={['individual', 'airline']}>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/subscription" element={
          <ProtectedRoute roles={['individual', 'airline']}>
            <SubscriptionPage />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/documents" element={
          <ProtectedRoute roles={['individual', 'airline']}>
            <DocumentsPage />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/settings" element={
          <ProtectedRoute roles={['individual', 'airline']}>
            <SettingsPage />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  )
}

export default App
