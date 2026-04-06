import { useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import axios from 'axios'

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
import dgrCrewImg from '../assets/DGR-Crew.jpg'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const B   = '#1d4ed8'
const BD  = '#1e40af'
const BL  = '#3b82f6'
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

// ── Sidebar testimonials & trust content ─────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: 'IFOA USA made compliance with the Agent for Service requirement effortless. Fast, reliable & professional.',
    name: 'Bogdan Skutkiewicz',
    role: 'CEO & Jet Pilot',
    img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop&crop=face',
    stars: 5,
  },
  {
    quote: 'With IFOA USA handling my FAA correspondence, I have complete peace of mind. Highly recommended!',
    name: 'Lukas Wickart',
    role: 'CFO & Commercial Pilot',
    img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
    stars: 5,
  },
  {
    quote: 'The 24-hour activation and document scanning make this the best compliance solution for international pilots.',
    name: 'Sarah Mitchell',
    role: 'ATP & Flight Instructor',
    img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face',
    stars: 5,
  },
]

const TRUST_ITEMS = [
  { icon: '✅', label: '100% Compliance Guarantee', sub: '— or your money back' },
  { icon: '✅', label: 'Risk-Free Registration', sub: '— cancel anytime within 30 days' },
  { icon: '✅', label: 'Fully Compliant', sub: 'with FAA Regulations' },
]

const MEMBER_LOGOS = [
  { name: 'NBAA', abbr: 'NBAA' },
  { name: 'EBAA', abbr: 'EBAA' },
  { name: 'ACAMS', abbr: 'ACAMS' },
]

