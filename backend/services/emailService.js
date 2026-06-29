'use strict';

const nodemailer = require('nodemailer');
const mjml2html  = require('mjml');
const path       = require('path');

// ── Transporter ───────────────────────────────────────────────────────────────
function createTransporter() {
  const port   = Number(process.env.SMTP_PORT) || 465;
  const secure = port === 465;
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
}

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'IFOA_USA_white.png');
const FROM      = process.env.MAIL_FROM || '"IFOA Agent Services" <agent@theifoa.com>';

// ── Compile MJML → HTML (async in v5) ────────────────────────────────────────
async function wrap(bodyMjml) {
  const result = await mjml2html(`
<mjml>
  <mj-head>
    <mj-raw>
      <meta name="color-scheme" content="light only" />
      <meta name="supported-color-schemes" content="light only" />
    </mj-raw>
    <mj-attributes>
      <mj-all font-family="Arial, Helvetica, sans-serif" />
      <mj-text font-size="14px" line-height="1.75" color="#222222" padding="0 0 14px 0" />
      <mj-table font-size="13px" color="#222222" padding="0 0 20px 0" />
    </mj-attributes>
    <mj-style>
      :root { color-scheme: light only; supported-color-schemes: light only; }
      /* Force white logo header — resist dark-mode inversion on iOS Mail / Gmail */
      .logo-section,
      .logo-section > tbody > tr > td,
      .logo-section td {
        background-color: #ffffff !important;
        background: #ffffff !important;
      }
      @media (prefers-color-scheme: dark) {
        .logo-section,
        .logo-section > tbody > tr > td,
        .logo-section td {
          background-color: #ffffff !important;
          background: #ffffff !important;
        }
      }
    </mj-style>
  </mj-head>
  <mj-body background-color="#f4f4f4">

    <!-- Logo header — full-width white background, dark-mode resistant -->
    <mj-section background-color="#ffffff" border-bottom="2px solid #cc0000" padding="24px 40px" css-class="logo-section">
      <mj-column background-color="#ffffff">
        <mj-image src="cid:ifoaLogo" alt="IFOA USA" height="56px" width="160px" align="center" padding="0" container-background-color="#ffffff" />
      </mj-column>
    </mj-section>

    <!-- Body content -->
    <mj-section background-color="#ffffff" padding="36px 40px 28px">
      <mj-column>
        ${bodyMjml}
      </mj-column>
    </mj-section>

    <!-- Divider -->
    <mj-section background-color="#ffffff" padding="0 40px">
      <mj-column>
        <mj-divider border-color="#e0e0e0" border-width="1px" padding="0" />
      </mj-column>
    </mj-section>

    <!-- Footer -->
    <mj-section background-color="#ffffff" padding="16px 40px">
      <mj-column>
        <mj-text align="center" font-size="12px" color="#999999" padding="0">
          Sent from <a href="https://theifoa.com" style="color:#999999;">theifoa.com</a>
        </mj-text>
      </mj-column>
    </mj-section>

  </mj-body>
</mjml>`, { validationLevel: 'skip' });

  if (result.errors && result.errors.length) {
    result.errors.forEach(e => console.warn('[mjml]', e.formattedMessage || e));
  }
  return result.html;
}

// ── HTML escape ───────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Format plan name with year count for Multi-Year plans ─────────────────────
function fmtPlan(plan, priceOrYears) {
  if (plan !== 'Multiple Years Subscription Plan') return plan;
  const n = Number(priceOrYears);
  const years = n >= 110
    ? Math.round(n / 55)
    : (n >= 2 ? n : null);
  return years ? `Multiple Years Subscription Plan (${years} Years)` : plan;
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
  return valid;
}

