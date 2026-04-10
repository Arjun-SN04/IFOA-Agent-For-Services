import { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const API = axios.create({ baseURL: BASE_URL })

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('ifoa_token'))
  const [loading, setLoading] = useState(true)
  // When true, show the forced-password-change modal instead of the normal dashboard
  const [mustChangePassword, setMustChangePassword] = useState(false)

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
        setMustChangePassword(res.data.user?.mustChangePassword || false)
      } catch {
        setToken(null)
        setUser(null)
        setMustChangePassword(false)
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, [token])

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password })
    setToken(res.data.token)
    setUser(res.data.user)
    setMustChangePassword(res.data.user?.mustChangePassword || false)
    return res.data.user
  }

  const signup = async (email, password, role, firstName, lastName, airlineName) => {
    const res = await API.post('/auth/signup', { email, password, role, firstName, lastName, airlineName })
    setToken(res.data.token)
    setUser(res.data.user)
    setMustChangePassword(res.data.user?.mustChangePassword || false)
    return res.data.user
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setMustChangePassword(false)
  }

  const setSession = (newToken, newUser) => {
    setToken(newToken)
    setUser(newUser)
    setMustChangePassword(newUser?.mustChangePassword || false)
    localStorage.setItem('ifoa_token', newToken)
  }

  const updateCredentials = async (currentPassword, newEmail, newPassword) => {
    const res = await API.put('/auth/update-credentials', { currentPassword, newEmail, newPassword })
    setToken(res.data.token)
    setUser(res.data.user)
    // If they just changed their password, mustChangePassword will be false now
    setMustChangePassword(res.data.user?.mustChangePassword || false)
    localStorage.setItem('ifoa_token', res.data.token)
    return res.data
  }

  const updateProfile = async (firstName, lastName) => {
    const res = await API.put('/auth/update-profile', { firstName, lastName })
    setToken(res.data.token)
    setUser(res.data.user)
    localStorage.setItem('ifoa_token', res.data.token)
    return res.data
  }

  const linkRegistration = async (registrationId, registrationModel) => {
    const res = await API.put('/auth/link-registration', { registrationId, registrationModel })
    setToken(res.data.token)
    setUser(res.data.user)
    localStorage.setItem('ifoa_token', res.data.token)
    return res.data
  }

  const addSubscription = async (subscriptionId) => {
    const res = await API.put('/auth/add-subscription', { subscriptionId })
    setToken(res.data.token)
    setUser(res.data.user)
    localStorage.setItem('ifoa_token', res.data.token)
    return res.data
  }

  const updateAirlineName = async (airlineName) => {
    const res = await API.put('/auth/update-airline-name', { airlineName })
    setToken(res.data.token)
    setUser(res.data.user)
    localStorage.setItem('ifoa_token', res.data.token)
    return res.data
  }

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      mustChangePassword,
      login, signup, logout, setSession,
      updateCredentials, updateProfile,
      linkRegistration, addSubscription, updateAirlineName,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