// ── Stars ─────────────────────────────────────────────────────────────────────
function Stars({ count = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-4 h-4" viewBox="0 0 20 20" fill="#f59e0b">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

// ── Right Sidebar (Fixed) ─────────────────────────────────────────────────────
function RightSidebar() {
  return (
    <div
      className="hidden lg:flex flex-col"
      style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 55%, #1d4ed8 100%)',
        padding: '2.5rem 2rem',
        minWidth: 380,
        maxWidth: 440,
        scrollbarWidth: 'none',
      }}
    >
      <style>{`.sidebar-scroll::-webkit-scrollbar{display:none}`}</style>

      {/* Top tagline */}
      <div className="mb-8">
        <p className="text-2xl font-black text-white leading-snug">
          Trusted by thousands of aviation professionals worldwide.
        </p>
      </div>

      {/* Testimonials */}
      <div className="flex flex-col gap-6 mb-8">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.name}
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <p className="text-sm italic leading-relaxed text-blue-100 mb-4">
              "{t.quote}"
            </p>
            <div className="flex items-center gap-3">
              <img
                src={t.img}
                alt={t.name}
                className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                style={{ border: '2px solid rgba(255,255,255,0.25)' }}
                onError={e => { e.target.style.display = 'none' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">{t.name}</p>
                <p className="text-xs text-blue-300 truncate">{t.role}</p>
              </div>
              <Stars count={t.stars} />
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-white/10 mb-6" />

      {/* Trust items */}
      <div className="flex flex-col gap-3 mb-8">
        {TRUST_ITEMS.map((item) => (
          <div key={item.label} className="flex items-start gap-3">
            <span className="text-green-400 text-base mt-0.5 flex-shrink-0">{item.icon}</span>
            <p className="text-sm text-blue-100 leading-snug">
              <span className="font-black text-white">{item.label}</span>
              {item.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-white/10 mb-6" />

      {/* Member of */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-4">Member of</p>
        <div className="flex flex-wrap gap-3">
          {MEMBER_LOGOS.map((m) => (
            <div
              key={m.name}
              className="px-4 py-2 rounded-xl text-xs font-black text-white"
              style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              {m.abbr}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom stats */}
      <div className="mt-auto pt-8 grid grid-cols-3 gap-3">
        {[
          { val: '5,000+', label: 'Pilots Served' },
          { val: '14 CFR', label: 'Part 3 Compliant' },
          { val: '24hr', label: 'Activation' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-3 text-center"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <p className="text-base font-black text-white">{s.val}</p>
            <p className="text-[10px] text-blue-300 mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Auth Modal ────────────────────────────────────────────────────────────────
function AuthModal({ onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
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
      </motion.div>
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { user, linkRegistration, addSubscription } = useAuth()
  const location = useLocation()

  const [regType, setRegType] = useState('individual')

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
  const formRef = useRef(null)

  const isIndBlocked = user?.role === 'airline'
  const isAirBlocked = user?.role === 'individual'

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const goIndStep = (n) => { setIndStep(n); scrollToTop() }
  const goAirStep = (n) => { setAirStep(n); scrollToTop() }

  const requireAuth = () => {
    if (!user) { setShowAuthModal(true); return false }
    return true
  }

  const updateInd = (fields) => setIndData(prev => ({ ...prev, ...fields }))
  const updateAir = (fields) => setAirData(prev => ({ ...prev, ...fields }))

  const handleIndSubmit = async (opts = {}) => {
    if (!user) { setShowAuthModal(true); return null }
    setIndSubmitting(true); setIndError('')
    try {
      const res = await register('individual', { ...indData, paymentStatus: opts.paymentStatus || 'pending' })
      const newId = res?.data?.data?._id
      if (user && newId) {
        try {
          if (!user.registrationId) await linkRegistration(newId, 'Individual')
          else await addSubscription(newId)
        } catch (_) {}
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
    } catch (_) {}
    setIndSubmitted(true)
  }

  const handleAirSubmit = async (opts = {}) => {
    if (!user) { setShowAuthModal(true); return }
    setAirSubmitting(true); setAirError('')
    try {
      const res = await register('airline', { ...airData, paymentStatus: opts.paymentStatus || 'pending' })
      const newId = res?.data?.data?._id
      if (user && newId) {
        try {
          if (!user.registrationId) await linkRegistration(newId, 'Airlines')
          else await addSubscription(newId)
        } catch (_) {}
      }
      if (opts.returnId) return newId
      setAirSubmitted(true)
    } catch (e) {
      setAirError(e?.response?.data?.message || 'Submission failed. Please try again.')
    } finally { setAirSubmitting(false) }
  }

  const handleAirMarkPaid = async (id) => {
    try {
      const token = localStorage.getItem('ifoa_token') || ''
      await fetch(`${BASE_URL}/airlines/${id}/mark-paid`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      })
    } catch (_) {}
    setAirSubmitted(true)
  }

  if (indSubmitted) return <SuccessPage name={indData.firstName} />
  if (airSubmitted) return <AirlinesSuccessPage airlineName={airData.airlineName} />

  const STEPS     = regType === 'individual' ? INDIVIDUAL_STEPS : AIRLINES_STEPS
  const step      = regType === 'individual' ? indStep : airStep
  const activeStep = STEPS[step - 1]
  const progress  = Math.round((step / STEPS.length) * 100)

  const handleNextToStep2 = () => { if (regType === 'individual' ? isIndBlocked : isAirBlocked) return; if (regType === 'individual') goIndStep(2); else goAirStep(2) }
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
      <div className="flex min-h-screen" style={{ background: '#f8fafc' }}>

        {/* ── LEFT: Scrollable form column ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-y-auto">

          {/* Top nav bar */}
          <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between"
            style={{ boxShadow: '0 1px 6px rgba(15,23,42,0.06)' }}>
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
          <div ref={formRef} className="flex-1 px-6 sm:px-10 lg:px-14 py-10 max-w-2xl mx-auto w-full">

            {/* Page heading */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2" style={{ color: DARK }}>
                FAA Compliance Made Easy —<br />Sign Up for Your Account
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>
                Effortlessly meet FAA regulations with IFOA USA's trusted U.S. Agent for Service product.
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
                  onClick={() => { setRegType('airline'); setAirStep(1) }}
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
                  onClick={() => { setRegType('individual'); setIndStep(1) }}
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
                <motion.div
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
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-3xl bg-white overflow-hidden mb-6"
              style={{ border: '1.5px solid #e5e7eb', boxShadow: '0 8px 40px -12px rgba(15,23,42,0.10)' }}>
              {isBlocked && <WrongRoleBanner type={regType} />}

              {/* Card header */}
              <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: '#f3f4f6' }}>
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
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${regType}-${step}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}>
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
                            submitting={airSubmitting} error={airError} isBlocked={isBlocked} />
                        )}
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Bottom trust row */}
            <div className="flex flex-wrap gap-2 justify-center pb-6">
              {[
                { icon: '🔒', text: 'Secure & Encrypted' },
                { icon: '✅', text: 'FAA Compliant' },
                { icon: '🇺🇸', text: 'U.S. Based Office' },
                { icon: '⚡', text: 'Fast Processing' },
              ].map(b => (
                <div key={b.text} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                  style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#6b7280' }}>
                  <span>{b.icon}</span>{b.text}
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── RIGHT: Fixed sidebar (desktop only) ──────────────────────────── */}
        <RightSidebar />
      </div>
    </>
  )
}
