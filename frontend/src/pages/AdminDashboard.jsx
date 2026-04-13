import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import DashboardLayout from '../components/layout/DashboardLayout'
import AdminAirlineForm from '../components/airlines/AdminAirlineForm'
import AdminIndividualForm from '../components/individual/AdminIndividualForm'
import { Plane } from 'lucide-react'
import { getAirlineTotal, fmtAirlineTotal } from '../utils/airlineTotal'
import {
  deleteAirlinesSubscription,
  deleteIndividual,
  exportAirlinesExcel,
  exportIndividualsExcel,
  getAllAirlinesSubscriptions,
  getAllIndividuals,
  getPaymentsByRegistration,
  savePaymentInvoiceDraft,
  updateAirlinesSubscription,
  updateIndividual,
  generateInvoiceNumber,
  getInvoiceByRegistration,
  saveInvoiceDraftToDoc,
} from '../services/api'

const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const fmtMoney = (v) =>
  v !== undefined && v !== null && v !== ''
    ? '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'

const hasExistingInvoice = (record) => {
  const paid = record?.isPaid === true || record?.paymentStatus === 'paid'
  return Boolean(record?.invoiceGenerated || paid)
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-slate-300'

const selectCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-slate-300'

function Badge({ value, type = 'payment', isPaid }) {
  let cls = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] '
  let label = value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Pending'

  if (type === 'status') {
    const trulyActive = value === 'Active' && isPaid !== false
    if (trulyActive)              { cls += 'bg-emerald-50 border-emerald-200 text-emerald-700' }
    else if (value === 'Pending') { cls += 'bg-amber-50 border-amber-200 text-amber-700' }
    else                          { cls += 'bg-slate-100 border-slate-200 text-slate-500' }
    if (value === 'Active' && isPaid === false) label = 'Pending'
  } else if (type === 'plan') {
    if (value?.includes('Unlimited'))     { cls += 'bg-indigo-50 border-indigo-200 text-indigo-700' }
    else if (value?.includes('Multiple')) { cls += 'bg-slate-100 border-slate-200 text-slate-700' }
    else                                  { cls += 'bg-slate-50 border-slate-200 text-slate-600' }
  } else if (type === 'isPaid') {
    if (isPaid === true) { cls += 'bg-emerald-50 border-emerald-200 text-emerald-700'; label = 'Paid' }
    else                 { cls += 'bg-amber-50 border-amber-200 text-amber-700'; label = 'Unpaid' }
  } else {
    const confirmedPaid = value === 'paid' && isPaid !== false
    if (confirmedPaid)           { cls += 'bg-emerald-50 border-emerald-200 text-emerald-700' }
    else if (value === 'failed') { cls += 'bg-red-50 border-red-200 text-red-600' }
    else                         { cls += 'bg-slate-100 border-slate-200 text-slate-600' }
    if (value === 'paid' && isPaid === false) label = 'Pending'
  }
  return <span className={cls}>{label}</span>
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      {children}
    </div>
  )
}

function ViewField({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <span className="text-sm text-slate-800 font-medium break-words">{value || '—'}</span>
    </div>
  )
}

function SectionHead({ label }) {
  return <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3 pt-1">{label}</p>
}

// ─── Individual View Modal ─────────────────────────────────────────────────────
function IndividualViewModal({ record, onClose, onEdit }) {
  const fullName = [record.firstName, record.middleName, record.lastName].filter(Boolean).join(' ') || 'Individual'
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-20">
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }}
          className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}>
          <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50 flex-shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Individual — Record</p>
              <h2 className="text-lg font-extrabold text-slate-900">{fullName}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" /></svg>
                Edit
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition">✕</button>
            </div>
          </div>
          <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
            <div><SectionHead label="Status & Subscription" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</span>
                  <Badge value={record.isPaid ? 'Active' : (record.status || 'Pending')} type="status" isPaid={record.isPaid} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Confirmed</span>
                  <Badge type="isPaid" isPaid={record.isPaid} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Status</span>
                  <Badge value={record.paymentStatus} isPaid={record.isPaid} />
                </div>
                <ViewField label="Invoice" value={record.invoiceStatus} />
                <ViewField label="Invoice #" value={record.invoiceNumber} />
                <ViewField label="Plan" value={record.subscriptionPlan} />
                <ViewField label="Subscription Date" value={record.subscriptionDate ? fmtDate(record.subscriptionDate) : (record.isPaid ? fmtDate(record.updatedAt) : 'Activates on payment')} />
                <ViewField label="Expiration Date" value={record.subscriptionPlan === 'Unlimited Plan' ? 'Never (Unlimited)' : record.expirationDate ? fmtDate(record.expirationDate) : record.isPaid ? '—' : 'Activates on payment'} />
                <ViewField label="Price" value={fmtMoney(record.price)} />
                <ViewField label="Service Fees" value={fmtMoney(record.totalServiceFees)} />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-5"><SectionHead label="Personal Information" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <ViewField label="First Name" value={record.firstName} />
                <ViewField label="Middle Name" value={record.middleName} />
                <ViewField label="Last Name" value={record.lastName} />
                <ViewField label="DOB" value={record.dateOfBirth ? fmtDate(record.dateOfBirth) : '—'} />
                <ViewField label="Email" value={record.email} />
                <ViewField label="Phone" value={record.phone} />
                <div className="col-span-2 sm:col-span-3">
                  <ViewField label="Address" value={[record.addressLine1, record.city, record.postalCode, record.country].filter(Boolean).join(', ')} />
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-5"><SectionHead label="FAA Certificate" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <ViewField label="Airman Cert" value={record.primaryAirmanCertificate} />
                <ViewField label="Cert Type" value={record.primaryCertificate} />
                <ViewField label="FAA Cert #" value={record.faaCertificateNumber} />
                <ViewField label="IACRA / FTN" value={record.iacraTrackingNumber} />
                {record.hasSecondaryCertificate && <>
                  <ViewField label="Secondary Cert Type" value={record.secondaryCertificate} />
                  <ViewField label="Secondary FAA #" value={record.secondaryFaaCertificateNumber} />
                  <ViewField label="Secondary IACRA FTN" value={record.secondaryIacraTrackingNumber} />
                </>}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-5"><SectionHead label="Payment & Invoice" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <ViewField label="Payment Email" value={record.paymentEmail} />
                <ViewField label="Invoice Number" value={record.invoiceNumber} />
                <ViewField label="Address Line 2" value={record.addressLine2} />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-5"><SectionHead label="Record Info" />
              <div className="grid grid-cols-2 gap-4">
                <ViewField label="Submitted" value={fmtDate(record.createdAt)} />
                <ViewField label="Updated" value={fmtDate(record.updatedAt)} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ─── Airline View Modal ────────────────────────────────────────────────────────
