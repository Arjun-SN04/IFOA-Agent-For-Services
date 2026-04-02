import React, { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import {
  deleteAirlinesSubscription,
  deleteIndividual,
  exportAirlinesExcel,
  exportIndividualsExcel,
  getAllAirlinesSubscriptions,
  getAllIndividuals,
  updateAirlinesSubscription,
  updateIndividual,
} from '../services/api'

const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const fmtMoney = (v) =>
  v !== undefined && v !== null && v !== ''
    ? '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 hover:border-slate-300'

const selectCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 hover:border-slate-300'

function Badge({ value, type = 'payment', isPaid }) {
  let cls = 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] '
  let dot = 'w-1.5 h-1.5 rounded-full flex-shrink-0 '
  let label = value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Pending'

  if (type === 'status') {
    const trulyActive = value === 'Active' && isPaid !== false
    if (trulyActive)              { cls += 'bg-emerald-50 border-emerald-200 text-emerald-700'; dot += 'bg-emerald-500' }
    else if (value === 'Pending') { cls += 'bg-amber-50 border-amber-200 text-amber-700'; dot += 'bg-amber-400' }
    else                          { cls += 'bg-slate-100 border-slate-200 text-slate-500'; dot += 'bg-slate-400' }
    if (value === 'Active' && isPaid === false) label = 'Pending'
  } else if (type === 'plan') {
    if (value?.includes('Unlimited'))     { cls += 'bg-red-50 border-red-200 text-red-700'; dot += 'bg-red-500' }
    else if (value?.includes('Multiple')) { cls += 'bg-slate-100 border-slate-200 text-slate-700'; dot += 'bg-slate-500' }
    else                                  { cls += 'bg-slate-50 border-slate-200 text-slate-600'; dot += 'bg-slate-400' }
  } else if (type === 'isPaid') {
    if (isPaid === true) { cls += 'bg-emerald-50 border-emerald-200 text-emerald-700'; dot += 'bg-emerald-500'; label = 'Paid' }
    else                 { cls += 'bg-amber-50 border-amber-200 text-amber-700'; dot += 'bg-amber-400'; label = 'Unpaid' }
  } else {
    const confirmedPaid = value === 'paid' && isPaid !== false
    if (confirmedPaid)           { cls += 'bg-emerald-50 border-emerald-200 text-emerald-700'; dot += 'bg-emerald-500' }
    else if (value === 'failed') { cls += 'bg-red-50 border-red-200 text-red-600'; dot += 'bg-red-500' }
    else                         { cls += 'bg-slate-100 border-slate-200 text-slate-600'; dot += 'bg-slate-400' }
    if (value === 'paid' && isPaid === false) label = 'Pending'
  }
  return (
    <span className={cls}>
      <span className={dot} />
      {label}
    </span>
  )
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
  return <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-3 pt-1">{label}</p>
}

