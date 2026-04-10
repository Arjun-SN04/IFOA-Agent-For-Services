import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/layout/footer'
import classicStamp from '../assets/Classic-Stamp.png'
import dgrCrewImg from '../assets/DGR-Crew.jpg'
import { Plane, Zap, Lock, Monitor, MapPin, User } from 'lucide-react'

// ── Color tokens ──────────────────────────────────────────────────────────────
const C = {
  blue:      '#0000ff',
  blueDark:  '#0000e6',
  blueLight: '#3333ff',
  blueXLight:'#dbeafe',
  blueMuted: '#eff6ff',
  red:       '#dc2626',
  redDark:   '#b91c1c',
  redLight:  '#ef4444',
  redMuted:  '#fef2f2',
  redXLight: '#fecaca',
  dark:      '#0f172a',
  darkSoft:  '#1e293b',
  white:     '#ffffff',
  gray50:    '#f8fafc',
  gray100:   '#f1f5f9',
  gray200:   '#e2e8f0',
  gray300:   '#cbd5e1',
  gray400:   '#94a3b8',
  gray600:   '#475569',
  gray700:   '#334155',
  gray900:   '#0f172a',
}

const PLANS = [
  {
    name: 'Turboprop Plan',
    subtitle: '1 Year Subscription',
    price: '$69.00',
    features: ['Dedicated U.S. Mailing Address', 'FAA Compliance Guaranteed', 'Real-Time Notification', 'Document Scanning & Forwarding', 'Yearly Payment', 'Unlimited Certificates'],
    cta: 'Subscribe Now',
    to: '/register',
    img: 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=600&q=80&auto=format&fit=crop&crop=center',
  },
  {
    name: 'Jet Plan',
    subtitle: 'Up to 5 Years Subscription',
    price: '$55.00',
    features: ['20% Discount Yearly', 'Dedicated U.S. Mailing Address', 'FAA Compliance Guaranteed', 'Real-Time Notification', 'Document Scanning & Forwarding', 'One Payment for the Period', 'Unlimited Certificates'],
    cta: 'Subscribe Now',
    to: '/register',
    img: 'https://images.unsplash.com/photo-1436491865332-7a61a109db56?w=600&q=80&auto=format&fit=crop&crop=center',
    imgFallback: 'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=600&q=80&auto=format&fit=crop&crop=center',
  },
  {
    name: 'VIP Plan',
    subtitle: 'Unlimited Subscription',
    price: '$299.00',
    bestValue: true,
    features: ['The Most Economic Flat Rate', 'Dedicated U.S. Mailing Address', 'FAA Compliance Guaranteed', 'Real-Time Notification', 'Document Scanning & Forwarding', 'One Time Lifetime Payment', 'Unlimited Certificates'],
    cta: 'Subscribe Now',
    to: '/register',
    img: 'https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=600&q=80&auto=format&fit=crop&crop=center',
  },
  {
    name: 'Airlines Plan',
    subtitle: 'Choose Subscription Duration',
    price: 'Tailored Price',
    isAirlines: true,
    features: ['Volume Discount', 'Dedicated U.S. Mailing Address', 'FAA Compliance Guaranteed', 'Real-Time Notification', 'Document Scanning & Forwarding', 'Credit Card or Wire payment', 'Unlimited Certificates'],
    cta: 'Subscribe Now',
    to: '/register',
    img: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=600&q=80&auto=format&fit=crop&crop=center',
  },
]

const HOW_STEPS = [
  {
    num: 1,
    title: 'Create Your Account',
    desc: 'Create your account and get instant access to your secure dashboard, where you can track FAA correspondence with your dedicated U.S. address.',
  },
  {
    num: 2,
    title: 'Assign Your Agent',
    desc: 'Designate IFOA USA as your U.S. Registered Agent on the FAA website and use your dedicated U.S. address to keep records current.',
  },
  {
    num: 3,
    title: 'Receive & Manage Mail',
    desc: 'FAA correspondence sent to your assigned U.S. address is scanned and forwarded to your dashboard or email with real-time updates.',
  },
  {
    num: 4,
    title: 'Stay FAA Compliant',
    desc: 'Choose how your FAA mail is handled, including secure shredding or physical forwarding for critical documents such as certificates.',
  },
]