function AirlineViewModal({ record, onClose, onEdit }) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-20">
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }}
          className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}>
          <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50 flex-shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Airline — Record</p>
              <h2 className="text-lg font-extrabold text-slate-900">{record.airlineName || 'Airline'}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" /></svg>
                Edit
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition">✕</button>
            </div>
          </div>
          <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
            <div><SectionHead label="Status & Subscription" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</span><Badge value={record.isPaid ? 'Active' : (record.status || 'Pending')} type="status" isPaid={record.isPaid} /></div>
                <div className="flex flex-col gap-1"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Confirmed</span><Badge type="isPaid" isPaid={record.isPaid} /></div>
                <div className="flex flex-col gap-1"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment</span><Badge value={record.paymentStatus} isPaid={record.isPaid} /></div>
                <ViewField label="Invoice" value={record.invoiceStatus} />
                <ViewField label="Wire Request" value={record.wirePaymentRequested ? `Requested${record.wirePaymentRequestedAt ? ` on ${fmtDate(record.wirePaymentRequestedAt)}` : ''}` : 'No'} />
                <ViewField label="Invoice #" value={record.invoiceNumber} />
                <ViewField label="Plan" value={record.subscriptionPlan} />
                <ViewField label="Holder Count" value={record.holderCount} />
                <ViewField label="Exact Count" value={record.holderCountValue} />
                <ViewField label="Subscription Date" value={record.subscriptionDate ? fmtDate(record.subscriptionDate) : (record.isPaid ? fmtDate(record.updatedAt) : 'Activates on payment')} />
                <ViewField label="Expiration Date" value={record.subscriptionPlan === 'Unlimited Plan' ? 'Never (Unlimited)' : record.expirationDate ? fmtDate(record.expirationDate) : record.isPaid ? '—' : 'Activates on payment'} />
                <ViewField label="Price/Cert" value={fmtMoney(record.pricePerCertificate ?? record.pricePerCert)} />
                <ViewField label="Total Fees" value={fmtAirlineTotal(record)} />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-5"><SectionHead label="Airline / Operator" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="col-span-2 sm:col-span-3"><ViewField label="Company" value={record.airlineName} /></div>
                <div className="col-span-2 sm:col-span-3"><ViewField label="Address" value={[record.addressLine1, record.addressLine2, record.city, record.state, record.postalCode, record.country].filter(Boolean).join(', ')} /></div>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-5"><SectionHead label="Point of Contact" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <ViewField label="First Name" value={record.firstName || record.contactFirstName} />
                <ViewField label="Last Name" value={record.lastName || record.contactLastName} />
                <ViewField label="Middle Name" value={record.middleName} />
                <ViewField label="Date of Birth" value={record.dateOfBirth ? fmtDate(record.dateOfBirth) : '—'} />
                <ViewField label="Email" value={record.email || record.contactEmail} />
                <ViewField label="Phone" value={record.phone || record.contactPhone} />
                <ViewField label="Payment Email" value={record.paymentEmail} />
              </div>
            </div>
            {record.certificateHolders?.length > 0 && (
              <div className="border-t border-slate-100 pt-5">
                <SectionHead label={`Certificate Holders (${record.certificateHolders.length})`} />
                <div className="space-y-3">
                  {record.certificateHolders.map((h, i) => (
                    <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">Holder #{i + 1}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <ViewField label="Full Name" value={h.fullName} />
                        <ViewField label="Date of Birth" value={h.dateOfBirth ? fmtDate(h.dateOfBirth) : '—'} />
                        <ViewField label="Certificate Type" value={h.certificateType} />
                        <ViewField label="Status" value={h.certificateStatus} />
                        <ViewField label="FAA Cert #" value={h.faaCertificateNumber} />
                        <ViewField label="IACRA FTN #" value={h.iacraFtnNumber} />
                        <ViewField label="Email" value={h.email} />
                        {h.hasSecondaryCertificate && <>
                          <ViewField label="Secondary Cert Type" value={h.secondaryCertificateType} />
                          <ViewField label="Secondary FAA #" value={h.secondaryFaaCertificateNumber} />
                          <ViewField label="Secondary IACRA FTN" value={h.secondaryIacraFtnNumber} />
                        </>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t border-slate-100 pt-5"><SectionHead label="Record Info" />
              <div className="grid grid-cols-2 gap-4">
                <ViewField label="Submitted" value={fmtDate(record.createdAt)} />
                <ViewField label="Updated" value={fmtDate(record.updatedAt)} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ─── Individual Edit Modal ─────────────────────────────────────────────────────
function IndividualEditModal({ record, onClose, onSave, saving }) {
  const [form, setForm] = useState({ ...record })
  const [err, setErr] = useState('')
  useEffect(() => { setForm({ ...record }); setErr('') }, [record])
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  const handleSave = async () => {
    try { setErr(''); await onSave(record._id, form); onClose() }
    catch (e) { setErr(e?.response?.data?.message || 'Save failed.') }
  }
  const fullName = [record.firstName, record.middleName, record.lastName].filter(Boolean).join(' ') || 'Individual'
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-20 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }}
          className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-8"
          onClick={e => e.stopPropagation()}>
          <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Edit Individual</p>
              <h2 className="text-lg font-extrabold text-slate-900">{fullName}</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition">✕</button>
          </div>
          <div className="px-6 py-5 space-y-6 max-h-[68vh] overflow-y-auto">
            {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
            <div><SectionHead label="Status & Subscription" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Status"><select className={selectCls} value={form.status || 'Pending'} onChange={e => set('status', e.target.value)}><option>Pending</option><option>Active</option><option>Inactive</option></select></Field>
                <Field label="Subscription Plan"><select className={selectCls} value={form.subscriptionPlan || ''} onChange={e => set('subscriptionPlan', e.target.value)}><option value="1 Year Subscription Plan">1 Year</option><option value="Multiple Years Subscription Plan">Multiple Years</option><option value="Unlimited Plan">Unlimited</option></select></Field>
                <Field label="Subscription Date"><input className={inputCls} type="date" value={form.subscriptionDate ? String(form.subscriptionDate).slice(0,10) : ''} onChange={e => set('subscriptionDate', e.target.value)} /></Field>
                <Field label="Expiration Date"><input className={inputCls} type="date" value={form.expirationDate ? String(form.expirationDate).slice(0,10) : ''} onChange={e => set('expirationDate', e.target.value)} /></Field>
                <Field label="Price (USD)"><input className={inputCls} type="number" step="0.01" min="0" value={form.price ?? ''} onChange={e => set('price', parseFloat(e.target.value))} /></Field>
                <Field label="Total Service Fees"><input className={inputCls} type="number" step="0.01" min="0" value={form.totalServiceFees ?? ''} onChange={e => set('totalServiceFees', parseFloat(e.target.value))} /></Field>
              </div>
            </div>
            <div><SectionHead label="Personal Information" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="First Name"><input className={inputCls} value={form.firstName || ''} onChange={e => set('firstName', e.target.value)} /></Field>
                <Field label="Last Name"><input className={inputCls} value={form.lastName || ''} onChange={e => set('lastName', e.target.value)} /></Field>
                <Field label="Middle Name"><input className={inputCls} value={form.middleName || ''} onChange={e => set('middleName', e.target.value)} /></Field>
                <Field label="Date of Birth"><input className={inputCls} type="date" value={form.dateOfBirth ? String(form.dateOfBirth).slice(0,10) : ''} onChange={e => set('dateOfBirth', e.target.value)} /></Field>
                <Field label="Email"><input className={inputCls} type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} /></Field>
                <Field label="Phone"><input className={inputCls} value={form.phone || ''} onChange={e => set('phone', e.target.value)} /></Field>
                <div className="sm:col-span-2"><Field label="Address Line 1"><input className={inputCls} value={form.addressLine1 || ''} onChange={e => set('addressLine1', e.target.value)} /></Field></div>
                <div className="sm:col-span-2"><Field label="Address Line 2"><input className={inputCls} placeholder="Apt, suite, unit, etc." value={form.addressLine2 || ''} onChange={e => set('addressLine2', e.target.value)} /></Field></div>
                <Field label="City"><input className={inputCls} value={form.city || ''} onChange={e => set('city', e.target.value)} /></Field>
                <Field label="State / Province"><input className={inputCls} value={form.state || ''} onChange={e => set('state', e.target.value)} /></Field>
                <Field label="Postal Code"><input className={inputCls} value={form.postalCode || ''} onChange={e => set('postalCode', e.target.value)} /></Field>
                <Field label="Country"><input className={inputCls} value={form.country || ''} onChange={e => set('country', e.target.value)} /></Field>
                <div className="sm:col-span-2"><Field label="Payment Email"><input className={inputCls} type="email" placeholder="billing@email.com" value={form.paymentEmail || ''} onChange={e => set('paymentEmail', e.target.value)} /></Field></div>
              </div>
            </div>
            <div><SectionHead label="FAA Certificate" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Airman Certificate"><select className={selectCls} value={form.primaryAirmanCertificate || ''} onChange={e => set('primaryAirmanCertificate', e.target.value)}><option value="">— Select —</option><option value="NEW">NEW</option><option value="EXISTING">EXISTING</option></select></Field>
                <Field label="Certificate Type"><select className={selectCls} value={form.primaryCertificate || ''} onChange={e => set('primaryCertificate', e.target.value)}><option value="">— Select —</option><option value="Part 61 - Pilot">Part 61 - Pilot</option><option value="Part 61 - Flight or Ground Instructor">Part 61 - Instructor</option><option value="Part 65 - Aircraft Dispatcher">Part 65 - Dispatcher</option></select></Field>
                <Field label="FAA Certificate #"><input className={inputCls} value={form.faaCertificateNumber || ''} onChange={e => set('faaCertificateNumber', e.target.value)} /></Field>
                <Field label="IACRA / FTN"><input className={inputCls} value={form.iacraTrackingNumber || ''} onChange={e => set('iacraTrackingNumber', e.target.value)} /></Field>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${form.hasSecondaryCertificate ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
                      onClick={() => set('hasSecondaryCertificate', !form.hasSecondaryCertificate)}>
                      {form.hasSecondaryCertificate && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Has secondary certificate</span>
                  </label>
                  {form.hasSecondaryCertificate && (
                    <div className="grid sm:grid-cols-2 gap-3 ml-2 pl-4 border-l-2 border-blue-200">
                      <Field label="Secondary Cert Type"><select className={selectCls} value={form.secondaryCertificate || ''} onChange={e => set('secondaryCertificate', e.target.value)}><option value="">— Select —</option><option value="Part 61 - Pilot">Part 61 - Pilot</option><option value="Part 61 - Flight or Ground Instructor">Part 61 - Instructor</option><option value="Part 65 - Aircraft Dispatcher">Part 65 - Dispatcher</option></select></Field>
                      <Field label="Secondary FAA Cert #"><input className={inputCls} value={form.secondaryFaaCertificateNumber || ''} onChange={e => set('secondaryFaaCertificateNumber', e.target.value)} /></Field>
                      <Field label="Secondary IACRA FTN #"><input className={inputCls} value={form.secondaryIacraTrackingNumber || ''} onChange={e => set('secondaryIacraTrackingNumber', e.target.value)} /></Field>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div><SectionHead label="Payment & Invoice" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Payment Confirmed (isPaid)">
                  <select className={selectCls} value={String(form.isPaid === true)} onChange={e => {
                    const paid = e.target.value === 'true'
                    set('isPaid', paid)
                    if (paid) { set('paymentStatus', 'paid'); set('status', 'Active') }
                    else { set('paymentStatus', 'pending'); set('status', 'Pending') }
                  }}>
                    <option value="false">Not Confirmed (Unpaid)</option>
                    <option value="true">Confirmed (Paid)</option>
                  </select>
                </Field>
                <Field label="Payment Status"><select className={selectCls} value={form.paymentStatus || 'pending'} onChange={e => set('paymentStatus', e.target.value)}><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option></select></Field>
                <Field label="Invoice Status"><select className={selectCls} value={form.invoiceStatus || ''} onChange={e => set('invoiceStatus', e.target.value)}><option value="">— Select —</option><option value="Paid">Paid</option><option value="Pending">Pending</option><option value="Overdue">Overdue</option><option value="Cancelled">Cancelled</option></select></Field>
                <Field label="Invoice Number"><input className={inputCls} value={form.invoiceNumber || ''} onChange={e => set('invoiceNumber', e.target.value)} /></Field>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50">
              {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ─── Airline Edit Modal ────────────────────────────────────────────────────────
function AirlineEditModal({ record, onClose, onSave, saving }) {
  const [form, setForm] = useState({ ...record })
  const [err, setErr] = useState('')
  useEffect(() => { setForm({ ...record }); setErr('') }, [record])
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  const setHolder = (idx, field, value) =>
    setForm(p => ({ ...p, certificateHolders: p.certificateHolders.map((h, i) => i === idx ? { ...h, [field]: value } : h) }))
  const handleSave = async () => {
    try { setErr(''); await onSave(record._id, form); onClose() }
    catch (e) { setErr(e?.response?.data?.message || 'Save failed.') }
  }
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-20 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }}
          className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-8"
          onClick={e => e.stopPropagation()}>
          <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Edit Airline</p>
              <h2 className="text-lg font-extrabold text-slate-900">{record.airlineName || 'Airline'}</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition">✕</button>
          </div>
          <div className="px-6 py-5 space-y-6 max-h-[68vh] overflow-y-auto">
            {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
            <div><SectionHead label="Status & Subscription" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Status"><select className={selectCls} value={form.status || 'Pending'} onChange={e => set('status', e.target.value)}><option>Pending</option><option>Active</option><option>Inactive</option></select></Field>
                <Field label="Subscription Plan"><select className={selectCls} value={form.subscriptionPlan || ''} onChange={e => set('subscriptionPlan', e.target.value)}><option value="1 Year Subscription Plan">1 Year</option><option value="Multiple Years Subscription Plan">Multiple Years</option><option value="Unlimited Plan">Unlimited</option></select></Field>
                <Field label="Subscription Date"><input className={inputCls} type="date" value={form.subscriptionDate ? String(form.subscriptionDate).slice(0,10) : ''} onChange={e => set('subscriptionDate', e.target.value)} /></Field>
                <Field label="Expiration Date"><input className={inputCls} type="date" value={form.expirationDate ? String(form.expirationDate).slice(0,10) : ''} onChange={e => set('expirationDate', e.target.value)} /></Field>
                <Field label="Holder Count Range"><input className={inputCls} placeholder="e.g. 3 to 5" value={form.holderCount || ''} onChange={e => set('holderCount', e.target.value)} /></Field>
                <Field label="Exact Holder Count"><input className={inputCls} type="number" min="1" value={form.holderCountValue || ''} onChange={e => set('holderCountValue', e.target.value)} /></Field>
                <Field label="Price/Cert (USD)"><input className={inputCls} type="number" step="0.01" min="0" value={form.pricePerCertificate ?? form.pricePerCert ?? ''} onChange={e => set('pricePerCertificate', parseFloat(e.target.value))} /></Field>
                <Field label="Total Fees (USD)"><input className={inputCls} type="number" step="0.01" min="0" value={form.totalServiceFees ?? form.totalAmount ?? ''} onChange={e => set('totalServiceFees', parseFloat(e.target.value))} /></Field>
              </div>
            </div>
            <div><SectionHead label="Airline / Operator" />
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><Field label="Company Name"><input className={inputCls} value={form.airlineName || ''} onChange={e => set('airlineName', e.target.value)} /></Field></div>
                <div className="sm:col-span-2"><Field label="Address Line 1"><input className={inputCls} value={form.addressLine1 || ''} onChange={e => set('addressLine1', e.target.value)} /></Field></div>
                <div className="sm:col-span-2"><Field label="Address Line 2"><input className={inputCls} placeholder="Suite, floor, unit, etc." value={form.addressLine2 || ''} onChange={e => set('addressLine2', e.target.value)} /></Field></div>
                <Field label="City"><input className={inputCls} value={form.city || ''} onChange={e => set('city', e.target.value)} /></Field>
                <Field label="State / Province"><input className={inputCls} value={form.state || ''} onChange={e => set('state', e.target.value)} /></Field>
                <Field label="Postal Code"><input className={inputCls} value={form.postalCode || ''} onChange={e => set('postalCode', e.target.value)} /></Field>
                <Field label="Country"><input className={inputCls} value={form.country || ''} onChange={e => set('country', e.target.value)} /></Field>
              </div>
            </div>
            <div><SectionHead label="Point of Contact" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="First Name"><input className={inputCls} value={form.firstName || form.contactFirstName || ''} onChange={e => set('firstName', e.target.value)} /></Field>
                <Field label="Last Name"><input className={inputCls} value={form.lastName || form.contactLastName || ''} onChange={e => set('lastName', e.target.value)} /></Field>
                <Field label="Middle Name"><input className={inputCls} value={form.middleName || ''} onChange={e => set('middleName', e.target.value)} /></Field>
                <Field label="Date of Birth"><input className={inputCls} type="date" value={form.dateOfBirth ? String(form.dateOfBirth).slice(0,10) : ''} onChange={e => set('dateOfBirth', e.target.value)} /></Field>
                <Field label="Email"><input className={inputCls} type="email" value={form.email || form.contactEmail || ''} onChange={e => set('email', e.target.value)} /></Field>
                <Field label="Phone"><input className={inputCls} value={form.phone || form.contactPhone || ''} onChange={e => set('phone', e.target.value)} /></Field>
                <div className="sm:col-span-2"><Field label="Payment Email"><input className={inputCls} type="email" placeholder="billing@email.com" value={form.paymentEmail || ''} onChange={e => set('paymentEmail', e.target.value)} /></Field></div>
              </div>
            </div>
            {form.certificateHolders?.length > 0 && (
              <div><SectionHead label={`Certificate Holders (${form.certificateHolders.length})`} />
                <div className="space-y-4">
                  {form.certificateHolders.map((h, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">Holder #{idx + 1}</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Field label="Full Name"><input className={inputCls} value={h.fullName || ''} onChange={e => setHolder(idx, 'fullName', e.target.value)} /></Field>
                        <Field label="Date of Birth"><input className={inputCls} type="date" value={h.dateOfBirth ? String(h.dateOfBirth).slice(0,10) : ''} onChange={e => setHolder(idx, 'dateOfBirth', e.target.value)} /></Field>
                        <Field label="Certificate Type"><select className={selectCls} value={h.certificateType || ''} onChange={e => setHolder(idx, 'certificateType', e.target.value)}><option value="">— Select —</option><option value="Part 61 - Pilot">Part 61 - Pilot</option><option value="Part 61 - Flight or Ground Instructor">Part 61 - Instructor</option><option value="Part 65 - Aircraft Dispatcher">Part 65 - Dispatcher</option></select></Field>
                        <Field label="Certificate Status"><select className={selectCls} value={h.certificateStatus || ''} onChange={e => setHolder(idx, 'certificateStatus', e.target.value)}><option value="">— Select —</option><option value="NEW">NEW</option><option value="EXISTING">EXISTING</option></select></Field>
                        <Field label="FAA Certificate #"><input className={inputCls} value={h.faaCertificateNumber || ''} onChange={e => setHolder(idx, 'faaCertificateNumber', e.target.value)} /></Field>
                        <Field label="IACRA FTN #"><input className={inputCls} value={h.iacraFtnNumber || ''} onChange={e => setHolder(idx, 'iacraFtnNumber', e.target.value)} /></Field>
                        <div className="sm:col-span-2"><Field label="Email"><input className={inputCls} type="email" placeholder="holder@example.com" value={h.email || ''} onChange={e => setHolder(idx, 'email', e.target.value)} /></Field></div>
                        <div className="sm:col-span-2">
                          <label className="flex items-center gap-2 cursor-pointer mb-3">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${h.hasSecondaryCertificate ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
                              onClick={() => setHolder(idx, 'hasSecondaryCertificate', !h.hasSecondaryCertificate)}>
                              {h.hasSecondaryCertificate && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <span className="text-xs font-semibold text-slate-700">Has secondary certificate</span>
                          </label>
                          {h.hasSecondaryCertificate && (
                            <div className="grid sm:grid-cols-2 gap-3 ml-2 pl-4 border-l-2 border-blue-200">
                              <Field label="Secondary Cert Type"><select className={selectCls} value={h.secondaryCertificateType || ''} onChange={e => setHolder(idx, 'secondaryCertificateType', e.target.value)}><option value="">— Select —</option><option value="Part 61 - Pilot">Part 61 - Pilot</option><option value="Part 61 - Flight or Ground Instructor">Part 61 - Instructor</option><option value="Part 65 - Aircraft Dispatcher">Part 65 - Dispatcher</option></select></Field>
                              <Field label="Secondary FAA Cert #"><input className={inputCls} value={h.secondaryFaaCertificateNumber || ''} onChange={e => setHolder(idx, 'secondaryFaaCertificateNumber', e.target.value)} /></Field>
                              <Field label="Secondary IACRA FTN #"><input className={inputCls} value={h.secondaryIacraFtnNumber || ''} onChange={e => setHolder(idx, 'secondaryIacraFtnNumber', e.target.value)} /></Field>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div><SectionHead label="Payment & Invoice" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Payment Confirmed (isPaid)">
                  <select className={selectCls} value={String(form.isPaid === true)} onChange={e => {
                    const paid = e.target.value === 'true'
                    set('isPaid', paid)
                    if (paid) { set('paymentStatus', 'paid'); set('status', 'Active') }
                    else { set('paymentStatus', 'pending'); set('status', 'Pending') }
                  }}>
                    <option value="false">Not Confirmed (Unpaid)</option>
                    <option value="true">Confirmed (Paid)</option>
                  </select>
                </Field>
                <Field label="Payment Status"><select className={selectCls} value={form.paymentStatus || 'pending'} onChange={e => set('paymentStatus', e.target.value)}><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option></select></Field>
                <Field label="Invoice Status"><select className={selectCls} value={form.invoiceStatus || ''} onChange={e => set('invoiceStatus', e.target.value)}><option value="">— Select —</option><option value="Paid">Paid</option><option value="Pending">Pending</option><option value="Overdue">Overdue</option><option value="Cancelled">Cancelled</option></select></Field>
                <Field label="Invoice Number"><input className={inputCls} value={form.invoiceNumber || ''} onChange={e => set('invoiceNumber', e.target.value)} /></Field>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50">
              {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ─── IFOA PDF Invoice Generator ────────────────────────────────────────────────
function hex(h) {
  const n = parseInt(h.replace('#', ''), 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

const BACKEND_LOGO_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  .replace('/api', '') + '/assets/IFOA_USA_white.png'

// Returns { url, filename } — caller decides whether to preview or download
async function generateIFOAInvoicePDF(inv) {
  const RED    = hex('#c0392b')
  const DARK   = hex('#0f172a')
  const MID    = hex('#475569')
  const MUTED  = hex('#94a3b8')
  const LGRAY  = hex('#f1f5f9')
  const BORDER = hex('#cbd5e1')
  const WHITE  = rgb(1, 1, 1)

  const pdfDoc = await PDFDocument.create()
  const page   = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()
  const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const ML = 50, MR = 50
  const W  = width - ML - MR
  let Y    = height - 40

  const txt = (str, x, y, { size = 9, font = fontReg, color = DARK, maxWidth } = {}) => {
    const opts = { x, y, size, font, color }
    if (maxWidth) opts.maxWidth = maxWidth
    page.drawText(String(str ?? '—'), opts)
  }
  const txtR = (str, rx, y, { size = 9, font = fontReg, color = DARK } = {}) => {
    const w = font.widthOfTextAtSize(String(str ?? ''), size)
    page.drawText(String(str ?? ''), { x: rx - w, y, size, font, color })
  }
  const line = (x1, y1, x2, y2, color = BORDER, thickness = 0.5) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color })
  const rect = (x, y, w, h, color) =>
    page.drawRectangle({ x, y, width: w, height: h, color })

  const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') : '—'
  const fmtM = (n) => n != null ? Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

  const LOGO_H       = 52
  const LOGO_AREA_W  = 130
  const BAND_H       = LOGO_H + 20
  const BAND_W       = LOGO_AREA_W + 28
  const BAND_X       = width - MR - BAND_W
  const BAND_Y       = height - BAND_H - 8

  let logoImage = null
  let logoDims  = { width: 0, height: 0 }
  try {
    const resp = await fetch(BACKEND_LOGO_URL, { cache: 'no-store' })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const arrBuf = await resp.arrayBuffer()
    logoImage    = await pdfDoc.embedPng(arrBuf)
    const raw    = logoImage.scale(1)
    const scale  = Math.min(LOGO_H / raw.height, LOGO_AREA_W / raw.width)
    logoDims     = { width: raw.width * scale, height: raw.height * scale }
  } catch (_) {}

  if (logoImage) {
    const logoX = BAND_X + (BAND_W - logoDims.width) / 2
    const logoY = BAND_Y + (BAND_H - logoDims.height) / 2
    page.drawImage(logoImage, { x: logoX, y: logoY, width: logoDims.width, height: logoDims.height })
  } else {
    txt('IFOA', BAND_X + 18, BAND_Y + BAND_H - 28, { size: 22, font: fontBold, color: DARK })
    txt('* USA *', BAND_X + 18, BAND_Y + BAND_H - 44, { size: 10, font: fontBold, color: RED })
  }

  Y -= 60
  txt('IFOA USA Corporation, 1616 Concierge Blvd, Suite 100 (1st Floor), Daytona Beach, FL 32117, USA', ML, Y, { size: 7.5, color: MID, maxWidth: W })
  Y -= 8
  line(ML, Y, ML + W, Y, BORDER, 0.5)
  Y -= 20

  txt(inv.recipientCompany || inv.recipientName, ML, Y, { size: 10, font: fontBold })
  Y -= 14
  txt(inv.recipientContact || '', ML, Y, { size: 9, color: MID })
  Y -= 12
  txt(inv.recipientAddress1 || '', ML, Y, { size: 9, color: MID })
  Y -= 12
  txt(inv.recipientAddress2 || '', ML, Y, { size: 9, color: MID })
  Y -= 12
  txt(inv.recipientCountry || '', ML, Y, { size: 9, color: MID })
  Y -= 26

  // Strip leading "Invoice " prefix if already present in the invoice number
  // to avoid rendering "Invoice Invoice US-6-26"
  const rawInvoiceNumber = String(inv.invoiceNumber || '')
  const displayInvoiceNumber = rawInvoiceNumber.replace(/^Invoice\s+/i, '')

  txt(displayInvoiceNumber, ML, Y, { size: 12, font: fontBold })
  Y -= 8
  line(ML, Y, ML + W, Y, RED, 1.5)
  Y -= 14

  txt('US Agent for Service', ML, Y, { size: 10, font: fontBold })
  Y -= 7
  line(ML, Y, ML + W, Y, BORDER, 0.4)
  Y -= 14

  txt('date:', ML, Y, { size: 8, color: MID })
  txt(fmtD(inv.issueDate), ML + 60, Y, { size: 8 })
  txt('payable by:', ML + 220, Y, { size: 8, color: MID })
  txt(fmtD(inv.payableBy), ML + 300, Y, { size: 8 })
  Y -= 6
  line(ML, Y, ML + W, Y, BORDER, 0.4)
  Y -= 26

  txt('Dear ' + (inv.recipientContact || inv.recipientName) + ',', ML, Y, { size: 9 })
  Y -= 16
  txt('Thank you for your Business. Your invoice is as follows:', ML, Y, { size: 9 })
  Y -= 28

  const C = { pos: ML, desc: ML + 28, qty: ML + W - 170, unit: ML + W - 100, total: ML + W }
  const TH_Y = Y
  const TH_H = 16
  rect(ML, TH_Y - TH_H + 4, W, TH_H, LGRAY)
  txt('Pos.',          C.pos,  TH_Y - 8, { size: 8, font: fontBold })
  txt('Description',  C.desc, TH_Y - 8, { size: 8, font: fontBold })
  txt('Quantity',     C.qty,  TH_Y - 8, { size: 8, font: fontBold })
  txt('Unit Price',   C.unit, TH_Y - 8, { size: 8, font: fontBold })
  txtR('Total Price USD', C.total, TH_Y - 8, { size: 8, font: fontBold })
  Y = TH_Y - TH_H - 2
  line(ML, Y, ML + W, Y, BORDER, 0.4)
  Y -= 12

  const items = inv.lineItems || []
  items.forEach((item, i) => {
    const rowY = Y
    txt(String(i + 1), C.pos, rowY, { size: 9 })
    txt(item.description, C.desc, rowY, { size: 9, maxWidth: C.qty - C.desc - 10 })
    txt(String(item.quantity), C.qty, rowY, { size: 9 })
    txtR(fmtM(item.unitPrice), C.unit + 50, rowY, { size: 9 })
    txtR(fmtM(item.totalPrice), C.total, rowY, { size: 9 })
    Y -= 18
  })

  Y -= 8
  line(ML, Y, ML + W, Y, RED, 1.5)
  Y -= 14

  const totalAmt = items.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0)
  txt('Invoice Sum Tax-Exempt', C.desc, Y, { size: 9, font: fontBold })
  txtR(fmtM(totalAmt), C.total, Y, { size: 9, font: fontBold })
  Y -= 8
  line(ML, Y, ML + W, Y, RED, 1.5)
  Y -= 30

  const notes = [
    '1. Payment is due within 30 days',
    '2. Please note the invoice number in your payment method',
    '3. Please make a payment into our Bank Account, as mentioned in the Footer.',
  ]
  notes.forEach(note => { txt(note, ML, Y, { size: 8.5, color: DARK }); Y -= 14 })
  Y -= 14

  txt('Do you have any questions? Get in touch with us.', ML, Y, { size: 9 })
  Y -= 22
  txt('Kind regards', ML, Y, { size: 9 })
  Y -= 13
  txt('Your Agent for Service Team', ML, Y, { size: 9 })

  const FY = 48
  line(ML, FY + 18, ML + W, FY + 18, BORDER, 0.5)
  const footerText = 'Bank:  Bank of America     Account owner:  IFOA USA Corp     SWIFT:  BOFAUS3N     Account:  8981 5632 1560'
  const ftw = fontReg.widthOfTextAtSize(footerText, 7.5)
  const footer2 = 'Email:  agent@theifoa.com     Mobile:  +1 508 838 5880     Website:  theifoa.com'
  const ft2w = fontReg.widthOfTextAtSize(footer2, 7)
  page.drawText(footer2, { x: (width - ft2w) / 2, y: FY - 3, size: 7, font: fontReg, color: MUTED })

  const pdfBytes = await pdfDoc.save()
  const blob     = new Blob([pdfBytes], { type: 'application/pdf' })
  const url      = URL.createObjectURL(blob)
  return { url, filename: `Invoice-${inv.invoiceNumber}.pdf` }
}

// ─── Helper: download a blob URL ───────────────────────────────────────────────
function triggerDownload({ url, filename }) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ─── Helper: open blob URL as preview in new tab ───────────────────────────────
// Note: No longer used — preview shown in modal instead
// function openPreview({ url }) {
//   window.open(url, '_blank', 'noopener,noreferrer')
//   setTimeout(() => URL.revokeObjectURL(url), 30000)
// }

// ─── Admin Invoice Modal ───────────────────────────────────────────────────────
// initialStep: 'select' (default) | 'edit'  — which step to open at
// autoPreview: if true, generates and opens the PDF preview immediately on mount
// previewOnly: if true, only shows preview modal (for existing invoices)
function AdminInvoiceModal({ record, type, onClose, onSaveInvoice, initialStep = 'select', autoPreview = false, previewOnly = false }) {
  const isAirline = type === 'airline'
  const today = new Date()
  const payable = new Date(today); payable.setDate(payable.getDate() + 30)
  const fmtInput = (d) => d ? new Date(d).toISOString().slice(0, 10) : ''

  // Invoice number: prefer existing DB number, otherwise fetch a fresh unique one
  // from the server (format: "Invoice US-350-26"). Never use a random placeholder.
  const [fetchedInvoiceNumber, setFetchedInvoiceNumber] = React.useState(record.invoiceNumber || '')
  React.useEffect(() => {
    if (!record.invoiceNumber) {
      generateInvoiceNumber()
        .then(r => { if (r.data?.invoiceNumber) setFetchedInvoiceNumber(r.data.invoiceNumber) })
        .catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const defaultInvoiceNumber = fetchedInvoiceNumber
  const holderCount = Number(
    record.committedCount || record.holderCountValue || record.certificateHolders?.length || 1
  ) || 1
  const pricePerCert = Number(record.pricePerCertificate || record.pricePerCert || (isAirline ? 49 : 0))
  const paidConfirmed = record?.isPaid === true || record?.paymentStatus === 'paid'

  const fallbackTotal = isAirline
    ? Number(record.totalAmount ?? (pricePerCert * holderCount) ?? 0)
    : Number(record.price || record.totalServiceFees || 0)

  // For airlines, always compute total as pricePerCert × holderCount.
  // totalAmount in DB may have been stored with old flat-rate logic for Unlimited plan,
  // so recompute it to ensure correctness.
  const computedAirlineTotal = isAirline ? (pricePerCert * holderCount) : 0

  // Always trust confirmed paid totals first to prevent under-billing invoices.
  const paidTotal = Number(
    record.amountPaid || record.totalAmount || record.price || record.totalServiceFees || 0
  )

  const totalAmt = isAirline
    ? (paidConfirmed && paidTotal > 0 ? Math.max(paidTotal, computedAirlineTotal) : computedAirlineTotal)
    : (paidConfirmed && paidTotal > 0 ? paidTotal : fallbackTotal)
  const unitPrice = isAirline ? Number((totalAmt / holderCount).toFixed(2)) : totalAmt
  const planDesc     = `Agent For Service – ${(record.subscriptionPlan || '1 Year Plan').replace(' Subscription Plan','').replace(' Plan','')}`

  // Prefer saved invoiceDraft payment method; otherwise infer from payment record.
  // For airlines, default to wire only when a wire request exists.
  const paidByCard = record?.paymentMethodType === 'card' || Boolean(record?.stripePaymentIntentId)
  const wireRequested = Boolean(record?.wirePaymentRequested || record?.invoiceStatus === 'Wire Requested')
  const defaultPaymentMethod = record?.invoiceDraft?.paymentMethod || (isAirline ? (wireRequested ? 'wire' : 'card') : 'card')

  const [paymentMethodSel, setPaymentMethodSel] = useState(
    initialStep === 'edit' ? defaultPaymentMethod : ''
  )
  const [step, setStep] = useState(initialStep)
  const autoPreviewFired = useRef(false)
  const [savingInvoice, setSavingInvoice] = useState(false)

  // ── State for preview modal ────────────────────────────────────────────────────
  const [previewData, setPreviewData] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const initialInvoice = {
    invoiceNumber:     defaultInvoiceNumber,
    issueDate:         fmtInput(today),
    payableBy:         fmtInput(payable),
    recipientCompany:  isAirline ? (record.airlineName || '') : '',
    recipientName:     [record.firstName, record.lastName].filter(Boolean).join(' ') || record.airlineName || '',
    recipientContact:  [record.firstName, record.lastName].filter(Boolean).join(' '),
    recipientAddress1: record.addressLine1 || '',
    recipientAddress2: [record.city, record.state, record.postalCode].filter(Boolean).join(' '),
    recipientCountry:  record.country || '',
    paymentMethod:     initialStep === 'edit' ? defaultPaymentMethod : '',
    lineItems: [
      {
        description: planDesc,
        quantity:    isAirline ? holderCount : 1,
        unitPrice:   isAirline ? unitPrice : totalAmt,
        totalPrice:  totalAmt,
      }
    ],
  }

  // If the admin has previously saved a draft, ALWAYS use the draft line items verbatim.
  // The draft represents admin's deliberate edits and is the source of truth.
  // Only fall back to subscription-computed lineItems when there is no saved draft at all.
  const draftItems = Array.isArray(record.invoiceDraft?.lineItems) ? record.invoiceDraft.lineItems : []
  const hasSavedDraft = draftItems.length > 0

  const mergedInvoice = {
    ...initialInvoice,
    ...(record.invoiceDraft || {}),
    // Admin draft line items always win — never replace with subscription-computed data
    lineItems: hasSavedDraft ? draftItems : initialInvoice.lineItems,
  }

  const [inv, setInv] = useState(mergedInvoice)

  // When the server returns the real invoice number, push it into inv state
  // so the form field always shows the canonical DB-backed number.
  React.useEffect(() => {
    if (fetchedInvoiceNumber && fetchedInvoiceNumber !== inv.invoiceNumber) {
      setInv(p => ({ ...p, invoiceNumber: fetchedInvoiceNumber }))
    }
  }, [fetchedInvoiceNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  const serializeInvoice = (data) => JSON.stringify({
    invoiceNumber: data.invoiceNumber || '',
    issueDate: data.issueDate || '',
    payableBy: data.payableBy || '',
    recipientCompany: data.recipientCompany || '',
    recipientName: data.recipientName || '',
    recipientContact: data.recipientContact || '',
    recipientAddress1: data.recipientAddress1 || '',
    recipientAddress2: data.recipientAddress2 || '',
    recipientCountry: data.recipientCountry || '',
    paymentMethod: data.paymentMethod || '',
    lineItems: (data.lineItems || []).map((it) => ({
      description: it.description || '',
      quantity: Number(it.quantity) || 0,
      unitPrice: Number(it.unitPrice) || 0,
      totalPrice: Number(it.totalPrice) || 0,
    })),
  })

  const [savedSnapshot, setSavedSnapshot] = useState(() => serializeInvoice(mergedInvoice))

  const hasInvoiceChanges = serializeInvoice(inv) !== savedSnapshot

  // ── Auto-preview on mount when triggered from the eye button ────────────────
  useEffect(() => {
    if (autoPreview && step === 'edit' && !autoPreviewFired.current) {
      autoPreviewFired.current = true
      // Small delay so the modal renders first
      const timer = setTimeout(async () => {
        setPreviewLoading(true)
        try {
          const result = await generateIFOAInvoicePDF(inv)
          setPreviewData(result)
        } catch (err) {
          console.error('Auto-preview failed:', err)
        } finally {
          setPreviewLoading(false)
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preview-only mode (eye button): show existing invoice preview immediately ──
  useEffect(() => {
    if (previewOnly && !previewData && !previewLoading) {
      const timer = setTimeout(async () => {
        setPreviewLoading(true)
        try {
          const result = await generateIFOAInvoicePDF(inv)
          setPreviewData(result)
        } catch (err) {
          console.error('Preview generation failed:', err)
        } finally {
          setPreviewLoading(false)
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [previewOnly, previewData, previewLoading, inv])

  const set = (f, v) => setInv(p => ({ ...p, [f]: v }))
  const setItem = (i, f, v) => setInv(p => ({
    ...p,
    lineItems: p.lineItems.map((it, idx) => {
      if (idx !== i) return it
      const updated = { ...it, [f]: v }
      if (f === 'quantity' || f === 'unitPrice') updated.totalPrice = (Number(f === 'quantity' ? v : updated.quantity) || 0) * (Number(f === 'unitPrice' ? v : updated.unitPrice) || 0)
      return updated
    }),
  }))
  const addItem    = () => setInv(p => ({ ...p, lineItems: [...p.lineItems, { description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }] }))
  const removeItem = (i) => setInv(p => ({ ...p, lineItems: p.lineItems.filter((_, idx) => idx !== i) }))

  const totalSum = inv.lineItems.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0)

  const handleProceed = () => {
    if (!paymentMethodSel) return
    setInv(p => ({ ...p, paymentMethod: paymentMethodSel }))
    setStep('edit')
  }

  // ── Save invoice — delegates to onSaveInvoice prop from AdminDashboard ─────
  const handleSaveInvoice = async () => {
    setSavingInvoice(true)
    const payload = {
      invoiceNumber:    inv.invoiceNumber,
      invoiceStatus:    'Generated',
      invoiceGenerated: true,
      invoiceDraft:     inv,
    }
    try {
      await onSaveInvoice(record._id, type, payload)
      setSavedSnapshot(serializeInvoice(inv))
    } finally {
      setSavingInvoice(false)
    }
  }

  // ── Download PDF from preview (invoice already saved) ────────────────────────
  const handleDownloadFromPreview = async () => {
    if (!previewData) return
    triggerDownload(previewData)
  }

  // ── Close preview modal ────────────────────────────────────────────────────────
  const closePreviewModal = () => {
    setPreviewData(null)
    if (previewOnly) onClose()
  }

  const iCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition'

  return (
    <AnimatePresence>
      {!previewOnly && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-20 overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }}
              className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-6"
              onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">
                Admin — {record.invoiceGenerated ? 'Edit Invoice' : 'Invoice Generator'}
              </p>
              <h2 className="text-lg font-extrabold text-slate-900">
                {record.airlineName || [record.firstName, record.lastName].filter(Boolean).join(' ') || 'Record'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {record.invoiceGenerated && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                  Invoice Generated
                </span>
              )}
              {step === 'edit' && initialStep !== 'edit' && (
                <button onClick={() => setStep('select')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                  ← Back
                </button>
              )}
              <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition">✕</button>
            </div>
          </div>

          {/* ── Step 1: Payment method selection ── */}
          {step === 'select' && (
            <div className="px-6 py-8">
              <p className="text-sm font-bold text-slate-700 mb-6">Select the payment method to generate the invoice accordingly:</p>
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {[
                  { val: 'card',  label: 'Credit / Debit Card',  sub: 'Stripe / instant payment',  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" /></svg>, accent: 'red' },
                  ...(isAirline ? [{ val: 'wire',  label: 'Wire Transfer',         sub: 'Bank transfer — BOFAUS3N',  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>, accent: 'blue' }] : []),
                ].map(opt => (
                  <button key={opt.val} onClick={() => setPaymentMethodSel(opt.val)}
                    className={`rounded-2xl border-2 p-5 text-left transition-all ${
                      paymentMethodSel === opt.val
                        ? opt.accent === 'red' ? 'border-red-500 bg-red-50/60' : 'border-blue-500 bg-blue-50/60'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                      paymentMethodSel === opt.val
                        ? opt.accent === 'red' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}>{opt.icon}</div>
                    <p className={`font-black text-sm mb-0.5 ${paymentMethodSel === opt.val ? opt.accent === 'red' ? 'text-red-700' : 'text-blue-700' : 'text-slate-900'}`}>{opt.label}</p>
                    <p className="text-xs text-slate-400">{opt.sub}</p>
                  </button>
                ))}
              </div>
              {isAirline && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-6">
                  <span className="font-bold">Wire Transfer recommended</span> — this is an airline/company account. Wire details will appear in the invoice footer automatically.
                </div>
              )}
              <div className="flex justify-end">
                <button onClick={handleProceed} disabled={!paymentMethodSel}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition disabled:opacity-40">
                  {record.invoiceGenerated ? 'Edit Invoice →' : 'Generate Invoice →'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Edit Invoice ── */}
          {step === 'edit' && (
            <div className="px-6 py-5 space-y-5 max-h-[72vh] overflow-y-auto">
              {/* Auto-preview loading banner */}
              {autoPreview && previewLoading && (
                <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>
                  Generating invoice preview…
                </div>
              )}

              <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${
                inv.paymentMethod === 'wire'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {inv.paymentMethod === 'wire' ? 'Wire Transfer Invoice' : 'Card Payment Invoice'}
              </div>

              {/* Invoice meta */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">Invoice Details</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Invoice Number</label><input className={iCls} value={inv.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Issue Date</label><input className={iCls} type="date" value={inv.issueDate} onChange={e => set('issueDate', e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Payable By</label><input className={iCls} type="date" value={inv.payableBy} onChange={e => set('payableBy', e.target.value)} /></div>
                </div>
              </div>

              {/* Recipient */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">Recipient</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {isAirline && <div className="sm:col-span-2"><label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Company Name</label><input className={iCls} value={inv.recipientCompany} onChange={e => set('recipientCompany', e.target.value)} /></div>}
                  <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Contact Name</label><input className={iCls} value={inv.recipientContact} onChange={e => set('recipientContact', e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Address Line 1</label><input className={iCls} value={inv.recipientAddress1} onChange={e => set('recipientAddress1', e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Address Line 2 (City/State/Zip)</label><input className={iCls} value={inv.recipientAddress2} onChange={e => set('recipientAddress2', e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Country</label><input className={iCls} value={inv.recipientCountry} onChange={e => set('recipientCountry', e.target.value)} /></div>
                </div>
              </div>

              {/* Line items */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">Line Items</p>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="grid grid-cols-12 gap-0 bg-slate-50 border-b border-slate-200 px-3 py-2">
                    <span className="col-span-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Description</span>
                    <span className="col-span-2 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Qty</span>
                    <span className="col-span-2 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Unit Price</span>
                    <span className="col-span-2 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Total</span>
                    <span className="col-span-1" />
                  </div>
                  <div className="divide-y divide-slate-100">
                    {inv.lineItems.map((item, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                        <input className="col-span-5 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500" value={item.description} onChange={e => setItem(i, 'description', e.target.value)} placeholder="Service description" />
                        <input className="col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 text-center" type="number" min="1" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
                        <input className="col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 text-right" type="number" step="0.01" min="0" value={item.unitPrice} onChange={e => setItem(i, 'unitPrice', e.target.value)} />
                        <div className="col-span-2 text-xs font-bold text-slate-900 text-right">{Number(item.totalPrice).toFixed(2)}</div>
                        <button onClick={() => removeItem(i)} disabled={inv.lineItems.length <= 1}
                          className="col-span-1 w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-20 mx-auto">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 px-3 py-2 flex items-center justify-between bg-slate-50">
                    <button onClick={addItem} className="text-xs font-semibold text-blue-600 hover:underline">+ Add Line Item</button>
                    <div className="text-sm font-black text-slate-900">Total: <span className="text-red-600">${totalSum.toFixed(2)} USD</span></div>
                  </div>
                </div>
              </div>

              {/* Invoice preview summary */}
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-4 text-xs text-slate-500 space-y-1">
                <p className="font-black text-[9px] uppercase tracking-widest text-slate-400 mb-2">Invoice Summary</p>
                <div className="flex justify-between"><span>Invoice #</span><span className="font-bold text-slate-800">{inv.invoiceNumber}</span></div>
                <div className="flex justify-between"><span>Date</span><span className="font-bold text-slate-800">{inv.issueDate}</span></div>
                <div className="flex justify-between"><span>Payable By</span><span className="font-bold text-slate-800">{inv.payableBy}</span></div>
                <div className="flex justify-between"><span>Recipient</span><span className="font-bold text-slate-800 text-right max-w-[55%]">{inv.recipientCompany || inv.recipientName}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 mt-2"><span className="font-bold">Invoice Sum Tax-Exempt</span><span className="font-black text-red-600">${totalSum.toFixed(2)}</span></div>
                {inv.paymentMethod === 'wire' && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-400">
                    Footer will include: <span className="font-semibold text-slate-600">Bank of America · IFOA USA Corp · SWIFT: BOFAUS3N · Account: 8981 5632 1560</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Footer actions ── */}
          {step === 'edit' && (
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex justify-between items-center">
              <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                Cancel
              </button>
              <div className="flex items-center gap-2">
                {/* Save is the source of truth; preview is optional after save */}
                {(!record.invoiceGenerated || hasInvoiceChanges) && (
                  <button
                    onClick={handleSaveInvoice}
                    disabled={savingInvoice || previewLoading}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition disabled:opacity-60 shadow-md shadow-red-200"
                  >
                    {(savingInvoice || previewLoading)
                      ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>Saving…</>
                      : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        {record.invoiceGenerated ? 'Save Changes' : 'Generate Invoice'}
                      </>
                    }
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
        </>
      )}

      {/* ── Invoice Preview Modal ── */}
      {previewData && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm" onClick={closePreviewModal} />
          <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-16 sm:pt-20 overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ duration: 0.2 }}
              className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}>
              
              {/* Header */}
              <div className="border-b border-slate-100 bg-slate-50 px-6 py-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Invoice {previewOnly ? 'Preview' : 'Saved'} ✓</p>
                  <h2 className="text-lg font-extrabold text-slate-900">Preview — {previewData.filename}</h2>
                </div>
                <button onClick={closePreviewModal}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition">✕</button>
              </div>

              {/* PDF Viewer or Loading */}
              <div className="bg-slate-100 p-4 h-[72vh] max-h-[820px] min-h-[520px] overflow-hidden">
                {previewLoading ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3">
                    <svg className="w-8 h-8 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>
                    <p className="text-sm text-slate-400">Generating preview…</p>
                  </div>
                ) : (
                  <iframe
                    src={previewData.url}
                    className="w-full h-full rounded-lg border border-slate-200 bg-white"
                    title="Invoice Preview"
                    style={{ display: 'block' }}
                  />
                )}
              </div>

              {/* Footer Actions */}
              <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex justify-between items-center">
                <p className="text-xs text-slate-500">Invoice has been {previewOnly ? 'generated' : 'saved'} successfully</p>
                <div className="flex items-center gap-3">
                  <button onClick={closePreviewModal}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                    Close
                  </button>
                  <button
                    onClick={handleDownloadFromPreview}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-red-200"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                    Download PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}
    </AnimatePresence>
  )
}


const accents = {
  blue:    'border-blue-100 bg-blue-50/40',
  emerald: 'border-emerald-100 bg-emerald-50/40',
  violet:  'border-violet-100 bg-violet-50/40',
  amber:   'border-amber-100 bg-amber-50/40',
  default: 'border-slate-200 bg-white',
}

function StatCard({ label, value, sub, icon, accent = 'default' }) {
  const iconColors = { blue: 'text-blue-600', emerald: 'text-emerald-600', violet: 'text-violet-600', amber: 'text-amber-600', default: 'text-slate-500' }
  return (
    <div className={`rounded-2xl border p-5 ${accents[accent]}`}>
      {icon && <div className={`mb-3 ${iconColors[accent]}`}>{icon}</div>}
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

function EmptyState({ message = 'No records found' }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="m20 20-3.5-3.5" /></svg>
      </div>
      <p className="text-base font-bold text-slate-900">{message}</p>
      <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or refresh.</p>
    </div>
  )
}

// ─── RowActions ────────────────────────────────────────────────────────────────
// Invoice buttons behaviour:
//   invoiceGenerated = false → single red "Generate" button (opens modal at step 1)
//   invoiceGenerated = true  → eye icon (opens modal at step 'edit' + auto-previews)
//                            + emerald "Edit Invoice" button (opens modal at step 'edit', no auto-preview)
function RowActions({ onView, onDelete, onInvoice, onInvoicePreview, invoiceGenerated, isDeleting }) {
  return (
    <div className="flex flex-nowrap items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
      {/* View */}
      <button onClick={onView}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition whitespace-nowrap">
        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /></svg>
        View
      </button>

      {/* Invoice buttons */}
      {onInvoice && (
        invoiceGenerated ? (
          <>
            {/* Eye icon — immediately previews the invoice PDF in a new tab */}
            <button
              onClick={onInvoicePreview}
              title="Preview Invoice PDF"
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
              </svg>
            </button>
            {/* Edit invoice — opens edit form directly */}
            <button
              onClick={onInvoice}
              title="Edit Invoice"
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition whitespace-nowrap"
            >
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" />
              </svg>
              Invoice
            </button>
          </>
        ) : (
          /* Generate new invoice — opens payment method selector (step 1) */
          <button
            onClick={onInvoice}
            title="Generate Invoice"
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition whitespace-nowrap"
          >
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate
          </button>
        )
      )}

      {/* Delete */}
      <button onClick={onDelete} disabled={isDeleting}
        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition disabled:opacity-40 whitespace-nowrap">
        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" /></svg>
        {isDeleting ? '…' : 'Del'}
      </button>
    </div>
  )
}

// ─── Grouped Individuals Table ─────────────────────────────────────────────────
function IndividualsTable({ data, onView, onDelete, onInvoice, onInvoicePreview, deleting, highlightedId }) {
  const [expanded, setExpanded] = useState({})

  const groups = useMemo(() => {
    const map = {}
    data.forEach(r => {
      const key = (r.email || '').toLowerCase().trim() || r._id
      if (!map[key]) map[key] = []
      map[key].push(r)
    })
    return Object.values(map).map(g => g.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
  }, [data])

  const toggle = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }))

  if (!data.length) return <EmptyState message="No individual records found" />

  const planLabel = (p) =>
    p?.includes('Multiple') ? 'Multiple Yrs' : p?.includes('Unlimited') ? 'Unlimited' : p?.includes('1 Year') ? '1 Year' : p || '—'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="max-h-[68vh] overflow-y-auto overflow-x-hidden">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-44">Name & Certificate</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-36">Contact</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-20">Country</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24">Plan</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-20">Price</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-20">Status</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-20">Payment</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24">Submitted</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-52">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              const primary = group[0]
              const key = ((primary.email || '').toLowerCase().trim() || primary._id) + '-' + primary._id
              const isOpen = !!expanded[key]
              const hasMany = group.length > 1
              const initials = ((primary.firstName?.[0] || '') + (primary.lastName?.[0] || '')).toUpperCase() || 'I'

              return (
                <React.Fragment key={key}>
                  <tr
                    className={`border-b border-slate-100 transition-colors cursor-pointer ${
                      String(primary._id) === String(highlightedId)
                        ? 'bg-amber-50 outline outline-2 outline-amber-400'
                        : isOpen ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                    }`}
                    onClick={() => hasMany ? toggle(key) : onView(primary)}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm leading-tight truncate max-w-[130px]">
                            {[primary.firstName, primary.lastName].filter(Boolean).join(' ') || '—'}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[130px]">{primary.primaryCertificate || 'No cert type'}</p>
                          {hasMany && (
                            <button
                              onClick={e => { e.stopPropagation(); toggle(key) }}
                              className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 text-[9px] font-black text-amber-700 hover:bg-amber-100 transition whitespace-nowrap"
                            >
                              <svg className={`w-2.5 h-2.5 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                              Multiple Subscriptions ({group.length})
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-slate-700 text-xs truncate max-w-[140px]">{primary.email || '—'}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">{primary.phone || '—'}</p>
                    </td>
                    <td className="px-4 py-4"><p className="text-slate-600 text-xs truncate max-w-[80px]">{primary.country || '—'}</p></td>
                    <td className="px-4 py-4"><span className="text-xs text-slate-700 font-medium">{planLabel(primary.subscriptionPlan)}</span></td>
                    <td className="px-4 py-4 font-semibold text-slate-900 text-sm whitespace-nowrap">{fmtMoney(primary.price)}</td>
                    <td className="px-4 py-4"><Badge value={primary.isPaid ? 'Active' : (primary.status || 'Pending')} type="status" isPaid={primary.isPaid} /></td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <Badge value={primary.paymentStatus} isPaid={primary.isPaid} />
                        {primary.wirePaymentRequested && (
                          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-700 w-fit">
                            Wire Requested
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-400 text-xs whitespace-nowrap">{fmtDate(primary.createdAt)}</td>
                    <td className="px-4 py-4">
                      <RowActions
                        onView={() => onView(primary)}
                        onDelete={() => onDelete(primary._id, 'individual')}
                        onInvoice={() => onInvoice(primary)}
                        onInvoicePreview={() => onInvoicePreview(primary)}
                        invoiceGenerated={hasExistingInvoice(primary)}
                        isDeleting={deleting === primary._id}
                      />
                    </td>
                  </tr>

                  {hasMany && isOpen && group.map((sub, si) => (
                    <tr key={sub._id + '-sub'}
                      className="border-b border-slate-100 bg-amber-50/30 hover:bg-amber-50/60 transition-colors cursor-pointer"
                      onClick={() => onView(sub)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 pl-4">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-px h-2 bg-amber-300" />
                            <div className="w-2 h-2 rounded-sm bg-amber-300 border border-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-0.5">Sub #{si + 1}</p>
                            <p className="text-xs font-semibold text-slate-700 truncate max-w-[110px]">{[sub.firstName, sub.lastName].filter(Boolean).join(' ') || '—'}</p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[110px]">{sub.primaryCertificate || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><p className="text-slate-600 text-xs truncate max-w-[140px]">{sub.email || '—'}</p><p className="text-slate-400 text-[11px] mt-0.5">{sub.phone || '—'}</p></td>
                      <td className="px-4 py-3"><p className="text-slate-500 text-xs">{sub.country || '—'}</p></td>
                      <td className="px-4 py-3"><span className="text-xs text-slate-600 font-medium">{planLabel(sub.subscriptionPlan)}</span></td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700 whitespace-nowrap">{fmtMoney(sub.price)}</td>
                      <td className="px-4 py-3"><Badge value={sub.isPaid ? 'Active' : (sub.status || 'Pending')} type="status" isPaid={sub.isPaid} /></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Badge value={sub.paymentStatus} isPaid={sub.isPaid} />
                          {sub.wirePaymentRequested && (
                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-700 w-fit">
                              Wire Requested
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(sub.createdAt)}</td>
                      <td className="px-4 py-3">
                        <RowActions
                          onView={() => onView(sub)}
                          onDelete={() => onDelete(sub._id, 'individual')}
                          onInvoice={() => onInvoice(sub)}
                          onInvoicePreview={() => onInvoicePreview(sub)}
                          invoiceGenerated={hasExistingInvoice(sub)}
                          isDeleting={deleting === sub._id}
                        />
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Grouped Airlines Table ────────────────────────────────────────────────────
function AirlinesTable({ data, onView, onDelete, onInvoice, onInvoicePreview, deleting, highlightedId }) {
  const [expanded, setExpanded] = useState({})

  const groups = useMemo(() => {
    const map = {}
    data.forEach(r => {
      const key = (r.airlineName || '').toLowerCase().trim() || r._id
      if (!map[key]) map[key] = []
      map[key].push(r)
    })
    return Object.values(map).map(g => g.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
  }, [data])

  const toggle = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }))

  if (!data.length) return <EmptyState message="No airline records found" />

  const planLabel = (p) =>
    p?.includes('Unlimited') ? 'Unlimited' : p?.includes('Multiple') ? 'Multiple Yrs' : p?.includes('1 Year') ? '1 Year' : p || '—'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="max-h-[68vh] overflow-y-auto overflow-x-hidden">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-52">Airline & Contact</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-36">Email</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24">Country</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24">Plan</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-20">Holders / Total</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24">Status</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24">Payment</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-28">Submitted</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              const primary = group[0]
              const key = ((primary.airlineName || '').toLowerCase().trim() || primary._id) + '-' + primary._id
              const isOpen = !!expanded[key]
              const hasMany = group.length > 1
              const contactName = [primary.firstName, primary.lastName].filter(Boolean).join(' ') ||
                [primary.contactFirstName, primary.contactLastName].filter(Boolean).join(' ') || ''

              return (
                <React.Fragment key={key}>
                  <tr
                    className={`border-b border-slate-100 transition-colors cursor-pointer ${
                      String(primary._id) === String(highlightedId)
                        ? 'bg-amber-50 ring-2 ring-inset ring-amber-400'
                        : isOpen ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                    }`}
                    onClick={() => hasMany ? toggle(key) : onView(primary)}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center flex-shrink-0">
                          <Plane className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm leading-tight truncate max-w-[130px]">{primary.airlineName || '—'}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[130px]">{contactName || primary.city || primary.country || '—'}</p>
                          {hasMany && (
                            <button onClick={e => { e.stopPropagation(); toggle(key) }}
                              className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 text-[9px] font-black text-amber-700 hover:bg-amber-100 transition whitespace-nowrap">
                              <svg className={`w-2.5 h-2.5 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                              Multiple Subscriptions ({group.length})
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><p className="text-slate-700 text-xs truncate max-w-[130px]">{primary.email || primary.contactEmail || '—'}</p></td>
                    <td className="px-4 py-4"><p className="text-slate-600 text-xs truncate max-w-[80px]">{primary.country || '—'}</p></td>
                    <td className="px-4 py-4"><span className="text-xs font-medium text-slate-700">{planLabel(primary.subscriptionPlan)}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                          {primary.certificateHolders?.length || 0}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{fmtAirlineTotal(primary)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4"><Badge value={primary.isPaid ? 'Active' : (primary.status || 'Pending')} type="status" isPaid={primary.isPaid} /></td>
                    <td className="px-4 py-4"><Badge value={primary.paymentStatus} isPaid={primary.isPaid} /></td>
                    <td className="px-4 py-4 text-slate-400 text-xs whitespace-nowrap">{fmtDate(primary.createdAt)}</td>
                    <td className="px-4 py-4">
                      <RowActions
                        onView={() => onView(primary)}
                        onDelete={() => onDelete(primary._id, 'airline')}
                        onInvoice={() => onInvoice(primary)}
                        onInvoicePreview={() => onInvoicePreview(primary)}
                        invoiceGenerated={hasExistingInvoice(primary)}
                        isDeleting={deleting === primary._id}
                      />
                    </td>
                  </tr>

                  {hasMany && isOpen && group.map((sub, si) => (
                    <tr key={sub._id + '-sub'}
                      className="border-b border-slate-100 bg-amber-50/30 hover:bg-amber-50/60 transition-colors cursor-pointer"
                      onClick={() => onView(sub)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 pl-4">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-px h-2 bg-amber-300" />
                            <div className="w-2 h-2 rounded-sm bg-amber-300 border border-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-0.5">Sub #{si + 1}</p>
                            <p className="text-xs font-semibold text-slate-700 truncate max-w-[100px]">{sub.airlineName || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><p className="text-slate-600 text-xs truncate max-w-[130px]">{sub.email || sub.contactEmail || '—'}</p></td>
                      <td className="px-4 py-3"><p className="text-slate-500 text-xs">{sub.country || '—'}</p></td>
                      <td className="px-4 py-3"><span className="text-xs text-slate-600 font-medium">{planLabel(sub.subscriptionPlan)}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold">{sub.certificateHolders?.length || 0}</span>
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{fmtAirlineTotal(sub)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge value={sub.isPaid ? 'Active' : (sub.status || 'Pending')} type="status" isPaid={sub.isPaid} /></td>
                      <td className="px-4 py-3"><Badge value={sub.paymentStatus} isPaid={sub.isPaid} /></td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(sub.createdAt)}</td>
                      <td className="px-4 py-3">
                        <RowActions
                          onView={() => onView(sub)}
                          onDelete={() => onDelete(sub._id, 'airline')}
                          onInvoice={() => onInvoice(sub)}
                          onInvoicePreview={() => onInvoicePreview(sub)}
                          invoiceGenerated={hasExistingInvoice(sub)}
                          isDeleting={deleting === sub._id}
                        />
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OverviewPanel({ individuals, airlines }) {
  const indTotal   = individuals.reduce((s, r) => s + (Number(r.price) || 0), 0)
  const airTotal   = airlines.reduce((s, r) => s + getAirlineTotal(r), 0)
  const indPaid    = individuals.filter(r => r.isPaid === true || (r.isPaid == null && r.paymentStatus === 'paid')).length
  const airPaid    = airlines.filter(r => r.isPaid === true || (r.isPaid == null && r.paymentStatus === 'paid')).length
  const allHolders = airlines.reduce((s, r) => s + (r.certificateHolders?.length || 0), 0)
  const allRegs = [...individuals, ...airlines]
  const planCounts = {
    '1 Year':     allRegs.filter(r => r.subscriptionPlan === '1 Year Subscription Plan').length,
    'Multi-Year': allRegs.filter(r => r.subscriptionPlan === 'Multiple Years Subscription Plan').length,
    'Unlimited':  allRegs.filter(r => r.subscriptionPlan === 'Unlimited Plan').length,
  }
  const countryCounts = {}
  allRegs.forEach(r => { if (r.country) countryCounts[r.country] = (countryCounts[r.country] || 0) + 1 })
  const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Individuals" value={individuals.length} sub="Registered" accent="blue"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="9.5" cy="7" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /></svg>} />
        <StatCard label="Airlines" value={airlines.length} sub="Operators" accent="violet"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m2 14 8.5-2.5L13 4l2 1-1 7 5.5 1.5a2 2 0 0 1 0 3L14 18l1 7-2 1-2.5-7.5L2 16v-2Z" /></svg>} />
        <StatCard label="Cert Holders" value={allHolders} sub="Airline total" accent="amber"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="2" y="7" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 0 0-4 0v2M12 12v4M10 14h4" /></svg>} />
        <StatCard label="Indiv. Revenue" value={'$' + indTotal.toLocaleString('en-US')} sub="Individual fees" accent="emerald"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12M8 10h8M8 14h8" /></svg>} />
        <StatCard label="Airline Revenue" value={'$' + airTotal.toLocaleString('en-US')} sub="Airline fees" accent="emerald"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0-4-4m4 4 4-4M4 20h16" /></svg>} />
        <StatCard label="Paid" value={indPaid + airPaid} sub={`${indPaid} ind · ${airPaid} air`} accent="emerald"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>} />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5">Plan Distribution</p>
          <div className="space-y-4">
            {Object.entries(planCounts).map(([plan, count]) => {
              const pct = allRegs.length ? Math.round((count / allRegs.length) * 100) : 0
              return (
                <div key={plan}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700">{plan}</span>
                    <span className="font-bold text-slate-900">{count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-slate-700 rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5">Top Countries — All Registrations</p>
          <div className="space-y-2">
            {topCountries.length === 0 ? <p className="text-sm text-slate-400">No data yet.</p> : topCountries.map(([country, count]) => (
              <div key={country} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-700 font-medium">{country}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round((count / allRegs.length) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-600 w-4 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { pathname, search: locationSearch } = useLocation()
  const navigate = useNavigate()
  const tabFromPath = pathname.endsWith('/individuals')
    ? 'individuals'
    : pathname.endsWith('/airlines')
      ? 'airlines'
      : pathname.endsWith('/add-airline')
        ? 'add-airline'
        : pathname.endsWith('/add-individual')
          ? 'add-individual'
          : 'overview'
  const [tab, setTab] = useState(tabFromPath)
  useEffect(() => { setTab(tabFromPath) }, [pathname])

  // Deep-link: ?highlight=<airlineId> — auto-opens the view modal for that record
  const highlightId = useMemo(() => {
    const p = new URLSearchParams(locationSearch)
    return p.get('highlight') || null
  }, [locationSearch])

  const [individuals, setIndividuals] = useState([])
  const [airlines, setAirlines]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [loadErr, setLoadErr]         = useState('')
  const [search, setSearch]           = useState('')
  const [filterPlan, setFilterPlan]   = useState('All')
  const [filterPayment, setFilterPayment] = useState('All')
  const [filterStatus, setFilterStatus]   = useState('All')

  const [viewRec, setViewRec]   = useState(null)
  const [viewType, setViewType] = useState(null)
  const [editRec, setEditRec]   = useState(null)
  const [editType, setEditType] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [toast, setToast]       = useState(null)
  const [highlightedAirlineId, setHighlightedAirlineId] = useState(null)

  // invoiceModal state: { record, type, initialStep, autoPreview }
  const [invoiceModal, setInvoiceModal] = useState(null)

  useEffect(() => { loadData() }, [])

  // Wire notification: switch to Airlines tab and highlight the row
  useEffect(() => {
    if (!highlightId || loading || airlines.length === 0) return
    const record = airlines.find(a => String(a._id) === String(highlightId))
    if (record) {
      setTab('airlines')
      setHighlightedAirlineId(highlightId)
      navigate('/admin/airlines', { replace: true })
      // Auto-clear the highlight after 6 seconds
      setTimeout(() => setHighlightedAirlineId(null), 6000)
    }
  }, [highlightId, airlines, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadData = async () => {
    setLoading(true); setLoadErr('')
    try {
      const [ir, ar] = await Promise.all([getAllIndividuals(), getAllAirlinesSubscriptions()])
      setIndividuals(Array.isArray(ir.data?.data) ? ir.data.data : Array.isArray(ir.data) ? ir.data : [])
      setAirlines(Array.isArray(ar.data?.data) ? ar.data.data : Array.isArray(ar.data) ? ar.data : [])
    } catch {
      setLoadErr('Could not connect to the server. Is the backend running on port 5000?')
    } finally { setLoading(false) }
  }

  const handleSave = async (id, data, type) => {
    setSaving(true)
    try {
      if (type === 'airline') {
        const res = await updateAirlinesSubscription(id, data)
        const saved = res.data?.data || data
        setAirlines(p => p.map(x => x._id === id ? { ...x, ...saved } : x))
      } else {
        const res = await updateIndividual(id, data)
        const saved = res.data?.data || data
        setIndividuals(p => p.map(x => x._id === id ? { ...x, ...saved } : x))
      }
      showToast('Record updated successfully')
    } catch (e) {
      showToast(e?.response?.data?.message || 'Save failed', 'error')
      throw e
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, type) => {
    if (!window.confirm('Permanently delete this record?')) return
    setDeleting(id)
    try {
      if (type === 'airline') { await deleteAirlinesSubscription(id); setAirlines(p => p.filter(x => x._id !== id)) }
      else { await deleteIndividual(id); setIndividuals(p => p.filter(x => x._id !== id)) }
      showToast('Record deleted')
    } catch { showToast('Delete failed', 'error') }
    finally { setDeleting(null) }
  }

  const handleSaveInvoice = async (id, type, payload) => {
    try {
      // Only persist invoice-specific fields to the registration doc.
      // Do NOT spread the full payload (which contains invoiceDraft etc.) into
      // updateAirlinesSubscription / updateIndividual — that clobbers subscription
      // fields and causes the returned record to lose invoiceDraft on re-open.
      const registrationUpdate = {
        invoiceStatus:    payload.invoiceStatus,
        invoiceGenerated: payload.invoiceGenerated,
        invoiceNumber:    payload.invoiceNumber,
        invoiceDraft:     payload.invoiceDraft,
      }

      if (type === 'airline') {
        const res = await updateAirlinesSubscription(id, registrationUpdate)
        const saved = res.data?.data || {}
        // Merge carefully: keep all existing record fields, only update invoice-related ones
        // AND carry the invoiceDraft forward in memory (API may not return it)
        setAirlines(p => p.map(x => x._id === id
          ? { ...x, ...saved, invoiceDraft: payload.invoiceDraft, invoiceNumber: payload.invoiceNumber }
          : x
        ))
        setInvoiceModal(prev => prev && prev.record._id === id
          ? { ...prev, record: { ...prev.record, ...saved, invoiceDraft: payload.invoiceDraft, invoiceNumber: payload.invoiceNumber } }
          : prev
        )
      } else {
        const res = await updateIndividual(id, registrationUpdate)
        const saved = res.data?.data || {}
        setIndividuals(p => p.map(x => x._id === id
          ? { ...x, ...saved, invoiceDraft: payload.invoiceDraft, invoiceNumber: payload.invoiceNumber }
          : x
        ))
        setInvoiceModal(prev => prev && prev.record._id === id
          ? { ...prev, record: { ...prev.record, ...saved, invoiceDraft: payload.invoiceDraft, invoiceNumber: payload.invoiceNumber } }
          : prev
        )
      }

      // Sync to Payment.invoiceDraft (backward compat)
      try {
        const paymentsRes = await getPaymentsByRegistration(id)
        const payments = paymentsRes.data?.data || []
        const paidDoc = payments.find(p => p.isPaid) || payments[0]
        if (paidDoc?._id && payload.invoiceDraft) {
          await savePaymentInvoiceDraft(paidDoc._id, payload.invoiceDraft, payload.invoiceNumber)
        }
      } catch (paymentSyncErr) {
        console.warn('[handleSaveInvoice] Payment doc sync failed:', paymentSyncErr.message)
      }

      // Sync to canonical Invoice doc — this is the single source of truth
      // that the user’s SubscriptionPage reads from.
      try {
        const invDocRes = await getInvoiceByRegistration(id)
        const invDoc = (invDocRes.data?.data || [])[0]
        if (invDoc?._id) {
          await saveInvoiceDraftToDoc(invDoc._id, payload.invoiceDraft, payload.invoiceNumber)
        }
      } catch (invSyncErr) {
        console.warn('[handleSaveInvoice] Invoice doc sync failed:', invSyncErr.message)
      }

      showToast('Invoice saved — user will see updated invoice')
    } catch (e) {
      showToast(e?.response?.data?.message || 'Could not save invoice changes', 'error')
      throw e
    }
  }

  const openView = (r, type) => { setViewRec(r); setViewType(type) }
  const closeView = () => { setViewRec(null); setViewType(null) }
  const openEditFromView = () => {
    const r = viewRec
    const t = viewType
    closeView()
    setTimeout(() => {
      setEditRec(r)
      setEditType(t)
    }, 50)
  }

  // Open invoice modal at step 1 (generate new invoice)
  const openInvoiceGenerate = (record, type) => {
    setInvoiceModal({ record, type, initialStep: 'select', autoPreview: false, previewOnly: false })
  }

  // Open invoice modal directly at edit form, no auto-preview (Edit Invoice button)
  const openInvoiceEdit = (record, type) => {
    setInvoiceModal({ record, type, initialStep: 'edit', autoPreview: false, previewOnly: false })
  }

  // Preview existing invoice (Eye button) — shows preview only
  const openInvoicePreview = (record, type) => {
    setInvoiceModal({ record, type, initialStep: 'edit', autoPreview: false, previewOnly: true })
  }

  const closeInvoiceModal = () => setInvoiceModal(null)

  const src = tab === 'individuals' ? individuals : airlines

  const filtered = useMemo(() => src.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || (
      tab === 'individuals'
        ? [`${r.firstName || ''} ${r.lastName || ''}`, r.email, r.country, r.faaCertificateNumber, r.phone].some(v => String(v || '').toLowerCase().includes(q))
        : [r.airlineName, r.email || r.contactEmail, r.country, `${r.firstName || ''} ${r.lastName || ''}`].some(v => String(v || '').toLowerCase().includes(q))
    )

    return matchSearch
      && (filterPlan === 'All' || r.subscriptionPlan === filterPlan)
      && (filterPayment === 'All' || r.paymentStatus === filterPayment)
      && (filterStatus === 'All' || r.status === filterStatus)
  }), [src, search, filterPlan, filterPayment, filterStatus, tab])

  const uniqueAccountCount = useMemo(() => {
    if (tab === 'overview') return 0
    const keys = new Set()
    filtered.forEach(r => {
      const key = tab === 'airlines'
        ? (r.airlineName || '').toLowerCase().trim() || r._id
        : (r.email || '').toLowerCase().trim() || r._id
      keys.add(key)
    })
    return keys.size
  }, [filtered, tab])

  const PLANS    = ['All', '1 Year Subscription Plan', 'Multiple Years Subscription Plan', 'Unlimited Plan']
  const PAYMENTS = ['All', 'pending', 'paid', 'failed']
  const STATUSES = ['All', 'Pending', 'Active', 'Inactive']

  const clearFilters = () => { setSearch(''); setFilterPlan('All'); setFilterPayment('All'); setFilterStatus('All') }
  const hasActiveFilters = search || filterPlan !== 'All' || filterPayment !== 'All' || filterStatus !== 'All'

  return (
    <DashboardLayout>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className={`fixed top-6 right-6 z-[100] flex items-center gap-3 rounded-xl px-5 py-3.5 shadow-2xl text-sm font-semibold text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-900'}`}>
            {toast.type === 'error'
              ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></svg>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {viewRec && viewType === 'individual' && <IndividualViewModal record={viewRec} onClose={closeView} onEdit={openEditFromView} />}
      {viewRec && viewType === 'airline'    && <AirlineViewModal    record={viewRec} onClose={closeView} onEdit={openEditFromView} />}
      {editRec && editType === 'individual' && <IndividualEditModal record={editRec} saving={saving} onClose={() => { setEditRec(null); setEditType(null) }} onSave={(id, data) => handleSave(id, data, 'individual')} />}
      {editRec && editType === 'airline'    && <AirlineEditModal    record={editRec} saving={saving} onClose={() => { setEditRec(null); setEditType(null) }} onSave={(id, data) => handleSave(id, data, 'airline')} />}

      {invoiceModal && (
        <AdminInvoiceModal
          key={`${invoiceModal.record._id}-${invoiceModal.initialStep}-${invoiceModal.autoPreview}-${invoiceModal.previewOnly}`}
          record={invoiceModal.record}
          type={invoiceModal.type}
          initialStep={invoiceModal.initialStep}
          autoPreview={invoiceModal.autoPreview}
          previewOnly={invoiceModal.previewOnly}
          onClose={closeInvoiceModal}
          onSaveInvoice={handleSaveInvoice}
        />
      )}

      <div className="mb-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Admin Control Center</p>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-slate-900">Registrations Dashboard</h1>
        <p className="text-slate-500 text-sm mt-2 capitalize">Manage all pilot and airline operator registrations.</p>
      </div>

      {loadErr && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></svg>
          <span>{loadErr}</span>
          <button onClick={loadData} className="ml-auto font-semibold underline hover:no-underline">Retry</button>
        </div>
      )}

      {tab !== 'add-airline' && tab !== 'add-individual' && (
      <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {tab !== 'overview' && tab !== 'add-airline' && tab !== 'add-individual' && (
            <>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="m20 20-3.5-3.5" /></svg>
              <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-44 bg-white transition" />
            </div>
            <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
              className="border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl bg-white outline-none focus:border-blue-500 text-slate-600 transition">
              {PLANS.map(p => <option key={p} value={p}>{p === 'All' ? 'All Plans' : p}</option>)}
            </select>
            <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
              className="border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl bg-white outline-none focus:border-blue-500 text-slate-600 transition">
              {PAYMENTS.map(p => <option key={p} value={p}>{p === 'All' ? 'All Payments' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl bg-white outline-none focus:border-blue-500 text-slate-600 transition">
              {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
            </select>
            </>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {hasActiveFilters && tab !== 'overview' && tab !== 'add-airline' && tab !== 'add-individual' && (
              <button onClick={clearFilters} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">Clear</button>
            )}

            {tab !== 'overview' && tab !== 'add-airline' && tab !== 'add-individual' && (
              <a href={tab === 'individuals' ? exportIndividualsExcel() : exportAirlinesExcel()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0-4-4m4 4 4-4M4 20h16" /></svg>
                Export Excel
              </a>
            )}

            {tab === 'individuals' && (
              <button
                onClick={() => navigate('/admin/add-individual')}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition"
                style={{ background: '#000021' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                </svg>
                Add Individual
              </button>
            )}

            {tab === 'airlines' && (
              <button
                onClick={() => navigate('/admin/add-airline')}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition"
                style={{ background: '#000021' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                </svg>
                Add Airline
              </button>
            )}

            <button onClick={loadData} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3M4 4v5h5M20 20v-5h-5" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>
      )}

      {tab !== 'overview' && tab !== 'add-airline' && tab !== 'add-individual' && !loading && (
        <div className="flex items-center gap-3 mb-4 px-1">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-800">{uniqueAccountCount}</span> account{uniqueAccountCount !== 1 ? 's' : ''}{' '}
            <span className="text-slate-400">({filtered.length} total subscription{filtered.length !== 1 ? 's' : ''})</span>
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading records…</p>
        </div>
      ) : tab === 'overview' ? (
        <OverviewPanel individuals={individuals} airlines={airlines} />
      ) : tab === 'add-airline' ? (
        <div className="px-4">
          <AdminAirlineForm />
        </div>
      ) : tab === 'add-individual' ? (
        <div className="px-4">
          <AdminIndividualForm />
        </div>
      ) : tab === 'individuals' ? (
        <IndividualsTable
          data={filtered}
          highlightedId={null}
          onView={r => openView(r, 'individual')}
          onDelete={handleDelete}
          deleting={deleting}
          onInvoice={r => hasExistingInvoice(r) ? openInvoiceEdit(r, 'individual') : openInvoiceGenerate(r, 'individual')}
          onInvoicePreview={r => openInvoicePreview(r, 'individual')}
        />
      ) : (
        <AirlinesTable
          data={filtered}
          highlightedId={highlightedAirlineId}
          onView={r => openView(r, 'airline')}
          onDelete={handleDelete}
          deleting={deleting}
          onInvoice={r => hasExistingInvoice(r) ? openInvoiceEdit(r, 'airline') : openInvoiceGenerate(r, 'airline')}
          onInvoicePreview={r => openInvoicePreview(r, 'airline')}
        />
      )}
    </DashboardLayout>
  )
}
