import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import ifoaLogo from '../../assets/IFOA_USA_blanc_V.png'

export default function Footer() {
  return (
    <>
      {/* ── IFOA CONTACT CTA ── */}
      <section className="relative border-t border-white/10 overflow-hidden px-6 py-20">
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <div className="absolute inset-0 bg-[#0a1525]" />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #1a6b5a 0%, #1a4d7a 35%, #0f2d55 65%, #081525 100%)' }}
          />
          <div
            className="absolute -top-32 -left-32 w-[700px] h-[700px] rounded-full opacity-40"
            style={{ background: 'radial-gradient(ellipse at 30% 30%, #22d9a0 0%, #0fa878 20%, #0b6e87 45%, transparent 70%)' }}
          />
          <div
            className="absolute top-0 right-0 w-[50%] h-full opacity-20"
            style={{ background: 'linear-gradient(to left, #2a6fba 0%, #1a4d9a 30%, transparent 100%)' }}
          />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{ background: 'linear-gradient(118deg, transparent 20%, rgba(200,220,240,0.8) 45%, rgba(180,210,230,0.4) 50%, transparent 65%)' }}
          />
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="faaGrid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
                <circle cx="16" cy="16" r="0.5" fill="white" opacity="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#faaGrid)" />
          </svg>
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{ background: 'repeating-linear-gradient(108deg, transparent 0px, transparent 14px, rgba(255,255,255,0.6) 14px, rgba(255,255,255,0.6) 15px)' }}
          />
          <div className="absolute bottom-[-80px] right-[2%] w-[420px] h-[420px] rounded-full border border-teal-200/15" />
          <div className="absolute bottom-[-45px] right-[2%] w-[310px] h-[310px] rounded-full border border-teal-200/10" />
          <div
            className="absolute bottom-[-15px] right-[2%] w-[210px] h-[210px] rounded-full border border-teal-200/[0.07]"
            style={{ background: 'radial-gradient(circle at 55% 45%, rgba(0,200,160,0.06) 0%, transparent 70%)' }}
          />
          <div className="absolute bottom-[10px] right-[2%] w-[120px] h-[120px] rounded-full border border-teal-200/[0.05]" />
          <svg
            className="absolute bottom-4 right-[14%] w-[160px] h-[90px] opacity-[0.06]"
            viewBox="0 0 200 120"
            fill="white"
          >
            <path d="M180 55 L100 40 L60 10 L50 18 L80 45 L20 35 L10 42 L75 65 L60 110 L72 110 L90 68 L130 75 Z" />
          </svg>
          <div
            className="absolute top-0 left-[30%] w-[1px] h-full"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, rgba(0,220,160,0.35) 50%, transparent 100%)',
              opacity: 0.12,
            }}
          />
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(0,220,160,0.7) 25%, rgba(100,180,255,0.5) 60%, transparent 100%)',
              opacity: 0.4,
            }}
          />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-8 text-3xl font-black leading-tight text-white sm:text-4xl">
              Are You Ready to Appoint<br />Your Agent for Service?
            </h2>
            <img src={ifoaLogo} alt="IFOA USA" className="h-24 w-auto object-contain" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <p className="mb-8 leading-relaxed text-white/80">
              Our <strong className="text-white">Daytona Beach</strong> office ensures fast and efficient
              handling and forwarding of our customers' mail.
            </p>

            <div className="mb-8 space-y-4">
              {[
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  ),
                  label: 'IFOA USA Corp, 1616 Concierge Blvd Suite 100 (1st Floor), Daytona Beach, FL 32117, USA',
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  ),
                  label: 'agent@theifoa.com',
                  href: 'mailto:agent@theifoa.com',
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  ),
                  label: '+1 508 838 5880',
                  href: 'tel:+15088385880',
                },
              ].map((row, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-300/20 bg-white/10 backdrop-blur-sm text-white">
                    {row.icon}
                  </div>
                  {row.href ? (
                    <a
                      href={row.href}
                      className="text-sm font-medium leading-relaxed text-white hover:text-teal-200 transition-colors self-center"
                    >
                      {row.label}
                    </a>
                  ) : (
                    <span className="text-sm leading-relaxed text-white/80 self-center">{row.label}</span>
                  )}
                </div>
              ))}
            </div>

            <Link
              to="/individual/register"
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-8 py-3.5 text-sm font-bold text-white transition-all duration-200 shadow-lg shadow-red-900/30"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Sign Up Now
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER BAR ── */}
      <footer className="bg-black text-gray-400 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10 mb-10">
            {/* Brand */}
            <div>
              <img src={ifoaLogo} alt="IFOA USA" className="h-14 w-auto object-contain mb-4" />
              <h3 className="text-white font-bold text-base mb-2">IFOA USA Corp</h3>
              <p className="text-sm leading-relaxed">
                Your trusted U.S. Agent for Service for FAA compliance worldwide.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-widest">Contact</h3>
              <div className="space-y-1.5 text-sm">
                <p>1616 Concierge Blvd Suite 100</p>
                <p>Daytona Beach, FL 32117, USA</p>
                <p className="mt-3">
                  <a href="mailto:agent@theifoa.com" className="hover:text-white transition-colors">
                    agent@theifoa.com
                  </a>
                </p>
                <p>
                  <a href="tel:+15088385880" className="hover:text-white transition-colors">
                    +1 508 838 5880
                  </a>
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-widest">Quick Links</h3>
              <div className="space-y-1.5 text-sm">
                <Link to="/" className="block hover:text-white transition-colors">Home</Link>
                <Link to="/individual/register" className="block hover:text-white transition-colors">
                  Individual Registration
                </Link>
                <Link to="/airlines/register" className="block hover:text-white transition-colors">
                  Airlines Registration
                </Link>
                <Link to="/login" className="block hover:text-white transition-colors">Login</Link>
                <a
                  href="https://usas.faa.gov/signin"
                  target="_blank"
                  rel="noreferrer"
                  className="block hover:text-white transition-colors"
                >
                  FAA USAS Portal
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 text-xs text-gray-600">
            <p>
              © {new Date().getFullYear()} IFOA USA Corp — International Flight Operations Academy GmbH.
              All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}