// ── Payment confirmation — Individual ─────────────────────────────────────────
async function buildIndividualConfirmationHtml(doc) {
  const name    = [doc.firstName, doc.lastName].filter(Boolean).join(' ') || 'Valued Member';
  const plan    = fmtPlan(doc.subscriptionPlan || '1 Year Subscription Plan', doc.price || doc.multiYearCount);
  const email   = doc.email || '';
  const cert    = doc.primaryCertificate  || doc.primaryAirmanCertificate || '';
  const certNum = doc.faaCertificateNumber || '';
  const ftn     = doc.iacraTrackingNumber  || '';
  const expiry  = doc.expirationDate
    ? new Date(doc.expirationDate).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
    : 'N/A (Unlimited)';

  return wrap(`
    <mj-text>Dear ${escHtml(name)},</mj-text>
    <mj-text>Thank you for signing up with IFOA USA, you are set now!</mj-text>
    <mj-text>We are proud to serve as your designated U.S. Agent for Service, helping you stay compliant with FAA regulations as an individual with a foreign address as per your selected subscription plan (<strong>${escHtml(plan)}</strong>), starting today.</mj-text>
    <mj-text>The FAA's U.S. Agent for Service (USAS) portal (<a href="https://usas.faa.gov/signin" style="color:#0000cc;">https://usas.faa.gov/signin</a>) has been live since April 2, 2025, so don't forget to officially register IFOA USA as your Agent for Service.</mj-text>
    <mj-text><strong>Your Email:</strong> ${escHtml(email)}</mj-text>
    <mj-text><strong>Your FAA Certificate:</strong> ${escHtml(cert)}</mj-text>
    <mj-text><strong>Your IACRA FTN:</strong> ${escHtml(ftn)}</mj-text>
    ${certNum ? `<mj-text><strong>Your FAA Certificate Number:</strong> ${escHtml(certNum)}</mj-text>` : ''}
    <mj-text><strong>Subscription Expires:</strong> ${expiry}</mj-text>
    <mj-text>As your designated U.S. Agent for Service, we are here to ensure you remain compliant with FAA regulations and never miss an important update or document.</mj-text>
    <mj-text>At this point, no further action is required on your part.</mj-text>
    <mj-text>Whenever we receive FAA correspondence on your behalf, we will forward it to you digitally and notify you immediately.</mj-text>
    <mj-text>You are in good hands, our team will keep you informed of any important changes or new requirements throughout your subscription period.</mj-text>
    <mj-text>If you have any questions, feel free to contact us anytime at <a href="mailto:agent@theifoa.com" style="color:#0000cc;">agent@theifoa.com</a>.</mj-text>
    <mj-text>Thank you once again for choosing IFOA USA.</mj-text>
    <mj-text>We are committed to making your FAA compliance easy and worry-free.</mj-text>
    <mj-text padding="0">Warm regards,<br /><strong>The IFOA USA Team</strong></mj-text>
  `);
}

