import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Spinner shown during auth loading
function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
    </div>
  )
}

// Protect a route — if not logged in, redirect to /login
// If logged in but wrong role, redirect to their home
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner />

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    // Redirect to appropriate home based on role
    const home = user.role === 'admin' ? '/admin' : '/dashboard'
    return <Navigate to={home} replace />
  }

  return children
}
