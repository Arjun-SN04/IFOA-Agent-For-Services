/**
 * AdminSupportPage.jsx  — /admin/support
 *
 * Admin live-chat console. Left: conversation list with Individuals / Airlines
 * tabs (each row shows the name, last message, time + unread badge). Right: the
 * selected conversation thread with a reply composer. Real-time via Socket.IO.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getSocket } from '../../services/socket'
import {
  getSupportConversations,
  getSupportConversation,
  sendSupportReply,
  markSupportConvRead,
  editSupportMessage,
  deleteSupportMessage,
  deleteSupportConversation,
  sendSupportEmail,
  sendSupportBulkEmail,
} from '../../services/api'

const DEFAULT_EMAIL_SUBJECT = 'New message from IFOA USA Support'
const DEFAULT_EMAIL_BODY    = 'You have a new message from the IFOA USA support team. Please log in to your dashboard to view it.'

const fmtTime = (d) => {
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  const now = new Date()
  const sameDay = dt.toDateString() === now.toDateString()
  return sameDay
    ? dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

const initials = (name) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

function Avatar({ name, logoUrl, size = 'md' }) {
  const sz = size === 'sm' ? 'w-9 h-9 text-xs' : 'w-10 h-10 text-xs'
  if (logoUrl) {
    return (
      <div className={`${sz} rounded-full flex-shrink-0 bg-white border border-slate-200 overflow-hidden`}>
        <img src={logoUrl} alt={name} className="w-full h-full object-contain p-0.5" />
      </div>
    )
  }
  return (
    <div className={`${sz} rounded-full flex-shrink-0 flex items-center justify-center text-white font-black bg-slate-900`}>
      {initials(name)}
    </div>
  )
}

export default function AdminSupportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState('all') // 'all' | 'individual' | 'airline'
  const [conversations, setConversations] = useState([])
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [userTyping, setUserTyping] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [confirmDeleteConv, setConfirmDeleteConv] = useState(false)
  // Custom email composer
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailSubject, setEmailSubject] = useState(DEFAULT_EMAIL_SUBJECT)
  const [emailBody, setEmailBody] = useState(DEFAULT_EMAIL_BODY)
  const [emailSending, setEmailSending] = useState(false)
  const [emailStatus, setEmailStatus] = useState(null) // { ok: bool, msg: string }
  const [emailMode, setEmailMode] = useState('single') // 'single' | 'bulk'
  // List-selection for bulk email (set of conversation ids)
  const [selected, setSelected] = useState(() => new Set())
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

  // ── Notification permission ───────────────────────────────────────────────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
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

  // ── Auto-open conversation from ?conv= URL param (notification click) ────────
  useEffect(() => {
    const convId = searchParams.get('conv')
    if (!convId || loadingList || conversations.length === 0) return
    const found = conversations.find(c => String(c._id) === convId)
    if (!found) return
    setTab(found.role)
    openConversation(String(found._id))
    setSearchParams({}, { replace: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loadingList, conversations])

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
    const onConversation = (summary) => {
      upsertConversation(summary)
      if (summary.lastSenderRole === 'user' && Notification.permission === 'granted') {
        new Notification(`New message — ${summary.name || 'User'}`, {
          body: summary.lastMessageBody?.trim().slice(0, 100) || 'New message',
          icon: '/favicon.ico',
          tag: `support-${summary._id}`,
        })
      }
    }
    const onTyping = ({ conversationId, from, typing }) => {
      if (from === 'user' && String(conversationId) === String(activeIdRef.current)) setUserTyping(typing)
    }

    const onMessageEdited = ({ message }) => {
      setMessages(prev => prev.map(m => m._id === message._id ? { ...m, body: message.body, edited: true, editedAt: message.editedAt } : m))
    }
    const onMessageDeleted = ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId))
    }
    const onMessagesCleared = ({ conversationId }) => {
      if (String(conversationId) === String(activeIdRef.current)) setMessages([])
    }
    const onConversationDeleted = ({ conversationId }) => {
      setConversations(prev => prev.filter(c => String(c._id) !== String(conversationId)))
      if (String(conversationId) === String(activeIdRef.current)) {
        setActiveId(null)
        setMessages([])
      }
    }

    socket.on('support:message', onMessage)
    socket.on('support:conversation', onConversation)
    socket.on('support:typing', onTyping)
    socket.on('support:message-edited', onMessageEdited)
    socket.on('support:message-deleted', onMessageDeleted)
    socket.on('support:messages-cleared', onMessagesCleared)
    socket.on('support:conversation-deleted', onConversationDeleted)
    return () => {
      socket.off('support:message', onMessage)
      socket.off('support:conversation', onConversation)
      socket.off('support:typing', onTyping)
      socket.off('support:message-edited', onMessageEdited)
      socket.off('support:message-deleted', onMessageDeleted)
      socket.off('support:messages-cleared', onMessagesCleared)
      socket.off('support:conversation-deleted', onConversationDeleted)
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

  const deleteMsg = async (msgId) => {
    if (!activeId) return
    setMessages(prev => prev.filter(m => m._id !== msgId))
    try {
      await deleteSupportMessage(activeId, msgId)
    } catch {
      // If failed, reload messages
      getSupportConversation(activeId).then(res => setMessages(res.data?.data?.messages || [])).catch(() => {})
    }
  }

  const saveEdit = async (msgId) => {
    const body = editText.trim()
    if (!body || !activeId) return
    setEditingId(null)
    setEditText('')
    try {
      const res = await editSupportMessage(activeId, msgId, body)
      const updated = res.data.data
      setMessages(prev => prev.map(m => m._id === msgId ? { ...m, body: updated.body, edited: true, editedAt: updated.editedAt } : m))
    } catch { /* revert silently */ }
  }

  const deleteConv = async () => {
    setConfirmDeleteConv(false)
    if (!activeId) return
    const id = activeId
    setActiveId(null)
    setMessages([])
    setConversations(prev => prev.filter(c => String(c._id) !== String(id)))
    try {
      await deleteSupportConversation(id)
    } catch {
      getSupportConversations().then(res => setConversations(res.data?.data || [])).catch(() => {})
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // Open the composer for the active conversation with the default template.
  const openEmail = () => {
    setEmailMode('single')
    setEmailSubject(DEFAULT_EMAIL_SUBJECT)
    setEmailBody(DEFAULT_EMAIL_BODY)
    setEmailStatus(null)
    setEmailOpen(true)
  }

  // Open the composer for the users checked in the list.
  const openBulkEmail = () => {
    if (selected.size === 0) return
    setEmailMode('bulk')
    setEmailSubject(DEFAULT_EMAIL_SUBJECT)
    setEmailBody(DEFAULT_EMAIL_BODY)
    setEmailStatus(null)
    setEmailOpen(true)
  }

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const clearSelected = () => setSelected(new Set())

  const sendEmail = async () => {
    const body = emailBody.trim()
    if (!body || emailSending) return
    const subject = emailSubject.trim() || DEFAULT_EMAIL_SUBJECT
    setEmailSending(true)
    setEmailStatus(null)
    try {
      if (emailMode === 'bulk') {
        const ids = [...selected]
        if (!ids.length) { setEmailSending(false); return }
        const res = await sendSupportBulkEmail({ conversationIds: ids, subject, body })
        const { sent = [], failed = [] } = res.data?.data || {}
        setEmailStatus({
          ok: failed.length === 0,
          msg: failed.length === 0
            ? `Email sent to ${sent.length} user${sent.length !== 1 ? 's' : ''}.`
            : `Sent ${sent.length}, failed ${failed.length}.`,
        })
        if (failed.length === 0) {
          clearSelected()
          setTimeout(() => setEmailOpen(false), 1200)
        }
      } else {
        if (!activeId) { setEmailSending(false); return }
        await sendSupportEmail(activeId, { subject, body })
        setEmailStatus({ ok: true, msg: `Email sent to ${activeConv?.email || 'user'}.` })
        setTimeout(() => setEmailOpen(false), 1200)
      }
    } catch (err) {
      setEmailStatus({ ok: false, msg: err?.response?.data?.message || 'Failed to send email.' })
    } finally {
      setEmailSending(false)
    }
  }

  const counts = useMemo(() => {
    const c = { all: 0, individual: 0, airline: 0 }
    for (const conv of conversations) {
      if (conv.adminUnread > 0) {
        c.all += 1
        c[conv.role] = (c[conv.role] || 0) + 1
      }
    }
    return c
  }, [conversations])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return conversations
      .filter(c => tab === 'all' || c.role === tab)
      .filter(c => !q || `${c.name} ${c.email}`.toLowerCase().includes(q))
  }, [conversations, tab, search])

  const activeConv = conversations.find(c => String(c._id) === String(activeId))

  const selectedEmails = useMemo(
    () => conversations.filter(c => selected.has(c._id)).map(c => c.email).filter(Boolean),
    [conversations, selected]
  )

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
      <div className="mb-3 sm:mb-5 flex-shrink-0">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Support</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Live chat with airlines and individuals.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr] gap-3 sm:gap-4 flex-1 min-h-0">
        {/* ── List column ── */}
        <div className={`flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden ${activeId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-3 border-b border-slate-100 space-y-3">
            <div className="flex gap-1.5 bg-slate-50 rounded-xl p-1">
              <TabBtn id="all" label="All" />
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
          {selected.size > 0 && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900 text-white">
              <span className="text-xs font-bold">{selected.size} selected</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={openBulkEmail}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white text-slate-900 hover:bg-slate-100 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send mail
                </button>
                <button onClick={clearSelected} className="px-2 py-1.5 text-xs font-semibold text-white/70 hover:text-white transition">Clear</button>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {loadingList && (
              <div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-slate-600 animate-spin" /></div>
            )}
            {!loadingList && filtered.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-10">No conversations yet.</p>
            )}
            {filtered.map(c => {
              const active = String(c._id) === String(activeId)
              const checked = selected.has(c._id)
              return (
                <div
                  key={c._id}
                  className={`flex items-center border-b border-slate-50 transition ${active ? 'bg-slate-100' : checked ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                >
                  <label
                    className="pl-3 pr-1 self-stretch flex items-center cursor-pointer"
                    title="Select for email"
                    onClick={e => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelect(c._id)}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 cursor-pointer"
                    />
                  </label>
                <button
                  onClick={() => openConversation(c._id)}
                  className="flex-1 min-w-0 text-left pl-2 pr-3 py-3 flex items-center gap-3"
                >
                  <Avatar name={c.name} logoUrl={c.logoUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{c.name || 'Unknown'}</p>
                        {tab === 'all' && (
                          <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${c.role === 'airline' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {c.role === 'airline' ? 'Airline' : 'Individual'}
                          </span>
                        )}
                      </div>
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
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Thread column ── */}
        <div className={`relative flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden ${activeId ? 'flex' : 'hidden lg:flex'}`}>
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
              <div className="flex items-center gap-3 px-3 sm:px-4 py-3 border-b border-slate-100">
                <button onClick={() => setActiveId(null)} className="lg:hidden w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <Avatar name={activeConv.name} logoUrl={activeConv.logoUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">{activeConv.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{activeConv.email} · {activeConv.role === 'airline' ? 'Airline' : 'Individual'}</p>
                </div>
                {/* Send custom email to this user */}
                <button
                  onClick={() => openEmail()}
                  className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center transition"
                  title="Send email to user"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </button>
                {/* Delete entire conversation */}
                <button
                  onClick={() => setConfirmDeleteConv(true)}
                  className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition"
                  title="Delete conversation"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Confirm delete conversation modal */}
              {confirmDeleteConv && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 rounded-2xl">
                  <div className="bg-white rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full">
                    <p className="text-sm font-bold text-slate-900 mb-1">Delete conversation?</p>
                    <p className="text-xs text-slate-500 mb-5">Permanently removes this conversation and all messages for both admin and the user. Cannot be undone.</p>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setConfirmDeleteConv(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition">Cancel</button>
                      <button onClick={deleteConv} className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition">Delete</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50" style={{ scrollbarWidth: 'thin' }}>
                {loadingThread && (
                  <div className="flex justify-center py-6"><div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-slate-600 animate-spin" /></div>
                )}
                {!loadingThread && messages.map((m, i) => {
                  const mine = m.senderRole === 'admin'
                  const isEditing = editingId === m._id
                  const showSep = i === 0 || dayKey(m.createdAt) !== dayKey(messages[i - 1].createdAt)
                  return (
                    <div key={m._id}>
                    {showSep && (
                      <div className="flex items-center gap-3 my-2">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-[11px] font-medium text-slate-400 px-2">{fmtDateSep(m.createdAt)}</span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                    )}
                    <div className={`flex group items-end gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                      {/* User message action: delete only */}
                      {!mine && !isEditing && (
                        <button
                          onClick={() => deleteMsg(m._id)}
                          className="opacity-0 group-hover:opacity-100 transition w-6 h-6 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center flex-shrink-0 mb-1"
                          title="Delete message"
                        >
                          <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                      {mine && !isEditing && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition mb-1">
                          <button
                            onClick={() => { setEditingId(m._id); setEditText(m.body) }}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center flex-shrink-0"
                            title="Edit message"
                          >
                            <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2.414a2 2 0 01.586-1.414z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteMsg(m._id)}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-red-50 flex items-center justify-center flex-shrink-0"
                            title="Delete message"
                          >
                            <svg className="w-3 h-3 text-slate-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <div className={`max-w-[72%] sm:max-w-[65%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${mine ? 'bg-slate-900 text-white rounded-br-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'}`}>
                        {isEditing ? (
                          <div className="space-y-2 min-w-[180px]">
                            <textarea
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(m._id) } if (e.key === 'Escape') { setEditingId(null) } }}
                              rows={2}
                              autoFocus
                              className="w-full resize-none rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 px-2 py-1 text-sm outline-none"
                            />
                            <div className="flex gap-1.5 justify-end">
                              <button onClick={() => setEditingId(null)} className="px-2 py-0.5 text-[11px] font-semibold rounded text-white/60 hover:text-white transition">Cancel</button>
                              <button onClick={() => saveEdit(m._id)} className="px-2 py-0.5 text-[11px] font-semibold rounded bg-white/20 hover:bg-white/30 text-white transition">Save</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="whitespace-pre-wrap break-words">{m.body?.trim().replace(/\n{3,}/g, '\n\n')}</p>
                            <p className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? 'text-white/60' : 'text-slate-400'}`}>
                              {fmtTime(m.createdAt)}
                              {m.edited && <span className="italic">(edited)</span>}
                            </p>
                          </>
                        )}
                      </div>
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
              <div className="border-t border-slate-100 p-2.5 sm:p-3 bg-white">
                <div className="flex items-end gap-2">
                  <textarea
                    value={text}
                    onChange={handleChange}
                    onKeyDown={onKeyDown}
                    rows={1}
                    placeholder="Type your reply…"
                    className="flex-1 resize-none max-h-28 sm:max-h-32 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100 transition"
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

      {/* Email composer modal (page-level — works for single + bulk) */}
      {emailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-6 w-full max-w-md">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900">Send email</p>
                {emailMode === 'bulk' ? (
                  <p className="text-xs text-slate-500 mt-0.5">To: <span className="font-semibold text-slate-700">{selectedEmails.length} recipient{selectedEmails.length !== 1 ? 's' : ''}</span>{selectedEmails.length > 0 && <span className="block text-[11px] text-slate-400 truncate mt-0.5">{selectedEmails.join(', ')}</span>}</p>
                ) : (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">To: <span className="font-semibold text-slate-700">{activeConv?.email || '—'}</span></p>
                )}
              </div>
              <button onClick={() => setEmailOpen(false)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Subject</label>
            <input
              value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)}
              placeholder="Subject"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition mb-3"
            />
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Message</label>
            <textarea
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
              rows={6}
              placeholder="Write your message…"
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
            />
            {emailStatus && (
              <p className={`text-xs mt-2 font-semibold ${emailStatus.ok ? 'text-emerald-600' : 'text-red-500'}`}>{emailStatus.msg}</p>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setEmailOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition">Cancel</button>
              <button
                onClick={sendEmail}
                disabled={!emailBody.trim() || emailSending}
                className="px-4 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-700 text-white rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {emailSending ? 'Sending…' : 'Send email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