// ── Payment confirmation — Airline ────────────────────────────────────────────
async function buildAirlineConfirmationHtml(doc) {
  const contact = [doc.firstName, doc.lastName].filter(Boolean).join(' ') || doc.airlineName || 'Valued Partner';
  const airline = doc.airlineName || '';
  const plan    = fmtPlan(doc.subscriptionPlan || '1 Year Subscription Plan', doc.multiYearCount);
  const email   = doc.email || doc.paymentEmail || '';
  const holders = Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0);
  const expiry  = doc.expirationDate
    ? new Date(doc.expirationDate).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
    : 'N/A (Unlimited)';

  return wrap(`
    <mj-text>Dear ${escHtml(contact)},</mj-text>
    <mj-text>Thank you for registering <strong>${escHtml(airline)}</strong> with IFOA USA — you are all set!</mj-text>
    <mj-text>We are proud to serve as your company's designated U.S. Agent for Service, helping ${escHtml(airline)} stay compliant with FAA regulations as per your selected subscription plan (<strong>${escHtml(plan)}</strong>), starting today.</mj-text>
    <mj-text>The FAA's U.S. Agent for Service (USAS) portal (<a href="https://usas.faa.gov/signin" style="color:#0000cc;">https://usas.faa.gov/signin</a>) has been live since April 2, 2025, so don't forget to officially register IFOA USA as your Agent for Service for each certificate holder.</mj-text>
    <mj-text><strong>Company:</strong> ${escHtml(airline)}</mj-text>
    <mj-text><strong>Contact Email:</strong> ${escHtml(email)}</mj-text>
    <mj-text><strong>Certificate Holders:</strong> ${holders}</mj-text>
    <mj-text><strong>Subscription Expires:</strong> ${expiry}</mj-text>
    <mj-text>As your designated U.S. Agent for Service, we are here to ensure your team remains compliant with FAA regulations and never misses an important update or document.</mj-text>
    <mj-text>At this point, no further action is required on your part.</mj-text>
    <mj-text>Whenever we receive FAA correspondence on behalf of your certificate holders, we will forward it to you digitally and notify you immediately.</mj-text>
    <mj-text>You are in good hands, our team will keep you informed of any important changes or new requirements throughout your subscription period.</mj-text>
    <mj-text>If you have any questions, feel free to contact us anytime at <a href="mailto:agent@theifoa.com" style="color:#0000cc;">agent@theifoa.com</a>.</mj-text>
    <mj-text>Thank you once again for choosing IFOA USA.</mj-text>
    <mj-text>We are committed to making your FAA compliance easy and worry-free.</mj-text>
    <mj-text padding="0">Warm regards,<br /><strong>The IFOA USA Team</strong></mj-text>
  `);
}

// ── Renewal confirmation — Individual ────────────────────────────────────────
async function buildIndividualRenewalHtml(doc) {
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
    <mj-text>Dear ${escHtml(name)},</mj-text>
    <mj-text>Great news — your IFOA USA subscription has been successfully renewed!</mj-text>
    <mj-text>Your U.S. Agent for Service coverage continues uninterrupted as per your renewed plan (<strong>${escHtml(plan)}</strong>).</mj-text>
    <mj-table border="1px solid #e0e0e0" cellpadding="0" cellspacing="0">
      <tr style="background:#f7f7f7;border-bottom:1px solid #e0e0e0;">
        <td style="padding:10px 16px;font-size:12px;font-weight:bold;color:#555555;letter-spacing:0.05em;">RENEWAL SUMMARY</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;line-height:2.2;">
          <strong>Plan:</strong> ${escHtml(plan)}<br />
          <strong>Renewed On:</strong> ${escHtml(paidAt)}<br />
          <strong>New Period Starts:</strong> ${escHtml(activationDate)}<br />
          <strong>New Expiry Date:</strong> ${escHtml(expiresAt)}<br />
          ${faaNum ? `<strong>FAA Certificate #:</strong> ${escHtml(faaNum)}<br />` : ''}
          ${ftn    ? `<strong>IACRA FTN #:</strong> ${escHtml(ftn)}<br />` : ''}
          ${cert   ? `<strong>Certificate Type:</strong> ${escHtml(cert)}<br />` : ''}
          <strong>Email:</strong> ${escHtml(email)}
        </td>
      </tr>
    </mj-table>
    <mj-text>Your renewed subscription will become active on <strong>${escHtml(activationDate)}</strong> and will be valid until <strong>${escHtml(expiresAt)}</strong>.</mj-text>
    <mj-text>No further action is required. We will continue forwarding FAA correspondence to you immediately throughout your renewed period.</mj-text>
    <mj-text>If you have any questions, feel free to contact us at <a href="mailto:agent@theifoa.com" style="color:#0000cc;">agent@theifoa.com</a>.</mj-text>
    <mj-text>Thank you for renewing with IFOA USA!</mj-text>
    <mj-text padding="0">Warm regards,<br /><strong>The IFOA USA Team</strong></mj-text>
  `);
}

// ── Renewal confirmation — Airline ────────────────────────────────────────────
async function buildAirlineRenewalHtml(doc) {
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
    <mj-text>Dear ${escHtml(contact)},</mj-text>
    <mj-text>Great news — <strong>${escHtml(airline)}</strong>'s IFOA USA subscription has been successfully renewed!</mj-text>
    <mj-text>Your company's U.S. Agent for Service coverage continues uninterrupted as per the renewed plan (<strong>${escHtml(plan)}</strong>).</mj-text>
    <mj-table border="1px solid #e0e0e0" cellpadding="0" cellspacing="0">
      <tr style="background:#f7f7f7;border-bottom:1px solid #e0e0e0;">
        <td style="padding:10px 16px;font-size:12px;font-weight:bold;color:#555555;letter-spacing:0.05em;">RENEWAL SUMMARY</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;line-height:2.2;">
          <strong>Company:</strong> ${escHtml(airline)}<br />
          <strong>Plan:</strong> ${escHtml(plan)}<br />
          <strong>Renewed On:</strong> ${escHtml(paidAt)}<br />
          <strong>New Period Starts:</strong> ${escHtml(activationDate)}<br />
          <strong>New Expiry Date:</strong> ${escHtml(expiresAt)}<br />
          <strong>Certificate Holders:</strong> ${holders}<br />
          <strong>Contact Email:</strong> ${escHtml(email)}
        </td>
      </tr>
    </mj-table>
    <mj-text>The renewed subscription will be active from <strong>${escHtml(activationDate)}</strong> until <strong>${escHtml(expiresAt)}</strong>.</mj-text>
    <mj-text>No further action is required. We will continue forwarding FAA correspondence for all certificate holders throughout the renewed period.</mj-text>
    <mj-text>If you have any questions, please contact us at <a href="mailto:agent@theifoa.com" style="color:#0000cc;">agent@theifoa.com</a>.</mj-text>
    <mj-text>Thank you for renewing with IFOA USA!</mj-text>
    <mj-text padding="0">Warm regards,<br /><strong>The IFOA USA Team</strong></mj-text>
  `);
}

