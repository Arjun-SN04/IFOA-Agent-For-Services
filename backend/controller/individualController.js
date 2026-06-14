const Individual = require('../models/Individual');
const User = require('../models/User');
const Renewal = require('../models/Renewal');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const {
  generateInvoiceNumber,
  isInvoiceNumberTaken,
  normalizeInvoiceNumber,
} = require('../services/invoiceNumberService');
const { createOrUpdateInvoice } = require('../services/invoiceService');
const { sendIndividualPaymentConfirmation } = require('../services/emailService');

function toBool(v, defaultValue = false) {
  if (v === undefined || v === null || v === '') return defaultValue;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  const s = String(v).trim().toLowerCase();
  return ['true', '1', 'yes', 'y', 'paid', 'active'].includes(s);
}

function toDateOrNull(v) {
  if (!v) return null;
  const toUtcNoon = (year, month1, day) => {
    const y = Number(year);
    const m = Number(month1);
    const d = Number(day);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  };

  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    // Keep date-only values stable across timezones.
    return toUtcNoon(v.getFullYear(), v.getMonth() + 1, v.getDate());
  }

  let parsed = v;
  if (typeof v === 'number') {
    // Excel serial date (days since 1899-12-30)
    parsed = new Date(Math.round((v - 25569) * 86400 * 1000));
    if (Number.isNaN(parsed.getTime())) return null;
    return toUtcNoon(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate());
  } else if (typeof v === 'string') {
    const s = v.trim();
    if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(s)) {
      const sep = s.includes('/') ? '/' : s.includes('-') ? '-' : '.';
      const parts = s.split(sep);
      // Determine whether date is Y-M-D, M-D-Y or D-M-Y.
      // If sep is '-' and first part is length 4 => ISO YYYY-MM-DD.
      // Otherwise choose day-first when the first part is > 12 (e.g. 23.06.2025),
      // else assume month-first (common in US for slash-separated dates).
      let year, month, day;
      if (sep === '-' && parts[0].length === 4) {
        // ISO: YYYY-MM-DD
        [year, month, day] = parts;
      } else {
        const a = parts[0];
        const b = parts[1];
        const c = parts[2];
        // normalize two-digit years
        const normYear = (y) => (y.length === 2 ? `20${y}` : y);
        if (Number(a) > 12) {
          // treat as D-M-Y
          day = a.padStart(2, '0');
          month = b.padStart(2, '0');
          year = normYear(c);
        } else {
          // treat as M-D-Y
          month = a.padStart(2, '0');
          day = b.padStart(2, '0');
          year = normYear(c);
        }
      }
      return toUtcNoon(year, month, day);
    }
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
      const [y, m, d] = s.split('-');
      return toUtcNoon(y, m, d);
    } else {
      parsed = s;
    }
  }

  const d = new Date(parsed);
  return Number.isNaN(d.getTime()) ? null : d;
}

