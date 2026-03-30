import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState } from 'react'
import Navbar from '../components/Navbar'
import classicStamp from '../assets/Classic-Stamp.png'
import ifoaLogo from '../assets/IFOA_USA_blanc_V.png'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.6, ease: 'easeOut' } }),
}

const PLANS = [
  {
    name: 'Turboprop Plan',
    subtitle: '1 Year Subscription',
    price: '$69.00',
    subtitleColor: 'text-red-600',
    features: [
      'Dedicated U.S. Mailing Address',
      'FAA Compliance Guaranteed',
      'Real-Time Notification',
      'Document Scanning & Forwarding',
      'Yearly Payment',
      'Unlimited Certificates',
    ],
    cta: 'Subscribe Now',
    to: '/individual/register',
    img: 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=600&q=80&auto=format&fit=crop&crop=center',
    imgFallback: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=600&q=80&auto=format&fit=crop',
  },
  {
    name: 'Jet Plan',
    subtitle: 'Up to 5 Years Subscription',
    price: '$55.00',
    subtitleColor: 'text-red-600',
    features: [
      '20% Discount Yearly',
      'Dedicated U.S. Mailing Address',
      'FAA Compliance Guaranteed',
      'Real-Time Notification',
      'Document Scanning & Forwarding',
      'One Payment for the Period',
      'Unlimited Certificates',
    ],
    cta: 'Subscribe Now',
    to: '/individual/register',
    img: 'https://images.unsplash.com/photo-1436491865332-7a61a109db56?w=600&q=80&auto=format&fit=crop&crop=center',
    imgFallback: 'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=600&q=80&auto=format&fit=crop',
  },
  {
    name: 'VIP Plan',
    subtitle: 'Unlimited Subscription',
    price: '$299.00',
    subtitleColor: 'text-red-600',
    features: [
      'The Most Economic Flat Rate',
      'Dedicated U.S. Mailing Address',
      'FAA Compliance Guaranteed',
      'Real-Time Notification',
      'Document Scanning & Forwarding',
      'One Time Lifetime Payment',
      'Unlimited Certificates',
    ],
    cta: 'Subscribe Now',
    to: '/individual/register',
    img: 'https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=600&q=80&auto=format&fit=crop&crop=center',
    imgFallback: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80&auto=format&fit=crop',
  },
  {
    name: 'Airlines Plan',
    subtitle: 'Choose Subscription Duration',
    price: 'Tailored Price',
    subtitleColor: 'text-red-600',
    isAirlines: true,
    features: [
      'Volume Discount',
      'Dedicated U.S. Mailing Address',
      'FAA Compliance Guaranteed',
      'Real-Time Notification',
      'Document Scanning & Forwarding',
      'Credit Card or Wire payment',
      'Unlimited Certificates',
    ],
    cta: 'Subscribe Now',
    to: '/airlines/register',
    img: 'https://images.unsplash.com/photo-1436491865332-7a61a109db56?w=600&q=80&auto=format&fit=crop&crop=center',
    imgFallback: 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=600&q=80&auto=format&fit=crop',
  },
]

const HOW_STEPS = [
  { num: '01', title: 'Create Your Account', desc: 'Complete our secure online registration form with your personal and FAA certificate details.' },
  { num: '02', title: 'Assign Your Agent', desc: 'Designate IFOA USA as your official U.S. Agent on the FAA USAS portal using your dedicated U.S. address.' },
  { num: '03', title: 'Receive & Manage Mail', desc: 'FAA correspondence is scanned and digitally forwarded to your dashboard in real-time, wherever you are.' },
  { num: '04', title: 'Stay FAA Compliant', desc: 'Decide how to handle your physical mail. We shred or forward it internationally — your choice.' },
]