// ── Holder upgrade confirmation — Airline ────────────────────────────────────
async function buildAirlineHolderUpgradeHtml(doc, additionalCount, newPpc, amountPaid) {
  const contact      = [doc.firstName, doc.lastName].filter(Boolean).join(' ') || doc.airlineName || 'Valued Partner';
  const airline      = doc.airlineName || '';
  const plan         = fmtPlan(doc.subscriptionPlan || '1 Year Subscription Plan', doc.multiYearCount);
  const email        = doc.email || doc.paymentEmail || '';
  const totalHolders = Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0);
  const expiry       = doc.expirationDate
    ? new Date(doc.expirationDate).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
    : 'N/A (Unlimited)';
  const ppcFmt    = newPpc    ? `$${Number(newPpc).toFixed(2)}`    : '—';
  const amountFmt = amountPaid ? `$${Number(amountPaid).toFixed(2)}` : '—';

  return wrap(`
    <mj-text>Dear ${escHtml(contact)},</mj-text>
    <mj-text>Your certificate holder upgrade for <strong>${escHtml(airline)}</strong> has been successfully processed. Your subscription coverage now includes the additional holders.</mj-text>
    <mj-table border="1px solid #e0e0e0" cellpadding="0" cellspacing="0">
      <tr style="background:#f7f7f7;border-bottom:1px solid #e0e0e0;">
        <td style="padding:10px 16px;font-size:12px;font-weight:bold;color:#555555;letter-spacing:0.05em;">HOLDER UPGRADE SUMMARY</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;line-height:2.2;">
          <strong>Company:</strong> ${escHtml(airline)}<br />
          <strong>Contact Email:</strong> ${escHtml(email)}<br />
          <strong>Subscription Plan:</strong> ${escHtml(plan)}<br />
          <strong>Additional Holders Added:</strong> ${additionalCount}<br />
          <strong>Total Certificate Holders:</strong> ${totalHolders}<br />
          <strong>Price per Certificate:</strong> ${ppcFmt}<br />
          <strong>Amount Charged:</strong> ${amountFmt}<br />
          <strong>Subscription Expires:</strong> ${expiry}
        </td>
      </tr>
    </mj-table>
    <mj-text>As your designated U.S. Agent for Service, we will ensure that all newly added certificate holders are covered under your active subscription plan. Each holder should be registered individually on the FAA's U.S. Agent for Service (USAS) portal at <a href="https://usas.faa.gov/signin" style="color:#0000cc;">https://usas.faa.gov/signin</a>.</mj-text>
    <mj-text>No further action is required on your part. Whenever we receive FAA correspondence on behalf of any of your certificate holders, we will forward it to you immediately.</mj-text>
    <mj-text>If you have any questions or need to make further changes to your subscription, please contact us at <a href="mailto:agent@theifoa.com" style="color:#0000cc;">agent@theifoa.com</a>.</mj-text>
    <mj-text>Thank you for continuing to trust IFOA USA with your team's FAA compliance.</mj-text>
    <mj-text padding="0">Warm regards,<br /><strong>The IFOA USA Team</strong></mj-text>
  `);
}

