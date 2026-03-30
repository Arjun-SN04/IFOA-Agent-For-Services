import { useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import cockpitImg from '../assets/cokpit.png'
import Step1PersonalInfo from '../components/individual/Step1PersonalInfo'
import Step2Certificates from '../components/individual/Step2Certificates'
import Step3Preview from '../components/individual/Step3Preview'
import Step4Payment from '../components/individual/Step4Payment'
import SuccessPage from '../components/individual/SuccessPage'
import { createIndividual } from '../services/api'
import { useAuth } from '../context/AuthContext'

const STEPS = [
  { label: 'Personal Info', detail: 'Choose your plan and enter your contact details.' },
  { label: 'Certificates', detail: 'Add your FAA certificate information.' },
  { label: 'Review', detail: 'Confirm everything before payment.' },
  { label: 'Payment', detail: 'Submit your registration and receive your invoice.' },
]

const GUIDE_STEPS = [
  {
    index: '01',
    title: 'Register on FAA Portals',
    body: 'Retrieve your FTN Number on FAA IACRA, then register IFOA as your official U.S. Agent on FAA USAS.',
    links: [
      { label: 'FAA IACRA', href: 'https://iacra.faa.gov/IACRA/Default.aspx' },
      { label: 'FAA USAS', href: 'https://usas.faa.gov/signin' },
    ],
  },
  {
    index: '02',
    title: 'Get Agent Details',
    body: "Use IFOA USA Corp's official address, email, and phone number during your FAA portal setup.",
  },
  {
    index: '03',
    title: 'Complete This Form',
    body: 'Fill in the guided 4-step registration below, review your details, and submit for invoicing.',
  },
]

const SERVICE_CONTACT = [
  { label: 'Company', value: 'IFOA USA Corp' },
  { label: 'Address', value: '1616 Concierge Blvd Suite 100, Daytona Beach, FL 32117, USA' },
  { label: 'Email', value: 'agent@theifoa.com', href: 'mailto:agent@theifoa.com' },
  { label: 'Phone', value: '+1 508 838 5880', href: 'tel:+15088385880' },
]

const WHY_CARDS = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'FAA Certified & Trusted',
    body: 'IFOA USA is an officially recognized U.S. Agent for Service, ensuring your full regulatory compliance.',
    srcs: [
      'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=600&q=80&auto=format&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=600&q=80&auto=format&fit=crop',
    ],
    gradient: 'from-red-900 via-red-800 to-red-700',
    emoji: '✈️',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
      </svg>
    ),
    title: 'U.S. Based Office',
    body: 'Physical Daytona Beach address ensures all FAA mail is received, scanned, and forwarded in real-time.',
    srcs: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=80&auto=format&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1464082354059-27db6ce50048?w=600&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80&auto=format&fit=crop',
    ],
    gradient: 'from-slate-800 via-slate-700 to-slate-600',
    emoji: '🏢',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Fast, Guided Process',
    body: 'Complete your registration in minutes — our 4-step form is designed to be clear, fast, and error-free.',
    srcs: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80&auto=format&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1436491865332-7a61a109db56?w=600&q=80&auto=format&fit=crop',
    ],
    gradient: 'from-gray-900 via-gray-800 to-gray-700',
    emoji: '⚡',
  },
]

function CardImage({ srcs, gradient, emoji, alt, className }) {
  const [idx, setIdx] = useState(0)
  const failed = idx >= srcs.length
  if (failed) {
    return (
      <div className={`bg-gradient-to-br ${gradient} flex items-center justify-center ${className}`}>
        <span className="text-5xl opacity-60 select-none">{emoji}</span>
      </div>
    )
  }
  return (
    <img
      src={srcs[idx]}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => setIdx((i) => i + 1)}
    />
  )
}

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

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.55, ease: 'easeOut' } }),
}

