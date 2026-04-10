import { useCallback, useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import axios from 'axios'
import { Lock, ShieldCheck, MapPin, Zap } from 'lucide-react'

// Individual steps
import Step1PersonalInfo from '../components/individual/Step1PersonalInfo'
import Step2Certificates from '../components/individual/Step2Certificates'
import Step3Preview from '../components/individual/Step3Preview'
import Step4Payment from '../components/individual/Step4Payment'
import SuccessPage from '../components/individual/SuccessPage'

// Airlines steps
import AirlinesStep1PlanAndDetails from '../components/airlines/AirlinesStep1PlanAndDetails'
import AirlinesStep2Holders from '../components/airlines/AirlinesStep2Holders'
import AirlinesStep3Preview from '../components/airlines/AirlinesStep3Preview'
import AirlinesStep4Payment from '../components/airlines/AirlinesStep4Payment'
import AirlinesSuccessPage from '../components/airlines/AirlinesSuccessPage'

import { register } from '../services/api'
import { useAuth } from '../context/AuthContext'

import logo from '../assets/IFOA_USA_white.png'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const B   = '#0000ff'
const BD  = '#0000e6'
const BL  = '#3333ff'
const BXL = '#dbeafe'
const BM  = '#eff6ff'
const R   = '#dc2626'
const RD  = '#b91c1c'
const RL  = '#ef4444'
const RM  = '#fef2f2'
const RX  = '#fecaca'
const DARK = '#0f172a'
const GRAY = '#f8fafc'

const INDIVIDUAL_STEPS = [
  { label: 'Personal Info',   detail: 'Choose your plan and enter your contact details.' },
  { label: 'Certificates',    detail: 'Add your FAA certificate information.' },
  { label: 'Review',          detail: 'Confirm everything before payment.' },
  { label: 'Payment',         detail: 'Submit your registration and receive your invoice.' },
]

const AIRLINES_STEPS = [
  { label: 'Plan & Details',       detail: 'Choose your plan and enter company information.' },
  { label: 'Certificate Holders',  detail: 'Add the certificate holders in your team.' },
  { label: 'Review',               detail: 'Confirm all details before payment.' },
  { label: 'Payment',              detail: 'Submit registration and receive your invoice.' },
]

const INDIVIDUAL_INIT = {
  subscriptionPlan: '1 Year Subscription Plan',
  price: 69.0,
  firstName: '', lastName: '', middleName: '', dateOfBirth: '',
  addressLine1: '', city: '', state: '', postalCode: '', country: '',
  phone: '', email: '',
  primaryAirmanCertificate: 'EXISTING',
  primaryCertificate: '', iacraTrackingNumber: '',
  hasSecondaryCertificate: false,
  secondaryCertificate: '', secondaryFaaCertificateNumber: '', secondaryIacraTrackingNumber: '',
  paymentEmail: '', agreedToTerms: false,
}

const AIRLINES_INIT = {
  subscriptionPlan: '1 Year Subscription Plan',
  pricePerCertificate: 49,
  totalAmount: 0,
  airlineName: '',
  firstName: '', lastName: '', middleName: '', dateOfBirth: '',
  email: '', phone: '',
  addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: '',
  holderCount: '', holderCountValue: '', certificateHolders: [],
  paymentEmail: '', paymentStatus: 'pending', agreedToTerms: false,
}

function hydrateAirlineFormFromExisting(existing) {
  if (!existing) return null
  return {
    subscriptionPlan: existing.subscriptionPlan || AIRLINES_INIT.subscriptionPlan,
    pricePerCertificate: Number(existing.pricePerCertificate ?? existing.pricePerCert ?? AIRLINES_INIT.pricePerCertificate),
    totalAmount: Number(existing.totalAmount ?? existing.totalServiceFees ?? AIRLINES_INIT.totalAmount),
    airlineName: existing.airlineName || '',
    firstName: existing.firstName || existing.contactFirstName || '',
    lastName: existing.lastName || existing.contactLastName || '',
    middleName: existing.middleName || '',
    dateOfBirth: existing.dateOfBirth || '',
    email: existing.email || existing.contactEmail || '',
    phone: existing.phone || existing.contactPhone || '',
    addressLine1: existing.addressLine1 || '',
    addressLine2: existing.addressLine2 || '',
    city: existing.city || '',
    state: existing.state || '',
    postalCode: existing.postalCode || '',
    country: existing.country || '',
    holderCount: existing.holderCount || '',
    holderCountValue: String(existing.holderCountValue || existing.committedCount || existing.certificateHolders?.length || ''),
    certificateHolders: Array.isArray(existing.certificateHolders) ? existing.certificateHolders : [],
    paymentEmail: existing.paymentEmail || existing.email || '',
    paymentStatus: existing.paymentStatus || 'pending',
    paymentMethod: existing.paymentMethod || 'card',
    agreedToTerms: true,
    _id: existing._id,
  }
}

function hydrateIndividualFormFromExisting(existing) {
  if (!existing) return null
  return {
    subscriptionPlan: existing.subscriptionPlan || INDIVIDUAL_INIT.subscriptionPlan,
    price: Number(existing.price ?? existing.totalAmount ?? existing.totalServiceFees ?? INDIVIDUAL_INIT.price),
    firstName: existing.firstName || '',
    lastName: existing.lastName || '',
    middleName: existing.middleName || '',
    dateOfBirth: existing.dateOfBirth ? String(existing.dateOfBirth).slice(0, 10) : '',
    addressLine1: existing.addressLine1 || '',
    city: existing.city || '',
    state: existing.state || '',
    postalCode: existing.postalCode || '',
    country: existing.country || '',
    phone: existing.phone || '',
    email: existing.email || '',
    primaryAirmanCertificate: existing.primaryAirmanCertificate || 'EXISTING',
    primaryCertificate: existing.primaryCertificate || '',
    iacraTrackingNumber: existing.iacraTrackingNumber || '',
    hasSecondaryCertificate: !!existing.hasSecondaryCertificate,
    secondaryCertificate: existing.secondaryCertificate || '',
    secondaryFaaCertificateNumber: existing.secondaryFaaCertificateNumber || '',
    secondaryIacraTrackingNumber: existing.secondaryIacraTrackingNumber || '',
    paymentEmail: existing.paymentEmail || existing.email || '',
    agreedToTerms: true,
    _id: existing._id,
  }
}

const SERVICE_CONTACT = [
  { label: 'Company', value: 'IFOA USA Corp' },
  { label: 'Address', value: '1616 Concierge Blvd Suite 100, Daytona Beach, FL 32117, USA' },
  { label: 'Email', value: 'agent@theifoa.com', href: 'mailto:agent@theifoa.com' },
  { label: 'Phone', value: '+1 508 838 5880', href: 'tel:+15088385880' },
]

function PortalCards({ regType }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg border border-white/10 p-2.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">FAA IACRA</p>
        <p className="text-[11px] text-slate-400 leading-relaxed mb-1.5">Retrieve your FTN as a <strong className="text-slate-300">NEW</strong> or <strong className="text-slate-300">EXISTING</strong> certificate holder.</p>
        <a href="https://iacra.faa.gov/IACRA/Default.aspx" target="_blank" rel="noreferrer" className="text-[11px] font-bold text-slate-300 hover:underline">IACRA Portal →</a>
      </div>
      <div className="rounded-lg border border-white/10 p-2.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">FAA USAS</p>
        <p className="text-[11px] text-slate-400 leading-relaxed mb-1.5">Register IFOA as your U.S. Agent for Service.{regType === 'airline' ? ' Repeat for each holder.' : ''}</p>
        <a href="https://usas.faa.gov/signin" target="_blank" rel="noreferrer" className="text-[11px] font-bold text-slate-300 hover:underline">USAS Portal →</a>
      </div>
    </div>
  )
}