// ── Expiry reminder — shared ──────────────────────────────────────────────────
async function buildExpiryReminderHtml(doc, isAirline, daysLeft) {
  const name   = isAirline
    ? ([doc.firstName, doc.lastName].filter(Boolean).join(' ') || doc.airlineName || 'Valued Partner')
    : ([doc.firstName, doc.lastName].filter(Boolean).join(' ') || 'Valued Member');
  const plan   = fmtPlan(doc.subscriptionPlan || '', doc.price || doc.multiYearCount);
  const email  = doc.email || doc.paymentEmail || '';
  const expiry = doc.expirationDate
    ? new Date(doc.expirationDate).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
    : '';

  const isExpired = daysLeft <= 0;
  const firstLine = isExpired
    ? `This is a friendly reminder that your subscription with IFOA USA, your Agent for Service, has expired on <strong>${expiry}</strong>.`
    : `Please be advised that your subscription with IFOA USA, your Agent for Service, is expiring in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>, on <strong>${expiry}</strong>.`;

  return wrap(`
    <mj-text>Dear ${escHtml(name)},</mj-text>
    <mj-text>${firstLine}</mj-text>
    <mj-text><strong>Current Plan:</strong> ${escHtml(plan)}</mj-text>
    <mj-text><strong>Email:</strong> ${escHtml(email)}</mj-text>
    <mj-text><strong>${isExpired ? 'Expired On' : 'Expiry Date'}:</strong> ${expiry}</mj-text>
    <mj-text>To continue receiving U.S. Agent for Service coverage without interruption, please renew your subscription${isExpired ? '' : ' before the expiry date'}. You can renew directly from your dashboard — no need to fill in the registration form again.</mj-text>
    <mj-button background-color="#cc0000" color="#ffffff" border-radius="8px" font-size="14px" font-weight="bold" inner-padding="12px 28px" href="${process.env.FRONTEND_URL || 'https://agent.theifoa.com'}/dashboard/subscription">
      ${isExpired ? 'Renew Now' : 'Renew Subscription'}
    </mj-button>
    <mj-text>If you have any questions, feel free to contact us at <a href="mailto:agent@theifoa.com" style="color:#0000cc;">agent@theifoa.com</a>.</mj-text>
    <mj-text padding="0">Warm regards,<br /><strong>The IFOA USA Team</strong></mj-text>
  `);
}

