import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import DashboardLayout from '../components/layout/DashboardLayout'
import AdminAirlineForm from '../components/airlines/AdminAirlineForm'
import AdminIndividualForm from '../components/individual/AdminIndividualForm'
import { Plane } from 'lucide-react'
import { getAirlineTotal, fmtAirlineTotal, activeGroupSlots, allGroupSlots, currentBaseGroupSlots, renewTierAnchor } from '../utils/airlineTotal'
import { getExpiryStatus } from '../utils/expiryStatus'
import { getInvoiceStatus } from '../utils/invoiceStatus'
import PhoneInputLib from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
const AdminPhoneInput = PhoneInputLib.default || PhoneInputLib
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
  getAccountsWithoutPlan,
  getPaymentsByRegistration,
  savePaymentInvoiceDraft,
  updateAirlinesSubscription,
  updateIndividual,
  generateInvoiceNumber,
  getInvoiceByRegistration,
  saveInvoiceDraftToDoc,
  createAdminInvoiceDoc,
  deleteInvoice,
  activateQueuedRenewal,
  cancelQueuedRenewal,
  activateWirePayment,
  declineWirePayment,
  sendRenewalReminders,
  adminHolderUpgrade,
  markHolderGroupPaid,
  activateGroupRenewalNow,
  deleteHolderGroup,
  adminRenewAirline,
  adminRenewIndividual,
} from '../services/api'

// Convert a raw backend/Mongoose error into a short, user-friendly message.
function friendlySaveError(e) {
  const raw = e?.response?.data?.message || e?.message || ''
  if (/Cast to embedded failed|certificateHolders|CastError/i.test(raw))
    return 'Could not save certificate holders. Please make sure every holder has a Full Name, Certificate Type and IACRA FTN, then try again.'
  if (/duplicate key|E11000/i.test(raw)) return 'That value is already in use. Please use a different one.'
  if (/validation failed/i.test(raw)) return 'Some required fields are missing or invalid. Please review the form and try again.'
  return raw && raw.length <= 140 ? raw : 'Something went wrong while saving. Please try again.'
}

// ── Shared country data for admin edit modals ────────────────────────────────
const ADMIN_COUNTRY_TO_ISO2 = {
  'Afghanistan': 'af', 'Albania': 'al', 'Algeria': 'dz', 'American Samoa': 'as', 'Andorra': 'ad',
  'Angola': 'ao', 'Anguilla': 'ai', 'Antigua and Barbuda': 'ag', 'Argentina': 'ar', 'Armenia': 'am',
  'Aruba': 'aw', 'Australia': 'au', 'Austria': 'at', 'Azerbaijan': 'az', 'Bahamas': 'bs',
  'Bahrain': 'bh', 'Bangladesh': 'bd', 'Barbados': 'bb', 'Belarus': 'by', 'Belgium': 'be',
  'Belize': 'bz', 'Benin': 'bj', 'Bermuda': 'bm', 'Bhutan': 'bt', 'Bolivia': 'bo',
  'Bosnia and Herzegovina': 'ba', 'Botswana': 'bw', 'Brazil': 'br', 'Brunei': 'bn', 'Bulgaria': 'bg',
  'Burkina Faso': 'bf', 'Burundi': 'bi', 'Cabo Verde': 'cv', 'Cambodia': 'kh', 'Cameroon': 'cm',
  'Canada': 'ca', 'Cayman Islands': 'ky', 'Central African Republic': 'cf', 'Chad': 'td', 'Chile': 'cl',
  'China': 'cn', 'Colombia': 'co', 'Comoros': 'km', 'Congo': 'cg', 'Costa Rica': 'cr',
  'Croatia': 'hr', 'Cuba': 'cu', 'Cyprus': 'cy', 'Czech Republic': 'cz', 'Denmark': 'dk',
  'Dominican Republic': 'do', 'Ecuador': 'ec', 'Egypt': 'eg', 'El Salvador': 'sv', 'Eritrea': 'er',
  'Estonia': 'ee', 'Ethiopia': 'et', 'Finland': 'fi', 'France': 'fr', 'Germany': 'de',
  'Ghana': 'gh', 'Greece': 'gr', 'Guatemala': 'gt', 'Haiti': 'ht', 'Honduras': 'hn',
  'Hong Kong': 'hk', 'Hungary': 'hu', 'Iceland': 'is', 'India': 'in', 'Indonesia': 'id',
  'Iraq': 'iq', 'Ireland': 'ie', 'Israel': 'il', 'Italy': 'it', 'Jamaica': 'jm',
  'Japan': 'jp', 'Jordan': 'jo', 'Kazakhstan': 'kz', 'Kenya': 'ke', 'Korea (Republic of)': 'kr',
  'Kuwait': 'kw', 'Kyrgyzstan': 'kg', 'Latvia': 'lv', 'Lebanon': 'lb', 'Libya': 'ly',
  'Lithuania': 'lt', 'Luxembourg': 'lu', 'Malaysia': 'my', 'Maldives': 'mv', 'Mali': 'ml',
  'Malta': 'mt', 'Mexico': 'mx', 'Moldova': 'md', 'Monaco': 'mc', 'Mongolia': 'mn',
  'Morocco': 'ma', 'Mozambique': 'mz', 'Myanmar': 'mm', 'Nepal': 'np', 'Netherlands': 'nl',
  'New Zealand': 'nz', 'Nicaragua': 'ni', 'Nigeria': 'ng', 'Norway': 'no', 'Oman': 'om',
  'Pakistan': 'pk', 'Palestine': 'ps', 'Panama': 'pa', 'Paraguay': 'py', 'Peru': 'pe',
  'Philippines': 'ph', 'Poland': 'pl', 'Portugal': 'pt', 'Puerto Rico': 'pr', 'Qatar': 'qa',
  'Romania': 'ro', 'Russian Federation': 'ru', 'Rwanda': 'rw', 'Saudi Arabia': 'sa', 'Senegal': 'sn',
  'Serbia': 'rs', 'Singapore': 'sg', 'Slovakia': 'sk', 'Slovenia': 'si', 'Somalia': 'so',
  'South Africa': 'za', 'Spain': 'es', 'Sri Lanka': 'lk', 'Sudan': 'sd', 'Sweden': 'se',
  'Switzerland': 'ch', 'Syria': 'sy', 'Taiwan': 'tw', 'Tanzania': 'tz', 'Thailand': 'th',
  'Tunisia': 'tn', 'Turkey': 'tr', 'Uganda': 'ug', 'Ukraine': 'ua', 'United Arab Emirates': 'ae',
  'United Kingdom': 'gb', 'United States of America': 'us', 'Uruguay': 'uy', 'Uzbekistan': 'uz',
  'Venezuela': 've', 'Vietnam': 'vn', 'Yemen': 'ye', 'Zambia': 'zm', 'Zimbabwe': 'zw',
}
const ADMIN_ISO2_TO_COUNTRY = Object.fromEntries(
  Object.entries(ADMIN_COUNTRY_TO_ISO2).map(([name, iso2]) => [iso2.toLowerCase(), name])
)
const isoToCountry = (val) => {
  if (!val) return ''
  const lower = val.toLowerCase()
  return ADMIN_ISO2_TO_COUNTRY[lower] || val
}
const ISO2_DIAL = {
  af: '+93', al: '+355', dz: '+213', as: '+1684', ad: '+376', ao: '+244', ai: '+1264', ag: '+1268', ar: '+54', am: '+374',
  aw: '+297', au: '+61', at: '+43', az: '+994', bs: '+1242', bh: '+973', bd: '+880', bb: '+1246', by: '+375', be: '+32',
  bz: '+501', bj: '+229', bm: '+1441', bt: '+975', bo: '+591', ba: '+387', bw: '+267', br: '+55', bn: '+673', bg: '+359',
  bf: '+226', bi: '+257', cv: '+238', kh: '+855', cm: '+237', ca: '+1', ky: '+1345', cf: '+236', td: '+235', cl: '+56',
  cn: '+86', co: '+57', km: '+269', cg: '+242', cr: '+506', hr: '+385', cu: '+53', cy: '+357', cz: '+420', dk: '+45',
  do: '+1809', ec: '+593', eg: '+20', sv: '+503', er: '+291', ee: '+372', et: '+251', fi: '+358', fr: '+33', de: '+49',
  gh: '+233', gr: '+30', gt: '+502', ht: '+509', hn: '+504', hk: '+852', hu: '+36', is: '+354', in: '+91', id: '+62',
  iq: '+964', ie: '+353', il: '+972', it: '+39', jm: '+1876', jp: '+81', jo: '+962', kz: '+7', ke: '+254', kr: '+82',
  kw: '+965', kg: '+996', lv: '+371', lb: '+961', ly: '+218', lt: '+370', lu: '+352', my: '+60', mv: '+960', ml: '+223',
  mt: '+356', mx: '+52', md: '+373', mc: '+377', mn: '+976', ma: '+212', mz: '+258', mm: '+95', np: '+977', nl: '+31',
  nz: '+64', ni: '+505', ng: '+234', no: '+47', om: '+968', pk: '+92', ps: '+970', pa: '+507', py: '+595', pe: '+51',
  ph: '+63', pl: '+48', pt: '+351', pr: '+1787', qa: '+974', ro: '+40', ru: '+7', rw: '+250', sa: '+966', sn: '+221',
  rs: '+381', sg: '+65', sk: '+421', si: '+386', so: '+252', za: '+27', es: '+34', lk: '+94', sd: '+249', se: '+46',
  ch: '+41', sy: '+963', tw: '+886', tz: '+255', th: '+66', tn: '+216', tr: '+90', ug: '+256', ua: '+380', ae: '+971',
  gb: '+44', us: '+1', uy: '+598', uz: '+998', ve: '+58', vn: '+84', ye: '+967', zm: '+260', zw: '+263',
}
const fmtPhone = (phone, countryIso2) => {
  if (!phone) return ''
  const dialCode = countryIso2 ? ISO2_DIAL[countryIso2.toLowerCase()] : null
  if (dialCode && phone.startsWith(dialCode)) {
    return `${dialCode} ${phone.slice(dialCode.length)}`
  }
  // fallback: sort known dial codes longest-first to avoid greedy mismatch
  const sorted = Object.values(ISO2_DIAL).sort((a, b) => b.length - a.length)
  for (const code of sorted) {
    if (phone.startsWith(code)) return `${code} ${phone.slice(code.length)}`
  }
  return phone
}
const ADMIN_COUNTRY_LIST = [
  'Afghanistan', 'Albania', 'Algeria', 'American Samoa', 'Andorra', 'Angola', 'Anguilla', 'Antarctica',
  'Antigua and Barbuda', 'Argentina', 'Armenia', 'Aruba', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas',
  'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bermuda', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Cayman Islands', 'Central African Republic', 'Chad',
  'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus',
  'Czech Republic', 'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Eritrea',
  'Estonia', 'Ethiopia', 'Finland', 'France', 'Germany', 'Ghana', 'Greece', 'Guatemala', 'Haiti',
  'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iraq', 'Ireland', 'Israel',
  'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Korea (Republic of)', 'Kuwait',
  'Kyrgyzstan', 'Latvia', 'Lebanon', 'Libya', 'Lithuania', 'Luxembourg', 'Malaysia', 'Maldives', 'Mali',
  'Malta', 'Mexico', 'Moldova', 'Monaco', 'Mongolia', 'Morocco', 'Mozambique', 'Myanmar', 'Nepal',
  'Netherlands', 'New Zealand', 'Nicaragua', 'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Palestine',
  'Panama', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Puerto Rico', 'Qatar', 'Romania',
  'Russian Federation', 'Rwanda', 'Saudi Arabia', 'Senegal', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia',
  'Somalia', 'South Africa', 'Spain', 'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland', 'Syria', 'Taiwan',
  'Tanzania', 'Thailand', 'Tunisia', 'Turkey', 'Uganda', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'United States of America', 'Uruguay', 'Uzbekistan', 'Venezuela', 'Vietnam',
  'Yemen', 'Zambia', 'Zimbabwe',
]

