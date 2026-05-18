'use strict';

const nodemailer = require('nodemailer');
const path       = require('path');

// ── Transporter ───────────────────────────────────────────────────────────────
function createTransporter() {
  const port   = Number(process.env.SMTP_PORT) || 465;
  const secure = port === 465; // SSL on 465, STARTTLS on 587
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'mail.theifoa.com',
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      // Allow self-signed certs on private mail servers
      rejectUnauthorized: false,
    },
  });
}

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'IFOA_USA_white.png');
const FROM      = process.env.MAIL_FROM || '"IFOA Agent Services" <agent@theifoa.com>';

// ── Shared layout shell ───────────────────────────────────────────────────────
function wrap(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>IFOA USA</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:4px;overflow:hidden;border:1px solid #e0e0e0;">

        <!-- Logo header — white background so the logo is clearly visible -->
        <tr>
          <td align="center" style="background:#ffffff;padding:28px 40px;border-bottom:2px solid #cc0000;">
            <img src="cid:ifoaLogo" alt="IFOA USA" style="height:64px;display:block;margin:0 auto;" />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;color:#222222;font-size:14px;line-height:1.75;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr><td style="height:1px;background:#e0e0e0;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td align="center" style="padding:16px;font-size:12px;color:#999999;">
            Sent from <a href="https://theifoa.com" style="color:#999999;">theifoa.com</a>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Payment confirmation — Individual ─────────────────────────────────────────
function buildIndividualConfirmationHtml(doc) {
  const name     = [doc.firstName, doc.lastName].filter(Boolean).join(' ') || 'Valued Member';
  const plan     = fmtPlan(doc.subscriptionPlan || '1 Year Subscription Plan', doc.price || doc.multiYearCount);
  const email    = doc.email || '';
  const cert     = doc.primaryCertificate  || doc.primaryAirmanCertificate || '';
  const certNum  = doc.faaCertificateNumber || '';
  const ftn      = doc.iacraTrackingNumber  || '';
  const expiry   = doc.expirationDate
    ? new Date(doc.expirationDate).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
    : 'N/A (Unlimited)';

  return wrap(`
    <p style="margin:0 0 16px;">Dear ${escHtml(name)},</p>
    <p style="margin:0 0 16px;">Thank you for signing up with IFOA USA, you are set now!</p>
    <p style="margin:0 0 16px;">We are proud to serve as your designated U.S. Agent for Service, helping you stay compliant with FAA regulations as an individual with a foreign address as per your selected subscription plan (<strong>${escHtml(plan)}</strong>), starting today.</p>
    <p style="margin:0 0 16px;">The FAA's U.S. Agent for Service (USAS) portal (<a href="https://usas.faa.gov/signin" style="color:#0000cc;">https://usas.faa.gov/signin</a>) has been live since April 2, 2025, so don't forget to officially register IFOA USA as your Agent for Service.</p>
    <p style="margin:0 0 6px;"><strong>Your Email:</strong> ${escHtml(email)}</p>
    <p style="margin:0 0 6px;"><strong>Your FAA Certificate:</strong> ${escHtml(cert)}</p>
    <p style="margin:0 0 6px;"><strong>Your IACRA FTN:</strong> ${escHtml(ftn)}</p>
    ${certNum ? `<p style="margin:0 0 6px;"><strong>Your FAA Certificate Number:</strong> ${escHtml(certNum)}</p>` : ''}
    <p style="margin:0 0 6px;"><strong>Subscription Expires:</strong> ${expiry}</p>
    <br>
    <p style="margin:0 0 16px;">As your designated U.S. Agent for Service, we are here to ensure you remain compliant with FAA regulations and never miss an important update or document.</p>
    <p style="margin:0 0 16px;">At this point, no further action is required on your part.</p>
    <p style="margin:0 0 16px;">Whenever we receive FAA correspondence on your behalf, we will forward it to you digitally and notify you immediately.</p>
    <p style="margin:0 0 16px;">You are in good hands, our team will keep you informed of any important changes or new requirements throughout your subscription period.</p>
    <p style="margin:0 0 16px;">If you have any questions, feel free to contact us anytime at <a href="mailto:agent@theifoa.com" style="color:#0000cc;">agent@theifoa.com</a>.</p>
    <p style="margin:0 0 16px;">Thank you once again for choosing IFOA USA.</p>
    <p style="margin:0 0 16px;">We are committed to making your FAA compliance easy and worry-free.</p>
    <p style="margin:0;">Warm regards,<br><strong>The IFOA USA Team</strong></p>
  `);
}

// ── Payment confirmation — Airline ────────────────────────────────────────────
function buildAirlineConfirmationHtml(doc) {
  const contact  = [doc.firstName, doc.lastName].filter(Boolean).join(' ') || doc.airlineName || 'Valued Partner';
  const airline  = doc.airlineName || '';
  const plan     = fmtPlan(doc.subscriptionPlan || '1 Year Subscription Plan', doc.multiYearCount);
  const email    = doc.email || doc.paymentEmail || '';
  const holders  = Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0);
  const expiry   = doc.expirationDate
    ? new Date(doc.expirationDate).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
    : 'N/A (Unlimited)';

  return wrap(`
    <p style="margin:0 0 16px;">Dear ${escHtml(contact)},</p>
    <p style="margin:0 0 16px;">Thank you for registering <strong>${escHtml(airline)}</strong> with IFOA USA — you are all set!</p>
    <p style="margin:0 0 16px;">We are proud to serve as your company's designated U.S. Agent for Service, helping ${escHtml(airline)} stay compliant with FAA regulations as per your selected subscription plan (<strong>${escHtml(plan)}</strong>), starting today.</p>
    <p style="margin:0 0 16px;">The FAA's U.S. Agent for Service (USAS) portal (<a href="https://usas.faa.gov/signin" style="color:#0000cc;">https://usas.faa.gov/signin</a>) has been live since April 2, 2025, so don't forget to officially register IFOA USA as your Agent for Service for each certificate holder.</p>
    <p style="margin:0 0 6px;"><strong>Company:</strong> ${escHtml(airline)}</p>
    <p style="margin:0 0 6px;"><strong>Contact Email:</strong> ${escHtml(email)}</p>
    <p style="margin:0 0 6px;"><strong>Certificate Holders:</strong> ${holders}</p>
    <p style="margin:0 0 6px;"><strong>Subscription Expires:</strong> ${expiry}</p>
    <br>
    <p style="margin:0 0 16px;">As your designated U.S. Agent for Service, we are here to ensure your team remains compliant with FAA regulations and never misses an important update or document.</p>
    <p style="margin:0 0 16px;">At this point, no further action is required on your part.</p>
    <p style="margin:0 0 16px;">Whenever we receive FAA correspondence on behalf of your certificate holders, we will forward it to you digitally and notify you immediately.</p>
    <p style="margin:0 0 16px;">You are in good hands, our team will keep you informed of any important changes or new requirements throughout your subscription period.</p>
    <p style="margin:0 0 16px;">If you have any questions, feel free to contact us anytime at <a href="mailto:agent@theifoa.com" style="color:#0000cc;">agent@theifoa.com</a>.</p>
    <p style="margin:0 0 16px;">Thank you once again for choosing IFOA USA.</p>
    <p style="margin:0 0 16px;">We are committed to making your FAA compliance easy and worry-free.</p>
    <p style="margin:0;">Warm regards,<br><strong>The IFOA USA Team</strong></p>
  `);
}

