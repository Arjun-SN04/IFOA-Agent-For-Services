import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.6, ease: 'easeOut' } }),
}

const PLANS = [
  {
    name: 'Turboprop Plan',
    subtitle: '1 Year Subscription',
    price: '$69',
    period: '/ year',
    features: [
      'Dedicated U.S. Mailing Address',
      'FAA Compliance Guaranteed',
      'Real-Time Notification',
      'Document Scanning & Forwarding',
      'Credit Card or Wire Payment',
      'Unlimited Certificates',
    ],
    highlight: false,
    cta: 'Subscribe Now',
    to: '/individual/register',
  },
  {
    name: 'Jet Plan',
    subtitle: '3 Year Subscription',
    price: '$149',
    period: '/ 3 years',
    badge: 'Best Value',
    features: [
      'Dedicated U.S. Mailing Address',
      'FAA Compliance Guaranteed',
      'Real-Time Notification',
      'Document Scanning & Forwarding',
      'Credit Card or Wire Payment',
      'Unlimited Certificates',
    ],
    highlight: true,
    cta: 'Subscribe Now',
    to: '/individual/register',
  },
  {
    name: 'VIP Plan',
    subtitle: 'Lifetime Subscription',
    price: '$299',
    period: 'one-time',
    features: [
      'Dedicated U.S. Mailing Address',
      'FAA Compliance Guaranteed',
      'Real-Time Notification',
      'Document Scanning & Forwarding',
      'Credit Card or Wire Payment',
      'Unlimited Certificates',
    ],
    highlight: false,
    cta: 'Subscribe Now',
    to: '/individual/register',
  },
  {
    name: 'Airlines Plan',
    subtitle: 'For Operators / Airlines',
    price: 'Tailored',
    period: 'pricing',
    badge: 'Enterprise',
    features: [
      'Volume Discount',
      'Dedicated U.S. Mailing Address',
      'FAA Compliance Guaranteed',
      'Real-Time Notification',
      'Document Scanning & Forwarding',
      'Credit Card or Wire Payment',
      'Unlimited Certificates',
      'Priority Dedicated Support',
    ],
    highlight: false,
    isAirlines: true,
    cta: '✈ Airlines Registration',
    to: '/airlines/register',
  },
]

