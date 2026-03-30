import { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'

const API = axios.create({ baseURL: 'http://localhost:5000/api' })

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('ifoa_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`
      localStorage.setItem('ifoa_token', token)
    } else {
      delete API.defaults.headers.common['Authorization']
      localStorage.removeItem('ifoa_token')
    }
  }, [token])

  useEffect(() => {
    const verify = async () => {
      if (!token) { setLoading(false); return }
      try {
        const res = await API.get('/auth/me')
        setUser(res.data.user)
      } catch {
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, [])

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password })
    setToken(res.data.token)
    setUser(res.data.user)
    return res.data.user
  }

  const signup = async (email, password, role, firstName, lastName) => {
    const res = await API.post('/auth/signup', { email, password, role, firstName, lastName })
    setToken(res.data.token)
    setUser(res.data.user)
    return res.data.user
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  // Directly set session from token + user object (used by seed-admin pages)
  const setSession = (newToken, newUser) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('ifoa_token', newToken)
  }

  // Update email and/or password
  const updateCredentials = async (currentPassword, newEmail, newPassword) => {
    const res = await API.put('/auth/update-credentials', { currentPassword, newEmail, newPassword })
    setToken(res.data.token)
    setUser(res.data.user)
    localStorage.setItem('ifoa_token', res.data.token)
    return res.data
  }

  // Link a registration record to this account after form submission
  const linkRegistration = async (registrationId, registrationModel) => {
    const res = await API.put('/auth/link-registration', { registrationId, registrationModel })
    setToken(res.data.token)
    setUser(res.data.user)
    localStorage.setItem('ifoa_token', res.data.token)
    return res.data
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, setSession, updateCredentials, linkRegistration }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