// DOB-specific parser: dot/slash-separated text is always MM.DD.YYYY (US month-first).
// Also accepts JS Date objects (from cellDates: true).
function parseDobText(v) {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') return toDateOrNull(v); // Excel serial
  const s = String(v).trim();
  // MM.DD.YYYY or MM/DD/YYYY
  const m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (m) {
    const [, mm, dd, rawY] = m;
    const yyyy = rawY.length === 2 ? `20${rawY}` : rawY;
    const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // Fallback: let JS parse ISO strings etc.
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pick(row, keys, fallback = '') {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
  }
  return fallback;
}

function toNumberOrUndefined(v) {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const cleaned = String(v).replace(/[$,\s]/g, '').trim();
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizePlanPrice(plan, multiYearCount, explicitPrice) {
  if (explicitPrice !== undefined && explicitPrice !== null && explicitPrice !== '') {
    return Number(explicitPrice);
  }
  if (plan === 'Unlimited Plan') return 299;
  if (plan === 'Multiple Years Subscription Plan') {
    const years = Number(multiYearCount) > 1 ? Number(multiYearCount) : 2;
    return 55 * years;
  }
  return 69;
}

function computeExpiration(plan, subscriptionDate, multiYearCount) {
  if (!subscriptionDate) return null;
  const d = new Date(subscriptionDate);
  // Flexible plan matching: handle variations in sheet text
  const p = String(plan || '').toLowerCase();
  if (p.includes('unlimited')) return null;
  if (p.includes('1 year') || p.includes('1-year') || p.includes('one year')) {
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  if (p.includes('multi') || p.includes('multiple') || p.includes('year')) {
    const years = Number(multiYearCount) >= 2 ? Number(multiYearCount) : 2;
    d.setFullYear(d.getFullYear() + years);
    return d;
  }
  return null;
}

function buildIndividualPayload(raw) {
  const src = { ...raw };

  const subscriptionPlan =
    pick(src, ['subscriptionPlan', 'plan', 'Subscription Plan']) ||
    '1 Year Subscription Plan';

  // Multi-year parsing: the sheet may contain either a simple year count (e.g. "3")
  // or a string containing a per-year price with the years mentioned (e.g. "$55 per year (3 years)").
  // Try numeric parse first; if that looks like a price (e.g. >20) or is missing,
  // fallback to extracting a small integer (2-20) from the raw text.
  // IMPORTANT: "Multi Year Plan" in exported sheets is often a PRICE column
  // (e.g. "$55.00"), not the duration. Use explicit year-count headers first.
  const rawMYCell = pick(src, [
    'multiYearCount',
    'multiYearYears',
    'yearCount',
    'years',
    'Years',
    'Year',
    'No of Years',
    'No Of Years',
    'No. of Years',
    'Number of Years',
    'Duration (Years)',
    'Multi Year Count',
  ], '');
  const numericMY = toNumberOrUndefined(rawMYCell);
  let multiYearCount;
  if (numericMY !== undefined && Number.isFinite(numericMY) && numericMY >= 2 && numericMY <= 20) {
    multiYearCount = Math.round(numericMY);
  } else {
    const rawStr = String(rawMYCell || '').trim();
    // Common patterns: "3 years", "(3 years)", "55 per year (3 years)", "x3", "3yr"
    const m = rawStr.match(/(\d{1,2})\s*(?:years?|yrs?|yr|y)\b/i)
      || rawStr.match(/\((\d{1,2})\)/)
      || rawStr.match(/x\s*(\d{1,2})\b/i)
      || rawStr.match(/\b(\d{1,2})\b/);
    if (m && m[1]) {
      const v = Number(m[1]);
      if (Number.isFinite(v) && v >= 2 && v <= 20) multiYearCount = v;
    }
    if (!multiYearCount) {
      // Fallback: derive years from total multi-year fee when possible (e.g. 275 -> 5 years).
      const totalFee = toNumberOrUndefined(pick(src, ['totalServiceFees', 'Total Service Fees', 'price', 'Price', 'TOTAL']));
      if (subscriptionPlan === 'Multiple Years Subscription Plan' && Number.isFinite(totalFee)) {
        const inferred = Math.round(Number(totalFee) / 55);
        if (Number.isFinite(inferred) && inferred >= 2 && inferred <= 20 && Math.abs((inferred * 55) - Number(totalFee)) < 0.01) {
          multiYearCount = inferred;
        }
      }
    }
    if (!multiYearCount) multiYearCount = 2;
  }

  const firstName = String(pick(src, ['firstName', 'First Name'])).trim();
  const lastName = String(pick(src, ['lastName', 'Last Name'])).trim();
  const email = String(pick(src, ['email', 'Email'])).toLowerCase().trim();
  const phone = String(pick(src, ['phone', 'Phone'])).trim();

  if (!firstName || !lastName || !email || !phone) {
    throw new Error('firstName, lastName, email, and phone are required.');
  }

  const paymentStatusRaw = String(pick(src, ['paymentStatus', 'Invoice', 'invoiceStatus'], 'pending')).toLowerCase();
  const paid = toBool(src.isPaid, paymentStatusRaw === 'paid');
  const paymentStatus = paid ? 'paid' : (paymentStatusRaw === 'failed' ? 'failed' : 'pending');
  const status = paid ? 'Active' : (pick(src, ['status', 'Status'], 'Pending'));
  const subscriptionDate = paid ? (toDateOrNull(pick(src, ['subscriptionDate', 'Subscription Date'])) || new Date()) : toDateOrNull(pick(src, ['subscriptionDate', 'Subscription Date']));

  const payload = {
    status,
    subscriptionPlan,
    // Prefer explicit row price fields in this order; TOTAL is included for import sheets that only carry final amount there.
    price: normalizePlanPrice(subscriptionPlan, multiYearCount, toNumberOrUndefined(pick(src, ['price', 'Total Service Fees', 'totalServiceFees', 'TOTAL']))),
    subscriptionDate,
    expirationDate: toDateOrNull(pick(src, ['expirationDate', 'Expiration Date'])),
    totalServiceFees: toNumberOrUndefined(pick(src, ['totalServiceFees', 'Total Service Fees'])),

    firstName,
    lastName,
    middleName: String(pick(src, ['middleName', 'Middle Name'])).trim(),
    // parseDobText: dot/slash-separated text is MM.DD.YYYY (US month-first)
    dateOfBirth: parseDobText(pick(src, ['dateOfBirth', 'Date of Birth'])) || null,

    addressLine1: String(pick(src, ['addressLine1', 'Address Line 1'])).trim(),
    city: String(pick(src, ['city', 'City'])).trim(),
    state: String(pick(src, ['state', 'State'])).trim(),
    postalCode: String(pick(src, ['postalCode', 'Zip/Postal Code', 'Postal Code'])).trim(),
    country: String(pick(src, ['country', 'Country'])).trim(),

    phone,
    email,

    primaryAirmanCertificate: pick(src, ['primaryAirmanCertificate', 'Primary Airman Certificate', 'airmanCertificate'], 'EXISTING'),
    primaryCertificate: pick(src, ['primaryCertificate', 'Primary Certificate', 'certificateType'], 'Part 65 - Aircraft Dispatcher'),
    faaCertificateNumber: String(pick(src, ['faaCertificateNumber', 'FAA Certificate Number'])).trim(),
    iacraTrackingNumber: String(pick(src, ['iacraTrackingNumber', 'IACRA Tracking Number (FTN)', 'ftn'])).trim(),
    hasSecondaryCertificate: toBool(
      pick(src, ['hasSecondaryCertificate', 'Do you have a Secondary Airman Certificate?'], false),
      false,
    ),
    secondaryCertificate: String(pick(src, ['secondaryCertificate', 'Secondary Certificate'])).trim(),
    secondaryFaaCertificateNumber: String(pick(src, ['secondaryFaaCertificateNumber', 'Secondary FAA Certificate Number'])).trim(),
    secondaryIacraTrackingNumber: String(pick(src, ['secondaryIacraTrackingNumber', 'Secondary IACRA Tracking Number (FTN)'])).trim(),

    multiYearCount,

    paymentEmail: String(pick(src, ['paymentEmail', 'Email'], email)).toLowerCase().trim(),
    paymentStatus,
    isFormCompleted: paid,
    isPaid: paid,
    invoiceStatus: pick(src, ['invoiceStatus', 'Invoice'], paid ? 'Paid' : 'Pending'),
    invoiceNumber: pick(src, ['invoiceNumber', 'Invoice Number'], ''),

    agreedToTerms: src.agreedToTerms === undefined ? true : toBool(src.agreedToTerms, true),
  };

  if (!payload.expirationDate) {
    payload.expirationDate = computeExpiration(payload.subscriptionPlan, payload.subscriptionDate, payload.multiYearCount);
  }

  return payload;
}

function inferRowKind(row) {
  const marker = String(
    row?.type || row?.role || row?.accountType || row?.registrationType || row?.entity || ''
  ).toLowerCase().trim();

  if (marker.includes('airline') || marker.includes('company') || marker.includes('operator')) return 'airline';
  if (marker.includes('individual') || marker.includes('pilot') || marker.includes('dispatcher')) return 'individual';

  if (row?.airlineName || row?.holderCount || row?.holderCountValue || row?.certificateHolders) return 'airline';
  return 'individual';
}

async function linkOrCreateIndividualUser(individual, payload) {
  let user = await User.findOne({ email: payload.email });
  if (!user) {
    const generatedPassword = '12345678';
    user = await User.create({
      email: payload.email,
      password: generatedPassword,
      role: 'individual',
      firstName: payload.firstName,
      lastName: payload.lastName,
      mustChangePassword: true,   // force password change on first login
      registrationId: individual._id,
      registrationModel: 'Individual',
      subscriptionIds: [individual._id],
    });
    return {
      user,
      loginCredentials: { email: payload.email, password: generatedPassword },
    };
  }

  user.firstName = payload.firstName || user.firstName;
  user.lastName = payload.lastName || user.lastName;
  user.registrationId = individual._id;
  user.registrationModel = 'Individual';
  if (!Array.isArray(user.subscriptionIds)) user.subscriptionIds = [];
  if (!user.subscriptionIds.some((id) => String(id) === String(individual._id))) {
    user.subscriptionIds.push(individual._id);
  }
  await user.save();

  return { user, loginCredentials: null };
}

// Fields the PUBLIC registration form may set. Payment/status/invoice fields are
// server-controlled — accepting them from the client lets anyone register an
// already-"paid" active subscription (mass assignment).
const PUBLIC_INDIVIDUAL_FIELDS = [
  'subscriptionPlan', 'multiYearCount',
  'firstName', 'lastName', 'middleName', 'dateOfBirth',
  'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country',
  'phone', 'email', 'paymentEmail',
  'primaryAirmanCertificate', 'primaryCertificate',
  'faaCertificateNumber', 'iacraTrackingNumber',
  'hasSecondaryCertificate', 'secondaryCertificate',
  'secondaryFaaCertificateNumber', 'secondaryIacraTrackingNumber',
  'agreedToTerms',
];

// ── Create ────────────────────────────────────────────────────────────────────
exports.createIndividual = async (req, res) => {
  try {
    const body = {};
    PUBLIC_INDIVIDUAL_FIELDS.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(req.body, f)) body[f] = req.body[f];
    });
    // Normalize email to lowercase so all lookups match regardless of case
    if (body.email) body.email = body.email.toLowerCase().trim();
    if (body.paymentEmail) body.paymentEmail = String(body.paymentEmail).toLowerCase().trim();

    // Multi-year count only meaningful for the Multi-Year plan; clamp to >= 2.
    if (body.subscriptionPlan === 'Multiple Years Subscription Plan') {
      const y = Number(body.multiYearCount);
      body.multiYearCount = Number.isFinite(y) && y >= 2 ? Math.round(y) : 2;
    } else {
      delete body.multiYearCount;
    }

    // Price is ALWAYS computed server-side from the plan — never client-supplied.
    body.price = normalizePlanPrice(body.subscriptionPlan, body.multiYearCount, null);
    body.totalServiceFees = body.price;

    if (body.email) {
      const existing = await Individual.findOne({ email: body.email });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'You have already submitted this form. Please edit your submitted form from the Subscription dashboard.',
          data: existing,
        });
      }
    }

    const individual = new Individual(body);
    await individual.save();
    res.status(201).json({ success: true, data: individual });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Admin: Create individual form with user account linkage ───────────────────