const HOW_STEPS = [
  { num: '01', title: 'Create Your Account', desc: 'Complete our secure online registration form with your personal and FAA certificate details.' },
  { num: '02', title: 'Assign Your Agent', desc: 'Designate IFOA USA as your official U.S. Agent on the FAA USAS portal using your dedicated U.S. address.' },
  { num: '03', title: 'Receive & Manage Mail', desc: 'FAA correspondence is scanned and digitally forwarded to your dashboard in real-time, wherever you are.' },
  { num: '04', title: 'Stay FAA Compliant', desc: 'Decide how to handle your physical mail. We shred or forward it internationally — your choice.' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative h-[92vh] min-h-[560px] flex items-center overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=1900&q=85&auto=format&fit=crop&crop=center"
          alt="Aviation — dark dramatic aircraft"
          className="absolute inset-0 w-full h-full object-cover object-center"
          onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1436491865332-7a61a109db56?w=1900&q=80&auto=format&fit=crop' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 w-full">
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} className="max-w-2xl">
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}
              className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-600/20 backdrop-blur-sm px-4 py-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-blue-300 text-xs font-bold uppercase tracking-[0.2em]">U.S. Agent for Service — FAA Compliant</span>
            </motion.div>

            <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}
              className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.06] mb-6 tracking-tight">
              Your US Agent<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-300">For Service</span>
            </motion.h1>

            <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
              className="text-lg text-gray-300 mb-3 max-w-xl leading-relaxed">
              You focus on flying and flight planning —<br className="hidden sm:block" />
              <span className="text-white font-semibold">let us handle the rest.</span>
            </motion.p>

            <motion.p variants={fadeUp} initial="hidden" animate="show" custom={3}
              className="text-blue-300 font-semibold text-base mb-10">
              Only $69 per year &nbsp;·&nbsp; $299 for lifetime access
            </motion.p>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="flex flex-wrap gap-4">
              <Link to="/individual/register"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-8 py-3.5 rounded-xl text-base transition-all duration-200 shadow-lg shadow-blue-900/50">
                Individual Registration
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
              <Link to="/airlines/register"
                className="inline-flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-400/50 hover:border-blue-400 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-all duration-200 backdrop-blur-sm">
                ✈ Airlines Plan
              </Link>
              <a href="#how-it-works"
                className="inline-flex items-center gap-2 border border-white/30 hover:border-white/60 text-white font-medium px-8 py-3.5 rounded-xl text-base transition-all duration-200">
                How It Works
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
            <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">About Our Service</p>
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
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 py-3 rounded-xl text-sm transition-all duration-200 shadow-sm">
                Individual Register
              </Link>
              <Link to="/airlines/register"
                className="inline-flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-200 text-blue-700 font-semibold px-7 py-3 rounded-xl text-sm transition-all duration-200">
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

      {/* ── SUBSCRIPTION PLANS ── */}
      <section id="pricing" className="py-20 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-14">
            <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Subscription Plans</h2>
            <p className="text-gray-500 mt-2 text-sm max-w-xl">Individual plans for pilots &amp; dispatchers worldwide, and a tailored Airlines Plan for operators managing multiple certificate holders.</p>
          </motion.div>

          {/* 4-card grid — badge is now INLINE, not absolute */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.09, duration: 0.5 }}
                className={`flex flex-col p-7 ${
                  plan.isAirlines ? 'bg-gray-950 text-white'
                  : plan.highlight ? 'bg-gray-950 text-white'
                  : 'bg-white text-gray-900'
                } ${i < PLANS.length - 1 ? 'border-r border-gray-200' : ''}`}
              >
                {/* ✈ icon for Airlines card */}
                {plan.isAirlines && <div className="text-3xl mb-3">✈️</div>}

                {/* Subtitle */}
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${
                  plan.isAirlines ? 'text-blue-400' : plan.highlight ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  {plan.subtitle}
                </p>

                {/* Badge — inline below subtitle, no overlap */}
                {plan.badge && (
                  <span className="inline-flex w-fit text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide bg-blue-600 text-white mb-3">
                    {plan.badge}
                  </span>
                )}

                {/* Plan name */}
                <h3 className={`text-xl font-bold mb-4 ${plan.highlight || plan.isAirlines ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="mb-6">
                  <span className={`text-4xl font-black ${plan.highlight || plan.isAirlines ? 'text-white' : 'text-gray-900'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ml-1.5 ${plan.highlight || plan.isAirlines ? 'text-gray-400' : 'text-gray-500'}`}>
                    {plan.period}
                  </span>
                </div>

                {plan.isAirlines && (
                  <p className="text-gray-400 text-xs mb-4 leading-relaxed">
                    For operators with 3+ FAA Certificate Holders. Volume discounts and dedicated enterprise support.
                  </p>
                )}

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-start gap-2.5 text-sm ${
                      plan.highlight || plan.isAirlines ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <svg className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link to={plan.to}
                  className="block text-center py-3 text-sm font-bold rounded-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white">
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AIRLINES DEAL BANNER ── */}
      <section className="py-16 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="relative rounded-3xl overflow-hidden min-h-[220px] flex">
            <div className="relative z-10 bg-gray-950 flex flex-col justify-center px-10 py-10 w-full md:w-1/2">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 leading-tight">Enjoy the Airlines Deal!</h2>
              <p className="text-gray-300 text-sm mb-2 leading-relaxed">Are you an Operator with more than 3 FAA Certificate Holders?</p>
              <p className="text-gray-400 text-sm mb-7 leading-relaxed">Subscribe for the Airlines Plan Now</p>
              <Link to="/airlines/register"
                className="inline-flex items-center gap-2 bg-white hover:bg-blue-50 text-gray-900 font-bold px-6 py-3 rounded-xl text-sm transition-all duration-200 w-fit">
                Go to Airlines Plan
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0-5 5m5-5H6" /></svg>
              </Link>
            </div>
            <div className="hidden md:block md:w-1/2 relative">
              <img
                src="https://images.unsplash.com/photo-1436491865332-7a61a109db56?w=900&q=85&auto=format&fit=crop&crop=center"
                alt="Airline aircraft at gate"
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=900&q=80&auto=format&fit=crop' }}
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
            <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">Process</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">How to Appoint IFOA USA<br />as Your Agent for Service</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {HOW_STEPS.map((s, i) => (
              <motion.div key={s.num}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-white rounded-2xl border border-gray-200 px-7 py-8 hover:border-blue-200 hover:shadow-md transition-all duration-200">
                <span className="block text-5xl font-black text-blue-100 mb-4 leading-none select-none">{s.num}</span>
                <h3 className="text-base font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPLIANCE ── */}
      <section className="py-20 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-start">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">Regulation</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Who Needs a U.S. Agent for Service?</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Recent FAA updates now mandate that individuals and businesses holding FAA Certificates with a permanent address outside the United States must designate a U.S. Agent for Service, as outlined in <strong className="text-gray-800">14 CFR Part 3, Subpart C</strong>.
            </p>
            <div className="space-y-3">
              {['FAA-Certificated Pilots (Part 61)', 'Aircraft Mechanics & Dispatchers (Part 65)', 'Flight & Ground Instructors', 'Aircraft Owners (Part 47)', 'Aviation Businesses (Part 107)'].map(item => (
                <div key={item} className="flex items-center gap-3 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />{item}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }}>
            <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">Consequences</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">What If You Miss the Deadline?</h2>
            <div className="space-y-4">
              {[
                { title: 'Current Certificate Holders', body: 'Your FAA certificate remains valid, but you cannot exercise its privileges until you appoint a U.S. Agent for Service.' },
                { title: 'New Applicants', body: 'You cannot complete FAA certification processes without officially naming a U.S. Agent for Service on your application.' },
              ].map(item => (
                <div key={item.title} className="border-l-2 border-blue-600 pl-5">
                  <p className="font-bold text-gray-900 text-sm mb-1">{item.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/individual/register"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 py-3 rounded-xl text-sm transition-all duration-200">
                Register as Individual
              </Link>
              <Link to="/airlines/register"
                className="inline-flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-200 text-blue-700 font-semibold px-7 py-3 rounded-xl text-sm transition-all duration-200">
                ✈ Airlines Plan
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA STRIP ── */}
      <section className="bg-gray-950 py-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">No Hidden Fees</p>
            <h2 className="text-3xl font-bold text-white mb-3">Less Than $70 Per Year</h2>
            <p className="text-gray-400 text-sm max-w-xl leading-relaxed">
              One affordable payment of <span className="text-white font-semibold">$69 per year</span>, or <span className="text-white font-semibold">$299 for unlimited lifetime access</span>.
              Airlines and operators can get <span className="text-blue-400 font-semibold">volume pricing</span> through our Airlines Plan.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link to="/individual/register"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 py-3.5 rounded-xl text-sm transition-all duration-200">
              Individual Registration
            </Link>
            <Link to="/airlines/register"
              className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white font-semibold px-7 py-3.5 rounded-xl text-sm transition-all duration-200">
              ✈ Airlines Plan
            </Link>
          </div>
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
