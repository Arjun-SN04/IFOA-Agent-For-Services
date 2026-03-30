import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const SUGGESTIONS = [
  { label: '💰 Compare all plans', q: 'What are all the subscription plans and prices?' },
  { label: '✈️ Who needs this?', q: 'Who needs an Agent for Service?' },
  { label: '🪪 EXISTING vs NEW cert?', q: 'What is the difference between EXISTING and NEW certificate status?' },
  { label: '🔢 FAA Certificate Number?', q: 'What is an FAA Certificate Number and where do I find it?' },
  { label: '📋 What is IACRA/FTN?', q: 'What is the IACRA FTN tracking number?' },
  { label: '💳 How do I pay?', q: 'How does payment work?' },
]

// ── Pre-registration steps panel ─────────────────────────────────────────────
function PreStepsPanel({ onContinue }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 bg-gradient-to-r from-blue-700 to-blue-600 flex-shrink-0">
        <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-0.5">Before You Begin</p>
        <p className="text-sm font-bold text-white leading-snug">Complete these steps first</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">

        {/* Step 1 — IACRA */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center flex-shrink-0">1</span>
            <p className="text-sm font-bold text-slate-800">FAA IACRA</p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed px-3.5 pb-2">
            Retrieve your <span className="font-semibold text-slate-700">FTN Number</span> on the FAA IACRA website as a:
          </p>
          <ul className="px-3.5 pb-2 space-y-0.5">
            <li className="text-xs text-slate-600 flex items-start gap-1.5">
              <span className="text-blue-500 mt-0.5">•</span>
              <span><span className="font-semibold">NEW</span> certificate applicant, or</span>
            </li>
            <li className="text-xs text-slate-600 flex items-start gap-1.5">
              <span className="text-blue-500 mt-0.5">•</span>
              <span><span className="font-semibold">EXISTING</span> certificate holder</span>
            </li>
          </ul>
          <div className="px-3.5 pb-3.5">
            <a
              href="https://iacra.faa.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors group"
            >
              <span className="text-xs font-semibold text-blue-700">Access FAA IACRA Portal</span>
              <svg className="w-3.5 h-3.5 text-blue-500 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>

        {/* Step 2 — USAS */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center flex-shrink-0">2</span>
            <p className="text-sm font-bold text-slate-800">FAA USAS</p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed px-3.5 pb-2">
            Register <span className="font-semibold text-slate-700">IFOA</span> as your official U.S. Agent for Service with the FAA.
          </p>
          <p className="text-[11px] text-slate-400 px-3.5 pb-2 italic">
            The FAA's appointment portal (USAS) has been available since April 2, 2025.
          </p>
          <div className="px-3.5 pb-3.5">
            <a
              href="https://usas.faa.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors group"
            >
              <span className="text-xs font-semibold text-blue-700">Access FAA USAS Portal</span>
              <svg className="w-3.5 h-3.5 text-blue-500 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2">
            <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-600 text-[11px] font-black flex items-center justify-center flex-shrink-0">3</span>
            <p className="text-sm font-bold text-slate-500">Fill the IFOA Registration Form</p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed px-3.5 pb-3.5">
            Once you have your FTN and have registered in USAS, complete the IFOA form. Need help? Ask our assistant.
          </p>
        </div>

      </div>

      <div className="flex-shrink-0 border-t border-slate-100 bg-white px-4 py-3 space-y-2">
        <button
          onClick={onContinue}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-bold transition-all shadow-sm"
        >
          I'm ready — help me fill the form →
        </button>
        <p className="text-[10px] text-slate-400 text-center">IFOA AGENT FOR SERVICE</p>
      </div>
    </div>
  )
}

// ── Chat view ─────────────────────────────────────────────────────────────────
function ChatView({ messages, setMessages, loading, setLoading }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const textareaRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
  }, [messages])

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150)
  }, [])

  const sendMessage = async (text) => {
    const msg = (text || input).trim()
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
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }),
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
      const parts = line.split(/\*\*(.*?)\*\*/g)
      return (
        <span key={i}>
          {parts.map((p, j) =>
            j % 2 === 1 ? <strong key={j} className="font-semibold">{p}</strong> : p
          )}
          {i < arr.length - 1 && <br />}
        </span>
      )
    })

  const showSuggestions = messages.length <= 1

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3 bg-slate-50/60 min-h-0">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                IF
              </div>
            )}
            <div className={`max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm shadow-sm'
                : 'bg-white text-slate-800 rounded-2xl rounded-bl-sm border border-slate-100 shadow-sm'
            }`}>
              {renderText(msg.content)}
            </div>
          </motion.div>
        ))}

        {loading && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 shadow-sm">IF</div>
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3.5 shadow-sm">
              <div className="flex gap-1.5 items-center">
                {[0, 150, 300].map(delay => (
                  <span key={delay} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {showSuggestions && !loading && (
          <div className="pt-1 pl-9">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Common questions</p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.q}
                  onClick={() => sendMessage(s.q)}
                  className="text-left text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl px-3 py-2 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 border-t border-slate-100 bg-white px-3 pt-2 pb-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={(el) => { inputRef.current = el; textareaRef.current = el }}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'
            }}
            onKeyDown={handleKey}
            placeholder="Ask about any form field…"
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition leading-relaxed"
            style={{ height: 42, maxHeight: 80 }}
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all flex-shrink-0 active:scale-95"
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
        <p className="text-[10px] text-slate-400 text-center mt-1.5">IFOA AGENT FOR SERVICE</p>
      </div>
    </div>
  )
}

// ── Root ChatBot component ────────────────────────────────────────────────────
export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('presteps')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! 👋 I'm the IFOA Form Assistant.\n\nBefore filling the form, make sure you've completed the FAA IACRA and USAS steps shown earlier.\n\nNow I can help you with any question about the registration form — plans, pricing, FAA certificates, or form fields. What would you like to know?",
    },
  ])
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)

  // ── Hero visibility tracking ─────────────────────────────────────────────
  // Re-run whenever the route changes so we always observe the correct hero element.
  const { pathname } = useLocation()
  const [heroVisible, setHeroVisible] = useState(true)

  // Never show chatbot on login / signup pages
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  useEffect(() => {
    // Reset: assume hero is visible on every navigation (safe default)
    setHeroVisible(true)
    setOpen(false)

    // Wait one tick so the new page's DOM has rendered
    const timer = setTimeout(() => {
      const hero = document.querySelector('[data-hero]')

      if (!hero) {
        // No hero on this page — show chatbot immediately
        setHeroVisible(false)
        return
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          // Hero is visible → hide chatbot; hero is gone → show chatbot
          setHeroVisible(entry.isIntersecting)
          if (entry.isIntersecting) setOpen(false)
        },
        { threshold: 0.05 }
      )

      observer.observe(hero)

      // Cleanup when route changes again or component unmounts
      return () => observer.disconnect()
    }, 50)

    return () => clearTimeout(timer)
  }, [pathname]) // ← re-runs on every route change, no MutationObserver needed

  useEffect(() => {
    if (open) setUnread(0)
  }, [open])

  useEffect(() => {
    if (!open && messages.length > 1 && messages[messages.length - 1].role === 'assistant') {
      setUnread(n => n + 1)
    }
  }, [messages])

  // Don't render on auth pages or while hero is visible
  if (isAuthPage || heroVisible) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {/* FAB */}
      <AnimatePresence mode="wait">
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => setOpen(true)}
            className="relative w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl shadow-blue-500/50 flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4v-4z" />
            </svg>
            <span className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-50" />
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
            className="absolute bottom-0 right-0 bg-white rounded-2xl shadow-2xl shadow-slate-900/25 border border-slate-200 overflow-hidden flex flex-col"
            style={{ width: 360, height: 560 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-700 to-blue-600 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white font-black text-xs border border-white/20">
                    IF
                  </div>
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-400 border-2 border-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-none">IFOA Assistant</p>
                  <p className="text-[11px] text-blue-200 mt-0.5">
                    {view === 'presteps' ? 'Before you start' : 'Form help · Always here'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {view === 'chat' && (
                  <button
                    onClick={() => setView('presteps')}
                    title="Pre-registration steps"
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center text-white/80 hover:text-white transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center text-white/80 hover:text-white transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* View content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {view === 'presteps' ? (
                <PreStepsPanel onContinue={() => setView('chat')} />
              ) : (
                <ChatView
                  messages={messages}
                  setMessages={setMessages}
                  loading={loading}
                  setLoading={setLoading}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
