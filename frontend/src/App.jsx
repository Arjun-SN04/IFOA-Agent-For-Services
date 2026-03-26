import { Routes, Route } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

// Public pages
import Home from './pages/Home'
import IndividualForm from './pages/IndividualForm'
import AirlinesForm from './pages/AirlinesForm'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'

// Admin pages
import AdminDashboard from './pages/AdminDashboard'
import AdminProfilePage from './pages/dashboard/AdminProfilePage'

// User dashboard pages
import UserDashboard from './pages/dashboard/UserDashboard'
import ProfilePage from './pages/dashboard/ProfilePage'
import SubscriptionPage from './pages/dashboard/SubscriptionPage'
import DocumentsPage from './pages/dashboard/DocumentsPage'
import SettingsPage from './pages/dashboard/SettingsPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Public ─────────────────────────────────────────── */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
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