// ── Renewal confirmation — Individual ────────────────────────────────────────
function buildIndividualRenewalHtml(doc) {
  const name    = [doc.firstName, doc.lastName].filter(Boolean).join(' ') || 'Valued Member';
  const renewal = doc.lastRenewal || {};
  const plan    = fmtPlan(renewal.plan || doc.subscriptionPlan || '', renewal.price || renewal.multiYearCount);
  const email   = doc.email || doc.paymentEmail || '';
  const cert    = doc.primaryCertificate || '';
  const faaNum  = doc.faaCertificateNumber || '';
  const ftn     = doc.iacraTrackingNumber  || '';
  const fmtD    = (d) => d ? new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : '—';
  const activationDate = fmtD(renewal.activationDate);
  const expiresAt      = renewal.expiresAt ? fmtD(renewal.expiresAt) : (doc.expirationDate ? fmtD(doc.expirationDate) : 'N/A (Unlimited)');
  const paidAt         = fmtD(renewal.paidAt || new Date());

  return wrap(`
    <p style="margin:0 0 16px;">Dear ${escHtml(name)},</p>
    <p style="margin:0 0 16px;">Great news — your IFOA USA subscription has been successfully renewed!</p>
    <p style="margin:0 0 16px;">Your U.S. Agent for Service coverage continues uninterrupted as per your renewed plan (<strong>${escHtml(plan)}</strong>).</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;">
      <tr><td style="background:#f7f7f7;padding:10px 16px;font-size:12px;font-weight:bold;color:#555555;border-bottom:1px solid #e0e0e0;">RENEWAL SUMMARY</td></tr>
      <tr><td style="padding:12px 16px;font-size:13px;line-height:2.2;">
        <strong>Plan:</strong> ${escHtml(plan)}<br>
        <strong>Renewed On:</strong> ${escHtml(paidAt)}<br>
        <strong>New Period Starts:</strong> ${escHtml(activationDate)}<br>
        <strong>New Expiry Date:</strong> ${escHtml(expiresAt)}<br>
        ${faaNum ? `<strong>FAA Certificate #:</strong> ${escHtml(faaNum)}<br>` : ''}
        ${ftn    ? `<strong>IACRA FTN #:</strong> ${escHtml(ftn)}<br>` : ''}
        ${cert   ? `<strong>Certificate Type:</strong> ${escHtml(cert)}<br>` : ''}
        <strong>Email:</strong> ${escHtml(email)}
      </td></tr>
    </table>
    <p style="margin:0 0 16px;">Your renewed subscription will become active on <strong>${escHtml(activationDate)}</strong> and will be valid until <strong>${escHtml(expiresAt)}</strong>.</p>
    <p style="margin:0 0 16px;">No further action is required. We will continue forwarding FAA correspondence to you immediately throughout your renewed period.</p>
    <p style="margin:0 0 16px;">If you have any questions, feel free to contact us at <a href="mailto:agent@theifoa.com" style="color:#0000cc;">agent@theifoa.com</a>.</p>
    <p style="margin:0 0 16px;">Thank you for renewing with IFOA USA!</p>
    <p style="margin:0;">Warm regards,<br><strong>The IFOA USA Team</strong></p>
  `);
}

// ── Renewal confirmation — Airline ────────────────────────────────────────────
function buildAirlineRenewalHtml(doc) {
  const contact = [doc.firstName, doc.lastName].filter(Boolean).join(' ') || doc.airlineName || 'Valued Partner';
  const airline = doc.airlineName || '';
  const renewal = doc.lastRenewal || {};
  const plan    = fmtPlan(renewal.plan || doc.subscriptionPlan || '', renewal.multiYearCount || renewal.price);
  const email   = doc.email || doc.paymentEmail || '';
  const holders = Number(
    renewal.committedCount ||
    doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0
  );
  const fmtD    = (d) => d ? new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : '—';
  const activationDate = fmtD(renewal.activationDate);
  const expiresAt      = renewal.expiresAt ? fmtD(renewal.expiresAt) : (doc.expirationDate ? fmtD(doc.expirationDate) : 'N/A (Unlimited)');
  const paidAt         = fmtD(renewal.paidAt || new Date());

  return wrap(`
    <p style="margin:0 0 16px;">Dear ${escHtml(contact)},</p>
    <p style="margin:0 0 16px;">Great news — <strong>${escHtml(airline)}</strong>'s IFOA USA subscription has been successfully renewed!</p>
    <p style="margin:0 0 16px;">Your company's U.S. Agent for Service coverage continues uninterrupted as per the renewed plan (<strong>${escHtml(plan)}</strong>).</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;">
      <tr><td style="background:#f7f7f7;padding:10px 16px;font-size:12px;font-weight:bold;color:#555555;border-bottom:1px solid #e0e0e0;">RENEWAL SUMMARY</td></tr>
      <tr><td style="padding:12px 16px;font-size:13px;line-height:2.2;">
        <strong>Company:</strong> ${escHtml(airline)}<br>
        <strong>Plan:</strong> ${escHtml(plan)}<br>
        <strong>Renewed On:</strong> ${escHtml(paidAt)}<br>
        <strong>New Period Starts:</strong> ${escHtml(activationDate)}<br>
        <strong>New Expiry Date:</strong> ${escHtml(expiresAt)}<br>
        <strong>Certificate Holders:</strong> ${holders}<br>
        <strong>Contact Email:</strong> ${escHtml(email)}
      </td></tr>
    </table>
    <p style="margin:0 0 16px;">The renewed subscription will be active from <strong>${escHtml(activationDate)}</strong> until <strong>${escHtml(expiresAt)}</strong>.</p>
    <p style="margin:0 0 16px;">No further action is required. We will continue forwarding FAA correspondence for all certificate holders throughout the renewed period.</p>
    <p style="margin:0 0 16px;">If you have any questions, please contact us at <a href="mailto:agent@theifoa.com" style="color:#0000cc;">agent@theifoa.com</a>.</p>
    <p style="margin:0 0 16px;">Thank you for renewing with IFOA USA!</p>
    <p style="margin:0;">Warm regards,<br><strong>The IFOA USA Team</strong></p>
  `);
}

// ── Expiry reminder — shared ──────────────────────────────────────────────────
function buildExpiryReminderHtml(doc, isAirline, daysLeft) {
  const name     = isAirline
    ? ([doc.firstName, doc.lastName].filter(Boolean).join(' ') || doc.airlineName || 'Valued Partner')
    : ([doc.firstName, doc.lastName].filter(Boolean).join(' ') || 'Valued Member');
  const plan     = fmtPlan(doc.subscriptionPlan || '', doc.price || doc.multiYearCount);
  const email    = doc.email || doc.paymentEmail || '';
  const expiry   = doc.expirationDate
    ? new Date(doc.expirationDate).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
    : '';
  const entity   = isAirline ? (doc.airlineName || 'your company') : 'your';

  return wrap(`
    <p style="margin:0 0 16px;">Dear ${escHtml(name)},</p>
    <p style="margin:0 0 16px;">This is a friendly reminder that <strong>${escHtml(entity)}</strong> subscription with IFOA USA is expiring in <strong>${daysLeft} days</strong> on <strong>${expiry}</strong>.</p>
    <p style="margin:0 0 6px;"><strong>Current Plan:</strong> ${escHtml(plan)}</p>
    <p style="margin:0 0 6px;"><strong>Email:</strong> ${escHtml(email)}</p>
    <p style="margin:0 0 6px;"><strong>Expiry Date:</strong> ${expiry}</p>
    <br>
    <p style="margin:0 0 16px;">To continue receiving U.S. Agent for Service coverage without interruption, please renew your subscription before the expiry date. You can renew directly from your dashboard — no need to fill in the registration form again.</p>
    <p style="margin:0 0 16px;">
      <a href="${process.env.FRONTEND_URL || 'https://theifoa.com'}/dashboard/subscription"
         style="display:inline-block;background:#cc0000;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;font-size:14px;">
        Renew Subscription
      </a>
    </p>
    <p style="margin:0 0 16px;">If you have any questions, feel free to contact us at <a href="mailto:agent@theifoa.com" style="color:#0000cc;">agent@theifoa.com</a>.</p>
    <p style="margin:0;">Warm regards,<br><strong>The IFOA USA Team</strong></p>
  `);
}

// ── Format plan name with year count for Multi-Year plans ─────────────────────
// Uses price as authoritative source (55 × years), falls back to multiYearCount.
function fmtPlan(plan, priceOrYears) {
  if (plan !== 'Multiple Years Subscription Plan') return plan;
  const n = Number(priceOrYears);
  const years = n >= 110
    ? Math.round(n / 55)       // price given (e.g. 110 → 2, 165 → 3)
    : (n >= 2 ? n : null);     // already a year count
  return years ? `Multiple Years Subscription Plan (${years} Years)` : plan;
}

// ── HTML escape ───────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Collect unique valid recipient addresses ───────────────────────────────────
function collectRecipients(...addresses) {
  const seen = new Set();
  const valid = [];
  for (const addr of addresses) {
    if (!addr || typeof addr !== 'string') continue;
    const clean = addr.toLowerCase().trim();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) continue;
    if (!seen.has(clean)) { seen.add(clean); valid.push(clean); }
  }
  return valid; // array of unique lowercase email strings
}

// ── Core send helper ──────────────────────────────────────────────────────────
async function sendMail({ to, subject, html }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[email] SMTP_USER/SMTP_PASS not set — skipping email to', to);
    return;
  }
  if (!to || (Array.isArray(to) ? to.length === 0 : !to.trim())) {
    console.warn('[email] No valid recipients — skipping email:', subject);
    return;
  }
  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM,
    to,   // may be a comma-joined string for multiple recipients
    subject,
    html,
    attachments: [{
      filename: 'ifoa-logo.png',
      path:     LOGO_PATH,
      cid:      'ifoaLogo',
    }],
  });
  console.log('[email] Sent to', Array.isArray(to) ? to.join(', ') : to, '|', subject);
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Send the Individual payment confirmation email.
 * @param {object} doc          - Individual registration document
 * @param {string} [userEmail]  - Logged-in user's account email (may differ from doc.email)
 */
async function sendIndividualPaymentConfirmation(doc, userEmail) {
  const recipients = collectRecipients(doc.paymentEmail, doc.email, userEmail);
  if (!recipients.length) return;
  await sendMail({
    to:      recipients.join(', '),
    subject: 'Welcome to IFOA USA — Your Subscription is Active',
    html:    buildIndividualConfirmationHtml(doc),
  });
}

/**
 * Send the Airline payment confirmation email.
 * @param {object} doc          - Airlines registration document
 * @param {string} [userEmail]  - Logged-in user's account email (may differ from doc.email)
 */
async function sendAirlinePaymentConfirmation(doc, userEmail) {
  const recipients = collectRecipients(doc.paymentEmail, doc.email, userEmail);
  if (!recipients.length) return;
  await sendMail({
    to:      recipients.join(', '),
    subject: `Welcome to IFOA USA — ${doc.airlineName || 'Your Company'} Subscription is Active`,
    html:    buildAirlineConfirmationHtml(doc),
  });
}

/**
 * Send the Individual renewal confirmation email.
 * @param {object} doc          - Individual registration document
 * @param {string} [userEmail]  - Logged-in user's account email (may differ from doc.email)
 */
async function sendIndividualRenewalConfirmation(doc, userEmail) {
  const recipients = collectRecipients(doc.paymentEmail, doc.email, userEmail);
  if (!recipients.length) return;
  await sendMail({
    to:      recipients.join(', '),
    subject: 'IFOA USA — Your Subscription Has Been Renewed',
    html:    buildIndividualRenewalHtml(doc),
  });
}

/**
 * Send the Airline renewal confirmation email.
 * @param {object} doc          - Airlines registration document
 * @param {string} [userEmail]  - Logged-in user's account email (may differ from doc.email)
 */
async function sendAirlineRenewalConfirmation(doc, userEmail) {
  const recipients = collectRecipients(doc.paymentEmail, doc.email, userEmail);
  if (!recipients.length) return;
  await sendMail({
    to:      recipients.join(', '),
    subject: `IFOA USA — ${doc.airlineName || 'Your Company'} Subscription Renewed`,
    html:    buildAirlineRenewalHtml(doc),
  });
}

/**
 * Send the subscription expiry reminder email.
 * Uses collectRecipients so malformed/missing addresses are silently skipped.
 * @param {object}  doc       - Airlines or Individual registration document
 * @param {boolean} isAirline
 * @param {number}  daysLeft
 */
async function sendExpiryReminder(doc, isAirline, daysLeft) {
  const recipients = collectRecipients(doc.paymentEmail, doc.email);
  if (!recipients.length) return;
  const entity = isAirline ? (doc.airlineName || 'Your Company') : 'Your';
  await sendMail({
    to:      recipients.join(', '),
    subject: `IFOA USA — ${entity} Subscription Expires in ${daysLeft} Days`,
    html:    buildExpiryReminderHtml(doc, isAirline, daysLeft),
  });
}

module.exports = {
  sendIndividualPaymentConfirmation,
  sendAirlinePaymentConfirmation,
  sendIndividualRenewalConfirmation,
  sendAirlineRenewalConfirmation,
  sendExpiryReminder,
};
