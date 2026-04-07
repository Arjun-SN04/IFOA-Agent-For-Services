import { useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import Footer from '../components/layout/footer'
import Step1PersonalInfo from '../components/individual/Step1PersonalInfo'
import Step2Certificates from '../components/individual/Step2Certificates'
import Step3Preview from '../components/individual/Step3Preview'
import Step4Payment from '../components/individual/Step4Payment'
import SuccessPage from '../components/individual/SuccessPage'
import { createIndividual } from '../services/api'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const C = {
  blue:      '#0000ff',
  blueDark:  '#0000e6',
  blueMuted: '#eff6ff',
  blueLight: '#dbeafe',
  dark:      '#0f172a',
  white:     '#ffffff',
  gray50:    '#f8fafc',
  gray100:   '#f1f5f9',
  gray200:   '#e2e8f0',
  gray400:   '#94a3b8',
  gray500:   '#64748b',
  gray600:   '#475569',
  gray700:   '#334155',
}

const STEPS = [
  { label: 'Personal Info',  detail: 'Choose your plan and enter your contact details.' },
  { label: 'Certificates',   detail: 'Add your FAA certificate information.' },
  { label: 'Review',         detail: 'Confirm everything before payment.' },
  { label: 'Payment',        detail: 'Submit your registration and receive your invoice.' },
]

const SERVICE_CONTACT = [
  { label: 'Company',  value: 'IFOA USA Corp' },
  { label: 'Address',  value: '1616 Concierge Blvd Suite 100, Daytona Beach, FL 32117, USA' },
  { label: 'Email',    value: 'agent@theifoa.com',  href: 'mailto:agent@theifoa.com' },
  { label: 'Phone',    value: '+1 508 838 5880',    href: 'tel:+15088385880' },
]

const INIT = {
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

// ── WrongRoleBanner ───────────────────────────────────────────────────────────
function WrongRoleBanner() {
  return (
    <div className="rounded-t-3xl border-b px-7 py-5" style={{ background: C.blueMuted, borderColor: C.blueLight }}>
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: C.blueLight }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: C.blue }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black mb-1" style={{ color: C.dark }}>Airlines Account Detected — Form Submission Disabled</p>
          <p className="text-xs leading-relaxed" style={{ color: C.gray600 }}>
            You are signed in with an <strong>Airlines account</strong>. This form requires an <strong>Individual account</strong>.
          </p>
        </div>
        <div className="flex-shrink-0 flex gap-2 flex-wrap justify-end">
          <Link to="/signup" className="inline-flex items-center gap-1.5 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all whitespace-nowrap" style={{ background: C.blue }}>
            Create Individual Account
          </Link>
          <Link to="/airlines/register" className="inline-flex items-center gap-1.5 font-semibold px-4 py-2 rounded-lg text-xs hover:bg-white transition-all whitespace-nowrap" style={{ border: `1px solid ${C.blueLight}`, color: C.blue }}>
            ✈ Airlines Form
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── AuthModal ─────────────────────────────────────────────────────────────────
function AuthModal({ onClose }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="relative w-full max-w-sm rounded-3xl overflow-hidden bg-white shadow-2xl"
        style={{ border: `1px solid ${C.gray200}` }} onClick={e => e.stopPropagation()}>
        {/* Top accent */}
        <div className="h-1 w-full" style={{ background: C.blue }} />
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100" style={{ color: C.gray400 }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="px-8 py-8 text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: C.blueMuted }}>
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: C.blue }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-black mb-2" style={{ color: C.dark }}>Account Required</h3>
          <p className="text-sm leading-relaxed mb-2" style={{ color: C.gray500 }}>
            Sign in or create a free account to continue to the next step.
          </p>
          <p className="text-xs mb-7" style={{ color: C.gray400 }}>Your form data is saved — you won't lose any progress.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/signup', { state: { from: location } })}
              className="w-full inline-flex items-center justify-center gap-2 text-white font-bold px-6 py-3.5 rounded-xl text-sm transition-all"
              style={{ background: C.blue }}
              onMouseEnter={e => e.currentTarget.style.background = C.blueDark}
              onMouseLeave={e => e.currentTarget.style.background = C.blue}>
              Create Free Account
            </button>
            <button onClick={() => navigate('/login', { state: { from: location } })}
              className="w-full inline-flex items-center justify-center gap-2 font-bold px-6 py-3.5 rounded-xl text-sm transition-all"
              style={{ border: `1px solid ${C.gray200}`, color: C.dark }}
              onMouseEnter={e => e.currentTarget.style.background = C.gray50}
              onMouseLeave={e => e.currentTarget.style.background = C.white}>
              Sign In to Existing Account
            </button>
          </div>
          <p className="text-xs mt-5" style={{ color: C.gray400 }}>Free to register · No credit card required</p>
        </div>
      </motion.div>
    </div>
  )
}