// ── Wire payment request — admin notification (sent to self) ──────────────────
async function buildWireRequestAdminNotificationHtml(doc) {
  const airline   = doc.airlineName || [doc.firstName, doc.lastName].filter(Boolean).join(' ') || 'Unknown';
  const email     = doc.email || doc.paymentEmail || '—';
  const purpose   = doc.wireRequestPurpose || 'initial';
  const requestedAt = doc.wirePaymentRequestedAt
    ? new Date(doc.wirePaymentRequestedAt).toLocaleString('en-US', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })
    : new Date().toLocaleString('en-US', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });

  const purposeLabel = purpose === 'renewal' ? 'Subscription Renewal'
    : purpose === 'holder-upgrade'            ? 'Holder Upgrade'
    : 'Initial Registration';

  let detailRows = '';
  if (purpose === 'initial') {
    const plan     = fmtPlan(doc.subscriptionPlan || '—', doc.multiYearCount);
    const holders  = Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0);
    const ppc      = doc.pricePerCertificate || doc.pricePerCert || 0;
    const total    = ppc && holders ? `$${(ppc * holders).toFixed(2)}` : '—';
    detailRows = `
      <strong>Plan:</strong> ${escHtml(plan)}<br />
      <strong>Certificate Holders:</strong> ${holders}<br />
      <strong>Price per Certificate:</strong> $${Number(ppc).toFixed(2)}<br />
      <strong>Estimated Total:</strong> ${total}`;
  } else if (purpose === 'renewal') {
    const currentPlan = fmtPlan(doc.subscriptionPlan || '—', doc.multiYearCount);
    const renewPlan   = fmtPlan(doc.wireRequestRenewalPlan || '—', null);
    const holders     = Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0);
    detailRows = `
      <strong>Current Plan:</strong> ${escHtml(currentPlan)}<br />
      <strong>Requested Renewal Plan:</strong> ${escHtml(renewPlan)}<br />
      <strong>Certificate Holders:</strong> ${holders}`;
  } else if (purpose === 'holder-upgrade') {
    const plan       = fmtPlan(doc.subscriptionPlan || '—', doc.multiYearCount);
    const current    = Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0);
    const additional = Number(doc.wireRequestAdditionalCount || 0);
    detailRows = `
      <strong>Plan:</strong> ${escHtml(plan)}<br />
      <strong>Current Holder Count:</strong> ${current}<br />
      <strong>Additional Holders Requested:</strong> +${additional}<br />
      <strong>New Total:</strong> ${current + additional}`;
  }

  return wrap(`
    <mj-text font-size="17px" font-weight="bold" color="#0f172a" padding="0 0 12px 0">Wire Payment Request Received</mj-text>
    <mj-text>A new wire transfer payment request has been submitted. Please review and generate an invoice for the airline.</mj-text>
    <mj-table border="1px solid #e0e0e0" cellpadding="0" cellspacing="0">
      <tr style="background:#f7f7f7;border-bottom:1px solid #e0e0e0;">
        <td style="padding:10px 16px;font-size:12px;font-weight:bold;color:#555555;letter-spacing:0.05em;">REQUEST DETAILS — ${escHtml(purposeLabel.toUpperCase())}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;line-height:2.2;">
          <strong>Airline / Company:</strong> ${escHtml(airline)}<br />
          <strong>Contact Email:</strong> ${escHtml(email)}<br />
          <strong>Request Type:</strong> ${escHtml(purposeLabel)}<br />
          <strong>Requested At:</strong> ${escHtml(requestedAt)}<br />
          ${detailRows}
        </td>
      </tr>
    </mj-table>
    <mj-text>Please log in to the admin dashboard to review this request, generate the invoice, and mark the payment once received.</mj-text>
    <mj-button background-color="#0000ff" color="#ffffff" border-radius="8px" font-size="14px" font-weight="bold" inner-padding="12px 28px" href="${process.env.FRONTEND_URL || 'https://agent.theifoa.com'}/admin">
      Open Admin Dashboard
    </mj-button>
    <mj-text padding="0">— IFOA USA Automated Notification</mj-text>
  `);
}

