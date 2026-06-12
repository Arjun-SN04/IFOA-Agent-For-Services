import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'
import { importAirlinesFromExcel } from '../../services/api'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const API = axios.create({ baseURL: BASE_URL })

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('ifoa_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const C = {
  blue: '#0000ff',
  blueDark: '#0000e6',
  blueLight: '#3333ff',
  blueXLight: '#dbeafe',
  blueMuted: '#eff6ff',
  red: '#dc2626',
  dark: '#0f172a',
  white: '#ffffff',
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
}

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','American Samoa','Andorra','Angola','Anguilla','Antigua and Barbuda','Argentina',
  'Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize',
  'Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi',
  'Cambodia','Cameroon','Canada','Cayman Islands','Chile','China','Colombia','Costa Rica','Croatia','Cuba','Cyprus',
  'Czech Republic','Denmark','Dominican Republic','Ecuador','Egypt','El Salvador','Estonia','Ethiopia','Finland','France',
  'Germany','Ghana','Greece','Guatemala','Haiti','Honduras','Hong Kong','Hungary','Iceland','India','Indonesia','Iraq',
  'Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Korea (Republic of)','Kuwait','Latvia',
  'Lebanon','Libya','Lithuania','Luxembourg','Malaysia','Maldives','Malta','Mexico','Moldova','Monaco','Mongolia',
  'Morocco','Mozambique','Myanmar','Nepal','Netherlands','New Zealand','Nicaragua','Nigeria','Norway','Oman','Pakistan',
  'Palestine','Panama','Paraguay','Peru','Philippines','Poland','Portugal','Puerto Rico','Qatar','Romania',
  'Russian Federation','Rwanda','Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','Somalia',
  'South Africa','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria','Taiwan','Tanzania','Thailand',
  'Tunisia','Türkiye','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States of America',
  'Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
]

const HOLDER_COUNTS = ['3 to 5', '5 to 10', 'More than 10']
const SUBSCRIPTION_PLANS = ['1 Year Subscription Plan', 'Unlimited Plan']
const CERTIFICATE_TYPES = ['Part 61 - Pilot', 'Part 61 - Flight or Ground Instructor', 'Part 65 - Aircraft Dispatcher', 'Part 107 - Remote Pilot']
const PAYMENT_STATUS_OPTIONS = ['paid', 'pending']
const COUNT_OPTIONS = {
  '3 to 5': [3, 4, 5],
  '5 to 10': [5, 6, 7, 8, 9, 10],
  'More than 10': Array.from({ length: 90 }, (_, i) => i + 11),
}

const EMPTY_HOLDER = {
  fullName: '',
  dateOfBirth: '',
  certificateType: '',
  certificateStatus: 'EXISTING',
  faaCertificateNumber: '',
  iacraFtnNumber: '',
  email: '',
  hasSecondaryCertificate: false,
  secondaryCertificateType: '',
  secondaryFaaCertificateNumber: '',
  secondaryIacraFtnNumber: '',
}

