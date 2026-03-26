import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import Step1PersonalInfo from '../components/individual/Step1PersonalInfo'
import Step2Certificates from '../components/individual/Step2Certificates'
import Step3Preview from '../components/individual/Step3Preview'
import Step4Payment from '../components/individual/Step4Payment'
import SuccessPage from '../components/individual/SuccessPage'
import { createIndividual } from '../services/api'

const STEPS = [
  { label: 'Personal Info',   detail: 'Choose your plan and enter your contact details.' },
  { label: 'Certificates',    detail: 'Add your FAA certificate information.' },
  { label: 'Review',          detail: 'Confirm everything before payment.' },
  { label: 'Payment',         detail: 'Submit your registration and receive your invoice.' },
]

const GUIDE_STEPS = [
  {
    index: '01',
    title: 'Register on FAA Portals',
    body: 'Retrieve your FTN Number on FAA IACRA, then register IFOA as your official U.S. Agent on FAA USAS.',
    links: [
      { label: 'FAA IACRA', href: 'https://iacra.faa.gov/IACRA/Default.aspx' },
      { label: 'FAA USAS',  href: 'https://usas.faa.gov/signin' },
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
  { label: 'Company',  value: 'IFOA USA Corp' },
  { label: 'Address',  value: '1616 Concierge Blvd Suite 100, Daytona Beach, FL 32117, USA' },
  { label: 'Email',    value: 'agent@theifoa.com',  href: 'mailto:agent@theifoa.com' },
  { label: 'Phone',    value: '+1 508 838 5880',    href: 'tel:+15088385880' },
]

// Each card has a primary img, a chain of fallbacks, and a gradient used
// when ALL image sources fail (pure CSS — never breaks).
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
    gradient: 'from-blue-900 via-blue-800 to-blue-700',
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
    gradient: 'from-sky-900 via-sky-800 to-sky-700',
    emoji: '⚡',
  },
]

// Robust image component — tries each src in order; on total failure shows gradient
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