// ── OTP email ────────────────────────────────────────────────────────────────
const OTP_LABELS = {
  'signup':            { subject: 'IFOA USA — Verify Your Email to Create Account', heading: 'Verify Your Email', action: 'You recently requested to create a new IFOA USA account.' },
  'password-reset':    { subject: 'IFOA USA — Password Reset Code', heading: 'Reset Your Password', action: 'You requested a password reset for your IFOA USA account.' },
  'secondary-email':   { subject: 'IFOA USA — Verify Secondary Email Address', heading: 'Verify Email Address', action: 'You requested to add this address as a secondary login email on your IFOA USA account.' },
  'credential-change': { subject: 'IFOA USA — Confirm Account Changes', heading: 'Confirm Your Changes', action: 'You requested to update your account credentials (email or password) on IFOA USA.' },
};

async function buildOtpHtml(code, purpose) {
  const { heading, action } = OTP_LABELS[purpose] || OTP_LABELS['signup'];
  return wrap(`
    <mj-text font-size="17px" font-weight="bold" color="#0f172a" padding="0 0 12px 0">${escHtml(heading)}</mj-text>
    <mj-text>${escHtml(action)}</mj-text>
    <mj-text>Use the verification code below to continue. The code expires in <strong>10 minutes</strong>.</mj-text>
    <mj-text align="center" padding="24px 0">
      <div style="display:inline-block;background:#f0f4ff;border:2px solid #0000ff;border-radius:12px;padding:20px 40px;">
        <span style="font-size:36px;font-weight:900;letter-spacing:10px;text-indent:10px;color:#0000ff;font-family:monospace;white-space:nowrap;">${escHtml(code)}</span>
      </div>
    </mj-text>
    <mj-text font-size="13px" color="#64748b">If you did not request this, you can safely ignore this email. Your account will not be affected.</mj-text>
    <mj-text padding="0">Warm regards,<br /><strong>The IFOA USA Team</strong></mj-text>
  `);
}

// ── Custom message from admin/agent (support console) ────────────────────────
async function buildCustomMessageHtml(name, bodyText) {
  const greeting = name ? `<mj-text>Dear ${escHtml(name)},</mj-text>` : '';
  // Preserve the admin's line breaks; escape HTML so content stays plain text.
  const paragraphs = String(bodyText || '')
    .split(/\n{2,}/)
    .map(p => `<mj-text>${escHtml(p).replace(/\n/g, '<br />')}</mj-text>`)
    .join('\n');

  return wrap(`
    ${greeting}
    ${paragraphs}
    <mj-text>If you have any questions, feel free to reply or contact us at <a href="mailto:agent@theifoa.com" style="color:#0000cc;">agent@theifoa.com</a>.</mj-text>
    <mj-text padding="0">Warm regards,<br /><strong>The IFOA USA Team</strong></mj-text>
  `);
}