const WHY_CHOOSE = [
  { icon: <Plane className="w-6 h-6" />, title: 'Aviation-Specific Expertise', desc: 'Our services are designed specifically for individuals and businesses in the aviation industry, ensuring full FAA compliance.' },
  { icon: <Zap className="w-6 h-6" />, title: 'Fast and Simple Setup', desc: 'Register in just a few minutes, and your U.S. address will be active within 24 hours.' },
  { icon: <Lock className="w-6 h-6" />, title: 'Fully Digital and Secure', desc: "You'll receive real-time notifications when mail arrives at your U.S. address." },
  { icon: <Monitor className="w-6 h-6" />, title: 'Custom Software', desc: 'Tailored solution that streamlines FAA compliance through Agent for Service Appointment and optimizes workflows.' },
  { icon: <MapPin className="w-6 h-6" />, title: 'Oklahoma Office', desc: "Our Oklahoma office, located in close proximity to the FAA, ensures fast and efficient handling and forwarding of our customers' mail." },
  { icon: <User className="w-6 h-6" />, title: 'Personal Contact', desc: 'Personalized, proactive guidance from an aviation-focused team ensures seamless FAA compliance.' },
]

function PlanCard({ plan, index }) {
  const imgRef = useRef(null)

  const handleImgError = (e) => {
    const el = e.target
    if (plan.imgFallback && el.src !== plan.imgFallback) {
      el.src = plan.imgFallback
    } else {
      // Hide broken image and show the SVG airplane placeholder behind it
      el.style.display = 'none'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      className="relative flex flex-col rounded-2xl overflow-hidden hover:-translate-y-1 transition-all duration-300"
      style={{
        background: C.white,
        border: plan.bestValue ? `2px solid ${C.blue}` : `1px solid ${C.gray200}`,
        boxShadow: plan.bestValue ? '0 8px 40px rgba(0,0,255,0.12)' : '0 1px 6px rgba(15,23,42,0.06)',
      }}
    >
      {plan.bestValue && (
        <div className="absolute top-3 right-3 z-10 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full" style={{ background: C.blue }}>
          Best Value
        </div>
      )}
      <div className="relative h-52 overflow-hidden flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.blueMuted} 0%, ${C.gray50} 100%)` }}>
        {/* SVG airplane placeholder always rendered behind the photo */}
        <svg viewBox="0 0 200 120" className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 60 L100 20 L180 60 L140 60 L130 90 L100 80 L70 90 L60 60 Z" fill="#0000ff" />
          <path d="M100 20 L110 60 L90 60 Z" fill="#0000cc" />
          <circle cx="100" cy="60" r="6" fill="#0000aa" />
          <path d="M60 60 L20 70 L20 60 Z" fill="#0000dd" />
          <path d="M140 60 L180 70 L180 60 Z" fill="#0000dd" />
        </svg>
        <svg viewBox="0 0 240 140" className="absolute w-3/4 h-3/4 opacity-10" xmlns="http://www.w3.org/2000/svg">
          <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="80" fill="#0000ff">✈</text>
        </svg>
        <img src={plan.img} alt={plan.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" onError={handleImgError} />
      </div>
      <div className="flex flex-col flex-1 p-6">
        <h3 className="text-xl font-black mb-1" style={{ color: C.dark }}>{plan.name}</h3>
        <p className="text-2xl font-black mb-1" style={{ color: C.dark }}>{plan.price}</p>
        <p className="text-sm font-semibold mb-4" style={{ color: C.blue }}>{plan.subtitle}</p>
        {plan.bestValue && (
          <p className="text-xs rounded-lg px-3 py-2 mb-4 font-semibold" style={{ color: C.blue, background: C.blueMuted, border: `1px solid ${C.blueXLight}` }}>
            Pay once, covered for life — no renewals!
          </p>
        )}
        <ul className="space-y-2 mb-6 flex-1">
          {plan.features.map(f => (
            <li key={f} className="text-sm flex items-center gap-2" style={{ color: C.gray600 }}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: C.blueMuted }}>
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} style={{ color: C.blue }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              {f}
            </li>
          ))}
        </ul>
        <Link to={plan.to} className="block text-center py-3 px-6 font-bold rounded-xl text-sm transition-all duration-200 text-white"
          style={{ background: plan.bestValue ? C.blue : C.dark }}
          onMouseEnter={e => { e.currentTarget.style.background = plan.bestValue ? C.blueDark : C.darkSoft }}
          onMouseLeave={e => { e.currentTarget.style.background = plan.bestValue ? C.blue : C.dark }}>
          {plan.cta}
        </Link>
      </div>
    </motion.div>
  )
}

