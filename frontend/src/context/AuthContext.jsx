import { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const API = axios.create({ baseURL: BASE_URL })

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

  const signup = async (email, password, role, firstName, lastName, airlineName) => {
    const res = await API.post('/auth/signup', { email, password, role, firstName, lastName, airlineName })
    setToken(res.data.token)
    setUser(res.data.user)
    return res.data.user
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  const setSession = (newToken, newUser) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('ifoa_token', newToken)
  }

  const updateCredentials = async (currentPassword, newEmail, newPassword) => {
    const res = await API.put('/auth/update-credentials', { currentPassword, newEmail, newPassword })
    setToken(res.data.token)
    setUser(res.data.user)
    localStorage.setItem('ifoa_token', res.data.token)
    return res.data
  }

  // NEW: update profile name only (no password required)
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

  // Adds a new subscription ID to the user's subscriptionIds array.
  // Does NOT overwrite the primary registrationId — safe to call on every new form submit.
  const addSubscription = async (subscriptionId) => {
    const res = await API.put('/auth/add-subscription', { subscriptionId })
    setToken(res.data.token)
    setUser(res.data.user)
    localStorage.setItem('ifoa_token', res.data.token)
    return res.data
  }

  // Updates the airline name stored on the user account (airline role only).
  const updateAirlineName = async (airlineName) => {
    const res = await API.put('/auth/update-airline-name', { airlineName })
    setToken(res.data.token)
    setUser(res.data.user)
    localStorage.setItem('ifoa_token', res.data.token)
    return res.data
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, setSession, updateCredentials, updateProfile, linkRegistration, addSubscription, updateAirlineName }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
