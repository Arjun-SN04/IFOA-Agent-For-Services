import axios from 'axios'

const API = axios.create({ baseURL: 'http://localhost:5000/api' })

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
