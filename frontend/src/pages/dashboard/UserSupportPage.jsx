/**
 * UserSupportPage.jsx  — /dashboard/support
 *
 * Full-page live support chat for airline / individual users (single conversation
 * with the IFOA support team). Mirrors the admin thread view — not a floating
 * chatbot. Real-time via Socket.IO, history + fallback via REST.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { getSocket } from '../../services/socket'
import { getMySupportChat, sendMySupportMsg, markMySupportRead } from '../../services/api'
import ifoaLogo from '../../assets/IFOA_USA_white.png'

const fmtTime = (d) => {
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const fmtDateSep = (d) => {
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today - 86400000)
  const msgDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
  if (msgDay.getTime() === today.getTime()) return 'Today'
  if (msgDay.getTime() === yesterday.getTime()) return 'Yesterday'
  return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const dayKey = (d) => {
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? 'unknown' : `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`
}

const SUGGESTIONS = [
  {
    label: 'Renew my subscription',
    desc: 'Extend your current plan',
    text: 'I would like to renew my subscription. Can you help me with the process?',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    label: 'Invoice not received',
    desc: 'Resend or track invoice',
    text: 'I have not received my invoice. Can you please resend it?',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: 'Upgrade my plan',
    desc: 'Move to a higher tier',
    text: 'I would like to upgrade my current plan. What options are available?',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    label: 'Add more holders',
    desc: 'Increase seat count',
    text: 'I need to add more holder seats to my airline plan. How can I do that?',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    label: 'Payment issue',
    desc: 'Failed or missing payment',
    text: 'I am having trouble with my payment. Can you assist me?',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    label: 'Update my details',
    desc: 'Change account information',
    text: 'I need to update my account details. How can I do that?',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    label: 'Cancel my plan',
    desc: 'End current subscription',
    text: 'I would like to cancel my current subscription plan.',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
  {
    label: 'Certificate question',
    desc: 'IFOA certification help',
    text: 'I have a question regarding my IFOA certificate.',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
]

export default function UserSupportPage() {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [hoveredText, setHoveredText] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [agentTyping, setAgentTyping] = useState(false)
  const scrollRef = useRef(null)
  const typingTimer = useRef(null)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    })
  }, [])

  // Lock page scroll while chat is open (shell mb-14 would otherwise allow 56px page scroll)
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    return () => { document.documentElement.style.overflow = '' }
  }, [])

  // ── Notification permission ───────────────────────────────────────────────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // ── Load history + mark read ──────────────────────────────────────────────────
  useEffect(() => {
    let active = true
    setLoading(true)
    getMySupportChat()
      .then(res => {
        if (!active) return
        setMessages(res.data?.data?.messages || [])
        scrollToBottom()
      })
      .catch(() => { })
      .finally(() => { if (active) setLoading(false) })
    markMySupportRead().catch(() => { })
    getSocket()?.emit('support:read', {})
    return () => { active = false }
  }, [scrollToBottom])

  // ── Socket wiring ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onMessage = ({ message }) => {
      setMessages(prev => (prev.some(m => m._id === message._id) ? prev : [...prev, message]))
      if (message.senderRole === 'admin') {
        setAgentTyping(false)
        markMySupportRead().catch(() => { })
        socket.emit('support:read', {})
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('IFOA Support', {
            body: message.body?.trim().slice(0, 100) || 'New message from support',
            icon: '/favicon.ico',
            tag: 'support-admin-msg',
          })
        }
      }
    }
    const onTyping = ({ from, typing }) => { if (from === 'admin') setAgentTyping(typing) }
    const onMessageEdited = ({ message }) => {
      setMessages(prev => prev.map(m => m._id === message._id ? { ...m, body: message.body, edited: true, editedAt: message.editedAt } : m))
    }
    const onMessageDeleted = ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId))
    }
    const onMessagesCleared = () => setMessages([])

    socket.on('support:message', onMessage)
    socket.on('support:typing', onTyping)
    socket.on('support:message-edited', onMessageEdited)
    socket.on('support:message-deleted', onMessageDeleted)
    socket.on('support:messages-cleared', onMessagesCleared)
    return () => {
      socket.off('support:message', onMessage)
      socket.off('support:typing', onTyping)
      socket.off('support:message-edited', onMessageEdited)
      socket.off('support:message-deleted', onMessageDeleted)
      socket.off('support:messages-cleared', onMessagesCleared)
    }
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, agentTyping, scrollToBottom])

  const emitTyping = (typing) => getSocket()?.emit('support:typing', { typing })

  const handleChange = (e) => {
    setText(e.target.value)
    emitTyping(true)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => emitTyping(false), 1500)
  }

  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setText('')
    emitTyping(false)
    const socket = getSocket()
    try {
      if (socket && socket.connected) {
        await new Promise((resolve, reject) => {
          socket.timeout(6000).emit('support:send', { body }, (err, resp) => {
            if (err) return reject(err)
            if (!resp?.ok) return reject(new Error(resp?.error || 'Send failed'))
            resolve(resp)
          })
        })
      } else {
        const res = await sendMySupportMsg(body)
        setMessages(prev => [...prev, res.data.data])
      }
    } catch {
      try {
        const res = await sendMySupportMsg(body)
        setMessages(prev => (prev.some(m => m._id === res.data.data._id) ? prev : [...prev, res.data.data]))
      } catch {
        setText(body)
      }
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-116px)] sm:h-[calc(100vh-140px)] overflow-hidden w-full">
      {/* Two-column layout — fills full available height */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 lg:max-w-none max-w-2xl mx-auto w-full lg:mx-0">

        {/* ── Suggestions panel ── */}
        <div className="hidden lg:flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-0">
          {/* Panel header */}
          <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-900 rounded-t-2xl">
            <p className="text-xs font-bold text-white uppercase tracking-widest">Quick Questions</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Select a topic — edit if needed, then send</p>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-1" style={{ scrollbarWidth: 'thin' }}>
            {SUGGESTIONS.map((s) => {
              const active = text === s.text
              return (
                <div key={s.label} className="relative group/tip">
                  <button
                    onClick={() => { setText(text === s.text ? '' : s.text); setHoveredText(null) }}
                    onMouseEnter={() => setHoveredText(s.text)}
                    onMouseLeave={() => setHoveredText(null)}
                    className={`w-full text-left px-3.5 py-3 rounded-xl border transition-all group ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        active ? 'bg-white/15' : 'bg-slate-100 group-hover:bg-slate-200'
                      }`}>
                        <span className={active ? 'text-white' : 'text-slate-600'}>{s.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold leading-tight ${active ? 'text-white' : 'text-slate-800'}`}>{s.label}</p>
                        <p className={`text-[11px] mt-0.5 leading-tight truncate ${active ? 'text-white/60' : 'text-slate-400'}`}>{s.desc}</p>
                      </div>
                      {active && (
                        <svg className="w-3.5 h-3.5 text-white/60 flex-shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
          <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0">
            <p className="text-[10px] text-slate-400 text-center leading-relaxed">Or type your own message in the chat →</p>
          </div>
        </div>

        {/* ── Chat card ── */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-0">

          {/* Header */}
          <div className="flex-shrink-0 flex items-center gap-3.5 px-4 sm:px-5 py-3.5 border-b border-white/5"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
            {/* Avatar + online dot */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center p-1.5">
                <img src={ifoaLogo} alt="IFOA" className="w-full h-full object-contain" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0f172a]" />
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight">IFOA Support</p>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Typically replies within minutes</p>
            </div>
          </div>

          {/* Mobile suggestions — horizontal scroll chips */}
          <div className="lg:hidden flex gap-2 px-4 py-2.5 border-b border-slate-100 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => setText(text === s.text ? '' : s.text)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition whitespace-nowrap ${
                  text === s.text
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-400 text-slate-700'
                }`}
              >
                <span className={text === s.text ? 'text-white' : 'text-slate-500'}>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-7 py-6 space-y-4 bg-slate-50"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}
          >
            {loading && (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-slate-600 animate-spin" />
              </div>
            )}

            {!loading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-16">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-4-.8L3 20l1.3-3.9A7.96 7.96 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-slate-700">Start the conversation</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Pick a quick question on the left or type your own message below.
                </p>
              </div>
            )}

            {messages.map((m, i) => {
              const mine = m.senderRole === 'user'
              const showSep = i === 0 || dayKey(m.createdAt) !== dayKey(messages[i - 1].createdAt)
              return (
                <div key={m._id}>
                  {showSep && (
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-[11px] font-medium text-slate-400 px-2">{fmtDateSep(m.createdAt)}</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                  )}
                  <div className={`flex items-end gap-2.5 ${mine ? 'justify-end' : 'justify-start'}`}>
                    {!mine && (
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center flex-shrink-0 mb-0.5 p-1">
                        <img src={ifoaLogo} alt="IFOA" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className={`max-w-[76%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      mine ? 'bg-slate-900 text-white rounded-br-sm' : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-bl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap break-words">{m.body?.trim().replace(/\n{3,}/g, '\n\n')}</p>
                      <p className="text-[10px] mt-1.5 text-slate-400">{fmtTime(m.createdAt)}</p>
                    </div>
                  </div>
                </div>
              )
            })}

            {agentTyping && (
              <div className="flex items-end gap-2.5 justify-start">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center flex-shrink-0 p-1">
                  <img src={ifoaLogo} alt="IFOA" className="w-full h-full object-contain" />
                </div>
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-slate-100 bg-white px-4 sm:px-5 py-3 flex-shrink-0">
            <div className="flex items-end gap-3 w-full">
              <textarea
                value={hoveredText !== null ? hoveredText : text}
                onChange={hoveredText !== null ? undefined : handleChange}
                onKeyDown={hoveredText !== null ? undefined : onKeyDown}
                readOnly={hoveredText !== null}
                rows={1}
                placeholder="Type a message…"
                className={`flex-1 resize-none max-h-32 rounded-xl border px-4 py-3 text-sm outline-none transition leading-relaxed ${
                  hoveredText !== null
                    ? 'border-slate-300 bg-slate-100 text-slate-400 cursor-default select-none'
                    : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100'
                }`}
                style={{ scrollbarWidth: 'thin' }}
              />
              <button
                onClick={send}
                disabled={!text.trim() || sending}
                className="w-11 h-11 flex-shrink-0 rounded-xl bg-slate-900 text-white flex items-center justify-center transition hover:bg-slate-700 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Send"
              >
                {sending
                  ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
                }
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-2">Press Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  )
}