const FAQ_ITEMS = [
  {
    question: 'How do I appoint a designated Agent for Services?',
    answer: (
      <div className="space-y-4 text-sm leading-relaxed" style={{ color: C.gray700 }}>
        <div><p className="font-bold mb-1" style={{ color: C.dark }}>STEP 1 — FAA IACRA Portal</p><p>Register on the IACRA portal: <a href="https://iacra.faa.gov" target="_blank" rel="noreferrer" style={{ color: C.blue }} className="underline">https://iacra.faa.gov</a></p><p className="mt-1">It will display your FTN (FAA Tracking Number).</p></div>
        <div><p className="font-bold mb-1" style={{ color: C.dark }}>STEP 2 — IFOA USA Portal</p><p>Create your account at <a href="https://theifoa-agent.com" target="_blank" rel="noreferrer" style={{ color: C.blue }} className="underline">https://theifoa-agent.com</a>. You will get your dedicated U.S. address.</p></div>
        <div><p className="font-bold mb-1" style={{ color: C.dark }}>STEP 3 — FAA USAS Portal</p><p>Complete your designation at: <a href="https://usas.faa.gov" target="_blank" rel="noreferrer" style={{ color: C.blue }} className="underline">usas.faa.gov</a></p></div>
      </div>
    ),
  },
  {
    question: 'Can I appoint a U.S. Agent for Service for my company or multiple FAA certificate holders?',
    answer: <p className="text-sm leading-relaxed" style={{ color: C.gray700 }}>We offer tailored solutions for individual certificate holders and organizations. Please contact our team to discuss your specific needs.</p>,
  },
  {
    question: 'How do I get my documents?',
    answer: <p className="text-sm leading-relaxed" style={{ color: C.gray700 }}>All FAA-related documents will be digitally scanned and uploaded to a secure online dashboard within one business day. You will receive real-time email notifications.</p>,
  },
  {
    question: 'What is IACRA and FTN Number?',
    answer: (
      <div className="text-sm leading-relaxed space-y-3" style={{ color: C.gray700 }}>
        <div><p className="font-bold mb-1" style={{ color: C.dark }}>FTN (FAA Tracking Number)</p><p>A unique ID assigned when you register in IACRA. It stays the same for your entire aviation career.</p></div>
        <div><p className="font-bold mb-1" style={{ color: C.dark }}>IACRA</p><p>The FAA online system for managing airman certification. It allows applicants to apply for certificates and ratings electronically.</p></div>
      </div>
    ),
  },
  {
    question: 'What will happen if I do not respect the Deadlines?',
    answer: (
      <div className="text-sm leading-relaxed space-y-3" style={{ color: C.gray700 }}>
        <div><p className="font-bold mb-1" style={{ color: C.dark }}>For Current Certificate Holders:</p><p>Suspension of Privileges — your certificate remains valid but you cannot exercise its privileges.</p></div>
        <div><p className="font-bold mb-1" style={{ color: C.dark }}>For New Applicants:</p><p>Certification Delays — you cannot complete FAA certification without officially naming a U.S. Agent for Service.</p></div>
      </div>
    ),
  },
]

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.gray200}` }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-6 py-5 text-left transition-colors duration-200"
        style={{ background: isOpen ? C.blueMuted : C.white }}
        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = C.gray50 }}
        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = C.white }}>
        <span className="font-bold text-sm pr-4" style={{ color: C.dark }}>{item.question}</span>
        <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300"
          style={{ border: `1.5px solid ${isOpen ? C.blue : C.gray200}`, background: isOpen ? C.blueXLight : 'transparent', transform: isOpen ? 'rotate(45deg)' : 'rotate(0)' }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: isOpen ? C.blue : C.gray400 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>
      <div style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.32s cubic-bezier(0.4,0,0.2,1)' }}>
        <div style={{ overflow: 'hidden' }}>
          <div className="px-6 pb-6" style={{ background: C.white, borderTop: `1px solid ${C.gray100}` }}>
            <div className="pt-4">{item.answer}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null)
  const toggle = (i) => setOpenIndex(prev => prev === i ? null : i)
  return (
    <section className="py-20 px-6" style={{ background: C.white, borderTop: `1px solid ${C.gray100}` }}>
      <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_1.6fr] gap-14 items-start">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.blue }}>Support</p>
          <h2 className="text-4xl font-black mb-4" style={{ color: C.dark }}>Frequently Asked<br />Questions</h2>
          <p className="leading-relaxed mb-3" style={{ color: C.gray600 }}>All You Need to Know About Appointing an FAA U.S. Agent for Service with IFOA USA.</p>
          <p className="leading-relaxed" style={{ color: C.gray600 }}>Still have questions? Reach out — we are happy to help.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }} className="space-y-3">
          {FAQ_ITEMS.map((item, i) => <FAQItem key={i} item={item} isOpen={openIndex === i} onToggle={() => toggle(i)} />)}
        </motion.div>
      </div>
    </section>
  )
}

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen font-sans" style={{ background: C.white }}>
      <Navbar />

      {/* ── HERO ── */}
      <section data-hero className="relative overflow-hidden" style={{ background: C.white, borderBottom: `1px solid ${C.gray200}` }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(circle at 20% 10%, rgba(59,130,246,0.09) 0%, rgba(59,130,246,0) 45%), radial-gradient(circle at 90% 0%, rgba(220,38,38,0.06) 0%, rgba(220,38,38,0) 40%)',
        }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 py-24 lg:py-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto"
          >
            <div className="inline-flex items-center rounded-full px-4 py-1.5 mb-7 text-xs font-bold uppercase tracking-widest"
              style={{ background: C.blueMuted, border: `1px solid ${C.blueXLight}`, color: C.blue }}>
              FAA U.S. Agent for Service
            </div>

            <h1 className="font-black leading-[1.05] tracking-tight mb-5"
              style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)', color: C.dark }}>
              Your U.S. Agent
              <br />
              for Service.
            </h1>

            <p className="text-base leading-relaxed mb-9 max-w-2xl mx-auto" style={{ color: C.gray600 }}>
              FAA compliance for international aviators with a dedicated U.S. address,
              secure mail handling, and real-time updates. Simple, fast, and professional.
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-10">
              <Link to="/register"
                className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl text-sm text-white transition-all duration-200"
                style={{ background: C.blue }}
                onMouseEnter={e => e.currentTarget.style.background = C.blueDark}
                onMouseLeave={e => e.currentTarget.style.background = C.blue}>
                Get Started - $69/yr
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0-5 5m5-5H6" /></svg>
              </Link>
              {!user && (
                <Link to="/login"
                  className="inline-flex items-center gap-2 font-semibold px-6 py-3.5 rounded-xl text-sm transition-all duration-200"
                  style={{ border: `1px solid ${C.gray300}`, color: C.gray700, background: C.white }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.gray50; e.currentTarget.style.borderColor = C.gray400 }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.white; e.currentTarget.style.borderColor = C.gray300 }}>
                  Sign In
                </Link>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {['100% FAA Compliant', '24h Activation', 'Daytona Beach, FL', 'Encrypted & Secure'].map(t => (
                <div key={t} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: C.gray600 }}>
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: C.blue }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {t}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── COMPLIANCE ALERT ── */}
      <section className="py-6 px-6" style={{ background: C.gray50, borderBottom: `1px solid ${C.gray200}` }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-black" style={{ background: C.dark }}>!</div>
            <div>
              <p className="font-black text-sm" style={{ color: C.dark }}>FAA Agent for Service Rule Now in Effect</p>
              <p className="text-sm mt-0.5" style={{ color: C.gray600 }}>
                Effective October 8, 2024 — All FAA certificate holders with a foreign address must designate a U.S. Agent for Service.{' '}
                <strong style={{ color: C.dark }}>Enforcement action has begun.</strong>
              </p>
            </div>
          </div>
          <Link to="/register"
            className="shrink-0 font-bold text-sm px-6 py-3 rounded-xl text-white transition-all duration-200 whitespace-nowrap"
            style={{ background: C.blue }}
            onMouseEnter={e => e.currentTarget.style.background = C.blueDark}
            onMouseLeave={e => e.currentTarget.style.background = C.blue}>
            Get Compliant Now
          </Link>
        </div>
      </section>

      {/* ── WHO WE ARE ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.blue }}>About Our Service</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-snug mb-6">
              Effortless FAA Compliance<br />for Pilots &amp; Dispatchers Worldwide
            </h2>
            <p className="text-gray-600 leading-relaxed mb-5">
              Whether you are a <strong className="text-gray-900">Part 61 Pilot, Flight or Ground Instructor</strong>, or a <strong className="text-gray-900">Part 65 Aircraft Dispatcher</strong> living outside the U.S., meeting FAA regulatory requirements should not complicate your operations.
            </p>
            <p className="text-gray-600 leading-relaxed mb-8">
              Our <strong className="text-gray-900">Daytona Beach</strong> team ensures your FAA correspondence and regulatory notices are handled promptly and professionally.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register"
                className="inline-flex items-center gap-2 text-white font-semibold px-7 py-3 rounded-xl text-sm transition-all duration-200 shadow-sm"
                style={{ background: '#000021' }}
                onMouseEnter={e => e.currentTarget.style.background = '#000000'}
                onMouseLeave={e => e.currentTarget.style.background = '#000021'}>
                Register as Individual
              </Link>
              <Link to="/register"
                className="inline-flex items-center gap-2 text-white font-semibold px-7 py-3 rounded-xl text-sm transition-all duration-200"
                style={{ background: '#000021' }}
                onMouseEnter={e => e.currentTarget.style.background = '#000000'}
                onMouseLeave={e => e.currentTarget.style.background = '#000021'}>
                <Plane className="w-4 h-4" /> Airlines Register
              </Link>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }}
            className="space-y-px border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {[
              { label: 'Company', value: 'IFOA USA Corp' },
              { label: 'Address', value: '1616 Concierge Blvd Suite 100, Daytona Beach, FL 32117, USA' },
              { label: 'Email', value: 'agent@theifoa.com' },
              { label: 'Phone', value: '+1 508 838 5880' },
              { label: 'Regulation', value: '14 CFR Part 3, Subpart C' },
              { label: 'Applies To', value: 'Parts 47, 61, 63, 65, 67, 107 certificate holders' },
            ].map((row, i) => (
              <div key={row.label} className={`flex text-sm ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                <div className="w-36 shrink-0 px-5 py-3.5 font-semibold text-gray-500 border-r border-gray-200">{row.label}</div>
                <div className="px-5 py-3.5 text-gray-800">{row.value}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 px-6" style={{ background: C.gray50, borderTop: `1px solid ${C.gray100}` }}>
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-14 text-center">
            <h2 className="text-3xl sm:text-4xl font-black mb-2" style={{ color: C.dark }}>HOW TO APPOINT YOUR FAA AGENT FOR SERVICE</h2>
            <p className="text-sm" style={{ color: C.gray400 }}>Fast, digital, reliable &amp; safe</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW_STEPS.map((s, i) => (
              <motion.div key={s.num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.45 }}
                whileHover={{ y: -6, scale: 1.012 }}
                className="group relative rounded-2xl p-5 flex flex-col min-h-[300px]"
                style={{ background: C.white, border: `1px solid ${C.gray200}`, boxShadow: '0 2px 10px rgba(15,23,42,0.04)' }}>
                <div
                  className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(90deg, ${C.blue} 0%, ${C.blueLight} 100%)` }}
                />
                <p className="text-6xl font-black leading-none mb-4" style={{ color: '#c7dbf7' }}>
                  {String(s.num).padStart(2, '0')}
                </p>
                <h3 className="text-[28px] leading-[1.12] font-black mb-3" style={{ color: C.dark }}>{s.title}</h3>
                <p className="text-[17px] leading-[1.55]" style={{ color: C.gray600 }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STAMP / ABOUT ── */}
      <section className="py-20 px-6" style={{ background: C.gray50, borderTop: `1px solid ${C.gray100}` }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-16">
          <div className="flex-shrink-0 w-full md:w-[420px]">
            <img src={classicStamp} alt="IFOA USA stamp" className="w-full h-auto object-contain rounded-2xl" />
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.blue }}>About Our Service</p>
            <h2 className="text-3xl font-bold mb-5" style={{ color: C.dark }}>Effortless FAA Compliance for Pilots &amp; Dispatchers Worldwide</h2>
            <p className="text-base leading-relaxed mb-5" style={{ color: C.gray600 }}>
              Whether you are an <strong style={{ color: C.dark }}>FAA-Certified Pilot</strong> or <strong style={{ color: C.dark }}>Part 65 Aircraft Dispatcher</strong> based outside the United States, meeting FAA regulatory requirements should not complicate your operations.
            </p>
            <p className="text-base leading-relaxed mb-5" style={{ color: C.gray600 }}>
              Our <strong style={{ color: C.dark }}>Daytona Beach</strong> team ensures your FAA correspondence and regulatory notices are handled promptly and professionally.
            </p>
            <p className="text-base leading-relaxed" style={{ color: C.gray600 }}>
              Trust us to simplify your FAA compliance so you can stay focused on what you <strong style={{ color: C.dark }}>DO BEST</strong>.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── WHO NEEDS IT ── */}
      <section className="py-20 px-6" style={{ background: C.white, borderTop: `1px solid ${C.gray100}` }}>
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.blue }}>Who Needs This</p>
              <h2 className="text-3xl sm:text-4xl font-bold leading-snug mb-6" style={{ color: C.dark }}>Who Needs a FAA<br />Agent for Service?</h2>
              <p className="leading-relaxed mb-6 text-base" style={{ color: C.gray600 }}>
                New requirements published in{' '}
                <a href="https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_3-1.pdf" target="_blank" rel="noreferrer" className="font-bold underline" style={{ color: C.dark }}>FAA AC 3-1</a>
                {' '}and{' '}
                <a href="https://www.ecfr.gov/current/title-14/chapter-I/subchapter-A/part-3/subpart-C" target="_blank" rel="noreferrer" className="font-bold underline" style={{ color: C.dark }}>14 CFR Part 3 Subpart C</a>
                {' '}require FAA certificate holders with non-U.S. addresses to appoint a U.S. Agent for Service.
              </p>
              <ul className="space-y-3 mb-8">
                {['FAA-Certificated Pilots (Part 61)', 'Aircraft Mechanics & Dispatchers (Part 65)', 'Flight & Ground Instructors', 'Aircraft Owners (Part 47)', 'Aviation Businesses (Part 107)'].map(item => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: C.blueMuted }}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} style={{ color: C.blue }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-sm font-medium" style={{ color: C.gray700 }}>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link to="/register" className="inline-flex items-center gap-2 text-white font-bold px-7 py-3 rounded-xl text-sm transition-all duration-200"
                  style={{ background: C.blue }}
                  onMouseEnter={e => e.currentTarget.style.background = C.blueDark}
                  onMouseLeave={e => e.currentTarget.style.background = C.blue}>
                  Register as Airline
                </Link>
                <Link to="/register" className="inline-flex items-center gap-2 font-semibold px-7 py-3 rounded-xl text-sm transition-all duration-200"
                  style={{ color: C.dark, border: `1px solid ${C.gray200}` }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.gray400; e.currentTarget.style.background = C.gray50 }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.gray200; e.currentTarget.style.background = '' }}>
                  Individual Plan
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-5">
              <div className="relative rounded-3xl overflow-hidden shadow-xl" style={{ height: 340 }}>
                <img src={dgrCrewImg} alt="FAA certified aviation crew" className="w-full h-full object-cover object-top" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(15,23,42,0.05), rgba(15,23,42,0.45))' }} />
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1.5 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full" style={{ background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                    14 CFR Part 3 · Subpart C
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{ value: '14 CFR', label: 'Regulation' }, { value: 'Part 3', label: 'Subpart C' }, { value: '100%', label: 'FAA Compliant' }].map(s => (
                  <div key={s.label} className="rounded-xl px-4 py-3 text-center" style={{ border: `1px solid ${C.gray200}`, background: C.gray50 }}>
                    <p className="font-black text-sm" style={{ color: C.dark }}>{s.value}</p>
                    <p className="text-[10px] mt-0.5 font-medium" style={{ color: C.gray400 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SUBSCRIPTION PLANS ── */}
      <section id="pricing" className="py-20 px-6" style={{ background: C.gray50, borderTop: `1px solid ${C.gray100}` }}>
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-12 text-center">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.blue }}>Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ color: C.dark }}>Subscription Plans</h2>
            <p className="mt-3 text-sm" style={{ color: C.gray400 }}>Simple, transparent pricing — no hidden fees</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan, i) => <PlanCard key={plan.name} plan={plan} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── PRICING HIGHLIGHT + VIDEO ── */}
      <section className="py-20 px-6" style={{ background: C.white, borderTop: `1px solid ${C.gray100}` }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.blue }}>Pricing</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-6" style={{ color: C.dark }}>Less Than $70 Per Year</h2>
            <p className="leading-relaxed mb-4" style={{ color: C.gray700 }}>
              Choose one affordable payment of <strong style={{ color: C.dark }}>$69 per year,</strong> or <strong style={{ color: C.dark }}>$299 for an UNLIMITED period</strong>, with absolutely <strong style={{ color: C.dark }}>NO HIDDEN FEES.</strong>
            </p>
            <p className="leading-relaxed mb-6" style={{ color: C.gray700 }}>
              You will gain a dedicated U.S. mailing address for FAA correspondence, instant digital forwarding, and secure online access.
            </p>
            <p className="font-black text-xl mb-3" style={{ color: C.dark }}>Do not miss this unbeatable rate!</p>
            <p className="mb-8" style={{ color: C.gray600 }}>Register today and lock in worry-free compliance!</p>
            <Link to="/register" className="inline-flex items-center gap-2 text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-all duration-200"
              style={{ background: C.blue }}
              onMouseEnter={e => e.currentTarget.style.background = C.blueDark}
              onMouseLeave={e => e.currentTarget.style.background = C.blue}>
              Create Your Account
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }}>
            <div className="rounded-2xl overflow-hidden shadow-lg mb-6">
              <iframe width="100%" height="315" src="https://www.youtube.com/embed/qYtEEb3GeVM" title="IFOA USA" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full" />
            </div>
            <div className="space-y-4">
              {['A dedicated U.S. address for official FAA correspondence', 'Real-time unlimited digital mail forwarding so you never miss important documents'].map((point, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center" style={{ borderColor: C.blue }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: C.blue }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: C.gray700 }}>{point}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection />

      <Footer />
    </div>
  )
}
