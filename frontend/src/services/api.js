import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const API = axios.create({ baseURL: BASE_URL })

// Attach JWT token from localStorage to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('ifoa_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Unified Registration ────────────────────────────────────────────────────
export const register = (type, data) => API.post('/register', { type, ...data })

// ── Individual ──────────────────────────────────────────────────────────────
export const createIndividual              = (data)      => API.post('/individuals', data)
export const createAdminIndividualForm     = (data)      => API.post('/individuals/admin/create-form', data)
export const importIndividualsFromExcel    = (formData)  => API.post('/individuals/admin/import-excel', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
export const getAllIndividuals              = ()          => API.get('/individuals')
export const getIndividualById             = (id)        => API.get(`/individuals/${id}`)
export const getIndividualByEmail          = (email)     => API.get('/individuals/by-email', { params: { email } })
export const updateIndividual              = (id, data)  => API.put(`/individuals/${id}`, data)
export const deleteIndividual              = (id)        => API.delete(`/individuals/${id}`)
export const bulkDeleteIndividuals         = (ids)       => API.delete('/individuals/bulk', { data: { ids } })
export const markIndividualPaid            = (id)        => API.patch(`/individuals/${id}/mark-paid`)
export const markIndividualInvoiceGenerated = (id)       => API.patch(`/individuals/${id}/mark-invoice-generated`)

export const exportIndividualsExcel = () => {
  const token = localStorage.getItem('ifoa_token') || ''
  return `${BASE_URL}/individuals/export/excel${token ? `?token=${token}` : ''}`
}
export const exportAirlinesExcel = () => {
  const token = localStorage.getItem('ifoa_token') || ''
  return `${BASE_URL}/airlines/export/excel${token ? `?token=${token}` : ''}`
}

// ── Airlines ─────────────────────────────────────────────────────────────────
export const createAirlinesSubscription     = (data)     => API.post('/airlines', data)
export const importAirlinesFromExcel        = (formData) => API.post('/airlines/admin/import-excel', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
export const getAllAirlinesSubscriptions     = ()         => API.get('/airlines')
export const getAirlinesSubscriptionById    = (id)       => API.get(`/airlines/${id}`)
export const getAirlinesSubscriptionByEmail = (email)    => API.get('/airlines/by-email', { params: { email } })
export const updateAirlinesSubscription     = (id, data) => API.put(`/airlines/${id}`, data)
export const deleteAirlinesSubscription     = (id)       => API.delete(`/airlines/${id}`)
// Admin: keep (un-cancel) a soft-cancelled plan
export const uncancelAirlinePlan            = (id, planRef) => API.post(`/airlines/${id}/uncancel-plan`, { planRef })
export const uncancelIndividualPlan         = (id)       => API.post(`/individuals/${id}/uncancel-plan`, { planRef: 'base' })
export const bulkDeleteAirlines             = (ids)      => API.delete('/airlines/bulk', { data: { ids } })
export const setIndividualRenewalInvoice   = (id, invoiceNumber) => API.patch(`/individuals/${id}/renewal-invoice`, { invoiceNumber })
export const setAirlinesRenewalInvoice     = (id, invoiceNumber) => API.patch(`/airlines/${id}/renewal-invoice`, { invoiceNumber })
export const updateIndividualRenewalDetails = (id, data) => API.patch(`/individuals/${id}/renewal-details`, data)
export const updateAirlinesRenewalDetails   = (id, data) => API.patch(`/airlines/${id}/renewal-details`, data)
export const markAirlinesPaid               = (id)       => API.patch(`/airlines/${id}/mark-paid`)
export const activateWirePayment            = (id)       => API.patch(`/airlines/${id}/activate-wire`)
export const declineWirePayment             = (id)       => API.patch(`/airlines/${id}/decline-wire`)
export const markAirlinesInvoiceGenerated   = (id)       => API.patch(`/airlines/${id}/mark-invoice-generated`)
export const createAdminAirlineForm         = (data)     => API.post('/airlines/admin/create-form', data)
export const requestAirlineInvoice          = (id, data) => API.patch(`/airlines/${id}/request-invoice`, data)
// Admin manual holder-upgrade (increase committed count + create a holder group)
export const adminHolderUpgrade             = (id, data) => API.post(`/airlines/${id}/admin-holder-upgrade`, data)
export const markHolderGroupPaid            = (id, groupId) => API.post(`/airlines/${id}/holder-group/${groupId}/mark-paid`)
// Force-activate a holder group's queued renewal now (admin)
export const activateGroupRenewalNow        = (id, groupId) => API.post(`/airlines/${id}/holder-group/${groupId}/activate-renewal`)
// Delete one add-on/upgrade plan (admin)
export const deleteHolderGroup              = (id, groupId) => API.delete(`/airlines/${id}/holder-group/${groupId}`)
// Airline cancels (permanently deletes) one of its plans. planRef = 'base' | groupId.
// holderTarget = 'base' | groupId | null — move this plan's holders to an active plan
// so they persist (null = delete them with the plan).
export const cancelAirlinePlan              = (id, planRef, holderTarget, moveHolderIds) => API.post(`/airlines/${id}/cancel-plan`, { planRef, holderTarget: holderTarget || null, moveHolderIds: moveHolderIds || null })
// Admin renews a subscription (no payment) + generates invoice. registrationModel: 'Airlines' | 'Individual'.
export const adminRenewAirline              = (id, data) => API.post(`/airlines/${id}/admin-renew`, { ...data, registrationModel: 'Airlines' })
export const adminRenewIndividual           = (id, data) => API.post(`/individuals/${id}/admin-renew`, { ...data, registrationModel: 'Individual' })

// ── Admin: convert base/group → Unlimited (quote + apply-with-invoice) ─────────
export const adminConversionQuote = (registrationId, registrationModel, holderGroupId, targetPlan, targetMultiYearCount) =>
  API.get('/payments/admin/conversion-quote', { params: {
    registrationId, registrationModel,
    holderGroupId: holderGroupId || undefined,
    targetPlan: targetPlan || undefined,
    targetMultiYearCount: targetMultiYearCount || undefined,
  } })
export const adminConvertToUnlimited = (registrationId, registrationModel, payload) =>
  API.post('/payments/admin/convert-unlimited', { registrationId, registrationModel, ...payload })

// ── Per-plan unused-time credits (owner or admin) ─────────────────────────────
export const getPlanCredits = (registrationId, model) =>
  API.get(`/payments/credits/${registrationId}`, { params: { model: model || undefined } })

// ── Payments (Stripe) ────────────────────────────────────────────────────────
export const createPaymentIntent = (registrationId, registrationModel) =>
  API.post('/payments/create-intent', { registrationId, registrationModel })

export const confirmPayment = (data) => API.post('/payments/confirm', data)

export const getPaymentsByRegistration = (registrationId) =>
  API.get(`/payments/by-registration/${registrationId}`)

export const getPaymentById = (id) => API.get(`/payments/${id}`)

export const getAllPayments = (params) => API.get('/payments', { params })

/**
 * Admin saves edited invoice fields back to the Payment document.
 * This is the SINGLE SOURCE OF TRUTH — both admin and user see the same invoice.
 * @param {string} paymentId   - Payment._id
 * @param {object} invoiceDraft - Full invoice shape used by generateIFOAInvoicePDF()
 * @param {string} invoiceNumber
 */
export const savePaymentInvoiceDraft = (paymentId, invoiceDraft, invoiceNumber) =>
  API.patch(`/payments/${paymentId}/save-invoice-draft`, { invoiceDraft, invoiceNumber })

// Admin: immediately activate the queued nextRenewal on a registration
export const activateQueuedRenewal = (registrationId, registrationModel) =>
  API.post('/payments/admin/activate-renewal', { registrationId, registrationModel })

// Admin: cancel/remove the queued nextRenewal on a registration
export const cancelQueuedRenewal = (registrationId, registrationModel) =>
  API.post('/payments/admin/cancel-renewal', { registrationId, registrationModel })

// Admin: send renewal reminder emails to selected users
export const sendRenewalReminders = (recipients) =>
  API.post('/payments/admin/send-renewal-reminders', { recipients })

// User: auto-activate a queued renewal whose activationDate has already passed.
// Backend enforces ownership + date guard — safe for non-admin users.
export const autoActivateRenewal = (registrationId, registrationModel) =>
  API.post('/payments/auto-activate-renewal', { registrationId, registrationModel })

// ── Invoices (canonical Invoice model) ─────────────────────────────────────────────
// Fetches a fresh DB-backed unique invoice number (format: Invoice US-350-26)
export const generateInvoiceNumber     = ()           => API.get('/invoices/generate-number')
export const getInvoiceByPayment       = (paymentId)  => API.get(`/invoices/by-payment/${paymentId}`)
export const getInvoiceByRegistration  = (regId)      => API.get(`/invoices/by-registration/${regId}`)
// Admin saves edits into the canonical Invoice doc (+ syncs to Payment.invoiceDraft)
export const saveInvoiceDraftToDoc     = (invoiceId, draft, invoiceNumber) =>
  API.patch(`/invoices/${invoiceId}/draft`, { draft, invoiceNumber })
// Admin creates a new canonical Invoice doc when none exists (wire/no-payment registrations)
export const createAdminInvoiceDoc = (registrationId, registrationModel, draft, invoiceNumber, purpose, wirePending) =>
  API.post('/invoices/admin-create', { registrationId, registrationModel, draft, invoiceNumber, purpose, wirePending })
// Admin deletes an invoice — removed for both admin and the airline/individual
export const deleteInvoice = (registrationId, invoiceNumber) =>
  API.delete(`/invoices/by-registration/${registrationId}/${encodeURIComponent(invoiceNumber)}`)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const login             = (data) => API.post('/auth/login', data)
// Admin: signed-up accounts (airline/individual) with no registration/plan yet
export const getAccountsWithoutPlan = (role) => API.get('/auth/admin/accounts-without-plan', { params: role ? { role } : {} })
export const signup            = (data) => API.post('/auth/signup', data)
export const seedAdminLogin    = (data) => API.post('/auth/seed-admin-login', data)
export const seedAdminSignup   = (data) => API.post('/auth/seed-admin-signup', data)
export const updateCredentials = (data) => API.put('/auth/update-credentials', data)
export const updateProfile     = (data) => API.put('/auth/update-profile', data)
export const linkRegistration  = (data) => API.put('/auth/link-registration', data)
export const addSubscription   = (data) => API.put('/auth/add-subscription', data)
export const updateAirlineName = (data) => API.put('/auth/update-airline-name', data)

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications = (params) => API.get('/notifications', { params })