// ── Core send helper ──────────────────────────────────────────────────────────
async function sendMail({ to, subject, html }) {
  if (process.env.DISABLE_EMAIL === 'true') {
    console.warn('[email] DISABLE_EMAIL=true — skipping email to', to);
    return;
  }
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
    to,
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
async function sendIndividualPaymentConfirmation(doc, userEmail) {
  const recipients = collectRecipients(doc.paymentEmail, doc.email, userEmail);
  if (!recipients.length) return;
  await sendMail({
    to:      recipients.join(', '),
    subject: 'Welcome to IFOA USA — Your Subscription is Active',
    html:    await buildIndividualConfirmationHtml(doc),
  });
}

async function sendAirlinePaymentConfirmation(doc, userEmail) {
  const recipients = collectRecipients(doc.paymentEmail, doc.email, userEmail);
  if (!recipients.length) return;
  await sendMail({
    to:      recipients.join(', '),
    subject: `Welcome to IFOA USA — ${doc.airlineName || 'Your Company'} Subscription is Active`,
    html:    await buildAirlineConfirmationHtml(doc),
  });
}

async function sendIndividualRenewalConfirmation(doc, userEmail) {
  const recipients = collectRecipients(doc.paymentEmail, doc.email, userEmail);
  if (!recipients.length) return;
  await sendMail({
    to:      recipients.join(', '),
    subject: 'IFOA USA — Your Subscription Has Been Renewed',
    html:    await buildIndividualRenewalHtml(doc),
  });
}

async function sendAirlineRenewalConfirmation(doc, userEmail) {
  const recipients = collectRecipients(doc.paymentEmail, doc.email, userEmail);
  if (!recipients.length) return;
  await sendMail({
    to:      recipients.join(', '),
    subject: `IFOA USA — ${doc.airlineName || 'Your Company'} Subscription Renewed`,
    html:    await buildAirlineRenewalHtml(doc),
  });
}

async function sendAirlineHolderUpgradeConfirmation(doc, additionalCount, newPpc, amountPaid, userEmail) {
  const recipients = collectRecipients(doc.paymentEmail, doc.email, userEmail);
  if (!recipients.length) return;
  await sendMail({
    to:      recipients.join(', '),
    subject: `IFOA USA — ${doc.airlineName || 'Your Company'} Holder Upgrade Confirmed`,
    html:    await buildAirlineHolderUpgradeHtml(doc, additionalCount, newPpc, amountPaid),
  });
}

async function sendExpiryReminder(doc, isAirline, daysLeft) {
  const recipients = collectRecipients(doc.paymentEmail, doc.email);
  if (!recipients.length) return;
  const entity  = isAirline ? (doc.airlineName || 'Your Company') : 'Your';
  const isExpired = daysLeft <= 0;
  const subject = isExpired
    ? `IFOA USA — ${entity} Subscription Has Expired`
    : `IFOA USA — ${entity} Subscription Expires in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''}`;
  await sendMail({
    to:      recipients.join(', '),
    subject,
    html:    await buildExpiryReminderHtml(doc, isAirline, daysLeft),
  });
}

async function sendWireRequestAdminNotification(doc) {
  const adminEmail = process.env.SMTP_USER;
  if (!adminEmail) return;
  const airline = doc.airlineName || [doc.firstName, doc.lastName].filter(Boolean).join(' ') || 'Airline';
  const purposeLabel = doc.wireRequestPurpose === 'renewal'        ? 'Renewal'
    : doc.wireRequestPurpose === 'holder-upgrade' ? 'Holder Upgrade'
    : 'Initial';
  await sendMail({
    to:      adminEmail,
    subject: `Wire Payment Request — ${airline} [${purposeLabel}]`,
    html:    await buildWireRequestAdminNotificationHtml(doc),
  });
}

async function sendOtpEmail(email, code, purpose) {
  const label = OTP_LABELS[purpose] || OTP_LABELS['signup'];
  await sendMail({
    to:      email,
    subject: label.subject,
    html:    await buildOtpHtml(code, purpose),
  });
}

// Custom one-off email from the support console to a single user.
async function sendCustomMessageEmail({ email, name, subject, body }) {
  const recipients = collectRecipients(email);
  if (!recipients.length) {
    throw Object.assign(new Error('No valid recipient email address.'), { status: 400 });
  }
  await sendMail({
    to:      recipients.join(', '),
    subject: subject || 'New message from IFOA USA Support',
    html:    await buildCustomMessageHtml(name, body),
  });
  return recipients;
}

module.exports = {
  sendIndividualPaymentConfirmation,
  sendAirlinePaymentConfirmation,
  sendIndividualRenewalConfirmation,
  sendAirlineRenewalConfirmation,
  sendAirlineHolderUpgradeConfirmation,
  sendExpiryReminder,
  sendWireRequestAdminNotification,
  sendOtpEmail,
  sendCustomMessageEmail,
};
