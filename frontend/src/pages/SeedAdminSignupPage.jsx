import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/IFOA_USA_white.png'
import { seedAdminSignup } from '../services/api'

export default function SeedAdminSignupPage() {
  const { setSession } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const focusStyle = (e) => {
    e.target.style.borderColor = '#0000ff'
    e.target.style.boxShadow = '0 0 0 3px rgba(0,0,255,0.12)'
  }

  const blurStyle = (e) => {
    e.target.style.borderColor = '#e2e8f0'
    e.target.style.boxShadow = 'none'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const { data } = await seedAdminSignup({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      })
      setSession(data.token, data.user)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-white">
      <div className="relative w-full max-w-lg">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
          <div className="px-8 py-7 text-center border-b border-slate-100">
            <Link to="/" className="inline-block">
              <img src={logo} alt="IFOA USA" className="h-11 w-auto mx-auto" />
            </Link>
            <p className="text-slate-500 text-sm mt-2 font-medium">Administrator Access</p>
          </div>

          <div className="px-8 py-7">
            <div className="mb-5">
              <h2 className="text-xl font-black mb-1" style={{ color: '#0f172a' }}>Create Admin Account</h2>
              <p className="text-xs" style={{ color: '#64748b' }}>Register a new admin profile.</p>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition"
                    style={{ borderColor: '#e2e8f0', background: '#f8fafc', color: '#0f172a' }}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition"
                    style={{ borderColor: '#e2e8f0', background: '#f8fafc', color: '#0f172a' }}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@example.com"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition"
                  style={{ borderColor: '#e2e8f0', background: '#f8fafc', color: '#0f172a' }}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      name="password"
                      required
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Min. 8 chars"
                      className="w-full rounded-xl border px-4 py-2.5 pr-10 text-sm outline-none transition"
                      style={{ borderColor: '#e2e8f0', background: '#f8fafc', color: '#0f172a' }}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 transition-colors"
                      style={{ color: '#94a3b8' }}
                    >
                      {showPw ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Confirm</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      name="confirmPassword"
                      required
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Repeat password"
                      className="w-full rounded-xl border px-4 py-2.5 pr-10 text-sm outline-none transition"
                      style={{ borderColor: '#e2e8f0', background: '#f8fafc', color: '#0f172a' }}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 transition-colors"
                      style={{ color: '#94a3b8' }}
                    >
                      {showConfirm ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
                style={{ background: loading ? '#8080ff' : '#0000ff' }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.background = '#0000e6'
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.background = '#0000ff'
                }}
              >
                {loading ? 'Creating account...' : 'Create Admin Account'}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm" style={{ color: '#64748b' }}>
                Already have an account?{' '}
                <Link to="/seed-admin-login" className="font-semibold transition-colors" style={{ color: '#0000ff' }}>
                  Sign in
                </Link>
              </p>
              <Link to="/" className="text-xs" style={{ color: '#94a3b8' }}>
                Back to home
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3 justify-center">
          {['Admin Signup', 'Secure & Encrypted', 'FAA Platform'].map((badge) => (
            <span
              key={badge}
              className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ background: 'white', color: '#475569', border: '1px solid #e2e8f0' }}
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