exports.adminCreateIndividualForm = async (req, res) => {
  try {
    const payload = buildIndividualPayload(req.body || {});
    const individual = await Individual.create(payload);
    const linked = await linkOrCreateIndividualUser(individual, payload);

    res.status(201).json({
      success: true,
      message: 'Individual form created successfully.',
      data: {
        individual,
        user: {
          email: linked.user.email,
          role: linked.user.role,
          firstName: linked.user.firstName,
          lastName: linked.user.lastName,
        },
        loginCredentials: linked.loginCredentials,
      },
    });

    if (individual.isPaid) {
      sendIndividualPaymentConfirmation(individual).catch((e) =>
        console.warn('[adminCreateIndividualForm] Email failed:', e.message)
      );
    }
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Admin: Bulk import individuals from Excel ─────────────────────────────────
exports.adminImportIndividualsFromExcel = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Excel file is required.' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ success: false, message: 'No worksheet found in the uploaded file.' });
    }

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'The uploaded sheet is empty.' });
    }

    const created = [];
    const failed = [];
    const skipped = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Skip blank/header rows (all meaningful fields empty)
      const hasContent = ['First Name', 'firstName', 'Last Name', 'lastName', 'Email', 'email', 'Phone', 'phone']
        .some(k => row[k] && String(row[k]).trim() !== '');
      if (!hasContent) {
        skipped.push({ row: i + 2, reason: 'Blank row skipped.' });
        continue;
      }

      const rowKind = inferRowKind(row);
      if (rowKind !== 'individual') {
        skipped.push({ row: i + 2, reason: `Skipped ${rowKind} row during individual import.` });
        continue;
      }

      try {
        const payload = buildIndividualPayload(row);
        const existing = await Individual.findOne({ email: payload.email });
        if (existing) {
          skipped.push({ row: i + 2, reason: `Email already exists: ${payload.email}` });
          continue;
        }
        const individual = await Individual.create(payload);
        await linkOrCreateIndividualUser(individual, payload);
        created.push({
          row: i + 2,
          id: individual._id,
          email: individual.email,
          name: `${individual.firstName} ${individual.lastName}`.trim(),
        });
      } catch (rowErr) {
        failed.push({ row: i + 2, error: rowErr.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `Imported ${created.length} individual(s) from Excel.`,
      data: {
        importedCount: created.length,
        failedCount: failed.length,
        skippedCount: skipped.length,
        created,
        failed,
        skipped,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Get All (Admin) ───────────────────────────────────────────────────────────
exports.getAllIndividuals = async (req, res) => {
  try {
    const individuals = await Individual.find().sort({ createdAt: -1 });
    res.json({ success: true, data: individuals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get by Email ──────────────────────────────────────────────────────────────
// Returns ALL subscriptions for this email so the UI can show them all.
// data  = most recent record (backward compat with single-record consumers)
// all   = full array sorted newest first
exports.getIndividualByEmail = async (req, res) => {
  try {
    const email = (req.query.email || req.params.email || '').trim();
    if (!email)
      return res.status(400).json({ success: false, message: 'Email is required' });

    // Non-admins may only query their own email
    if (req.user?.role !== 'admin' && email.toLowerCase() !== (req.user?.email || '').toLowerCase())
      return res.status(403).json({ success: false, message: 'Access denied.' });

    // Case-insensitive match — handles old records stored in mixed case
    const safeEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const emailRegex = new RegExp('^' + safeEmail + '$', 'i');

    const individuals = await Individual.find({ email: emailRegex }).sort({ createdAt: -1 });

    // Return 200 with empty array when no records found (avoids noisy 404s in browser console)
    if (!individuals || individuals.length === 0)
      return res.json({ success: true, data: null, all: [] });

    res.json({ success: true, data: individuals[0], all: individuals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get by ID ─────────────────────────────────────────────────────────────────
// Returns 200+null (not 404) when the ID is not found so that dashboard pages
// with stale registrationId / subscriptionIds values in the JWT don't generate
// noisy browser-console network errors. The frontend already handles null gracefully.
exports.getIndividualById = async (req, res) => {
  try {
    // Validate that the id is a well-formed ObjectId before hitting the DB.
    const { id } = req.params;
    if (!id || !/^[a-f\d]{24}$/i.test(id)) {
      return res.status(200).json({ success: true, data: null });
    }

    const individual = await Individual.findById(id);

    // Return 200+null for missing records so stale IDs stored in user JWT
    // tokens fail silently — the caller already falls back to email lookup.
    if (!individual) return res.status(200).json({ success: true, data: null });

    res.json({ success: true, data: individual });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update ────────────────────────────────────────────────────────────────────
exports.updateIndividual = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';

    const adminOnlyFields = new Set([
      'status', 'paymentStatus', 'isPaid', 'isFormCompleted',
      'price', 'totalServiceFees',
      'invoiceGenerated', 'invoiceNumber', 'invoiceStatus', 'invoiceDraft',
      'wirePaymentRequested', 'wirePaymentRequestedAt',
      // Subscription period is server/admin-controlled — a user who could set
      // these directly would be able to extend their own coverage for free.
      'subscriptionDate', 'expirationDate',
    ]);

    // Plan fields a user may change ONLY before payment (PaymentModal pre-checkout
    // adjustments). Once paid, plan changes go through the renewal/upgrade flows.
    const paidLockedFields = new Set(['subscriptionPlan', 'multiYearCount']);

    const allowedFields = [
      // Admin-only (filtered below for non-admins)
      'status', 'paymentStatus', 'isPaid', 'isFormCompleted',
      'price', 'totalServiceFees',
      'invoiceGenerated', 'invoiceNumber', 'invoiceStatus', 'invoiceDraft',
      'wirePaymentRequested', 'wirePaymentRequestedAt',
      'subscriptionDate', 'expirationDate',
      // User-editable fields
      'subscriptionPlan', 'multiYearCount',
      'firstName', 'lastName', 'middleName', 'dateOfBirth',
      'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country',
      'phone', 'email',
      'paymentEmail',
      'primaryAirmanCertificate', 'primaryCertificate',
      'faaCertificateNumber', 'iacraTrackingNumber',
      'hasSecondaryCertificate', 'secondaryCertificate',
      'secondaryFaaCertificateNumber', 'secondaryIacraTrackingNumber',
    ];

    // Non-admin editing a PAID record: plan/year changes are locked too.
    let recordIsPaid = false;
    if (!isAdmin) {
      const cur = await Individual.findById(req.params.id).select('isPaid paymentStatus');
      if (!cur) return res.status(404).json({ success: false, message: 'Not found' });
      recordIsPaid = !!(cur.isPaid || cur.paymentStatus === 'paid');
    }

    const payload = {};
    allowedFields.forEach((field) => {
      if (!isAdmin && adminOnlyFields.has(field)) return;
      if (!isAdmin && recordIsPaid && paidLockedFields.has(field)) return;
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        payload[field] = req.body[field];
      }
    });

    if (payload.email) payload.email = String(payload.email).toLowerCase().trim();

    // Capture the registration's invoice number BEFORE the update so we can sync the
    // canonical Invoice/Payment docs if an admin renames it (see post-update block).
    let oldInvoiceNumberForSync = null;
    let invoiceNumberChanged    = false;
    if (isAdmin && Object.prototype.hasOwnProperty.call(payload, 'invoiceNumber')) {
      const requestedInvoiceNumber = normalizeInvoiceNumber(payload.invoiceNumber);
      const currentDoc = await Individual.findById(req.params.id).select('invoiceNumber');
      if (!currentDoc)
        return res.status(404).json({ success: false, message: 'Not found' });

      const currentInvoiceNumber = normalizeInvoiceNumber(currentDoc.invoiceNumber);
      if (requestedInvoiceNumber && requestedInvoiceNumber !== currentInvoiceNumber) {
        const alreadyUsed = await isInvoiceNumberTaken(requestedInvoiceNumber);
        if (alreadyUsed) {
          return res.status(400).json({
            success: false,
            message: 'Invoice number already exists. Please use a different value.',
          });
        }
        oldInvoiceNumberForSync = currentInvoiceNumber;
        invoiceNumberChanged    = true;
      }
      payload.invoiceNumber = requestedInvoiceNumber;
    }

    // Keep completion flag in sync when payment state is explicitly changed.
    if (payload.paymentStatus === 'paid' || payload.isPaid === true) {
      payload.isFormCompleted = true;
    }
    if (payload.paymentStatus === 'failed' || payload.isPaid === false) {
      payload.isFormCompleted = false;
    }

    // Auto-compute subscriptionDate + expirationDate when admin marks as paid
    // (Stripe sets these via applyPaymentToRegistration, but wire/manual marking does not).
    if (isAdmin && (payload.isPaid === true || payload.paymentStatus === 'paid') && !payload.expirationDate) {
      const existingForExpiry = await Individual.findById(req.params.id)
        .select('subscriptionPlan multiYearCount subscriptionDate expirationDate price');
      if (existingForExpiry && !existingForExpiry.expirationDate) {
        const plan = payload.subscriptionPlan || existingForExpiry.subscriptionPlan;
        // Derive year count: prefer explicit field, then derive from price ($55/yr)
        let years = Number(payload.multiYearCount || existingForExpiry.multiYearCount || 0);
        if (!years && plan === 'Multiple Years Subscription Plan') {
          const recordPrice = Number(existingForExpiry.price || 0);
          if (recordPrice > 0) years = Math.max(2, Math.round(recordPrice / 55));
        }
        // Seed subscriptionDate to now if the record never had one
        if (!existingForExpiry.subscriptionDate && !payload.subscriptionDate) {
          payload.subscriptionDate = new Date();
        }
        const fromDate = payload.subscriptionDate || existingForExpiry.subscriptionDate || new Date();
        const computed = computeExpiration(plan, fromDate, years || null);
        if (computed) payload.expirationDate = computed;
      }
    }

    // Pre-payment: auto-recompute price when plan/multiYearCount changes (non-admin).
    // Price is admin-only to prevent arbitrary manipulation, but before payment we
    // allow it to update automatically so the PaymentModal shows the correct amount.
    if (!isAdmin && (payload.subscriptionPlan !== undefined || payload.multiYearCount !== undefined)) {
      const existing = await Individual.findById(req.params.id).select('isPaid subscriptionPlan multiYearCount');
      if (existing && !existing.isPaid) {
        const plan = payload.subscriptionPlan || existing.subscriptionPlan;
        const years = payload.multiYearCount || existing.multiYearCount;
        payload.price = normalizePlanPrice(plan, years, null);
      }
    }

    // Detect unpaid → paid transition so we know whether to send the confirmation email.
    // Only check when admin is explicitly marking as paid (avoid the DB call otherwise).
    let wasAlreadyPaid = false;
    if (isAdmin && (payload.isPaid === true || payload.paymentStatus === 'paid')) {
      const prev = await Individual.findById(req.params.id).select('isPaid paymentStatus');
      wasAlreadyPaid = !!(prev?.isPaid || prev?.paymentStatus === 'paid');
    }

    const individual = await Individual.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: false },
    );
    if (!individual)
      return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: individual });

    // ── Sync canonical Invoice + Payment when admin renamed the invoice number ──
    // Keeps the Invoice doc (and its PDF) aligned with the registration's number
    // instead of leaving the old number on the canonical record.
    if (invoiceNumberChanged && payload.invoiceNumber) {
      try {
        const Invoice = require('../models/Invoice');
        const Payment = require('../models/Payment');
        const newNum  = payload.invoiceNumber;
        // ONLY rename the invoice that exactly carried the registration's OLD number.
        // With no prior number, do NOT grab an arbitrary paymentId:null doc — it could be
        // a renewal/holder-upgrade invoice and renaming it would override a different one.
        const targetInvoice = oldInvoiceNumberForSync
          ? await Invoice.findOne({ registrationId: req.params.id, invoiceNumber: oldInvoiceNumberForSync }).sort({ createdAt: 1 })
          : null;
        if (targetInvoice) {
          targetInvoice.invoiceNumber = newNum;
          if (targetInvoice.draft) {
            targetInvoice.draft = { ...targetInvoice.draft, invoiceNumber: newNum };
            targetInvoice.markModified('draft');
          }
          await targetInvoice.save();
          if (targetInvoice.paymentId) {
            await Payment.findByIdAndUpdate(targetInvoice.paymentId, { $set: { invoiceNumber: newNum } });
          }
        } else if (oldInvoiceNumberForSync) {
          await Payment.updateMany(
            { registrationId: req.params.id, invoiceNumber: oldInvoiceNumberForSync },
            { $set: { invoiceNumber: newNum } },
          );
        }
      } catch (syncErr) {
        console.warn('[updateIndividual] Invoice number sync failed:', syncErr.message);
      }
    }

    // Send confirmation email when admin activates a subscription for the first time.
    if (isAdmin && (payload.isPaid === true || payload.paymentStatus === 'paid') && !wasAlreadyPaid) {
      sendIndividualPaymentConfirmation(individual).catch((e) =>
        console.warn('[updateIndividual] Confirmation email failed:', e.message)
      );
    }
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Delete ────────────────────────────────────────────────────────────────────
exports.deleteIndividual = async (req, res) => {
  try {
    const individual = await Individual.findByIdAndDelete(req.params.id);
    if (!individual)
      return res.status(404).json({ success: false, message: 'Not found' });

    // Unlink deleted subscription from any linked user account.
    await User.updateMany(
      { subscriptionIds: individual._id },
      { $pull: { subscriptionIds: individual._id } },
    );

    await User.updateMany(
      { registrationId: individual._id },
      { $set: { registrationId: null, registrationModel: null } },
    );

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Soft cancel (individual requests cancellation) ───────────────────────────────
// Flags the plan cancelled; data is retained until an admin keeps / edits / deletes it.
exports.cancelPlan = async (req, res) => {
  try {
    const doc = await Individual.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    doc.planCancelled = true;
    doc.planCancelledAt = new Date();
    await doc.save();
    return res.json({ success: true, message: 'Cancellation requested — an admin will review it.', data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: keep (un-cancel) a soft-cancelled individual plan ──────────────────────
exports.uncancelPlan = async (req, res) => {
  try {
    const doc = await Individual.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    doc.planCancelled = false;
    doc.planCancelledAt = null;
    await doc.save();
    return res.json({ success: true, message: 'Plan kept.', data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Bulk Delete ────────────────────────────────────────────────────────────────
exports.bulkDeleteIndividuals = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, message: 'No ids provided.' });

    const deleted = await Individual.find({ _id: { $in: ids } });
    await Individual.deleteMany({ _id: { $in: ids } });

    for (const ind of deleted) {
      await User.updateMany(
        { subscriptionIds: ind._id },
        { $pull: { subscriptionIds: ind._id } },
      );
      await User.updateMany(
        { registrationId: ind._id },
        { $set: { registrationId: null, registrationModel: null } },
      );
    }

    res.json({ success: true, message: `Deleted ${deleted.length} record(s).`, count: deleted.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Set nextRenewal.invoiceNumber (admin only) ─────────────────────────────────
exports.setRenewalInvoiceNumber = async (req, res) => {
  try {
    const { invoiceNumber } = req.body;
    const requestedInvoiceNumber = normalizeInvoiceNumber(invoiceNumber);
    if (!requestedInvoiceNumber)
      return res.status(400).json({ success: false, message: 'invoiceNumber required.' });

    const current = await Individual.findById(req.params.id).select('nextRenewal nextRenewalId');
    if (!current) return res.status(404).json({ success: false, message: 'Not found.' });

    const currentQueuedInvoiceNumber = normalizeInvoiceNumber(current.nextRenewal?.invoiceNumber);
    if (requestedInvoiceNumber !== currentQueuedInvoiceNumber) {
      const alreadyUsed = await isInvoiceNumberTaken(requestedInvoiceNumber);
      if (alreadyUsed) {
        return res.status(400).json({
          success: false,
          message: 'Invoice number already exists. Please use a different value.',
        });
      }
    }

    const doc = await Individual.findByIdAndUpdate(
      req.params.id,
      { $set: { 'nextRenewal.invoiceNumber': requestedInvoiceNumber } },
      { new: true },
    );

    if (current.nextRenewalId) {
      await Renewal.findByIdAndUpdate(current.nextRenewalId, {
        $set: { invoiceNumber: requestedInvoiceNumber },
      });
    }

    res.json({ success: true, data: doc });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number already exists. Please use a different value.',
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Update nextRenewal details (admin only) ────────────────────────────────────
exports.updateRenewalDetails = async (req, res) => {
  try {
    const current = await Individual.findById(req.params.id).select('invoiceNumber nextRenewal nextRenewalId');
    if (!current) return res.status(404).json({ success: false, message: 'Not found.' });
    if (!current.nextRenewal?.paidAt) {
      return res.status(400).json({ success: false, message: 'No queued renewal found.' });
    }

    const set = {};
    const renewalSet = {};
    const body = req.body || {};

    if (Object.prototype.hasOwnProperty.call(body, 'plan')) {
      const plan = String(body.plan || '').trim();
      const allowed = new Set([
        '1 Year Subscription Plan',
        'Multiple Years Subscription Plan',
        'Unlimited Plan',
      ]);
      if (!allowed.has(plan)) {
        return res.status(400).json({ success: false, message: 'Invalid renewal plan.' });
      }
      set['nextRenewal.plan'] = plan;
      renewalSet.plan = plan;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'multiYearCount')) {
      const years = Number(body.multiYearCount);
      if (!Number.isFinite(years) || years < 2) {
        return res.status(400).json({ success: false, message: 'multiYearCount must be at least 2.' });
      }
      set['nextRenewal.multiYearCount'] = years;
      renewalSet.multiYearCount = years;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'activationDate')) {
      const d = new Date(body.activationDate);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid activationDate.' });
      }
      set['nextRenewal.activationDate'] = d;
      renewalSet.activationDate = d;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'expiresAt')) {
      const d = new Date(body.expiresAt);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid expiresAt.' });
      }
      set['nextRenewal.expiresAt'] = d;
      renewalSet.expiresAt = d;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'price')) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ success: false, message: 'price must be a non-negative number.' });
      }
      set['nextRenewal.price'] = price;
      renewalSet.price = price;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'invoiceNumber')) {
      const requestedInvoiceNumber = normalizeInvoiceNumber(body.invoiceNumber);
      if (!requestedInvoiceNumber) {
        return res.status(400).json({ success: false, message: 'invoiceNumber required.' });
      }
      const currentQueuedInvoiceNumber = normalizeInvoiceNumber(current.nextRenewal?.invoiceNumber);
      if (requestedInvoiceNumber !== currentQueuedInvoiceNumber) {
        const alreadyUsed = await isInvoiceNumberTaken(requestedInvoiceNumber);
        if (alreadyUsed) {
          return res.status(400).json({
            success: false,
            message: 'Invoice number already exists. Please use a different value.',
          });
        }
      }
      set['nextRenewal.invoiceNumber'] = requestedInvoiceNumber;
      renewalSet.invoiceNumber = requestedInvoiceNumber;
    }

    if (Object.keys(set).length === 0) {
      return res.status(400).json({ success: false, message: 'No renewal fields provided.' });
    }

    const doc = await Individual.findByIdAndUpdate(
      req.params.id,
      { $set: set },
      { new: true },
    );

    if (current.nextRenewalId && Object.keys(renewalSet).length > 0) {
      await Renewal.findByIdAndUpdate(current.nextRenewalId, { $set: renewalSet });
    }

    res.json({ success: true, data: doc });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number already exists. Please use a different value.',
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Mark Paid (fallback after Stripe payment if /payments/confirm failed) ─────
// Idempotent — safe to call multiple times.
exports.markIndividualPaid = async (req, res) => {
  try {
    const now        = new Date();
    const individual = await Individual.findById(req.params.id);
    if (!individual)
      return res.status(404).json({ success: false, message: 'Not found' });

    // Idempotent: return existing data without overwriting if already paid
    if (individual.isPaid || individual.paymentStatus === 'paid') {
      return res.json({ success: true, data: individual, alreadyPaid: true });
    }

    const update = {
      paymentStatus: 'paid',
      isPaid:        true,
      isFormCompleted: true,
      status:        'Active',
      subscriptionDate: now,
      invoiceStatus: 'Paid',
      // Preserve an existing invoiceNumber (set by /payments/confirm) — only generate new if missing
      invoiceNumber: individual.invoiceNumber || await generateInvoiceNumber(),
    };

    if (individual.subscriptionPlan === '1 Year Subscription Plan') {
      const exp = new Date(now);
      exp.setFullYear(exp.getFullYear() + 1);
      update.expirationDate = exp;
    } else if (individual.subscriptionPlan === 'Multiple Years Subscription Plan') {
      // Year count: derived from price ($55/yr, authoritative — legacy records carry
      // a wrong DB-default multiYearCount of 3) > explicit field > documented minimum 2.
      // Mirrors effectiveMultiYears() in paymentController.
      const recordPrice = Number(individual.price || 0);
      const years = (recordPrice >= 110 ? Math.round(recordPrice / 55) : 0)
        || Number(individual.multiYearCount)
        || 2;
      const exp = new Date(now);
      exp.setFullYear(exp.getFullYear() + Math.max(2, years));
      update.expirationDate = exp;
    }
    // Unlimited Plan — no expiry date set

    const updated = await Individual.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true },
    );

    // Create canonical Invoice document for wire/manual payments so the user's
    // SubscriptionPage and admin always see the same invoice.
    try {
      const price = Number(individual.price || individual.totalServiceFees || 0);
      await createOrUpdateInvoice({
        registrationId:    individual._id,
        registrationModel: 'Individual',
        paymentId:         individual.paymentId || null,
        snapshot: {
          name:             [individual.firstName, individual.lastName].filter(Boolean).join(' '),
          email:            individual.email || '',
          phone:            individual.phone || '',
          address:          [individual.addressLine1, individual.city, individual.state, individual.postalCode, individual.country].filter(Boolean).join(', '),
          isAirline:        false,
          airlineName:      '',
          subscriptionPlan: individual.subscriptionPlan || '',
          subscriptionDate: now,
          expirationDate:   update.expirationDate || null,
          primaryCertificate:   individual.primaryCertificate   || '',
          faaCertificateNumber: individual.faaCertificateNumber || '',
          iacraTrackingNumber:  individual.iacraTrackingNumber  || '',
          holderCount:  1,
          pricePerCert: price,
          subtotal:     price,
          tax:          0,
          totalPaid:    price,
        },
        amountDollars:         price,
        paidAt:                now,
        paymentMethod:         'wire',
        existingInvoiceNumber: update.invoiceNumber,
      });
    } catch (invErr) {
      console.warn('[individualMarkPaid] Invoice doc creation failed:', invErr.message);
    }

    res.json({ success: true, data: updated });

    // Send payment confirmation email (non-blocking)
    sendIndividualPaymentConfirmation(updated).catch((e) =>
      console.warn('[markIndividualPaid] Email failed:', e.message)
    );
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Export to Excel ───────────────────────────────────────────────────────────
exports.exportToExcel = async (req, res) => {
  try {
    const individuals = await Individual.find().sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet    = workbook.addWorksheet('Agent_for_Serv_ Indiv');

    sheet.columns = [
      { header: 'Status',                                       key: 'status',                         width: 12 },
      { header: 'Subscription Date',                            key: 'subscriptionDate',                width: 20 },
      { header: 'Expiration Date',                              key: 'expirationDate',                  width: 20 },
      { header: 'Subscription Plan',                            key: 'subscriptionPlan',                width: 28 },
      { header: '1 Year Plan',                                  key: 'oneYearPlan',                     width: 12 },
      { header: 'Multi Year Plan',                              key: 'multiYearPlan',                   width: 14 },
      { header: 'Unlimited Plan',                               key: 'unlimitedPlan',                   width: 14 },
      { header: 'First Name',                                   key: 'firstName',                       width: 16 },
      { header: 'Last Name',                                    key: 'lastName',                        width: 16 },
      { header: 'Middle Name',                                  key: 'middleName',                      width: 14 },
      { header: 'Date of Birth',                                key: 'dateOfBirth',                     width: 14 },
      { header: 'Address Line 1',                               key: 'addressLine1',                    width: 30 },
      { header: 'City',                                         key: 'city',                            width: 16 },
      { header: 'Zip/Postal Code',                              key: 'postalCode',                      width: 14 },
      { header: 'Country',                                      key: 'country',                         width: 12 },
      { header: 'Phone',                                        key: 'phone',                           width: 18 },
      { header: 'Email',                                        key: 'email',                           width: 28 },
      { header: 'Primary Airman Certificate',                   key: 'primaryAirmanCertificate',        width: 22 },
      { header: 'Do you have a Secondary Airman Certificate?',  key: 'hasSecondary',                    width: 14 },
      { header: 'Primary Certificate',                          key: 'primaryCertificate',              width: 34 },
      { header: 'FAA Certificate Number',                       key: 'faaCertificateNumber',            width: 22 },
      { header: 'IACRA Tracking Number (FTN)',                  key: 'iacraTrackingNumber',             width: 24 },
      { header: 'Secondary Certificate',                        key: 'secondaryCertificate',            width: 34 },
      { header: 'Secondary FAA Certificate Number',             key: 'secondaryFaaCertificateNumber',   width: 26 },
      { header: 'Secondary IACRA Tracking Number (FTN)',        key: 'secondaryIacraTrackingNumber',    width: 26 },
      { header: 'Total Service Fees',                           key: 'totalServiceFees',                width: 18 },
      { header: 'Invoice',                                      key: 'invoiceStatus',                   width: 12 },
      { header: 'TOTAL',                                        key: 'price',                           width: 10 },
    ];

    const hdr = sheet.getRow(1);
    hdr.font      = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
    hdr.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a2e5a' } };
    hdr.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    hdr.height    = 30;

    const fmt = (date) => date ? new Date(date).toLocaleDateString('en-US') : '';

    individuals.forEach((doc) => {
      const d          = doc.toObject();
      const isOneYear  = d.subscriptionPlan === '1 Year Subscription Plan';
      const isMulti    = d.subscriptionPlan === 'Multiple Years Subscription Plan';
      const isUnlimited= d.subscriptionPlan === 'Unlimited Plan';

      const r = sheet.addRow({
        status:                        d.status || '',
        subscriptionDate:              fmt(d.subscriptionDate || d.createdAt),
        expirationDate:                d.expirationDate ? fmt(d.expirationDate) : (isUnlimited ? 'Never' : ''),
        subscriptionPlan:              d.subscriptionPlan || '',
        oneYearPlan:                   isOneYear   ? `${d.price?.toFixed(2) || '69.00'}` : '',
        multiYearPlan:                 isMulti     ? `${d.price?.toFixed(2) || ''}` : '',
        unlimitedPlan:                 isUnlimited ? `${d.price?.toFixed(2) || '299.00'}` : '',
        firstName:                     d.firstName  || '',
        lastName:                      d.lastName   || '',
        middleName:                    d.middleName || '',
        dateOfBirth:                   fmt(d.dateOfBirth),
        addressLine1:                  d.addressLine1 || '',
        city:                          d.city       || '',
        postalCode:                    d.postalCode  || '',
        country:                       d.country    || '',
        phone:                         d.phone ? `+${d.phone}` : '',
        email:                         d.email      || '',
        primaryAirmanCertificate:      d.primaryAirmanCertificate || '',
        hasSecondary:                  d.hasSecondaryCertificate ? 'Yes' : 'No',
        primaryCertificate:            d.primaryCertificate || '',
        faaCertificateNumber:          d.faaCertificateNumber || '',
        iacraTrackingNumber:           d.iacraTrackingNumber  || '',
        secondaryCertificate:          d.hasSecondaryCertificate ? (d.secondaryCertificate || '') : '',
        secondaryFaaCertificateNumber: d.hasSecondaryCertificate ? (d.secondaryFaaCertificateNumber || '') : '',
        secondaryIacraTrackingNumber:  d.hasSecondaryCertificate ? (d.secondaryIacraTrackingNumber  || '') : '',
        totalServiceFees:              d.totalServiceFees || d.price || '',
        invoiceStatus:                 d.invoiceStatus || d.paymentStatus || '',
        price:                         d.price || '',
      });
      r.font = { name: 'Arial', size: 10 };
      r.eachCell(cell => {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
      });
    });

    sheet.autoFilter = { from: 'A1', to: { row: 1, column: sheet.columns.length } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Export_Individuals_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// (renewIndividual removed — admin renewals go through adminRenew in
// paymentController, which creates the Payment/Invoice/Renewal docs and runs the
// same queued/immediate activation logic as a paid Stripe renewal.)

// ─── PATCH /api/individuals/:id/mark-invoice-generated ───────────────────────
// Called by admin after downloading the PDF invoice — marks invoiceGenerated = true
exports.markInvoiceGenerated = async (req, res) => {
  try {
    const doc = await Individual.findByIdAndUpdate(
      req.params.id,
      { $set: { invoiceGenerated: true } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Individual not found.' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