// ─── Individual View Modal ─────────────────────────────────────────────────────
function IndividualViewModal({ record, onClose, onEdit }) {
  const fullName = [record.firstName, record.middleName, record.lastName].filter(Boolean).join(' ') || 'Individual'
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }}
          className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}>
          <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50 flex-shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Individual — Record</p>
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
                <ViewField
                  label="Expiration Date"
                  value={
                    record.subscriptionPlan === 'Unlimited Plan'
                      ? 'Never (Unlimited)'
                      : record.expirationDate
                      ? fmtDate(record.expirationDate)
                      : record.isPaid ? '—' : 'Activates on payment'
                  }
                />
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }}
          className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}>
          <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50 flex-shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Airline — Record</p>
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
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</span>
                  <Badge value={record.isPaid ? 'Active' : (record.status || 'Pending')} type="status" isPaid={record.isPaid} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Confirmed</span>
                  <Badge type="isPaid" isPaid={record.isPaid} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment</span>
                  <Badge value={record.paymentStatus} isPaid={record.isPaid} />
                </div>
                <ViewField label="Invoice" value={record.invoiceStatus} />
                <ViewField label="Invoice #" value={record.invoiceNumber} />
                <ViewField label="Plan" value={record.subscriptionPlan} />
                <ViewField label="Holder Count" value={record.holderCount} />
                <ViewField label="Exact Count" value={record.holderCountValue} />
                <ViewField label="Subscription Date" value={record.subscriptionDate ? fmtDate(record.subscriptionDate) : (record.isPaid ? fmtDate(record.updatedAt) : 'Activates on payment')} />
                <ViewField
                  label="Expiration Date"
                  value={
                    record.subscriptionPlan === 'Unlimited Plan'
                      ? 'Never (Unlimited)'
                      : record.expirationDate
                      ? fmtDate(record.expirationDate)
                      : record.isPaid ? '—' : 'Activates on payment'
                  }
                />
                <ViewField label="Price/Cert" value={fmtMoney(record.pricePerCertificate ?? record.pricePerCert)} />
                <ViewField label="Total Fees" value={fmtMoney(record.totalServiceFees ?? record.totalAmount)} />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-5"><SectionHead label="Airline / Operator" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="col-span-2 sm:col-span-3"><ViewField label="Company" value={record.airlineName} /></div>
                <div className="col-span-2 sm:col-span-3">
                  <ViewField label="Address" value={[record.addressLine1, record.addressLine2, record.city, record.state, record.postalCode, record.country].filter(Boolean).join(', ')} />
                </div>
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
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-3">Holder #{i + 1}</p>
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }}
          className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-8"
          onClick={e => e.stopPropagation()}>
          <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Edit Individual</p>
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
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${form.hasSecondaryCertificate ? 'bg-red-600 border-red-600' : 'bg-white border-slate-300'}`}
                      onClick={() => set('hasSecondaryCertificate', !form.hasSecondaryCertificate)}>
                      {form.hasSecondaryCertificate && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Has secondary certificate</span>
                  </label>
                  {form.hasSecondaryCertificate && (
                    <div className="grid sm:grid-cols-2 gap-3 ml-2 pl-4 border-l-2 border-red-200">
                      <Field label="Secondary Cert Type">
                        <select className={selectCls} value={form.secondaryCertificate || ''} onChange={e => set('secondaryCertificate', e.target.value)}>
                          <option value="">— Select —</option>
                          <option value="Part 61 - Pilot">Part 61 - Pilot</option>
                          <option value="Part 61 - Flight or Ground Instructor">Part 61 - Instructor</option>
                          <option value="Part 65 - Aircraft Dispatcher">Part 65 - Dispatcher</option>
                        </select>
                      </Field>
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
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50">
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }}
          className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-8"
          onClick={e => e.stopPropagation()}>
          <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Edit Airline</p>
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
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-3">Holder #{idx + 1}</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Field label="Full Name"><input className={inputCls} value={h.fullName || ''} onChange={e => setHolder(idx, 'fullName', e.target.value)} /></Field>
                        <Field label="Date of Birth"><input className={inputCls} type="date" value={h.dateOfBirth ? String(h.dateOfBirth).slice(0,10) : ''} onChange={e => setHolder(idx, 'dateOfBirth', e.target.value)} /></Field>
                        <Field label="Certificate Type">
                          <select className={selectCls} value={h.certificateType || ''} onChange={e => setHolder(idx, 'certificateType', e.target.value)}>
                            <option value="">— Select —</option>
                            <option value="Part 61 - Pilot">Part 61 - Pilot</option>
                            <option value="Part 61 - Flight or Ground Instructor">Part 61 - Instructor</option>
                            <option value="Part 65 - Aircraft Dispatcher">Part 65 - Dispatcher</option>
                          </select>
                        </Field>
                        <Field label="Certificate Status">
                          <select className={selectCls} value={h.certificateStatus || ''} onChange={e => setHolder(idx, 'certificateStatus', e.target.value)}>
                            <option value="">— Select —</option>
                            <option value="NEW">NEW</option>
                            <option value="EXISTING">EXISTING</option>
                          </select>
                        </Field>
                        <Field label="FAA Certificate #"><input className={inputCls} value={h.faaCertificateNumber || ''} onChange={e => setHolder(idx, 'faaCertificateNumber', e.target.value)} /></Field>
                        <Field label="IACRA FTN #"><input className={inputCls} value={h.iacraFtnNumber || ''} onChange={e => setHolder(idx, 'iacraFtnNumber', e.target.value)} /></Field>
                        <div className="sm:col-span-2"><Field label="Email"><input className={inputCls} type="email" placeholder="holder@example.com" value={h.email || ''} onChange={e => setHolder(idx, 'email', e.target.value)} /></Field></div>
                        <div className="sm:col-span-2">
                          <label className="flex items-center gap-2 cursor-pointer mb-3">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${h.hasSecondaryCertificate ? 'bg-red-600 border-red-600' : 'bg-white border-slate-300'}`}
                              onClick={() => setHolder(idx, 'hasSecondaryCertificate', !h.hasSecondaryCertificate)}>
                              {h.hasSecondaryCertificate && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <span className="text-xs font-semibold text-slate-700">Has secondary certificate</span>
                          </label>
                          {h.hasSecondaryCertificate && (
                            <div className="grid sm:grid-cols-2 gap-3 ml-2 pl-4 border-l-2 border-red-200">
                              <Field label="Secondary Cert Type">
                                <select className={selectCls} value={h.secondaryCertificateType || ''} onChange={e => setHolder(idx, 'secondaryCertificateType', e.target.value)}>
                                  <option value="">— Select —</option>
                                  <option value="Part 61 - Pilot">Part 61 - Pilot</option>
                                  <option value="Part 61 - Flight or Ground Instructor">Part 61 - Instructor</option>
                                  <option value="Part 65 - Aircraft Dispatcher">Part 65 - Dispatcher</option>
                                </select>
                              </Field>
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
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50">
              {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function StatCard({ label, value, sub, icon, accent = 'default' }) {
  const accents = { blue: 'bg-blue-50 border-blue-100', emerald: 'bg-emerald-50 border-emerald-100', violet: 'bg-violet-50 border-violet-100', amber: 'bg-amber-50 border-amber-100', default: 'bg-white border-slate-200' }
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

function RowActions({ onView, onEdit, onDelete, isDeleting }) {
  return (
    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
      <button onClick={onView} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition whitespace-nowrap">
        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /></svg>
        View
      </button>
      <button onClick={onEdit} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition whitespace-nowrap">
        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" /></svg>
        Edit
      </button>
      <button onClick={onDelete} disabled={isDeleting}
        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition disabled:opacity-40 whitespace-nowrap">
        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" /></svg>
        {isDeleting ? '…' : 'Del'}
      </button>
    </div>
  )
}

// ─── Grouped Individuals Table ─────────────────────────────────────────────────
// Groups by email — same collapse behaviour as Airlines table
function IndividualsTable({ data, onView, onEdit, onDelete, deleting }) {
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 920 }}>
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-52">Name & Certificate</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-44">Contact</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24">Country</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-28">Plan</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24">Price</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24">Status</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24">Payment</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-28">Submitted</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-36">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              const primary = group[0]
              const key = (primary.email || '').toLowerCase().trim() || primary._id
              const isOpen = !!expanded[key]
              const hasMany = group.length > 1
              const initials = ((primary.firstName?.[0] || '') + (primary.lastName?.[0] || '')).toUpperCase() || 'I'

              return (
                <React.Fragment key={key}>
                  {/* ── Primary row ── */}
                  <tr
                    className={`border-b border-slate-100 transition-colors cursor-pointer ${isOpen ? 'bg-slate-50' : 'hover:bg-slate-50/60'}`}
                    onClick={() => hasMany ? toggle(key) : onView(primary)}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 text-xs font-black flex items-center justify-center flex-shrink-0">
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
                    <td className="px-4 py-4"><Badge value={primary.paymentStatus} isPaid={primary.isPaid} /></td>
                    <td className="px-4 py-4 text-slate-400 text-xs whitespace-nowrap">{fmtDate(primary.createdAt)}</td>
                    <td className="px-4 py-4">
                      <RowActions
                        onView={() => onView(primary)}
                        onEdit={() => onEdit(primary)}
                        onDelete={() => onDelete(primary._id, 'individual')}
                        isDeleting={deleting === primary._id}
                      />
                    </td>
                  </tr>

                  {/* ── Collapsed sub-rows (each additional subscription) ── */}
                  {hasMany && isOpen && group.map((sub, si) => (
                    <tr key={sub._id + '-sub'}
                      className="border-b border-slate-100 bg-amber-50/30 hover:bg-amber-50/60 transition-colors cursor-pointer"
                      onClick={() => onView(sub)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 pl-4">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-px h-2 bg-amber-300" />
                            <div className="w-2 h-2 rounded-full bg-amber-400 border-2 border-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-0.5">Sub #{si + 1}</p>
                            <p className="text-xs font-semibold text-slate-700 truncate max-w-[110px]">
                              {[sub.firstName, sub.lastName].filter(Boolean).join(' ') || '—'}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[110px]">{sub.primaryCertificate || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-600 text-xs truncate max-w-[140px]">{sub.email || '—'}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">{sub.phone || '—'}</p>
                      </td>
                      <td className="px-4 py-3"><p className="text-slate-500 text-xs">{sub.country || '—'}</p></td>
                      <td className="px-4 py-3"><span className="text-xs text-slate-600 font-medium">{planLabel(sub.subscriptionPlan)}</span></td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700 whitespace-nowrap">{fmtMoney(sub.price)}</td>
                      <td className="px-4 py-3"><Badge value={sub.isPaid ? 'Active' : (sub.status || 'Pending')} type="status" isPaid={sub.isPaid} /></td>
                      <td className="px-4 py-3"><Badge value={sub.paymentStatus} isPaid={sub.isPaid} /></td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(sub.createdAt)}</td>
                      <td className="px-4 py-3">
                        <RowActions
                          onView={() => onView(sub)}
                          onEdit={() => onEdit(sub)}
                          onDelete={() => onDelete(sub._id, 'individual')}
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
function AirlinesTable({ data, onView, onEdit, onDelete, deleting }) {
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 920 }}>
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
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-36">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              const primary = group[0]
              const key = (primary.airlineName || '').toLowerCase().trim() || primary._id
              const isOpen = !!expanded[key]
              const hasMany = group.length > 1
              const contactName = [primary.firstName, primary.lastName].filter(Boolean).join(' ') ||
                [primary.contactFirstName, primary.contactLastName].filter(Boolean).join(' ') || ''

              return (
                <React.Fragment key={key}>
                  {/* ── Primary row ── */}
                  <tr
                    className={`border-b border-slate-100 transition-colors cursor-pointer ${isOpen ? 'bg-slate-50' : 'hover:bg-slate-50/60'}`}
                    onClick={() => hasMany ? toggle(key) : onView(primary)}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-black text-white text-xs font-black flex items-center justify-center flex-shrink-0 select-none">✈</div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm leading-tight truncate max-w-[130px]">
                            {primary.airlineName || '—'}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[130px]">{contactName || primary.city || primary.country || '—'}</p>
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
                      <p className="text-slate-700 text-xs truncate max-w-[130px]">{primary.email || primary.contactEmail || '—'}</p>
                    </td>
                    <td className="px-4 py-4"><p className="text-slate-600 text-xs truncate max-w-[80px]">{primary.country || '—'}</p></td>
                    <td className="px-4 py-4"><span className="text-xs font-medium text-slate-700">{planLabel(primary.subscriptionPlan)}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                          {primary.certificateHolders?.length || 0}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                          {fmtMoney(primary.totalAmount || primary.totalServiceFees)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4"><Badge value={primary.isPaid ? 'Active' : (primary.status || 'Pending')} type="status" isPaid={primary.isPaid} /></td>
                    <td className="px-4 py-4"><Badge value={primary.paymentStatus} isPaid={primary.isPaid} /></td>
                    <td className="px-4 py-4 text-slate-400 text-xs whitespace-nowrap">{fmtDate(primary.createdAt)}</td>
                    <td className="px-4 py-4">
                      <RowActions
                        onView={() => onView(primary)}
                        onEdit={() => onEdit(primary)}
                        onDelete={() => onDelete(primary._id, 'airline')}
                        isDeleting={deleting === primary._id}
                      />
                    </td>
                  </tr>

                  {/* ── Sub-rows (collapsed) ── */}
                  {hasMany && isOpen && group.map((sub, si) => (
                    <tr key={sub._id + '-sub'}
                      className="border-b border-slate-100 bg-amber-50/30 hover:bg-amber-50/60 transition-colors cursor-pointer"
                      onClick={() => onView(sub)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 pl-4">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-px h-2 bg-amber-300" />
                            <div className="w-2 h-2 rounded-full bg-amber-400 border-2 border-white" />
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
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold">
                            {sub.certificateHolders?.length || 0}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                            {fmtMoney(sub.totalAmount || sub.totalServiceFees)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge value={sub.isPaid ? 'Active' : (sub.status || 'Pending')} type="status" isPaid={sub.isPaid} /></td>
                      <td className="px-4 py-3"><Badge value={sub.paymentStatus} isPaid={sub.isPaid} /></td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(sub.createdAt)}</td>
                      <td className="px-4 py-3">
                        <RowActions
                          onView={() => onView(sub)}
                          onEdit={() => onEdit(sub)}
                          onDelete={() => onDelete(sub._id, 'airline')}
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
  const airTotal   = airlines.reduce((s, r) => s + (Number(r.totalAmount) || Number(r.totalServiceFees) || 0), 0)
  const indPaid    = individuals.filter(r => r.isPaid === true || (r.isPaid == null && r.paymentStatus === 'paid')).length
  const airPaid    = airlines.filter(r => r.isPaid === true || (r.isPaid == null && r.paymentStatus === 'paid')).length
  const allHolders = airlines.reduce((s, r) => s + (r.certificateHolders?.length || 0), 0)
  const planCounts = {
    '1 Year':     individuals.filter(r => r.subscriptionPlan === '1 Year Subscription Plan').length,
    'Multi-Year': individuals.filter(r => r.subscriptionPlan === 'Multiple Years Subscription Plan').length,
    'Unlimited':  individuals.filter(r => r.subscriptionPlan === 'Unlimited Plan').length,
  }
  const countryCounts = {}
  individuals.forEach(r => { if (r.country) countryCounts[r.country] = (countryCounts[r.country] || 0) + 1 })
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
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5">Individual Plan Distribution</p>
          <div className="space-y-4">
            {Object.entries(planCounts).map(([plan, count]) => {
              const pct = individuals.length ? Math.round((count / individuals.length) * 100) : 0
              return (
                <div key={plan}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700">{plan}</span>
                    <span className="font-bold text-slate-900">{count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-red-600 rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5">Top Countries — Individuals</p>
          <div className="space-y-2">
            {topCountries.length === 0 ? <p className="text-sm text-slate-400">No data yet.</p> : topCountries.map(([country, count]) => (
              <div key={country} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-700 font-medium">{country}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.round((count / individuals.length) * 100)}%` }} />
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
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const tabFromPath = pathname.endsWith('/individuals') ? 'individuals' : pathname.endsWith('/airlines') ? 'airlines' : 'overview'
  const [tab, setTab] = useState(tabFromPath)
  useEffect(() => { setTab(tabFromPath) }, [pathname])

  const [individuals, setIndividuals] = useState([])
  const [airlines, setAirlines]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [loadErr, setLoadErr]         = useState('')
  const [search, setSearch]           = useState('')
  const [filterPlan, setFilterPlan]   = useState('All')
  const [filterPayment, setFilterPayment] = useState('All')
  const [filterStatus, setFilterStatus]   = useState('All')
  const [filterSubType, setFilterSubType] = useState('all')

  const [viewRec, setViewRec]   = useState(null)
  const [viewType, setViewType] = useState(null)
  const [editRec, setEditRec]   = useState(null)
  const [editType, setEditType] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [toast, setToast]       = useState(null)

  useEffect(() => { loadData() }, [])

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

  const multiKeySet = useMemo(() => {
    const src = tab === 'individuals' ? individuals : airlines
    const map = {}
    src.forEach(r => {
      const key = tab === 'airlines'
        ? (r.airlineName || '').toLowerCase().trim() || r._id
        : (r.email || '').toLowerCase().trim() || r._id
      map[key] = (map[key] || 0) + 1
    })
    return new Set(Object.entries(map).filter(([, c]) => c > 1).map(([k]) => k))
  }, [individuals, airlines, tab])

  const handleSave = async (id, data, type) => {
    setSaving(true)
    try {
      if (type === 'airline') { await updateAirlinesSubscription(id, data); setAirlines(p => p.map(x => x._id === id ? { ...x, ...data } : x)) }
      else { await updateIndividual(id, data); setIndividuals(p => p.map(x => x._id === id ? { ...x, ...data } : x)) }
      showToast('Record updated successfully')
    } catch (e) { showToast(e?.response?.data?.message || 'Save failed', 'error'); throw e }
    finally { setSaving(false) }
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

  const openView = (r, type) => { setViewRec(r); setViewType(type) }
  const closeView = () => { setViewRec(null); setViewType(null) }
  const openEditFromView = () => {
    const r = viewRec; const t = viewType; closeView()
    setTimeout(() => { setEditRec(r); setEditType(t) }, 50)
  }

  const src = tab === 'individuals' ? individuals : airlines

  const filtered = useMemo(() => src.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || (
      tab === 'individuals'
        ? [`${r.firstName || ''} ${r.lastName || ''}`, r.email, r.country, r.faaCertificateNumber, r.phone].some(v => String(v || '').toLowerCase().includes(q))
        : [r.airlineName, r.email || r.contactEmail, r.country, `${r.firstName || ''} ${r.lastName || ''}`].some(v => String(v || '').toLowerCase().includes(q))
    )
    const groupKey = tab === 'airlines'
      ? (r.airlineName || '').toLowerCase().trim() || r._id
      : (r.email || '').toLowerCase().trim() || r._id
    const isMulti = multiKeySet.has(groupKey)
    const matchSubType = filterSubType === 'all' || (filterSubType === 'multi' && isMulti) || (filterSubType === 'single' && !isMulti)

    return matchSearch
      && (filterPlan === 'All' || r.subscriptionPlan === filterPlan)
      && (filterPayment === 'All' || r.paymentStatus === filterPayment)
      && (filterStatus === 'All' || r.status === filterStatus)
      && matchSubType
  }), [src, search, filterPlan, filterPayment, filterStatus, filterSubType, tab, multiKeySet])

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

  const multiAccountCount = useMemo(() => multiKeySet.size, [multiKeySet])

  const PLANS    = ['All', '1 Year Subscription Plan', 'Multiple Years Subscription Plan', 'Unlimited Plan']
  const PAYMENTS = ['All', 'pending', 'paid', 'failed']
  const STATUSES = ['All', 'Pending', 'Active', 'Inactive']

  const TAB_CONFIG = [
    { key: 'overview',    label: 'Overview',    count: null },
    { key: 'individuals', label: 'Individuals', count: individuals.length },
    { key: 'airlines',    label: 'Airlines',    count: airlines.length },
  ]

  const clearFilters = () => { setSearch(''); setFilterPlan('All'); setFilterPayment('All'); setFilterStatus('All'); setFilterSubType('all') }
  const hasActiveFilters = search || filterPlan !== 'All' || filterPayment !== 'All' || filterStatus !== 'All' || filterSubType !== 'all'

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

      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Admin Control Center</p>
        <h1 className="text-2xl font-black text-slate-900">Registrations Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Manage all pilot and airline operator registrations.</p>
      </div>

      {loadErr && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></svg>
          <span>{loadErr}</span>
          <button onClick={loadData} className="ml-auto font-semibold underline hover:no-underline">Retry</button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-6 shadow-sm">
        {/* Tab bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap gap-2">
            {TAB_CONFIG.map(t => (
              <button key={t.key}
                onClick={() => {
                  const path = t.key === 'overview' ? '/admin' : t.key === 'individuals' ? '/admin/individuals' : '/admin/airlines'
                  navigate(path)
                  clearFilters()
                }}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${tab === t.key ? 'bg-red-600 text-white shadow-sm' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {t.label}
                {t.count !== null && (
                  <span className={`rounded-full px-2 py-0.5 text-xs ${tab === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
          <button onClick={loadData} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3M4 4v5h5M20 20v-5h-5" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Filter bar */}
        {tab !== 'overview' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="m20 20-3.5-3.5" /></svg>
              <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 w-44 bg-white transition" />
            </div>
            <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
              className="border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl bg-white outline-none focus:border-red-500 text-slate-600 transition">
              {PLANS.map(p => <option key={p} value={p}>{p === 'All' ? 'All Plans' : p}</option>)}
            </select>
            <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
              className="border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl bg-white outline-none focus:border-red-500 text-slate-600 transition">
              {PAYMENTS.map(p => <option key={p} value={p}>{p === 'All' ? 'All Payments' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl bg-white outline-none focus:border-red-500 text-slate-600 transition">
              {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
            </select>
            <div className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden text-xs font-semibold">
              {[
                { val: 'all',    label: 'All Accounts' },
                { val: 'multi',  label: `Multiple Subs${multiAccountCount > 0 ? ` (${multiAccountCount})` : ''}` },
                { val: 'single', label: 'Single Sub' },
              ].map(opt => (
                <button key={opt.val} onClick={() => setFilterSubType(opt.val)}
                  className={`px-3 py-2 transition-colors whitespace-nowrap ${filterSubType === opt.val ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            <a href={tab === 'individuals' ? exportIndividualsExcel() : exportAirlinesExcel()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition ml-auto">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0-4-4m4 4 4-4M4 20h16" /></svg>
              Export Excel
            </a>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-red-600 font-semibold hover:underline px-1">Clear filters</button>
            )}
          </div>
        )}
      </div>

      {tab !== 'overview' && !loading && (
        <div className="flex items-center gap-3 mb-4 px-1">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-800">{uniqueAccountCount}</span> account{uniqueAccountCount !== 1 ? 's' : ''}{' '}
            <span className="text-slate-400">({filtered.length} total subscription{filtered.length !== 1 ? 's' : ''})</span>
          </p>
          {filterSubType === 'multi' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-300 px-3 py-1 text-[11px] font-bold text-amber-700">
              Showing accounts with multiple subscriptions only
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-red-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading records…</p>
        </div>
      ) : tab === 'overview' ? (
        <OverviewPanel individuals={individuals} airlines={airlines} />
      ) : tab === 'individuals' ? (
        <IndividualsTable data={filtered} onView={r => openView(r, 'individual')} onEdit={r => { setEditRec(r); setEditType('individual') }} onDelete={handleDelete} deleting={deleting} />
      ) : (
        <AirlinesTable data={filtered} onView={r => openView(r, 'airline')} onEdit={r => { setEditRec(r); setEditType('airline') }} onDelete={handleDelete} deleting={deleting} />
      )}
    </DashboardLayout>
  )
}
