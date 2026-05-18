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
  bulkDeleteIndividuals,
  bulkDeleteAirlines,
  setIndividualRenewalInvoice,
  setAirlinesRenewalInvoice,
  updateIndividualRenewalDetails,
  updateAirlinesRenewalDetails,
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
  activateQueuedRenewal,
  sendRenewalReminders,
} from '../services/api'

const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const fmtDateYMD = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const fmtDateMDY = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const y = d.getFullYear()
  return `${m}-${day}-${y}`
}

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
  let cls = 'inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] whitespace-nowrap '
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

function StatusText({ value, type = 'payment', isPaid }) {
  let label = value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Pending'
  let color = '#64748b'
  if (type === 'status') {
    const trulyActive = value === 'Active' && isPaid !== false
    if (trulyActive) { color = '#047857'; label = 'Active' }
    else if (value === 'Pending') { color = '#92400e'; label = 'Pending' }
    else { color = '#64748b' }
    if (value === 'Active' && isPaid === false) label = 'Pending'
  } else if (type === 'isPaid') {
    if (isPaid === true) { color = '#047857'; label = 'Paid' }
    else { color = '#92400e'; label = 'Unpaid' }
  } else {
    const confirmedPaid = value === 'paid' && isPaid !== false
    if (confirmedPaid) { color = '#047857'; label = 'Paid' }
    else if (value === 'failed') { color = '#dc2626'; label = 'Failed' }
    else { color = '#92400e'; label = 'Pending' }
  }
  return <span className='text-sm font-semibold' style={{ color }}>{label}</span>
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

// ─── NextRenewalSection — shared between Individual & Airline view modals ──────
function NextRenewalSection({ record, registrationModel, onRecordUpdated }) {
  const nr = record.nextRenewal
  if (!nr?.paidAt) return null

  const activationDate = nr.activationDate ? new Date(nr.activationDate) : null
  // Only show for genuinely queued renewals (activation is in the future).
  if (!activationDate || activationDate <= new Date()) return null

  // Airline fallback: divide by (ppc × committedCount) to get years, not just ppc
  const ppcFallback   = Number(record.pricePerCertificate || 55)
  const countFallback = Number(nr.committedCount || record.committedCount || 1)
  const pricePerYear  = registrationModel !== 'Individual' ? ppcFallback * countFallback : 55
  const nrPlanLabel = nr.plan === 'Multiple Years Subscription Plan'
    ? `Multiple Years (${Number(nr.multiYearCount) > 1 ? Number(nr.multiYearCount) : Math.max(2, Math.round(Number(nr.price || 0) / pricePerYear))} yrs)`
    : nr.plan === 'Unlimited Plan'
      ? 'Unlimited Plan'
      : (nr.plan || '—')

  const [activating, setActivating] = React.useState(false)
  const [activateErr, setActivateErr] = React.useState('')
  const [editing, setEditing] = React.useState(false)
  const [savingEdit, setSavingEdit] = React.useState(false)
  const [editErr, setEditErr] = React.useState('')

  const fmtInput = (v) => {
    if (!v) return ''
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  }

  const [editForm, setEditForm] = React.useState({
    plan: nr.plan || '',
    multiYearCount: nr.multiYearCount || '',
    committedCount: nr.committedCount || '',
    activationDate: fmtInput(nr.activationDate),
    expiresAt: fmtInput(nr.expiresAt),
    price: nr.price ?? '',
    invoiceNumber: nr.invoiceNumber || '',
  })

  const setEdit = (field, value) => setEditForm((prev) => ({ ...prev, [field]: value }))

  const handleActivate = async () => {
    if (!window.confirm(`Activate queued plan now?\n\nThis will:\n� Switch plan to: ${nrPlanLabel}\n� Set expiry to: ${fmtDate(nr.expiresAt)}\n� Use invoice: ${nr.invoiceNumber || '�'}\n\nThis cannot be undone automatically.`)) return
    setActivating(true)
    setActivateErr('')
    try {
      const res = await activateQueuedRenewal(record._id, registrationModel)
      onRecordUpdated?.(res.data?.data)
    } catch (e) {
      setActivateErr(e?.response?.data?.message || 'Activation failed.')
    } finally {
      setActivating(false)
    }
  }

  const handleSaveEdit = async () => {
    setSavingEdit(true)
    setEditErr('')
    try {
      const payload = {
        plan: editForm.plan,
        activationDate: editForm.activationDate,
        expiresAt: editForm.expiresAt,
        price: Number(editForm.price),
        invoiceNumber: editForm.invoiceNumber,
      }

      if (editForm.plan === 'Multiple Years Subscription Plan') {
        payload.multiYearCount = Number(editForm.multiYearCount)
      }
      if (registrationModel === 'Airlines' && editForm.committedCount !== '') {
        payload.committedCount = Number(editForm.committedCount)
      }

      const res = registrationModel === 'Airlines'
        ? await updateAirlinesRenewalDetails(record._id, payload)
        : await updateIndividualRenewalDetails(record._id, payload)

      setEditing(false)
      onRecordUpdated?.(res.data?.data)
    } catch (e) {
      setEditErr(e?.response?.data?.message || 'Failed to update queued renewal.')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="border-t border-emerald-100 pt-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 pt-1">Next / Upcoming Plan</p>
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-600">
            Queued
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditErr('')
              setEditing((v) => !v)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition"
          >
            Edit Queued Plan
          </button>
          <button
            onClick={handleActivate}
            disabled={activating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-1.5 text-[11px] font-bold text-white transition"
          >
            {activating ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20"/><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z"/></svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            )}
            {activating ? 'Activating�' : 'Activate Now'}
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        {editing && (
          <div className="rounded-lg border border-emerald-300 bg-white p-3 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Plan</label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  value={editForm.plan}
                  onChange={(e) => setEdit('plan', e.target.value)}
                >
                  <option value="1 Year Subscription Plan">1 Year Subscription Plan</option>
                  <option value="Multiple Years Subscription Plan">Multiple Years Subscription Plan</option>
                  <option value="Unlimited Plan">Unlimited Plan</option>
                </select>
              </div>
              {editForm.plan === 'Multiple Years Subscription Plan' && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Years</label>
                  <input
                    type="number"
                    min="2"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    value={editForm.multiYearCount}
                    onChange={(e) => setEdit('multiYearCount', e.target.value)}
                  />
                </div>
              )}
              {registrationModel === 'Airlines' && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Committed Count</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    value={editForm.committedCount}
                    onChange={(e) => setEdit('committedCount', e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Activation Date</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  value={editForm.activationDate}
                  onChange={(e) => setEdit('activationDate', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Expires At</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  value={editForm.expiresAt}
                  onChange={(e) => setEdit('expiresAt', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Amount Paid</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  value={editForm.price}
                  onChange={(e) => setEdit('price', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Invoice #</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  value={editForm.invoiceNumber}
                  onChange={(e) => setEdit('invoiceNumber', e.target.value)}
                />
              </div>
            </div>
            {editErr && <p className="mt-2 text-[11px] text-red-600 font-semibold">{editErr}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-1.5 text-[11px] font-bold text-white"
              >
                {savingEdit ? 'Saving�' : 'Save Queued Plan'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ViewField label="Next Plan" value={nrPlanLabel} />
          <ViewField label="Paid On" value={fmtDate(nr.paidAt)} />
          <ViewField label="Activates On" value={fmtDate(nr.activationDate)} />
          <ViewField label={nr.plan === 'Unlimited Plan' ? 'Duration' : 'Expires On'} value={nr.plan === 'Unlimited Plan' ? 'Never (Unlimited)' : fmtDate(nr.expiresAt)} />
          <ViewField label="Amount Paid" value={fmtMoney(nr.price)} />
          <ViewField label="Invoice #" value={nr.invoiceNumber} />
        </div>
        <p className="mt-3 text-[10px] text-emerald-600 leading-relaxed">
          Current plan remains active until {fmtDateYMD(record.expirationDate)}. Queued plan activates automatically on {fmtDateYMD(nr.activationDate)}.
        </p>
        {activateErr && (
          <p className="mt-2 text-[11px] text-red-600 font-semibold">{activateErr}</p>
        )}
      </div>
    </div>
  )
}

function triggerInvoiceDownload({ url, filename }) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}


// ─── AdminInvoicesPanel — shows all invoices for a registration ───────────────
function AdminInvoicesPanel({ registrationId, registrationModel, record }) {
  const [invoices, setInvoices] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [editing, setEditing] = React.useState(null)
  const [editForm, setEditForm] = React.useState({})
  const [saving, setSaving] = React.useState(false)
  const [saveErr, setSaveErr] = React.useState('')
  const [pdfBusy, setPdfBusy] = React.useState({})

  const load = React.useCallback(async () => {
    if (!registrationId) return
    setLoading(true); setError('')
    try {
      const res = await getInvoiceByRegistration(registrationId)
      setInvoices(res.data?.data || res.data || [])
    } catch (e) {
      setError('Failed to load invoices.')
    } finally {
      setLoading(false)
    }
  }, [registrationId])

  // Auto-load when panel mounts
  React.useEffect(() => { load() }, [load])

  // If record.invoiceNumber not represented in any source, synthesize an item from the record.
  const visibleInvoices = React.useMemo(() => {
    if (!invoices) return null
    const regNum = record?.invoiceNumber
    if (!regNum) return invoices
    const normalize = (s) => String(s || '').replace(/^Invoice\s+/i, '').trim().toUpperCase()
    const normReg = normalize(regNum)
    const alreadyIn = invoices.some(i => normalize(i.invoiceNumber) === normReg)
    if (alreadyIn) return invoices
    const isAirline = registrationModel !== 'Individual'
    const holderCount = Number(record?.committedCount || record?.holderCountValue || record?.certificateHolders?.length || 1)
    const pricePerCert = Number(record?.pricePerCertificate || record?.pricePerCert || 0)
    const totalAmount = isAirline && pricePerCert > 0
      ? pricePerCert * holderCount
      : Number(record?.price || record?.totalAmount || record?.amountPaid || 0)
    const planBase = (record?.subscriptionPlan || '1 Year Plan')
      .replace(' Subscription Plan', '').replace(' Plan', '')
    const lineItems = [{
      description: 'Agent For Service - ' + planBase,
      quantity: isAirline ? holderCount : 1,
      unitPrice: isAirline ? pricePerCert : totalAmount,
      totalPrice: totalAmount,
    }]
    const synthetic = {
      _id:           'reg-' + registrationId,
      _source:       'registration',
      invoiceNumber: regNum,
      totalAmount,
      createdAt:     record?.subscriptionDate || record?.createdAt,
      paidAt:        record?.subscriptionDate || record?.updatedAt,
      plan:          record?.subscriptionPlan || '',
      draft: {
        invoiceNumber:     regNum,
        issueDate:         record?.subscriptionDate || record?.createdAt,
        payableBy:         null,
        recipientName:     isAirline
          ? [record?.firstName, record?.lastName].filter(Boolean).join(' ')
          : [record?.firstName, record?.middleName, record?.lastName].filter(Boolean).join(' '),
        recipientCompany:  isAirline ? (record?.airlineName || '') : '',
        recipientContact:  isAirline
          ? [record?.firstName, record?.lastName].filter(Boolean).join(' ')
          : [record?.firstName, record?.middleName, record?.lastName].filter(Boolean).join(' '),
        recipientAddress1: [record?.addressLine1, record?.city, record?.state, record?.postalCode, record?.country].filter(Boolean).join(', '),
        recipientAddress2: '',
        recipientCountry:  record?.country || '',
        paymentMethod:     'wire',
        lineItems,
      },
    }
    return [synthetic, ...invoices]
  }, [invoices, record, registrationId, registrationModel])

  const buildPdfPayload = (inv) => {
    const d = inv.draft || {}
    return {
      invoiceNumber:     d.invoiceNumber     || inv.invoiceNumber || '',
      issueDate:         d.issueDate         || inv.issueDate     || inv.paidAt,
      payableBy:         d.payableBy         || inv.payableBy,
      recipientCompany:  d.recipientCompany  || inv.recipientCompany || '',
      recipientName:     d.recipientName     || inv.recipientName || '',
      recipientContact:  d.recipientContact  || inv.recipientContact || d.recipientName || inv.recipientName || '',
      recipientAddress1: d.recipientAddress1 || inv.recipientAddress1 || '',
      recipientAddress2: d.recipientAddress2 || inv.recipientAddress2 || '',
      recipientCountry:  d.recipientCountry  || inv.recipientCountry || '',
      paymentMethod:     d.paymentMethod     || inv.paymentMethod || '',
      lineItems:         d.lineItems?.length ? d.lineItems : (inv.lineItems || []),
    }
  }

  const handlePdf = async (inv, download) => {
    setPdfBusy(b => ({ ...b, [inv._id]: true }))
    try {
      const result = await generateIFOAInvoicePDF(buildPdfPayload(inv))
      if (download) {
        triggerInvoiceDownload(result)
      } else {
        window.open(result.url, '_blank')
      }
    } catch (e) {
      alert('PDF generation failed: ' + e.message)
    } finally {
      setPdfBusy(b => ({ ...b, [inv._id]: false }))
    }
  }

  const openEdit = (inv) => {
    const d = inv.draft || {}
    const items = d.lineItems?.length ? d.lineItems : (inv.lineItems || [])
    const item = items[0] || {}
    setEditForm({
      invoiceNumber:     d.invoiceNumber     || inv.invoiceNumber || '',
      recipientName:     d.recipientName     || inv.recipientName || '',
      recipientCompany:  d.recipientCompany  || inv.recipientCompany || '',
      recipientAddress1: d.recipientAddress1 || inv.recipientAddress1 || '',
      recipientCountry:  d.recipientCountry  || inv.recipientCountry || '',
      paymentMethod:     d.paymentMethod     || inv.paymentMethod || '',
      description:       item.description || (inv.plan ? 'Agent For Service - ' + inv.plan.replace(' Subscription Plan','').replace(' Plan','') : ''),
      quantity:          String(item.quantity ?? '1'),
      unitPrice:         String(item.unitPrice ?? inv.totalAmount ?? ''),
      totalPrice:        String(item.totalPrice ?? inv.totalAmount ?? ''),
    })
    setSaveErr('')
    setEditing(inv)
  }

  const handleSave = async () => {
    if (!editing) return
    // Renewal-source items don't have an Invoice doc yet — create one via PATCH
    // which requires an existing Invoice._id. For renewals, prompt admin to use
    // the main admin invoice editor to generate the invoice first.
    if (editing._source === 'renewal' && !editing._invoiceDocId) {
      setSaveErr('No Invoice doc exists for this renewal. Generate invoice from the main editor first.')
      return
    }
    setSaving(true); setSaveErr('')
    try {
      const qty = Number(editForm.quantity) || 1
      const unit = Number(editForm.unitPrice) || 0
      const total = Number(editForm.totalPrice) || qty * unit
      const draft = {
        invoiceNumber:     editForm.invoiceNumber,
        issueDate:         editing.draft?.issueDate || editing.issueDate || editing.paidAt,
        payableBy:         editing.draft?.payableBy || editing.payableBy,
        recipientName:     editForm.recipientName,
        recipientCompany:  editForm.recipientCompany,
        recipientContact:  editForm.recipientName,
        recipientAddress1: editForm.recipientAddress1,
        recipientAddress2: editing.draft?.recipientAddress2 || '',
        recipientCountry:  editForm.recipientCountry,
        paymentMethod:     editForm.paymentMethod,
        lineItems: [{
          description: editForm.description,
          quantity:    qty,
          unitPrice:   unit,
          totalPrice:  total,
        }],
      }
      await saveInvoiceDraftToDoc(editing._id, draft, editForm.invoiceNumber)
      setEditing(null)
      await load()
    } catch (e) {
      setSaveErr(e?.response?.data?.message || e.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const fmtInvDate = (d) => d
    ? new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

  const fmtAmt = (n) => n != null
    ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'

  const renewalStatusColor = (s) => {
    if (s === 'queued')      return '#92400e'
    if (s === 'active')      return '#047857'
    if (s === 'superseded')  return '#94a3b8'
    return '#64748b'
  }

  const hasPdf = (inv) => !!(inv.draft?.lineItems?.length || inv.lineItems?.length)

  return (
    <div className="border-t border-slate-100 pt-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">All Invoices</p>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {loading && visibleInvoices === null && (
        <p className="text-xs text-slate-400 italic">Loading invoices…</p>
      )}

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {!loading && visibleInvoices !== null && visibleInvoices.length === 0 && (
        <p className="text-xs text-slate-400 italic">No invoices found.</p>
      )}

      {visibleInvoices !== null && visibleInvoices.length > 0 && (
        <div className="space-y-2">
          {visibleInvoices.map((inv) => (
            <div key={String(inv._id)} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-bold text-slate-800">{inv.invoiceNumber || '(no number)'}</p>
                    {inv._source === 'renewal' && (
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200"
                        style={{ color: renewalStatusColor(inv.status) }}>
                        Renewal · {inv.status || 'queued'}
                      </span>
                    )}
                    {inv._source === 'payment' && (
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500">
                        Legacy
                      </span>
                    )}
                    {inv._source === 'registration' && (
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700">
                        Active Plan
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{fmtInvDate(inv.createdAt)}</p>
                  <p className="text-[10px] text-slate-400">{fmtAmt(inv.totalAmount)}</p>
                  {inv.plan && <p className="text-[10px] text-slate-400">{inv.plan}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {hasPdf(inv) && (
                    <>
                      <button
                        onClick={() => handlePdf(inv, false)}
                        disabled={pdfBusy[inv._id]}
                        className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white rounded-lg px-2.5 py-1 transition disabled:opacity-50"
                      >
                        {pdfBusy[inv._id] ? '…' : 'View'}
                      </button>
                      <button
                        onClick={() => handlePdf(inv, true)}
                        disabled={pdfBusy[inv._id]}
                        className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white rounded-lg px-2.5 py-1 transition disabled:opacity-50"
                      >
                        Download
                      </button>
                    </>
                  )}
                  {inv._source !== 'renewal' && inv._source !== 'payment' && inv._source !== 'registration' && (
                    <button
                      onClick={() => editing?._id === inv._id ? setEditing(null) : openEdit(inv)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 bg-white rounded-lg px-2.5 py-1 transition"
                    >
                      {editing?._id === inv._id ? 'Cancel' : 'Edit'}
                    </button>
                  )}
                </div>
              </div>

              {editing?._id === inv._id && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                  {[
                    ['Invoice #',     'invoiceNumber'],
                    ['Recipient Name','recipientName'],
                    ['Company',       'recipientCompany'],
                    ['Address',       'recipientAddress1'],
                    ['Country',       'recipientCountry'],
                    ['Payment Method','paymentMethod'],
                    ['Description',   'description'],
                    ['Quantity',      'quantity'],
                    ['Unit Price',    'unitPrice'],
                    ['Total Price',   'totalPrice'],
                  ].map(([label, key]) => (
                    <div key={key} className="flex items-center gap-2">
                      <label className="w-28 text-[10px] font-semibold text-slate-500 flex-shrink-0">{label}</label>
                      <input
                        value={editForm[key] || ''}
                        onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                        className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                  ))}
                  {saveErr && <p className="text-[11px] text-red-600 font-semibold">{saveErr}</p>}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save Invoice'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


function IndividualViewModal({ record, onClose, onEdit, onRecordUpdated }) {
  const fullName = [record.firstName, record.middleName, record.lastName].filter(Boolean).join(' ') || 'Individual'
  const [showInvoices, setShowInvoices] = useState(false)
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
              <button onClick={() => setShowInvoices(v => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                All Invoices
              </button>
              <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" /></svg>
                Edit
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition">✕</button>
            </div>
          </div>
          <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
            {showInvoices && <AdminInvoicesPanel registrationId={record._id} registrationModel="Individual" record={record} />}
            <div><SectionHead label="Status & Subscription" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <ViewField label="Status" value={<StatusText value={record.isPaid ? 'Active' : (record.status || 'Pending')} type="status" isPaid={record.isPaid} />} />
                <ViewField label="Payment Confirmed" value={<StatusText type="isPaid" isPaid={record.isPaid} />} />
                <ViewField label="Payment Status" value={<StatusText value={record.paymentStatus} isPaid={record.isPaid} />} />
                <ViewField label="Invoice" value={record.invoiceStatus} />
                <ViewField label="Invoice #" value={record.invoiceNumber} />
                <ViewField label="Plan" value={record.subscriptionPlan} />
                <ViewField label="Subscription Date" value={record.subscriptionDate ? fmtDateYMD(record.subscriptionDate) : (record.isPaid ? fmtDateYMD(record.updatedAt) : 'Activates on payment')} />
                <ViewField label="Expiration Date" value={record.subscriptionPlan === 'Unlimited Plan' ? 'Never (Unlimited)' : record.expirationDate ? fmtDateYMD(record.expirationDate) : record.isPaid ? '—' : 'Activates on payment'} />
                <ViewField label="Price" value={fmtMoney(record.price)} />
                <ViewField label="Service Fees" value={fmtMoney(record.totalServiceFees)} />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-5"><SectionHead label="Personal Information" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <ViewField label="First Name" value={record.firstName} />
                <ViewField label="Middle Name" value={record.middleName} />
                <ViewField label="Last Name" value={record.lastName} />
                <ViewField label="DOB" value={record.dateOfBirth ? fmtDateMDY(record.dateOfBirth) : '—'} />
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
            <NextRenewalSection record={record} registrationModel="Individual" onRecordUpdated={onRecordUpdated} />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ─── Airline View Modal ────────────────────────────────────────────────────────
function AirlineViewModal({ record, onClose, onEdit, onRecordUpdated }) {
  const [showInvoices, setShowInvoices] = useState(false)
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
              <button onClick={() => setShowInvoices(v => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                All Invoices
              </button>
              <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" /></svg>
                Edit
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition">✕</button>
            </div>
          </div>
          <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
            {showInvoices && <AdminInvoicesPanel registrationId={record._id} registrationModel="Airlines" record={record} />}
            <div><SectionHead label="Status & Subscription" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <ViewField label="Status" value={<StatusText value={record.isPaid ? 'Active' : (record.status || 'Pending')} type="status" isPaid={record.isPaid} />} />
                <ViewField label="Payment Confirmed" value={<StatusText type="isPaid" isPaid={record.isPaid} />} />
                <ViewField label="Payment" value={<StatusText value={record.paymentStatus} isPaid={record.isPaid} />} />
                <ViewField label="Invoice" value={record.invoiceStatus} />
                <ViewField label="Wire Request" value={record.wirePaymentRequested ? `Requested${record.wirePaymentRequestedAt ? ` on ${fmtDate(record.wirePaymentRequestedAt)}` : ''}` : 'No'} />
                <ViewField label="Invoice #" value={record.invoiceNumber} />
                <ViewField label="Plan" value={record.subscriptionPlan} />
                <ViewField label="Holder Count" value={record.holderCount} />
                <ViewField label="Exact Count" value={record.holderCountValue} />
                <ViewField label="Subscription Date" value={record.subscriptionDate ? fmtDateYMD(record.subscriptionDate) : (record.isPaid ? fmtDateYMD(record.updatedAt) : 'Activates on payment')} />
                <ViewField label="Expiration Date" value={record.subscriptionPlan === 'Unlimited Plan' ? 'Never (Unlimited)' : record.expirationDate ? fmtDateYMD(record.expirationDate) : record.isPaid ? '—' : 'Activates on payment'} />
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
                <ViewField label="Date of Birth" value={record.dateOfBirth ? fmtDateMDY(record.dateOfBirth) : '—'} />
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
            <NextRenewalSection record={record} registrationModel="Airlines" onRecordUpdated={onRecordUpdated} />
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
  const showInvoiceWarning = form.isPaid === true && !form.invoiceNumber
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
          <div className="px-6 py-5 space-y-6 max-h-[68vh] overflow-y-auto overflow-x-clip">
            {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
            {showInvoiceWarning && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <div>
                  <p className="font-bold">Generate an invoice before marking as Paid</p>
                  <p className="text-xs text-amber-700 mt-0.5">Please generate and save an invoice number first, then set payment as Paid. This ensures each payment has a unique invoice reference.</p>
                </div>
              </div>
            )}
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
  const showInvoiceWarning = form.isPaid === true && !form.invoiceNumber
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
          <div className="px-6 py-5 space-y-6 max-h-[68vh] overflow-y-auto overflow-x-clip">
            {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
            {showInvoiceWarning && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <div>
                  <p className="font-bold">Generate an invoice before marking as Paid</p>
                  <p className="text-xs text-amber-700 mt-0.5">Please generate and save an invoice number first, then set payment as Paid. This ensures each payment has a unique invoice reference.</p>
                </div>
              </div>
            )}
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

  txt('Invoice  ' + displayInvoiceNumber, ML, Y, { size: 12, font: fontBold })
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

  const C = { pos: ML, desc: ML + 28, qtyR: ML + W - 160, unitR: ML + W - 70, total: ML + W }
  const TH_Y = Y
  const TH_H = 16
  rect(ML, TH_Y - TH_H + 4, W, TH_H, LGRAY)
  txt('Pos.',          C.pos,  TH_Y - 8, { size: 8, font: fontBold })
  txt('Description',  C.desc, TH_Y - 8, { size: 8, font: fontBold })
  txtR('Quantity',    C.qtyR, TH_Y - 8, { size: 8, font: fontBold })
  txtR('Unit Price',  C.unitR, TH_Y - 8, { size: 8, font: fontBold })
  txtR('Total Price USD', C.total, TH_Y - 8, { size: 8, font: fontBold })
  Y = TH_Y - TH_H - 2
  line(ML, Y, ML + W, Y, BORDER, 0.4)
  Y -= 12

  const items = inv.lineItems || []
  items.forEach((item, i) => {
    const rowY = Y
    txt(String(i + 1), C.pos, rowY, { size: 9 })
    txt(item.description, C.desc, rowY, { size: 9, maxWidth: C.qtyR - C.desc - 30 })
    txtR(String(item.quantity), C.qtyR, rowY, { size: 9 })
    txtR(fmtM(item.unitPrice), C.unitR, rowY, { size: 9 })
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

// ─── Helper: download a blob URL ──────────────────────────────────────────────
function triggerDownload({ url, filename }) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ─── Admin Invoice Modal ───────────────────────────────────────────────────────
// initialStep: 'select' (default) | 'edit'  — which step to open at
// autoPreview: if true, generates and opens the PDF preview immediately on mount
// previewOnly: if true, only shows preview modal (for existing invoices)
function AdminInvoiceModal({ record, type, onClose, onSaveInvoice, initialStep = 'select', autoPreview = false, previewOnly = false }) {
  const isAirline = type === 'airline'
  const today = new Date()
  const payable = new Date(today); payable.setDate(payable.getDate() + 30)
  const fmtInput = (d) => d ? new Date(d).toISOString().slice(0, 10) : ''

  // The invoice number is resolved and persisted BEFORE the modal opens (in resolveInvoiceNumber).
  // record.invoiceNumber is always set by the time this component mounts.
  const [fetchedInvoiceNumber] = React.useState(record.invoiceNumber || '')
  const defaultInvoiceNumber = fetchedInvoiceNumber
  const holderCount = Number(
    record.committedCount || record.holderCountValue || record.certificateHolders?.length || 1
  ) || 1
  const pricePerCert = Number(record.pricePerCertificate || record.pricePerCert || (isAirline ? 49 : 0))
  const paidConfirmed = record?.isPaid === true || record?.paymentStatus === 'paid'

  const fallbackTotal = isAirline
    ? Number(record.totalAmount ?? (pricePerCert * holderCount) ?? 0)
    : Number(record.price || record.totalServiceFees || 0)

  const computedAirlineTotal = isAirline ? (pricePerCert * holderCount) : 0

  const paidTotal = Number(
    record.amountPaid || record.totalAmount || record.price || record.totalServiceFees || 0
  )

  const totalAmt = isAirline
    ? (paidConfirmed && paidTotal > 0 ? Math.max(paidTotal, computedAirlineTotal) : computedAirlineTotal)
    : (paidConfirmed && paidTotal > 0 ? paidTotal : fallbackTotal)
  const unitPrice = isAirline ? Number((totalAmt / holderCount).toFixed(2)) : totalAmt
  const planDesc     = `Agent For Service – ${(record.subscriptionPlan || '1 Year Plan').replace(' Subscription Plan','').replace(' Plan','')}`

  const paidByCard = record?.paymentMethodType === 'card' || Boolean(record?.stripePaymentIntentId)
  const wireRequested = Boolean(record?.wirePaymentRequested || record?.invoiceStatus === 'Wire Requested')
  const defaultPaymentMethod = record?.invoiceDraft?.paymentMethod || (isAirline ? (wireRequested ? 'wire' : 'card') : 'card')

  const [paymentMethodSel, setPaymentMethodSel] = useState(
    initialStep === 'edit' ? defaultPaymentMethod : ''
  )
  const [step, setStep] = useState(initialStep)
  const autoPreviewFired = useRef(false)
  const [savingInvoice, setSavingInvoice] = useState(false)

  const [previewData, setPreviewData] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saveError, setSaveError] = useState('')

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

  const draftItems = Array.isArray(record.invoiceDraft?.lineItems) ? record.invoiceDraft.lineItems : []
  const hasSavedDraft = draftItems.length > 0

  const mergedInvoice = {
    ...initialInvoice,
    ...(record.invoiceDraft || {}),
    lineItems: hasSavedDraft ? draftItems : initialInvoice.lineItems,
  }

  const [inv, setInv] = useState(mergedInvoice)

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

  useEffect(() => {
    if (autoPreview && step === 'edit' && !autoPreviewFired.current) {
      autoPreviewFired.current = true
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
  const adjustInvoiceNumber = (delta) => {
    const current = String(inv.invoiceNumber || '').trim()
    if (!current) return

    // Preferred format: "Invoice US-34-26" -> adjust 34 only
    const standard = current.match(/^(.*?US-)(\d+)(-\d{2})(.*)$/i)
    if (standard) {
      const [, prefix, seqStr, yearPart, suffix] = standard
      const nextSeq = Math.max(1, Number(seqStr) + delta)
      set('invoiceNumber', `${prefix}${nextSeq}${yearPart}${suffix}`)
      return
    }

    // Fallback: adjust the first numeric block found.
    const generic = current.match(/^(\D*?)(\d+)(.*)$/)
    if (generic) {
      const [, prefix, numStr, suffix] = generic
      const nextNum = Math.max(1, Number(numStr) + delta)
      set('invoiceNumber', `${prefix}${nextNum}${suffix}`)
    }
  }

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

  const handleSaveInvoice = async () => {
    setSavingInvoice(true)
    setSaveError('')
    const payload = {
      invoiceNumber:    inv.invoiceNumber,
      invoiceStatus:    'Generated',
      invoiceGenerated: true,
      invoiceDraft:     inv,
    }
    try {
      await onSaveInvoice(record._id, type, payload)
      setSavedSnapshot(serializeInvoice(inv))
    } catch (err) {
      setSaveError(err?.response?.data?.message || 'Could not save invoice changes.')
    } finally {
      setSavingInvoice(false)
    }
  }

  const handleDownloadFromPreview = async () => {
    if (!previewData) return
    triggerDownload(previewData)
  }

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
              {saveError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-red-700 font-semibold">{saveError}</p>
                </div>
              )}

              {autoPreview && previewLoading && (
                <div className="flex items-center justify-center py-3">
                  <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>
                </div>
              )}

              {record.invoiceGenerated && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <div>
                    <p className="text-xs font-black text-amber-800 mb-0.5">Invoice changes only</p>
                    <p className="text-[11px] text-amber-700 leading-snug">Saving updates the invoice document only — it does <strong>not</strong> change the registration data (payment status, subscription plan, holder count, etc.). The user will see the updated invoice on their Subscription page.</p>
                  </div>
                </div>
              )}

              <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${
                inv.paymentMethod === 'wire'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {inv.paymentMethod === 'wire' ? 'Wire Transfer Invoice' : 'Card Payment Invoice'}
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">Invoice Details</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Invoice Number</label>
                    <div className="relative">
                      <input
                        className={`${iCls} pr-10`}
                        value={inv.invoiceNumber}
                        onChange={e => set('invoiceNumber', e.target.value)}
                      />
                      <div className="absolute right-1 top-1 bottom-1 flex flex-col">
                        <button
                          type="button"
                          aria-label="Increase invoice number"
                          onClick={() => adjustInvoiceNumber(1)}
                          className="h-1/2 px-1.5 rounded-t-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          aria-label="Decrease invoice number"
                          onClick={() => adjustInvoiceNumber(-1)}
                          className="h-1/2 px-1.5 rounded-b-md border border-t-0 border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Issue Date</label><input className={iCls} type="date" value={inv.issueDate} onChange={e => set('issueDate', e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Payable By</label><input className={iCls} type="date" value={inv.payableBy} onChange={e => set('payableBy', e.target.value)} /></div>
                </div>
              </div>

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
              <div className="border-b border-slate-100 bg-slate-50 px-6 py-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Invoice {previewOnly ? 'Preview' : 'Saved'} ✓</p>
                  <h2 className="text-lg font-extrabold text-slate-900">Preview — {previewData.filename}</h2>
                </div>
                <button onClick={closePreviewModal}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition">✕</button>
              </div>
              <div className="bg-slate-100 p-4 h-[72vh] max-h-[820px] min-h-[520px] overflow-hidden">
                {previewLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <svg className="w-8 h-8 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>
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

// ─── InvoiceCell — Invoice Preview + Edit/Generate (always same width) ──────────
function InvoiceCell({ onInvoice, onInvoicePreview, invoiceGenerated }) {
  return (
    <div className="flex flex-col items-center gap-2" onClick={e => e.stopPropagation()}>
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">Invoice Preview</span>
      <div className="flex flex-nowrap items-center justify-center gap-1.5">
        {/* Preview icon — always present; greyed for pending */}
        <button
          onClick={invoiceGenerated ? onInvoicePreview : undefined}
          title={invoiceGenerated ? 'Preview Invoice PDF' : 'Invoice not yet generated'}
          disabled={!invoiceGenerated}
          className={[
            'inline-flex items-center justify-center w-7 h-7 rounded-lg border transition',
            invoiceGenerated
              ? 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 cursor-pointer'
              : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed',
          ].join(' ')}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6M9 17h4" />
          </svg>
        </button>

        {/* Edit / Generate — same slot, different label+style */}
        {invoiceGenerated ? (
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
        ) : (
          <button
            onClick={onInvoice}
            title="Generate Invoice"
            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition whitespace-nowrap"
          >
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate
          </button>
        )}
      </div>
    </div>
  )
}

// ─── RowActions — View + Delete ──────────────────────────────────────────────────
function RowActions({ onView, onDelete, isDeleting }) {
  return (
    <div className="flex flex-nowrap items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
      <button onClick={onView}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition whitespace-nowrap">
        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /></svg>
        View
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
function IndividualsTable({ data, onView, onDelete, onInvoice, onInvoicePreview, deleting, highlightedId, selectedIds = new Set(), onToggleSelect, onToggleSelectAll }) {
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

  const allIds = data.map(r => r._id)
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id))

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="max-h-[68vh] overflow-y-auto overflow-x-clip">
        <table className="w-full table-auto text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-3.5 w-10">
                <input type="checkbox" checked={allSelected} onChange={() => onToggleSelectAll(allIds)}
                  className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer" />
              </th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-36">Contact</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-36">Email / Phone</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-20">Country</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24">Plan</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-20">Price</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-28">Sub Start</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-28">Expiry</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 w-28">Status</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 w-20">Payment</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 w-36">Invoice Preview</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              const primary = group[0]
              const key = ((primary.email || '').toLowerCase().trim() || primary._id) + '-' + primary._id
              const isOpen = !!expanded[key]
              const hasMany = group.length > 1
              const initials = ((primary.firstName?.[0] || '') + (primary.lastName?.[0] || '')).toUpperCase() || 'I'
              const isSelected = selectedIds.has(primary._id)

              return (
                <React.Fragment key={key}>
                  <tr
                    className={`border-b border-slate-100 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50'
                        : String(primary._id) === String(highlightedId)
                        ? 'bg-amber-50 outline outline-2 outline-amber-400'
                        : isOpen ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                    }`}
                    onClick={() => hasMany ? toggle(key) : onView(primary)}>
                    <td className="px-3 py-4" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(primary._id)}
                        className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer" />
                    </td>
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
                    <td className="px-4 py-4 text-xs text-slate-500 whitespace-nowrap">{primary.subscriptionDate ? fmtDateMDY(primary.subscriptionDate) : (primary.isPaid ? '—' : <span className="text-slate-300">Pending</span>)}</td>
                    <td className="px-4 py-4">
                      {primary.subscriptionPlan === 'Unlimited Plan'
                        ? <span className="text-xs font-semibold text-indigo-600">Never</span>
                        : primary.expirationDate
                          ? <span className={`text-xs font-semibold whitespace-nowrap ${new Date(primary.expirationDate) < new Date() ? 'text-red-600' : new Date(primary.expirationDate) < new Date(Date.now() + 30*24*60*60*1000) ? 'text-amber-600' : 'text-slate-600'}`}>{fmtDateMDY(primary.expirationDate)}</span>
                          : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1 items-center">
                        <Badge value={primary.isPaid ? 'Active' : (primary.status || 'Pending')} type="status" isPaid={primary.isPaid} />
                        {primary.nextRenewal?.paidAt && (
                          <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] whitespace-nowrap">Renewed</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge value={primary.paymentStatus} isPaid={primary.isPaid} />
                        {primary.wirePaymentRequested && (
                          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-700">Wire Requested</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <InvoiceCell
                        onInvoice={() => onInvoice(primary)}
                        onInvoicePreview={() => onInvoicePreview(primary)}
                        invoiceGenerated={hasExistingInvoice(primary)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <RowActions
                        onView={() => onView(primary)}
                        onDelete={() => onDelete(primary._id, 'individual')}
                        isDeleting={deleting === primary._id}
                      />
                    </td>
                  </tr>

                  {hasMany && isOpen && group.map((sub, si) => (
                    <tr key={sub._id + '-sub'}
                      className={`border-b border-slate-100 transition-colors cursor-pointer ${selectedIds.has(sub._id) ? 'bg-blue-50' : 'bg-amber-50/30 hover:bg-amber-50/60'}`}
                      onClick={() => onView(sub)}>
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(sub._id)} onChange={() => onToggleSelect(sub._id)}
                          className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer" />
                      </td>
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
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{sub.subscriptionDate ? fmtDateMDY(sub.subscriptionDate) : '—'}</td>
                      <td className="px-4 py-3">
                        {sub.subscriptionPlan === 'Unlimited Plan'
                          ? <span className="text-xs font-semibold text-indigo-600">Never</span>
                          : sub.expirationDate
                            ? <span className={`text-xs font-semibold whitespace-nowrap ${new Date(sub.expirationDate) < new Date() ? 'text-red-600' : 'text-slate-600'}`}>{fmtDateMDY(sub.expirationDate)}</span>
                            : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-center">
                          <Badge value={sub.isPaid ? 'Active' : (sub.status || 'Pending')} type="status" isPaid={sub.isPaid} />
                          {sub.nextRenewal?.paidAt && (
                            <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] whitespace-nowrap">Renewed</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge value={sub.paymentStatus} isPaid={sub.isPaid} />
                          {sub.wirePaymentRequested && (
                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-700">Wire Requested</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <InvoiceCell
                          onInvoice={() => onInvoice(sub)}
                          onInvoicePreview={() => onInvoicePreview(sub)}
                          invoiceGenerated={hasExistingInvoice(sub)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <RowActions
                          onView={() => onView(sub)}
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

function AirlinesTable({ data, onView, onDelete, onInvoice, onInvoicePreview, deleting, highlightedId, selectedIds = new Set(), onToggleSelect, onToggleSelectAll }) {
  const [expanded, setExpanded] = useState({})
  const highlightRef = useRef(null)

  useEffect(() => {
    if (highlightedId && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [highlightedId])

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

  const allIds = data.map(r => r._id)
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id))

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="max-h-[68vh] overflow-y-auto overflow-x-clip">
        <table className="w-full table-auto text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-3 py-3.5 w-10">
                <input type="checkbox" checked={allSelected} onChange={() => onToggleSelectAll(allIds)}
                  className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer" />
              </th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-40">Airline & Contact</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-32">Email</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-16">Country</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-20">Plan</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-20">Holders / Total</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-28">Sub Start</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-28">Expiry</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 w-28">Status</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 w-20">Payment</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 w-36">Invoice Preview</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              const primary = group[0]
              const key = ((primary.airlineName || '').toLowerCase().trim() || primary._id) + '-' + primary._id
              const isOpen = !!expanded[key]
              const hasMany = group.length > 1
              const isSelected = selectedIds.has(primary._id)
              const contactName = [primary.firstName, primary.lastName].filter(Boolean).join(' ') ||
                [primary.contactFirstName, primary.contactLastName].filter(Boolean).join(' ') || ''

              return (
                <React.Fragment key={key}>
                  <tr
                    ref={String(primary._id) === String(highlightedId) ? highlightRef : null}
                    className={`border-b border-slate-100 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50'
                        : String(primary._id) === String(highlightedId)
                        ? 'bg-blue-50 ring-2 ring-inset ring-blue-500'
                        : isOpen ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                    }`}
                    onClick={() => hasMany ? toggle(key) : onView(primary)}>
                    <td className="px-3 py-4" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(primary._id)}
                        className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center flex-shrink-0">
                          <Plane className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm leading-tight truncate max-w-[130px]">{primary.airlineName || '—'}</p>
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
                    <td className="px-4 py-4"><p className="text-slate-700 text-xs truncate max-w-[130px]">{primary.email || primary.contactEmail || '—'}</p></td>
                    <td className="px-4 py-4"><p className="text-slate-600 text-xs truncate max-w-[80px]">{primary.country || '—'}</p></td>
                    <td className="px-4 py-4"><span className="text-xs font-medium text-slate-700">{planLabel(primary.subscriptionPlan)}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1 items-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                          {primary.certificateHolders?.length || 0}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{fmtAirlineTotal(primary)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500 whitespace-nowrap">{primary.subscriptionDate ? fmtDateMDY(primary.subscriptionDate) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-4">
                      {primary.subscriptionPlan === 'Unlimited Plan'
                        ? <span className="text-xs font-semibold text-indigo-600">Never</span>
                        : primary.expirationDate
                          ? <span className={`text-xs font-semibold whitespace-nowrap ${new Date(primary.expirationDate) < new Date() ? 'text-red-600' : new Date(primary.expirationDate) < new Date(Date.now() + 30*24*60*60*1000) ? 'text-amber-600' : 'text-slate-600'}`}>{fmtDateMDY(primary.expirationDate)}</span>
                          : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1 items-center">
                        <Badge value={primary.isPaid ? 'Active' : (primary.status || 'Pending')} type="status" isPaid={primary.isPaid} />
                        {primary.nextRenewal?.paidAt && (
                          <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] whitespace-nowrap">Renewed</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center"><div className="flex justify-center"><Badge value={primary.paymentStatus} isPaid={primary.isPaid} /></div></td>
                    <td className="px-4 py-4">
                      <InvoiceCell
                        onInvoice={() => onInvoice(primary)}
                        onInvoicePreview={() => onInvoicePreview(primary)}
                        invoiceGenerated={hasExistingInvoice(primary)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <RowActions
                        onView={() => onView(primary)}
                        onDelete={() => onDelete(primary._id, 'airline')}
                        isDeleting={deleting === primary._id}
                      />
                    </td>
                  </tr>

                  {hasMany && isOpen && group.map((sub, si) => (
                    <tr
                      key={sub._id + '-sub'}
                      className={`border-b border-slate-100 transition-colors cursor-pointer ${selectedIds.has(sub._id) ? 'bg-blue-50' : 'bg-amber-50/30 hover:bg-amber-50/60'}`}
                      onClick={() => onView(sub)}
                    >
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(sub._id)} onChange={() => onToggleSelect(sub._id)}
                          className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer" />
                      </td>
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
                        <div className="flex flex-col gap-1 items-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold">{sub.certificateHolders?.length || 0}</span>
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{fmtAirlineTotal(sub)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{sub.subscriptionDate ? fmtDateMDY(sub.subscriptionDate) : <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3">
                        {sub.subscriptionPlan === 'Unlimited Plan'
                          ? <span className="text-xs font-semibold text-indigo-600">Never</span>
                          : sub.expirationDate
                            ? <span className={`text-xs font-semibold whitespace-nowrap ${new Date(sub.expirationDate) < new Date() ? 'text-red-600' : new Date(sub.expirationDate) < new Date(Date.now() + 30*24*60*60*1000) ? 'text-amber-600' : 'text-slate-600'}`}>{fmtDateMDY(sub.expirationDate)}</span>
                            : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-center">
                          <Badge value={sub.isPaid ? 'Active' : (sub.status || 'Pending')} type="status" isPaid={sub.isPaid} />
                          {sub.nextRenewal?.paidAt && (
                            <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] whitespace-nowrap">Renewed</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center"><div className="flex justify-center"><Badge value={sub.paymentStatus} isPaid={sub.isPaid} /></div></td>
                      <td className="px-4 py-3">
                        <InvoiceCell
                          onInvoice={() => onInvoice(sub)}
                          onInvoicePreview={() => onInvoicePreview(sub)}
                          invoiceGenerated={hasExistingInvoice(sub)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <RowActions
                          onView={() => onView(sub)}
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
  const indTotal = individuals.reduce((s, r) => s + (Number(r.price) || 0), 0)
  const airTotal = airlines.reduce((s, r) => s + getAirlineTotal(r), 0)
  const indPaid = individuals.filter(r => r.isPaid === true || (r.isPaid == null && r.paymentStatus === 'paid')).length
  const airPaid = airlines.filter(r => r.isPaid === true || (r.isPaid == null && r.paymentStatus === 'paid')).length
  const allHolders = airlines.reduce((s, r) => s + (r.certificateHolders?.length || 0), 0)
  const allRegs = [...individuals, ...airlines]
  const planCounts = {
    '1 Year': allRegs.filter(r => r.subscriptionPlan === '1 Year Subscription Plan').length,
    'Multi-Year': allRegs.filter(r => r.subscriptionPlan === 'Multiple Years Subscription Plan').length,
    'Unlimited': allRegs.filter(r => r.subscriptionPlan === 'Unlimited Plan').length,
  }
  const countryCounts = {}
  allRegs.forEach(r => { if (r.country) countryCounts[r.country] = (countryCounts[r.country] || 0) + 1 })
  const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Individuals"
          value={individuals.length}
          sub="Registered"
          accent="blue"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="9.5" cy="7" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /></svg>}
        />
        <StatCard
          label="Airlines"
          value={airlines.length}
          sub="Operators"
          accent="violet"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m2 14 8.5-2.5L13 4l2 1-1 7 5.5 1.5a2 2 0 0 1 0 3L14 18l1 7-2 1-2.5-7.5L2 16v-2Z" /></svg>}
        />
        <StatCard
          label="Cert Holders"
          value={allHolders}
          sub="Airline total"
          accent="amber"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="2" y="7" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 0 0-4 0v2M12 12v4M10 14h4" /></svg>}
        />
        <StatCard
          label="Indiv. Revenue"
          value={'$' + indTotal.toLocaleString('en-US')}
          sub="Individual fees"
          accent="emerald"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12M8 10h8M8 14h8" /></svg>}
        />
        <StatCard
          label="Airline Revenue"
          value={'$' + airTotal.toLocaleString('en-US')}
          sub="Airline fees"
          accent="emerald"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0-4-4m4 4 4-4M4 20h16" /></svg>}
        />
        <StatCard
          label="Paid"
          value={indPaid + airPaid}
          sub={`${indPaid} ind · ${airPaid} air`}
          accent="emerald"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
        />
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
  const prevTab = useRef(tabFromPath)

  useEffect(() => {
    setTab(prev => {
      prevTab.current = prev
      return tabFromPath
    })
  }, [pathname])

  const [individuals, setIndividuals] = useState([])
  const [airlines, setAirlines] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('All')
  const [filterPayment, setFilterPayment] = useState('All')
  const [filterStatus, setFilterStatus]   = useState('All')
  const [filterExpiry, setFilterExpiry]   = useState('All')
  const [sortOrder, setSortOrder]         = useState('desc')

  const [viewRec, setViewRec]   = useState(null)
  const [viewType, setViewType] = useState(null)
  const [editRec, setEditRec] = useState(null)
  const [editType, setEditType] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [toast, setToast] = useState(null)
  const [highlightedAirlineId, setHighlightedAirlineId] = useState(null)
  const [invoiceModal, setInvoiceModal] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)

  const highlightId = useMemo(() => {
    const p = new URLSearchParams(locationSearch)
    return p.get('highlight') || null
  }, [locationSearch])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    setLoadErr('')
    try {
      const [ir, ar] = await Promise.all([getAllIndividuals(), getAllAirlinesSubscriptions()])
      const newInds = Array.isArray(ir.data?.data) ? ir.data.data : Array.isArray(ir.data) ? ir.data : []
      const newAirs = Array.isArray(ar.data?.data) ? ar.data.data : Array.isArray(ar.data) ? ar.data : []

      if (!showSpinner) {
        setIndividuals(prev => {
          const prevIds = new Set(prev.map(x => x._id))
          const added = newInds.filter(x => !prevIds.has(x._id))
          if (added.length > 0) {
            const name = [added[0].firstName, added[0].lastName].filter(Boolean).join(' ') || 'Individual'
            setTimeout(() => showToast(`New individual: ${name}`, 'individual'), 0)
          }
          return newInds
        })
        setAirlines(prev => {
          const prevIds = new Set(prev.map(x => x._id))
          const added = newAirs.filter(x => !prevIds.has(x._id))
          if (added.length > 0) {
            const name = added[0].airlineName || [added[0].firstName, added[0].lastName].filter(Boolean).join(' ') || 'Airline'
            setTimeout(() => showToast(`New airline: ${name}`, 'airline'), 0)
          }
          return newAirs
        })
      } else {
        setIndividuals(newInds)
        setAirlines(newAirs)
      }
    } catch {
      if (showSpinner) setLoadErr('Could not connect to the server. Is the backend running on port 5000?')
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const pollTimer = setInterval(() => loadData(false), 30000)
    return () => clearInterval(pollTimer)
  }, [])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [tab])

  useEffect(() => {
    if (tab !== 'add-airline' && tab !== 'add-individual') {
      if (prevTab.current === 'add-airline' || prevTab.current === 'add-individual') {
        loadData(true)
      }
    }
  }, [tab])

  useEffect(() => {
    if (!highlightId || loading || airlines.length === 0) return
    const record = airlines.find(a => String(a._id) === String(highlightId))
    if (record) {
      setSearch('')
      setFilterPlan('All')
      setFilterPayment('All')
      setFilterStatus('All')
      setHighlightedAirlineId(highlightId)
      navigate('/admin/airlines', { replace: true })
      setTimeout(() => setHighlightedAirlineId(null), 8000)
    }
  }, [highlightId, airlines, loading])

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
      if (type === 'airline') {
        await deleteAirlinesSubscription(id)
        setAirlines(p => p.filter(x => x._id !== id))
      } else {
        await deleteIndividual(id)
        setIndividuals(p => p.filter(x => x._id !== id))
      }
      showToast('Record deleted')
    } catch {
      showToast('Delete failed', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const handleBulkDelete = async () => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    if (!window.confirm(`Permanently delete ${ids.length} selected record(s)?`)) return
    setBulkDeleting(true)
    try {
      if (tab === 'airlines') {
        await bulkDeleteAirlines(ids)
        setAirlines(p => p.filter(x => !selectedIds.has(x._id)))
      } else {
        await bulkDeleteIndividuals(ids)
        setIndividuals(p => p.filter(x => !selectedIds.has(x._id)))
      }
      setSelectedIds(new Set())
      showToast(`Deleted ${ids.length} record(s)`)
    } catch {
      showToast('Bulk delete failed', 'error')
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleBulkGenerateInvoice = async () => {
    const records = filtered.filter(r => selectedIds.has(r._id))
    if (records.length === 0) return
    setBulkGenerating(true)
    try {
      const type = tab === 'airlines' ? 'airline' : 'individual'
      for (const record of records) {
        await resolveInvoiceNumber(record, type)
      }
      showToast(`Generated invoice numbers for ${records.length} record(s)`, 'success')
      setSelectedIds(new Set())
    } catch {
      showToast('Failed to generate some invoice numbers', 'error')
    } finally {
      setBulkGenerating(false)
    }
  }

  const handleBulkSendReminder = async () => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setSendingReminder(true)
    try {
      const isAirlineTab = tab === 'airlines'
      const recipients = ids.map(id => ({
        registrationId: id,
        registrationModel: isAirlineTab ? 'Airlines' : 'Individual',
      }))
      await sendRenewalReminders(recipients)
      showToast(`Sent renewal reminders to ${ids.length} user(s)`)
    } catch {
      showToast('Failed to send some emails', 'error')
    } finally {
      setSendingReminder(false)
    }
  }

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleSelectAll = (ids) => setSelectedIds(prev => {
    if (ids.every(id => prev.has(id))) return new Set()
    return new Set(ids)
  })

  const handleSaveInvoice = async (id, type, payload) => {
    try {
      // Validate/save against canonical payment/invoice records first so
      // duplicate invoice-number errors are shown before registration updates.
      let paidDoc = null
      try {
        const paymentsRes = await getPaymentsByRegistration(id)
        const payments = paymentsRes.data?.data || []
        paidDoc = payments.find(p => p.isPaid) || payments[0] || null
      } catch (_) { /* non-critical lookup */ }

      let invDoc = null
      try {
        const invDocRes = await getInvoiceByRegistration(id)
        invDoc = (invDocRes.data?.data || [])[0] || null
      } catch (_) { /* non-critical lookup */ }

      if (paidDoc?._id && payload.invoiceDraft) {
        await savePaymentInvoiceDraft(paidDoc._id, payload.invoiceDraft, payload.invoiceNumber)
      } else if (invDoc?._id) {
        await saveInvoiceDraftToDoc(invDoc._id, payload.invoiceDraft, payload.invoiceNumber)
      }

      const registrationUpdate = {
        invoiceStatus: payload.invoiceStatus,
        invoiceGenerated: payload.invoiceGenerated,
        invoiceNumber: payload.invoiceNumber,
        invoiceDraft: payload.invoiceDraft,
      }

      if (type === 'airline') {
        const res = await updateAirlinesSubscription(id, registrationUpdate)
        const saved = res.data?.data || {}
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

      // Keep Invoice doc in sync as best-effort when Payment save path ran first.
      try {
        if (paidDoc?._id && invDoc?._id) {
          await saveInvoiceDraftToDoc(invDoc._id, payload.invoiceDraft, payload.invoiceNumber)
        }
      } catch (invSyncErr) {
        console.warn('[handleSaveInvoice] Invoice doc sync warning:', invSyncErr.message)
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

  // Resolve (and immediately persist) an invoice number before opening any invoice modal.
  // This prevents the number from incrementing every time the modal is opened without saving.
  const resolveInvoiceNumber = async (record, type) => {
    let resolved = record

    // 1. Already on the record — use it.
    if (!resolved.invoiceNumber) {
      // 2. Check Invoice collection (covers Stripe-paid records).
      try {
        const invRes = await getInvoiceByRegistration(record._id)
        const existingNum = (invRes.data?.data || [])[0]?.invoiceNumber
        if (existingNum) {
          resolved = { ...resolved, invoiceNumber: existingNum }
          if (type === 'airline') setAirlines(p => p.map(x => x._id === record._id ? { ...x, invoiceNumber: existingNum } : x))
          else setIndividuals(p => p.map(x => x._id === record._id ? { ...x, invoiceNumber: existingNum } : x))
        }
      } catch (_) { /* fall through */ }

      // 3. Still no number — generate one and persist.
      if (!resolved.invoiceNumber) {
        try {
          const genRes = await generateInvoiceNumber()
          const newNum = genRes.data?.invoiceNumber
          if (newNum) {
            if (type === 'airline') {
              await updateAirlinesSubscription(record._id, { invoiceNumber: newNum })
              setAirlines(p => p.map(x => x._id === record._id ? { ...x, invoiceNumber: newNum } : x))
            } else {
              await updateIndividual(record._id, { invoiceNumber: newNum })
              setIndividuals(p => p.map(x => x._id === record._id ? { ...x, invoiceNumber: newNum } : x))
            }
            resolved = { ...resolved, invoiceNumber: newNum }
          }
        } catch (_) { /* fall through */ }
      }
    }

    // 4. Also resolve nextRenewal.invoiceNumber if a queued plan exists and
    //    has no invoice number (or shares the same number as the active plan).
    const nr = resolved.nextRenewal
    if (nr?.paidAt && (!nr.invoiceNumber || nr.invoiceNumber === resolved.invoiceNumber)) {
      try {
        const genRes = await generateInvoiceNumber()
        const newQueuedNum = genRes.data?.invoiceNumber
        if (newQueuedNum) {
          if (type === 'airline') {
            await setAirlinesRenewalInvoice(record._id, newQueuedNum)
            setAirlines(p => p.map(x => x._id === record._id
              ? { ...x, nextRenewal: { ...x.nextRenewal, invoiceNumber: newQueuedNum } }
              : x))
          } else {
            await setIndividualRenewalInvoice(record._id, newQueuedNum)
            setIndividuals(p => p.map(x => x._id === record._id
              ? { ...x, nextRenewal: { ...x.nextRenewal, invoiceNumber: newQueuedNum } }
              : x))
          }
          resolved = { ...resolved, nextRenewal: { ...nr, invoiceNumber: newQueuedNum } }
        }
      } catch (_) { /* non-critical */ }
    }

    return resolved
  }

  const openInvoiceGenerate = async (record, type) => {
    const resolved = await resolveInvoiceNumber(record, type)
    setInvoiceModal({ record: resolved, type, initialStep: 'select', autoPreview: false, previewOnly: false })
  }

  const openInvoiceEdit = async (record, type) => {
    const resolved = await resolveInvoiceNumber(record, type)
    setInvoiceModal({ record: resolved, type, initialStep: 'edit', autoPreview: false, previewOnly: false })
  }

  const openInvoicePreview = async (record, type) => {
    const resolved = await resolveInvoiceNumber(record, type)
    setInvoiceModal({ record: resolved, type, initialStep: 'edit', autoPreview: false, previewOnly: true })
  }

  const closeInvoiceModal = () => setInvoiceModal(null)

  const src = tab === 'individuals' ? individuals : airlines

  const filtered = useMemo(() => {
    const now = new Date()
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    return src.filter(r => {
      const q = search.toLowerCase()
      const matchSearch = !q || (
        tab === 'individuals'
          ? [`${r.firstName || ''} ${r.lastName || ''}`, r.email, r.country, r.faaCertificateNumber, r.phone].some(v => String(v || '').toLowerCase().includes(q))
          : [r.airlineName, r.email || r.contactEmail, r.country, `${r.firstName || ''} ${r.lastName || ''}`].some(v => String(v || '').toLowerCase().includes(q))
      )
      const expDate = r.expirationDate ? new Date(r.expirationDate) : null
      const isUnlimited = r.subscriptionPlan === 'Unlimited Plan'
      const matchExpiry = filterExpiry === 'All'
        ? true
        : filterExpiry === 'Expired'
          ? !isUnlimited && expDate && expDate < now
          : filterExpiry === 'ExpiringSoon'
            ? !isUnlimited && expDate && expDate >= now && expDate <= thirtyDays
            : true
      return matchSearch
        && (filterPlan === 'All' || r.subscriptionPlan === filterPlan)
        && (filterPayment === 'All' || r.paymentStatus === filterPayment)
        && (filterStatus === 'All' || r.status === filterStatus)
        && matchExpiry
    }).sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime()
      const bDate = new Date(b.createdAt).getTime()
      return sortOrder === 'asc' ? aDate - bDate : bDate - aDate
    })
  }, [src, search, filterPlan, filterPayment, filterStatus, filterExpiry, sortOrder, tab])

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

  const PLANS = ['All', '1 Year Subscription Plan', 'Multiple Years Subscription Plan', 'Unlimited Plan']
  const PAYMENTS = ['All', 'pending', 'paid', 'failed']
  const STATUSES = ['All', 'Pending', 'Active', 'Inactive']

  const clearFilters = () => { setSearch(''); setFilterPlan('All'); setFilterPayment('All'); setFilterStatus('All'); setFilterExpiry('All'); setSortOrder('desc') }
  const hasActiveFilters = search || filterPlan !== 'All' || filterPayment !== 'All' || filterStatus !== 'All' || filterExpiry !== 'All' || sortOrder !== 'desc'

  return (
    <DashboardLayout>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`fixed top-6 right-6 z-[100] flex items-center gap-3 rounded-xl px-5 py-3.5 shadow-2xl text-sm font-semibold text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-900'}`}
          >
            {toast.type === 'error' && (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></svg>
            )}
            {toast.type === 'airline' && <Plane className="w-4 h-4 flex-shrink-0" />}
            {toast.type === 'individual' && (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="8" r="3.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.582-6 8-6s8 2 8 6" /></svg>
            )}
            {toast.type === 'success' && (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            )}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {viewRec && viewType === 'individual' && (
        <IndividualViewModal
          record={viewRec}
          onClose={closeView}
          onEdit={openEditFromView}
          onRecordUpdated={(updated) => {
            if (!updated) return
            setIndividuals(p => p.map(x => x._id === updated._id ? { ...x, ...updated } : x))
            setViewRec(updated)
          }}
        />
      )}
      {viewRec && viewType === 'airline' && (
        <AirlineViewModal
          record={viewRec}
          onClose={closeView}
          onEdit={openEditFromView}
          onRecordUpdated={(updated) => {
            if (!updated) return
            setAirlines(p => p.map(x => x._id === updated._id ? { ...x, ...updated } : x))
            setViewRec(updated)
          }}
        />
      )}
      {editRec && editType === 'individual' && <IndividualEditModal record={editRec} saving={saving} onClose={() => { setEditRec(null); setEditType(null) }} onSave={(id, data) => handleSave(id, data, 'individual')} />}
      {editRec && editType === 'airline' && <AirlineEditModal record={editRec} saving={saving} onClose={() => { setEditRec(null); setEditType(null) }} onSave={(id, data) => handleSave(id, data, 'airline')} />}

      {invoiceModal && (
        <AdminInvoiceModal
          key={invoiceModal.record._id}
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
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {tab !== 'overview' && (
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
            <select value={filterExpiry} onChange={e => setFilterExpiry(e.target.value)}
              className="border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl bg-white outline-none focus:border-blue-500 text-slate-600 transition">
              <option value="All">All Dates</option>
              <option value="Expired">Expired</option>
              <option value="ExpiringSoon">Expiring in 30 days</option>
            </select>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">Clear</button>
            )}
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {tab !== 'overview' && (
            <a href={tab === 'individuals' ? exportIndividualsExcel() : exportAirlinesExcel()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0-4-4m4 4 4-4M4 20h16" /></svg>
              Export Excel
            </a>
          )}
          {tab === 'individuals' && (
            <button onClick={() => navigate('/admin/add-individual')} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition" style={{ background: '#000021' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" /></svg>
              Add Individual
            </button>
          )}
          {tab === 'airlines' && (
            <button onClick={() => navigate('/admin/add-airline')} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition" style={{ background: '#000021' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" /></svg>
              Add Airline
            </button>
          )}
          <button onClick={() => loadData(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition">
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3M4 4v5h5M20 20v-5h-5" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
      )}

      {tab !== 'overview' && tab !== 'add-airline' && tab !== 'add-individual' && !loading && (
        <div className="flex items-center gap-3 mb-4 px-1">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-800">{uniqueAccountCount}</span> account{uniqueAccountCount !== 1 ? 's' : ''}{' '}
            <span className="text-slate-400">({filtered.length} total subscription{filtered.length !== 1 ? 's' : ''})</span>
          </p>
          {selectedIds.size > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">{selectedIds.size} selected</span>
              <button
                onClick={handleBulkSendReminder}
                disabled={sendingReminder || bulkDeleting || bulkGenerating}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 px-3 py-1.5 text-xs font-bold text-white transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                {sendingReminder ? 'Sending…' : 'Send Renewal Reminder'}
              </button>
              <button
                onClick={handleBulkGenerateInvoice}
                disabled={bulkGenerating || bulkDeleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-3 py-1.5 text-xs font-bold text-white transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {bulkGenerating ? 'Generating…' : 'Generate Invoice'}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting || bulkGenerating}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 px-3 py-1.5 text-xs font-bold text-white transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                {bulkDeleting ? 'Deleting…' : 'Delete Selected'}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-40">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
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
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
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
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
        />
      )}
    </DashboardLayout>
  )
}