// ── Wrong-role banner: shown at the top of the form when an airline user visits the individual form ──
function WrongRoleBanner() {
  return (
    <div className="rounded-t-3xl border-b border-amber-200 bg-amber-50 px-7 py-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-amber-100 border border-amber-200 mt-0.5">
          <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-amber-900 mb-1">Airlines Account Detected — Form Submission Disabled</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            You are signed in with an <strong>Airlines account</strong>. This form requires an{' '}
            <strong>Individual account</strong> to submit. You can browse and fill in the form freely,
            but the final submit button will be disabled.
          </p>
        </div>
        <div className="flex-shrink-0 flex gap-2 flex-wrap justify-end">
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all whitespace-nowrap"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
            Create Individual Account
          </Link>
          <Link
            to="/airlines/register"
            className="inline-flex items-center gap-1.5 border border-amber-300 text-amber-800 font-semibold px-4 py-2 rounded-lg text-xs hover:bg-amber-100 transition-all whitespace-nowrap"
          >
            ✈ Go to Airlines Form
          </Link>
        </div>
      </div>
    </div>
  )
}

function AuthModal({ onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #1a0a0a 0%, #111 40%, #0d0d0d 100%)',
          border: '1px solid rgba(220,38,38,0.25)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset',
        }}
      >
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #7f1d1d, #dc2626, #ef4444, #dc2626, #7f1d1d)' }} />
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="px-8 py-8 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)' }}>
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-2xl font-black text-white mb-2">Account Required</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-2">
            You need to sign in or create a free account to continue to the next step.
          </p>
          <p className="text-gray-600 text-xs mb-8">Your form data is saved — you won't lose any progress.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/signup', { state: { from: location } })}
              className="w-full inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3.5 rounded-xl text-sm transition-all"
              style={{ boxShadow: '0 4px 24px rgba(220,38,38,0.35)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              Create Free Account
            </button>
            <button
              onClick={() => navigate('/login', { state: { from: location } })}
              className="w-full inline-flex items-center justify-center gap-2 text-white font-bold px-6 py-3.5 rounded-xl text-sm hover:bg-white/[0.07] transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
              Sign In to Existing Account
            </button>
          </div>
          <p className="text-gray-700 text-xs mt-5">Free to register · No credit card required</p>
        </div>
      </motion.div>
    </div>
  )
}

