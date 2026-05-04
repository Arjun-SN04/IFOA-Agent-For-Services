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
