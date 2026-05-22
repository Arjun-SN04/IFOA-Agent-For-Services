import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAdminIndividualForm, importIndividualsFromExcel } from '../../services/api'

const C = {
  dark: '#0f172a',
  gray300: '#cbd5e1',
  gray600: '#475569',
  red: '#dc2626',
  blue: '#0000ff',
}

const PLAN_OPTIONS = [
  '1 Year Subscription Plan',
  'Multiple Years Subscription Plan',
  'Unlimited Plan',
]

const PAYMENT_OPTIONS = ['paid', 'pending', 'failed']
const PRIMARY_AIRMAN_OPTIONS = ['NEW', 'EXISTING']
const CERTIFICATE_OPTIONS = [
  'Part 65 - Aircraft Dispatcher',
  'Part 61 - Pilot',
  'Part 61 - Flight or Ground Instructor',
]

const initialForm = {
  subscriptionPlan: '1 Year Subscription Plan',
  multiYearCount: 3,
  price: '',
  totalServiceFees: '',
  status: 'Active',
  paymentStatus: 'paid',
  isPaid: true,
  invoiceStatus: 'Paid',
  invoiceNumber: '',

  firstName: '',
  lastName: '',
  middleName: '',
  dateOfBirth: '',

  addressLine1: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',

  phone: '',
  email: '',
  paymentEmail: '',

  primaryAirmanCertificate: 'EXISTING',
  primaryCertificate: 'Part 65 - Aircraft Dispatcher',
  faaCertificateNumber: '',
  iacraTrackingNumber: '',
  hasSecondaryCertificate: false,
  secondaryCertificate: '',
  secondaryFaaCertificateNumber: '',
  secondaryIacraTrackingNumber: '',

  agreedToTerms: true,
}