function AdminCountrySelect({ value, onChange }) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const filtered = ADMIN_COUNTRY_LIST.filter(c => c.toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="relative">
      <button type="button" onClick={() => { setOpen(v => !v); setSearch('') }}
        className={`w-full text-left px-3 py-2 border rounded-lg text-sm bg-white outline-none transition flex items-center justify-between ${open ? 'border-slate-400 ring-2 ring-slate-100' : 'border-slate-200 hover:border-slate-300'
          } ${value ? 'text-slate-900' : 'text-slate-500'}`}>
        <span>{value || '— Select country —'}</span>
        <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus type="text" placeholder="Search country…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-slate-50 text-slate-800 placeholder:text-slate-500" />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && <div className="px-4 py-3 text-sm text-slate-500">No results</div>}
            {filtered.map(c => (
              <div key={c} onClick={() => { onChange(c); setOpen(false); setSearch('') }}
                className={`px-4 py-2 text-sm cursor-pointer transition-colors ${c === value ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}>
                {c}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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

const hasExistingInvoice = (record) =>
  Boolean(record?.invoiceGenerated || record?.invoiceDraft || record?.invoiceNumber)

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-slate-300'

const selectCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-slate-300'

function Badge({ value, type = 'payment', isPaid }) {
  let cls = 'inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] whitespace-nowrap '
  let label = value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Pending'

  if (type === 'status') {
    const trulyActive = value === 'Active' && isPaid !== false
    if (trulyActive) { cls += 'bg-emerald-50 border-emerald-200 text-emerald-700' }
    else if (value === 'Pending') { cls += 'bg-amber-50 border-amber-200 text-amber-700' }
    else { cls += 'bg-slate-100 border-slate-200 text-slate-500' }
    if (value === 'Active' && isPaid === false) label = 'Pending'
  } else if (type === 'plan') {
    if (value?.includes('Unlimited')) { cls += 'bg-indigo-50 border-indigo-200 text-indigo-700' }
    else if (value?.includes('Multiple')) { cls += 'bg-slate-100 border-slate-200 text-slate-700' }
    else { cls += 'bg-slate-50 border-slate-200 text-slate-600' }
  } else if (type === 'isPaid') {
    if (isPaid === true) { cls += 'bg-emerald-50 border-emerald-200 text-emerald-700'; label = 'Paid' }
    else { cls += 'bg-amber-50 border-amber-200 text-amber-700'; label = 'Unpaid' }
  } else {
    const confirmedPaid = value === 'paid' && isPaid !== false
    if (confirmedPaid) { cls += 'bg-emerald-50 border-emerald-200 text-emerald-700' }
    else if (value === 'failed') { cls += 'bg-red-50 border-red-200 text-red-600' }
    else { cls += 'bg-slate-100 border-slate-200 text-slate-600' }
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
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</label>
      {children}
    </div>
  )
}

function ViewField({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <span className="text-sm text-slate-800 font-medium break-words">{value || '—'}</span>
    </div>
  )
}

function SectionHead({ label, badge }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3 pt-1">
      {label}{badge && <span className="text-slate-500"> · {badge}</span>}
    </p>
  )
}

// ─── NextRenewalSection — shared between Individual & Airline view modals ──────
function NextRenewalSection({ record, registrationModel, onRecordUpdated }) {
  const nr = record.nextRenewal
  if (!nr?.paidAt) return null

  const activationDate = nr.activationDate ? new Date(nr.activationDate) : null
  // Only show for genuinely queued renewals (activation is in the future).
  if (!activationDate || activationDate <= new Date()) return null

  // Airline fallback: divide by (ppc × committedCount) to get years, not just ppc
  const ppcFallback = Number(record.pricePerCertificate || 55)
  const countFallback = Number(nr.committedCount || record.committedCount || 1)
  const pricePerYear = registrationModel !== 'Individual' ? ppcFallback * countFallback : 55
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

  // Canonical invoice number from Invoice collection — authoritative source of truth.
  const [canonicalInvoiceNum, setCanonicalInvoiceNum] = React.useState(nr.invoiceNumber || '')
  React.useEffect(() => {
    if (!record._id) return
    getInvoiceByRegistration(record._id)
      .then(res => {
        const docs = res.data?.data || []
        const renewalDoc = docs.find(d => d.purpose === 'renewal')
        if (renewalDoc?.invoiceNumber) setCanonicalInvoiceNum(renewalDoc.invoiceNumber)
      })
      .catch(() => { })
  }, [record._id, nr.paidAt])

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
    if (!window.confirm(`Activate queued plan now?\n\nThis will:\n� Switch plan to: ${nrPlanLabel}\n� Set expiry to: ${fmtDate(nr.expiresAt)}\n� Use invoice: ${canonicalInvoiceNum || '�'}\n\nThis cannot be undone automatically.`)) return
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

  const [cancelling, setCancelling] = React.useState(false)
  const handleCancel = async () => {
    if (!window.confirm(`Delete the queued plan?\n\nThe upcoming ${nrPlanLabel} renewal and its invoice will be removed. The current active plan is unaffected. This cannot be undone.`)) return
    setCancelling(true)
    setActivateErr('')
    try {
      const res = await cancelQueuedRenewal(record._id, registrationModel)
      onRecordUpdated?.(res.data?.data)
    } catch (e) {
      setActivateErr(e?.response?.data?.message || 'Could not delete queued plan.')
    } finally {
      setCancelling(false)
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
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            )}
            {activating ? 'Activating�' : 'Activate Now'}
          </button>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 disabled:opacity-50 px-3 py-1.5 text-[11px] font-bold text-red-600 transition"
          >
            {cancelling ? 'Deleting…' : 'Delete Plan'}
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        {editing && (
          <div className="rounded-lg border border-emerald-300 bg-white p-3 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Plan</label>
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
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Years</label>
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
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Committed Count</label>
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Activation Date</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  value={editForm.activationDate}
                  onChange={(e) => setEdit('activationDate', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Expires At</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  value={editForm.expiresAt}
                  onChange={(e) => setEdit('expiresAt', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Amount Paid</label>
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Invoice #</label>
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
          <ViewField label="Invoice #" value={canonicalInvoiceNum} />
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


// ─── InvoiceDraftFields — shared editable invoice form (edit + create) ────────
function InvoiceDraftFields({ form, setForm, onGenerateNumber, generatingNumber }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
        {/* Invoice # — full-width so the number is never clipped; optional Generate button */}
        <div className="sm:col-span-2">
          <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Invoice #</p>
          <div className="flex items-center gap-1.5">
            <input
              value={form.invoiceNumber || ''}
              onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
              placeholder={onGenerateNumber ? 'Blank = auto on save' : ''}
              className="flex-1 min-w-0 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            {onGenerateNumber && (
              <button
                type="button"
                onClick={onGenerateNumber}
                disabled={generatingNumber}
                title="Preview the next invoice number (not saved until you click Create Invoice)"
                className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {generatingNumber ? '…' : 'Generate'}
              </button>
            )}
          </div>
        </div>
        {[
          ['Recipient Name', 'recipientName'],
          ['Company', 'recipientCompany'],
          ['Payment Method', 'paymentMethod'],
          ['Country', 'recipientCountry'],
        ].map(([label, key]) => (
          <div key={key}>
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
            <input
              value={form[key] || ''}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3">
        <div>
          <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Issue Date</p>
          <input
            type="date"
            value={form.issueDate || ''}
            onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <div>
          <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Payable By</p>
          <input
            type="date"
            value={form.payableBy || ''}
            onChange={e => setForm(f => ({ ...f, payableBy: e.target.value }))}
            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>
      <div>
        <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Address</p>
        <input
          value={form.recipientAddress1 || ''}
          onChange={e => setForm(f => ({ ...f, recipientAddress1: e.target.value }))}
          className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
      <div>
        <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Description</p>
        <input
          value={form.description || ''}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
      <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
        {[
          ['Quantity', 'quantity', 1, 1],
          ['Unit Price', 'unitPrice', 1, 0],
        ].map(([label, key, step, min]) => (
          <div key={key}>
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setForm(f => {
                  const next = Math.max(min, parseFloat(f[key] || 0) - step)
                  const q = key === 'quantity' ? next : parseFloat(f.quantity || 0)
                  const u = key === 'unitPrice' ? next : parseFloat(f.unitPrice || 0)
                  return { ...f, [key]: String(next), totalPrice: String(q * u) }
                })}
                className="w-6 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition flex-shrink-0 text-base font-bold border-r border-slate-200"
              >−</button>
              <input
                value={form[key] || ''}
                onChange={e => setForm(f => {
                  const val = e.target.value
                  const q = key === 'quantity' ? parseFloat(val || 0) : parseFloat(f.quantity || 0)
                  const u = key === 'unitPrice' ? parseFloat(val || 0) : parseFloat(f.unitPrice || 0)
                  return { ...f, [key]: val, totalPrice: isNaN(q * u) ? f.totalPrice : String(q * u) }
                })}
                className="flex-1 min-w-0 text-[11px] font-semibold text-center py-1 bg-transparent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setForm(f => {
                  const next = parseFloat(f[key] || 0) + step
                  const q = key === 'quantity' ? next : parseFloat(f.quantity || 0)
                  const u = key === 'unitPrice' ? next : parseFloat(f.unitPrice || 0)
                  return { ...f, [key]: String(next), totalPrice: String(q * u) }
                })}
                className="w-6 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition flex-shrink-0 text-base font-bold border-l border-slate-200"
              >+</button>
            </div>
          </div>
        ))}
        <div>
          <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Total Price</p>
          <div className="flex items-center border border-emerald-200 rounded-lg overflow-hidden bg-emerald-50">
            <span className="pl-2 text-emerald-600 text-xs font-bold flex-shrink-0">$</span>
            <input
              value={form.totalPrice || ''}
              onChange={e => setForm(f => ({ ...f, totalPrice: e.target.value }))}
              className="flex-1 min-w-0 text-[11px] font-bold text-center py-1.5 bg-transparent focus:outline-none text-emerald-700"
            />
          </div>
        </div>
      </div>
    </>
  )
}

// ─── AdminInvoicesPanel — shows all invoices for a registration ───────────────
function AdminInvoicesPanel({ registrationId, registrationModel, record, drawerMode = false, onGenerateInvoice }) {
  const [invoices, setInvoices] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [editing, setEditing] = React.useState(null)
  const [editForm, setEditForm] = React.useState({})
  const [saving, setSaving] = React.useState(false)
  const [saveErr, setSaveErr] = React.useState('')
  const [pdfBusy, setPdfBusy] = React.useState({})
  const [deletingNum, setDeletingNum] = React.useState(null)
  // Numbers deleted this session — suppress them even if the synthetic fallback
  // (built from record.invoiceNumber) would otherwise resurrect them.
  const [deletedNums, setDeletedNums] = React.useState(() => new Set())
  // Admin custom-invoice creation (separate from inline edit so they don't clash).
  const [creating, setCreating] = React.useState(false)
  const [createForm, setCreateForm] = React.useState({})
  const [creatingSaving, setCreatingSaving] = React.useState(false)
  const [createErr, setCreateErr] = React.useState('')
  const [genNumBusy, setGenNumBusy] = React.useState(false)

  // Peek the next invoice number and drop it into the form — NOT persisted. The
  // counter only advances when the invoice is actually created.
  const handleGenerateNumber = async () => {
    setGenNumBusy(true)
    try {
      const r = await generateInvoiceNumber()
      const num = r.data?.invoiceNumber || ''
      if (num) setCreateForm(f => ({ ...f, invoiceNumber: num }))
    } catch (_) { /* non-critical — admin can still type one */ }
    finally { setGenNumBusy(false) }
  }

  const handleDeleteInvoice = async (inv) => {
    const num = inv.invoiceNumber
    if (!num) { setError('This entry has no invoice number to delete.'); return }
    if (!window.confirm(`Delete invoice ${num}?\n\nIt will be permanently removed and will no longer be visible to the ${registrationModel === 'Individual' ? 'individual' : 'airline'}. This cannot be undone.`)) return
    setDeletingNum(num)
    try {
      await deleteInvoice(registrationId, num)
      const normDeleted = String(num).replace(/^Invoice\s+/i, '').trim().toUpperCase()
      setDeletedNums(prev => new Set(prev).add(normDeleted))
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to delete invoice.')
    } finally {
      setDeletingNum(null)
    }
  }
  // Tracks the active invoice number locally so stale `record.invoiceNumber` prop
  // doesn't cause the Active badge to disappear after an inline edit.
  const [activeInvoiceNum, setActiveInvoiceNum] = React.useState(record?.invoiceNumber || '')
  // Keep in sync when parent re-renders with a fresher record (e.g. after resolveInvoiceNumber).
  React.useEffect(() => {
    if (record?.invoiceNumber && record.invoiceNumber !== activeInvoiceNum) {
      setActiveInvoiceNum(record.invoiceNumber)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.invoiceNumber])

  const load = React.useCallback(async () => {
    if (!registrationId) return
    setLoading(true); setError('')
    try {
      const res = await getInvoiceByRegistration(registrationId)
      const data = res.data?.data || res.data || []
      setInvoices(data)
      // Merge server-recorded hidden numbers so a deleted invoice stays gone
      // even after the modal is reopened (synthetic fallback respects these).
      const serverHidden = res.data?.hiddenInvoiceNumbers || []
      if (serverHidden.length) {
        setDeletedNums(prev => {
          const next = new Set(prev)
          serverHidden.forEach(n => next.add(String(n).replace(/^Invoice\s+/i, '').trim().toUpperCase()))
          return next
        })
      }
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
    const normalize = (s) => String(s || '').replace(/^Invoice\s+/i, '').trim().toUpperCase()
    // Drop anything deleted this session (server hides it too, but the synthetic
    // fallback below would otherwise rebuild it from record.invoiceNumber).
    const list = deletedNums.size
      ? invoices.filter(i => !deletedNums.has(normalize(i.invoiceNumber)))
      : invoices
    // If real Invoice docs exist, use them — no synthetic needed.
    const hasRealDocs = list.some(d => !d._source)
    if (hasRealDocs) return list
    const regNum = record?.invoiceNumber
    if (!regNum) return list
    const normReg = normalize(regNum)
    if (deletedNums.has(normReg)) return list
    const alreadyIn = list.some(i => normalize(i.invoiceNumber) === normReg)
    if (alreadyIn) return list
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
      _id: 'reg-' + registrationId,
      _source: 'registration',
      invoiceNumber: regNum,
      totalAmount,
      createdAt: record?.subscriptionDate || record?.createdAt,
      paidAt: record?.subscriptionDate || record?.updatedAt,
      plan: record?.subscriptionPlan || '',
      draft: {
        invoiceNumber: regNum,
        issueDate: record?.subscriptionDate || record?.createdAt,
        payableBy: null,
        recipientName: isAirline
          ? [record?.firstName, record?.lastName].filter(Boolean).join(' ')
          : [record?.firstName, record?.middleName, record?.lastName].filter(Boolean).join(' '),
        recipientCompany: isAirline ? (record?.airlineName || '') : '',
        recipientContact: isAirline
          ? [record?.firstName, record?.lastName].filter(Boolean).join(' ')
          : [record?.firstName, record?.middleName, record?.lastName].filter(Boolean).join(' '),
        recipientAddress1: [record?.addressLine1, record?.city, record?.state, record?.postalCode, record?.country].filter(Boolean).join(', '),
        recipientAddress2: '',
        recipientCountry: record?.country || '',
        paymentMethod: 'wire',
        lineItems,
      },
    }
    return [synthetic, ...list]
  }, [invoices, record, registrationId, registrationModel, deletedNums])

  const buildPdfPayload = (inv) => {
    const d = inv.draft || {}
    const sn = inv.invoiceSnapshot || {}
    // Build fallback lineItems from invoiceSnapshot when no draft/lineItems exist (legacy payment records)
    const snapshotLineItems = (!d.lineItems?.length && !inv.lineItems?.length && (sn.totalPaid > 0 || inv.totalAmount > 0))
      ? [{
        description: `Agent For Service${sn.subscriptionPlan ? ' - ' + sn.subscriptionPlan.replace(' Subscription Plan', '').replace(' Plan', '') : ''}`,
        quantity: sn.holderCount || 1,
        unitPrice: sn.pricePerCert || sn.totalPaid || inv.totalAmount || 0,
        totalPrice: sn.totalPaid || inv.totalAmount || 0,
      }]
      : null
    return {
      invoiceNumber: d.invoiceNumber || inv.invoiceNumber || '',
      issueDate: d.issueDate || inv.issueDate || inv.paidAt,
      payableBy: d.payableBy || inv.payableBy,
      recipientCompany: d.recipientCompany || inv.recipientCompany || sn.airlineName || '',
      recipientName: d.recipientName || inv.recipientName || sn.name || '',
      recipientContact: d.recipientContact || inv.recipientContact || d.recipientName || inv.recipientName || sn.name || '',
      recipientAddress1: d.recipientAddress1 || inv.recipientAddress1 || sn.address || '',
      recipientAddress2: d.recipientAddress2 || inv.recipientAddress2 || '',
      recipientCountry: d.recipientCountry || inv.recipientCountry || '',
      paymentMethod: d.paymentMethod || inv.paymentMethod || '',
      paymentId: d.paymentId || inv.stripePaymentIntentId || null,
      lineItems: d.lineItems?.length ? d.lineItems : (inv.lineItems?.length ? inv.lineItems : (snapshotLineItems || [])),
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

  const toDateInput = (v) => {
    if (!v) return ''
    const dt = new Date(v)
    return Number.isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10)
  }

  const openEdit = (inv) => {
    const d = inv.draft || {}
    const items = d.lineItems?.length ? d.lineItems : (inv.lineItems || [])
    const item = items[0] || {}
    setEditForm({
      invoiceNumber: d.invoiceNumber || inv.invoiceNumber || '',
      issueDate: toDateInput(d.issueDate || inv.issueDate || inv.paidAt),
      payableBy: toDateInput(d.payableBy || inv.payableBy),
      recipientName: d.recipientName || inv.recipientName || '',
      recipientCompany: d.recipientCompany || inv.recipientCompany || '',
      recipientAddress1: d.recipientAddress1 || inv.recipientAddress1 || '',
      recipientCountry: d.recipientCountry || inv.recipientCountry || '',
      paymentMethod: d.paymentMethod || inv.paymentMethod || '',
      description: item.description || (inv.plan ? 'Agent For Service - ' + inv.plan.replace(' Subscription Plan', '').replace(' Plan', '') : ''),
      quantity: String(item.quantity ?? '1'),
      unitPrice: String(item.unitPrice ?? inv.totalAmount ?? ''),
      totalPrice: String(item.totalPrice ?? inv.totalAmount ?? ''),
    })
    setSaveErr('')
    setEditing(inv)
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true); setSaveErr('')
    try {
      const qty = Number(editForm.quantity) || 1
      const unit = Number(editForm.unitPrice) || 0
      const total = Number(editForm.totalPrice) || qty * unit
      const draft = {
        invoiceNumber: editForm.invoiceNumber,
        issueDate: editForm.issueDate || editing.draft?.issueDate || editing.issueDate || editing.paidAt,
        payableBy: editForm.payableBy || editing.draft?.payableBy || editing.payableBy,
        recipientName: editForm.recipientName,
        recipientCompany: editForm.recipientCompany,
        recipientContact: editForm.recipientName,
        recipientAddress1: editForm.recipientAddress1,
        recipientAddress2: editing.draft?.recipientAddress2 || '',
        recipientCountry: editForm.recipientCountry,
        paymentMethod: editForm.paymentMethod,
        lineItems: [{
          description: editForm.description,
          quantity: qty,
          unitPrice: unit,
          totalPrice: total,
        }],
      }
      // If the entry has a real Invoice doc ID, update it.
      // Otherwise (renewal/synthetic item) look up the Invoice doc by the current
      // invoice number before falling back to creating a new one.
      let targetInvoiceId = null
      if (editing._source !== 'renewal' || editing._invoiceDocId) {
        const candidateId = editing._invoiceDocId || editing._id
        if (candidateId && !String(candidateId).startsWith('reg-')) {
          targetInvoiceId = candidateId
        }
      }
      if (!targetInvoiceId) {
        // Renewal or synthetic item — resolve Invoice doc via the registry.
        try {
          const invRes = await getInvoiceByRegistration(registrationId)
          const realDocs = (invRes.data?.data || []).filter(d => !d._source)
          const matched = realDocs.find(d => d.invoiceNumber === editing.invoiceNumber)
            || realDocs.find(d => d.adminGenerated)
            || realDocs.find(d => !d.paymentId)
            || realDocs[0]
          if (matched?._id) targetInvoiceId = matched._id
        } catch (_) { /* fall through to create */ }
      }
      if (targetInvoiceId) {
        await saveInvoiceDraftToDoc(targetInvoiceId, draft, editForm.invoiceNumber)
      } else {
        await createAdminInvoiceDoc(registrationId, registrationModel, draft, editForm.invoiceNumber)
      }
      // Only move the Active badge if the invoice being edited was the active one.
      if (editing.invoiceNumber === activeInvoiceNum) {
        setActiveInvoiceNum(editForm.invoiceNumber)
      }
      setEditing(null)
      await load()
    } catch (e) {
      setSaveErr(e?.response?.data?.message || e.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  // Open a blank custom-invoice form, prefilled with the registration's recipient.
  const openCreate = () => {
    const isAirline = registrationModel !== 'Individual'
    const todayInput = new Date().toISOString().slice(0, 10)
    const payable = new Date(); payable.setDate(payable.getDate() + 30)
    setCreateForm({
      invoiceNumber: '',
      issueDate: todayInput,
      payableBy: payable.toISOString().slice(0, 10),
      recipientName: isAirline
        ? [record?.firstName, record?.lastName].filter(Boolean).join(' ')
        : [record?.firstName, record?.middleName, record?.lastName].filter(Boolean).join(' '),
      recipientCompany: isAirline ? (record?.airlineName || '') : '',
      recipientAddress1: [record?.addressLine1, record?.city, record?.state, record?.postalCode, record?.country].filter(Boolean).join(', '),
      recipientCountry: record?.country || '',
      paymentMethod: 'wire',
      description: 'Agent For Service',
      quantity: '1',
      unitPrice: '',
      totalPrice: '',
    })
    setCreateErr('')
    setEditing(null)
    setCreating(true)
  }

  // Persist a brand-new admin invoice. Leaving Invoice # blank lets the backend
  // auto-generate one. The doc is adminGenerated + paid, so it shows to the airline.
  const handleCreate = async () => {
    setCreatingSaving(true); setCreateErr('')
    try {
      const qty = Number(createForm.quantity) || 1
      const unit = Number(createForm.unitPrice) || 0
      const total = Number(createForm.totalPrice) || qty * unit
      if (!total || total <= 0) { setCreateErr('Enter a total/unit price greater than 0.'); setCreatingSaving(false); return }
      const draft = {
        invoiceNumber: createForm.invoiceNumber || undefined,
        issueDate: createForm.issueDate || undefined,
        payableBy: createForm.payableBy || undefined,
        recipientName: createForm.recipientName,
        recipientCompany: createForm.recipientCompany,
        recipientContact: createForm.recipientName,
        recipientAddress1: createForm.recipientAddress1,
        recipientAddress2: '',
        recipientCountry: createForm.recipientCountry,
        paymentMethod: createForm.paymentMethod,
        lineItems: [{
          description: createForm.description || 'Agent For Service',
          quantity: qty,
          unitPrice: unit,
          totalPrice: total,
        }],
      }
      await createAdminInvoiceDoc(registrationId, registrationModel, draft, createForm.invoiceNumber, 'custom')
      setCreating(false)
      await load()
    } catch (e) {
      setCreateErr(e?.response?.data?.message || e.message || 'Create failed.')
    } finally {
      setCreatingSaving(false)
    }
  }

  const fmtInvDate = (d) => d
    ? new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

  const fmtAmt = (n) => n != null
    ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—'

  const renewalStatusColor = (s) => {
    if (s === 'queued') return '#92400e'
    if (s === 'active') return '#047857'
    if (s === 'superseded') return '#94a3b8'
    return '#64748b'
  }

  const hasPdf = (inv) => !!(
    inv.draft?.lineItems?.length ||
    inv.lineItems?.length ||
    inv.invoiceSnapshot?.totalPaid > 0 ||
    inv.totalAmount > 0
  )

  const showWireGenerate = onGenerateInvoice && record?.wirePaymentRequested &&
    !(invoices || []).some(d => !d._source)

  return (
    <div className={drawerMode ? 'p-3' : 'border-t border-slate-100 pt-5'}>
      <div className={`flex items-center gap-2 flex-wrap ${drawerMode ? 'justify-end mb-3' : 'justify-between mb-4'}`}>
        {!drawerMode && <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">All Invoices</p>}
        <div className="flex items-center gap-2 ml-auto">
          {showWireGenerate && (
            <button
              onClick={() => onGenerateInvoice(record)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Generate Wire Invoice
            </button>
          )}
          <button
            onClick={() => creating ? setCreating(false) : openCreate()}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${creating ? 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50' : 'bg-slate-900 text-white hover:bg-slate-700'}`}
          >
            {creating ? 'Cancel' : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Create New Invoice
              </>
            )}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Create New Invoice form */}
      {creating && (
        <div className="mb-4 rounded-xl border-2 border-slate-900/10 bg-slate-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-700">New Custom Invoice</p>
            <span className="text-[9px] text-slate-500">Leave Invoice # blank to auto-generate</span>
          </div>
          <InvoiceDraftFields form={createForm} setForm={setCreateForm} onGenerateNumber={handleGenerateNumber} generatingNumber={genNumBusy} />
          {createErr && <p className="text-[11px] text-red-600 font-semibold">{createErr}</p>}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={creatingSaving}
              className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-700 rounded-lg px-3 py-2 transition disabled:opacity-50"
            >
              {creatingSaving ? 'Creating…' : 'Create Invoice'}
            </button>
            <button
              onClick={() => setCreating(false)}
              className="inline-flex items-center justify-center text-[11px] font-bold text-slate-600 border border-slate-300 bg-white hover:bg-slate-100 rounded-lg px-4 py-2 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && visibleInvoices === null && (
        <p className="text-xs text-slate-500 italic">Loading invoices…</p>
      )}

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {!loading && visibleInvoices !== null && visibleInvoices.length === 0 && (
        <p className="text-xs text-slate-500 italic">No invoices found.</p>
      )}

      {visibleInvoices !== null && visibleInvoices.length > 0 && (
        <div className={`space-y-2 pr-1 ${drawerMode ? '' : 'max-h-[480px] overflow-y-auto'}`}>
          {visibleInvoices.map((inv) => {
            const isHolderUpgrade = inv.purpose === 'holder-upgrade' ||
              (inv.lineItems || inv.draft?.lineItems || []).some(li =>
                String(li.description || '').toLowerCase().includes('upgrade') ||
                String(li.description || '').toLowerCase().includes('holder')
              )
            const isRenewal = inv._source === 'renewal' || inv.purpose === 'renewal' || !!inv.plan
            const purposeLabel = inv._source === 'payment' ? 'Legacy'
              : isHolderUpgrade ? 'Holder Upgrade'
                : isRenewal ? 'Subscription Renewed'
                  : 'Subscription'
            const purposeCls = inv._source === 'payment' ? 'bg-slate-100 border-slate-200 text-slate-500'
              : 'bg-slate-800 border-slate-700 text-white'
            const planLabel = inv.subscriptionPlan || inv.plan || ''
            // Shared status badge — single source of truth in utils/invoiceStatus.js,
            // identical on admin + client (individual & airline). Dynamic: follows the
            // registration's active/queued plan.
            const badge = getInvoiceStatus(inv, record, { isHolderUpgrade, activeInvoiceNum })
            const isActiveInvoice = badge?.label === 'Active'
            return (
              <div key={String(inv._id)} className={`rounded-xl border px-4 py-3 transition-all ${isActiveInvoice ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'}`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[11px] font-bold text-slate-800">{inv.invoiceNumber || '(no number)'}</p>
                      <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${purposeCls}`}>
                        {purposeLabel}
                      </span>
                      {badge && (
                        <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{fmtInvDate(inv.paidAt || inv.createdAt)}</p>
                    {planLabel && <p className="text-[10px] text-slate-500 mt-0.5">{planLabel}</p>}
                    <p className="text-[10px] font-semibold text-slate-700 mt-0.5">{fmtAmt(
                      inv.draft?.lineItems?.length
                        ? inv.draft.lineItems.reduce((s, li) => s + (Number(li.totalPrice) || 0), 0)
                        : inv.totalAmount
                    )}</p>
                    {(inv.draft?.paymentId || inv.stripePaymentIntentId) && (() => {
                      const raw = String(inv.draft?.paymentId || inv.stripePaymentIntentId)
                      const clean = /^admin[_-]|^manual/i.test(raw) ? `MANUAL ${inv.invoiceNumber || ''}`.trim() : raw
                      return <p className="text-[10px] text-slate-500 mt-0.5">Payment ID: <span className="font-mono text-slate-500 break-all">{clean}</span></p>
                    })()}
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
                    {inv._source !== 'payment' && (
                      <button
                        onClick={() => editing?._id === inv._id ? setEditing(null) : openEdit(inv)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 bg-white rounded-lg px-2.5 py-1 transition"
                      >
                        {editing?._id === inv._id ? 'Cancel' : 'Edit'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteInvoice(inv)}
                      disabled={deletingNum === inv.invoiceNumber}
                      title="Delete invoice (hidden from the customer)"
                      className="text-[11px] font-semibold text-red-600 hover:text-red-800 border border-red-200 bg-white rounded-lg px-2.5 py-1 transition disabled:opacity-50"
                    >
                      {deletingNum === inv.invoiceNumber ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>

                {editing?._id === inv._id && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                    <InvoiceDraftFields form={editForm} setForm={setEditForm} />
                    {saveErr && <p className="text-[11px] text-red-600 font-semibold">{saveErr}</p>}
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full inline-flex items-center justify-center gap-1 text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-700 rounded-lg px-3 py-2 transition disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save Invoice'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


function IndividualViewModal({ record, onClose, onEdit, onManagePlan, onDeletePlan, onRecordUpdated }) {
  const fullName = [record.firstName, record.middleName, record.lastName].filter(Boolean).join(' ') || 'Individual'
  const [showInvoices, setShowInvoices] = useState(false)
  const [showRenew, setShowRenew] = useState(false)
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex flex-col lg:flex-row items-start justify-center p-4 sm:p-6 pt-20 sm:pt-20 gap-4 overflow-y-auto lg:overflow-x-auto">
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }}
          className="w-full max-w-2xl flex-shrink-0 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-100px)]"
          onClick={e => e.stopPropagation()}>
          <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50 flex-shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Individual — Record</p>
              <h2 className="text-lg font-extrabold text-slate-900">{fullName}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInvoices(v => !v)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${showInvoices ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                All Invoices
              </button>
              {record.__noPlan && (
                <button onClick={() => onManagePlan?.(record)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition">
                  Manage Plan
                </button>
              )}
              <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" /></svg>
                Edit
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition">✕</button>
            </div>
          </div>
          <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
            {record.convertedFromAirlineName && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Converted from Airline</p>
                  <p className="text-sm font-semibold text-emerald-900">{record.convertedFromAirlineName}</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">This holder was transferred from the airline subscription and given an individual account.</p>
                </div>
              </div>
            )}
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
              </div>
            </div>
            {!record.__noPlan && (() => {
              const planShort = (plan, years) =>
                plan === 'Multiple Years Subscription Plan' ? `Multi-Year${years ? ` ${years}y` : ''}`
                  : plan === 'Unlimited Plan' ? 'Unlimited'
                    : plan === '1 Year Subscription Plan' ? '1 Year' : (plan || '—')
              const unlimited = record.subscriptionPlan === 'Unlimited Plan'
              const queued = !!record.nextRenewal?.paidAt
              const expiry = getExpiryStatus(record.expirationDate, { unlimited })
              return (
                <div className="border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between mb-2">
                    <SectionHead label="Subscription Plan" />
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowRenew(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700 hover:border-blue-700 transition-all duration-150 shadow-sm shadow-blue-500/10">Manage Plan</button>
                      <button onClick={() => onDeletePlan?.(record)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 transition">Delete Plan</button>
                    </div>
                  </div>
                  <div className="rounded-xl border-2 border-blue-300 bg-blue-50/60 px-4 py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white bg-blue-600 rounded-full px-2 py-0.5">Plan</span>
                        {planShort(record.subscriptionPlan, record.multiYearCount)}
                        {queued && <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border bg-emerald-50 border-emerald-200 text-emerald-700">Renewed</span>}
                        {!queued && expiry && <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${expiry.cls}`}>{expiry.label}</span>}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {fmtMoney(record.price)} · {unlimited ? 'No expiry' : (record.expirationDate ? `expires ${fmtDate(record.expirationDate)}` : '—')}{record.invoiceNumber ? ` · ${record.invoiceNumber}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}
            {!record.__noPlan && <NextRenewalSection record={record} registrationModel="Individual" onRecordUpdated={onRecordUpdated} />}
            <div className="border-t border-slate-100 pt-5"><SectionHead label="Personal Information" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <ViewField label="First Name" value={record.firstName} />
                <ViewField label="Middle Name" value={record.middleName} />
                <ViewField label="Last Name" value={record.lastName} />
                <ViewField label="DOB" value={record.dateOfBirth ? fmtDateMDY(record.dateOfBirth) : '—'} />
                <ViewField label="Email" value={record.email} />
                <ViewField label="Phone" value={fmtPhone(record.phone, record.country)} />
                <div className="col-span-2 sm:col-span-3">
                  <ViewField label="Address" value={[record.addressLine1, record.city, record.postalCode, isoToCountry(record.country)].filter(Boolean).join(', ')} />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ViewField label="Submitted" value={fmtDate(record.createdAt)} />
                <ViewField label="Updated" value={fmtDate(record.updatedAt)} />
              </div>
            </div>
          </div>
        </motion.div>
        <AnimatePresence>
          {showInvoices && (
            <motion.div
              key="inv-drawer-individual"
              initial={{ opacity: 0, x: 40, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="w-full max-w-lg lg:w-[420px] flex-shrink-0 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-y-auto max-h-[85vh] lg:max-h-[78vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 bg-slate-900 px-4 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Invoice History</p>
                  <p className="text-sm font-bold text-white truncate max-w-[180px]">{fullName}</p>
                </div>
                <button onClick={() => setShowInvoices(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition">✕</button>
              </div>
              <AdminInvoicesPanel registrationId={record._id} registrationModel="Individual" record={record} drawerMode={true} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {showRenew && (
        <AdminRenewModal
          record={record}
          model="Individual"
          onClose={() => setShowRenew(false)}
          onSaved={(updated) => { onRecordUpdated?.(updated); setShowRenew(false) }}
        />
      )}
    </AnimatePresence>
  )
}

// ─── Wire Request Section ──────────────────────────────────────────────────────
function WireRequestSection({ record, onRecordUpdated, onGenerateInvoice }) {
  const [editing, setEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [saveErr, setSaveErr] = React.useState('')
  const [activating, setActivating] = React.useState(false)
  const [activateErr, setActivateErr] = React.useState('')

  const fmtDateInput = (v) => {
    if (!v) return ''
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
  }

  const isRenewalRequest = record.wireRequestPurpose === 'renewal'
  const isHolderUpgradeRequest = record.wireRequestPurpose === 'holder-upgrade'

  // For renewal: pre-fill dates with the NEW plan's expected period, not the current plan's dates.
  // Activation date = current expiration (new plan starts when current ends).
  // End date = empty so admin fills in the new expiry explicitly.
  const defaultSubDate = isRenewalRequest
    ? fmtDateInput(record.expirationDate)   // renewal starts when current plan ends
    : fmtDateInput(record.subscriptionDate)
  const defaultExpDate = isRenewalRequest
    ? ''                                     // admin enters new renewal end date
    : fmtDateInput(record.expirationDate)

  const [form, setForm] = React.useState({
    wireRequestPurpose: record.wireRequestPurpose || 'initial',
    wireRequestRenewalPlan: record.wireRequestRenewalPlan || '',
    wireRequestAdditionalCount: record.wireRequestAdditionalCount != null ? String(record.wireRequestAdditionalCount) : '',
    invoiceNumber: (isRenewalRequest || isHolderUpgradeRequest) ? '' : (record.invoiceNumber || ''),
    amountPaid: record.amountPaid != null ? String(record.amountPaid) : '',
    subscriptionDate: defaultSubDate,
    expirationDate: defaultExpDate,
    invoiceStatus: record.invoiceStatus || 'Wire Requested',
    paymentStatus: record.paymentStatus || 'pending',
  })

  // After admin generates a wire renewal/upgrade invoice, record.invoiceNumber updates.
  // Sync it into the form so the Invoice # input shows the newly generated number.
  // skipMountRef skips the first render so form stays blank as initialized.
  const skipInvNumRef = React.useRef(true)
  React.useEffect(() => {
    if (skipInvNumRef.current) { skipInvNumRef.current = false; return }
    if (record.invoiceNumber) {
      setForm(f => f.invoiceNumber === record.invoiceNumber ? f : { ...f, invoiceNumber: record.invoiceNumber })
    }
  }, [record.invoiceNumber])

  const purposeLabel = isRenewalRequest ? 'Renewal'
    : isHolderUpgradeRequest ? 'Holder Upgrade'
      : 'Initial'

  // Labels differ by purpose so admin isn't confused when entering renewal dates
  const subDateLabel = form.wireRequestPurpose === 'renewal' ? 'Renewal Start Date' : 'Subscription Date'
  const expDateLabel = form.wireRequestPurpose === 'renewal' ? 'Renewal End Date' : 'Expiration Date'

  const handleSave = async () => {
    setSaving(true); setSaveErr('')
    try {
      const payload = {
        wireRequestPurpose: form.wireRequestPurpose,
        wireRequestRenewalPlan: form.wireRequestPurpose === 'renewal' ? (form.wireRequestRenewalPlan || null) : null,
        wireRequestAdditionalCount: form.wireRequestPurpose === 'holder-upgrade' && form.wireRequestAdditionalCount
          ? Number(form.wireRequestAdditionalCount) : null,
        invoiceNumber: form.invoiceNumber || undefined,
        amountPaid: form.amountPaid !== '' ? Number(form.amountPaid) : undefined,
        subscriptionDate: form.subscriptionDate || undefined,
        expirationDate: form.expirationDate || undefined,
        invoiceStatus: form.invoiceStatus || undefined,
        paymentStatus: form.paymentStatus || undefined,
      }
      const saveRes = await updateAirlinesSubscription(record._id, payload)

      // When admin marks paid for renewal or holder-upgrade, activate immediately after save.
      // activateWirePayment reads the dates just saved above, then:
      //   renewal + activationDate <= now  → immediate activation (expired plan)
      //   renewal + activationDate > now   → queue as nextRenewal (active plan)
      //   holder-upgrade                   → bump committedCount + pricePerCertificate + create invoice
      const markedPaid = form.paymentStatus === 'paid'
      const isPurposeActive = form.wireRequestPurpose === 'renewal' || form.wireRequestPurpose === 'holder-upgrade'
      if (markedPaid && isPurposeActive) {
        const activateRes = await activateWirePayment(record._id)
        setEditing(false)
        onRecordUpdated?.(activateRes.data?.data || activateRes.data)
        return
      }

      setEditing(false)
      onRecordUpdated?.(saveRes.data?.data || saveRes.data)
    } catch (e) {
      setSaveErr(e?.response?.data?.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const [declining, setDeclining] = React.useState(false)
  const handleDecline = async () => {
    if (!window.confirm(`Decline this wire payment request?\n\nThe request will be removed and the subscription stays unchanged. The airline can submit a new request or pay by card.`)) return
    setDeclining(true); setActivateErr('')
    try {
      const res = await declineWirePayment(record._id)
      onRecordUpdated?.(res.data?.data || res.data)
    } catch (e) {
      setActivateErr(e?.response?.data?.message || 'Decline failed.')
    } finally {
      setDeclining(false)
    }
  }

  const handleActivate = async () => {
    const purposeStr = record.wireRequestPurpose === 'renewal' ? 'renewal' : 'activation'
    const activationDate = record.subscriptionDate ? new Date(record.subscriptionDate) : new Date()
    const isQueued = activationDate > new Date()

    // Mirror backend computeAirlinesExpirationDate so the preview matches what
    // activation will set. expirationDate may be empty for initial requests.
    const previewExpiry = () => {
      if (record.expirationDate) return new Date(record.expirationDate)
      const plan = record.wireRequestRenewalPlan || record.subscriptionPlan
      if (plan === 'Unlimited Plan') return null
      const d = new Date(activationDate)
      if (plan === '1 Year Subscription Plan') { d.setFullYear(d.getFullYear() + 1); return d }
      if (plan === 'Multiple Years Subscription Plan') {
        const years = Number(record.multiYearCount) >= 2 ? Number(record.multiYearCount) : 2
        d.setFullYear(d.getFullYear() + years); return d
      }
      return null
    }
    const exp = previewExpiry()
    const expStr = exp ? exp.toLocaleDateString() : (
      (record.wireRequestRenewalPlan || record.subscriptionPlan) === 'Unlimited Plan'
        ? 'Never (Unlimited)' : '—'
    )

    const confirmMsg = isQueued
      ? `Queue this wire payment as a renewal?\n\nPlan: ${record.wireRequestRenewalPlan || record.subscriptionPlan}\nActivates: ${activationDate.toLocaleDateString()}\nExpires: ${expStr}\n\nThe renewal will activate automatically on the set date.`
      : `Activate this wire ${purposeStr} now?\n\nThis will set the subscription to Active.\nSubscription Date: ${activationDate.toLocaleDateString()}\nExpires: ${expStr}\n\nThis cannot be automatically undone.`
    if (!window.confirm(confirmMsg)) return
    setActivating(true); setActivateErr('')
    try {
      const res = await activateWirePayment(record._id)
      onRecordUpdated?.(res.data?.data || res.data)
    } catch (e) {
      setActivateErr(e?.response?.data?.message || 'Activation failed.')
    } finally {
      setActivating(false)
    }
  }

  const field = (label, key, type = 'text', extra = {}) => (
    <div key={key}>
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">{label}</label>
      <input
        type={type}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        {...extra}
      />
    </div>
  )

  return (
    <div className="border-t border-slate-100 pt-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <SectionHead label="Wire Payment Request" />
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border bg-blue-50 border-blue-200 text-blue-600">
            {purposeLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setSaveErr(''); setEditing(v => !v) }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white hover:bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700 transition"
          >
            {editing ? 'Cancel' : 'Edit Details'}
          </button>
          {onGenerateInvoice && (
            <button
              onClick={() => {
                // Build a purpose-aware record so AdminInvoiceModal shows correct line items.
                // For renewal: override subscriptionPlan with the renewal plan.
                // For holder-upgrade: set count/price to reflect only the additional holders.
                let invoiceRecord = record
                if (record.wireRequestPurpose === 'renewal') {
                  invoiceRecord = {
                    ...record,
                    subscriptionPlan: record.wireRequestRenewalPlan || record.subscriptionPlan,
                    invoiceNumber: '',   // force fresh number — don't reuse current plan's
                    invoiceDraft: null, // no stale draft from current plan
                    _wireInvoicePurpose: 'renewal',
                  }
                } else if (record.wireRequestPurpose === 'holder-upgrade') {
                  const additional = Number(record.wireRequestAdditionalCount || 1)
                  const ppc = additional > 0 && record.amountPaid > 0
                    ? Math.round((record.amountPaid / additional) * 100) / 100
                    : Number(record.pricePerCertificate || 0)
                  invoiceRecord = {
                    ...record,
                    committedCount: additional,
                    holderCountValue: String(additional),
                    pricePerCertificate: ppc,
                    pricePerCert: ppc,
                    invoiceNumber: '',   // force fresh number
                    invoiceDraft: null,
                    _wireInvoicePurpose: 'holder-upgrade',
                  }
                }
                onGenerateInvoice(invoiceRecord)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Generate Invoice
            </button>
          )}
          <button
            onClick={handleActivate}
            disabled={activating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-1.5 text-[11px] font-bold text-white transition"
          >
            {activating ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            )}
            {activating ? 'Activating…' : 'Approve & Activate'}
          </button>
          <button
            onClick={handleDecline}
            disabled={declining || activating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 disabled:opacity-50 px-3 py-1.5 text-[11px] font-bold text-red-600 transition"
          >
            {declining ? 'Declining…' : 'Decline'}
          </button>
        </div>
      </div>
      {activateErr && <p className="text-[11px] text-red-600 font-semibold mt-1">{activateErr}</p>}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 space-y-3">
        {editing && (
          <div className="rounded-lg border border-blue-300 bg-white p-3 mb-1 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Purpose</label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  value={form.wireRequestPurpose}
                  onChange={e => setForm(f => ({ ...f, wireRequestPurpose: e.target.value }))}
                >
                  <option value="initial">Initial</option>
                  <option value="renewal">Renewal</option>
                  <option value="holder-upgrade">Holder Upgrade</option>
                </select>
              </div>
              {form.wireRequestPurpose === 'renewal' && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Renewal Plan</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    value={form.wireRequestRenewalPlan}
                    onChange={e => setForm(f => ({ ...f, wireRequestRenewalPlan: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    <option value="1 Year Subscription Plan">1 Year</option>
                    <option value="Multiple Years Subscription Plan">Multiple Years</option>
                    <option value="Unlimited Plan">Unlimited</option>
                  </select>
                </div>
              )}
              {form.wireRequestPurpose === 'holder-upgrade' && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Additional Holders</label>
                  <input type="number" min="1"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    value={form.wireRequestAdditionalCount}
                    onChange={e => setForm(f => ({ ...f, wireRequestAdditionalCount: e.target.value }))}
                  />
                </div>
              )}
              {field('Invoice #', 'invoiceNumber')}
              {field('Amount Paid ($)', 'amountPaid', 'number', { min: '0', step: '0.01' })}
              {field(subDateLabel, 'subscriptionDate', 'date')}
              {field(expDateLabel, 'expirationDate', 'date')}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Invoice Status</label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  value={form.invoiceStatus}
                  onChange={e => setForm(f => ({ ...f, invoiceStatus: e.target.value }))}
                >
                  <option value="Wire Requested">Wire Requested</option>
                  <option value="Invoice Sent">Invoice Sent</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Payment Status</label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  value={form.paymentStatus}
                  onChange={e => setForm(f => ({ ...f, paymentStatus: e.target.value }))}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
            {saveErr && <p className="text-[11px] text-red-600 font-semibold">{saveErr}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 text-[11px] font-bold text-white">
                {saving ? 'Saving…' : 'Save Wire Details'}
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-black text-blue-800 uppercase tracking-widest">Wire Invoice Requested</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <ViewField label="Requested On" value={record.wirePaymentRequestedAt ? fmtDate(record.wirePaymentRequestedAt) : '—'} />
          {record.wireRequestPurpose === 'renewal' && record.wireRequestRenewalPlan && (
            <ViewField label="Renewal Plan" value={record.wireRequestRenewalPlan.replace(' Subscription Plan', '').replace(' Plan', '')} />
          )}
          {record.wireRequestPurpose === 'holder-upgrade' && record.wireRequestAdditionalCount && (
            <ViewField label="Additional Holders" value={`+${record.wireRequestAdditionalCount}`} />
          )}
          {/* Full request snapshot — exactly what the airline asked for at checkout. */}
          {record.wireRequestDetails?.multiYearCount && (
            <ViewField label="Years" value={`${record.wireRequestDetails.multiYearCount} years`} />
          )}
          {record.wireRequestDetails?.exactCount != null && (
            <ViewField label="Requested Holder Count" value={String(record.wireRequestDetails.exactCount)} />
          )}
          {record.wireRequestDetails?.holderGroupId && (
            <ViewField label="Scope" value="Holder group renewal" />
          )}
          {record.wireRequestDetails?.mergeTarget && (
            <ViewField label="Merge Into" value={record.wireRequestDetails.mergeTarget === 'base' ? 'Base plan' : 'Existing plan'} />
          )}
          {record.wireRequestDetails?.amount != null && (
            <ViewField label="Requested Amount" value={fmtMoney(record.wireRequestDetails.amount)} />
          )}
          <ViewField label="Invoice Status" value={record.invoiceStatus} />
          {record.invoiceNumber && !(
            // For renewal/upgrade wire in initial "Wire Requested" state, record.invoiceNumber
            // is the CURRENT plan's invoice — hide it until admin generates the new invoice.
            (isRenewalRequest || isHolderUpgradeRequest) && record.invoiceStatus === 'Wire Requested'
          ) && <ViewField label="Invoice #" value={record.invoiceNumber} />}
          {(() => {
            // Wire request amount owed depends on purpose:
            //  - holder-upgrade: additional holders × price/cert
            //  - renewal: the renewal price stored in amountPaid
            //  - initial: FULL committed amount (totalAmount), NOT just filled holders.
            //    amountPaid only covers submitted holders, so it understates the bill.
            const wireAmount = isHolderUpgradeRequest
              ? Number(record.wireRequestAdditionalCount || 0) * Number(record.pricePerCertificate || record.pricePerCert || 0)
              : isRenewalRequest
                ? Number(record.amountPaid || record.totalAmount || 0)
                : Number(record.totalAmount || record.amountPaid || 0)
            return wireAmount > 0 && (
              <ViewField label="Amount Due" value={`$${wireAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
            )
          })()}
          {/* For renewal/upgrade, record.subscriptionDate/expirationDate are the CURRENT plan's dates.
              Don't show them in the wire-request view — they're not what the airline requested. */}
          {!isRenewalRequest && !isHolderUpgradeRequest && record.subscriptionDate && (
            <ViewField label="Subscription Date" value={fmtDate(record.subscriptionDate)} />
          )}
          {!isRenewalRequest && !isHolderUpgradeRequest && record.expirationDate && (
            <ViewField label="Expiration Date" value={fmtDate(record.expirationDate)} />
          )}
          <ViewField label="Payment Status" value={record.paymentStatus} />
        </div>
      </div>
    </div>
  )
}

// ─── Admin Holder Count Modal (manual upgrade / reduction) ──────────────────────
const ADMIN_ONE_YEAR_PPC = { '3 to 5': 60, '5 to 10': 55, 'More than 10': 49 }
const ADMIN_UNLIMITED_PPC = { '3 to 5': 265, '5 to 10': 255, 'More than 10': 245 }
function adminTierPpc(plan, count) {
  const range = count <= 5 ? '3 to 5' : count <= 10 ? '5 to 10' : 'More than 10'
  return plan === 'Unlimited Plan' ? ADMIN_UNLIMITED_PPC[range] : ADMIN_ONE_YEAR_PPC[range]
}

function AdminHolderCountModal({ record, onClose, onSaved }) {
  // Raw stored committed (base + all not-expired groups) — used to derive base for
  // the decrease path. The "current base slots" shown to the admin excludes
  // previous-period upgrade plans (only base + perpetual + current-period upgrades),
  // matching the airline-side Expand Holder Count modal.
  const committed = Number(record.committedCount || record.holderCountValue || record.certificateHolders?.length || 0)
  const _baseCommitted = Math.max(0, committed - allGroupSlots(record.holderGroups))
  const currentBaseSlots = _baseCommitted + currentBaseGroupSlots(record.holderGroups, record.subscriptionDate)
  const holders = record.certificateHolders || []
  const [mode, setMode] = useState('increase')
  // increase
  const [plan, setPlan] = useState('1 Year Subscription Plan')
  const [addCount, setAddCount] = useState(1)
  const [paid, setPaid] = useState(true)
  // '' = new separate plan; 'base' or a group _id = merge into that existing plan.
  const [mergeTarget, setMergeTarget] = useState('')
  // decrease — keep selection
  const [keep, setKeep] = useState(() => new Set(holders.map(h => String(h._id))))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const newTotal = currentBaseSlots + addCount
  const ppc = adminTierPpc(plan, Math.max(3, newTotal))
  const amount = ppc * addCount

  const toggleKeep = (id) => setKeep(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const planShort = (p) => p === 'Unlimited Plan' ? 'Unlimited' : '1 Year'

  // Existing plans the added holders can merge into — must be the same plan type.
  const mergeTargets = useMemo(() => {
    const list = []
    if (record.subscriptionPlan === plan)
      list.push({ id: 'base', label: `Base plan — ${planShort(record.subscriptionPlan)}`, expiry: record.expirationDate })
        ; (record.holderGroups || []).forEach((g) => {
          if (g.plan === plan) list.push({ id: String(g._id), label: `${planShort(g.plan)} plan`, expiry: g.expirationDate })
        })
    return list
  }, [record, plan])
  useEffect(() => { setMergeTarget('') }, [plan])

  // ── Decrease: group holders by plan so admin removes specific members per plan ──
  const groupLabelShort = (g) => (g.plan === 'Unlimited Plan' ? 'Unlimited' : 'Multiple Years Subscription Plan' === g.plan ? 'Multi-Year' : '1 Year') + ' upgrade'
  const planSections = useMemo(() => {
    const sections = [{
      key: 'base',
      label: `Base plan — ${planShort(record.subscriptionPlan)}`,
      holders: holders.filter(h => !h.holderGroupId),
    }]
    ;(record.holderGroups || []).forEach((g, gi) => {
      sections.push({
        key: String(g._id),
        label: `${groupLabelShort(g)} #${gi + 1}`,
        holders: holders.filter(h => String(h.holderGroupId || '') === String(g._id)),
      })
    })
    return sections
  }, [holders, record])

  // Keep/remove every member of one plan section at once.
  const setSectionKeep = (secHolders, keepAll) => setKeep(prev => {
    const n = new Set(prev)
    secHolders.forEach(h => { const id = String(h._id); if (keepAll) n.add(id); else n.delete(id) })
    return n
  })

  // Recompute kept holders + each plan's committed count after removals.
  const decreaseResult = useMemo(() => {
    const removed = holders.filter(h => !keep.has(String(h._id)))
    const keptHolders = holders.filter(h => keep.has(String(h._id)))
    const removedByGroup = {}
    let removedBase = 0
    removed.forEach(h => {
      if (h.holderGroupId) removedByGroup[String(h.holderGroupId)] = (removedByGroup[String(h.holderGroupId)] || 0) + 1
      else removedBase++
    })
    const groups = record.holderGroups || []
    // committedCount = base + ACTIVE group slots; expired groups aren't in it.
    const baseCommittedSlots = Math.max(0, committed - allGroupSlots(groups))
    const newBaseCommitted = Math.max(0, baseCommittedSlots - removedBase)
    // Each removed member frees one committed slot from its plan; drop emptied groups.
    const newGroups = groups
      .map(g => ({ ...g, count: Math.max(0, Number(g.count || 0) - (removedByGroup[String(g._id)] || 0)) }))
      .filter(g => Number(g.count) > 0)
    // Recompute committed from base + remaining ACTIVE group slots only.
    const newCommitted = newBaseCommitted + allGroupSlots(newGroups)
    return { keptHolders, newGroups, newCommitted }
  }, [holders, keep, record, committed])

  const submit = async () => {
    setBusy(true); setErr('')
    try {
      if (mode === 'increase') {
        const res = await adminHolderUpgrade(record._id, { plan, additionalCount: addCount, paid, mergeTarget: mergeTarget || undefined })
        onSaved(res.data?.data)
      } else {
        const { keptHolders, newGroups, newCommitted } = decreaseResult
        if (keptHolders.length === holders.length) { setErr('Untick at least one member to remove.'); setBusy(false); return }
        if (keptHolders.length === 0) { setErr('Keep at least one holder.'); setBusy(false); return }
        const res = await updateAirlinesSubscription(record._id, {
          certificateHolders: keptHolders,
          holderGroups: newGroups,
          committedCount: newCommitted,
          holderCountValue: String(newCommitted),
        })
        onSaved(res.data?.data)
      }
      onClose()
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed.')
    } finally { setBusy(false) }
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-start justify-center p-4 pt-20 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between bg-slate-50 flex-shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Holder Count</p>
              <h3 className="text-base font-extrabold text-slate-900">Manage Holders</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100">✕</button>
          </div>

          <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
            {err && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMode('increase')} className={`rounded-lg border px-3 py-2 text-xs font-bold ${mode === 'increase' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>Increase</button>
              <button onClick={() => setMode('decrease')} className={`rounded-lg border px-3 py-2 text-xs font-bold ${mode === 'decrease' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>Decrease</button>
            </div>
            <p className="text-[11px] text-slate-500">Current base slots: <span className="font-bold text-slate-800">{currentBaseSlots}</span> · holders on file: {holders.length}</p>

            {mode === 'increase' ? (
              <>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Plan for these holders</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['1 Year Subscription Plan', 'Unlimited Plan'].map(p => (
                      <button key={p} onClick={() => setPlan(p)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${plan === p ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{planShort(p)}</button>
                    ))}
                  </div>
                </div>
                {mergeTargets.length > 0 && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Attach to</label>
                    <div className="space-y-1.5">
                      <label className={`flex items-start gap-2 px-3 py-2 rounded-lg border cursor-pointer ${mergeTarget === '' ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}>
                        <input type="radio" className="mt-0.5 accent-blue-600" checked={mergeTarget === ''} onChange={() => setMergeTarget('')} />
                        <span>
                          <span className="block text-xs font-bold text-slate-800">New separate plan</span>
                          <span className="block text-[10px] text-slate-500">Independent — full term from today.</span>
                        </span>
                      </label>
                      {mergeTargets.map(t => (
                        <label key={t.id} className={`flex items-start gap-2 px-3 py-2 rounded-lg border cursor-pointer ${mergeTarget === t.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}>
                          <input type="radio" className="mt-0.5 accent-blue-600" checked={mergeTarget === t.id} onChange={() => setMergeTarget(t.id)} />
                          <span>
                            <span className="block text-xs font-bold text-slate-800">Merge into {t.label}</span>
                            <span className="block text-[10px] text-slate-500">Shares its dates{t.expiry ? ` — expires ${fmtDate(t.expiry)}` : (plan === 'Unlimited Plan' ? ' — no expiry' : '')}. Separate invoice.</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500">Holders to add</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setAddCount(c => Math.max(1, c - 1))} className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 font-bold">−</button>
                    <span className="text-lg font-black w-6 text-center">{addCount}</span>
                    <button onClick={() => setAddCount(c => c + 1)} className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 font-bold">+</button>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Amount</p>
                    <p className="text-[10px] text-white/70">${ppc}/cert × {addCount}</p>
                  </div>
                  <span className="text-xl font-black text-white">${amount.toFixed(2)}</span>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Payment</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setPaid(true)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${paid ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>Paid (invoice)</button>
                    <button onClick={() => setPaid(false)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${!paid ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600'}`}>Pending</button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{paid ? 'Generates an invoice now; airline can see it.' : 'No invoice yet — mark paid later to generate it.'}</p>
                </div>
              </>
            ) : (
              <>
                <p className="text-[11px] text-slate-500">Choose a plan, then untick the members to remove. Each removed member frees one committed slot from <span className="font-semibold text-slate-700">that</span> plan.</p>
                {holders.length === 0 && <p className="px-3 py-4 text-xs text-slate-500 text-center rounded-xl border border-slate-200">No holders on file.</p>}
                <div className="space-y-2.5 max-h-72 overflow-y-auto -mx-1 px-1">
                  {planSections.map(sec => {
                    const keptInSec = sec.holders.filter(h => keep.has(String(h._id))).length
                    const total = sec.holders.length
                    return (
                      <div key={sec.key} className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-600 truncate">{sec.label}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[10px] font-bold text-slate-500">Keep {keptInSec}/{total}</span>
                            {total > 0 && (
                              <button onClick={() => setSectionKeep(sec.holders, keptInSec !== total)}
                                className="text-[10px] font-bold text-blue-600 hover:underline">
                                {keptInSec === total ? 'Remove all' : 'Keep all'}
                              </button>
                            )}
                          </div>
                        </div>
                        {total === 0
                          ? <p className="px-3 py-3 text-[11px] text-slate-500 text-center">No members on file in this plan.</p>
                          : (
                            <div className="divide-y divide-slate-100">
                              {sec.holders.map((h, i) => {
                                const removing = !keep.has(String(h._id))
                                return (
                                  <label key={String(h._id || i)} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 ${removing ? 'bg-red-50/40' : ''}`}>
                                    <input type="checkbox" checked={keep.has(String(h._id))} onChange={() => toggleKeep(String(h._id))} className="w-4 h-4 accent-blue-600" />
                                    <div className="min-w-0 flex-1">
                                      <p className={`text-xs font-bold truncate ${removing ? 'text-red-600 line-through' : 'text-slate-800'}`}>{h.fullName || '(unnamed)'}</p>
                                      <p className="text-[10px] text-slate-500 truncate">{h.iacraFtnNumber || h.faaCertificateNumber || ''}</p>
                                    </div>
                                    {removing && <span className="text-[9px] font-bold uppercase tracking-wide text-red-500 flex-shrink-0">Remove</span>}
                                  </label>
                                )
                              })}
                            </div>
                          )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-900 px-3.5 py-2.5">
                  <span className="text-[11px] font-bold text-white">Keeping {keep.size} of {holders.length}</span>
                  <span className="text-[11px] font-semibold text-white/80">New committed: <span className="font-black text-white">{decreaseResult.newCommitted}</span></span>
                </div>
              </>
            )}
          </div>

          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex gap-2.5 flex-shrink-0">
            <button onClick={onClose} disabled={busy} className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-600">Cancel</button>
            <button onClick={submit} disabled={busy} className="flex-1 rounded-xl py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition disabled:opacity-50">
              {busy ? 'Saving…' : mode === 'increase' ? (paid ? 'Add & Generate Invoice' : 'Add (Pending)') : 'Apply Reduction'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ─── Airline View Modal ────────────────────────────────────────────────────────
function AirlineViewModal({ record, onClose, onEdit, onRecordUpdated, onGenerateInvoice }) {
  const [showInvoices, setShowInvoices] = useState(false)
  const [showHolderCount, setShowHolderCount] = useState(false)
  const [markingPaidId, setMarkingPaidId] = useState(null)
  const [activatingGroupId, setActivatingGroupId] = useState(null)
  const [activatingBase, setActivatingBase] = useState(false)
  // Holder-upgrade group whose detail popup is open (holders + price + add).
  const [groupModal, setGroupModal] = useState(null)
  // Admin renewal modal target: null | { group } (group null = base subscription).
  const [renewTarget, setRenewTarget] = useState(null)

  const handleMarkGroupPaid = async (groupId) => {
    setMarkingPaidId(groupId)
    try {
      const res = await markHolderGroupPaid(record._id, groupId)
      onRecordUpdated?.(res.data?.data)
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to mark paid.')
    } finally {
      setMarkingPaidId(null)
    }
  }

  const handleActivateGroupRenewal = async (group) => {
    const planLbl = group.nextRenewal?.plan || 'queued plan'
    if (!window.confirm(`Start the queued plan now for this upgrade?\n\nSwitch to: ${planLbl}\nA fresh period begins today and expiry is recomputed from now.\n\nThis cannot be undone automatically.`)) return
    setActivatingGroupId(String(group._id))
    try {
      const res = await activateGroupRenewalNow(record._id, group._id)
      onRecordUpdated?.(res.data?.data)
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to activate queued renewal.')
    } finally {
      setActivatingGroupId(null)
    }
  }

  const [deletingGroupId, setDeletingGroupId] = useState(null)
  const handleDeleteGroup = async (group) => {
    const slots = Number(group.count || 0)
    const planLbl = group.plan === 'Unlimited Plan' ? 'Unlimited' : group.plan === 'Multiple Years Subscription Plan' ? 'Multiple Years' : '1 Year'
    if (!window.confirm(`Delete this ${planLbl} upgrade plan?\n\nThis removes the plan, its ${slots} holder slot${slots !== 1 ? 's' : ''}, and the holders attached to it from the airline's account.\n\nThis cannot be undone.`)) return
    setDeletingGroupId(String(group._id))
    try {
      const res = await deleteHolderGroup(record._id, group._id)
      onRecordUpdated?.(res.data?.data)
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to delete plan.')
    } finally {
      setDeletingGroupId(null)
    }
  }

  const handleActivateBaseRenewal = async () => {
    const planLbl = record.nextRenewal?.plan || 'queued plan'
    if (!window.confirm(`Start the queued base plan now?\n\nSwitch to: ${planLbl}\nExpiry is recomputed from today.\n\nThis cannot be undone automatically.`)) return
    setActivatingBase(true)
    try {
      const res = await activateQueuedRenewal(record._id, 'Airlines')
      onRecordUpdated?.(res.data?.data)
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to activate queued renewal.')
    } finally {
      setActivatingBase(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex flex-col lg:flex-row items-start justify-center p-4 sm:p-6 pt-20 sm:pt-20 gap-4 overflow-y-auto lg:overflow-x-auto">
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }}
          className="w-full max-w-3xl flex-shrink-0 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-100px)]"
          onClick={e => e.stopPropagation()}>
          <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50 flex-shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Airline — Record</p>
              <h2 className="text-lg font-extrabold text-slate-900">{record.airlineName || 'Airline'}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInvoices(v => !v)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${showInvoices ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                All Invoices
              </button>
              <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4 20 4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" /></svg>
                Edit
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition">✕</button>
            </div>
          </div>
          <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
            <div><SectionHead label="Status & Subscription" badge="Base Plan" />
              <p className="-mt-2 mb-3 text-[11px] text-slate-500">Plan, holder count, dates and pricing below are for the <span className="font-semibold text-slate-600">base plan</span>. To edit any plan's details or its added holders, use <span className="font-semibold text-slate-600">Edit</span>.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <ViewField label="Status" value={<StatusText value={record.isPaid ? 'Active' : (record.status || 'Pending')} type="status" isPaid={record.isPaid} />} />
                <ViewField label="Payment Confirmed" value={<StatusText type="isPaid" isPaid={record.isPaid} />} />
                <ViewField label="Payment" value={<StatusText value={record.paymentStatus} isPaid={record.isPaid} />} />
                <ViewField label="Invoice" value={record.invoiceStatus} />
                <ViewField label="Wire Request" value={record.wirePaymentRequested ? `Requested${record.wirePaymentRequestedAt ? ` on ${fmtDate(record.wirePaymentRequestedAt)}` : ''}` : 'No'} />
                <ViewField label="Base Invoice #" value={record.invoiceNumber} />
                <ViewField label="Base Plan" value={record.subscriptionPlan} />
                <ViewField label="Holder Count" value={record.holderCount} />
                <ViewField label="Exact Count" value={record.holderCountValue} />
                <ViewField label="Subscription Date" value={record.subscriptionDate ? fmtDateYMD(record.subscriptionDate) : (record.isPaid ? fmtDateYMD(record.updatedAt) : 'Activates on payment')} />
                <ViewField label="Expiration Date" value={record.subscriptionPlan === 'Unlimited Plan' ? 'Never (Unlimited)' : record.expirationDate ? fmtDateYMD(record.expirationDate) : record.isPaid ? '—' : 'Activates on payment'} />
                <ViewField label="Price/Cert" value={fmtMoney(record.pricePerCertificate ?? record.pricePerCert)} />
                <ViewField label="Base Total Fees" value={fmtAirlineTotal(record)} />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-5"><SectionHead label="Airline / Operator" />
              {record.logoUrl && (
                <div className="mb-4 flex items-center gap-3">
                  <img src={record.logoUrl} alt="Company logo" className="w-14 h-14 rounded-xl object-contain border border-slate-200 bg-white" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Company Logo</p>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{record.airlineName}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="col-span-2 sm:col-span-3"><ViewField label="Company" value={record.airlineName} /></div>
                <div className="col-span-2 sm:col-span-3"><ViewField label="Address" value={[record.addressLine1, record.addressLine2, record.city, record.state, record.postalCode, isoToCountry(record.country)].filter(Boolean).join(', ')} /></div>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-5"><SectionHead label="Point of Contact" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <ViewField label="First Name" value={record.firstName || record.contactFirstName} />
                <ViewField label="Last Name" value={record.lastName || record.contactLastName} />
                <ViewField label="Middle Name" value={record.middleName} />
                <ViewField label="Date of Birth" value={record.dateOfBirth ? fmtDateMDY(record.dateOfBirth) : '—'} />
                <ViewField label="Email" value={record.email || record.contactEmail} />
                <ViewField label="Phone" value={fmtPhone(record.phone || record.contactPhone, record.country)} />
                <ViewField label="Payment Email" value={record.paymentEmail} />
              </div>
            </div>
            {(() => {
              const planShort = (plan, years) =>
                plan === 'Multiple Years Subscription Plan' ? `Multi-Year${years ? ` ${years}y` : ''}`
                  : plan === 'Unlimited Plan' ? 'Unlimited'
                    : plan === '1 Year Subscription Plan' ? '1 Year' : (plan || '—')
              const hasGroups = Array.isArray(record.holderGroups) && record.holderGroups.length > 0
              return (
                <div className="border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between mb-2">
                    <SectionHead label="Subscription Plans" />
                    <button onClick={() => setShowHolderCount(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700 hover:border-blue-700 transition-all duration-150 shadow-sm shadow-blue-500/10">Manage Plans</button>
                  </div>
                  <div className="space-y-2">
                    {/* BASE PLAN — main subscription driving holder capacity */}
                    {(() => {
                      const totalGroupSlots = allGroupSlots(record.holderGroups)
                      const baseCommitted = Math.max(0, Number(record.committedCount || record.holderCountValue || 0) - totalGroupSlots)
                      const baseFilled = (record.certificateHolders || []).filter(h => !h.holderGroupId).length
                      const basePpc = Number(record.pricePerCertificate || record.pricePerCert || 0)
                      const baseUnlimited = record.subscriptionPlan === 'Unlimited Plan'
                      const baseQueued = !!record.nextRenewal?.paidAt
                      const baseExpiry = getExpiryStatus(record.expirationDate, { unlimited: baseUnlimited })
                      return (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setGroupModal({ __base: true })}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setGroupModal({ __base: true }) } }}
                          title="View base-plan holders & manage"
                          className="rounded-xl border-2 border-blue-300 bg-blue-50/60 px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
                        >
                          <div>
                            <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              <span className="text-[9px] font-black uppercase tracking-widest text-white bg-blue-600 rounded-full px-2 py-0.5">Base Plan</span>
                              {planShort(record.subscriptionPlan, record.multiYearCount)}
                              {baseQueued && <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border bg-emerald-50 border-emerald-200 text-emerald-700">Renewed</span>}
                              {!baseQueued && baseExpiry && <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${baseExpiry.cls}`}>{baseExpiry.label}</span>}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              ${basePpc}/cert · ${Number(basePpc * baseCommitted).toLocaleString('en-US', { minimumFractionDigits: 2 })} · {baseUnlimited ? 'No expiry' : (record.expirationDate ? `expires ${fmtDate(record.expirationDate)}` : '—')}{record.invoiceNumber ? ` · ${record.invoiceNumber}` : ''}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Main plan — holder capacity depends on this. Renew before expiry.</p>
                            {baseQueued && (
                              <p className="text-[10px] font-bold text-emerald-700 mt-0.5">
                                Renewal queued — {planShort(record.nextRenewal.plan)} activates {record.nextRenewal.activationDate ? fmtDate(record.nextRenewal.activationDate) : 'at expiry'}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className="text-[10px] font-bold text-slate-600">{baseFilled}/{baseCommitted}</span>
                            {!baseUnlimited && !baseQueued && (
                              <button onClick={(e) => { e.stopPropagation(); setRenewTarget({ group: null }) }}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 transition">
                                Renew
                              </button>
                            )}
                            {baseQueued && (
                              <button onClick={(e) => { e.stopPropagation(); handleActivateBaseRenewal() }} disabled={activatingBase}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 disabled:opacity-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 transition">
                                {activatingBase ? 'Activating…' : 'Activate Now'}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })()}

                    {hasGroups && <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 pt-1">Added Holder Plans ({record.holderGroups.length})</p>}
                    {hasGroups && record.holderGroups.map((g, gi) => {
                      const filled = (record.certificateHolders || []).filter(h => String(h.holderGroupId || '') === String(g._id)).length
                      const pending = g.paymentStatus === 'pending'
                      const gExpiry = getExpiryStatus(g.expirationDate, { unlimited: g.plan === 'Unlimited Plan' })
                      return (
                        <div
                          key={String(g._id || gi)}
                          role="button"
                          tabIndex={0}
                          onClick={() => setGroupModal(g)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setGroupModal(g) } }}
                          title="View holders & manage this plan"
                          className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition"
                        >
                          <div>
                            <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              {planShort(g.plan, g.multiYearCount)} <span className="text-slate-500 font-semibold">upgrade</span>
                              <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${pending ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{pending ? 'Pending' : 'Paid'}</span>
                              {!g.nextRenewal?.paidAt && gExpiry && <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${gExpiry.cls}`}>{gExpiry.label}</span>}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">${g.pricePerCert}/cert · ${Number(g.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} · {g.plan === 'Unlimited Plan' ? 'No expiry' : (g.expirationDate ? `expires ${fmtDate(g.expirationDate)}` : '—')}{g.invoiceNumber ? ` · ${g.invoiceNumber}` : ''}</p>
                            {g.nextRenewal?.paidAt && (
                              <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                                <p className="text-[10px] font-bold text-emerald-700">Renewal queued — {planShort(g.nextRenewal.plan)}{g.nextRenewal.count ? ` · ${g.nextRenewal.count} holders` : ''}{g.nextRenewal.price ? ` · $${Number(g.nextRenewal.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''} activates {g.nextRenewal.activationDate ? fmtDate(g.nextRenewal.activationDate) : 'at expiry'}</p>
                                <button onClick={(e) => { e.stopPropagation(); handleActivateGroupRenewal(g) }} disabled={activatingGroupId === String(g._id)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 disabled:opacity-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 transition">
                                  {activatingGroupId === String(g._id) ? 'Activating…' : 'Activate Now'}
                                </button>
                              </div>
                            )}
                            {pending && (
                              <button onClick={(e) => { e.stopPropagation(); handleMarkGroupPaid(g._id) }} disabled={markingPaidId === String(g._id)}
                                className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-2.5 py-1 text-[10px] font-bold text-white transition">
                                {markingPaidId === String(g._id) ? 'Generating…' : 'Mark Paid & Generate Invoice'}
                              </button>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className="text-[10px] font-bold text-slate-600">{filled}/{g.count}</span>
                            {g.plan !== 'Unlimited Plan' && !g.nextRenewal?.paidAt && (
                              <button onClick={(e) => { e.stopPropagation(); setRenewTarget({ group: g }) }}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 transition">
                                Renew
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g) }} disabled={deletingGroupId === String(g._id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white hover:bg-red-50 disabled:opacity-50 px-2 py-0.5 text-[10px] font-bold text-red-600 transition">
                              {deletingGroupId === String(g._id) ? 'Deleting…' : 'Delete plan'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
            {record.certificateHolders?.length > 0 && (() => {
              const planShort = (plan, years) =>
                plan === 'Multiple Years Subscription Plan' ? `Multi-Year${years ? ` ${years}y` : ''}`
                  : plan === 'Unlimited Plan' ? 'Unlimited'
                    : plan === '1 Year Subscription Plan' ? '1 Year' : (plan || '—')
              const groups = record.holderGroups || []
              const holderPlan = (h) => {
                if (h.holderGroupId) {
                  const g = groups.find(grp => String(grp._id) === String(h.holderGroupId))
                  if (g) return { label: planShort(g.plan, g.multiYearCount), isGroup: true, expiry: g.expirationDate, unlimited: g.plan === 'Unlimited Plan' }
                }
                return { label: planShort(record.subscriptionPlan, record.multiYearCount), isGroup: false, expiry: record.expirationDate, unlimited: record.subscriptionPlan === 'Unlimited Plan' }
              }
              return (
                <div className="border-t border-slate-100 pt-5">
                  <SectionHead label={`Certificate Holders (${record.certificateHolders.length})`} />
                  <div className="space-y-3">
                    {record.certificateHolders.map((h, i) => (
                      <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Holder #{i + 1}</p>
                          {(() => {
                            const p = holderPlan(h)
                            const exp = getExpiryStatus(p.expiry, { unlimited: p.unlimited })
                            return (
                              <span className="flex flex-wrap items-center gap-1 justify-end">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${p.isGroup ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                                  {p.label}{p.isGroup ? ' · upgrade' : ''}
                                </span>
                                {exp && <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${exp.cls}`}>{exp.label}</span>}
                              </span>
                            )
                          })()}
                        </div>
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
              )
            })()}
            {record.wirePaymentRequested && (
              <WireRequestSection record={record} onRecordUpdated={onRecordUpdated} onGenerateInvoice={onGenerateInvoice} />
            )}
            <div className="border-t border-slate-100 pt-5"><SectionHead label="Record Info" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ViewField label="Submitted" value={fmtDate(record.createdAt)} />
                <ViewField label="Updated" value={fmtDate(record.updatedAt)} />
              </div>
            </div>
          </div>
        </motion.div>
        <AnimatePresence>
          {showInvoices && (
            <motion.div
              key="inv-drawer-airline"
              initial={{ opacity: 0, x: 40, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="w-full max-w-lg lg:w-[420px] flex-shrink-0 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-y-auto max-h-[85vh] lg:max-h-[78vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 bg-slate-900 px-4 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Invoice History</p>
                  <p className="text-sm font-bold text-white truncate max-w-[180px]">{record.airlineName || 'Airline'}</p>
                </div>
                <button onClick={() => setShowInvoices(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition">✕</button>
              </div>
              <AdminInvoicesPanel registrationId={record._id} registrationModel="Airlines" record={record} drawerMode={true} onGenerateInvoice={onGenerateInvoice} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {showHolderCount && (
        <AdminHolderCountModal
          record={record}
          onClose={() => setShowHolderCount(false)}
          onSaved={(updated) => onRecordUpdated?.(updated)}
        />
      )}
      {groupModal && (
        <AdminGroupHoldersModal
          record={record}
          group={groupModal}
          onClose={() => setGroupModal(null)}
          onSaved={(updated) => { onRecordUpdated?.(updated); setGroupModal(null) }}
          onRenew={(g) => { setGroupModal(null); setRenewTarget({ group: g }) }}
        />
      )}
      {renewTarget && (
        <AdminRenewModal
          record={record}
          model="Airlines"
          group={renewTarget.group || null}
          onClose={() => setRenewTarget(null)}
          onSaved={(updated) => { onRecordUpdated?.(updated); setRenewTarget(null) }}
        />
      )}
    </AnimatePresence>
  )
}

// ─── Admin: per holder-upgrade-group detail (view / edit / add holders) ─────────
const GROUP_CERT_TYPES = [
  'Part 61 - Pilot',
  'Part 61 - Flight or Ground Instructor',
  'Part 65 - Aircraft Dispatcher',
  'Part 107 - Remote Pilot',
]
function AdminGroupHoldersModal({ record, group, onClose, onSaved, onRenew }) {
  const planShort = (plan, years) =>
    plan === 'Multiple Years Subscription Plan' ? `Multi-Year${years ? ` ${years}y` : ''}`
      : plan === 'Unlimited Plan' ? 'Unlimited'
        : plan === '1 Year Subscription Plan' ? '1 Year' : (plan || '—')

  // Base mode: group is null or flagged __base — manage the main subscription's
  // holders (those with no holderGroupId). Otherwise manage one upgrade group.
  const isBase = !group || group.__base
  const gid = isBase ? '' : String(group._id || '')
  const allHolders = record.certificateHolders || []
  const totalGroupSlots = allGroupSlots(record.holderGroups)
  const capacity = isBase
    ? Math.max(0, Number(record.committedCount || record.holderCountValue || 0) - totalGroupSlots)
    : Number(group.count || 0)
  const planVal = isBase ? record.subscriptionPlan : group.plan
  const multiVal = isBase ? record.multiYearCount : group.multiYearCount
  const ppcVal = isBase ? Number(record.pricePerCertificate || record.pricePerCert || 0) : Number(group.pricePerCert || 0)
  const amountVal = isBase ? ppcVal * capacity : Number(group.amount || 0)
  const expiryVal = isBase ? record.expirationDate : group.expirationDate
  const invVal = isBase ? record.invoiceNumber : group.invoiceNumber

  // Single editable list seeded from this group's existing holders.
  // Existing holders keep their _id so the backend updates them in place.
  const toRow = (h) => ({
    _id: h._id,
    fullName: h.fullName || '',
    certificateType: h.certificateType || 'Part 65 - Aircraft Dispatcher',
    certificateStatus: h.certificateStatus || 'EXISTING',
    iacraFtnNumber: h.iacraFtnNumber || '',
    faaCertificateNumber: h.faaCertificateNumber || '',
    email: h.email || '',
    dateOfBirth: h.dateOfBirth ? String(h.dateOfBirth).slice(0, 10) : '',
    hasSecondaryCertificate: !!h.hasSecondaryCertificate,
    secondaryCertificateType: h.secondaryCertificateType || '',
    secondaryFaaCertificateNumber: h.secondaryFaaCertificateNumber || '',
    secondaryIacraFtnNumber: h.secondaryIacraFtnNumber || '',
  })
  const emptyRow = () => ({
    fullName: '', certificateType: 'Part 65 - Aircraft Dispatcher', certificateStatus: 'EXISTING',
    iacraFtnNumber: '', faaCertificateNumber: '', email: '', dateOfBirth: '',
    hasSecondaryCertificate: false, secondaryCertificateType: '',
    secondaryFaaCertificateNumber: '', secondaryIacraFtnNumber: '',
  })

  const [rows, setRows] = useState(() => allHolders.filter(h => isBase ? !h.holderGroupId : String(h.holderGroupId || '') === gid).map(toRow))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // ── Queued renewal (nextRenewal) — editable so admin changes sync to client ──
  const queuedRenewal = isBase
    ? (record.nextRenewal?.paidAt ? record.nextRenewal : null)
    : (group?.nextRenewal?.paidAt ? group.nextRenewal : null)
  const fmtDInput = (v) => (v ? String(v).slice(0, 10) : '')
  const [showRenewalEdit, setShowRenewalEdit] = useState(false)
  const [rnForm, setRnForm] = useState(() => ({
    plan: queuedRenewal?.plan || '',
    multiYearCount: queuedRenewal?.multiYearCount || '',
    count: queuedRenewal?.count ?? queuedRenewal?.committedCount ?? '',
    price: queuedRenewal?.price ?? '',
    pricePerCert: queuedRenewal?.pricePerCert ?? '',
    activationDate: fmtDInput(queuedRenewal?.activationDate),
    expiresAt: fmtDInput(queuedRenewal?.expiresAt),
    invoiceNumber: queuedRenewal?.invoiceNumber || '',
  }))
  const [savingRn, setSavingRn] = useState(false)
  const [rnErr, setRnErr] = useState('')
  const setRn = (f, v) => setRnForm(p => ({ ...p, [f]: v }))

  const saveRenewal = async () => {
    setSavingRn(true); setRnErr('')
    try {
      const isUnlimited = rnForm.plan === 'Unlimited Plan'
      if (isBase) {
        const payload = {
          plan: rnForm.plan,
          activationDate: rnForm.activationDate || null,
          expiresAt: isUnlimited ? null : (rnForm.expiresAt || null),
          price: Number(rnForm.price) || 0,
          invoiceNumber: rnForm.invoiceNumber,
        }
        if (rnForm.count !== '') payload.committedCount = Number(rnForm.count)
        if (rnForm.plan === 'Multiple Years Subscription Plan') payload.multiYearCount = Number(rnForm.multiYearCount) || undefined
        const res = await updateAirlinesRenewalDetails(record._id, payload)
        onSaved(res.data?.data)
      } else {
        const updatedGroups = (record.holderGroups || []).map(g => {
          if (String(g._id) !== gid) return g
          return {
            ...g,
            nextRenewal: {
              ...(g.nextRenewal || {}),
              plan: rnForm.plan,
              multiYearCount: rnForm.plan === 'Multiple Years Subscription Plan' ? (Number(rnForm.multiYearCount) || null) : null,
              count: rnForm.count !== '' ? Number(rnForm.count) : (g.nextRenewal?.count ?? null),
              pricePerCert: rnForm.pricePerCert !== '' ? Number(rnForm.pricePerCert) : (g.nextRenewal?.pricePerCert ?? null),
              price: Number(rnForm.price) || 0,
              activationDate: rnForm.activationDate || null,
              expiresAt: isUnlimited ? null : (rnForm.expiresAt || null),
              invoiceNumber: rnForm.invoiceNumber || null,
            },
          }
        })
        const res = await updateAirlinesSubscription(record._id, { holderGroups: updatedGroups })
        onSaved(res.data?.data)
      }
    } catch (e) {
      setRnErr(e?.response?.data?.message || 'Failed to update queued renewal.')
    } finally { setSavingRn(false) }
  }

  const canAdd = rows.length < capacity
  const addRow = () => { if (canAdd) setRows(r => [...r, emptyRow()]) }
  const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i))
  const setField = (i, f, v) => setRows(r => r.map((h, idx) => idx === i ? { ...h, [f]: v } : h))

  const save = async () => {
    const cleaned = rows
      .filter(h => h.fullName?.trim() || h.iacraFtnNumber?.trim())
      .map(h => ({
        ...h,
        holderGroupId: isBase ? null : gid,
        dateOfBirth: h.dateOfBirth || null,
        // Clear secondary fields when the toggle is off so stale data isn't saved.
        secondaryCertificateType: h.hasSecondaryCertificate ? h.secondaryCertificateType : '',
        secondaryFaaCertificateNumber: h.hasSecondaryCertificate ? h.secondaryFaaCertificateNumber : '',
        secondaryIacraFtnNumber: h.hasSecondaryCertificate ? h.secondaryIacraFtnNumber : '',
      }))
    for (const h of cleaned) {
      if (!h.fullName?.trim()) { setErr('Each holder needs a full name.'); return }
      if (!h.certificateType) { setErr('Each holder needs a certificate type.'); return }
      if (!h.iacraFtnNumber?.trim()) { setErr('Each holder needs an IACRA FTN.'); return }
      if (h.hasSecondaryCertificate && !h.secondaryCertificateType) {
        setErr('Select a secondary certificate type, or turn the toggle off.'); return
      }
    }
    if (cleaned.length > capacity) { setErr(`This plan holds ${capacity} certificate holder${capacity !== 1 ? 's' : ''}.`); return }
    setBusy(true); setErr('')
    try {
      // Keep every holder NOT in this unit untouched; replace this unit's set.
      const others = allHolders.filter(h => isBase ? !!h.holderGroupId : String(h.holderGroupId || '') !== gid)
      const res = await updateAirlinesSubscription(record._id, { certificateHolders: [...others, ...cleaned] })
      onSaved(res.data?.data)
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to save holders.')
    } finally { setBusy(false) }
  }

  const lbl = 'block text-[11px] font-semibold text-slate-500 mb-1'
  const inp = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition'
  const filled = rows.length
  const stat = (label, value) => (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-800 truncate">{value}</p>
    </div>
  )

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-start justify-center p-4 pt-20 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}
          className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">{isBase ? 'Base Plan' : 'Holder Upgrade Plan'}</p>
              <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">{planShort(planVal, multiVal)}{isBase ? '' : ' upgrade'}</h3>
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-600 transition">✕</button>
          </div>

          {/* Plan summary */}
          <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stat('Price / cert', `$${ppcVal}`)}
            {stat('Amount', `$${Number(amountVal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)}
            {stat('Slots', `${filled} / ${capacity}`)}
            {stat('Expiry', planVal === 'Unlimited Plan' ? 'Never' : (expiryVal ? fmtDate(expiryVal) : '—'))}
            {invVal && <div className="col-span-2 sm:col-span-4 text-[11px] font-mono text-slate-500">{invVal}</div>}
          </div>

          {/* Holders */}
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            {err && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700">Certificate Holders</p>
              <span className="text-[11px] text-slate-500">{filled} of {capacity} slots used</span>
            </div>

            {rows.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                No holders in this plan yet. Add one below.
              </p>
            )}

            {rows.map((h, i) => (
              <div key={h._id || `new-${i}`} className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">Holder {i + 1}{!h._id && <span className="ml-1.5 text-[9px] font-black uppercase tracking-wide text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">New</span>}</span>
                  <button onClick={() => removeRow(i)} className="text-[11px] font-semibold text-slate-500 hover:text-red-600 transition">Remove</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Full name <span className="text-red-400">*</span></label>
                    <input className={inp} value={h.fullName} onChange={e => setField(i, 'fullName', e.target.value)} placeholder="Full legal name" />
                  </div>
                  <div>
                    <label className={lbl}>IACRA FTN <span className="text-red-400">*</span></label>
                    <input className={inp} value={h.iacraFtnNumber} onChange={e => setField(i, 'iacraFtnNumber', e.target.value)} placeholder="FTN number" />
                  </div>
                  <div>
                    <label className={lbl}>Certificate type</label>
                    <select className={inp} value={h.certificateType} onChange={e => setField(i, 'certificateType', e.target.value)}>
                      {GROUP_CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Status</label>
                    <select className={inp} value={h.certificateStatus} onChange={e => setField(i, 'certificateStatus', e.target.value)}>
                      <option value="EXISTING">Existing</option>
                      <option value="NEW">New</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>FAA certificate number</label>
                    <input className={inp} value={h.faaCertificateNumber} onChange={e => setField(i, 'faaCertificateNumber', e.target.value)} placeholder="Optional" />
                  </div>
                  <div>
                    <label className={lbl}>Email</label>
                    <input className={inp} value={h.email} onChange={e => setField(i, 'email', e.target.value)} placeholder="Optional" />
                  </div>
                  <div>
                    <label className={lbl}>Date of birth</label>
                    <input className={inp} type="date" value={h.dateOfBirth} onChange={e => setField(i, 'dateOfBirth', e.target.value)} />
                  </div>
                </div>

                {/* Secondary certificate */}
                <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                  <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={h.hasSecondaryCertificate}
                    onChange={e => setField(i, 'hasSecondaryCertificate', e.target.checked)} />
                  <span className="text-xs font-semibold text-slate-600">Has a secondary certificate</span>
                </label>

                {h.hasSecondaryCertificate && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg bg-slate-50 border border-slate-100 p-3">
                    <div className="sm:col-span-2">
                      <label className={lbl}>Secondary certificate type</label>
                      <select className={inp} value={h.secondaryCertificateType} onChange={e => setField(i, 'secondaryCertificateType', e.target.value)}>
                        <option value="">Select type…</option>
                        {GROUP_CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Secondary FAA number</label>
                      <input className={inp} value={h.secondaryFaaCertificateNumber} onChange={e => setField(i, 'secondaryFaaCertificateNumber', e.target.value)} placeholder="Optional" />
                    </div>
                    <div>
                      <label className={lbl}>Secondary IACRA FTN</label>
                      <input className={inp} value={h.secondaryIacraFtnNumber} onChange={e => setField(i, 'secondaryIacraFtnNumber', e.target.value)} placeholder="Optional" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button onClick={addRow} disabled={!canAdd}
              className={`w-full rounded-xl border-2 border-dashed py-2.5 text-sm font-bold transition ${canAdd ? 'border-blue-300 text-blue-600 hover:bg-blue-50' : 'border-slate-200 text-slate-300 cursor-not-allowed'}`}>
              {canAdd ? `+ Add holder (${capacity - filled} slot${capacity - filled !== 1 ? 's' : ''} left)` : 'All slots filled'}
            </button>

            {/* ── Edit queued renewal plan — syncs to client side ── */}
            {queuedRenewal && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 overflow-hidden">
                <button onClick={() => setShowRenewalEdit(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-emerald-50 transition">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Queued Renewal Plan</p>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                      {planShort(queuedRenewal.plan, queuedRenewal.multiYearCount)} · activates {queuedRenewal.activationDate ? fmtDate(queuedRenewal.activationDate) : 'at expiry'}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700">{showRenewalEdit ? 'Hide' : 'Edit'}</span>
                </button>

                {showRenewalEdit && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-emerald-100">
                    {rnErr && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{rnErr}</div>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={lbl}>Plan</label>
                        <select className={inp} value={rnForm.plan} onChange={e => setRn('plan', e.target.value)}>
                          <option value="1 Year Subscription Plan">1 Year</option>
                          <option value="Multiple Years Subscription Plan">Multiple Years</option>
                          <option value="Unlimited Plan">Unlimited</option>
                        </select>
                      </div>
                      {rnForm.plan === 'Multiple Years Subscription Plan' && (
                        <div>
                          <label className={lbl}>Years</label>
                          <input className={inp} type="number" min="2" value={rnForm.multiYearCount} onChange={e => setRn('multiYearCount', e.target.value)} />
                        </div>
                      )}
                      <div>
                        <label className={lbl}>{isBase ? 'Holder count' : 'Holders'}</label>
                        <input className={inp} type="number" min="1" value={rnForm.count} onChange={e => setRn('count', e.target.value)} />
                      </div>
                      {!isBase && (
                        <div>
                          <label className={lbl}>Price / cert (USD)</label>
                          <input className={inp} type="number" step="0.01" min="0" value={rnForm.pricePerCert} onChange={e => setRn('pricePerCert', e.target.value)} />
                        </div>
                      )}
                      <div>
                        <label className={lbl}>Total price (USD)</label>
                        <input className={inp} type="number" step="0.01" min="0" value={rnForm.price} onChange={e => setRn('price', e.target.value)} />
                      </div>
                      <div>
                        <label className={lbl}>Activates on</label>
                        <input className={inp} type="date" value={rnForm.activationDate} onChange={e => setRn('activationDate', e.target.value)} />
                      </div>
                      <div>
                        <label className={lbl}>Queued expiry</label>
                        <input className={inp} type="date" value={rnForm.expiresAt} onChange={e => setRn('expiresAt', e.target.value)} disabled={rnForm.plan === 'Unlimited Plan'} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={lbl}>Queued invoice #</label>
                        <input className={inp} value={rnForm.invoiceNumber} onChange={e => setRn('invoiceNumber', e.target.value)} />
                      </div>
                    </div>
                    <button onClick={saveRenewal} disabled={savingRn}
                      className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-4 py-2 text-sm font-bold text-white transition">
                      {savingRn ? 'Saving…' : 'Save queued renewal'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between gap-2">
            {onRenew && planVal !== 'Unlimited Plan' ? (
              <button onClick={() => onRenew(isBase ? null : group)} className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition">Renew this plan</button>
            ) : <span />}
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Close</button>
              <button onClick={save} disabled={busy}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-2 text-sm font-bold text-white transition">
                {busy ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ─── Admin Renew Modal (renew on customer's behalf — no payment) ────────────────
function AdminRenewModal({ record, model, group = null, onClose, onSaved }) {
  const isAirline = model === 'Airlines'
  const isGroup = !!group
  const planShort = (p) => p === 'Multiple Years Subscription Plan' ? 'Multiple Years' : p === 'Unlimited Plan' ? 'Unlimited' : '1 Year'

  // Airlines: 1 Year + Unlimited. Individuals: 1 Year + Multiple Years + Unlimited.
  // Unlimited is offered so the customer can be upgraded to lifetime at renewal.
  const PLAN_OPTS = isAirline
    ? [
      { value: '1 Year Subscription Plan', label: '1 Year' },
      { value: 'Unlimited Plan', label: 'Unlimited' },
    ]
    : [
      { value: '1 Year Subscription Plan', label: '1 Year' },
      { value: 'Multiple Years Subscription Plan', label: 'Multiple Years' },
      { value: 'Unlimited Plan', label: 'Unlimited' },
    ]

  const groupHolders = isGroup
    ? (record.certificateHolders || []).filter(h => String(h.holderGroupId || '') === String(group._id))
    : []
  // Holders attached to the unit being renewed (group's holders, or base-plan
  // holders) — these are the participants carried into the renewed term.
  const unitHolders = isAirline
    ? (isGroup ? groupHolders : (record.certificateHolders || []).filter(h => !h.holderGroupId))
    : []

  const [plan, setPlan] = useState(() => {
    const cur = isGroup ? group.plan : record.subscriptionPlan
    return cur === 'Unlimited Plan' ? '1 Year Subscription Plan' : (cur || '1 Year Subscription Plan')
  })
  const [years, setYears] = useState(Math.max(2, Number(record.multiYearCount) || 3))
  const [count, setCount] = useState(
    isGroup ? Number(group.count || groupHolders.length || 1)
      : Number(record.committedCount || record.holderCountValue || record.certificateHolders?.length || 1)
  )
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [priceOverride, setPriceOverride] = useState('') // blank = auto
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [genBusy, setGenBusy] = useState(false)

  const isMulti = plan === 'Multiple Years Subscription Plan'
  const isUnlimited = plan === 'Unlimited Plan'

  // A group add-on stacks on the active base — its tier is read at the cumulative
  // position (anchor + count), matching the backend renewTierAnchor + applyGroupRenewal.
  const tierAnchor = isGroup ? renewTierAnchor(record, group) : 0
  const totalCount = tierAnchor + count
  const ppc = isAirline ? adminTierPpc(plan, Math.max(3, isGroup ? totalCount : count)) : 0
  const computed = isAirline
    ? ppc * Math.max(1, count) * (isMulti ? Math.max(2, years) : 1)
    : (isUnlimited ? 299 : isMulti ? 55 * Math.max(2, years) : 69)
  const finalPrice = priceOverride !== '' && Number(priceOverride) >= 0 ? Number(priceOverride) : computed

  const curExpiry = isGroup ? group.expirationDate : record.expirationDate
  const willQueue = curExpiry && new Date(curExpiry) > new Date()

  // ── Which holders to KEEP when lowering the count (admin picks, not auto-by-index) ──
  const [selectedHolderIds, setSelectedHolderIds] = useState(() => new Set(unitHolders.map(h => String(h._id))))
  useEffect(() => {
    if (!isAirline) return
    if (count >= unitHolders.length) setSelectedHolderIds(new Set(unitHolders.map(h => String(h._id))))
    else setSelectedHolderIds(new Set(unitHolders.slice(0, count).map(h => String(h._id))))
  }, [count, isAirline]) // eslint-disable-line react-hooks/exhaustive-deps
  const isDecreasing = isAirline && count < unitHolders.length
  const holdersToRemove = isDecreasing
    ? unitHolders.filter(h => !selectedHolderIds.has(String(h._id))).map(h => String(h._id))
    : undefined
  const selectionValid = !isDecreasing || selectedHolderIds.size >= 1

  const genInvoice = async () => {
    setGenBusy(true)
    try { const r = await generateInvoiceNumber(); setInvoiceNumber(r.data?.invoiceNumber || '') }
    catch { /* ignore */ } finally { setGenBusy(false) }
  }

  const submit = async () => {
    setBusy(true); setErr('')
    try {
      const payload = {
        plan,
        multiYearCount: isMulti ? Math.max(2, years) : undefined,
        exactCount: isAirline ? Math.max(1, count) : undefined,
        holdersToRemove: holdersToRemove && holdersToRemove.length ? holdersToRemove : undefined,
        holderGroupId: isGroup ? group._id : undefined,
        price: priceOverride !== '' ? Number(priceOverride) : undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
      }
      const res = isAirline
        ? await adminRenewAirline(record._id, payload)
        : await adminRenewIndividual(record._id, payload)
      onSaved(res.data?.data)
      onClose()
    } catch (e) {
      setErr(e?.response?.data?.message || 'Renewal failed.')
    } finally { setBusy(false) }
  }

  const lbl = 'block text-[11px] font-semibold text-slate-500 mb-1'
  const inp = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition'

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[71] flex items-start justify-center p-4 pt-20 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Admin Renewal · No payment</p>
              <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">{isGroup ? `Renew ${planShort(group.plan)} upgrade` : 'Renew Subscription'}</h3>
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-600 transition">✕</button>
          </div>

          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            {err && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}

            <div className={`rounded-lg border px-3 py-2 text-xs font-semibold ${willQueue ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>
              {willQueue
                ? `Current period active until ${fmtDate(curExpiry)} — renewal will queue and activate then.`
                : 'Plan is expired — renewal activates immediately from today.'}
            </div>

            <div>
              <label className={lbl}>Renewal plan</label>
              <select className={inp} value={plan} onChange={e => setPlan(e.target.value)}>
                {PLAN_OPTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {/* Participants carried into the renewed term */}
            {isAirline && unitHolders.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Participants renewed with this plan</p>
                  <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-full px-2 py-0.5">{unitHolders.length}</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">
                  {isGroup ? `${planShort(group.plan)} upgrade` : 'Base plan'} — these holders carry into the renewed term.
                  {isDecreasing && ` Count lowered to ${count} — tick the ${count} holder${count !== 1 ? 's' : ''} to KEEP; the rest are dropped.`}
                </p>
                <div className="space-y-1 max-h-44 overflow-y-auto">
                  {unitHolders.map((h, i) => {
                    const id = String(h._id || i)
                    const checked = isDecreasing ? selectedHolderIds.has(id) : true
                    const disabled = isDecreasing && !checked && selectedHolderIds.size >= count
                    return (
                      <label key={id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 select-none ${!checked ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-white'} ${isDecreasing ? (disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer') : ''}`}>
                        {isDecreasing ? (
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => setSelectedHolderIds(prev => {
                              const next = new Set(prev)
                              if (next.has(id)) next.delete(id)
                              else if (next.size < count) next.add(id)
                              return next
                            })}
                            className="w-4 h-4 rounded flex-shrink-0 accent-slate-800"
                          />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-[9px] font-black text-slate-500 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-semibold truncate ${!checked ? 'text-red-600 line-through' : 'text-slate-800'}`}>{h.fullName || '(unnamed)'}</p>
                          <p className="text-[10px] text-slate-400 truncate">{h.certificateType || '—'} · FTN {h.iacraFtnNumber || '—'}</p>
                        </div>
                        {!checked
                          ? <span className="text-[9px] font-bold uppercase tracking-wide text-red-600 flex-shrink-0">Dropped</span>
                          : <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                      </label>
                    )
                  })}
                </div>
                {isDecreasing && (
                  <p className={`text-[10px] font-semibold mt-1.5 ${selectionValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {selectedHolderIds.size} of {count} kept{!selectionValid && ' — select at least 1'}
                  </p>
                )}
              </div>
            )}

            {isMulti && (
              <div>
                <label className={lbl}>Number of years</label>
                <input className={inp} type="number" min={2} value={years} onChange={e => setYears(Math.max(2, Number(e.target.value) || 2))} />
              </div>
            )}

            {isAirline && (
              <div>
                <label className={lbl}>Certificate holders (count)</label>
                <div className="flex items-center gap-3">
                  <input className={`${inp} flex-1`} type="number" min={1} value={count} onChange={e => setCount(Math.max(1, Number(e.target.value) || 1))} />
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-blue-100 bg-blue-50/60 px-4 py-1.5 min-w-[88px]">
                    <span className="text-3xl font-black text-slate-900 tabular-nums leading-none">{isGroup ? totalCount : count}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">total</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Tier rate: ${ppc}/cert</p>
                {isGroup && tierAnchor > 0 && (
                  <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">
                    Add-on stacks on active base ({tierAnchor}) — holders {tierAnchor + 1}–{totalCount}. Tier priced at {totalCount}.
                  </p>
                )}
              </div>
            )}

            <div>
              <label className={lbl}>Invoice number <span className="font-normal text-slate-500">(optional — auto if blank)</span></label>
              <div className="flex gap-2">
                <input className={inp} value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="Invoice US-…" />
                <button onClick={genInvoice} disabled={genBusy} className="flex-shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                  {genBusy ? '…' : 'Generate'}
                </button>
              </div>
            </div>

            <div>
              <label className={lbl}>Amount</label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm">$</span>
                <input className={inp} type="number" min={0} step="0.01" value={priceOverride} onChange={e => setPriceOverride(e.target.value)} placeholder={computed.toFixed(2)} />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Auto: ${computed.toFixed(2)}{isAirline ? ` (${ppc} × ${count}${isMulti ? ` × ${Math.max(2, years)}y` : ''})` : ''}. Leave blank to use this, or override.
              </p>
            </div>

            <div className="rounded-xl bg-slate-900 px-4 py-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">Invoice total</span>
              <span className="text-xl font-black text-white">${Number(finalPrice).toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            <button onClick={submit} disabled={busy || !selectionValid}
              title={!selectionValid ? 'Select at least 1 holder to keep' : undefined}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-2 text-sm font-bold text-white transition">
              {busy ? 'Renewing…' : (willQueue ? 'Queue renewal + invoice' : 'Renew now + invoice')}
            </button>
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
  const [phoneCountry, setPhoneCountry] = useState(() => ADMIN_COUNTRY_TO_ISO2[record.country || ''] || 'us')
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  const showInvoiceWarning = form.isPaid === true && !form.invoiceNumber
  const handleSave = async () => {
    try {
      setErr('')
      const saved = await onSave(record._id, form)
      onClose(saved)
    } catch (e) {
      setErr(e?.response?.data?.message || 'Save failed.')
    }
  }
  const fullName = [record.firstName, record.middleName, record.lastName].filter(Boolean).join(' ') || 'Individual'
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" onClick={() => onClose()} />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }}
          className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}>
          <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Edit Individual</p>
              <h2 className="text-lg font-extrabold text-slate-900">{fullName}</h2>
            </div>
            <button onClick={() => onClose()} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition">✕</button>
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
                <Field label="Subscription Date"><input className={inputCls} type="date" value={form.subscriptionDate ? String(form.subscriptionDate).slice(0, 10) : ''} onChange={e => set('subscriptionDate', e.target.value)} /></Field>
                <Field label="Expiration Date"><input className={inputCls} type="date" value={form.expirationDate ? String(form.expirationDate).slice(0, 10) : ''} onChange={e => set('expirationDate', e.target.value)} /></Field>
                <Field label="Price (USD)"><input className={inputCls} type="number" step="0.01" min="0" value={form.price ?? ''} onChange={e => set('price', parseFloat(e.target.value))} /></Field>
                <Field label="Total Service Fees"><input className={inputCls} type="number" step="0.01" min="0" value={form.totalServiceFees ?? ''} onChange={e => set('totalServiceFees', parseFloat(e.target.value))} /></Field>
              </div>
            </div>
            <div><SectionHead label="Personal Information" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="First Name"><input className={inputCls} value={form.firstName || ''} onChange={e => set('firstName', e.target.value)} /></Field>
                <Field label="Last Name"><input className={inputCls} value={form.lastName || ''} onChange={e => set('lastName', e.target.value)} /></Field>
                <Field label="Middle Name"><input className={inputCls} value={form.middleName || ''} onChange={e => set('middleName', e.target.value)} /></Field>
                <Field label="Date of Birth"><input className={inputCls} type="date" value={form.dateOfBirth ? String(form.dateOfBirth).slice(0, 10) : ''} onChange={e => set('dateOfBirth', e.target.value)} /></Field>
                <Field label="Email"><input className={inputCls} type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} /></Field>
                <Field label="Phone">
                  <AdminPhoneInput
                    country={phoneCountry}
                    value={form.phone || ''}
                    onChange={(phone, countryData) => {
                      set('phone', phone)
                      if (countryData?.countryCode) setPhoneCountry(countryData.countryCode)
                    }}
                    enableSearch
                    searchPlaceholder="Search country..."
                    preferredCountries={['us', 'gb', 'ae', 'au', 'ca', 'in']}
                    dropdownStyle={{ bottom: '100%', top: 'auto' }}
                  />
                </Field>
                <div className="sm:col-span-2"><Field label="Address Line 1"><input className={inputCls} value={form.addressLine1 || ''} onChange={e => set('addressLine1', e.target.value)} /></Field></div>
                <div className="sm:col-span-2"><Field label="Address Line 2"><input className={inputCls} placeholder="Apt, suite, unit, etc." value={form.addressLine2 || ''} onChange={e => set('addressLine2', e.target.value)} /></Field></div>
                <Field label="City"><input className={inputCls} value={form.city || ''} onChange={e => set('city', e.target.value)} /></Field>
                <Field label="State / Province"><input className={inputCls} value={form.state || ''} onChange={e => set('state', e.target.value)} /></Field>
                <Field label="Postal Code"><input className={inputCls} value={form.postalCode || ''} onChange={e => set('postalCode', e.target.value)} /></Field>
                <Field label="Country">
                  <AdminCountrySelect
                    value={form.country || ''}
                    onChange={(val) => {
                      set('country', val)
                      const iso2 = ADMIN_COUNTRY_TO_ISO2[val]
                      if (iso2) setPhoneCountry(iso2)
                    }}
                  />
                </Field>
                <div className="sm:col-span-2"><Field label="Payment Email"><input className={inputCls} type="email" placeholder="billing@email.com" value={form.paymentEmail || ''} onChange={e => set('paymentEmail', e.target.value)} /></Field></div>
              </div>
            </div>
            <div><SectionHead label="FAA Certificate" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Airman Certificate"><select className={selectCls} value={form.primaryAirmanCertificate || ''} onChange={e => set('primaryAirmanCertificate', e.target.value)}><option value="">— Select —</option><option value="NEW">NEW</option><option value="EXISTING">EXISTING</option></select></Field>
                <Field label="Certificate Type"><select className={selectCls} value={form.primaryCertificate || ''} onChange={e => set('primaryCertificate', e.target.value)}><option value="">— Select —</option><option value="Part 61 - Pilot">Part 61 - Pilot</option><option value="Part 61 - Flight or Ground Instructor">Part 61 - Instructor</option><option value="Part 65 - Aircraft Dispatcher">Part 65 - Dispatcher</option><option value="Part 107 - Remote Pilot">Part 107 - Remote Pilot</option></select></Field>
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
                      <Field label="Secondary Cert Type"><select className={selectCls} value={form.secondaryCertificate || ''} onChange={e => set('secondaryCertificate', e.target.value)}><option value="">— Select —</option><option value="Part 61 - Pilot">Part 61 - Pilot</option><option value="Part 61 - Flight or Ground Instructor">Part 61 - Instructor</option><option value="Part 65 - Aircraft Dispatcher">Part 65 - Dispatcher</option><option value="Part 107 - Remote Pilot">Part 107 - Remote Pilot</option></select></Field>
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
            <button onClick={() => onClose()} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">Cancel</button>
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
  const [phoneCountry, setPhoneCountry] = useState(() => ADMIN_COUNTRY_TO_ISO2[record.country || ''] || 'us')
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  const setHolder = (idx, field, value) =>
    setForm(p => ({ ...p, certificateHolders: p.certificateHolders.map((h, i) => i === idx ? { ...h, [field]: value } : h) }))
  // Admin can add holders up to the committed count.
  const committedSlots = Number(form.committedCount || form.holderCountValue || form.certificateHolders?.length || 0)
  const holdersCount = form.certificateHolders?.length || 0
  const canAddHolder = holdersCount < committedSlots
  const addHolder = () => setForm(p => ({
    ...p,
    certificateHolders: [...(p.certificateHolders || []), {
      fullName: '', dateOfBirth: '', certificateType: '', certificateStatus: 'EXISTING',
      faaCertificateNumber: '', iacraFtnNumber: '', email: '',
      hasSecondaryCertificate: false, secondaryCertificateType: '',
      secondaryFaaCertificateNumber: '', secondaryIacraFtnNumber: '', holderGroupId: '',
    }],
  }))
  const removeHolder = (idx) => setForm(p => ({
    ...p, certificateHolders: p.certificateHolders.filter((_, i) => i !== idx),
  }))
  const groupOpts = form.holderGroups || []
  const groupLabel = (g) => (g.plan === 'Unlimited Plan' ? 'Unlimited' : g.plan === 'Multiple Years Subscription Plan' ? 'Multi-Year' : '1 Year') + ' upgrade'
  // Edit a field on a single holder-upgrade group. Recompute amount when count/price change.
  const setGroup = (idx, field, value) =>
    setForm(p => ({
      ...p,
      holderGroups: (p.holderGroups || []).map((g, i) => {
        if (i !== idx) return g
        const next = { ...g, [field]: value }
        if (field === 'count' || field === 'pricePerCert') {
          const c = Number(field === 'count' ? value : next.count) || 0
          const ppc = Number(field === 'pricePerCert' ? value : next.pricePerCert) || 0
          next.amount = c * ppc
        }
        return next
      }),
    }))
  // Edit a field on a single holder-upgrade group's queued renewal (nextRenewal).
  // Recompute the queued price when count or price/cert changes.
  const setGroupRenewal = (idx, field, value) =>
    setForm(p => ({
      ...p,
      holderGroups: (p.holderGroups || []).map((g, i) => {
        if (i !== idx) return g
        const nr = { ...(g.nextRenewal || {}), [field]: value }
        if (field === 'count' || field === 'pricePerCert') {
          const c = Number(field === 'count' ? value : nr.count) || 0
          const ppc = Number(field === 'pricePerCert' ? value : nr.pricePerCert) || 0
          nr.price = c * ppc
        }
        return { ...g, nextRenewal: nr }
      }),
    }))
  const showInvoiceWarning = form.isPaid === true && !form.invoiceNumber
  const handleSave = async () => {
    setErr('')
    // Drop fully-blank holder rows; normalise empty optional fields so they cast cleanly.
    const rawHolders = form.certificateHolders || []
    const nonEmpty = rawHolders.filter(h =>
      (h.fullName && h.fullName.trim()) || (h.iacraFtnNumber && h.iacraFtnNumber.trim()) ||
      (h.faaCertificateNumber && h.faaCertificateNumber.trim())
    )
    // Required-field check with a friendly message (schema needs name + type + FTN).
    const missing = nonEmpty.findIndex(h => !h.fullName?.trim() || !h.certificateType || !h.iacraFtnNumber?.trim())
    if (missing !== -1) {
      setErr(`Holder #${missing + 1}: please fill in Full Name, Certificate Type and IACRA FTN before saving.`)
      return
    }
    const cleanHolders = nonEmpty.map(h => ({
      ...h,
      holderGroupId: h.holderGroupId ? h.holderGroupId : null, // '' breaks ObjectId cast
      dateOfBirth: h.dateOfBirth ? h.dateOfBirth : null,
    }))
    // Normalise holder-group dates: '' breaks Date cast on the backend.
    const cleanGroups = (form.holderGroups || []).map(g => ({
      ...g,
      subscriptionDate: g.subscriptionDate ? g.subscriptionDate : null,
      expirationDate: g.plan === 'Unlimited Plan' ? null : (g.expirationDate ? g.expirationDate : null),
      ...(g.nextRenewal ? {
        nextRenewal: {
          ...g.nextRenewal,
          activationDate: g.nextRenewal.activationDate ? g.nextRenewal.activationDate : null,
          expiresAt: g.nextRenewal.plan === 'Unlimited Plan' ? null : (g.nextRenewal.expiresAt ? g.nextRenewal.expiresAt : null),
        },
      } : {}),
    }))
    try {
      const saved = await onSave(record._id, { ...form, certificateHolders: cleanHolders, holderGroups: cleanGroups })
      onClose(saved)
    } catch (e) {
      setErr(friendlySaveError(e))
    }
  }
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" onClick={() => onClose()} />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }}
          className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}>
          <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Edit Airline</p>
              <h2 className="text-lg font-extrabold text-slate-900">{record.airlineName || 'Airline'}</h2>
            </div>
            <button onClick={() => onClose()} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition">✕</button>
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
            <div><SectionHead label="Account Status" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Status"><select className={selectCls} value={form.status || 'Pending'} onChange={e => set('status', e.target.value)}><option>Pending</option><option>Active</option><option>Inactive</option></select></Field>
              </div>
            </div>

            {/* ── BASE PLAN — subscription + payment + invoice grouped together ── */}
            <div><SectionHead label="Base Plan" />
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50/40 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white bg-blue-600 rounded-full px-2 py-0.5">Base Plan</span>
                    <span className="text-xs font-black text-slate-700">Main Subscription</span>
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${form.isPaid ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>{form.isPaid ? 'Paid' : 'Unpaid'}</span>
                </div>

                {/* Subscription details */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2.5">Subscription</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Subscription Plan"><select className={selectCls} value={form.subscriptionPlan || ''} onChange={e => set('subscriptionPlan', e.target.value)}><option value="1 Year Subscription Plan">1 Year</option><option value="Multiple Years Subscription Plan">Multiple Years</option><option value="Unlimited Plan">Unlimited</option></select></Field>
                    <Field label="Holder Count Range"><input className={inputCls} placeholder="e.g. 3 to 5" value={form.holderCount || ''} onChange={e => set('holderCount', e.target.value)} /></Field>
                    <Field label="Subscription Date"><input className={inputCls} type="date" value={form.subscriptionDate ? String(form.subscriptionDate).slice(0, 10) : ''} onChange={e => set('subscriptionDate', e.target.value)} /></Field>
                    <Field label="Expiration Date"><input className={inputCls} type="date" value={form.expirationDate ? String(form.expirationDate).slice(0, 10) : ''} onChange={e => set('expirationDate', e.target.value)} /></Field>
                    <Field label="Exact Holder Count">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                        <button type="button"
                          onClick={() => setForm(p => { const c = Math.max(1, Number(p.holderCountValue || 1) - 1); return { ...p, holderCountValue: c, committedCount: c, totalServiceFees: c * (Number(p.pricePerCertificate ?? p.pricePerCert) || 0) } })}
                          className="w-8 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition flex-shrink-0 text-base font-bold border-r border-slate-200">−</button>
                        <input className="flex-1 min-w-0 text-xs text-center py-1.5 bg-transparent focus:outline-none" type="number" min="1"
                          value={form.holderCountValue || ''}
                          onChange={e => setForm(p => { const c = parseFloat(e.target.value) || 0; return { ...p, holderCountValue: e.target.value, committedCount: c, totalServiceFees: c * (Number(p.pricePerCertificate ?? p.pricePerCert) || 0) } })} />
                        <button type="button"
                          onClick={() => setForm(p => { const c = Number(p.holderCountValue || 0) + 1; return { ...p, holderCountValue: c, committedCount: c, totalServiceFees: c * (Number(p.pricePerCertificate ?? p.pricePerCert) || 0) } })}
                          className="w-8 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition flex-shrink-0 text-base font-bold border-l border-slate-200">+</button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Raw correction only. To bill an increase (with plan + invoice) or remove specific holders, use <span className="font-bold">Manage Plans</span> in the view screen.</p>
                    </Field>
                    <Field label="Price/Cert (USD)"><input className={inputCls} type="number" step="0.01" min="0"
                      value={form.pricePerCertificate ?? form.pricePerCert ?? ''}
                      onChange={e => setForm(p => { const price = parseFloat(e.target.value) || 0; const count = Number(p.committedCount ?? p.holderCountValue) || 0; return { ...p, pricePerCertificate: price, pricePerCert: price, totalServiceFees: count * price } })} /></Field>
                    <div className="sm:col-span-2"><Field label="Total Amount (USD)">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-bold">$</span>
                        <input className={`${inputCls} pl-6 bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold`} type="number" step="0.01" min="0"
                          value={form.totalServiceFees ?? form.totalAmount ?? ''}
                          onChange={e => set('totalServiceFees', parseFloat(e.target.value))} />
                      </div>
                    </Field></div>
                  </div>
                </div>

                {/* Payment & invoice for the base plan */}
                <div className="border-t border-blue-100 pt-3.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2.5">Payment & Invoice</p>
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
            </div>
            {groupOpts.length > 0 && (
              <div><SectionHead label={`Holder Upgrade Plans (${groupOpts.length})`} />
                <p className="text-[10px] text-slate-500 mb-3 -mt-1">Each upgrade batch is its own plan. Edits here are raw corrections — they do not generate invoices.</p>
                <div className="space-y-4">
                  {groupOpts.map((g, gi) => (
                    <div key={String(g._id || gi)} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-black text-slate-700">{groupLabel(g)} #{gi + 1}</p>
                        <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${g.paymentStatus === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{g.paymentStatus || 'paid'}</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Plan"><select className={selectCls} value={g.plan || ''} onChange={e => setGroup(gi, 'plan', e.target.value)}><option value="1 Year Subscription Plan">1 Year</option><option value="Multiple Years Subscription Plan">Multiple Years</option><option value="Unlimited Plan">Unlimited</option></select></Field>
                        <Field label="Payment Status"><select className={selectCls} value={g.paymentStatus || 'paid'} onChange={e => setGroup(gi, 'paymentStatus', e.target.value)}><option value="paid">Paid</option><option value="pending">Pending</option></select></Field>
                        <Field label="Holder Count"><input className={inputCls} type="number" min="1" value={g.count ?? ''} onChange={e => setGroup(gi, 'count', parseFloat(e.target.value) || 0)} /></Field>
                        <Field label="Price/Cert (USD)"><input className={inputCls} type="number" step="0.01" min="0" value={g.pricePerCert ?? ''} onChange={e => setGroup(gi, 'pricePerCert', parseFloat(e.target.value) || 0)} /></Field>
                        <Field label="Amount (USD)">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-bold">$</span>
                            <input className={`${inputCls} pl-6 bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold`} type="number" step="0.01" min="0" value={g.amount ?? ''} onChange={e => setGroup(gi, 'amount', parseFloat(e.target.value) || 0)} />
                          </div>
                        </Field>
                        <Field label="Invoice #"><input className={inputCls} value={g.invoiceNumber || ''} onChange={e => setGroup(gi, 'invoiceNumber', e.target.value)} /></Field>
                        <Field label="Subscription Date"><input className={inputCls} type="date" value={g.subscriptionDate ? String(g.subscriptionDate).slice(0, 10) : ''} onChange={e => setGroup(gi, 'subscriptionDate', e.target.value)} /></Field>
                        <Field label="Expiration Date"><input className={inputCls} type="date" value={g.expirationDate ? String(g.expirationDate).slice(0, 10) : ''} onChange={e => setGroup(gi, 'expirationDate', e.target.value)} disabled={g.plan === 'Unlimited Plan'} placeholder={g.plan === 'Unlimited Plan' ? 'Never (Unlimited)' : ''} /></Field>
                      </div>
                      {g.nextRenewal?.paidAt && (
                        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Queued Renewal — what the user paid for</p>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="Queued Plan"><select className={selectCls} value={g.nextRenewal.plan || ''} onChange={e => setGroupRenewal(gi, 'plan', e.target.value)}><option value="1 Year Subscription Plan">1 Year</option><option value="Multiple Years Subscription Plan">Multiple Years</option><option value="Unlimited Plan">Unlimited</option></select></Field>
                            <Field label="Holder Count"><input className={inputCls} type="number" min="1" value={g.nextRenewal.count ?? ''} onChange={e => setGroupRenewal(gi, 'count', parseFloat(e.target.value) || 0)} /></Field>
                            <Field label="Price/Cert (USD)"><input className={inputCls} type="number" step="0.01" min="0" value={g.nextRenewal.pricePerCert ?? ''} onChange={e => setGroupRenewal(gi, 'pricePerCert', parseFloat(e.target.value) || 0)} /></Field>
                            <Field label="Amount Paid (USD)">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-bold">$</span>
                                <input className={`${inputCls} pl-6 bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold`} type="number" step="0.01" min="0" value={g.nextRenewal.price ?? ''} onChange={e => setGroupRenewal(gi, 'price', parseFloat(e.target.value) || 0)} />
                              </div>
                            </Field>
                            <Field label="Activates On"><input className={inputCls} type="date" value={g.nextRenewal.activationDate ? String(g.nextRenewal.activationDate).slice(0, 10) : ''} onChange={e => setGroupRenewal(gi, 'activationDate', e.target.value)} /></Field>
                            <Field label="Queued Expiry"><input className={inputCls} type="date" value={g.nextRenewal.expiresAt ? String(g.nextRenewal.expiresAt).slice(0, 10) : ''} onChange={e => setGroupRenewal(gi, 'expiresAt', e.target.value)} disabled={g.nextRenewal.plan === 'Unlimited Plan'} /></Field>
                            <div className="sm:col-span-2"><Field label="Queued Invoice #"><input className={inputCls} value={g.nextRenewal.invoiceNumber || ''} onChange={e => setGroupRenewal(gi, 'invoiceNumber', e.target.value)} /></Field></div>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-2">To start this plan immediately, use <span className="font-bold">Activate Now</span> in the view screen.</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div><SectionHead label="Airline / Operator" />
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><Field label="Company Name"><input className={inputCls} value={form.airlineName || ''} onChange={e => set('airlineName', e.target.value)} /></Field></div>
                <div className="sm:col-span-2"><Field label="Address Line 1"><input className={inputCls} value={form.addressLine1 || ''} onChange={e => set('addressLine1', e.target.value)} /></Field></div>
                <div className="sm:col-span-2"><Field label="Address Line 2"><input className={inputCls} placeholder="Suite, floor, unit, etc." value={form.addressLine2 || ''} onChange={e => set('addressLine2', e.target.value)} /></Field></div>
                <Field label="City"><input className={inputCls} value={form.city || ''} onChange={e => set('city', e.target.value)} /></Field>
                <Field label="State / Province"><input className={inputCls} value={form.state || ''} onChange={e => set('state', e.target.value)} /></Field>
                <Field label="Postal Code"><input className={inputCls} value={form.postalCode || ''} onChange={e => set('postalCode', e.target.value)} /></Field>
                <Field label="Country">
                  <AdminCountrySelect
                    value={form.country || ''}
                    onChange={(val) => {
                      set('country', val)
                      const iso2 = ADMIN_COUNTRY_TO_ISO2[val]
                      if (iso2) setPhoneCountry(iso2)
                    }}
                  />
                </Field>
              </div>
            </div>
            <div><SectionHead label="Point of Contact" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="First Name"><input className={inputCls} value={form.firstName || form.contactFirstName || ''} onChange={e => set('firstName', e.target.value)} /></Field>
                <Field label="Last Name"><input className={inputCls} value={form.lastName || form.contactLastName || ''} onChange={e => set('lastName', e.target.value)} /></Field>
                <Field label="Middle Name"><input className={inputCls} value={form.middleName || ''} onChange={e => set('middleName', e.target.value)} /></Field>
                <Field label="Date of Birth"><input className={inputCls} type="date" value={form.dateOfBirth ? String(form.dateOfBirth).slice(0, 10) : ''} onChange={e => set('dateOfBirth', e.target.value)} /></Field>
                <Field label="Email"><input className={inputCls} type="email" value={form.email || form.contactEmail || ''} onChange={e => set('email', e.target.value)} /></Field>
                <Field label="Phone">
                  <AdminPhoneInput
                    country={phoneCountry}
                    value={form.phone || form.contactPhone || ''}
                    onChange={(phone, countryData) => {
                      set('phone', phone)
                      if (countryData?.countryCode) setPhoneCountry(countryData.countryCode)
                    }}
                    enableSearch
                    searchPlaceholder="Search country..."
                    preferredCountries={['us', 'gb', 'ae', 'au', 'ca', 'in']}
                    dropdownStyle={{ bottom: '100%', top: 'auto' }}
                  />
                </Field>
                <div className="sm:col-span-2"><Field label="Payment Email"><input className={inputCls} type="email" placeholder="billing@email.com" value={form.paymentEmail || ''} onChange={e => set('paymentEmail', e.target.value)} /></Field></div>
              </div>
            </div>
            {(
              <div>
                <div className="flex items-center justify-between mb-1">
                  <SectionHead label={`Certificate Holders (${holdersCount}/${committedSlots})`} />
                </div>
                <div className="space-y-4">
                  {form.certificateHolders?.map((h, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Holder #{idx + 1}</p>
                        <button type="button" onClick={() => removeHolder(idx)}
                          className="text-[10px] font-bold text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 rounded-md px-2 py-1 transition">Remove</button>
                      </div>
                      {groupOpts.length > 0 && (
                        <div className="mb-3">
                          <Field label="Plan">
                            <select className={selectCls} value={h.holderGroupId ? String(h.holderGroupId) : ''} onChange={e => setHolder(idx, 'holderGroupId', e.target.value)}>
                              <option value="">Base plan</option>
                              {groupOpts.map((g, gi) => <option key={String(g._id || gi)} value={String(g._id)}>{groupLabel(g)} ({g.count} slots)</option>)}
                            </select>
                          </Field>
                        </div>
                      )}
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Field label="Full Name"><input className={inputCls} value={h.fullName || ''} onChange={e => setHolder(idx, 'fullName', e.target.value)} /></Field>
                        <Field label="Date of Birth"><input className={inputCls} type="date" value={h.dateOfBirth ? String(h.dateOfBirth).slice(0, 10) : ''} onChange={e => setHolder(idx, 'dateOfBirth', e.target.value)} /></Field>
                        <Field label="Certificate Type"><select className={selectCls} value={h.certificateType || ''} onChange={e => setHolder(idx, 'certificateType', e.target.value)}><option value="">— Select —</option><option value="Part 61 - Pilot">Part 61 - Pilot</option><option value="Part 61 - Flight or Ground Instructor">Part 61 - Instructor</option><option value="Part 65 - Aircraft Dispatcher">Part 65 - Dispatcher</option><option value="Part 107 - Remote Pilot">Part 107 - Remote Pilot</option></select></Field>
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
                              <Field label="Secondary Cert Type"><select className={selectCls} value={h.secondaryCertificateType || ''} onChange={e => setHolder(idx, 'secondaryCertificateType', e.target.value)}><option value="">— Select —</option><option value="Part 61 - Pilot">Part 61 - Pilot</option><option value="Part 61 - Flight or Ground Instructor">Part 61 - Instructor</option><option value="Part 65 - Aircraft Dispatcher">Part 65 - Dispatcher</option><option value="Part 107 - Remote Pilot">Part 107 - Remote Pilot</option></select></Field>
                              <Field label="Secondary FAA Cert #"><input className={inputCls} value={h.secondaryFaaCertificateNumber || ''} onChange={e => setHolder(idx, 'secondaryFaaCertificateNumber', e.target.value)} /></Field>
                              <Field label="Secondary IACRA FTN #"><input className={inputCls} value={h.secondaryIacraFtnNumber || ''} onChange={e => setHolder(idx, 'secondaryIacraFtnNumber', e.target.value)} /></Field>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addHolder} disabled={!canAddHolder}
                  className={`mt-3 w-full rounded-xl border-2 border-dashed py-2.5 text-sm font-bold transition ${canAddHolder ? 'border-blue-300 text-blue-600 hover:bg-blue-50' : 'border-slate-200 text-slate-300 cursor-not-allowed'}`}>
                  {canAddHolder ? '+ Add Certificate Holder' : `All ${committedSlots} committed slots filled`}
                </button>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button onClick={() => onClose()} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">Cancel</button>
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
  const RED = hex('#c0392b')
  const DARK = hex('#0f172a')
  const MID = hex('#475569')
  const MUTED = hex('#94a3b8')
  const LGRAY = hex('#f1f5f9')
  const BORDER = hex('#cbd5e1')
  const WHITE = rgb(1, 1, 1)

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const ML = 50, MR = 50
  const W = width - ML - MR
  let Y = height - 40

  const txt = (str, x, y, { size = 9, font = fontReg, color = DARK, maxWidth } = {}) => {
    const opts = { x, y, size, font, color }
    if (maxWidth) opts.maxWidth = maxWidth
    page.drawText(String(str ?? '—'), opts)
  }
  const txtR = (str, rx, y, { size = 9, font = fontReg, color = DARK } = {}) => {
    const w = font.widthOfTextAtSize(String(str ?? ''), size)
    page.drawText(String(str ?? ''), { x: rx - w, y, size, font, color })
  }
  const txtC = (str, cx, y, { size = 9, font = fontReg, color = DARK } = {}) => {
    const w = font.widthOfTextAtSize(String(str ?? ''), size)
    page.drawText(String(str ?? ''), { x: cx - w / 2, y, size, font, color })
  }
  const line = (x1, y1, x2, y2, color = BORDER, thickness = 0.5) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color })
  const rect = (x, y, w, h, color) =>
    page.drawRectangle({ x, y, width: w, height: h, color })

  const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') : '—'
  const fmtM = (n) => n != null ? Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

  const LOGO_H = 52
  const LOGO_AREA_W = 130
  const BAND_H = LOGO_H + 20
  const BAND_W = LOGO_AREA_W + 28
  const BAND_X = width - MR - BAND_W
  const BAND_Y = height - BAND_H - 8

  let logoImage = null
  let logoDims = { width: 0, height: 0 }
  try {
    const resp = await fetch(BACKEND_LOGO_URL, { cache: 'no-store' })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const arrBuf = await resp.arrayBuffer()
    logoImage = await pdfDoc.embedPng(arrBuf)
    const raw = logoImage.scale(1)
    const scale = Math.min(LOGO_H / raw.height, LOGO_AREA_W / raw.width)
    logoDims = { width: raw.width * scale, height: raw.height * scale }
  } catch (_) { }

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
  // Payment reference (txn). Admin/manual payments show a clean "MANUAL <inv#>"
  // instead of the raw internal id; real Stripe intents print as-is.
  if (inv.paymentId && inv.paymentId !== '—') {
    const rawTxn = String(inv.paymentId)
    const txnValue = (/^admin[_-]|^manual/i.test(rawTxn))
      ? `MANUAL${displayInvoiceNumber ? ' ' + displayInvoiceNumber : ''}`
      : rawTxn
    txtR('txn: ' + txnValue, ML + W, Y + 1, { size: 7.5, color: MID })
  }
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

  const C = {
    pos: ML,
    desc: ML + 28,
    qtyR: ML + W - 160,
    qtyC: ML + W - 175,
    unitR: ML + W - 70,
    unitC: ML + W - 115,
    total: ML + W,
    totalC: ML + W - 35,
  }
  const TH_Y = Y
  const TH_H = 16
  rect(ML, TH_Y - TH_H + 4, W, TH_H, LGRAY)
  txt('Pos.', C.pos, TH_Y - 8, { size: 8, font: fontBold })
  txt('Description', C.desc, TH_Y - 8, { size: 8, font: fontBold })
  txtC('Quantity', C.qtyC, TH_Y - 8, { size: 8, font: fontBold })
  txtC('Unit Price', C.unitC, TH_Y - 8, { size: 8, font: fontBold })
  txtC('Total Price USD', C.totalC, TH_Y - 8, { size: 8, font: fontBold })
  Y = TH_Y - TH_H - 2
  line(ML, Y, ML + W, Y, BORDER, 0.4)
  Y -= 12

  const items = inv.lineItems || []
  items.forEach((item, i) => {
    const rowY = Y
    txt(String(i + 1), C.pos, rowY, { size: 9 })
    txt(item.description, C.desc, rowY, { size: 9, maxWidth: C.qtyR - C.desc - 30 })
    txtC(String(item.quantity), C.qtyC, rowY, { size: 9 })
    txtC(fmtM(item.unitPrice), C.unitC, rowY, { size: 9 })
    txtC(fmtM(item.totalPrice), C.totalC, rowY, { size: 9 })
    Y -= 18
  })

  Y -= 8
  line(ML, Y, ML + W, Y, RED, 1.5)
  Y -= 14

  const totalAmt = items.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0)
  txt('Invoice Sum Tax-Exempt', C.desc, Y, { size: 9, font: fontBold })
  txtC(fmtM(totalAmt), C.totalC, Y, { size: 9, font: fontBold })
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
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
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
  // The default airline invoice covers the BASE plan only. committedCount is the grand
  // total (base + all add-on groups), so subtract the group slots to bill base holders
  // at the base rate. Holder-upgrade/renewal invoices set their own count, so leave those.
  const isBasePlanInvoice = isAirline && !record._wireInvoicePurpose
  const grandCommitted = Number(
    record.committedCount || record.holderCountValue || record.certificateHolders?.length || 1
  ) || 1
  const holderCount = Math.max(1, isBasePlanInvoice ? grandCommitted - allGroupSlots(record.holderGroups) : grandCommitted)
  const pricePerCert = Number(record.pricePerCertificate || record.pricePerCert || (isAirline ? 49 : 0))
  const paidConfirmed = record?.isPaid === true || record?.paymentStatus === 'paid'

  const fallbackTotal = isAirline
    ? Number(record.totalAmount ?? (pricePerCert * holderCount) ?? 0)
    : Number(record.price || record.totalServiceFees || 0)

  const computedAirlineTotal = isAirline ? (pricePerCert * holderCount) : 0

  const paidTotal = Number(
    record.amountPaid || record.totalAmount || record.price || record.totalServiceFees || 0
  )

  // Wire requests: use amountPaid admin entered as the authoritative total even before marking paid.
  const wireMode = Boolean(record?.wirePaymentRequested) && paidTotal > 0
  const totalAmt = isAirline
    // Base-plan invoice: always base rate × base holders (paidTotal mixes in add-on
    // groups, so don't let it inflate the base line).
    ? (isBasePlanInvoice
        ? computedAirlineTotal
        : (wireMode ? paidTotal : (paidConfirmed && paidTotal > 0 ? Math.max(paidTotal, computedAirlineTotal) : computedAirlineTotal)))
    : (paidConfirmed && paidTotal > 0 ? paidTotal : fallbackTotal)
  const unitPrice = isAirline
    ? (isBasePlanInvoice ? pricePerCert : Number((totalAmt / holderCount).toFixed(2)))
    : totalAmt
  const planDesc = `Agent For Service – ${(record.subscriptionPlan || '1 Year Plan').replace(' Subscription Plan', '').replace(' Plan', '')}`

  const paidByCard = record?.paymentMethodType === 'card' || Boolean(record?.stripePaymentIntentId)
  const wireRequested = Boolean(record?.wirePaymentRequested || record?.invoiceStatus === 'Wire Requested')
  const defaultPaymentMethod = record?.invoiceDraft?.paymentMethod || (isAirline ? (wireRequested ? 'wire' : 'card') : 'card')

  // initialStep === 'select' means this is a brand-new generate flow (no existing invoice yet).
  // Don't show "Invoice Generated" badge or "Edit Invoice" header until admin actually saves.
  const isNewInvoice = initialStep === 'select'
  const hasInvoice = !isNewInvoice && hasExistingInvoice(record)

  const [paymentMethodSel, setPaymentMethodSel] = useState(
    initialStep === 'edit' ? defaultPaymentMethod : (isAirline ? 'wire' : 'card')
  )
  const [step, setStep] = useState(initialStep)
  const autoPreviewFired = useRef(false)
  const [savingInvoice, setSavingInvoice] = useState(false)

  const [previewData, setPreviewData] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saveError, setSaveError] = useState('')

  const initialInvoice = {
    invoiceNumber: defaultInvoiceNumber,
    issueDate: fmtInput(today),
    payableBy: fmtInput(payable),
    recipientCompany: isAirline ? (record.airlineName || '') : '',
    recipientName: [record.firstName, record.lastName].filter(Boolean).join(' ') || record.airlineName || '',
    recipientContact: [record.firstName, record.lastName].filter(Boolean).join(' '),
    recipientAddress1: record.addressLine1 || '',
    recipientAddress2: [record.city, record.state, record.postalCode].filter(Boolean).join(' '),
    recipientCountry: record.country || '',
    paymentMethod: initialStep === 'edit' ? defaultPaymentMethod : '',
    paymentId: record?.stripePaymentIntentId || record?.invoiceDraft?.paymentId || null,
    lineItems: [
      {
        description: planDesc,
        quantity: isAirline ? holderCount : 1,
        unitPrice: isAirline ? unitPrice : totalAmt,
        totalPrice: totalAmt,
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
  const addItem = () => setInv(p => ({ ...p, lineItems: [...p.lineItems, { description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }] }))
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
      invoiceNumber: inv.invoiceNumber,
      invoiceStatus: 'Generated',
      invoiceGenerated: true,
      invoiceDraft: inv,
      wireInvoicePurpose: record._wireInvoicePurpose || null,
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
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }}
              className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="border-b border-slate-100 bg-white px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#0000ff' }}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">
                      {hasInvoice ? 'Edit Invoice' : 'Invoice Generator'} · Admin
                    </p>
                    <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                      {record.airlineName || [record.firstName, record.lastName].filter(Boolean).join(' ') || 'Record'}
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasInvoice && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 text-[10px] font-bold">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
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
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition">✕</button>
                </div>
              </div>

              {/* ── Step 1: Payment method selection ── */}
              {step === 'select' && (
                <div className="px-6 py-8">
                  <p className="text-sm font-bold text-slate-700 mb-6">Select the payment method to generate the invoice accordingly:</p>
                  <div className="grid sm:grid-cols-2 gap-4 mb-8">
                    {[
                      { val: 'card', label: 'Credit / Debit Card', sub: 'Stripe / instant payment', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" /></svg> },
                      ...(isAirline ? [{ val: 'wire', label: 'Wire Transfer', sub: 'Bank transfer — BOFAUS3N', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> }] : []),
                    ].map(opt => (
                      <button key={opt.val} onClick={() => setPaymentMethodSel(opt.val)}
                        className={`rounded-2xl border-2 p-5 text-left transition-all ${paymentMethodSel === opt.val
                            ? 'border-slate-900 bg-slate-900'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${paymentMethodSel === opt.val ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>{opt.icon}</div>
                        <p className={`font-black text-sm mb-0.5 ${paymentMethodSel === opt.val ? 'text-white' : 'text-slate-900'}`}>{opt.label}</p>
                        <p className={`text-xs ${paymentMethodSel === opt.val ? 'text-slate-300' : 'text-slate-500'}`}>{opt.sub}</p>
                      </button>
                    ))}
                  </div>
                  {isAirline && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 mb-6 flex items-start gap-2">
                      <svg className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span><span className="font-bold text-slate-700">Wire Transfer recommended</span> — wire details appear in the invoice footer automatically.</span>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button onClick={handleProceed} disabled={!paymentMethodSel}
                      style={paymentMethodSel ? { background: '#0000ff' } : {}}
                      className="inline-flex items-center gap-2 px-6 py-2.5 text-white font-bold rounded-xl text-sm transition disabled:opacity-40 disabled:bg-slate-300">
                      {hasInvoice ? 'Edit Invoice →' : 'Generate Invoice →'}
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

                  {hasInvoice && (
                    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <svg className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <div>
                        <p className="text-xs font-bold text-slate-700 mb-0.5">Editing existing invoice</p>
                        <p className="text-[11px] text-slate-500 leading-snug">Changes update the invoice document only — payment status, subscription plan, and holder count remain unchanged.</p>
                      </div>
                    </div>
                  )}

                  <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border border-slate-200 bg-slate-50 text-slate-600">
                    {inv.paymentMethod === 'wire'
                      ? <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Wire Transfer Invoice</>
                      : <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" /></svg>Card Payment Invoice</>
                    }
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Invoice Details</p>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Invoice Number</label>
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
                      <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Issue Date</label><input className={iCls} type="date" value={inv.issueDate} onChange={e => set('issueDate', e.target.value)} /></div>
                      <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Payable By</label><input className={iCls} type="date" value={inv.payableBy} onChange={e => set('payableBy', e.target.value)} /></div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Recipient</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {isAirline && <div className="sm:col-span-2"><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Company Name</label><input className={iCls} value={inv.recipientCompany} onChange={e => set('recipientCompany', e.target.value)} /></div>}
                      <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Contact Name</label><input className={iCls} value={inv.recipientContact} onChange={e => set('recipientContact', e.target.value)} /></div>
                      <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Address Line 1</label><input className={iCls} value={inv.recipientAddress1} onChange={e => set('recipientAddress1', e.target.value)} /></div>
                      <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Address Line 2 (City/State/Zip)</label><input className={iCls} value={inv.recipientAddress2} onChange={e => set('recipientAddress2', e.target.value)} /></div>
                      <div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Country</label><input className={iCls} value={inv.recipientCountry} onChange={e => set('recipientCountry', e.target.value)} /></div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Line Items</p>
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="grid grid-cols-12 gap-0 bg-slate-50 border-b border-slate-200 px-3 py-2">
                        <span className="col-span-5 text-[9px] font-black uppercase tracking-widest text-slate-500">Description</span>
                        <span className="col-span-2 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Qty</span>
                        <span className="col-span-2 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Unit Price</span>
                        <span className="col-span-2 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Total</span>
                        <span className="col-span-1" />
                      </div>
                      <div className="divide-y divide-slate-100">
                        {inv.lineItems.map((item, i) => (
                          <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                            <input className="col-span-5 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500" value={item.description} onChange={e => setItem(i, 'description', e.target.value)} placeholder="Service description" />
                            <input className="col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 text-center" type="number" min="1" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
                            <input className="col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 text-right" type="number" step="0.01" min="0" value={item.unitPrice} onChange={e => setItem(i, 'unitPrice', e.target.value)} />
                            <div className="col-span-2 text-xs font-bold text-slate-900 text-right">${Number(item.totalPrice).toFixed(2)}</div>
                            <button onClick={() => removeItem(i)} disabled={inv.lineItems.length <= 1}
                              className="col-span-1 w-6 h-6 flex items-center justify-center rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-20 mx-auto">
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
                    <p className="font-black text-[9px] uppercase tracking-widest text-slate-500 mb-2">Invoice Summary</p>
                    <div className="flex justify-between"><span>Invoice #</span><span className="font-bold text-slate-800">{inv.invoiceNumber}</span></div>
                    <div className="flex justify-between"><span>Date</span><span className="font-bold text-slate-800">{inv.issueDate}</span></div>
                    <div className="flex justify-between"><span>Payable By</span><span className="font-bold text-slate-800">{inv.payableBy}</span></div>
                    <div className="flex justify-between"><span>Recipient</span><span className="font-bold text-slate-800 text-right max-w-[55%]">{inv.recipientCompany || inv.recipientName}</span></div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 mt-2"><span className="font-bold">Invoice Sum Tax-Exempt</span><span className="font-black text-red-600">${totalSum.toFixed(2)}</span></div>
                    {inv.paymentMethod === 'wire' && (
                      <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                        Footer will include: <span className="font-semibold text-slate-600">Bank of America · IFOA USA Corp · SWIFT: BOFAUS3N · Account: 8981 5632 1560</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Footer actions ── */}
              {step === 'edit' && (
                <div className="border-t border-slate-100 bg-white px-6 py-4 flex justify-between items-center">
                  <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                    Cancel
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        setPreviewLoading(true)
                        try { const r = await generateIFOAInvoicePDF(inv); setPreviewData(r) }
                        catch (e) { console.error(e) }
                        finally { setPreviewLoading(false) }
                      }}
                      disabled={previewLoading || savingInvoice}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                    >
                      {previewLoading
                        ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>
                        : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      }
                      Preview PDF
                    </button>
                    {(!hasInvoice || hasInvoiceChanges) && (
                      <button
                        onClick={handleSaveInvoice}
                        disabled={savingInvoice || previewLoading}
                        style={{ background: '#0000ff' }}
                        className="inline-flex items-center gap-2 px-6 py-2.5 text-white font-bold rounded-xl text-sm transition disabled:opacity-60"
                      >
                        {(savingInvoice || previewLoading)
                          ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" /><path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" /></svg>Saving…</>
                          : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            {hasInvoice ? 'Save Changes' : 'Generate Invoice'}
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
          <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-20 overflow-y-auto">
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
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition">✕</button>
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
                    style={{ background: '#0000ff' }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-white font-bold rounded-xl text-sm transition"
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
  blue: 'border-blue-100 bg-blue-50/40',
  emerald: 'border-emerald-100 bg-emerald-50/40',
  violet: 'border-violet-100 bg-violet-50/40',
  amber: 'border-amber-100 bg-amber-50/40',
  default: 'border-slate-200 bg-white',
}

function StatCard({ label, value, sub, icon, accent = 'default' }) {
  const iconColors = { blue: 'text-blue-600', emerald: 'text-emerald-600', violet: 'text-violet-600', amber: 'text-amber-600', default: 'text-slate-500' }
  return (
    <div className={`rounded-2xl border p-5 ${accents[accent]}`}>
      {icon && <div className={`mb-3 ${iconColors[accent]}`}>{icon}</div>}
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function EmptyState({ message = 'No records found' }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="m20 20-3.5-3.5" /></svg>
      </div>
      <p className="text-base font-bold text-slate-900">{message}</p>
      <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or refresh.</p>
    </div>
  )
}

// ─── InvoiceCell — Invoice Preview + Edit/Generate (always same width) ──────────
// Invoice generation is only for admin-added/managed registrations. Airlines created
// by admin carry addedByAdmin=true; individuals have no such field, so fall back to an
// existing signal: a self-service registration pays through Stripe checkout (card), so
// anything NOT self-paid via Stripe (wire/manual/admin-created) is admin-managed.
function isAdminManaged(record) {
  if (!record) return false
  if (record.addedByAdmin === true) return true
  if (record.wirePaymentRequested === true) return true
  const selfPaidByStripe = Boolean(record.stripePaymentIntentId) || record.paymentMethodType === 'card'
  return !selfPaidByStripe
}

function InvoiceCell({ onInvoice, onInvoicePreview, invoiceGenerated, canGenerate = true }) {
  // Non-admin-added registration with no invoice yet → generation does not apply.
  if (!invoiceGenerated && !canGenerate) {
    return (
      <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
        <span className="text-[11px] text-slate-300 font-semibold" title="Invoice generation is only available for admin-added registrations">—</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-2" onClick={e => e.stopPropagation()}>
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
      <div className="max-h-[68vh] overflow-y-auto overflow-x-auto">
        <table className="w-full table-auto text-sm min-w-[1100px]">
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-3.5 w-10">
                <input type="checkbox" checked={allSelected} onChange={() => onToggleSelectAll(allIds)}
                  className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer" />
              </th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-36">Contact</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-36">Email / Phone</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-20">Country</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-24">Plan</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-20">Price</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-28">Sub Start</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-28">Expiry</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 w-28">Status</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 w-20">Payment</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 w-36">Invoice Preview</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 w-24">Actions</th>
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
                    className={`border-b border-slate-100 transition-colors cursor-pointer ${isSelected
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
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-black flex items-center justify-center flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm leading-tight truncate max-w-[130px]">
                            {[primary.firstName, primary.lastName].filter(Boolean).join(' ') || '—'}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[130px]">{primary.primaryCertificate || 'No cert type'}</p>
                          {primary.convertedFromAirlineName && (
                            <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 truncate max-w-[130px]" title={`Converted from ${primary.convertedFromAirlineName}`}>
                              ↗ {primary.convertedFromAirlineName}
                            </span>
                          )}
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
                      <p className="text-slate-500 text-[11px] mt-0.5">{primary.phone || '—'}</p>
                    </td>
                    <td className="px-4 py-4"><p className="text-slate-600 text-xs truncate max-w-[80px]">{primary.country || '—'}</p></td>
                    <td className="px-4 py-4"><span className="text-xs text-slate-700 font-medium">{planLabel(primary.subscriptionPlan)}</span></td>
                    <td className="px-4 py-4 font-semibold text-slate-900 text-sm whitespace-nowrap">{fmtMoney(primary.price)}</td>
                    <td className="px-4 py-4 text-xs text-slate-500 whitespace-nowrap">{primary.subscriptionDate ? fmtDateMDY(primary.subscriptionDate) : (primary.isPaid ? '—' : <span className="text-slate-300">Pending</span>)}</td>
                    <td className="px-4 py-4">
                      {primary.subscriptionPlan === 'Unlimited Plan'
                        ? <span className="text-xs font-semibold text-indigo-600">Never</span>
                        : primary.expirationDate
                          ? <span className={`text-xs font-semibold whitespace-nowrap ${new Date(primary.expirationDate) < new Date() ? 'text-red-600' : new Date(primary.expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-amber-600' : 'text-slate-600'}`}>{fmtDateMDY(primary.expirationDate)}</span>
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
                        canGenerate={isAdminManaged(primary)}
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
                            <p className="text-[10px] text-slate-500 truncate max-w-[110px]">{sub.primaryCertificate || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><p className="text-slate-600 text-xs truncate max-w-[140px]">{sub.email || '—'}</p><p className="text-slate-500 text-[11px] mt-0.5">{sub.phone || '—'}</p></td>
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
                          canGenerate={isAdminManaged(sub)}
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

// ─── Grouped Airlines Table ───────────────────────────────────────────────────
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
      <div className="max-h-[68vh] overflow-y-auto overflow-x-auto">
        <table className="w-full table-auto text-sm min-w-[1100px]">
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-3 py-3.5 w-10">
                <input type="checkbox" checked={allSelected} onChange={() => onToggleSelectAll(allIds)}
                  className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer" />
              </th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-40">Airline & Contact</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-32">Email</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-16">Country</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-20">Plan</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-20">Holders / Total</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-28">Sub Start</th>
              <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 w-28">Expiry</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 w-28">Status</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 w-20">Payment</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 w-36">Invoice Preview</th>
              <th className="px-4 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 w-24">Actions</th>
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
                    className={`border-b border-slate-100 transition-colors cursor-pointer ${isSelected
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
                        {primary.logoUrl ? (
                          <img src={primary.logoUrl} alt={primary.airlineName}
                            className="w-9 h-9 rounded-xl object-contain border border-slate-200 bg-white flex-shrink-0 transition-transform duration-200 hover:scale-[2.8] hover:shadow-xl relative hover:z-20" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center flex-shrink-0">
                            <Plane className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm leading-tight truncate max-w-[130px]">{primary.airlineName || '—'}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[130px]">{contactName || primary.city || primary.country || '—'}</p>
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
                      <div className="flex flex-col gap-1.5 items-start">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-md bg-slate-900 text-white text-[11px] font-bold px-1.5">
                            {primary.holderCountValue || primary.certificateHolders?.length || 0}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">holders</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">{fmtAirlineTotal(primary)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500 whitespace-nowrap">{primary.subscriptionDate ? fmtDateMDY(primary.subscriptionDate) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-4">
                      {primary.subscriptionPlan === 'Unlimited Plan'
                        ? <span className="text-xs font-semibold text-indigo-600">Never</span>
                        : primary.expirationDate
                          ? <span className={`text-xs font-semibold whitespace-nowrap ${new Date(primary.expirationDate) < new Date() ? 'text-red-600' : new Date(primary.expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-amber-600' : 'text-slate-600'}`}>{fmtDateMDY(primary.expirationDate)}</span>
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
                        canGenerate={isAdminManaged(primary)}
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
                          <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">{fmtAirlineTotal(sub)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{sub.subscriptionDate ? fmtDateMDY(sub.subscriptionDate) : <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3">
                        {sub.subscriptionPlan === 'Unlimited Plan'
                          ? <span className="text-xs font-semibold text-indigo-600">Never</span>
                          : sub.expirationDate
                            ? <span className={`text-xs font-semibold whitespace-nowrap ${new Date(sub.expirationDate) < new Date() ? 'text-red-600' : new Date(sub.expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-amber-600' : 'text-slate-600'}`}>{fmtDateMDY(sub.expirationDate)}</span>
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
                          canGenerate={isAdminManaged(sub)}
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
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>}
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
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>}
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
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-5">Plan Distribution</p>
          <div className="space-y-4">
            {Object.entries(planCounts).map(([plan, count]) => {
              const pct = allRegs.length ? Math.round((count / allRegs.length) * 100) : 0
              return (
                <div key={plan}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700">{plan}</span>
                    <span className="font-bold text-slate-900">{count} <span className="text-slate-500 font-normal">({pct}%)</span></span>
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
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-5">Top Countries — All Registrations</p>
          <div className="space-y-2">
            {topCountries.length === 0 ? <p className="text-sm text-slate-500">No data yet.</p> : topCountries.map(([country, count]) => (
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
  const [noPlanAccounts, setNoPlanAccounts] = useState([])
  // 'all' = registrations + signed-up accounts without a plan; 'withPlan' = only those with data.
  const [accountView, setAccountView] = useState('withPlan')
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('All')
  const [filterPayment, setFilterPayment] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterExpiry, setFilterExpiry] = useState('All')
  const [sortOrder, setSortOrder] = useState('desc')

  const [viewRec, setViewRec] = useState(null)
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
      const [ir, ar, nr] = await Promise.all([getAllIndividuals(), getAllAirlinesSubscriptions(), getAccountsWithoutPlan().catch(() => null)])
      const newInds = Array.isArray(ir.data?.data) ? ir.data.data : Array.isArray(ir.data) ? ir.data : []
      const newAirs = Array.isArray(ar.data?.data) ? ar.data.data : Array.isArray(ar.data) ? ar.data : []
      setNoPlanAccounts(Array.isArray(nr?.data?.data) ? nr.data.data : [])

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
      let saved = data
      if (type === 'airline') {
        const res = await updateAirlinesSubscription(id, data)
        saved = res.data?.data || data
        setAirlines(p => p.map(x => x._id === id ? { ...x, ...saved } : x))
      } else {
        const res = await updateIndividual(id, data)
        saved = res.data?.data || data
        setIndividuals(p => p.map(x => x._id === id ? { ...x, ...saved } : x))
      }
      showToast('Record updated successfully')
      return saved
    } catch (e) {
      showToast(friendlySaveError(e), 'error')
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
      const model = type === 'airline' ? 'Airlines' : 'Individual'
      const wirePurpose = payload.wireInvoicePurpose  // 'renewal' | 'holder-upgrade' | null

      if (wirePurpose) {
        // Wire renewal/upgrade: always create a new dedicated Invoice doc.
        // Never reuse the current-plan Invoice doc — that would destroy it.
        await createAdminInvoiceDoc(id, model, payload.invoiceDraft, payload.invoiceNumber, wirePurpose)
      } else {
        // Standard flow: prefer updating existing Payment/Invoice doc.
        let paidDoc = null
        try {
          const paymentsRes = await getPaymentsByRegistration(id)
          const payments = paymentsRes.data?.data || []
          paidDoc = payments.find(p => p.isPaid) || payments[0] || null
        } catch { /* non-critical */ }

        let invDoc = null
        try {
          const invDocRes = await getInvoiceByRegistration(id)
          const allInvDocs = invDocRes.data?.data || []
          const realDocs = allInvDocs.filter(d => !d._source)
          invDoc = realDocs.find(d => d.invoiceNumber === payload.invoiceNumber)
            || realDocs.find(d => d.adminGenerated)
            || realDocs.find(d => !d.paymentId)
            || realDocs[0]
            || null
        } catch { /* non-critical */ }

        if (paidDoc?._id && payload.invoiceDraft) {
          await savePaymentInvoiceDraft(paidDoc._id, payload.invoiceDraft, payload.invoiceNumber)
        } else if (invDoc?._id) {
          await saveInvoiceDraftToDoc(invDoc._id, payload.invoiceDraft, payload.invoiceNumber)
        } else {
          await createAdminInvoiceDoc(id, model, payload.invoiceDraft, payload.invoiceNumber)
        }

        // Best-effort sync Invoice doc when Payment path ran first.
        try {
          if (paidDoc?._id && invDoc?._id) {
            await saveInvoiceDraftToDoc(invDoc._id, payload.invoiceDraft, payload.invoiceNumber)
          }
        } catch (invSyncErr) {
          console.warn('[handleSaveInvoice] Invoice doc sync warning:', invSyncErr.message)
        }
      }

      const registrationUpdate = {
        invoiceStatus: payload.invoiceStatus,
        invoiceGenerated: payload.invoiceGenerated,
        invoiceNumber: payload.invoiceNumber,
        invoiceDraft: payload.invoiceDraft,
      }

      const mergeRecord = (x, saved) => ({
        ...x, ...saved,
        invoiceDraft: payload.invoiceDraft,
        invoiceNumber: payload.invoiceNumber,
      })

      if (type === 'airline') {
        const res = await updateAirlinesSubscription(id, registrationUpdate)
        const saved = res.data?.data || {}
        setAirlines(p => p.map(x => x._id === id ? mergeRecord(x, saved) : x))
        setInvoiceModal(prev => prev && prev.record._id === id
          ? { ...prev, record: mergeRecord(prev.record, saved) } : prev)
        setViewRec(prev => prev && prev._id === id ? mergeRecord(prev, saved) : prev)
      } else {
        const res = await updateIndividual(id, registrationUpdate)
        const saved = res.data?.data || {}
        setIndividuals(p => p.map(x => x._id === id ? mergeRecord(x, saved) : x))
        setInvoiceModal(prev => prev && prev.record._id === id
          ? { ...prev, record: mergeRecord(prev.record, saved) } : prev)
        setViewRec(prev => prev && prev._id === id ? mergeRecord(prev, saved) : prev)
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

  // Resolve an invoice number before opening any invoice modal.
  // persist=false (generate flow): number generated in-memory only, not written to DB until admin saves.
  // persist=true (edit flow): number persisted to Registration doc immediately (default).
  const resolveInvoiceNumber = async (record, type, persist = true, forceFresh = false) => {
    let resolved = record

    // Generate flow (forceFresh): always suggest a brand-new, unused number instead of
    // reusing the registration's existing invoiceNumber (which is already taken by a prior
    // invoice and would collide on save). Uses peek — no counter burned until saved.
    if (forceFresh) {
      try {
        const genRes = await generateInvoiceNumber()
        const newNum = genRes.data?.invoiceNumber
        if (newNum) resolved = { ...resolved, invoiceNumber: newNum, invoiceDraft: null }
      } catch { /* fall through — keep existing */ }
      return resolved
    }

    // Always check Invoice collection first — it is the canonical source of truth.
    // Sync invoice number AND draft data so the modal opens with the latest saved data.
    // For wire renewal/upgrade invoices, filter to same-purpose docs so we don't
    // accidentally reuse the current-plan's invoice number.
    const wireInvoicePurpose = record._wireInvoicePurpose || null
    try {
      const invRes = await getInvoiceByRegistration(record._id)
      const realInvDocs = (invRes.data?.data || []).filter(d => !d._source)
      // Wire purpose: only consider Invoice docs matching that purpose (new renewal/upgrade invoice).
      // Standard: prefer admin-generated doc, fall back to first real doc.
      const invDoc = wireInvoicePurpose
        ? (realInvDocs.find(d => d.purpose === wireInvoicePurpose && d.adminGenerated) || null)
        : (realInvDocs.find(d => d.adminGenerated) || realInvDocs[0])
      if (invDoc) {
        const existingNum = invDoc.invoiceNumber
        if (existingNum && existingNum !== resolved.invoiceNumber) {
          resolved = { ...resolved, invoiceNumber: existingNum }
          if (!wireInvoicePurpose) {
            // Only sync invoice number back to registration for non-wire-purpose flows
            if (type === 'airline') setAirlines(p => p.map(x => x._id === record._id ? { ...x, invoiceNumber: existingNum } : x))
            else setIndividuals(p => p.map(x => x._id === record._id ? { ...x, invoiceNumber: existingNum } : x))
          }
        }
        // Merge Invoice doc draft into record so the modal reads canonical data.
        if (invDoc.draft) {
          resolved = { ...resolved, invoiceDraft: { ...invDoc.draft, invoiceNumber: invDoc.invoiceNumber } }
        }
      }
    } catch { /* fall through */ }

    // Still no number — generate one. Only persist to DB when persist=true (edit/preview flow).
    if (!resolved.invoiceNumber) {
      try {
        const genRes = await generateInvoiceNumber()
        const newNum = genRes.data?.invoiceNumber
        if (newNum) {
          if (persist) {
            if (type === 'airline') {
              await updateAirlinesSubscription(record._id, { invoiceNumber: newNum })
              setAirlines(p => p.map(x => x._id === record._id ? { ...x, invoiceNumber: newNum } : x))
            } else {
              await updateIndividual(record._id, { invoiceNumber: newNum })
              setIndividuals(p => p.map(x => x._id === record._id ? { ...x, invoiceNumber: newNum } : x))
            }
          }
          resolved = { ...resolved, invoiceNumber: newNum }
        }
      } catch { /* fall through */ }
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
    // Brand-new invoice → force a fresh, unused number so it never collides on save.
    const resolved = await resolveInvoiceNumber(record, type, false, true)
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

  // Signed-up accounts (current tab's role) that have no plan yet. Merged into
  // the main table when accountView === 'all'; hidden under 'withPlan'. Admin
  // toggles them via the account filter, so no separate panel is needed.
  const noPlanForTab = useMemo(() => {
    if (tab !== 'individuals' && tab !== 'airlines') return []
    const role = tab === 'individuals' ? 'individual' : 'airline'
    const q = search.toLowerCase()
    return (noPlanAccounts || [])
      .filter(u => u.role === role)
      .filter(u => !q || [`${u.firstName || ''} ${u.lastName || ''}`, u.email, u.airlineName].some(v => String(v || '').toLowerCase().includes(q)))
      .map(u => ({ ...u, __noPlan: true }))
  }, [noPlanAccounts, tab, search])

  // Rows shown in the table: real subscriptions plus, when viewing all
  // accounts, the signed-up accounts that have no plan yet.
  const tableData = useMemo(() => {
    if (accountView === 'noPlan') return noPlanForTab
    if (accountView === 'all') return [...filtered, ...noPlanForTab]
    return filtered
  }, [filtered, noPlanForTab, accountView])

  const uniqueAccountCount = useMemo(() => {
    if (tab === 'overview') return 0
    const keys = new Set()
    tableData.forEach(r => {
      const key = tab === 'airlines'
        ? (r.airlineName || '').toLowerCase().trim() || r._id
        : (r.email || '').toLowerCase().trim() || r._id
      keys.add(key)
    })
    return keys.size
  }, [tableData, tab])

  const PLANS = ['All', '1 Year Subscription Plan', 'Multiple Years Subscription Plan', 'Unlimited Plan']
  const PAYMENTS = ['All', 'pending', 'paid', 'failed']
  const STATUSES = ['All', 'Pending', 'Active', 'Inactive']

  // Open the full admin add-plan form, prefilled, for a signed-up account that
  // has no plan yet (matched to the user by email).
  const handleManagePlan = (u) => {
    const params = new URLSearchParams()
    if (u.email) params.set('email', u.email)
    if (u.firstName) params.set('firstName', u.firstName)
    if (u.lastName) params.set('lastName', u.lastName)
    if (u.airlineName) params.set('airlineName', u.airlineName)
    navigate(`/admin/add-${u.role === 'airline' ? 'airline' : 'individual'}?${params.toString()}`)
  }

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
            className={`fixed top-6 right-6 z-[100] flex items-start gap-3 rounded-xl px-5 py-3.5 shadow-2xl text-sm font-semibold text-white max-w-sm w-[calc(100vw-3rem)] sm:w-auto ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-900'}`}
          >
            {toast.type === 'error' && (
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></svg>
            )}
            {toast.type === 'airline' && <Plane className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            {toast.type === 'individual' && (
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="8" r="3.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.582-6 8-6s8 2 8 6" /></svg>
            )}
            {toast.type === 'success' && (
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            )}
            <span className="leading-snug break-words">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {viewRec && viewType === 'individual' && (
        <IndividualViewModal
          record={viewRec}
          onClose={closeView}
          onEdit={openEditFromView}
          onManagePlan={handleManagePlan}
          onDeletePlan={(r) => { closeView(); handleDelete(r._id, 'individual') }}
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
          onGenerateInvoice={r => openInvoiceGenerate(r, 'airline')}
        />
      )}
      {editRec && editType === 'individual' && (
        <IndividualEditModal
          record={editRec}
          saving={saving}
          onClose={(saved) => {
            console.log('[IndividualEdit onClose] saved:', saved, 'editRec:', editRec);
            setEditRec(null)
            setEditType(null)
            const isRecord = saved && typeof saved === 'object' && '_id' in saved && typeof saved.preventDefault !== 'function' && !('target' in saved)
            console.log('[IndividualEdit onClose] isRecord:', isRecord, 'setting viewRec to:', isRecord ? saved : editRec);
            setViewRec(isRecord ? saved : editRec)
            setViewType('individual')
          }}
          onSave={(id, data) => handleSave(id, data, 'individual')}
        />
      )}
      {editRec && editType === 'airline' && (
        <AirlineEditModal
          record={editRec}
          saving={saving}
          onClose={(saved) => {
            console.log('[AirlineEdit onClose] saved:', saved, 'editRec:', editRec);
            setEditRec(null)
            setEditType(null)
            const isRecord = saved && typeof saved === 'object' && '_id' in saved && typeof saved.preventDefault !== 'function' && !('target' in saved)
            console.log('[AirlineEdit onClose] isRecord:', isRecord, 'setting viewRec to:', isRecord ? saved : editRec);
            setViewRec(isRecord ? saved : editRec)
            setViewType('airline')
          }}
          onSave={(id, data) => handleSave(id, data, 'airline')}
        />
      )}

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

      </div>

      {loadErr && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></svg>
          <span>{loadErr}</span>
          <button onClick={loadData} className="ml-auto font-semibold underline hover:no-underline">Retry</button>
        </div>
      )}

      {tab !== 'add-airline' && tab !== 'add-individual' && (
        <div className="flex flex-wrap items-center gap-3 mb-6 px-1">
          {tab !== 'overview' && (
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="m20 20-3.5-3.5" /></svg>
                <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-full sm:w-48 bg-white transition shadow-sm" />
              </div>
              <select value={accountView} onChange={e => setAccountView(e.target.value)}
                title="Show all signed-up accounts, or only those that have a plan"
                className="flex-grow sm:flex-grow-0 border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl bg-white outline-none focus:border-blue-500 text-slate-600 transition shadow-sm h-[38px]">
                <option value="all">All accounts</option>
                <option value="withPlan">With plan only</option>
                <option value="noPlan">No plan only</option>
              </select>
              <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
                className="flex-grow sm:flex-grow-0 border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl bg-white outline-none focus:border-blue-500 text-slate-600 transition shadow-sm h-[38px]">
                {PLANS.map(p => <option key={p} value={p}>{p === 'All' ? 'All Plans' : p}</option>)}
              </select>
              <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
                className="flex-grow sm:flex-grow-0 border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl bg-white outline-none focus:border-blue-500 text-slate-600 transition shadow-sm h-[38px]">
                {PAYMENTS.map(p => <option key={p} value={p}>{p === 'All' ? 'All Payments' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="flex-grow sm:flex-grow-0 border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl bg-white outline-none focus:border-blue-500 text-slate-600 transition shadow-sm h-[38px]">
                {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
              </select>
              <select value={filterExpiry} onChange={e => setFilterExpiry(e.target.value)}
                className="flex-grow sm:flex-grow-0 border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl bg-white outline-none focus:border-blue-500 text-slate-600 transition shadow-sm h-[38px]">
                <option value="All">All Dates</option>
                <option value="Expired">Expired</option>
                <option value="ExpiringSoon">Expiring in 30 days</option>
              </select>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition h-[38px]">Clear</button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 w-full lg:w-auto lg:ml-auto">
            {tab !== 'overview' && (
              <a href={tab === 'individuals' ? exportIndividualsExcel() : exportAirlinesExcel()} className="flex-1 lg:flex-none justify-center inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition shadow-sm shadow-emerald-200/50">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0-4-4m4 4 4-4M4 20h16" /></svg>
                Export
              </a>
            )}
            {tab === 'individuals' && (
              <button onClick={() => navigate('/admin/add-individual')} className="flex-1 lg:flex-none justify-center inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition shadow-sm shadow-slate-900/10" style={{ background: '#000021' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" /></svg>
                Add New
              </button>
            )}
            {tab === 'airlines' && (
              <button onClick={() => navigate('/admin/add-airline')} className="flex-1 lg:flex-none justify-center inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition shadow-sm shadow-slate-900/10" style={{ background: '#000021' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" /></svg>
                Add New
              </button>
            )}
            <button onClick={() => loadData(true)} className="flex-grow lg:flex-none justify-center inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition h-[40px]">
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
            <span className="text-slate-500">({filtered.length} total subscription{filtered.length !== 1 ? 's' : ''})</span>
          </p>
          {selectedIds.size > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">{selectedIds.size} selected</span>
              <button
                onClick={handleBulkSendReminder}
                disabled={sendingReminder || bulkDeleting || bulkGenerating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-600 hover:bg-slate-700 disabled:opacity-50 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition"
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
        <>
        <IndividualsTable
          data={tableData}
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
        </>
      ) : (
        <>
        <AirlinesTable
          data={tableData}
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
        </>
      )}
    </DashboardLayout>
  )
}

