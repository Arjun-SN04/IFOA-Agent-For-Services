/**
 * AdminSupportPage.jsx  — /admin/support
 *
 * Admin live-chat console. Left: conversation list with Individuals / Airlines
 * tabs (each row shows the name, last message, time + unread badge). Right: the
 * selected conversation thread with a reply composer. Real-time via Socket.IO.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { getSocket } from '../../services/socket'
import {
  getSupportConversations,
  getSupportConversation,
  sendSupportReply,
  markSupportConvRead,
} from '../../services/api'

const fmtTime = (d) => {
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  const now = new Date()
  const sameDay = dt.toDateString() === now.toDateString()
  return sameDay
    ? dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const initials = (name) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

export default function AdminSupportPage() {
  const [tab, setTab] = useState('individual') // 'individual' | 'airline'
  const [conversations, setConversations] = useState([])
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [userTyping, setUserTyping] = useState(false)
  const scrollRef = useRef(null)
  const activeIdRef = useRef(null)
  const typingTimer = useRef(null)

  useEffect(() => { activeIdRef.current = activeId }, [activeId])

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    })
  }, [])

  // Upsert a conversation summary into the list, keeping newest-activity first.
  const upsertConversation = useCallback((summary) => {
    setConversations(prev => {
      const idx = prev.findIndex(c => String(c._id) === String(summary._id))
      const next = idx === -1 ? [summary, ...prev] : prev.map((c, i) => (i === idx ? { ...c, ...summary } : c))
      return next.sort((a, b) => new Date(b.lastMessageAt || b.updatedAt || 0) - new Date(a.lastMessageAt || a.updatedAt || 0))
    })
  }, [])

  // ── Load list ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true
    setLoadingList(true)
    getSupportConversations()
      .then(res => { if (active) setConversations(res.data?.data || []) })
      .catch(() => { })
      .finally(() => { if (active) setLoadingList(false) })
    return () => { active = false }
  }, [])

  // ── Socket wiring ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onMessage = ({ conversationId, message }) => {
      if (String(conversationId) === String(activeIdRef.current)) {
        setMessages(prev => (prev.some(m => m._id === message._id) ? prev : [...prev, message]))
        if (message.senderRole === 'user') {
          setUserTyping(false)
          markSupportConvRead(conversationId).catch(() => { })
          socket.emit('support:read', { conversationId })
        }
      }
    }
    const onConversation = (summary) => upsertConversation(summary)
    const onTyping = ({ conversationId, from, typing }) => {
      if (from === 'user' && String(conversationId) === String(activeIdRef.current)) setUserTyping(typing)
    }

    socket.on('support:message', onMessage)
    socket.on('support:conversation', onConversation)
    socket.on('support:typing', onTyping)
    return () => {
      socket.off('support:message', onMessage)
      socket.off('support:conversation', onConversation)
      socket.off('support:typing', onTyping)
    }
  }, [upsertConversation])

  // ── Open a conversation ───────────────────────────────────────────────────────
  const openConversation = useCallback((id) => {
    setActiveId(id)
    setLoadingThread(true)
    setUserTyping(false)
    getSupportConversation(id)
      .then(res => {
        setMessages(res.data?.data?.messages || [])
        // Clear unread locally.
        setConversations(prev => prev.map(c => (String(c._id) === String(id) ? { ...c, adminUnread: 0 } : c)))
        scrollToBottom()
      })
      .catch(() => { })
      .finally(() => setLoadingThread(false))
    const socket = getSocket()
    socket?.emit('support:read', { conversationId: id })
  }, [scrollToBottom])

  useEffect(() => { scrollToBottom() }, [messages, userTyping, scrollToBottom])

  const emitTyping = (typing) => {
    if (!activeId) return
    getSocket()?.emit('support:typing', { conversationId: activeId, typing })
  }

  const handleChange = (e) => {
    setText(e.target.value)
    emitTyping(true)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => emitTyping(false), 1500)
  }

  const send = async () => {
    const body = text.trim()
    if (!body || !activeId || sending) return
    setSending(true)
    setText('')
    emitTyping(false)
    const socket = getSocket()
    try {
      if (socket && socket.connected) {
        await new Promise((resolve, reject) => {
          socket.timeout(6000).emit('support:send', { conversationId: activeId, body }, (err, resp) => {
            if (err) return reject(err)
            if (!resp?.ok) return reject(new Error(resp?.error || 'Send failed'))
            resolve(resp)
          })
        })
      } else {
        const res = await sendSupportReply(activeId, body)
        setMessages(prev => [...prev, res.data.data])
      }
    } catch {
      try {
        const res = await sendSupportReply(activeId, body)
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

  const counts = useMemo(() => {
    const c = { individual: 0, airline: 0 }
    for (const conv of conversations) {
      if (conv.adminUnread > 0) c[conv.role] = (c[conv.role] || 0) + 1
    }
    return c
  }, [conversations])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return conversations
      .filter(c => c.role === tab)
      .filter(c => !q || `${c.name} ${c.email}`.toLowerCase().includes(q))
  }, [conversations, tab, search])

  const activeConv = conversations.find(c => String(c._id) === String(activeId))

  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => setTab(id)}
      className={`relative flex-1 px-4 py-2.5 text-sm font-bold rounded-lg transition ${tab === id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
    >
      {label}
      {counts[id] > 0 && (
        <span className="absolute top-1.5 right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[9px] leading-[16px] font-black">
          {counts[id] > 9 ? '9+' : counts[id]}
        </span>
      )}
    </button>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-116px)] sm:h-[calc(100vh-156px)] overflow-hidden">
      <div className="mb-5 flex-shrink-0">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Support</h1>
        <p className="text-sm text-slate-500 mt-0.5">Live chat with airlines and individuals.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 flex-1 min-h-0">
        {/* ── List column ── */}
        <div className={`flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden ${activeId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-3 border-b border-slate-100 space-y-3">
            <div className="flex gap-1.5 bg-slate-50 rounded-xl p-1">
              <TabBtn id="individual" label="Individuals" />
              <TabBtn id="airline" label="Airlines" />
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
            />
          </div>
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {loadingList && (
              <div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-slate-600 animate-spin" /></div>
            )}
            {!loadingList && filtered.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-10">No conversations yet.</p>
            )}
            {filtered.map(c => {
              const active = String(c._id) === String(activeId)
              return (
                <button
                  key={c._id}
                  onClick={() => openConversation(c._id)}
                  className={`w-full text-left px-3 py-3 flex items-center gap-3 border-b border-slate-50 transition ${active ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                >
                  <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-black bg-slate-900">
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate">{c.name || 'Unknown'}</p>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{fmtTime(c.lastMessageAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500 truncate">
                        {c.lastSenderRole === 'admin' && <span className="text-slate-400">You: </span>}
                        {c.lastMessageBody || 'No messages yet'}
                      </p>
                      {c.adminUnread > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] font-black text-center flex-shrink-0">
                          {c.adminUnread > 9 ? '9+' : c.adminUnread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Thread column ── */}
        <div className={`flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden ${activeId ? 'flex' : 'hidden lg:flex'}`}>
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-4-.8L3 20l1.3-3.9A7.96 7.96 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-slate-700">Select a conversation</p>
              <p className="text-xs text-slate-400 mt-1">Choose someone from the list to start replying.</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                <button onClick={() => setActiveId(null)} className="lg:hidden w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black bg-slate-900">
                  {initials(activeConv.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{activeConv.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{activeConv.email} · {activeConv.role === 'airline' ? 'Airline' : 'Individual'}</p>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50" style={{ scrollbarWidth: 'thin' }}>
                {loadingThread && (
                  <div className="flex justify-center py-6"><div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-slate-600 animate-spin" /></div>
                )}
                {!loadingThread && messages.map(m => {
                  const mine = m.senderRole === 'admin'
                  return (
                    <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${mine ? 'bg-slate-900 text-white rounded-br-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'}`}>
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={`text-[10px] mt-1 ${mine ? 'text-white/60' : 'text-slate-400'}`}>{fmtTime(m.createdAt)}</p>
                      </div>
                    </div>
                  )
                })}
                {userTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
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
              <div className="border-t border-slate-100 p-3 bg-white">
                <div className="flex items-end gap-2">
                  <textarea
                    value={text}
                    onChange={handleChange}
                    onKeyDown={onKeyDown}
                    rows={1}
                    placeholder="Type your reply…"
                    className="flex-1 resize-none max-h-32 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100 transition"
                  />
                  <button
                    onClick={send}
                    disabled={!text.trim() || sending}
                    className="w-10 h-10 flex-shrink-0 rounded-xl bg-slate-900 text-white flex items-center justify-center transition hover:bg-slate-700 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Send"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