export default function IndividualForm() {
  const { user, linkRegistration } = useAuth()
  // Block airline users from filling the individual form
  const isBlocked = user?.role === 'airline'
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState(INIT)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const formRef = useRef(null)

  const update = (fields) => setFormData((prev) => ({ ...prev, ...fields }))

  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const goToStep = (n) => {
    setStep(n)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  // Require auth before advancing beyond step 2
  const requireAuth = () => {
    if (isBlocked) return false
    if (!user) { setShowAuthModal(true); return false }
    return true
  }

  const handleSubmit = async () => {
    if (!user) { setShowAuthModal(true); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await createIndividual({ ...formData, paymentStatus: 'pending' })
      if (user && res?.data?.data?._id) {
        try {
          await linkRegistration(res.data.data._id, 'Individual')
        } catch (_) {
          // Non-fatal
        }
      }
      setSubmitted(true)
    } catch (e) {
      setError(e?.response?.data?.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) return <><Navbar /><SuccessPage name={formData.firstName} /></>

  // Step 1 → 2 is free; auth required from step 2 → 3 onwards
  const handleNextToStep2 = () => { if (isBlocked) return; goToStep(2) }
  const handleNextToStep3 = () => { if (!requireAuth()) return; goToStep(3) }
  const handleNextToStep4 = () => { if (!requireAuth()) return; goToStep(4) }

  const activeStep = STEPS[step - 1]
  const progress = Math.round((step / STEPS.length) * 100)

  return (
    <>
      <Navbar />
      <AnimatePresence>
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </AnimatePresence>

      {/* ═══ HERO ═══ */}
      <section data-hero className="relative h-[75vh] min-h-[480px] flex items-center justify-center overflow-hidden">
        <img
          src={cockpitImg}
          alt="Aviation cockpit"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={0}
            className="text-white/70 text-xs font-bold uppercase tracking-[0.3em] mb-4">
            U.S. AGENT FOR SERVICE
          </motion.p>
          <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}
            className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-5">
            Registration Form
          </motion.h1>
          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="text-white/80 text-base sm:text-lg">
            You focus on flying and flight planning, let us handle the rest!
          </motion.p>
        </div>
      </section>

      {/* ═══ DEADLINE BANNER ═══ */}
      <div className="bg-gradient-to-r from-black to-red-950 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest whitespace-nowrap text-red-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            Key FAA Deadlines
          </span>
          <div className="w-px h-5 bg-white/20 hidden sm:block" />
          <p className="text-sm leading-relaxed text-red-100">
            <strong className="text-white">02 Apr 2025</strong> — New applicants with non-U.S. addresses must appoint a U.S. Agent. &nbsp;
            <strong className="text-white">07 Jul 2025</strong> — Existing certificate holders must designate an Agent to maintain FAA certification.
          </p>
        </div>
      </div>

      {/* ═══ VIDEO + FAA PORTALS SECTION ═══ */}
      <section className="bg-gray-50 py-16 px-6 border-b border-gray-100">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-12">
            <p className="text-red-600 text-xs font-black uppercase tracking-widest mb-2">Get Started — Step by Step</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              We Stand Out as Your Agent for Service
            </h2>
            <p className="text-gray-500 text-sm mt-3 max-w-xl mx-auto leading-relaxed">
              Whether you are a <strong className="text-gray-700">Part 61 Pilot, Flight or Ground Instructor</strong> or a{' '}
              <strong className="text-gray-700">Part 65 Aircraft Dispatcher</strong> living outside the U.S., we simplify your FAA compliance.
              You focus on flying — let us handle the rest.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 items-center mb-14">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
              className="relative rounded-2xl overflow-hidden shadow-2xl shadow-red-900/20 aspect-video border border-gray-200">
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/cfjy4wI7ZY4?rel=0&modestbranding=1"
                title="IFOA USA Agent for Service Registration"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, delay: 0.1 }}
              className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-gray-900">Watch Our Video First</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Make sure to watch our short YouTube video — it walks you through the key steps to stay compliant with the FAA's Agent for Service requirement.
              </p>
              <p className="text-gray-600 leading-relaxed">
                It only takes a few minutes and will help you get everything right from the start. Think of it as your step-by-step guide to avoid confusion and save time later.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="https://www.youtube.com/watch?v=cfjy4wI7ZY4" target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-red-200">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                  Watch on YouTube
                </a>
                <button onClick={scrollToForm}
                  className="inline-flex items-center gap-2 border border-red-200 text-red-700 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-red-50 transition-all">
                  Skip to Form
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7M12 5v14" /></svg>
                </button>
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="mb-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gray-900 text-white text-sm font-black flex items-center justify-center">1</div>
              <h3 className="text-xl font-black text-gray-900">Register on these TWO FAA Web Portals</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white border border-gray-200 p-7 flex flex-col gap-4">
                <div>
                  <p className="text-gray-900 font-black text-lg mb-3">FAA IACRA</p>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    Retrieve your FTN Number on the FAA IACRA website as a:
                  </p>
                  <ul className="space-y-1.5 mb-5">
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      <strong className="text-gray-900">NEW</strong>&nbsp;certificate, or
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      <strong className="text-gray-900">EXISTING</strong>&nbsp;certificate
                    </li>
                  </ul>
                </div>
                <a href="https://iacra.faa.gov/IACRA/Default.aspx" target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-500 transition-colors mt-auto">
                  Access to FAA IACRA Portal →
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              </div>

              <div className="rounded-2xl bg-white border border-gray-200 p-7 flex flex-col gap-4">
                <div>
                  <p className="text-gray-900 font-black text-lg mb-3">FAA USAS</p>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    Register IFOA as your official U.S. Agent for Service with the FAA.
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    The FAA's appointment portal (USAS) has been available since{' '}
                    <strong className="text-gray-900">April 2, 2025</strong>.
                  </p>
                </div>
                <a href="https://usas.faa.gov/signin" target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-500 transition-colors mt-auto">
                  Access to FAA USAS Portal →
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gray-900 text-white text-sm font-black flex items-center justify-center">2</div>
              <h3 className="text-xl font-black text-gray-900">Get Your Agent for Service Information</h3>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm max-w-2xl">
              <div className="divide-y divide-gray-100">
                {SERVICE_CONTACT.map((row) => (
                  <div key={row.label} className="flex items-center px-6 py-4 gap-4">
                    <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-widest text-gray-400">{row.label}</span>
                    {row.href
                      ? <a href={row.href} className="text-sm font-semibold text-red-600 hover:underline">{row.value}</a>
                      : <span className="text-sm text-gray-800 font-medium">{row.value}</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ WHY CHOOSE US ═══ */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="mb-10">
            <p className="text-red-600 text-xs font-black uppercase tracking-widest mb-2">Why IFOA USA</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              The Trusted Choice for<br />International Aviators
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6">
            {WHY_CARDS.map((card, i) => (
              <motion.div key={card.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.5 }}
                className="group rounded-2xl overflow-hidden border border-gray-200 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="relative h-44 overflow-hidden">
                  <CardImage srcs={card.srcs} gradient={card.gradient} emoji={card.emoji} alt={card.title} className="w-full h-full group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-4 w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg">{card.icon}</div>
                </div>
                <div className="p-5">
                  <h3 className="text-base font-bold text-gray-900 mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{card.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STATS ROW ═══ */}
      <section className="bg-black py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { value: '$69', label: 'Annual Plan' },
            { value: '$299', label: 'Lifetime Access' },
            { value: '4', label: 'Simple Steps' },
            { value: '🇺🇸', label: 'U.S. Based Office' },
          ].map((stat, i) => (
            <motion.div key={stat.label}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
              className="text-center">
              <p className="text-4xl font-black text-white mb-1">{stat.value}</p>
              <p className="text-xs font-bold text-red-400 uppercase tracking-widest">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ 3-STEP GUIDE ═══ */}
      <section className="bg-white py-16 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-10">
            <p className="text-red-600 text-xs font-black uppercase tracking-widest mb-2">Before You Begin</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">3 Steps Before Registering</h2>
            <p className="text-gray-500 text-sm mt-2 max-w-xl">Follow these steps on the FAA portals first, then come back and complete the registration form below.</p>
          </motion.div>
          <div className="grid sm:grid-cols-3 gap-5">
            {GUIDE_STEPS.map((item, i) => (
              <motion.div key={item.index}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-7 hover:border-red-200 hover:bg-red-50/30 transition-all duration-200">
                <div className="w-11 h-11 rounded-2xl bg-red-600 text-white font-black text-sm flex items-center justify-center mb-5 shadow-md shadow-red-200">{item.index}</div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">{item.body}</p>
                {item.links && (
                  <div className="flex flex-wrap gap-2">
                    {item.links.map((link) => (
                      <a key={link.href} href={link.href} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 border border-red-200 bg-white hover:bg-red-50 px-3 py-1.5 rounded-full transition-colors">
                        {link.label}
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ AGENT CONTACT + AIRLINES CTA ═══ */}
      <section className="bg-gray-50 border-t border-gray-100 py-12 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-gray-100">
              <p className="text-xs font-black uppercase tracking-widest text-red-600">Official Agent Details</p>
              <h3 className="mt-1 text-lg font-bold text-gray-900">Use These on the FAA Portal</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {SERVICE_CONTACT.map((row) => (
                <div key={row.label} className="flex items-center px-6 py-4 gap-4">
                  <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-widest text-gray-400">{row.label}</span>
                  {row.href
                    ? <a href={row.href} className="text-sm font-semibold text-red-600 hover:underline">{row.value}</a>
                    : <span className="text-sm text-gray-800 font-medium">{row.value}</span>
                  }
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
            className="relative rounded-2xl overflow-hidden min-h-[220px] flex">
            <CardImage
              srcs={[
                'https://images.unsplash.com/photo-1436491865332-7a61a109db56?w=700&q=80&auto=format&fit=crop&crop=center',
                'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=700&q=80&auto=format&fit=crop',
              ]}
              gradient="from-gray-950 via-gray-900 to-gray-800"
              emoji="✈️"
              alt="Airline aircraft"
              className="absolute inset-0 w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-gray-950/70 to-gray-950/30" />
            <div className="relative z-10 flex flex-col justify-center px-8 py-8">
              <p className="text-xs font-black uppercase tracking-widest text-red-400 mb-2">Operators &amp; Airlines</p>
              <h3 className="text-xl font-black text-white mb-2 leading-tight">Managing 3+<br />Certificate Holders?</h3>
              <p className="text-sm text-gray-300 mb-6 leading-relaxed max-w-xs">Volume pricing, dedicated support, and enterprise-grade onboarding.</p>
              <Link to="/airlines/register"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all w-fit">
                ✈ Go to Airlines Plan
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0-5 5m5-5H6" /></svg>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ REGISTRATION FORM ═══ */}
      <section ref={formRef} className="bg-white py-16 px-6 border-t border-gray-100" id="registration-form">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-10">
            <div className="inline-flex items-center rounded-full border border-dashed border-gray-400 px-5 py-1.5 mb-4">
              <span className="text-black text-xs font-semibold tracking-wide">Secure Registration</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-3">Complete Your Registration</h2>
            <p className="text-gray-500 text-base max-w-md mx-auto leading-relaxed">
              A guided 4-step form — takes less than 5 minutes. Your data is encrypted and handled securely.
            </p>
            {!user && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
                style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Sign in or create an account to proceed past Step 2
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
            className="relative rounded-3xl border border-gray-200 bg-white shadow-[0_24px_80px_-30px_rgba(15,23,42,0.15)] overflow-hidden">
            {isBlocked && <WrongRoleBanner />}

            <div className="bg-gradient-to-b from-white to-gray-50/80 border-b border-gray-100 px-7 py-7">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-red-600 mb-1.5">Registration Form</p>
                  <h3 className="text-2xl font-black text-gray-950 tracking-tight">{activeStep.label}</h3>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed max-w-xs">{activeStep.detail}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-2xl font-black text-gray-950 tabular-nums">{progress}%</span>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">Complete</p>
                </div>
              </div>

              <div className="flex gap-2 mb-4 overflow-x-auto pb-0.5">
                {STEPS.map((item, i) => {
                  const num = i + 1; const current = num === step; const done = num < step
                  const locked = num > 2 && !user
                  return (
                    <div key={item.label}
                      className={`min-w-[7rem] flex-1 rounded-2xl px-4 py-3 border transition-all duration-200 relative ${
                        current ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-200'
                        : done ? 'bg-red-50 border-red-200 text-red-700'
                        : locked ? 'bg-gray-50 border-gray-200 text-gray-300'
                        : 'bg-white border-gray-200 text-gray-400'
                      }`}>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">Step {num}</p>
                      <p className="mt-0.5 text-sm font-bold truncate">{item.label}</p>
                      {locked && (
                        <span className="absolute top-2 right-2">
                          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>

            <div className="px-7 py-8">
              <AnimatePresence mode="wait">
                <motion.div key={step}
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}>
                  {step === 1 && <Step1PersonalInfo data={formData} update={update} onNext={handleNextToStep2} />}
                  {step === 2 && <Step2Certificates data={formData} update={update} onNext={handleNextToStep3} onBack={() => goToStep(1)} />}
                  {step === 3 && <Step3Preview data={formData} onNext={handleNextToStep4} onBack={() => goToStep(2)} />}
                  {step === 4 && <Step4Payment data={formData} update={update} onBack={() => goToStep(3)} onSubmit={handleSubmit} submitting={submitting} error={error} isBlocked={isBlocked} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {[
              { icon: '🔒', text: 'Secure & Encrypted' },
              { icon: '✅', text: 'FAA Compliant' },
              { icon: '🇺🇸', text: 'U.S. Based Office' },
              { icon: '⚡', text: 'Fast Processing' },
            ].map((badge) => (
              <div key={badge.text}
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm">
                <span>{badge.icon}</span>
                {badge.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-black text-gray-400 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-white font-bold text-sm">IFOA USA Corp</p>
            <p className="text-xs mt-1">1616 Concierge Blvd Suite 100, Daytona Beach, FL 32117, USA</p>
          </div>
          <div className="text-xs space-y-1 text-right">
            <p><a href="mailto:agent@theifoa.com" className="hover:text-white transition-colors">agent@theifoa.com</a></p>
            <p><a href="tel:+15088385880" className="hover:text-white transition-colors">+1 508 838 5880</a></p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-white/5 text-xs text-gray-600 flex flex-wrap gap-4 justify-between">
          <p>© {new Date().getFullYear()} IFOA USA Corp — International Flight Operations Academy GmbH</p>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <Link to="/airlines/register" className="hover:text-white transition-colors">Airlines Plan</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