export default function IndividualForm() {
  const [step, setStep]             = useState(1)
  const [formData, setFormData]     = useState(INIT)
  const [submitted, setSubmitted]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const formRef = useRef(null)

  const update = (fields) => setFormData((prev) => ({ ...prev, ...fields }))
  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      await createIndividual({ ...formData, paymentStatus: 'pending' })
      setSubmitted(true)
    } catch (e) {
      setError(e?.response?.data?.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) return <><Navbar /><SuccessPage name={formData.firstName} /></>

  const activeStep = STEPS[step - 1]
  const progress   = Math.round((step / STEPS.length) * 100)

  return (
    <>
      <Navbar />

      {/* ═══ HERO ═══ */}
      <section className="relative h-[85vh] min-h-[520px] flex items-end overflow-hidden">
        <CardImage
          srcs={[
            'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1920&q=85&auto=format&fit=crop&crop=focalpoint&fp-y=0.45',
            'https://images.unsplash.com/photo-1436491865332-7a61a109db56?w=1920&q=80&auto=format&fit=crop',
          ]}
          gradient="from-gray-950 via-gray-900 to-gray-800"
          emoji="✈️"
          alt="Aviation cockpit"
          className="absolute inset-0 w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/75 to-gray-800/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/85 via-gray-900/40 to-transparent" />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 pb-14 sm:pb-20">
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}
            className="flex items-center gap-3 mb-7">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5">
              <svg width="48" height="28" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 30 Q20 8 40 18 Q50 22 48 30" stroke="#E53E3E" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d="M10 32 Q5 45 15 50 Q25 55 40 44" stroke="#1a2e5a" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <path d="M28 22 L48 18 L38 28Z" fill="#1a2e5a" opacity="0.85"/>
                <text x="55" y="26" fontFamily="Arial Black, sans-serif" fontSize="16" fontWeight="900" fill="#1a2e5a" letterSpacing="0.5">IFOA</text>
                <text x="56" y="42" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700" fill="#E53E3E" letterSpacing="2">★ USA ★</text>
              </svg>
              <div className="w-px h-8 bg-white/20" />
              <span className="text-white/80 text-xs font-bold uppercase tracking-[0.18em]">Individual Registration</span>
            </div>
          </motion.div>

          <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}
            className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-5 max-w-3xl">
            Individual<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-300">
              Registration
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="text-gray-300 text-lg max-w-xl leading-relaxed mb-5">
            Part 61 Pilot, Flight or Ground Instructor, or Part 65 Aircraft Dispatcher?<br />
            <span className="text-white font-semibold">You focus on flying — we handle FAA compliance.</span>
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}
            className="flex flex-wrap items-center gap-3 text-sm text-blue-300 font-semibold mb-10">
            {['Annual plan from $69', 'Lifetime option $299', '4-step guided form'].map((item, i) => (
              <span key={item} className="flex items-center gap-2">
                {i > 0 && <span className="text-blue-600">·</span>}
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                {item}
              </span>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="flex flex-wrap gap-4">
            <button onClick={scrollToForm}
              className="inline-flex items-center gap-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-8 py-4 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-blue-900/50">
              Start Registration
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7M12 5v14" /></svg>
            </button>
            <Link to="/airlines/register"
              className="inline-flex items-center gap-2 border border-white/25 hover:border-white/50 text-white font-semibold px-8 py-4 rounded-xl text-sm transition-all duration-200 backdrop-blur-sm">
              ✈ Airlines Plan
            </Link>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}
          className="absolute bottom-6 right-8 flex flex-col items-center gap-1.5 opacity-40">
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}
            className="w-px h-10 bg-white/50" />
          <span className="text-white/50 text-[10px] uppercase tracking-widest">Scroll</span>
        </motion.div>
      </section>

      {/* ═══ DEADLINE BANNER ═══ */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest whitespace-nowrap text-blue-200">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            Key FAA Deadlines
          </span>
          <div className="w-px h-5 bg-white/20 hidden sm:block" />
          <p className="text-sm leading-relaxed text-blue-100">
            <strong className="text-white">02 Apr 2025</strong> — New applicants with non-U.S. addresses must appoint a U.S. Agent. &nbsp;
            <strong className="text-white">07 Jul 2025</strong> — Existing certificate holders must designate an Agent to maintain FAA certification.
          </p>
        </div>
      </div>

      {/* ═══ WHY CHOOSE US — 3 image cards ═══ */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="mb-10">
            <p className="text-blue-600 text-xs font-black uppercase tracking-widest mb-2">Why IFOA USA</p>
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
                {/* Card image — robust multi-src with gradient fallback */}
                <div className="relative h-44 overflow-hidden">
                  <CardImage
                    srcs={card.srcs}
                    gradient={card.gradient}
                    emoji={card.emoji}
                    alt={card.title}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-4 w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                    {card.icon}
                  </div>
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
      <section className="bg-gray-950 py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { value: '$69', label: 'Annual Plan' },
            { value: '$299', label: 'Lifetime Access' },
            { value: '4',   label: 'Simple Steps' },
            { value: '🇺🇸', label: 'U.S. Based Office' },
          ].map((stat, i) => (
            <motion.div key={stat.label}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
              className="text-center">
              <p className="text-4xl font-black text-white mb-1">{stat.value}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ 3-STEP GUIDE ═══ */}
      <section className="bg-white py-16 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-10">
            <p className="text-blue-600 text-xs font-black uppercase tracking-widest mb-2">Before You Begin</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">3 Steps Before Registering</h2>
            <p className="text-gray-500 text-sm mt-2 max-w-xl">Follow these steps on the FAA portals first, then come back and complete the registration form below.</p>
          </motion.div>
          <div className="grid sm:grid-cols-3 gap-5">
            {GUIDE_STEPS.map((item, i) => (
              <motion.div key={item.index}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-7 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center justify-center mb-5 shadow-md shadow-blue-200">
                  {item.index}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">{item.body}</p>
                {item.links && (
                  <div className="flex flex-wrap gap-2">
                    {item.links.map((link) => (
                      <a key={link.href} href={link.href} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 border border-blue-200 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-full transition-colors">
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
              <p className="text-xs font-black uppercase tracking-widest text-blue-600">Official Agent Details</p>
              <h3 className="mt-1 text-lg font-bold text-gray-900">Use These on the FAA Portal</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {SERVICE_CONTACT.map((row) => (
                <div key={row.label} className="flex items-center px-6 py-4 gap-4">
                  <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-widest text-gray-400">{row.label}</span>
                  {row.href
                    ? <a href={row.href} className="text-sm font-semibold text-blue-700 hover:underline">{row.value}</a>
                    : <span className="text-sm text-gray-800 font-medium">{row.value}</span>
                  }
                </div>
              ))}
            </div>
          </motion.div>

          {/* Airlines CTA image card — robust image */}
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
              <p className="text-xs font-black uppercase tracking-widest text-blue-400 mb-2">Operators &amp; Airlines</p>
              <h3 className="text-xl font-black text-white mb-2 leading-tight">Managing 3+<br />Certificate Holders?</h3>
              <p className="text-sm text-gray-300 mb-6 leading-relaxed max-w-xs">
                Volume pricing, dedicated support, and enterprise-grade onboarding.
              </p>
              <Link to="/airlines/register"
                className="inline-flex items-center gap-2 bg-white hover:bg-blue-50 text-gray-900 font-bold px-6 py-3 rounded-xl text-sm transition-all w-fit">
                ✈ Go to Airlines Plan
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0-5 5m5-5H6" /></svg>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ REGISTRATION FORM ═══ */}
      <section ref={formRef} className="bg-white py-16 px-6 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-blue-700 text-xs font-black uppercase tracking-[0.2em]">Secure Registration</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-3">Complete Your Registration</h2>
            <p className="text-gray-500 text-base max-w-md mx-auto leading-relaxed">
              A guided 4-step form — takes less than 5 minutes. Your data is encrypted and handled securely.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl border border-gray-200 bg-white shadow-[0_24px_80px_-30px_rgba(15,23,42,0.15)] overflow-hidden">

            <div className="bg-gradient-to-b from-white to-gray-50/80 border-b border-gray-100 px-7 py-7">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600 mb-1.5">Registration Form</p>
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
                  return (
                    <div key={item.label}
                      className={`min-w-[7rem] flex-1 rounded-2xl px-4 py-3 border transition-all duration-200 ${
                        current ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                        : done   ? 'bg-blue-50 border-blue-200 text-blue-700'
                                 : 'bg-white border-gray-200 text-gray-400'
                      }`}>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">Step {num}</p>
                      <p className="mt-0.5 text-sm font-bold truncate">{item.label}</p>
                    </div>
                  )
                })}
              </div>

              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400"
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
                  {step === 1 && <Step1PersonalInfo data={formData} update={update} onNext={() => setStep(2)} />}
                  {step === 2 && <Step2Certificates data={formData} update={update} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
                  {step === 3 && <Step3Preview      data={formData} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
                  {step === 4 && <Step4Payment      data={formData} update={update} onBack={() => setStep(3)} onSubmit={handleSubmit} submitting={submitting} error={error} />}
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
      <footer className="bg-gray-950 text-gray-400 py-10 px-6">
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