export default function AdminIndividualForm() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState('')

  const [excelFile, setExcelFile] = useState(null)
  const [excelLoading, setExcelLoading] = useState(false)
  const [excelResult, setExcelResult] = useState(null)
  const [excelError, setExcelError] = useState('')

  const set = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(null)

    try {
      const payload = {
        ...formData,
        multiYearCount: Number(formData.multiYearCount || 3),
        price: formData.price === '' ? undefined : Number(formData.price),
        totalServiceFees: formData.totalServiceFees === '' ? undefined : Number(formData.totalServiceFees),
      }

      const res = await createAdminIndividualForm(payload)
      setSuccess(res.data?.data || { message: 'Individual form created successfully.' })
      setFormData(initialForm)
      // Auto-navigate back to individuals tab after 3 seconds
      setTimeout(() => navigate('/admin/individuals'), 3000)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create individual form.')
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
      const res = await importIndividualsFromExcel(fd)
      setExcelResult(res.data?.data || null)
    } catch (err) {
      setExcelError(err?.response?.data?.message || 'Excel import failed.')
    } finally {
      setExcelLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-8 bg-white rounded-2xl shadow-lg" style={{ border: `1px solid ${C.gray300}` }}>
      <h2 className="text-3xl font-black mb-2" style={{ color: C.dark }}>
        Admin: Create Individual Form
      </h2>
      <p className="text-sm mb-8" style={{ color: C.gray600 }}>
        Add a single individual manually, or bulk import multiple individuals from an Excel sheet.
      </p>

      <div className="mb-8 rounded-xl border p-5" style={{ borderColor: C.gray300, background: '#f8fafc' }}>
        <p className="text-sm font-black mb-3" style={{ color: C.dark }}>Bulk Import From Excel</p>
        <p className="text-xs mb-3" style={{ color: C.gray600 }}>
          Accepted file: .xlsx or .xls. Use header names matching field keys (example: firstName, lastName, email, phone, dateOfBirth, subscriptionPlan, primaryCertificate).
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
            <p className="font-bold">Failed: {excelResult.failedCount} row(s)</p>
            {Array.isArray(excelResult.failed) && excelResult.failed.length > 0 && (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                {excelResult.failed.slice(0, 10).map((f, idx) => (
                  <p key={`ind-failed-${f.row || 'row'}-${idx}`}>Row {f.row}: {f.error}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {success && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
          <p style={{ color: '#166534' }} className="font-bold mb-1">Individual form created successfully.</p>
          {success?.loginCredentials && (
            <div className="text-sm" style={{ color: '#166534' }}>
              <p><strong>Login Email:</strong> {success.loginCredentials.email}</p>
              <p><strong>Password:</strong> {success.loginCredentials.password}</p>
            </div>
          )}
          <p className="text-xs mt-3 font-semibold" style={{ color: '#166534' }}>↩ Returning to Individuals list in 3 seconds…</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
          <p style={{ color: '#991b1b' }} className="font-bold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <h3 className="text-lg font-black mb-4" style={{ color: C.dark }}>Plan & Payment</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Field label="Subscription Plan">
              <select value={formData.subscriptionPlan} onChange={(e) => set('subscriptionPlan', e.target.value)} className="w-full px-4 py-2 rounded-xl border text-sm" style={{ borderColor: C.gray300 }}>
                {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Multi Year Count">
              <input type="number" min="2" value={formData.multiYearCount} onChange={(e) => set('multiYearCount', e.target.value)} className="w-full px-4 py-2 rounded-xl border text-sm" style={{ borderColor: C.gray300 }} />
            </Field>
            <Field label="Price (USD)">
              <input type="number" step="0.01" value={formData.price} onChange={(e) => set('price', e.target.value)} className="w-full px-4 py-2 rounded-xl border text-sm" style={{ borderColor: C.gray300 }} />
            </Field>
            <Field label="Total Service Fees">
              <input type="number" step="0.01" value={formData.totalServiceFees} onChange={(e) => set('totalServiceFees', e.target.value)} className="w-full px-4 py-2 rounded-xl border text-sm" style={{ borderColor: C.gray300 }} />
            </Field>
            <Field label="Status">
              <select value={formData.status} onChange={(e) => set('status', e.target.value)} className="w-full px-4 py-2 rounded-xl border text-sm" style={{ borderColor: C.gray300 }}>
                <option value="Pending">Pending</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </Field>
            <Field label="Payment Status">
              <select value={formData.paymentStatus} onChange={(e) => set('paymentStatus', e.target.value)} className="w-full px-4 py-2 rounded-xl border text-sm" style={{ borderColor: C.gray300 }}>
                {PAYMENT_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Invoice Status">
              <input type="text" value={formData.invoiceStatus} onChange={(e) => set('invoiceStatus', e.target.value)} className="w-full px-4 py-2 rounded-xl border text-sm" style={{ borderColor: C.gray300 }} />
            </Field>
            <Field label="Invoice Number">
              <input type="text" value={formData.invoiceNumber} onChange={(e) => set('invoiceNumber', e.target.value)} className="w-full px-4 py-2 rounded-xl border text-sm" style={{ borderColor: C.gray300 }} />
            </Field>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.gray300}`, paddingTop: '2rem' }}>
          <h3 className="text-lg font-black mb-4" style={{ color: C.dark }}>Personal Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <Field label="First Name"><input required value={formData.firstName} onChange={(e) => set('firstName', e.target.value)} className="input" style={inputStyle} /></Field>
            <Field label="Middle Name"><input value={formData.middleName} onChange={(e) => set('middleName', e.target.value)} className="input" style={inputStyle} /></Field>
            <Field label="Last Name"><input required value={formData.lastName} onChange={(e) => set('lastName', e.target.value)} className="input" style={inputStyle} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <Field label="Date of Birth"><input type="date" value={formData.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} className="input" style={inputStyle} /></Field>
            <Field label="Email"><input required type="email" value={formData.email} onChange={(e) => set('email', e.target.value)} className="input" style={inputStyle} /></Field>
            <Field label="Phone"><input required type="text" value={formData.phone} onChange={(e) => set('phone', e.target.value)} className="input" style={inputStyle} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Field label="Address Line 1"><input value={formData.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} className="input" style={inputStyle} /></Field>
            <Field label="City"><input value={formData.city} onChange={(e) => set('city', e.target.value)} className="input" style={inputStyle} /></Field>
            <Field label="State / Province"><input value={formData.state} onChange={(e) => set('state', e.target.value)} className="input" style={inputStyle} /></Field>
            <Field label="Postal Code"><input value={formData.postalCode} onChange={(e) => set('postalCode', e.target.value)} className="input" style={inputStyle} /></Field>
            <Field label="Country"><input value={formData.country} onChange={(e) => set('country', e.target.value)} className="input" style={inputStyle} /></Field>
            <Field label="Payment Email"><input type="email" value={formData.paymentEmail} onChange={(e) => set('paymentEmail', e.target.value)} className="input" style={inputStyle} /></Field>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.gray300}`, paddingTop: '2rem' }}>
          <h3 className="text-lg font-black mb-4" style={{ color: C.dark }}>Certificate Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Field label="Primary Airman Certificate">
              <select value={formData.primaryAirmanCertificate} onChange={(e) => set('primaryAirmanCertificate', e.target.value)} className="w-full px-4 py-2 rounded-xl border text-sm" style={{ borderColor: C.gray300 }}>
                {PRIMARY_AIRMAN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Primary Certificate">
              <select value={formData.primaryCertificate} onChange={(e) => set('primaryCertificate', e.target.value)} className="w-full px-4 py-2 rounded-xl border text-sm" style={{ borderColor: C.gray300 }}>
                {CERTIFICATE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="FAA Certificate Number"><input value={formData.faaCertificateNumber} onChange={(e) => set('faaCertificateNumber', e.target.value)} className="input" style={inputStyle} /></Field>
            <Field label="IACRA Tracking Number"><input value={formData.iacraTrackingNumber} onChange={(e) => set('iacraTrackingNumber', e.target.value)} className="input" style={inputStyle} /></Field>
          </div>

          <label className="inline-flex items-center gap-2 mb-3 cursor-pointer">
            <input type="checkbox" checked={formData.hasSecondaryCertificate} onChange={(e) => set('hasSecondaryCertificate', e.target.checked)} />
            <span className="text-sm font-semibold" style={{ color: C.dark }}>Has Secondary Certificate</span>
          </label>

          {formData.hasSecondaryCertificate && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Secondary Certificate">
                <select value={formData.secondaryCertificate} onChange={(e) => set('secondaryCertificate', e.target.value)} className="w-full px-4 py-2 rounded-xl border text-sm" style={{ borderColor: C.gray300 }}>
                  <option value="">-- Select --</option>
                  {CERTIFICATE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Secondary FAA Certificate Number"><input value={formData.secondaryFaaCertificateNumber} onChange={(e) => set('secondaryFaaCertificateNumber', e.target.value)} className="input" style={inputStyle} /></Field>
              <Field label="Secondary IACRA Tracking Number"><input value={formData.secondaryIacraTrackingNumber} onChange={(e) => set('secondaryIacraTrackingNumber', e.target.value)} className="input" style={inputStyle} /></Field>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition"
            style={{ background: C.blue }}
          >
            {loading ? 'Creating...' : 'Create Individual Form'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-bold mb-2" style={{ color: C.dark }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '0.5rem 1rem',
  borderRadius: '0.75rem',
  border: `1px solid ${C.gray300}`,
  fontSize: '0.875rem',
}
