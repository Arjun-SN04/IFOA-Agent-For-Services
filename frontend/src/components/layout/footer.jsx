import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import ifoaLogo from '../../assets/IFOA_USA_blanc_V.png'
import ifoaLogo2 from "../../assets/IFOA_USA_white.png"

const C = {
  blue: '#0000ff',
  blueDark: '#0000cc',
  dark: '#000021',
  darkSoft: '#00002e',
}

export default function Footer() {
  const { user } = useAuth()

  return (
    <>
      {/* ── IFOA CONTACT CTA ── */}
      <section className="relative overflow-hidden px-6 py-20" style={{ borderTop: '1px solid #e5e7eb' }}>
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: '#ffffff' }} />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-8 md:gap-14 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2 className="mb-6 sm:mb-8 text-2xl font-black leading-tight sm:text-4xl" style={{ color: C.dark }}>
              Are You Ready to Appoint<br />Your Agent for Service?
            </h2>
            <div className="inline-flex items-center rounded-xl px-4 py-2" style={{ background: 'rgba(255,255,255,0.9)' }}>
              <img src={ifoaLogo2} alt="IFOA USA" className="h-14 w-auto object-contain" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }}>
            <p className="mb-8 leading-relaxed" style={{ color: '#374151' }}>
              Our <strong style={{ color: C.dark }}>Daytona Beach</strong> office ensures fast and efficient handling and forwarding of our customers' mail.
            </p>

            <div className="mb-8 space-y-4">
              {[
                {
                  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                  label: 'IFOA USA Corp, 1616 Concierge Blvd Suite 100 (1st Floor), Daytona Beach, FL 32117, USA',
                },
                {
                  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>,
                  label: 'agent@theifoa.com',
                  href: 'mailto:agent@theifoa.com',
                },
                {
                  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
                  label: '+1 508 838 5880',
                  href: 'tel:+15088385880',
                },
              ].map((row, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: C.blue, background: 'rgba(0,0,255,0.09)', border: '1px solid rgba(0,0,255,0.22)' }}>
                    {row.icon}
                  </div>
                  {row.href ? (
                    <a href={row.href} className="text-sm font-medium leading-relaxed self-center transition-colors" style={{ color: C.dark }} onMouseEnter={e => e.target.style.color = C.blue} onMouseLeave={e => e.target.style.color = C.dark}>
                      {row.label}
                    </a>
                  ) : (
                    <span className="text-sm leading-relaxed self-center" style={{ color: '#4b5563' }}>{row.label}</span>
                  )}
                </div>
              ))}
            </div>

            {!user && (
              <Link
                to="/individual/register"
                className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold text-white transition-all duration-200"
                style={{ background: C.blue, boxShadow: '0 4px 18px rgba(0,0,255,0.22)' }}
                onMouseEnter={e => { e.currentTarget.style.background = C.blueDark; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,255,0.28)' }}
                onMouseLeave={e => { e.currentTarget.style.background = C.blue; e.currentTarget.style.boxShadow = '0 4px 18px rgba(0,0,255,0.22)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Sign Up Now
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER BAR ── */}
      <footer style={{ background: '#000015', color: '#6b7280' }} className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 mb-10">
            {/* Brand */}
            <div>
              <img src={ifoaLogo} alt="IFOA USA" className="h-14 w-auto object-contain mb-4" />
              <h3 className="text-white font-bold text-base mb-2">IFOA USA Corp</h3>
              <p className="text-sm leading-relaxed">Your trusted U.S. Agent for Service for FAA compliance worldwide.</p>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-widest">Contact</h3>
              <div className="space-y-1.5 text-sm">
                <p>1616 Concierge Blvd Suite 100</p>
                <p>Daytona Beach, FL 32117, USA</p>
                <p className="mt-3">
                  <a href="mailto:agent@theifoa.com" className="transition-colors" onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = ''}>
                    agent@theifoa.com
                  </a>
                </p>
                <p>
                  <a href="tel:+15088385880" className="transition-colors" onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = ''}>
                    +1 508 838 5880
                  </a>
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-widest">Quick Links</h3>
              <div className="space-y-1.5 text-sm">
                <Link to="/" className="block transition-colors" onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = ''}>Home</Link>
                <Link to="/individual/register" className="block transition-colors" onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = ''}>Individual Registration</Link>
                <Link to="/airlines/register" className="block transition-colors" onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = ''}>Airlines Registration</Link>
                <Link to="/login" className="block transition-colors" onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = ''}>Login</Link>
                <a href="https://usas.faa.gov/signin" target="_blank" rel="noreferrer" className="block transition-colors" onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = ''}>FAA USAS Portal</a>
              </div>
            </div>
          </div>

          <div className="pt-6 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', color: '#4b5563' }}>
            <p>© {new Date().getFullYear()} IFOA USA Corp — International Flight Operations Academy GmbH. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  )
}
