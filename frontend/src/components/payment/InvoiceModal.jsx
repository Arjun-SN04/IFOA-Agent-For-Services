/**
 * InvoiceModal.jsx
 * Renders an invoice preview modal and generates a professional PDF
 * using pdf-lib (https://pdf-lib.js.org) — a pure browser PDF toolkit.
 *
 * The company logo (IFOA_USA_blanc_V.png) is fetched from /src/assets at
 * runtime, embedded as a real image in the PDF — no print dialog, no popup.
 *
 * Install:  npm install pdf-lib
 */

import { useState } from 'react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import logoUrl from '../../assets/IFOA_USA_blanc_V.png'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'

const money = (n) =>
  n != null
    ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—'

// Hex "#rrggbb" → rgb(r,g,b) for pdf-lib
function hex(h) {
  const n = parseInt(h.replace('#', ''), 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

// ── PDF generation using pdf-lib ──────────────────────────────────────────────
export async function downloadInvoicePDF(inv) {
  // ── Colours ──────────────────────────────────────────────────────────────
  const RED      = hex('#dc2626')
  const DARK     = hex('#0f172a')
  const MID      = hex('#475569')
  const MUTED    = hex('#94a3b8')
  const LIGHT_BG = hex('#f8fafc')
  const BORDER   = hex('#e2e8f0')
  const WHITE    = rgb(1, 1, 1)
  const GREEN_FG = hex('#15803d')

  // ── Page setup (A4) ───────────────────────────────────────────────────────
  const pdfDoc = await PDFDocument.create()
  const page   = pdfDoc.addPage([595.28, 841.89]) // A4 in points
  const { width, height } = page.getSize()

  // Fonts
  const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // ── Load & embed logo ─────────────────────────────────────────────────────
  let logoImage = null
  let logoDims  = { width: 0, height: 0 }
  try {
    const resp   = await fetch(logoUrl)
    const arrBuf = await resp.arrayBuffer()
    logoImage    = await pdfDoc.embedPng(arrBuf)
    const raw    = logoImage.scale(1)
    const scale  = 48 / raw.height
    logoDims     = { width: raw.width * scale, height: 48 }
  } catch (_) {
    // logo load failed — silently continue without it
  }

  // ── Margins & layout constants ────────────────────────────────────────────
  const ML = 45       // margin left
  const MR = 45       // margin right
  const W  = width - ML - MR
  let   Y  = height - 48  // cursor (top → bottom)

  // ── Drawing helpers ───────────────────────────────────────────────────────
  const drawRect = (x, y, w, h, color, stroke = false, strokeColor = BORDER, strokeW = 0.5) => {
    if (!stroke) {
      page.drawRectangle({ x, y, width: w, height: h, color })
    } else {
      page.drawRectangle({ x, y, width: w, height: h, color, borderColor: strokeColor, borderWidth: strokeW })
    }
  }

  const text = (str, x, y, { size = 10, font = fontReg, color = DARK, maxWidth } = {}) => {
    const opts = { x, y, size, font, color }
    if (maxWidth) opts.maxWidth = maxWidth
    page.drawText(String(str ?? '—'), opts)
  }

  const textRight = (str, rightX, y, { size = 10, font = fontReg, color = DARK } = {}) => {
    const tw = font.widthOfTextAtSize(String(str ?? '—'), size)
    page.drawText(String(str ?? '—'), { x: rightX - tw, y, size, font, color })
  }

  // ── HEADER BAND ───────────────────────────────────────────────────────────
  const HEADER_H = 80
  drawRect(0, height - HEADER_H, width, HEADER_H, DARK)

  // Logo (left side, vertically centred in header)
  if (logoImage) {
    const logoY = height - HEADER_H + (HEADER_H - logoDims.height) / 2
    page.drawImage(logoImage, { x: ML, y: logoY, width: logoDims.width, height: logoDims.height })
  } else {
    text('IFOA', ML, height - HEADER_H + 28, { size: 22, font: fontBold, color: WHITE })
    text('Agent for Service', ML, height - HEADER_H + 13, { size: 9, font: fontReg, color: MUTED })
  }

  // "INVOICE" title top-right
  const invLabel  = 'INVOICE'
  const invLabelW = fontBold.widthOfTextAtSize(invLabel, 28)
  text(invLabel, width - MR - invLabelW, height - HEADER_H + 26, { size: 28, font: fontBold, color: WHITE })

  Y = height - HEADER_H - 22

  // ── RED ACCENT LINE ───────────────────────────────────────────────────────
  drawRect(ML, Y, W, 3, RED)
  Y -= 18

  // ── INVOICE META ─────────────────────────────────────────────────────────
  const metaLabelX = ML
  const metaValueX = ML + 110
  const metaRows = [
    ['Invoice Number', inv.invoiceNumber],
    ['Issue Date',     fmt(inv.paidAt)],
    ['Payment Ref',    (inv.paymentId || '').slice(0, 28) + ((inv.paymentId || '').length > 28 ? '...' : '')],
    ['Status',         'PAID'],
  ]
  for (const [label, value] of metaRows) {
    text(label, metaLabelX, Y, { size: 8, font: fontBold, color: MUTED })
    const isStatus = label === 'Status'
    text(value, metaValueX, Y, { size: 9, font: isStatus ? fontBold : fontReg, color: isStatus ? GREEN_FG : DARK })
    Y -= 14
  }

  Y -= 10

  // ── DIVIDER ───────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: ML, y: Y }, end: { x: ML + W, y: Y }, thickness: 0.5, color: BORDER })
  Y -= 18

  // ── BILLED TO + SUBSCRIPTION INFO (two columns) ───────────────────────────
  const COL_GAP = 14
  const COL_W   = (W - COL_GAP) / 2
  const COL1_X  = ML
  const COL2_X  = ML + COL_W + COL_GAP
  const BOX_H   = 90

  drawRect(COL1_X, Y - BOX_H, COL_W, BOX_H, LIGHT_BG, true, BORDER, 0.5)
  drawRect(COL2_X, Y - BOX_H, COL_W, BOX_H, LIGHT_BG, true, BORDER, 0.5)

  // Col 1: Billed To
  let c1y = Y - 14
  text('BILLED TO', COL1_X + 10, c1y, { size: 7, font: fontBold, color: MUTED })
  c1y -= 13
  text(inv.name || '—', COL1_X + 10, c1y, { size: 10, font: fontBold, color: DARK, maxWidth: COL_W - 20 })
  c1y -= 13
  text(inv.email !== '—' ? inv.email : '', COL1_X + 10, c1y, { size: 8.5, color: MID, maxWidth: COL_W - 20 })
  if (inv.phone !== '—') {
    c1y -= 12
    text(inv.phone, COL1_X + 10, c1y, { size: 8.5, color: MID })
  }
  if (inv.address) {
    c1y -= 12
    text(inv.address, COL1_X + 10, c1y, { size: 7.5, color: MUTED, maxWidth: COL_W - 20 })
  }

  // Col 2: Subscription Info
  const expiry = inv.subscriptionPlan === 'Unlimited Plan'
    ? 'Never (Unlimited)'
    : inv.expirationDate ? fmt(inv.expirationDate) : '—'

  let c2y = Y - 14
  text('SUBSCRIPTION', COL2_X + 10, c2y, { size: 7, font: fontBold, color: MUTED })
  c2y -= 13
  text(inv.subscriptionPlan, COL2_X + 10, c2y, { size: 10, font: fontBold, color: DARK, maxWidth: COL_W - 20 })
  c2y -= 13
  text('Account Type', COL2_X + 10, c2y, { size: 7.5, color: MUTED })
  c2y -= 11
  text(inv.isAirline ? 'Airline / Operator' : 'Individual Pilot', COL2_X + 10, c2y, { size: 8.5, font: fontBold, color: DARK })
  c2y -= 13
  text('Start  to  Expiration', COL2_X + 10, c2y, { size: 7.5, color: MUTED })
  c2y -= 11
  text(`${fmt(inv.paidAt)}  to  ${expiry}`, COL2_X + 10, c2y, { size: 8, color: DARK, maxWidth: COL_W - 20 })

  Y -= BOX_H + 20

  // ── DETAILS TABLE ─────────────────────────────────────────────────────────
  const TH_H = 22
  drawRect(ML, Y - TH_H, W, TH_H, DARK)
  text('DESCRIPTION', ML + 12, Y - TH_H + 7, { size: 7.5, font: fontBold, color: MUTED })
  text('DETAILS',     ML + W * 0.55 + 12, Y - TH_H + 7, { size: 7.5, font: fontBold, color: MUTED })
  Y -= TH_H

  const certRows = inv.isAirline
    ? [
        ['Team Members / Holders', String(inv.holderCount ?? '—')],
        ['Price per Certificate',  money(inv.pricePerCert)],
      ]
    : [
        ['Primary Certificate', inv.primaryCertificate ?? '—'],
        ['FAA Certificate #',   inv.faaCertificateNumber ?? '—'],
        ['IACRA / FTN #',       inv.iacraTrackingNumber ?? '—'],
      ]

  const tableRows = [
    ['Subscription Plan',   inv.subscriptionPlan],
    ['Account Type',        inv.isAirline ? 'Airline / Operator' : 'Individual Pilot'],
    ...certRows,
    ['Subscription Start',  fmt(inv.paidAt)],
    ['Subscription Expiry', expiry],
    ['Currency',            inv.currency],
    ['Payment Reference',   inv.paymentId],
    ['Payment Date',        fmt(inv.paidAt)],
  ]

  const ROW_H = 19
  tableRows.forEach(([label, value], i) => {
    const rowBg = i % 2 === 0 ? WHITE : LIGHT_BG
    drawRect(ML, Y - ROW_H, W, ROW_H, rowBg, true, BORDER, 0.3)
    text(label, ML + 12, Y - ROW_H + 5, { size: 8.5, color: MID })
    const isRef = label === 'Payment Reference'
    text(value, ML + W * 0.55 + 12, Y - ROW_H + 5, {
      size: isRef ? 7 : 8.5,
      font: fontBold,
      color: DARK,
      maxWidth: W * 0.45 - 20,
    })
    Y -= ROW_H
  })

  Y -= 18

  // ── TOTALS BOX ────────────────────────────────────────────────────────────
  const TOT_W  = 200
  const TOT_X  = ML + W - TOT_W
  const ROW_TH = 20

  drawRect(TOT_X, Y - ROW_TH, TOT_W, ROW_TH, LIGHT_BG, true, BORDER, 0.5)
  text('Subtotal', TOT_X + 12, Y - ROW_TH + 6, { size: 8.5, color: MID })
  textRight(money(inv.amount), TOT_X + TOT_W - 12, Y - ROW_TH + 6, { size: 8.5, font: fontBold })
  Y -= ROW_TH

  drawRect(TOT_X, Y - ROW_TH, TOT_W, ROW_TH, LIGHT_BG, true, BORDER, 0.5)
  text('Taxes & Fees', TOT_X + 12, Y - ROW_TH + 6, { size: 8.5, color: MID })
  textRight('$0.00', TOT_X + TOT_W - 12, Y - ROW_TH + 6, { size: 8.5, font: fontBold })
  Y -= ROW_TH

  const GT_H = 28
  drawRect(TOT_X, Y - GT_H, TOT_W, GT_H, DARK)
  text('Total Paid', TOT_X + 12, Y - GT_H + 9, { size: 8.5, font: fontBold, color: MUTED })
  textRight(money(inv.amount), TOT_X + TOT_W - 12, Y - GT_H + 7, { size: 14, font: fontBold, color: WHITE })
  Y -= GT_H + 20

  // ── NOTE BOX ─────────────────────────────────────────────────────────────
  const NOTE_H = 36
  drawRect(ML, Y - NOTE_H, W, NOTE_H, hex('#fefce8'), true, hex('#fde68a'), 0.5)
  text('Note:', ML + 10, Y - NOTE_H + 22, { size: 8, font: fontBold, color: hex('#92400e') })
  text(
    'This invoice is official proof of payment. Retain for your records.',
    ML + 10, Y - NOTE_H + 10,
    { size: 8, color: hex('#92400e'), maxWidth: W - 20 }
  )
  Y -= NOTE_H + 16

  // ── FOOTER ───────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: ML, y: Y }, end: { x: ML + W, y: Y }, thickness: 0.5, color: BORDER })
  Y -= 14
  text('Agent for Service  ·  agent-for-service.com  ·  support@agentforservice.com', ML, Y, { size: 7.5, color: MUTED })
  textRight(`Invoice #${inv.invoiceNumber}`, ML + W, Y, { size: 7.5, color: MUTED })
  Y -= 12
  text('This document was generated automatically and is valid without a physical signature.', ML, Y, { size: 7, color: MUTED })

  // ── Save & trigger download ───────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save()
  const blob     = new Blob([pdfBytes], { type: 'application/pdf' })
  const url      = URL.createObjectURL(blob)
  const link     = document.createElement('a')
  link.href      = url
  link.download  = `Invoice-${inv.invoiceNumber}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ── Invoice Preview Modal ─────────────────────────────────────────────────────
export default function InvoiceModal({ invoice, onClose }) {
  const [downloading, setDownloading] = useState(false)

  if (!invoice) return null

  const expiry = invoice.subscriptionPlan === 'Unlimited Plan'
    ? 'Never (Unlimited)'
    : invoice.expirationDate ? fmt(invoice.expirationDate) : '—'

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadInvoicePDF(invoice)
    } catch (err) {
      console.error('PDF generation failed:', err)
      alert('Could not generate PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Payment Successful</p>
            <h2 className="text-lg font-extrabold text-slate-900">Your Invoice</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition">
            ✕
          </button>
        </div>

        {/* Invoice Preview */}
        <div className="px-6 py-5 space-y-4">

          {/* Paid badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Paid
            </span>
            <span className="text-xs text-slate-400">{invoice.invoiceNumber}</span>
          </div>

          {/* Summary card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-100 overflow-hidden">
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subscription Plan</span>
              <span className="text-sm font-bold text-slate-900">{invoice.subscriptionPlan}</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Billed To</span>
              <span className="text-sm font-bold text-slate-900">{invoice.name}</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Date</span>
              <span className="text-sm font-bold text-slate-900">{fmt(invoice.paidAt)}</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expiration</span>
              <span className={`text-sm font-bold ${expiry === 'Never (Unlimited)' ? 'text-emerald-600' : 'text-slate-900'}`}>{expiry}</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center bg-slate-900 rounded-b-xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Paid</span>
              <span className="text-xl font-black text-white">${Number(invoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Payment ID: <span className="font-mono">{invoice.paymentId}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-red-200 disabled:opacity-60"
          >
            {downloading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
                  <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" />
                </svg>
                Generating PDF…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Download PDF Invoice
              </>
            )}
          </button>
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
