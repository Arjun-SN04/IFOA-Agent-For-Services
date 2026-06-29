import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ifoaLogo from '../assets/IFOA_USA_white.png'
import { useAuth } from '../context/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const SUGGESTIONS = [
  'I need an FAA Agent for Service, how does it all work?',
  'How much does the service cost?',
  'Do I need to notify the FAA if I change my Agent for Service?',
  'What kind of FAA mail will go to you?',
  'How do I complete the USAS appointment?',
  'What is an IACRA FTN tracking number?',
]

const PLAN_INFO = `
IFOA (International Flight Operational Academy) — Subscription Plans:

1. TURBOPROP PLAN — $69.00/year (1 Year Subscription)
   • Dedicated U.S. Mailing Address
   • FAA Compliance Guaranteed
   • Real-Time Notification
   • Document Scanning & Forwarding
   • Yearly Payment
   • Unlimited Certificates

2. JET PLAN — $55.00/year (Up to 5 Years Subscription)
   • 20% Discount Yearly
   • Dedicated U.S. Mailing Address
   • FAA Compliance Guaranteed
   • Real-Time Notification
   • Document Scanning & Forwarding
   • One Payment for the Period
   • Unlimited Certificates

3. VIP PLAN — $299.00 ONE-TIME (Unlimited / Lifetime Subscription) ⭐ BEST VALUE
   • The Most Economic Flat Rate — Pay once, covered forever
   • Dedicated U.S. Mailing Address
   • FAA Compliance Guaranteed
   • Real-Time Notification
   • Document Scanning & Forwarding
   • One Time Lifetime Payment
   • Unlimited Certificates

4. AIRLINES PLAN — Tailored Price
   • Volume Discount for operators with 3+ FAA certificate holders
   • Dedicated U.S. Mailing Address
   • FAA Compliance Guaranteed
   • Real-Time Notification
   • Document Scanning & Forwarding
   • Credit Card (Stripe) or Wire Payment
   • Unlimited Certificates

PAYMENT INFORMATION:
   • We accept payments via Stripe (credit/debit card).
   • You can also choose "Pay Later" — submit your registration now and receive an invoice by email.
   • All card payments are secured by Stripe with 256-bit SSL encryption.
   • We do NOT accept PayPal.
`

