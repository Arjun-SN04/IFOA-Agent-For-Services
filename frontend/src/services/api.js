import axios from 'axios'

const API = axios.create({ baseURL: 'http://localhost:5000/api' })

// Attach token from localStorage to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('ifoa_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Individual ──
export const createIndividual = (data) => API.post('/individuals', data)
export const getAllIndividuals = () => API.get('/individuals')
export const getIndividualById = (id) => API.get(`/individuals/${id}`)
export const updateIndividual = (id, data) => API.put(`/individuals/${id}`, data)
export const deleteIndividual = (id) => API.delete(`/individuals/${id}`)
export const exportIndividualsExcel = () => `http://localhost:5000/api/individuals/export/excel`

// ── Airlines ──
export const createAirlinesSubscription = (data) => API.post('/airlines', data)
export const getAllAirlinesSubscriptions = () => API.get('/airlines')
export const getAirlinesSubscriptionById = (id) => API.get(`/airlines/${id}`)
export const updateAirlinesSubscription = (id, data) => API.put(`/airlines/${id}`, data)
export const deleteAirlinesSubscription = (id) => API.delete(`/airlines/${id}`)
export const exportAirlinesExcel = () => `http://localhost:5000/api/airlines/export/excel`

// ── Auth ──
export const updateCredentials = (data) => API.put('/auth/update-credentials', data)
export const linkRegistration = (data) => API.put('/auth/link-registration', data)
