import { useState, useEffect, useMemo, useCallback } from 'react'
import { getAllInvoices, hardDeleteInvoice, bulkHardDeleteInvoices, saveInvoiceDraftToDoc } from '../../services/api'
import { generateIFOAInvoicePDF, triggerInvoiceDownload } from '../../utils/ifoaInvoicePdf'

const fmtMoney = (n) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const toDateInput = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10)
}

const SOURCE_LABEL = { invoice: 'Invoice', payment: 'Payment', renewal: 'Renewal' }

// Build the PDF-ready invoice object from a list row (prefers its saved draft).
const buildInvObject = (row) => (
  row.draft && Object.keys(row.draft).length
    ? { ...row.draft, invoiceNumber: row.draft.invoiceNumber || row.invoiceNumber }
    : {
        invoiceNumber:    row.invoiceNumber,
        issueDate:        row.issueDate,
        payableBy:        row.paidAt,
        recipientCompany: row.recipientCompany,
        recipientName:    row.recipientName,
        lineItems:        [{ description: 'Agent For Service', quantity: 1, unitPrice: row.totalAmount, totalPrice: row.totalAmount }],
      }
)

export default function AdminInvoicesPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')   // all | paid | pending
  const [confirm, setConfirm] = useState(null)   // { mode:'single'|'bulk', ... } pending delete
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [preview, setPreview] = useState(null)   // { url, filename }
  const [editing, setEditing] = useState(null)    // row being edited

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const res = await getAllInvoices()
      setRows(res.data?.data || [])
      setSelected(new Set())
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || 'Failed to load invoices.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    // Status filter first (Paid / Pending), then the text search on what remains.
    const base = statusFilter === 'all'
      ? rows
      : rows.filter(r => String(r.status || '').toLowerCase() === statusFilter)
    const q = search.trim().toLowerCase()
    if (!q) return base
    const numeric = /^\d+$/.test(q)
    return base.filter(r => {
      const num = String(r.invoiceNumber || '').toLowerCase()
      if (numeric) {
        // Numeric query → match the invoice SEQUENCE (the N in "Invoice US-N-YY"),
        // not the year. Otherwise "2" matches every US-x-26 because the year "26"
        // contains a 2. Fall back to recipient text for numeric strings in names.
        const seq = (num.match(/us-(\d+)-/) || [])[1]
        if (seq && (seq === q || seq.startsWith(q))) return true
        return [r.recipientName, r.recipientCompany]
          .filter(Boolean).some(v => String(v).toLowerCase().includes(q))
      }
      return [r.invoiceNumber, r.recipientName, r.recipientCompany, r.registrationModel, r.purpose, r.status]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(q))
    })
  }, [rows, search, statusFilter])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every(r => selected.has(r.invoiceNumber))

  const toggleOne = (num) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(num)) next.delete(num); else next.add(num)
    return next
  })

  const toggleAll = () => setSelected(prev => {
    if (filtered.every(r => prev.has(r.invoiceNumber))) return new Set()
    return new Set(filtered.map(r => r.invoiceNumber))
  })

  const handleDownload = async (row) => {
    try {
      const out = await generateIFOAInvoicePDF(buildInvObject(row))
      triggerInvoiceDownload(out)
    } catch (e) {
      showToast('Could not generate PDF for this invoice.', 'error')
    }
  }

  const handleView = async (row) => {
    try {
      const out = await generateIFOAInvoicePDF(buildInvObject(row))
      setPreview(out)
    } catch (e) {
      showToast('Could not generate PDF for this invoice.', 'error')
    }
  }

  const handleSaveEdit = async (row, draft) => {
    if (!row.invoiceId) {
      showToast('This invoice has no editable record.', 'error')
      return
    }
    await saveInvoiceDraftToDoc(row.invoiceId, draft, draft.invoiceNumber)
    setRows(prev => prev.map(r => r.invoiceNumber === row.invoiceNumber
      ? {
          ...r,
          invoiceNumber:    draft.invoiceNumber || r.invoiceNumber,
          recipientName:    draft.recipientName || r.recipientName,
          recipientCompany: draft.recipientCompany || r.recipientCompany,
          totalAmount:      (draft.lineItems || []).reduce((s, li) => s + (Number(li.totalPrice) || 0), 0) || r.totalAmount,
          issueDate:        draft.issueDate || r.issueDate,
          draft,
        }
      : r))
    setEditing(null)
    showToast('Invoice updated.')
  }

  const handleDelete = async () => {
    if (!confirm) return
    setDeleting(true)
    try {
      if (confirm.mode === 'bulk') {
        const nums = confirm.numbers
        await bulkHardDeleteInvoices(nums)
        const gone = new Set(nums)
        setRows(prev => prev.filter(r => !gone.has(r.invoiceNumber)))
        setSelected(new Set())
        showToast(`${nums.length} invoice(s) deleted — numbers freed for reuse.`)
      } else {
        await hardDeleteInvoice(confirm.row.invoiceNumber)
        setRows(prev => prev.filter(r => r.invoiceNumber !== confirm.row.invoiceNumber))
        setSelected(prev => { const n = new Set(prev); n.delete(confirm.row.invoiceNumber); return n })
        showToast(`Invoice ${confirm.row.invoiceNumber} deleted — number freed for reuse.`)
      }
      setConfirm(null)
    } catch (e) {
      showToast(e?.response?.data?.message || 'Delete failed.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="mb-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Admin Control Center</p>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-slate-900">Invoices</h1>
      </div>

      {err && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <span>{err}</span>
          <button onClick={load} className="ml-auto font-semibold underline hover:no-underline">Retry</button>
        </div>
      )}

      <div className="sticky top-[64px] sm:top-[88px] z-30 -mx-4 sm:-mx-5 lg:-mx-8 px-4 sm:px-5 lg:px-8 py-3 bg-slate-50/95 backdrop-blur border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-3 px-1">
          <div className="relative flex-grow sm:flex-grow-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="m20 20-3.5-3.5" /></svg>
            <input type="text" placeholder="Search invoice number, recipient…" value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-full sm:w-72 bg-white transition shadow-sm" />
          </div>
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition h-[40px]">
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3M4 4v5h5M20 20v-5h-5" /></svg>
            Refresh
          </button>

          <div className="flex items-center gap-1.5">
            {['all', 'paid', 'pending'].map(s => {
              const n = s === 'all' ? rows.length : rows.filter(r => String(r.status || '').toLowerCase() === s).length
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`rounded-xl px-3 py-2.5 text-xs font-bold capitalize transition h-[40px] ${statusFilter === s ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {s === 'all' ? 'All' : s} <span className={statusFilter === s ? 'text-white/60' : 'text-slate-400'}>({n})</span>
                </button>
              )
            })}
          </div>

          {selected.size > 0 ? (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-semibold text-slate-600">{selected.size} selected</span>
              <button onClick={() => setConfirm({ mode: 'bulk', numbers: [...selected] })}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-3 py-2 text-xs font-bold text-white transition">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                Delete selected
              </button>
              <button onClick={() => setSelected(new Set())}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                Clear
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500 ml-auto">
              <span className="font-semibold text-slate-800">{filtered.length}</span> invoice{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      <div className="mb-5" />

      {loading ? (
        <div className="flex items-center justify-center py-40">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center text-slate-500">No invoices found.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                </th>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.invoiceNumber} className={`border-b border-slate-100 last:border-0 transition ${selected.has(r.invoiceNumber) ? 'bg-blue-50/60' : 'hover:bg-slate-50/60'}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(r.invoiceNumber)} onChange={() => toggleOne(r.invoiceNumber)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                    {r.invoiceNumber}
                    {r.wirePending && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Wire pending</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-medium">{r.recipientCompany || r.recipientName || '—'}</div>
                    {r.recipientCompany && r.recipientName && <div className="text-xs text-slate-400">{r.recipientName}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{SOURCE_LABEL[r.source] || r.source}{r.registrationModel ? ` · ${r.registrationModel}` : ''}</td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{r.purpose || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">{fmtMoney(r.totalAmount)}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(r.issueDate || r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${
                      r.status === 'paid' ? 'bg-emerald-100 text-emerald-700'
                      : r.status === 'void' ? 'bg-slate-200 text-slate-600'
                      : 'bg-blue-100 text-blue-700'}`}>{r.status || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleView(r)} title="View invoice"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S5.5 5.5 12 5.5 21.5 12 21.5 12 18.5 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                        View
                      </button>
                      <button onClick={() => setEditing(r)} disabled={!r.invoiceId} title={r.invoiceId ? 'Edit invoice' : 'No editable record'}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg>
                        Edit
                      </button>
                      <button onClick={() => handleDownload(r)} title="Download PDF"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0-4-4m4 4 4-4M4 20h16" /></svg>
                        PDF
                      </button>
                      <button onClick={() => setConfirm({ mode: 'single', row: r })} title="Delete invoice"
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 hover:bg-red-700 px-2.5 py-1.5 text-xs font-bold text-white transition">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-black text-slate-900">
              {confirm.mode === 'bulk' ? `Delete ${confirm.numbers.length} invoices?` : 'Delete invoice?'}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {confirm.mode === 'bulk' ? (
                <>This permanently removes the <span className="font-semibold text-slate-900">{confirm.numbers.length}</span> selected
                invoices from the database — they disappear for the admin and the clients, and their numbers are freed for reuse.
                This cannot be undone.</>
              ) : (
                <>This permanently removes invoice <span className="font-semibold text-slate-900">{confirm.row.invoiceNumber}</span> from
                the database — it disappears for the admin and the client, and its number is freed for reuse.
                This cannot be undone.</>
              )}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirm(null)} disabled={deleting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-bold text-white transition disabled:opacity-60">
                {deleting && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/70 backdrop-blur-sm p-4 sm:p-8">
          <div className="flex items-center justify-between text-white mb-3">
            <p className="text-sm font-bold truncate">Preview — {preview.filename}</p>
            <div className="flex items-center gap-2">
              <a href={preview.url} download={preview.filename}
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold transition">Download</a>
              <button onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null) }}
                className="inline-flex items-center rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold transition">Close</button>
            </div>
          </div>
          <iframe title="Invoice preview" src={preview.url} className="flex-1 w-full rounded-xl bg-white" />
        </div>
      )}

      {editing && (
        <InvoiceEditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSave={handleSaveEdit}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ── Invoice edit modal — edits the canonical Invoice doc's draft ──────────────
function InvoiceEditModal({ row, onClose, onSave }) {
  const d = row.draft || {}
  const [form, setForm] = useState({
    invoiceNumber:     d.invoiceNumber || row.invoiceNumber || '',
    issueDate:         toDateInput(d.issueDate || row.issueDate),
    payableBy:         toDateInput(d.payableBy || row.paidAt),
    recipientCompany:  d.recipientCompany || row.recipientCompany || '',
    recipientName:     d.recipientName || d.recipientContact || row.recipientName || '',
    recipientEmail:    d.recipientEmail || '',
    recipientPhone:    d.recipientPhone || '',
    recipientAddress1: d.recipientAddress1 || '',
    recipientAddress2: d.recipientAddress2 || '',
    recipientCountry:  d.recipientCountry || '',
    paymentMethod:     d.paymentMethod || '',
  })
  const [lineItems, setLineItems] = useState(() => {
    const li = d.lineItems?.length ? d.lineItems : [{ description: 'Agent For Service', quantity: 1, unitPrice: row.totalAmount || 0, totalPrice: row.totalAmount || 0 }]
    return li.map(x => ({ description: x.description || '', quantity: Number(x.quantity) || 1, unitPrice: Number(x.unitPrice) || 0, totalPrice: Number(x.totalPrice) || 0 }))
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const total = lineItems.reduce((s, li) => s + (Number(li.totalPrice) || 0), 0)

  // Step the sequence number in "Invoice US-<n>-<yy>" up/down (min 1).
  const bumpNumber = (delta) => setForm(f => {
    const m = /^(.*US-)(\d+)(-\d+)\s*$/.exec(f.invoiceNumber.trim())
    if (!m) return f
    const n = Math.max(1, (parseInt(m[2], 10) || 1) + delta)
    return { ...f, invoiceNumber: `${m[1]}${n}${m[3]}` }
  })

  const setItem = (i, k, v) => setLineItems(prev => prev.map((li, idx) => {
    if (idx !== i) return li
    const next = { ...li, [k]: k === 'description' ? v : Number(v) || 0 }
    if (k === 'quantity' || k === 'unitPrice') next.totalPrice = (Number(next.quantity) || 0) * (Number(next.unitPrice) || 0)
    return next
  }))
  const addItem = () => setLineItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }])
  const removeItem = (i) => setLineItems(prev => prev.filter((_, idx) => idx !== i))

  const submit = async () => {
    if (!form.invoiceNumber.trim()) { setErr('Invoice number is required.'); return }
    setSaving(true); setErr('')
    try {
      await onSave(row, { ...form, recipientContact: form.recipientName, lineItems })
    } catch (e) {
      setErr(e?.response?.data?.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const field = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition'
  const label = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5'
  const section = 'text-[11px] font-black uppercase tracking-widest text-slate-400'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4 py-6">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex-none flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" /></svg>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Edit Invoice</p>
              <h3 className="text-lg font-black text-slate-900 leading-tight">{form.recipientCompany || form.recipientName || 'Invoice'}</h3>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center">✕</button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
          {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{err}</div>}

          {/* Invoice details */}
          <div>
            <p className={`${section} mb-3`}>Invoice Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={label}>Invoice Number</label>
                <div className="relative">
                  <input className={`${field} pr-9`} value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col">
                    <button type="button" onClick={() => bumpNumber(1)} title="Next number"
                      className="h-[15px] w-5 flex items-center justify-center text-slate-400 hover:text-blue-600">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m6 15 6-6 6 6" /></svg>
                    </button>
                    <button type="button" onClick={() => bumpNumber(-1)} title="Previous number"
                      className="h-[15px] w-5 flex items-center justify-center text-slate-400 hover:text-blue-600">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
                    </button>
                  </div>
                </div>
              </div>
              <div><label className={label}>Issue Date</label><input type="date" className={field} value={form.issueDate} onChange={e => set('issueDate', e.target.value)} /></div>
              <div><label className={label}>Payable By</label><input type="date" className={field} value={form.payableBy} onChange={e => set('payableBy', e.target.value)} /></div>
            </div>
          </div>

          {/* Recipient */}
          <div>
            <p className={`${section} mb-3`}>Recipient</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={label}>Company Name</label><input className={field} value={form.recipientCompany} onChange={e => set('recipientCompany', e.target.value)} /></div>
              <div><label className={label}>Contact Name</label><input className={field} value={form.recipientName} onChange={e => set('recipientName', e.target.value)} /></div>
              <div><label className={label}>Email</label><input className={field} value={form.recipientEmail} onChange={e => set('recipientEmail', e.target.value)} placeholder="name@company.com" /></div>
              <div><label className={label}>Phone</label><input className={field} value={form.recipientPhone} onChange={e => set('recipientPhone', e.target.value)} placeholder="+1 …" /></div>
              <div><label className={label}>Address Line 1</label><input className={field} value={form.recipientAddress1} onChange={e => set('recipientAddress1', e.target.value)} placeholder="Street address" /></div>
              <div><label className={label}>Address Line 2 (City / State / ZIP)</label><input className={field} value={form.recipientAddress2} onChange={e => set('recipientAddress2', e.target.value)} /></div>
              <div><label className={label}>Country</label><input className={field} value={form.recipientCountry} onChange={e => set('recipientCountry', e.target.value)} /></div>
              <div><label className={label}>Payment Method</label><input className={field} value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} placeholder="Card / Wire" /></div>
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className={section}>Line Items</p>
              <button onClick={addItem} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" /></svg>
                Add item
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-[1fr_64px_104px_104px_36px] gap-2 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>Description</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">Total</span>
                <span />
              </div>
              <div className="divide-y divide-slate-100">
                {lineItems.map((li, i) => (
                  <div key={i} className="grid grid-cols-[1fr_64px_104px_104px_36px] gap-2 items-center px-3 py-2">
                    <input className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Description" value={li.description} onChange={e => setItem(i, 'description', e.target.value)} />
                    <input type="number" min="0" className="rounded-lg border border-slate-200 px-2 py-2 text-sm text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={li.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
                    <input type="number" min="0" step="0.01" className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={li.unitPrice} onChange={e => setItem(i, 'unitPrice', e.target.value)} />
                    <span className="text-right text-sm font-semibold text-slate-800">{fmtMoney(li.totalPrice)}</span>
                    <button onClick={() => removeItem(i)} disabled={lineItems.length === 1} className="justify-self-center text-slate-300 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-300" title="Remove">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-6 bg-slate-50 px-3 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total</span>
                <span className="text-base font-black text-slate-900">{fmtMoney(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-none flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">Cancel</button>
          <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-sm font-bold text-white transition disabled:opacity-60">
            {saving && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
