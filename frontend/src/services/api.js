import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const API = axios.create({ baseURL: BASE_URL })

// Attach token from localStorage to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('ifoa_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Individual ──
export const createIndividual       = (data) => API.post('/individuals', data)
export const getAllIndividuals       = ()     => API.get('/individuals')
export const getIndividualById      = (id)   => API.get(`/individuals/${id}`)
export const getIndividualByEmail   = (email)=> API.get('/individuals/by-email', { params: { email } })
export const updateIndividual       = (id, data) => API.put(`/individuals/${id}`, data)
export const deleteIndividual       = (id)   => API.delete(`/individuals/${id}`)
export const exportIndividualsExcel = ()     => `${BASE_URL}/individuals/export/excel`

// ── Airlines ──
export const createAirlinesSubscription  = (data) => API.post('/airlines', data)
export const getAllAirlinesSubscriptions  = ()     => API.get('/airlines')
export const getAirlinesSubscriptionById = (id)   => API.get(`/airlines/${id}`)
export const getAirlinesSubscriptionByEmail = (email) => API.get('/airlines/by-email', { params: { email } })
export const updateAirlinesSubscription  = (id, data) => API.put(`/airlines/${id}`, data)
export const deleteAirlinesSubscription  = (id)   => API.delete(`/airlines/${id}`)
export const exportAirlinesExcel         = ()     => `${BASE_URL}/airlines/export/excel`

// ── Payments (Stripe) ──
// Returns { success, clientSecret, amount, currency }
export const createPaymentIntent = (registrationId, registrationModel) =>
  API.post('/payments/create-intent', { registrationId, registrationModel })

// ── Auth ──
export const login               = (data) => API.post('/auth/login', data)
export const signup              = (data) => API.post('/auth/signup', data)
export const seedAdminLogin      = (data) => API.post('/auth/seed-admin-login', data)
export const seedAdminSignup     = (data) => API.post('/auth/seed-admin-signup', data)
export const updateCredentials   = (data) => API.put('/auth/update-credentials', data)
export const linkRegistration    = (data) => API.put('/auth/link-registration', data)
export const addSubscription     = (data) => API.put('/auth/add-subscription', data)
export const updateAirlineName   = (data) => API.put('/auth/update-airline-name', data)