// ── Home view (like the reference image) ─────────────────────────────────────
function HomeView({ onAsk, onViewMessages }) {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Greeting */}
      <div className="px-6 pt-8 pb-6 bg-gray-50">
        <h2 className="text-2xl font-black text-gray-900 leading-snug mb-1">
          Hi there 👋
        </h2>
        <h3 className="text-2xl font-black text-gray-900 leading-snug">
          How can we help?
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {/* Recent message card */}
        <button
          onClick={onViewMessages}
          className="w-full bg-white rounded-2xl p-4 text-left transition-all hover:shadow-md"
          style={{ border: '1px solid #e5e7eb' }}
        >
          <p className="text-xs font-bold text-gray-500 mb-3">Recent message</p>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" >
              <img src={ifoaLogo} alt="IFOA" className="h-5 w-auto object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-gray-900">IFOA Assistant</p>
                <p className="text-xs text-gray-400 flex-shrink-0 ml-2">now</p>
              </div>
              <p className="text-sm text-gray-500 truncate">
                Hi! I'm the IFOA Form Assistant. How can I help you today?
              </p>
            </div>
          </div>
        </button>

        {/* Ask a question */}
        <button
          onClick={() => onAsk('')}
          className="w-full bg-white rounded-2xl px-5 py-4 flex items-center justify-between text-left transition-all hover:shadow-md"
          style={{ border: '1px solid #e5e7eb' }}
        >
          <span className="text-sm font-bold text-gray-900">Ask a question</span>
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </button>

        {/* Search / common questions */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
          <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
            <span className="text-sm font-bold text-gray-900">Search for help</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {SUGGESTIONS.map((s, i) => (
            <button
              key={s}
              onClick={() => onAsk(s)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left transition-colors hover:bg-gray-50 group"
              style={{ borderBottom: i < SUGGESTIONS.length - 1 ? '1px solid #f3f4f6' : 'none' }}
            >
              <span className="text-sm text-gray-700 leading-snug pr-3">{s}</span>
              <svg className="w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Article view (for FAQ-style answers) ─────────────────────────────────────
function ArticleView({ title, content, onBack }) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <h2 className="text-2xl font-black text-gray-900 leading-snug mb-2">{title}</h2>
        <p className="text-xs text-gray-400 mb-6">Updated recently</p>
        <div className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{content}</div>

        <div className="mt-8 border-t border-gray-100 pt-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Related Articles</h3>
          <div className="space-y-0">
            {SUGGESTIONS.filter(s => s !== title).slice(0, 3).map(s => (
              <button
                key={s}
                className="w-full py-4 flex items-center justify-between text-left border-b border-gray-100 group hover:text-gray-900 transition-colors"
                onClick={() => onBack()}
              >
                <span className="text-sm text-gray-600 pr-3">{s}</span>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Help view — direct contact with the IFOA team ───────────────────────────────
function HelpView({ onAsk }) {
  const SUPPORT_EMAIL = 'agent@theifoa.com'
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <h2 className="text-2xl font-black text-gray-900 leading-snug mb-1">Need more help?</h2>
        <p className="text-sm text-gray-500 mb-6">Our compliance team is here to assist you with FAA Agent for Service questions.</p>

        {/* Email contact card */}
        <div className="rounded-2xl border border-gray-200 p-5 mb-4" style={{ background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Email us</p>
              <p className="text-sm font-bold text-gray-900 leading-none">Compliance Support</p>
            </div>
          </div>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=IFOA%20Agent%20for%20Service%20Enquiry`}
            className="block w-full text-center rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-bold py-3 transition-colors"
          >
            {SUPPORT_EMAIL}
          </a>
          <p className="text-[11px] text-gray-400 text-center mt-2.5">We typically reply within 1 business day.</p>
        </div>

        {/* Ask the assistant */}
        <button
          onClick={() => onAsk?.(null)}
          className="w-full flex items-center justify-between rounded-2xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm px-5 py-4 transition-all"
        >
          <div className="flex items-center gap-3 text-left">
            <svg className="w-5 h-5 text-gray-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-4 4v-4z" />
            </svg>
            <div>
              <p className="text-sm font-bold text-gray-900">Chat with the assistant</p>
              <p className="text-[11px] text-gray-400">Instant answers to common questions</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Chat view ─────────────────────────────────────────────────────────────────
function ChatView({ messages, setMessages, loading, setLoading, initialQuestion, systemContext }) {
  const [input, setInput] = useState(initialQuestion || '')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const textareaRef = useRef(null)
  const abortRef = useRef(null)
  const sentInitial = useRef(false)

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
  }, [messages])

  useEffect(() => {
    if (initialQuestion && !sentInitial.current) {
      sentInitial.current = true
      sendMessage(initialQuestion)
    } else {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [])

  const sendMessage = async (text) => {
    const msg = (text !== undefined ? text : input).trim()
    if (!msg || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = '42px'

    const history = [...messages, { role: 'user', content: msg }]
    setMessages(history)
    setLoading(true)

    try {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        signal: abortRef.current.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          systemContext: systemContext || PLAN_INFO,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Server error')

      const reply = data?.reply || "Sorry, I couldn't process that. Please try again."
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again in a moment, or contact IFOA support directly.",
        }])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const renderText = (text) =>
    text.split('\n').map((line, i, arr) => {
      const segments = line.split(/(https?:\/\/[^\s]+)/g)
      return (
        <span key={i}>
          {segments.map((seg, j) => {
            if (/^https?:\/\//.test(seg)) {
              return (
                <a key={j} href={seg} target="_blank" rel="noopener noreferrer"
                   className="text-blue-500 underline hover:text-blue-700 break-all font-medium">
                  {seg}
                </a>
              )
            }
            const parts = seg.split(/\*\*(.*?)\*\*/g)
            return parts.map((p, k) =>
              k % 2 === 1 ? <strong key={k} className="font-semibold">{p}</strong> : p
            )
          })}
          {i < arr.length - 1 && <br />}
        </span>
      )
    })

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50 min-h-0">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm" >
                <img src={ifoaLogo} alt="" className="h-4 w-auto object-contain" />
              </div>
            )}
            <div className={`max-w-[78%] px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-black text-white rounded-2xl rounded-br-sm shadow-sm'
                : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm border border-gray-200 shadow-sm'
            }`}>
              {renderText(msg.content)}
            </div>
          </motion.div>
        ))}

        {loading && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 justify-start">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0">
              <img src={ifoaLogo} alt="" className="h-4 w-auto object-contain" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-4 shadow-sm flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <motion.span
                  key={i}
                  className="block w-2 h-2 rounded-full bg-gray-400"
                  animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                />
              ))}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 pt-3 pb-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={(el) => { inputRef.current = el; textareaRef.current = el }}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
            }}
            onKeyDown={handleKey}
            placeholder="Write a message…"
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition leading-relaxed"
            style={{ height: 44, maxHeight: 100 }}
            onFocus={e => { e.target.style.borderColor = '#000'; e.target.style.background = '#fff' }}
            onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb' }}
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all flex-shrink-0 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: '#000' }}
            onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#222' }}
            onMouseLeave={e => e.currentTarget.style.background = '#000'}
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V2Z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Width sizes ───────────────────────────────────────────────────────────────
const WIDTH_SIZES = [380, 480, 600]

// ── Root ChatBot component ────────────────────────────────────────────────────
export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('home') // 'home' | 'chat' | 'article'
  const [widthIndex, setWidthIndex] = useState(0)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! 👋 I'm the IFOA Assistant from International Flight Operational Academy.\n\nI can help with FAA compliance requirements, registration steps, subscription plans, pricing, certificate types, or any form questions. What would you like to know?",
    },
  ])
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const [initialQuestion, setInitialQuestion] = useState(null)
  const [articleContent, setArticleContent] = useState(null)

  const { pathname } = useLocation()
  const { user } = useAuth()
  const [heroVisible, setHeroVisible] = useState(true)
  const isRegisterPage = pathname === '/register'

  // Show on the individual/airline dashboard (bottom-left). Still hidden on auth +
  // admin pages. accountType lets the bot tailor renewal/upgrade/credit answers.
  const isDashboard = pathname.startsWith('/dashboard')
  const accountType = user?.role === 'airline' ? 'airline' : user?.role === 'individual' ? 'individual' : null
  const systemContext = PLAN_INFO + (accountType ? `\n\nLOGGED-IN ACCOUNT TYPE: ${accountType}.\n` + (accountType === 'individual'
    ? 'This is an INDIVIDUAL account: one single plan, no certificate holders, no add-ons, no volume tiers. They can upgrade a 1-Year plan to Multiple Years or Unlimited (unused-time credit applies). Tailor answers accordingly.'
    : 'This is an AIRLINE account: a base plan plus optional add-on (holder upgrade) plans, volume-tier per-certificate pricing, card or wire payment. They can upgrade the base or any add-on to Unlimited (unused-time credit applies). Tailor answers accordingly.') : '')

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/seed-admin-login' ||
    pathname === '/seed-admin-signup' ||
    pathname.startsWith('/admin')

  useEffect(() => {
    setHeroVisible(true)
    setOpen(false)
    const timer = setTimeout(() => {
      const hero = document.querySelector('[data-hero]')
      if (!hero) { setHeroVisible(false); return }
      const observer = new IntersectionObserver(
        ([entry]) => {
          setHeroVisible(entry.isIntersecting)
          if (entry.isIntersecting) setOpen(false)
        },
        { threshold: 0.05 }
      )
      observer.observe(hero)
      return () => observer.disconnect()
    }, 50)
    return () => clearTimeout(timer)
  }, [pathname])

  useEffect(() => { if (open) setUnread(0) }, [open])
  useEffect(() => {
    if (!open && messages.length > 1 && messages[messages.length - 1].role === 'assistant') {
      setUnread(n => n + 1)
    }
  }, [messages])

  const handleAsk = (q) => {
    setInitialQuestion(q || null)
    setView('chat')
  }

  const handleViewMessages = () => {
    setInitialQuestion(null)
    setView('chat')
  }

  const currentWidth = WIDTH_SIZES[widthIndex]

  const cycleWidth = () => {
    setWidthIndex(i => (i + 1) % WIDTH_SIZES.length)
  }

  // On the dashboard there is no hero section — show immediately. Elsewhere, gate on hero.
  if (isAuthPage || (heroVisible && !isDashboard)) return null

  // Bottom tabs
  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill={view === 'home' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={view === 'home' ? 0 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'chat',
      label: 'Messages',
      icon: (
        <svg className="w-5 h-5" fill={view === 'chat' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={view === 'chat' ? 0 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4v-4z" />
        </svg>
      ),
    },
    {
      id: 'help',
      label: 'Help',
      icon: (
        <svg className="w-5 h-5" fill={(view === 'help' || view === 'article') ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={(view === 'help' || view === 'article') ? 0 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[40]">
      {/* FAB */}
      <AnimatePresence mode="wait">
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => setOpen(true)}
            className="relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center"
            style={{
              background: isRegisterPage ? '#ffffff' : '#000',
              color: isRegisterPage ? '#000000' : '#ffffff',
              border: isRegisterPage ? '1px solid #d1d5db' : 'none',
              boxShadow: isRegisterPage ? '0 8px 30px rgba(0,0,0,0.22)' : '0 8px 32px rgba(0,0,0,0.35)'
            }}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4v-4z" />
            </svg>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                {unread}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-0 right-0 bg-white rounded-2xl overflow-hidden flex flex-col max-w-[calc(100vw-32px)] sm:max-w-[calc(100vw-48px)] max-h-[calc(100vh-90px)] sm:max-h-[calc(100vh-120px)]"
            style={{
              width: currentWidth,
              height: 620,
              boxShadow: '0 24px 80px rgba(0,0,0,0.20), 0 4px 16px rgba(0,0,0,0.10)',
              border: '1px solid #e5e7eb',
              transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), height 0.25s cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" >
                  <img src={ifoaLogo} alt="IFOA" className="h-6 w-auto object-contain" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 leading-none">IFOA Assistant</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-none">International Flight Operational Academy · FAA Compliance</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Width toggle */}
                <button
                  onClick={cycleWidth}
                  title={`Width: ${currentWidth}px — click to resize`}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                >
                  {widthIndex === WIDTH_SIZES.length - 1 ? (
                    /* Compress icon */
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                    </svg>
                  ) : (
                    /* Expand icon */
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                  )}
                </button>

                {/* Back (when in non-home view) */}
                {view !== 'home' && (
                  <button
                    onClick={() => setView('home')}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}

                {/* Close */}
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* View content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {view === 'home' && (
                <HomeView
                  onAsk={handleAsk}
                  onViewMessages={handleViewMessages}
                />
              )}
              {view === 'chat' && (
                <ChatView
                  messages={messages}
                  setMessages={setMessages}
                  loading={loading}
                  setLoading={setLoading}
                  initialQuestion={initialQuestion}
                  systemContext={systemContext}
                />
              )}
              {view === 'article' && articleContent && (
                <ArticleView
                  title={articleContent.title}
                  content={articleContent.content}
                  onBack={() => setView('home')}
                />
              )}
              {view === 'help' && (
                <HelpView onAsk={handleAsk} />
              )}
            </div>

            {/* Bottom tab bar */}
            <div className="flex-shrink-0 border-t border-gray-100 bg-white">
              <div className="flex items-center">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === 'home') setView('home')
                      else if (tab.id === 'chat') { setInitialQuestion(null); setView('chat') }
                      else if (tab.id === 'help') { setView('help') }
                    }}
                    className="flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors relative"
                    style={{ color: (view === tab.id || (tab.id === 'help' && (view === 'help' || view === 'article')) || (tab.id === 'home' && view === 'home')) ? '#111827' : '#9ca3af' }}
                  >
                    {(view === tab.id || (tab.id === 'help' && (view === 'help' || view === 'article')) || (tab.id === 'home' && view === 'home')) && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gray-900" />
                    )}
                    {tab.icon}
                    <span className="text-[10px] font-bold tracking-wide">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