// ── ActiveSubGuard ───────────────────────────────────────────────────────────
function ActiveSubGuard() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: C.gray50 }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden" style={{ border: `1px solid ${C.gray200}`, background: C.white, boxShadow: '0 20px 60px rgba(15,23,42,0.08)' }}>
        <div className="h-1 w-full" style={{ background: C.blue }} />
        <div className="px-8 py-10 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: C.blueMuted, border: `1px solid ${C.blueLight}` }}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: C.blue }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h3 className="text-xl font-black mb-2" style={{ color: C.dark }}>Active Subscription Found</h3>
          <p className="text-sm leading-relaxed mb-7" style={{ color: C.gray500 }}>
            You already have an active Individual subscription. You cannot register again with the same account.
          </p>
          <Link to="/dashboard/subscription"
            className="w-full inline-flex items-center justify-center gap-2 text-white font-bold px-6 py-3.5 rounded-xl text-sm transition-all"
            style={{ background: C.blue }}
            onMouseEnter={e => e.currentTarget.style.background = C.blueDark}
            onMouseLeave={e => e.currentTarget.style.background = C.blue}>
            View My Subscription
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function IndividualForm() {
  const { user, linkRegistration, addSubscription } = useAuth()
  const isBlocked = user?.role === 'airline'

  // Block if user already has an active (paid) individual subscription
  const hasActiveSub = user?.role === 'individual' &&
    (user?.paymentStatus === 'paid' || user?.status === 'Active' || user?.isPaid === true)
  if (hasActiveSub) return <><Navbar /><ActiveSubGuard /></>
  const [step, setStep]           = useState(1)
  const [formData, setFormData]   = useState(INIT)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const formRef = useRef(null)

  const update = (fields) => setFormData((prev) => ({ ...prev, ...fields }))

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const goToStep = (n) => {
    setStep(n)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const requireAuth = () => {
    if (isBlocked) return false
    if (!user) { setShowAuthModal(true); return false }
    return true
  }

  const handleSubmit = async (opts = {}) => {
    if (!user) { setShowAuthModal(true); return null }
    setSubmitting(true); setError('')
    try {
      const res   = await createIndividual({ ...formData, paymentStatus: opts.paymentStatus || 'pending' })
      const newId = res?.data?.data?._id
      if (user && newId) {
        try {
          if (!user.registrationId) await linkRegistration(newId, 'Individual')
          else await addSubscription(newId)
        } catch (_) {}
      }
      if (opts.returnId) return newId
      setSubmitted(true); return null
    } catch (e) {
      setError(e?.response?.data?.message || 'Submission failed. Please try again.')
      return null
    } finally { setSubmitting(false) }
  }

  const handleMarkPaidAndFinish = async (registrationId) => {
    try {
      await axios.patch(`${BASE_URL}/individuals/${registrationId}/mark-paid`, {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('ifoa_token') || ''}` } })
    } catch (_) {}
    setSubmitted(true)
  }

  if (submitted) return <><Navbar /><SuccessPage name={formData.firstName} /></>

  const handleNextToStep2 = () => { if (isBlocked) return; goToStep(2) }
  const handleNextToStep3 = () => { if (!requireAuth()) return; goToStep(3) }
  const handleNextToStep4 = () => { if (!requireAuth()) return; goToStep(4) }

  const activeStep = STEPS[step - 1]
  const progress   = Math.round((step / STEPS.length) * 100)

  return (
    <>
      <Navbar />
      <AnimatePresence>
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          HERO — clean, minimal, light background
      ═══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.gray50, borderBottom: `1px solid ${C.gray200}` }}>
        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.blue }}>U.S. Agent for Service</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight" style={{ color: C.dark }}>Individual Registration</h1>
            <p className="text-base mb-6 leading-relaxed" style={{ color: C.gray600 }}>
              Complete our secure 4-step registration to designate IFOA USA as your official FAA U.S. Agent for Service. Takes less than 5 minutes.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              {[{ icon: '🔒', text: 'Secure & Encrypted' }, { icon: '✅', text: 'FAA Compliant' }, { icon: '🇺🇸', text: 'U.S. Based Office' }, { icon: '⚡', text: 'Fast Processing' }].map(b => (
                <div key={b.text} className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold" style={{ border: `1px solid ${C.gray200}`, background: C.white, color: C.gray600 }}>
                  <span>{b.icon}</span>{b.text}
                </div>
              ))}
            </div>
            <button onClick={scrollToForm} className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all"
              style={{ background: C.blue }}
              onMouseEnter={e => e.currentTarget.style.background = C.blueDark}
              onMouseLeave={e => e.currentTarget.style.background = C.blue}>
              Start Registration
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7M12 5v14" /></svg>
            </button>
          </motion.div>

          {/* Agent contact card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }}>
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.gray200}`, background: C.white, boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
              <div className="px-6 py-4" style={{ background: C.blue }}>
                <p className="text-white font-black text-sm">Official IFOA USA Agent Details</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>Use these on the FAA USAS portal</p>
              </div>
              <div className="divide-y" style={{ borderColor: C.gray100 }}>
                {SERVICE_CONTACT.map(row => (
                  <div key={row.label} className="flex items-center px-6 py-4 gap-4">
                    <span className="w-18 shrink-0 text-xs font-bold uppercase tracking-widest" style={{ color: C.gray400, minWidth: 72 }}>{row.label}</span>
                    {row.href
                      ? <a href={row.href} className="text-sm font-semibold hover:underline" style={{ color: C.blue }}>{row.value}</a>
                      : <span className="text-sm font-medium" style={{ color: C.dark }}>{row.value}</span>}
                  </div>
                ))}
              </div>
              <div className="px-6 py-4" style={{ background: C.gray50, borderTop: `1px solid ${C.gray100}` }}>
                <div className="flex gap-3">
                  <a href="https://iacra.faa.gov/IACRA/Default.aspx" target="_blank" rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all"
                    style={{ border: `1px solid ${C.blueLight}`, color: C.blue, background: C.blueMuted }}>
                    FAA IACRA →
                  </a>
                  <a href="https://usas.faa.gov/signin" target="_blank" rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all"
                    style={{ border: `1px solid ${C.blueLight}`, color: C.blue, background: C.blueMuted }}>
                    FAA USAS →
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          DEADLINE BANNER
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ background: C.blueMuted, borderBottom: `1px solid ${C.blueLight}` }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest whitespace-nowrap" style={{ color: C.blue }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            Key FAA Deadlines
          </span>
          <div className="w-px h-5 hidden sm:block" style={{ background: C.blueLight }} />
          <p className="text-sm leading-relaxed" style={{ color: C.dark }}>
            <strong>02 Apr 2025</strong> — New applicants with non-U.S. addresses must appoint a U.S. Agent. &nbsp;
            <strong>07 Jul 2025</strong> — Existing certificate holders must designate an Agent to maintain FAA certification.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          VIDEO + INSTRUCTIONS
      ═══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.white, borderBottom: `1px solid ${C.gray100}` }}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.blue }}>Get Started — Step by Step</p>
            <h2 className="text-3xl font-black" style={{ color: C.dark }}>Before You Register</h2>
            <p className="text-sm mt-2 max-w-lg mx-auto leading-relaxed" style={{ color: C.gray500 }}>
              Watch our short video and register on the two FAA portals first, then complete the form below.
            </p>
          </motion.div>
          <div className="grid lg:grid-cols-2 gap-10 items-start mb-12">
            {/* Video */}
            <motion.div initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="rounded-2xl overflow-hidden aspect-video" style={{ border: `1px solid ${C.gray200}`, boxShadow: '0 4px 20px rgba(15,23,42,0.08)' }}>
              <iframe className="w-full h-full" src="https://www.youtube.com/embed/cfjy4wI7ZY4?rel=0&modestbranding=1" title="IFOA USA Agent for Service Registration" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </motion.div>
            {/* FAA portals */}
            <motion.div initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} className="space-y-4">
              <div className="rounded-2xl p-6" style={{ border: `1px solid ${C.gray200}`, background: C.white }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg text-white text-sm font-black flex items-center justify-center" style={{ background: C.dark }}>1</div>
                  <h3 className="font-black text-base" style={{ color: C.dark }}>Register on FAA IACRA</h3>
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: C.gray600 }}>Retrieve your FTN Number on the FAA IACRA website as a NEW or EXISTING certificate holder.</p>
                <a href="https://iacra.faa.gov/IACRA/Default.aspx" target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors" style={{ color: C.blue }}>
                  Access FAA IACRA Portal →
                </a>
              </div>
              <div className="rounded-2xl p-6" style={{ border: `1px solid ${C.gray200}`, background: C.white }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg text-white text-sm font-black flex items-center justify-center" style={{ background: C.dark }}>2</div>
                  <h3 className="font-black text-base" style={{ color: C.dark }}>Register on FAA USAS</h3>
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: C.gray600 }}>Designate IFOA USA as your official U.S. Agent for Service on the FAA USAS portal (available since April 2, 2025).</p>
                <a href="https://usas.faa.gov/signin" target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors" style={{ color: C.blue }}>
                  Access FAA USAS Portal →
                </a>
              </div>
              <div className="rounded-2xl p-6" style={{ border: `1px solid ${C.gray200}`, background: C.white }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg text-white text-sm font-black flex items-center justify-center" style={{ background: C.blue }}>3</div>
                  <h3 className="font-black text-base" style={{ color: C.dark }}>Complete This Form</h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: C.gray600 }}>Fill in the guided 4-step registration below, review your details, and submit for invoicing.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          REGISTRATION FORM
      ═══════════════════════════════════════════════════════════ */}
      <section ref={formRef} id="registration-form" style={{ background: C.gray50, borderTop: `1px solid ${C.gray100}` }}>
        <div className="max-w-3xl mx-auto px-6 py-16">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.blue }}>Secure Registration</p>
            <h2 className="text-3xl font-black mb-3" style={{ color: C.dark }}>Complete Your Registration</h2>
            <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: C.gray500 }}>A guided 4-step form — takes less than 5 minutes. Your data is encrypted and handled securely.</p>
            {!user && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold" style={{ background: C.blueMuted, border: `1px solid ${C.blueLight}`, color: C.blue }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Sign in or create an account to proceed past Step 2
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl overflow-hidden"
            style={{ border: `1px solid ${C.gray200}`, background: C.white, boxShadow: '0 20px 60px rgba(15,23,42,0.08)' }}>

            {isBlocked && <WrongRoleBanner />}

            {/* ── Form header ── */}
            <div style={{ background: C.white, borderBottom: `1px solid ${C.gray100}` }} className="px-7 py-7">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-1.5" style={{ color: C.blue }}>Registration Form</p>
                  <h3 className="text-2xl font-black tracking-tight" style={{ color: C.dark }}>{activeStep.label}</h3>
                  <p className="mt-1 text-sm leading-relaxed max-w-xs" style={{ color: C.gray500 }}>{activeStep.detail}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-2xl font-black tabular-nums" style={{ color: C.dark }}>{progress}%</span>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: C.gray400 }}>Complete</p>
                </div>
              </div>

              {/* Step tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-0.5">
                {STEPS.map((item, i) => {
                  const num     = i + 1
                  const current = num === step
                  const done    = num < step
                  const locked  = num > 2 && !user
                  return (
                    <div key={item.label}
                      className="min-w-[7rem] flex-1 rounded-2xl px-4 py-3 border transition-all duration-200 relative"
                      style={{
                        background: current ? C.blue : done ? C.blueMuted : C.gray50,
                        borderColor: current ? C.blue : done ? C.blueLight : C.gray200,
                        color: current ? C.white : done ? C.blue : locked ? C.gray400 : C.gray500,
                      }}>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Step {num}</p>
                      <p className="mt-0.5 text-sm font-bold truncate">{item.label}</p>
                      {locked && (
                        <span className="absolute top-2 right-2">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: C.gray400 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.gray100 }}>
                <motion.div className="h-full rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} style={{ background: C.blue }} />
              </div>
            </div>

            {/* ── Form body ── */}
            <div className="px-7 py-8">
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
                  {step === 1 && <Step1PersonalInfo data={formData} update={update} onNext={handleNextToStep2} />}
                  {step === 2 && <Step2Certificates data={formData} update={update} onNext={handleNextToStep3} onBack={() => goToStep(1)} />}
                  {step === 3 && <Step3Preview data={formData} onNext={handleNextToStep4} onBack={() => goToStep(2)} />}
                  {step === 4 && (
                    <Step4Payment data={formData} update={update} onBack={() => goToStep(3)}
                      onSubmit={handleSubmit} onMarkPaidAndFinish={handleMarkPaidAndFinish}
                      submitting={submitting} error={error} isBlocked={isBlocked} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Airlines CTA below form */}
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.2 }} className="mt-6 rounded-2xl p-5 flex items-center justify-between gap-4"
            style={{ border: `1px solid ${C.gray200}`, background: C.white }}>
            <div>
              <p className="text-sm font-bold" style={{ color: C.dark }}>Managing 3+ Certificate Holders?</p>
              <p className="text-xs mt-0.5" style={{ color: C.gray400 }}>Volume pricing and dedicated support for operators.</p>
            </div>
            <Link to="/airlines/register" className="flex-shrink-0 inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition-all text-white whitespace-nowrap"
              style={{ background: C.dark }}
              onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
              onMouseLeave={e => e.currentTarget.style.background = C.dark}>
              ✈ Airlines Plan
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </>
  )
}