export default function AdminAirlineForm() {
  const navigate = useNavigate()
  const [airlines, setAirlines] = useState([])
  const [isNewAirline, setIsNewAirline] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  const [errors, setErrors] = useState({})
  const [excelFile, setExcelFile] = useState(null)
  const [excelLoading, setExcelLoading] = useState(false)
  const [excelResult, setExcelResult] = useState(null)
  const [excelError, setExcelError] = useState('')

  const [formData, setFormData] = useState({
    subscriptionPlan: '1 Year Subscription Plan',
    holderCount: '3 to 5',
    holderCountValue: '3',
    airlineName: '',
    firstName: '',
    lastName: '',
    middleName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    paymentStatus: 'paid',
    certificateHolders: [{ ...EMPTY_HOLDER }],
    pointOfContactEmail: '',
    pointOfContactPhone: '',
    agreedToTerms: true,
  })

  // Prefill from ?email/&firstName/&lastName/&airlineName when adding a plan for an
  // existing account, so the created registration links to that user (matched by email).
  const [searchParams] = useSearchParams()
  useEffect(() => {
    const email = searchParams.get('email')
    const firstName = searchParams.get('firstName')
    const lastName = searchParams.get('lastName')
    const airlineName = searchParams.get('airlineName')
    if (email || firstName || lastName || airlineName) {
      setFormData(prev => ({
        ...prev,
        ...(email ? { email, pointOfContactEmail: email } : {}),
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(airlineName ? { airlineName } : {}),
      }))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fetchAirlines = async () => {
      try {
        const response = await API.get('/airlines/signup/list')
        if (response.data.success) {
          setAirlines(response.data.data)
        }
      } catch (err) {
        console.error('Error fetching airlines:', err)
      }
    }
    fetchAirlines()
  }, [])

  const handleSelectAirline = (airlineId) => {
    const selected = airlines.find(a => a.id === airlineId)
    if (selected) {
      setFormData(prev => ({
        ...prev,
        airlineName: selected.name,
        email: selected.email,
      }))
      setIsNewAirline(false)
    }
  }

  const handleAirlineNameChange = (e) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, airlineName: value }))
    if (airlines.some(a => a.name === value)) {
      setIsNewAirline(false)
    } else {
      setIsNewAirline(true)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleHolderChange = (index, field, value) => {
    const updated = [...formData.certificateHolders]
    updated[index] = { ...updated[index], [field]: value }
    setFormData(prev => ({ ...prev, certificateHolders: updated }))
  }

  const addHolder = () => {
    const maxHolders = formData.holderCountValue ? parseInt(formData.holderCountValue) : null
    if (maxHolders && formData.certificateHolders.length >= maxHolders) {
      setError(`Maximum ${maxHolders} holders allowed for this plan`)
      return
    }
    setFormData(prev => ({
      ...prev,
      certificateHolders: [...prev.certificateHolders, { ...EMPTY_HOLDER }],
    }))
  }

  const removeHolder = (index) => {
    if (formData.certificateHolders.length > 1) {
      setFormData(prev => ({
        ...prev,
        certificateHolders: prev.certificateHolders.filter((_, i) => i !== index),
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.holderCount) newErrors.holderCount = 'Required'
    if (!formData.holderCountValue) newErrors.holderCountValue = 'Required'
    if (!formData.subscriptionPlan) newErrors.subscriptionPlan = 'Required'
    if (!formData.paymentStatus) newErrors.paymentStatus = 'Required'
    if (!formData.airlineName?.trim()) newErrors.airlineName = 'Required'
    if (!formData.firstName?.trim()) newErrors.firstName = 'Required'
    if (!formData.lastName?.trim()) newErrors.lastName = 'Required'
    if (!formData.email?.trim()) newErrors.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email'
    if (!formData.phone) newErrors.phone = 'Required'
    if (!formData.addressLine1?.trim()) newErrors.addressLine1 = 'Required'
    if (!formData.country) newErrors.country = 'Required'

    const holderErrors = []
    formData.certificateHolders.forEach((holder, idx) => {
      const hErr = {}
      if (!holder.fullName?.trim()) hErr.fullName = 'Required'
      if (!holder.certificateType) hErr.certificateType = 'Required'
      if (!holder.faaCertificateNumber?.trim()) hErr.faaCertificateNumber = 'Required'
      if (!holder.iacraFtnNumber?.trim()) hErr.iacraFtnNumber = 'Required'
      if (holder.hasSecondaryCertificate && !holder.secondaryCertificateType) {
        hErr.secondaryCertificateType = 'Required'
      }
      holderErrors.push(hErr)
    })

    setErrors({ ...newErrors, holderErrors })
    return Object.keys(newErrors).length === 0 && holderErrors.every(h => Object.keys(h).length === 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (!validateForm()) {
      setError('Please fill all required fields')
      setLoading(false)
      return
    }

    try {
      const submitData = {
        ...formData,
        pointOfContactEmail: formData.pointOfContactEmail || formData.email,
        pointOfContactPhone: formData.pointOfContactPhone || formData.phone,
        agreedToTerms: true,
        holderCountValue: Number(formData.holderCountValue),
      }

      const response = await API.post('/airlines/admin/create-form', submitData)

      if (response.data.success) {
        setSuccess({
          message: 'Airline form created successfully!',
          credentials: response.data.data.loginCredentials,
        })
        setFormData({
          subscriptionPlan: '1 Year Subscription Plan',
          holderCount: '3 to 5',
          holderCountValue: '3',
          airlineName: '',
          firstName: '',
          lastName: '',
          middleName: '',
          dateOfBirth: '',
          email: '',
          phone: '',
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
          paymentStatus: 'paid',
          certificateHolders: [{ ...EMPTY_HOLDER }],
          pointOfContactEmail: '',
          pointOfContactPhone: '',
          agreedToTerms: true,
        })
        setErrors({})
        setIsNewAirline(false)
        // Auto-navigate back to airlines tab after 3 seconds so admin sees credentials
        setTimeout(() => navigate('/admin/airlines'), 3000)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating airline form')
    } finally {
      setLoading(false)
    }
  }

  const handleExcelImport = async () => {
    if (!excelFile) {
      setExcelError('Please choose an Excel file first.')
      return
    }

    setExcelLoading(true)
    setExcelError('')
    setExcelResult(null)

    try {
      const fd = new FormData()
      fd.append('file', excelFile)
      const res = await importAirlinesFromExcel(fd)
      setExcelResult(res.data?.data || null)
      setSuccess({ message: `Imported ${res.data?.data?.importedCount || 0} airline rows from Excel.` })
    } catch (err) {
      setExcelError(err?.response?.data?.message || 'Excel import failed.')
    } finally {
      setExcelLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto p-8 bg-white rounded-2xl shadow-lg"
      style={{ border: `1px solid ${C.gray200}` }}
    >
      <h2 className="text-3xl font-black mb-2" style={{ color: C.dark }}>
        Admin: Create Airline Form
      </h2>
      <p className="text-sm mb-8" style={{ color: C.gray600 }}>
        Fill out the complete airline registration form for new or existing airlines.
      </p>

      {success && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: '#f0fdf4', border: `1px solid #86efac` }}>
          <p style={{ color: '#166534' }} className="font-bold mb-2">
            ✓ {success.message}
          </p>
          {success?.credentials && (
            <div className="text-sm" style={{ color: '#166534' }}>
              <p className="mb-1"><strong>Login Email:</strong> {success.credentials.email}</p>
              <p><strong>Password:</strong> {success.credentials.password}</p>
            </div>
          )}
          <p className="text-xs mt-3 font-semibold" style={{ color: '#166534' }}>↩ Returning to Airlines list in 3 seconds…</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: '#fef2f2', border: `1px solid #fca5a5` }}>
          <p style={{ color: '#991b1b' }} className="font-bold">✗ {error}</p>
        </div>
      )}

      <div className="mb-8 rounded-xl border p-5" style={{ borderColor: C.gray300, background: '#f8fafc' }}>
        <p className="text-sm font-black mb-3" style={{ color: C.dark }}>Bulk Import Airlines From Excel</p>
        <p className="text-xs mb-3" style={{ color: C.gray600 }}>
          You can upload a sheet that contains both Individual and Airline rows. In this page, only airline/company rows will be imported.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          <button
            type="button"
            onClick={handleExcelImport}
            disabled={excelLoading}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition"
            style={{ background: C.blue }}
          >
            {excelLoading ? 'Importing...' : 'Import Excel'}
          </button>
        </div>

        {excelError && <p className="text-xs mt-3" style={{ color: C.red }}>{excelError}</p>}

        {excelResult && (
          <div className="mt-3 text-xs" style={{ color: '#166534' }}>
            <p className="font-bold">Imported: {excelResult.importedCount} row(s)</p>
            <p className="font-bold">Skipped: {excelResult.skippedCount} row(s)</p>
            <p className="font-bold">Failed: {excelResult.failedCount} row(s)</p>
            {Array.isArray(excelResult.failed) && excelResult.failed.length > 0 && (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                {excelResult.failed.slice(0, 10).map((f, idx) => (
                  <p key={`air-failed-${f.row || 'row'}-${idx}`}>Row {f.row}: {f.error}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ═══ SECTION 1: AIRLINE SELECTION ═══ */}
        <div>
          <h3 className="text-lg font-black mb-4" style={{ color: C.dark }}>Select or Add Airline</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>Existing Airlines</label>
              <select
                onChange={(e) => handleSelectAirline(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: errors.airlineName ? C.red : C.gray300 }}
              >
                <option value="">-- Select an airline --</option>
                {airlines.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>
                Airline / Company Name {errors.airlineName && <span style={{ color: C.red }}>*</span>}
              </label>
              <input
                type="text"
                name="airlineName"
                value={formData.airlineName}
                onChange={handleAirlineNameChange}
                placeholder="Enter airline name or select from above"
                className="w-full px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: errors.airlineName ? C.red : C.gray300 }}
              />
              {isNewAirline && <p className="text-xs mt-1" style={{ color: C.blue }}>New airline will be created</p>}
              {errors.airlineName && <p className="text-xs mt-1" style={{ color: C.red }}>{errors.airlineName}</p>}
            </div>
          </div>
        </div>

        {/* ═══ SECTION 2: PLAN & DETAILS ═══ */}
        <div style={{ borderTop: `1px solid ${C.gray200}`, paddingTop: '2rem' }}>
          <h3 className="text-lg font-black mb-4" style={{ color: C.dark }}>Plan & Company Details</h3>

          {/* Holder Count & Plan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>
                Number of Holders {errors.holderCount && <span style={{ color: C.red }}>*</span>}
              </label>
              <select
                name="holderCount"
                value={formData.holderCount}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: errors.holderCount ? C.red : C.gray300 }}
              >
                {HOLDER_COUNTS.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>
                Exact Count {errors.holderCountValue && <span style={{ color: C.red }}>*</span>}
              </label>
              <select
                name="holderCountValue"
                value={formData.holderCountValue}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: errors.holderCountValue ? C.red : C.gray300 }}
              >
                {COUNT_OPTIONS[formData.holderCount].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>
              Subscription Plan {errors.subscriptionPlan && <span style={{ color: C.red }}>*</span>}
            </label>
            <select
              name="subscriptionPlan"
              value={formData.subscriptionPlan}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-xl border text-sm"
              style={{ borderColor: errors.subscriptionPlan ? C.red : C.gray300 }}
            >
              {SUBSCRIPTION_PLANS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>
              Payment Status {errors.paymentStatus && <span style={{ color: C.red }}>*</span>}
            </label>
            <select
              name="paymentStatus"
              value={formData.paymentStatus}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-xl border text-sm"
              style={{ borderColor: errors.paymentStatus ? C.red : C.gray300 }}
            >
              {PAYMENT_STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Contact Person */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>
                First Name {errors.firstName && <span style={{ color: C.red }}>*</span>}
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: errors.firstName ? C.red : C.gray300 }}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>Middle Name</label>
              <input
                type="text"
                name="middleName"
                value={formData.middleName}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: C.gray300 }}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>
                Last Name {errors.lastName && <span style={{ color: C.red }}>*</span>}
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: errors.lastName ? C.red : C.gray300 }}
              />
            </div>
          </div>

          {/* DOB, Email, Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: C.gray300 }}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>
                Email {errors.email && <span style={{ color: C.red }}>*</span>}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: errors.email ? C.red : C.gray300 }}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>
                Phone {errors.phone && <span style={{ color: C.red }}>*</span>}
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: errors.phone ? C.red : C.gray300 }}
              />
            </div>
          </div>

          {/* Address */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>
              Address Line 1 {errors.addressLine1 && <span style={{ color: C.red }}>*</span>}
            </label>
            <input
              type="text"
              name="addressLine1"
              value={formData.addressLine1}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-xl border text-sm"
              style={{ borderColor: errors.addressLine1 ? C.red : C.gray300 }}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>Address Line 2 (Optional)</label>
            <input
              type="text"
              name="addressLine2"
              value={formData.addressLine2}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-xl border text-sm"
              style={{ borderColor: C.gray300 }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: C.gray300 }}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>State / Province</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: C.gray300 }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>Postal Code</label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: C.gray300 }}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>
                Country {errors.country && <span style={{ color: C.red }}>*</span>}
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: errors.country ? C.red : C.gray300 }}
              >
                <option value="">-- Select --</option>
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ═══ SECTION 3: CERTIFICATE HOLDERS ═══ */}
        <div style={{ borderTop: `1px solid ${C.gray200}`, paddingTop: '2rem' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black" style={{ color: C.dark }}>Certificate Holders</h3>
            <button
              type="button"
              onClick={addHolder}
              disabled={formData.certificateHolders.length >= parseInt(formData.holderCountValue)}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white"
              style={{
                background: formData.certificateHolders.length >= parseInt(formData.holderCountValue) ? C.gray400 : C.blue,
                cursor: formData.certificateHolders.length >= parseInt(formData.holderCountValue) ? 'not-allowed' : 'pointer',
              }}
            >
              + Add Certificate Holder
            </button>
          </div>

          {formData.certificateHolders.map((holder, idx) => (
            <div
              key={idx}
              className="mb-6 p-4 rounded-xl border"
              style={{ borderColor: C.gray200, background: C.gray50 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold" style={{ color: C.dark }}>Holder {idx + 1}</h4>
                {formData.certificateHolders.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeHolder(idx)}
                    className="px-3 py-1 text-sm rounded-lg text-white"
                    style={{ background: C.red }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>
                    Full Name {errors.holderErrors?.[idx]?.fullName && <span style={{ color: C.red }}>*</span>}
                  </label>
                  <input
                    type="text"
                    value={holder.fullName}
                    onChange={(e) => handleHolderChange(idx, 'fullName', e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border text-sm"
                    style={{ borderColor: errors.holderErrors?.[idx]?.fullName ? C.red : C.gray300 }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>
                    Date of Birth {errors.holderErrors?.[idx]?.dateOfBirth && <span style={{ color: C.red }}>*</span>}
                  </label>
                  <input
                    type="date"
                    value={holder.dateOfBirth}
                    onChange={(e) => handleHolderChange(idx, 'dateOfBirth', e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border text-sm"
                    style={{ borderColor: errors.holderErrors?.[idx]?.dateOfBirth ? C.red : C.gray300 }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>
                    Certificate Type {errors.holderErrors?.[idx]?.certificateType && <span style={{ color: C.red }}>*</span>}
                  </label>
                  <select
                    value={holder.certificateType}
                    onChange={(e) => handleHolderChange(idx, 'certificateType', e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border text-sm"
                    style={{ borderColor: errors.holderErrors?.[idx]?.certificateType ? C.red : C.gray300 }}
                  >
                    <option value="">-- Select --</option>
                    {CERTIFICATE_TYPES.map(ct => (
                      <option key={ct} value={ct}>{ct}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>Certificate Status</label>
                  <select
                    value={holder.certificateStatus}
                    onChange={(e) => handleHolderChange(idx, 'certificateStatus', e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border text-sm"
                    style={{ borderColor: C.gray300 }}
                  >
                    <option value="EXISTING">Existing</option>
                    <option value="NEW">New</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>
                    FAA Certificate # {errors.holderErrors?.[idx]?.faaCertificateNumber && <span style={{ color: C.red }}>*</span>}
                  </label>
                  <input
                    type="text"
                    value={holder.faaCertificateNumber}
                    onChange={(e) => handleHolderChange(idx, 'faaCertificateNumber', e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border text-sm"
                    style={{ borderColor: errors.holderErrors?.[idx]?.faaCertificateNumber ? C.red : C.gray300 }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>
                    IACRA FTN {errors.holderErrors?.[idx]?.iacraFtnNumber && <span style={{ color: C.red }}>*</span>}
                  </label>
                  <input
                    type="text"
                    value={holder.iacraFtnNumber}
                    onChange={(e) => handleHolderChange(idx, 'iacraFtnNumber', e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border text-sm"
                    style={{ borderColor: errors.holderErrors?.[idx]?.iacraFtnNumber ? C.red : C.gray300 }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>Email</label>
                  <input
                    type="email"
                    value={holder.email}
                    onChange={(e) => handleHolderChange(idx, 'email', e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border text-sm"
                    style={{ borderColor: C.gray300 }}
                  />
                </div>
              </div>

              {/* Secondary Certificate */}
              <div>
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={holder.hasSecondaryCertificate}
                    onChange={(e) => handleHolderChange(idx, 'hasSecondaryCertificate', e.target.checked)}
                  />
                  <span className="text-sm font-bold" style={{ color: C.dark }}>Has Secondary Certificate</span>
                </label>

                {holder.hasSecondaryCertificate && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pl-6">
                    <div>
                      <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>
                        Type {errors.holderErrors?.[idx]?.secondaryCertificateType && <span style={{ color: C.red }}>*</span>}
                      </label>
                      <select
                        value={holder.secondaryCertificateType}
                        onChange={(e) => handleHolderChange(idx, 'secondaryCertificateType', e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border text-sm"
                        style={{ borderColor: errors.holderErrors?.[idx]?.secondaryCertificateType ? C.red : C.gray300 }}
                      >
                        <option value="">-- Select --</option>
                        {CERTIFICATE_TYPES.map(ct => (
                          <option key={ct} value={ct}>{ct}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>FAA Certificate #</label>
                      <input
                        type="text"
                        value={holder.secondaryFaaCertificateNumber}
                        onChange={(e) => handleHolderChange(idx, 'secondaryFaaCertificateNumber', e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border text-sm"
                        style={{ borderColor: C.gray300 }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>IACRA FTN</label>
                      <input
                        type="text"
                        value={holder.secondaryIacraFtnNumber}
                        onChange={(e) => handleHolderChange(idx, 'secondaryIacraFtnNumber', e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border text-sm"
                        style={{ borderColor: C.gray300 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ═══ SECTION 4: AGENT LOGIN INFO ═══ */}
        <div style={{ borderTop: `1px solid ${C.gray200}`, paddingTop: '2rem' }}>
          <h3 className="text-lg font-black mb-4" style={{ color: C.dark }}>Agent Login Information</h3>
          <p className="text-sm mb-4" style={{ color: C.gray600 }}>
            These will be the login credentials for the airline. If left blank, primary contact info will be used.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>Point of Contact Email</label>
              <input
                type="email"
                name="pointOfContactEmail"
                value={formData.pointOfContactEmail}
                onChange={handleChange}
                placeholder="Leave blank to use primary email"
                className="w-full px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: C.gray300 }}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>Point of Contact Phone</label>
              <input
                type="tel"
                name="pointOfContactPhone"
                value={formData.pointOfContactPhone}
                onChange={handleChange}
                placeholder="Leave blank to use primary phone"
                className="w-full px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: C.gray300 }}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3" style={{ borderTop: `1px solid ${C.gray200}`, paddingTop: '2rem' }}>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 rounded-xl font-bold text-white transition-all duration-200"
            style={{
              background: loading ? C.gray400 : C.blue,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating...' : 'Create Airline Form'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}
