import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

function hex(h) {
  const n = parseInt(h.replace('#', ''), 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

const BACKEND_LOGO_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  .replace('/api', '') + '/assets/IFOA_USA_white.png'

export async function generateIFOAInvoicePDF(inv) {
  const RED = hex('#c0392b')
  const DARK = hex('#0f172a')
  const MID = hex('#475569')
  const MUTED = hex('#94a3b8')
  const LGRAY = hex('#f1f5f9')
  const BORDER = hex('#cbd5e1')
  const WHITE = rgb(1, 1, 1)

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const ML = 50
  const MR = 50
  const W = width - ML - MR
  let Y = height - 40

  const txt = (str, x, y, { size = 9, font = fontReg, color = DARK, maxWidth } = {}) => {
    const opts = { x, y, size, font, color }
    if (maxWidth) opts.maxWidth = maxWidth
    page.drawText(String(str ?? '-'), opts)
  }

  const txtR = (str, rx, y, { size = 9, font = fontReg, color = DARK } = {}) => {
    const tw = font.widthOfTextAtSize(String(str ?? ''), size)
    page.drawText(String(str ?? ''), { x: rx - tw, y, size, font, color })
  }

  const txtC = (str, cx, y, { size = 9, font = fontReg, color = DARK } = {}) => {
    const tw = font.widthOfTextAtSize(String(str ?? ''), size)
    page.drawText(String(str ?? ''), { x: cx - tw / 2, y, size, font, color })
  }

  const line = (x1, y1, x2, y2, color = BORDER, thickness = 0.5) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color })

  const rect = (x, y, w, h, color) =>
    page.drawRectangle({ x, y, width: w, height: h, color })

  const fmtD = (d) =>
    d
      ? new Date(d)
          .toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
          .replace(/\//g, '.')
      : '-'

  const fmtM = (n) =>
    n != null
      ? Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '-'

  const LOGO_H = 52
  const LOGO_AREA_W = 130
  const BAND_H = LOGO_H + 20
  const BAND_W = LOGO_AREA_W + 28
  const BAND_X = width - MR - BAND_W
  const BAND_Y = height - BAND_H - 8

  let logoImage = null
  let logoDims = { width: 0, height: 0 }
  try {
    const resp = await fetch(BACKEND_LOGO_URL, { cache: 'no-store' })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const arrBuf = await resp.arrayBuffer()
    logoImage = await pdfDoc.embedPng(arrBuf)
    const raw = logoImage.scale(1)
    const scale = Math.min(LOGO_H / raw.height, LOGO_AREA_W / raw.width)
    logoDims = { width: raw.width * scale, height: raw.height * scale }
  } catch {
    // Fallback text logo when image is unavailable.
  }

  if (logoImage) {
    const logoX = BAND_X + (BAND_W - logoDims.width) / 2
    const logoY = BAND_Y + (BAND_H - logoDims.height) / 2
    page.drawImage(logoImage, { x: logoX, y: logoY, width: logoDims.width, height: logoDims.height })
  } else {
    txt('IFOA', BAND_X + 18, BAND_Y + BAND_H - 28, { size: 22, font: fontBold, color: DARK })
    txt('* USA *', BAND_X + 18, BAND_Y + BAND_H - 44, { size: 10, font: fontBold, color: RED })
  }

  Y -= 60
  txt('IFOA USA Corporation, 1616 Concierge Blvd, Suite 100 (1st Floor), Daytona Beach, FL 32117, USA', ML, Y, { size: 7.5, color: MID, maxWidth: W })
  Y -= 8
  line(ML, Y, ML + W, Y, BORDER, 0.5)
  Y -= 20

  txt(inv.recipientCompany || inv.recipientName, ML, Y, { size: 10, font: fontBold })
  Y -= 14
  txt(inv.recipientContact || '', ML, Y, { size: 9, color: MID })
  Y -= 12
  txt(inv.recipientAddress1 || '', ML, Y, { size: 9, color: MID })
  Y -= 12
  txt(inv.recipientAddress2 || '', ML, Y, { size: 9, color: MID })
  Y -= 12
  txt(inv.recipientCountry || '', ML, Y, { size: 9, color: MID })
  Y -= 26

  // Strip leading "Invoice " prefix if already present in the invoice number
  // to avoid rendering "Invoice Invoice US-6-26"
  const rawInvoiceNumber = String(inv.invoiceNumber || '')
  const displayInvoiceNumber = rawInvoiceNumber.replace(/^Invoice\s+/i, '')

  txt('Invoice  ' + displayInvoiceNumber, ML, Y, { size: 12, font: fontBold })
  Y -= 8
  line(ML, Y, ML + W, Y, RED, 1.5)
  Y -= 14

  txt('US Agent for Service', ML, Y, { size: 10, font: fontBold })
  Y -= 7
  line(ML, Y, ML + W, Y, BORDER, 0.4)
  Y -= 14

  txt('date:', ML, Y, { size: 8, color: MID })
  txt(fmtD(inv.issueDate), ML + 60, Y, { size: 8 })
  txt('payable by:', ML + 220, Y, { size: 8, color: MID })
  txt(fmtD(inv.payableBy), ML + 300, Y, { size: 8 })
  Y -= 6
  line(ML, Y, ML + W, Y, BORDER, 0.4)
  Y -= 26

  txt('Dear ' + (inv.recipientContact || inv.recipientName) + ',', ML, Y, { size: 9 })
  Y -= 16
  txt('Thank you for your Business. Your invoice is as follows:', ML, Y, { size: 9 })
  Y -= 28

  // Column right-edges for numeric cols; left-edges for text cols; centers for centered cols
  const C = {
    pos:    ML,
    desc:   ML + 28,
    qtyR:   ML + W - 160,
    qtyC:   ML + W - 175,  // center of ~30pt qty column
    unitR:  ML + W - 70,
    unitC:  ML + W - 115,  // center of 90pt unit price column
    total:  ML + W,
    totalC: ML + W - 35,   // center of 70pt total column
  }
  const TH_Y = Y
  const TH_H = 16
  rect(ML, TH_Y - TH_H + 4, W, TH_H, LGRAY)
  txt('Pos.', C.pos, TH_Y - 8, { size: 8, font: fontBold })
  txt('Description', C.desc, TH_Y - 8, { size: 8, font: fontBold })
  txtC('Quantity', C.qtyC, TH_Y - 8, { size: 8, font: fontBold })
  txtC('Unit Price', C.unitC, TH_Y - 8, { size: 8, font: fontBold })
  txtC('Total Price USD', C.totalC, TH_Y - 8, { size: 8, font: fontBold })
  Y = TH_Y - TH_H - 2
  line(ML, Y, ML + W, Y, BORDER, 0.4)
  Y -= 12

  const items = inv.lineItems || []
  items.forEach((item, i) => {
    txt(String(i + 1), C.pos, Y, { size: 9 })
    txt(item.description || '', C.desc, Y, { size: 9, maxWidth: C.qtyR - C.desc - 30 })
    txtC(String(item.quantity || 0), C.qtyC, Y, { size: 9 })
    txtC(fmtM(item.unitPrice), C.unitC, Y, { size: 9 })
    txtC(fmtM(item.totalPrice), C.totalC, Y, { size: 9 })
    Y -= 18
  })

  Y -= 8
  line(ML, Y, ML + W, Y, RED, 1.5)
  Y -= 14

  const totalAmt = items.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0)
  txt('Invoice Sum Tax-Exempt', C.desc, Y, { size: 9, font: fontBold })
  txtC(fmtM(totalAmt), C.totalC, Y, { size: 9, font: fontBold })
  Y -= 8
  line(ML, Y, ML + W, Y, RED, 1.5)
  Y -= 30

  const notes = [
    '1. Payment is due within 30 days',
    '2. Please note the invoice number in your payment method',
    '3. Please make a payment into our Bank Account, as mentioned in the Footer.',
  ]
  notes.forEach((note) => {
    txt(note, ML, Y, { size: 8.5, color: DARK })
    Y -= 14
  })
  Y -= 14

  txt('Do you have any questions? Get in touch with us.', ML, Y, { size: 9 })
  Y -= 22
  txt('Kind regards', ML, Y, { size: 9 })
  Y -= 13
  txt('Your Agent for Service Team', ML, Y, { size: 9 })

  const FY = 48
  line(ML, FY + 18, ML + W, FY + 18, BORDER, 0.5)

  const footerText = 'Bank:  Bank of America     Account owner:  IFOA USA Corp     SWIFT:  BOFAUS3N     Account:  8981 5632 1560'
  const ftw = fontReg.widthOfTextAtSize(footerText, 7.5)
  page.drawText(footerText, { x: (width - ftw) / 2, y: FY + 8, size: 7.5, font: fontReg, color: MID })

  const footer2 = 'Email:  agent@theifoa.com     Mobile:  +1 508 838 5880     Website:  theifoa.com'
  const ft2w = fontReg.widthOfTextAtSize(footer2, 7)
  page.drawText(footer2, { x: (width - ft2w) / 2, y: FY - 3, size: 7, font: fontReg, color: MUTED })

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  // Use the cleaned number (without "Invoice " prefix) for the filename
  return { url, filename: `Invoice-${displayInvoiceNumber}.pdf` }
}

export function triggerInvoiceDownload({ url, filename }) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