function PlanCard({ plan, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.09, duration: 0.5 }}
      className="flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
    >
      <div className="relative h-44 overflow-hidden bg-gray-100">
        <img
          src={plan.img}
          alt={plan.name}
          className="w-full h-full object-cover"
          onError={e => { e.target.onerror = null; e.target.src = plan.imgFallback }}
        />
      </div>
      <div className="flex flex-col flex-1 p-6">
        <h3 className="text-xl font-black text-gray-900 mb-1">{plan.name}</h3>
        <p className="text-2xl font-black text-gray-900 mb-1">{plan.price}</p>
        <p className={`text-sm font-bold mb-4 ${plan.subtitleColor}`}>{plan.subtitle}</p>
        <ul className="space-y-2 mb-6 flex-1">
          {plan.features.map(f => (
            <li key={f} className="text-sm text-gray-600 text-center">{f}</li>
          ))}
        </ul>
        <Link
          to={plan.to}
          className="block text-center py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all duration-200"
        >
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
      <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
        <div>
          <p className="font-bold text-gray-900 mb-1">STEP 1 — FAA IACRA Portal</p>
          <p>Register on the IACRA portal: <a href="https://iacra.faa.gov" target="_blank" rel="noreferrer" className="text-red-600 underline">https://iacra.faa.gov</a></p>
          <p className="mt-1">IACRA (Integrated Airman Certification and Rating Application) is an FAA website that allows people to apply for new Airman Certificates or to upgrade their existing certificates.</p>
          <p className="mt-1">IACRA will display your FTN (FAA Tracking Number).</p>
        </div>
        <div>
          <p className="font-bold text-gray-900 mb-1">STEP 2 — IFOA USA Portal</p>
          <p>Create your account on the IFOA USA Portal: <a href="https://theifoa-agent.com" target="_blank" rel="noreferrer" className="text-red-600 underline">https://theifoa-agent.com</a></p>
          <p className="mt-1">Register your certificates and get instant access to your secure personal dashboard to monitor any FAA correspondence received.</p>
          <p className="mt-1">Now you get your dedicated U.S. address.</p>
        </div>
        <div>
          <p className="font-bold text-gray-900 mb-1">STEP 3 — FAA USAS Portal</p>
          <p>Register your Agent for Services on the USAS portal: <a href="https://usas.faa.gov" target="_blank" rel="noreferrer" className="text-red-600 underline">usas.faa.gov</a> to complete your submission.</p>
          <p className="mt-2">You will need to provide the following information about the Agent for Service:</p>
          <ul className="list-disc list-inside space-y-1 mt-1 ml-2">
            <li>Full name</li>
            <li>U.S. address</li>
            <li>Email address</li>
            <li>A phone number</li>
          </ul>
          <p className="mt-2 italic text-gray-500">Important: You may need to use a private or public email address (e.g., Gmail, Hotmail, etc.) instead of a corporate email address.</p>
        </div>
      </div>
    ),
  },
  {
    question: 'Can I appoint a U.S. Agent for Service for my company or multiple FAA certificate holders under one entity?',
    answer: (
      <p className="text-sm text-gray-700 leading-relaxed">
        We offer tailored U.S. Agent for Service solutions for individual certificate holders and organizations. As company-level requirements can differ significantly, please contact our team directly to discuss your specific needs. We'll help determine the best service package for your unique circumstances.
      </p>
    ),
  },
  {
    question: 'How do I get my documents?',
    answer: (
      <div className="text-sm text-gray-700 leading-relaxed space-y-2">
        <p>All FAA-related documents received at your U.S. address will be digitally scanned and uploaded to a secure online dashboard within one business day.</p>
        <p>You will receive real-time email notifications, so you can respond quickly and avoid missing important FAA communications.</p>
        <p>After digital delivery, you can choose whether to have the original physical documents securely shredded or forwarded internationally (extra costs).</p>
      </div>
    ),
  },
  {
    question: 'What is IACRA and FTN Number',
    answer: (
      <div className="text-sm text-gray-700 leading-relaxed space-y-4">
        <div>
          <p className="font-bold text-gray-900 mb-1">What is the FTN number?</p>
          <p>An FTN number (FAA Tracking Number) is a unique ID assigned to you when you register in the FAA's IACRA system.</p>
          <p className="mt-1">It stays the same for your entire aviation career and is used to keep track of all your FAA applications, tests, and certificates.</p>
          <p className="mt-1">You need your FTN when scheduling FAA knowledge exams (like the Aircraft Dispatcher test) and when filling out forms in IACRA.</p>
        </div>
        <div>
          <p className="font-bold text-gray-900 mb-1">What is the IACRA?</p>
          <p>The FAA IACRA, or Integrated Airman Certification and Rating Application, is an online system used by the Federal Aviation Administration to manage the certification process for airmen.</p>
          <p className="mt-1">It allows applicants to apply for certificates and ratings, verifies their identity and qualifications, and enables instructors, examiners, and FAA representatives to process and track applications electronically.</p>
          <p className="mt-1">IACRA helps ensure regulatory compliance while streamlining the entire certification workflow.</p>
        </div>
      </div>
    ),
  },
  {
    question: 'What will happen if I do not respect the Deadlines?',
    answer: (
      <div className="text-sm text-gray-700 leading-relaxed space-y-4">
        <div>
          <p className="font-bold text-gray-900 mb-1">For Current Certificate Holders:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Suspension of Privileges: Your FAA certificate remains valid, but you cannot exercise its privileges until you appoint a U.S. Agent for Service.</li>
            <li>Inactive Aircraft Registration: Your aircraft registration stays active but cannot be used operationally until a U.S. Agent for Service is designated.</li>
          </ul>
        </div>
        <div>
          <p className="font-bold text-gray-900 mb-1">For New Applicants:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Certification Delays: You cannot complete FAA certification processes without officially naming a U.S. Agent for Service on your application.</li>
          </ul>
        </div>
      </div>
    ),
  },
]

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-5 text-left bg-white hover:bg-gray-50 transition-colors duration-200"
      >
        <span className="font-bold text-gray-900 text-sm pr-4">{item.question}</span>
        <span className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ease-in-out ${isOpen ? 'rotate-45 border-red-600 bg-red-50' : 'border-gray-300'}`}>
          <svg className={`w-3.5 h-3.5 transition-colors duration-200 ${isOpen ? 'text-red-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>
      <div style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.32s cubic-bezier(0.4,0,0.2,1)' }}>
        <div style={{ overflow: 'hidden' }}>
          <div className="px-6 pb-6 bg-white border-t border-gray-100">
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
    <section className="py-20 px-6 bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_1.6fr] gap-14 items-start">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h2 className="text-4xl font-black text-gray-900 mb-4">Frequently Asked<br />Questions</h2>
          <p className="text-gray-600 leading-relaxed mb-3">All You Need to Know About Appointing an FAA U.S. Agent for Service with IFOA USA.</p>
          <p className="text-gray-600 leading-relaxed">Still have questions? No worries, reach out! We are happy to help you find the answers you need.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }} className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem key={i} item={item} isOpen={openIndex === i} onToggle={() => toggle(i)} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative h-[92vh] min-h-[560px] flex items-center overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=1900&q=85&auto=format&fit=crop&crop=center"
          alt="Aviation"
          className="absolute inset-0 w-full h-full object-cover object-center"
          onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1436491865332-7a61a109db56?w=1900&q=80&auto=format&fit=crop' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 w-full">
          <motion.div className="max-w-2xl">
            <motion.div className="inline-flex items-center rounded-full px-4 py-1.5 mb-6 bg-white/5 backdrop-blur-md border border-white/10 shadow-sm">
              <span className="text-white/80 text-xs font-medium tracking-wide">U.S. Agent for Service — FAA Compliant</span>
            </motion.div>
            <motion.h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 tracking-tight">
              Your US Agent<br />
              <span className="bg-gradient-to-r text-white bg-clip-text text-transparent">For Service</span>
            </motion.h1>
            <motion.p className="text-lg text-gray-300 mb-4 max-w-xl leading-relaxed">
              You focus on flying and flight planning —<span className="text-white font-semibold"> we handle compliance & documentation.</span>
            </motion.p>
            <motion.p className="text-white/90 font-semibold text-base mb-10">
              <span className="text-red-400">$69/year</span>
              <span className="mx-2 text-white/40">•</span>
              <span className="text-red-400">$299 lifetime</span>
            </motion.p>
            <motion.div className="flex flex-wrap gap-4">
              <Link to="/individual/register"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-all duration-200 shadow-lg shadow-red-900/30">
                Individual Registration
              </Link>
              <Link to="/airlines/register"
                className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/40 text-white font-medium px-8 py-3.5 rounded-xl text-base transition-all duration-200 backdrop-blur-md">
                ✈ Airlines Plan
              </Link>
              <a href="#how-it-works"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white font-medium px-6 py-3 rounded-xl text-base transition-all duration-200 underline underline-offset-4">
                How It Works →
              </a>
            </motion.div>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-white/40 text-xs tracking-widest uppercase">Scroll</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} className="w-px h-8 bg-white/30" />
        </motion.div>
      </section>

      {/* ── WHO WE ARE ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p className="text-red-600 text-xs font-bold uppercase tracking-widest mb-3">About Our Service</p>
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
              <Link to="/individual/register"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-7 py-3 rounded-xl text-sm transition-all duration-200 shadow-sm">
                Individual Register
              </Link>
              <Link to="/airlines/register"
                className="inline-flex items-center gap-2 bg-red-600/10 hover:bg-red-600/20 border border-red-200 text-red-700 font-semibold px-7 py-3 rounded-xl text-sm transition-all duration-200">
                ✈ Airlines Register
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

      {/* ── STAMP ── */}
      <section className="py-20 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
            <div className="flex-shrink-0 w-full md:w-[380px]">
              <img src={classicStamp} alt="IFOA USA stamp" className="w-full h-auto object-contain rounded-2xl" />
            </div>
            <div className="flex-1">
              <p className="text-gray-700 text-base leading-relaxed mb-5">
                Whether you are an <strong>FAA-Certified Pilot</strong> or <strong>Part 65 Aircraft Dispatcher</strong> based outside the United States, meeting FAA regulatory requirements should not complicate your operations.
              </p>
              <p className="text-gray-700 text-base leading-relaxed mb-5">
                Our <strong>Daytona Beach</strong> team ensures your FAA correspondence and regulatory notices are handled promptly and professionally, allowing you to concentrate fully on your primary responsibilities.
              </p>
              <p className="text-gray-700 text-base leading-relaxed">
                Trust us to simplify your FAA compliance so you can stay focused on what you <strong>DO BEST</strong> and what <strong>YOU LOVE THE MOST.</strong>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SUBSCRIPTION PLANS ── */}
      <section id="pricing" className="py-20 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Subscription Plans</h2>
            </div>
            <div className="h-0.5 w-full bg-gray-200 rounded-full" />
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan, i) => <PlanCard key={plan.name} plan={plan} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── AIRLINES DEAL BANNER ── */}
      <section className="py-16 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="relative rounded-3xl overflow-hidden min-h-[220px] flex">
            <div className="relative z-10 bg-black flex flex-col justify-center px-10 py-10 w-full md:w-1/2">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 leading-tight">Enjoy the Airlines Deal!</h2>
              <p className="text-gray-300 text-sm mb-2 leading-relaxed">Are you an Operator with more than 3 FAA Certificate Holders?</p>
              <p className="text-gray-400 text-sm mb-7 leading-relaxed">Subscribe for the Airlines Plan Now</p>
              <Link to="/airlines/register"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all duration-200 w-fit">
                Go to Airlines Plan
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0-5 5m5-5H6" /></svg>
              </Link>
            </div>
            <div className="hidden md:block md:w-1/2 relative">
              <img
                src="https://images.unsplash.com/photo-1559178772-c8e4ef8c5f80?w=900&q=85&auto=format&fit=crop&crop=center"
                alt="Aircraft cockpit"
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=900&q=80&auto=format&fit=crop' }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-950/40 to-transparent" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-14">
            <p className="text-red-600 text-xs font-bold uppercase tracking-widest mb-3">Process</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">How to Appoint IFOA USA<br />as Your Agent for Service</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {HOW_STEPS.map((s, i) => (
              <motion.div key={s.num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-white rounded-2xl border border-gray-200 px-7 py-8 hover:border-red-200 hover:shadow-md transition-all duration-200">
                <span className="block text-5xl font-black text-red-100 mb-4 leading-none select-none">{s.num}</span>
                <h3 className="text-base font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPLIANCE ── */}
      <section className="bg-gray-50 py-20 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-14">
            <p className="text-red-600 text-xs font-bold uppercase tracking-widest mb-3">Regulation</p>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-4">
              Why and Who Needs a FAA<br />Agent for Service?
            </h2>
          </motion.div>
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <p className="text-gray-600 leading-relaxed mb-6 text-base">
                Recent updates to FAA Compliance Requirements now mandate that individuals and businesses holding FAA Certificates with a permanent address outside the United States must designate a U.S. Agent for Service, as outlined in{' '}
                <strong className="text-gray-900">14 CFR Part 3, Subpart C</strong> and{' '}
                <strong className="text-gray-900">FAA Advisory Circular AC 3-1</strong>.
              </p>
              <ul className="space-y-3 mb-8">
                {['FAA-Certificated Pilots (Part 61)', 'Aircraft Mechanics & Dispatchers (Part 65)', 'Flight & Ground Instructors', 'Aircraft Owners (Part 47)', 'Aviation Businesses (Part 107)'].map(item => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                    <span className="text-gray-700 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-gray-600 leading-relaxed text-sm">
                An Agent for Service is a representative (entity or an individual who is 18 or older) with a U.S. address designated by a certificate holder to receive official FAA correspondence, legal notices, and other critical communications on his/her behalf.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }} className="flex flex-col gap-6">
              <div>
                <p className="text-red-600 text-xs font-bold uppercase tracking-widest mb-4">Consequences</p>
                <h3 className="text-2xl font-black text-gray-900 mb-6">What If You Miss the Deadline?</h3>
                <div className="space-y-4">
                  <div className="border-l-4 border-gray-900 pl-5 py-1">
                    <p className="font-bold text-gray-900 mb-1">Current Certificate Holders</p>
                    <p className="text-sm text-gray-600 leading-relaxed">Your FAA certificate remains valid, but you cannot exercise its privileges until you appoint a U.S. Agent for Service.</p>
                  </div>
                  <div className="border-l-4 border-gray-900 pl-5 py-1">
                    <p className="font-bold text-gray-900 mb-1">New Applicants</p>
                    <p className="text-sm text-gray-600 leading-relaxed">You cannot complete FAA certification processes without officially naming a U.S. Agent for Service on your application.</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link to="/individual/register"
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-7 py-3.5 rounded-xl text-sm transition-all duration-200 shadow-md">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Register as Individual
                </Link>
                <Link to="/airlines/register"
                  className="inline-flex items-center gap-2 border border-gray-300 hover:border-red-400 hover:bg-red-50 text-gray-700 font-semibold px-7 py-3.5 rounded-xl text-sm transition-all duration-200">
                  ✈ Airlines Plan
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <FAQSection />

      {/* ── HOW TO APPOINT ── */}
      <section className="py-20 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-4">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-2">How to Appoint IFOA USA as Agent for Service</h2>
            <p className="text-gray-500 text-base mb-10">Once your account is created with us, managing your FAA compliance is effortless, reliable, secure, and without hidden fees.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 border border-gray-200 rounded-2xl overflow-hidden" style={{ gridTemplateRows: 'auto 1fr' }}>
            {[
              { icon: <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, step: '1. Create Your Account', desc: 'Create your account and get instant access to your secure personal dashboard, where you can monitor any FAA correspondence received. We will provide you with a dedicated U.S. address.' },
              { icon: <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 11l2 2 4-4" /></svg>, step: '2. Assign Your Agent for Service', desc: 'Designate IFOA USA as your official U.S. Registered Agent on the FAA website. You will receive a dedicated U.S. address, which you can use to update your FAA records and ensure all official documents reach you.' },
              { icon: <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>, step: '3. Receive & Manage Mails', desc: 'Any FAA correspondence sent to your assigned U.S. address will be scanned and digitally forwarded to your dashboard or email, keeping you informed in real-time, no matter where you are.' },
              { icon: <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, step: '4. Decide How to Handle Your Mails', desc: 'You decide what you would like us to do with your FAA correspondence. We can securely shred it for you or forward the physical mail for you (extra costs), which is critical for items such as FAA certificates.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex flex-col border-r last:border-r-0 border-gray-200">
                <div className="bg-black flex flex-col items-center justify-center py-8 px-6 gap-3 h-[160px]">
                  {item.icon}
                  <h3 className="text-white font-bold text-center text-sm leading-snug">{item.step}</h3>
                </div>
                <div className="p-6 bg-white flex-1">
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LESS THAN $70 / VIDEO ── */}
      <section className="py-20 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2 className="text-4xl sm:text-5xl font-black text-red-500 mb-6">Less Than $70 Per Year</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You can choose one affordable payment of <strong>$69 per year,</strong> or even <strong>$299 for an UNLIMITED period</strong>, with absolutely <strong>NO HIDDEN FEES</strong>, that secures your FAA compliance and peace of mind through IFOA USA as a U.S. Agent Service.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              You will gain a dedicated U.S. mailing address for FAA correspondence, instant digital forwarding of essential documents, and secure, convenient online access whenever needed.
            </p>
            <p className="text-gray-900 font-black text-xl mb-3">Do not miss this unbeatable rate!</p>
            <p className="text-gray-600 mb-8">Preregister today and lock in worry-free compliance!</p>
            <Link to="/individual/register"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-all duration-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Create Your Account
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }}>
            <div className="rounded-2xl overflow-hidden shadow-lg mb-6">
              <iframe width="100%" height="315" src="https://www.youtube.com/embed/qYtEEb3GeVM"
                title="IFOA USA - Your US Agent for Service" frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen className="w-full" />
            </div>
            <div className="space-y-4">
              {['A dedicated U.S. address for official FAA correspondence', 'Real-time unlimited digital mail forwarding so you never miss important documents'].map((point, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 border-red-500 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">{point}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── IFOA CONTACT — True FAA certificate holographic background ── */}
      <section className="relative border-t border-white/10 overflow-hidden px-6 py-20">
        {/* ── TRUE FAA CARD BACKGROUND ── */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          {/* Base: deep navy matching card's dark corner */}
          <div className="absolute inset-0 bg-[#0a1525]" />

          {/* Primary FAA card gradient: teal-green (top-left) → steel-blue (center) → navy (right) */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(135deg, #1a6b5a 0%, #1a4d7a 35%, #0f2d55 65%, #081525 100%)'
          }} />

          {/* Holographic sheen overlay — the FAA card's iridescent teal bloom */}
          <div className="absolute -top-32 -left-32 w-[700px] h-[700px] rounded-full opacity-40" style={{
            background: 'radial-gradient(ellipse at 30% 30%, #22d9a0 0%, #0fa878 20%, #0b6e87 45%, transparent 70%)'
          }} />

          {/* Secondary blue shimmer — right side card glow */}
          <div className="absolute top-0 right-0 w-[50%] h-full opacity-20" style={{
            background: 'linear-gradient(to left, #2a6fba 0%, #1a4d9a 30%, transparent 100%)'
          }} />

          {/* Silver-grey diagonal card sheen */}
          <div className="absolute inset-0 opacity-[0.06]" style={{
            background: 'linear-gradient(118deg, transparent 20%, rgba(200,220,240,0.8) 45%, rgba(180,210,230,0.4) 50%, transparent 65%)'
          }} />

          {/* Microtext grid — FAA card security pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="faaGrid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5"/>
                <circle cx="16" cy="16" r="0.5" fill="white" opacity="0.6"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#faaGrid)" />
          </svg>

          {/* Fine diagonal scan lines — card laminate effect */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            background: 'repeating-linear-gradient(108deg, transparent 0px, transparent 14px, rgba(255,255,255,0.6) 14px, rgba(255,255,255,0.6) 15px)'
          }} />

          {/* FAA globe watermark rings — bottom right, matches the globe on the card */}
          <div className="absolute bottom-[-80px] right-[2%] w-[420px] h-[420px] rounded-full border border-teal-200/15" />
          <div className="absolute bottom-[-45px] right-[2%] w-[310px] h-[310px] rounded-full border border-teal-200/10" />
          <div className="absolute bottom-[-15px] right-[2%] w-[210px] h-[210px] rounded-full border border-teal-200/[0.07]" style={{
            background: 'radial-gradient(circle at 55% 45%, rgba(0,200,160,0.06) 0%, transparent 70%)'
          }} />
          <div className="absolute bottom-[10px] right-[2%] w-[120px] h-[120px] rounded-full border border-teal-200/[0.05]" />

          {/* Silhouette plane watermark — like the card's aircraft silhouette, bottom right */}
          <svg className="absolute bottom-4 right-[14%] w-[160px] h-[90px] opacity-[0.06]" viewBox="0 0 200 120" fill="white">
            <path d="M180 55 L100 40 L60 10 L50 18 L80 45 L20 35 L10 42 L75 65 L60 110 L72 110 L90 68 L130 75 Z" />
          </svg>

          {/* Vertical holographic accent stripe */}
          <div className="absolute top-0 left-[30%] w-[1px] h-full" style={{
            background: 'linear-gradient(to bottom, transparent 0%, rgba(0,220,160,0.35) 50%, transparent 100%)',
            opacity: 0.12
          }} />

          {/* Top shimmer ribbon */}
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,220,160,0.7) 25%, rgba(100,180,255,0.5) 60%, transparent 100%)',
            opacity: 0.4
          }} />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-2">
          {/* Left: heading + logo */}
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2 className="mb-8 text-3xl font-black leading-tight text-white sm:text-4xl">
              Are You Ready to Appoint<br />Your Agent for Service?
            </h2>
            <img src={ifoaLogo} alt="IFOA USA" className="h-24 w-auto object-contain" />
          </motion.div>

          {/* Right: details + CTA */}
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }}>
            <p className="mb-8 leading-relaxed text-white/80">
              Our <strong className="text-white">Daytona Beach</strong> office ensures fast and efficient handling and forwarding of our customers' mail.
            </p>
            <div className="mb-8 space-y-4">
              {[
                { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>, label: 'IFOA USA Corp, 1616 Concierge Blvd Suite 100 (1st Floor), Daytona Beach, FL 32117, USA' },
                { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>, label: 'agent@theifoa.com', href: 'mailto:agent@theifoa.com' },
                { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>, label: '+1 508 838 5880', href: 'tel:+15088385880' },
              ].map((row, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-300/20 bg-white/10 backdrop-blur-sm text-white">
                    {row.icon}
                  </div>
                  {row.href ? (
                    <a href={row.href} className="text-sm font-medium leading-relaxed text-white hover:text-teal-200 transition-colors self-center">{row.label}</a>
                  ) : (
                    <span className="text-sm leading-relaxed text-white/80 self-center">{row.label}</span>
                  )}
                </div>
              ))}
            </div>
            <Link to="/individual/register"
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-8 py-3.5 text-sm font-bold text-white transition-all duration-200 shadow-lg shadow-red-900/30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Sign Up Now
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-black text-gray-400 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10 mb-10">
            <div>
              <h3 className="text-white font-bold text-base mb-3">IFOA USA Corp</h3>
              <p className="text-sm leading-relaxed">Your trusted U.S. Agent for Service for FAA compliance worldwide.</p>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-widest">Contact</h3>
              <div className="space-y-1.5 text-sm">
                <p>1616 Concierge Blvd Suite 100</p>
                <p>Daytona Beach, FL 32117, USA</p>
                <p className="mt-3">agent@theifoa.com</p>
                <p>+1 508 838 5880</p>
              </div>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-widest">Quick Links</h3>
              <div className="space-y-1.5 text-sm">
                <Link to="/" className="block hover:text-white transition-colors">Home</Link>
                <Link to="/individual/register" className="block hover:text-white transition-colors">Individual Registration</Link>
                <Link to="/airlines/register" className="block hover:text-white transition-colors">Airlines Registration</Link>
                <Link to="/login" className="block hover:text-white transition-colors">Login</Link>
                <a href="https://usas.faa.gov/signin" target="_blank" rel="noreferrer" className="block hover:text-white transition-colors">FAA USAS Portal</a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 text-xs text-gray-600">
            <p>© {new Date().getFullYear()} IFOA USA Corp — International Flight Operations Academy GmbH. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