// ── Right Sidebar (Fixed) ─────────────────────────────────────────────────────
function RightSidebar({ regType }) {
  const isIndividual = regType === 'individual'
  return (
    <div
      className="hidden lg:flex flex-col flex-shrink-0"
      style={{
        width: 440,
        minWidth: 400,
        maxWidth: 480,
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        position: 'relative',
        background: 'linear-gradient(170deg, #020617 0%, #0f172a 60%, #111827 100%)',
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <Motion.div
          key={regType}
          initial={{ opacity: 0, x: isIndividual ? -24 : 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isIndividual ? 24 : -24 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={`flex-1 p-5 overflow-y-auto`}
          style={{ scrollbarWidth: 'none', maxHeight: '100vh' }}
        >
          <div className="pb-3 mb-3 border-b border-white/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Guided Help</p>
            <h3 className="text-sm font-black text-white leading-tight">{isIndividual ? 'Individual Support' : 'Airline Support'}</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              {isIndividual ? 'Follow these steps to finish quickly.' : 'Use this checklist to onboard your team.'}
            </p>
          </div>

          {isIndividual && (
            <div className="pb-3 mb-3 border-b border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Video Guide</p>
              <div className="aspect-video rounded-lg overflow-hidden border border-white/10 bg-black/30">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/cfjy4wI7ZY4?rel=0&modestbranding=1"
                  title="IFOA Registration Walkthrough"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          <div className="pb-3 mb-3 border-b border-white/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">FAA Portals</p>
            <PortalCards regType={regType} />
          </div>

          {!isIndividual && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Agent Details</p>
            <div className="divide-y divide-white/10 rounded-xl border border-white/10">
              {SERVICE_CONTACT.map((row) => (
                <div key={row.label} className="grid grid-cols-[72px_1fr] gap-2 px-2.5 py-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{row.label}</p>
                  {row.href ? (
                    <a href={row.href} className="text-[11px] font-semibold text-slate-300 hover:underline leading-snug">{row.value}</a>
                  ) : (
                    <p className="text-[11px] font-medium text-slate-300 leading-snug">{row.value}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 px-1 mb-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Quick Tip</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isIndividual
                  ? 'Keep your FTN and certificate details ready before moving from Step 1 to Step 2 to finish faster.'
                  : 'Prepare holder details in advance (name, DOB, FAA certificate, FTN) to complete team registration in one pass.'}
              </p>
            </div>
          </div>
          )}
        </Motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Auth Modal ────────────────────────────────────────────────────────────────
function AuthModal({ onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <Motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }} transition={{ duration: 0.25 }}
        className="relative w-full max-w-md rounded-3xl overflow-hidden bg-white shadow-2xl"
        style={{ border: `1.5px solid ${BXL}` }}
      >
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${BD}, ${B}, ${BL})` }} />
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="px-8 py-8 text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: BM, border: `1.5px solid ${BXL}` }}>
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: B }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">Account Required</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-1">Sign in or create a free account to continue.</p>
          <p className="text-gray-400 text-xs mb-7">Your form data is saved — you won't lose progress.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/signup', { state: { from: location } })}
              className="w-full inline-flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-xl text-sm text-white transition-all"
              style={{ background: B }}
              onMouseEnter={e => e.currentTarget.style.background = BD}
              onMouseLeave={e => e.currentTarget.style.background = B}>
              Create Free Account
            </button>
            <button onClick={() => navigate('/login', { state: { from: location } })}
              className="w-full inline-flex items-center justify-center gap-2 font-semibold px-6 py-3 rounded-xl text-sm text-gray-700 transition-all hover:bg-gray-50"
              style={{ border: '1px solid #e5e7eb' }}>
              Sign In to Existing Account
            </button>
          </div>
          <p className="text-gray-400 text-xs mt-5">Free to register · No credit card required</p>
        </div>
      </Motion.div>
    </div>
  )
}

// ── Wrong Role Banner ─────────────────────────────────────────────────────────
function WrongRoleBanner({ type }) {
  const msg = type === 'individual'
    ? { title: 'Airlines Account Detected', body: "You're signed in as an Airline account. Switch to Individual type above, or the submit button will be disabled." }
    : { title: 'Individual Account Detected', body: "You're signed in as an Individual account. Switch to Company type above, or the submit button will be disabled." }
  return (
    <div className="rounded-t-3xl px-7 py-5" style={{ background: RM, borderBottom: `1.5px solid ${RX}` }}>
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: RX }}>
          <svg className="w-4 h-4" style={{ color: R }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-black mb-0.5" style={{ color: '#7f1d1d' }}>{msg.title}</p>
          <p className="text-xs leading-relaxed" style={{ color: '#991b1b' }}>{msg.body}</p>
        </div>
      </div>
    </div>
  )
}

// ── Existing Form Banner ─────────────────────────────────────────────────────
function ExistingFormBanner({ regType }) {
  const isIndividual = regType === 'individual'
  return (
    <div className="rounded-3xl border px-6 py-5" style={{ background: BM, borderColor: BXL }}>
      <div className="flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: '#bfdbfe' }}>
          <svg className="w-4 h-4" style={{ color: B }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6m7 4H5a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l6.414 6.414a1 1 0 01.293.707V17a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-black mb-1" style={{ color: '#1e3a8a' }}>
            {isIndividual ? 'Your Individual form is already filled' : 'Your Company form is already filled'}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: '#1d4ed8' }}>
            You cannot submit a new registration again. Please edit your submitted form from your Subscription dashboard.
          </p>
          <div className="mt-4">
            <Link
              to="/dashboard/subscription"
              className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl text-white transition-all"
              style={{ background: B }}
              onMouseEnter={e => e.currentTarget.style.background = BD}
              onMouseLeave={e => e.currentTarget.style.background = B}
            >
              Go to Subscription
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExistingOrderSummary({ regType, data }) {
  const isIndividual = regType === 'individual'
  const money = (n) => {
    const value = Number(n || 0)
    return Number.isFinite(value) ? `$${value.toFixed(2)} USD` : '$0.00 USD'
  }

  return (
    <div className="rounded-3xl border px-6 py-5" style={{ background: '#ffffff', borderColor: '#e5e7eb' }}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: '#64748b' }}>Order Summary</p>
      <div className="space-y-2 text-sm">
        {isIndividual ? (
          <>
            <div className="flex items-center justify-between"><span className="text-slate-500">Plan</span><span className="font-semibold text-slate-800">{data.subscriptionPlan || '1 Year Subscription Plan'}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Primary Certificate</span><span className="font-semibold text-slate-800">{data.primaryCertificate || 'Not specified'}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Certificate Status</span><span className="font-semibold text-slate-800">{data.primaryAirmanCertificate || 'EXISTING'}</span></div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2"><span className="text-slate-500">Total</span><span className="font-black text-slate-900">{money(data.price)}</span></div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between"><span className="text-slate-500">Plan</span><span className="font-semibold text-slate-800">{data.subscriptionPlan || '1 Year Subscription Plan'}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Price / Certificate</span><span className="font-semibold text-slate-800">{money(data.pricePerCertificate)}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Committed Holders</span><span className="font-semibold text-slate-800">{Number(data.holderCountValue || data.committedCount || data.certificateHolders?.length || 0)}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Current Holders Added</span><span className="font-semibold text-slate-800">{data.certificateHolders?.length || 0}</span></div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2"><span className="text-slate-500">Total</span><span className="font-black text-slate-900">{money(data.totalAmount || (Number(data.pricePerCertificate || 0) * Number(data.holderCountValue || data.committedCount || data.certificateHolders?.length || 0)))}</span></div>
          </>
        )}
      </div>
    </div>
  )
}

const isRecordCompleted = (record) => {
  if (!record) return false
  return record.isFormCompleted === true || (record.isFormCompleted == null && (record.isPaid === true || record.paymentStatus === 'paid'))
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { user, token, linkRegistration, addSubscription } = useAuth()

  const [regType, setRegType] = useState('individual')
  const [switchDirection, setSwitchDirection] = useState(1)
  const [transitionMode, setTransitionMode] = useState('step')

  const [indStep, setIndStep] = useState(1)
  const [indData, setIndData] = useState(INDIVIDUAL_INIT)
  const [indSubmitted, setIndSubmitted] = useState(false)
  const [indSubmitting, setIndSubmitting] = useState(false)
  const [indError, setIndError] = useState('')

  const [airStep, setAirStep] = useState(1)
  const [airData, setAirData] = useState(AIRLINES_INIT)
  const [airSubmitted, setAirSubmitted] = useState(false)
  const [airSubmitting, setAirSubmitting] = useState(false)
  const [airError, setAirError] = useState('')

  const [showAuthModal, setShowAuthModal] = useState(false)
  const scrollContainerRef = useRef(null)
  const formRef = useRef(null)

  const isIndBlocked = user?.role === 'airline'
  const isAirBlocked = user?.role === 'individual'
  const [hasIndividualSubmission, setHasIndividualSubmission] = useState(false)
  const [hasAirlineSubmission, setHasAirlineSubmission] = useState(false)
  const [existingIndividualRecord, setExistingIndividualRecord] = useState(null)
  const [existingAirlineRecord, setExistingAirlineRecord] = useState(null)
  const hasExistingSubmissionForType = regType === 'individual' ? hasIndividualSubmission : hasAirlineSubmission

  const findExistingSubmission = useCallback(async (type) => {
    if (!user) return null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const endpointBase = type === 'individual' ? 'individuals' : 'airlines'

    // First, check all linked IDs for this model path. This is the fastest and most reliable signal.
    const ids = [...(user.subscriptionIds || [])]
    if (user.registrationId) {
      const regId = String(user.registrationId)
      if (!ids.map((i) => String(i)).includes(regId)) ids.push(user.registrationId)
    }

    if (ids.length > 0) {
      const probes = await Promise.allSettled(
        ids.map((id) => axios.get(`${BASE_URL}/${endpointBase}/${id}`, { headers }))
      )
      const byId = probes
        .filter((p) => p.status === 'fulfilled' && p.value?.data?.data)
        .map((p) => p.value.data.data)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      const completedById = byId.filter(isRecordCompleted)
      if (completedById.length > 0) return completedById[0]
    }

    // Fallback by email for older accounts that may not have linked ids.
    if (!user?.email) return false
    try {
      const byEmail = await axios.get(`${BASE_URL}/${endpointBase}/by-email`, {
        params: { email: user.email },
        headers,
      })
      if (Array.isArray(byEmail?.data?.all) && byEmail.data.all.length > 0) {
        const completed = byEmail.data.all
          .filter(isRecordCompleted)
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        return completed[0] || null
      }
      return isRecordCompleted(byEmail?.data?.data) ? byEmail.data.data : null
    } catch (e) {
      // 404 by-email means no existing submission for this email.
      if (e?.response?.status === 404) return null
      return null
    }
  }, [user, token])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!user) {
        if (!cancelled) {
          setHasIndividualSubmission(false)
          setHasAirlineSubmission(false)
        }
        return
      }

      if (user.role === 'individual') {
        const existing = await findExistingSubmission('individual')
        if (!cancelled) {
          setHasIndividualSubmission(!!existing)
          setExistingIndividualRecord(existing || null)
        }

        if (existing) {
          const hydrated = hydrateIndividualFormFromExisting(existing)
          if (hydrated && !cancelled) setIndData((prev) => ({ ...prev, ...hydrated }))
        }
      } else if (user.role === 'airline') {
        const existing = await findExistingSubmission('airline')
        if (!cancelled) {
          setHasAirlineSubmission(!!existing)
          setExistingAirlineRecord(existing || null)
        }

        if (existing) {
          const hydrated = hydrateAirlineFormFromExisting(existing)
          if (hydrated && !cancelled) setAirData((prev) => ({ ...prev, ...hydrated }))
        }
      }
    }

    run()
    return () => { cancelled = true }
  }, [user, token, findExistingSubmission])

  useEffect(() => {
    if (regType === 'individual' && hasIndividualSubmission && indStep < 4) {
      setIndStep(4)
    }
    if (regType === 'airline' && hasAirlineSubmission && airStep < 4) {
      setAirStep(4)
    }
  }, [regType, hasIndividualSubmission, hasAirlineSubmission, indStep, airStep])

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goIndStep = (n) => { setTransitionMode('step'); setIndStep(n); scrollToTop() }
  const goAirStep = (n) => { setTransitionMode('step'); setAirStep(n); scrollToTop() }

  const requireAuth = () => {
    if (!user) { setShowAuthModal(true); return false }
    return true
  }

  const updateInd = (fields) => setIndData(prev => ({ ...prev, ...fields }))
  const updateAir = (fields) => setAirData(prev => ({ ...prev, ...fields }))

  const handleIndSubmit = async (opts = {}) => {
    if (await findExistingSubmission('individual')) {
      setHasIndividualSubmission(true)
      setIndError('You already submitted this form. Please edit your submitted form from Subscription dashboard.')
      return null
    }
    if (hasIndividualSubmission) {
      setIndError('You already submitted this form. Please edit your submitted form from Subscription dashboard.')
      return null
    }
    if (!user) { setShowAuthModal(true); return null }
    setIndSubmitting(true); setIndError('')
    try {
      const res = await register('individual', { ...indData, paymentStatus: opts.paymentStatus || 'pending' })
      const newId = res?.data?.data?._id
      if (user && newId) {
        try {
          if (!user.registrationId) await linkRegistration(newId, 'Individual')
          else await addSubscription(newId)
        } catch {
          void 0
        }
      }
      if (opts.returnId) return newId
      setIndSubmitted(true); return null
    } catch (e) {
      setIndError(e?.response?.data?.message || 'Submission failed. Please try again.')
      return null
    } finally { setIndSubmitting(false) }
  }

  const handleIndMarkPaid = async (regId) => {
    try {
      await axios.patch(`${BASE_URL}/individuals/${regId}/mark-paid`, {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('ifoa_token') || ''}` } })
    } catch {
      void 0
    }
    setIndSubmitted(true)
  }

  const handleAirSubmit = async (opts = {}) => {
    if (hasAirlineSubmission && !opts.returnId) {
      setAirError('You already submitted this form. Please edit your submitted form from Subscription dashboard.')
      return null
    }

    // In payment flows we need a registration ID. If this account already has one,
    // return it so downstream wire/card handlers can continue.
    if (hasAirlineSubmission && opts.returnId && user?.email) {
      try {
        const byEmail = await axios.get(`${BASE_URL}/airlines/by-email`, {
          params: { email: user.email },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const existing = byEmail?.data?.data || (Array.isArray(byEmail?.data?.all) ? byEmail.data.all[0] : null)
        if (existing?._id) {
          const hydrated = hydrateAirlineFormFromExisting(existing)
          if (hydrated) setAirData((prev) => ({ ...prev, ...hydrated }))
          try {
            if (!user.registrationId) await linkRegistration(existing._id, 'Airlines')
            else await addSubscription(existing._id)
          } catch {
            void 0
          }
          return existing._id
        }
      } catch {
        void 0
      }
    }

    if (!user) { setShowAuthModal(true); return }
    setAirSubmitting(true); setAirError('')
    try {
      const res = await register('airline', { ...airData, paymentStatus: opts.paymentStatus || 'pending' })
      const newId = res?.data?.data?._id
      if (user && newId) {
        try {
          if (!user.registrationId) await linkRegistration(newId, 'Airlines')
          else await addSubscription(newId)
        } catch {
          void 0
        }
      }
      if (opts.returnId) return newId
      setAirSubmitted(true)
      return null
    } catch (e) {
      // If server reports duplicate submission (409), reuse existing record ID.
      if (e?.response?.status === 409) {
        const existingId = e?.response?.data?.data?._id
        if (existingId) {
          try {
            if (!user.registrationId) await linkRegistration(existingId, 'Airlines')
            else await addSubscription(existingId)
          } catch {
            void 0
          }
          setHasAirlineSubmission(true)
          setAirError('You already submitted this form. Updating your existing submission.')
          if (opts.returnId) return existingId
          return null
        }
      }
      setAirError(e?.response?.data?.message || 'Submission failed. Please try again.')
      return null
    } finally { setAirSubmitting(false) }
  }

  const handleAirMarkPaid = async (id) => {
    try {
      const token = localStorage.getItem('ifoa_token') || ''
      await fetch(`${BASE_URL}/airlines/${id}/mark-paid`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      void 0
    }
    setAirSubmitted(true)
  }

  if (indSubmitted) return <SuccessPage name={indData.firstName} />
  if (airSubmitted) return <AirlinesSuccessPage airlineName={airData.airlineName} />

  const STEPS     = regType === 'individual' ? INDIVIDUAL_STEPS : AIRLINES_STEPS
  const step      = regType === 'individual' ? indStep : airStep
  const activeStep = STEPS[step - 1]
  const progress  = Math.round((step / STEPS.length) * 100)
  const showExistingSummaryOnly = hasExistingSubmissionForType
  const existingSummaryData = regType === 'individual'
    ? (existingIndividualRecord ? hydrateIndividualFormFromExisting(existingIndividualRecord) : indData)
    : (existingAirlineRecord ? hydrateAirlineFormFromExisting(existingAirlineRecord) : airData)

  const handleNextToStep2 = () => {
    if (regType === 'individual' ? isIndBlocked : isAirBlocked) return
    if (hasExistingSubmissionForType) return
    if (regType === 'individual') goIndStep(2); else goAirStep(2)
  }
  const handleNextToStep3 = () => { if (!requireAuth()) return; if (regType === 'individual') goIndStep(3); else goAirStep(3) }
  const handleNextToStep4 = () => { if (!requireAuth()) return; if (regType === 'individual') goIndStep(4); else goAirStep(4) }
  const handleBack = (n)  => { if (regType === 'individual') goIndStep(n); else goAirStep(n) }
  const isBlocked = regType === 'individual' ? isIndBlocked : isAirBlocked

  return (
    <>
      <AnimatePresence>
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </AnimatePresence>

      {/* ── Full-height two-column layout ─────────────────────────────────── */}
      {/* Outer wrapper: fixed viewport height, no overflow — ensures only the left
           column scrolls. The right sidebar never causes the page to scroll. */}
      <div
        className="flex"
        style={{
          height: '100vh',
          maxHeight: '100vh',
          overflow: 'hidden',
          background: '#f8fafc',
          position: 'fixed',
          inset: 0,
        }}
      >

        {/* ── LEFT: Scrollable form column ──────────────────────────────────── */}
        <div
          ref={scrollContainerRef}
          className="flex-1 flex flex-col"
          style={{ overflowY: 'auto', overflowX: 'hidden', height: '100vh' }}
        >

          {/* Top nav bar */}
          <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between"
            style={{ boxShadow: '0 1px 6px rgba(15,23,42,0.06)', backdropFilter: 'blur(10px)' }}>
            <Link to="/">
              <img src={logo} alt="IFOA USA" className="h-10 w-auto" />
            </Link>
            <div className="flex items-center gap-3">
              {user ? (
                <span className="text-sm font-semibold text-gray-700">
                  👋 {user.firstName || user.email}
                </span>
              ) : (
                <>
                  <Link to="/login"
                    className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                    Sign In
                  </Link>
                  <Link to="/signup"
                    className="text-sm font-bold px-4 py-2 rounded-xl text-white transition-all"
                    style={{ background: B }}
                    onMouseEnter={e => e.currentTarget.style.background = BD}
                    onMouseLeave={e => e.currentTarget.style.background = B}>
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Form content */}
          <div ref={formRef} className="flex-1 px-5 sm:px-8 lg:px-10 py-8 max-w-2xl mx-auto w-full">

            {/* Page heading */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-1.5" style={{ color: DARK }}>
                FAA Compliance — Register Now
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>
                IFOA USA's trusted U.S. Agent for Service.
              </p>
            </div>

            {/* Step indicator */}
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>
                Step {step}/{STEPS.length}
              </p>

              {/* Type toggle — Company / Individual */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => {
                    setTransitionMode('type')
                    setSwitchDirection(1)
                    setRegType('airline')
                    setAirStep(1)
                    scrollToTop()
                  }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all duration-200 text-left"
                  style={{
                    borderColor: regType === 'airline' ? B : '#e5e7eb',
                    background: regType === 'airline' ? BM : '#fff',
                  }}>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
                          style={{ color: regType === 'airline' ? B : '#9ca3af' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="font-black text-sm" style={{ color: regType === 'airline' ? B : '#374151' }}>Company</span>
                      </div>
                      <p className="text-[11px] mt-0.5 ml-6" style={{ color: '#9ca3af' }}>Aircraft and Carrier Registration Only</p>
                    </div>
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: regType === 'airline' ? B : '#d1d5db', background: regType === 'airline' ? B : 'transparent' }}>
                      {regType === 'airline' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setTransitionMode('type')
                    setSwitchDirection(-1)
                    setRegType('individual')
                    setIndStep(1)
                    scrollToTop()
                  }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all duration-200 text-left"
                  style={{
                    borderColor: regType === 'individual' ? B : '#e5e7eb',
                    background: regType === 'individual' ? BM : '#fff',
                  }}>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
                          style={{ color: regType === 'individual' ? B : '#9ca3af' }}>
                          <circle cx="12" cy="8" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                        </svg>
                        <span className="font-black text-sm" style={{ color: regType === 'individual' ? B : '#374151' }}>Individual</span>
                      </div>
                      <p className="text-[11px] mt-0.5 ml-6" style={{ color: '#9ca3af' }}>Pilots, dispatchers & certificate holders</p>
                    </div>
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: regType === 'individual' ? B : '#d1d5db', background: regType === 'individual' ? B : 'transparent' }}>
                      {regType === 'individual' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </button>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: '#e5e7eb' }}>
                <Motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  style={{ background: `linear-gradient(90deg, ${BD}, ${B})` }}
                />
              </div>
              <div className="flex justify-between">
                {STEPS.map((s, i) => (
                  <p key={s.label} className="text-[10px] font-bold"
                    style={{ color: i + 1 <= step ? B : '#cbd5e1' }}>
                    {s.label}
                  </p>
                ))}
              </div>
            </div>

            {/* Form card */}
            <Motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-3xl bg-white overflow-hidden mb-6"
              style={{ border: '1.5px solid #e5e7eb', boxShadow: '0 8px 40px -12px rgba(15,23,42,0.10)' }}>
              {(regType === 'individual' ? isIndBlocked : isAirBlocked) && <WrongRoleBanner type={regType} />}

              {/* Card header */}
              <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: '#f3f4f6' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: B }}>
                      {regType === 'individual' ? 'Individual' : 'Company / Airline'}
                    </p>
                    <h2 className="text-xl font-black" style={{ color: DARK }}>{activeStep.label}</h2>
                    <p className="text-sm mt-1 max-w-xs" style={{ color: '#6b7280' }}>{activeStep.detail}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xl font-black tabular-nums" style={{ color: B }}>{step}<span className="text-sm font-bold text-gray-400">/{STEPS.length}</span></span>
                  </div>
                </div>

                {!user && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: BM, border: `1px solid ${BXL}`, color: B }}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Sign in required to proceed past Step 2
                  </div>
                )}
              </div>

              {/* Form body */}
              <div className="px-6 py-6">
                {showExistingSummaryOnly ? (
                  <div className="space-y-4">
                    <ExistingFormBanner regType={regType} />
                    <ExistingOrderSummary regType={regType} data={existingSummaryData} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence mode="wait">
                      <Motion.div
                        key={`${regType}-${step}`}
                        initial={{
                          opacity: 0,
                          x: transitionMode === 'type' ? 28 * switchDirection : 0,
                          y: transitionMode === 'step' ? 8 : 0,
                        }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{
                          opacity: 0,
                          x: transitionMode === 'type' ? -28 * switchDirection : 0,
                          y: transitionMode === 'step' ? -8 : 0,
                        }}
                        transition={{ duration: transitionMode === 'type' ? 0.4 : 0.28, ease: [0.22, 1, 0.36, 1] }}>
                        {regType === 'individual' && (
                          <>
                            {indStep === 1 && <Step1PersonalInfo data={indData} update={updateInd} onNext={handleNextToStep2} />}
                            {indStep === 2 && <Step2Certificates data={indData} update={updateInd} onNext={handleNextToStep3} onBack={() => handleBack(1)} />}
                            {indStep === 3 && <Step3Preview data={indData} onNext={handleNextToStep4} onBack={() => handleBack(2)} />}
                            {indStep === 4 && (
                              <Step4Payment data={indData} update={updateInd} onBack={() => handleBack(3)}
                                onSubmit={handleIndSubmit} onMarkPaidAndFinish={handleIndMarkPaid}
                                submitting={indSubmitting} error={indError} isBlocked={isBlocked} />
                            )}
                          </>
                        )}
                        {regType === 'airline' && (
                          <>
                            {airStep === 1 && <AirlinesStep1PlanAndDetails data={airData} update={updateAir} onNext={handleNextToStep2} />}
                            {airStep === 2 && <AirlinesStep2Holders data={airData} update={updateAir} onNext={handleNextToStep3} onBack={() => handleBack(1)} />}
                            {airStep === 3 && <AirlinesStep3Preview data={airData} update={updateAir} onNext={handleNextToStep4} onBack={() => handleBack(2)} />}
                            {airStep === 4 && (
                              <AirlinesStep4Payment data={airData} update={updateAir} onBack={() => handleBack(3)}
                                onSubmit={handleAirSubmit} onMarkPaidAndFinish={handleAirMarkPaid}
                                submitting={airSubmitting} error={airError} isBlocked={isBlocked}
                                isExistingSubmission={hasAirlineSubmission} />
                            )}
                          </>
                        )}
                      </Motion.div>
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </Motion.div>

            {/* Bottom trust row */}
            <div className="flex flex-wrap gap-2 justify-center pb-6">
              {[
                { icon: <Lock className="w-3 h-3" />, text: 'Secure & Encrypted' },
                { icon: <ShieldCheck className="w-3 h-3" />, text: 'FAA Compliant' },
                { icon: <MapPin className="w-3 h-3" />, text: 'U.S. Based Office' },
                { icon: <Zap className="w-3 h-3" />, text: 'Fast Processing' },
              ].map(b => (
                <div key={b.text} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                  style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#6b7280' }}>
                  {b.icon}{b.text}
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── RIGHT: Fixed sidebar (desktop only) ──────────────────────────── */}
        <RightSidebar regType={regType} />

      </div>
    </>
  )
}
