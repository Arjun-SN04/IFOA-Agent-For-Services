const Airlines             = require('../models/Airlines');
const AirlinesSubscription = require('../models/AirlinesSubscription'); // legacy model
const User = require('../models/User');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const { generateInvoiceNumber } = require('../services/invoiceNumberService');
const { createOrUpdateInvoice }  = require('../services/invoiceService');
const { sendAirlinePaymentConfirmation } = require('../services/emailService');

// Server-side pricing tables (used to validate / recompute price on create)
const UNLIMITED_PRICES = { '3 to 5': 265, '5 to 10': 255, 'More than 10': 245 };
const ONE_YEAR_PRICES  = { '3 to 5': 60,  '5 to 10': 55,  'More than 10': 49  };

function resolvePricePerCertificate(body) {
  const { subscriptionPlan, holderCount } = body;
  if (subscriptionPlan === 'Unlimited Plan')             return UNLIMITED_PRICES[holderCount] ?? 265;
  if (subscriptionPlan === '1 Year Subscription Plan')   return ONE_YEAR_PRICES[holderCount]  ?? 49;
  return 55; // Multiple Years fallback
}

function inferRowKind(row) {
  const marker = String(
    row?.type || row?.role || row?.accountType || row?.registrationType || row?.entity || ''
  ).toLowerCase().trim();

  if (marker.includes('airline') || marker.includes('company') || marker.includes('operator')) return 'airline';
  if (marker.includes('individual') || marker.includes('pilot') || marker.includes('dispatcher')) return 'individual';

  if (row?.airlineName || row?.Airlines || row?.holderCount || row?.holderCountValue || row?.certificateHolders || row?.TeamMembers || row?.['Team Members']) return 'airline';
  return 'individual';
}

function toDateOrNull(v) {
  if (!v) return null;
  let parsed = v;
  if (typeof v === 'number') {
    parsed = new Date(Math.round((v - 25569) * 86400 * 1000));
  } else if (typeof v === 'string') {
    const s = v.trim();
    if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(s)) {
      const sep = s.includes('/') ? '/' : s.includes('-') ? '-' : '.';
      const parts = s.split(sep);
      // Slash = MM/DD/YYYY, dash = YYYY-MM-DD or MM-DD-YYYY, dot = MM.DD.YYYY (US month-first)
      let month, day, yyyy;
      if (sep === '-' && parts[0].length === 4) {
        // ISO: YYYY-MM-DD
        [yyyy, month, day] = parts;
      } else {
        // MM/DD/YYYY or MM.DD.YYYY — month first
        [month, day, yyyy] = parts;
      }
      yyyy = yyyy.length === 2 ? `20${yyyy}` : yyyy;
      parsed = `${yyyy}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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

function splitFullName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function holderRangeFromCount(count) {
  if (count <= 5) return '3 to 5';
  if (count <= 10) return '5 to 10';
  return 'More than 10';
}

function buildHolderFromExportRow(row, fallbackEmail, fallbackCertType) {
  const holderName = String(pick(row, ['holderFullName', 'fullName', 'Team Members_1', 'Holder Name'], '')).trim();
  const iacra = String(pick(row, ['holderIacraFtnNumber', 'iacraFtnNumber', 'IACRA Tracking Number (FTN)', '__EMPTY_2'], '')).trim();
  if (!holderName && !iacra) return null;

  const certStatusRaw = String(pick(row, ['holderCertificateStatus', 'certificateStatus', '__EMPTY', 'FAA USAS Confirmation'], 'EXISTING')).trim().toUpperCase();
  const certStatus = ['NEW', 'EXISTING'].includes(certStatusRaw) ? certStatusRaw : (['Y', 'YES', 'TRUE', '1'].includes(certStatusRaw) ? 'EXISTING' : 'NEW');

  return {
    fullName: holderName || 'Unknown Holder',
    dateOfBirth: parseDobText(pick(row, ['holderDateOfBirth', 'dateOfBirth', 'Date of Birth'])) || null,
    certificateType: pick(row, ['holderCertificateType', 'certificateType', 'Primary Certificate'], fallbackCertType || 'Part 65 - Aircraft Dispatcher'),
    certificateStatus: certStatus,
    faaCertificateNumber: String(pick(row, ['holderFaaCertificateNumber', 'faaCertificateNumber', 'FAA Certificate Number', '__EMPTY_1'], '')).trim(),
    iacraFtnNumber: iacra || 'UNKNOWN-FTN',
    email: String(pick(row, ['holderEmail', 'Holder Email', '__EMPTY_3', 'Email'], fallbackEmail)).trim().toLowerCase(),
    hasSecondaryCertificate: toBool(pick(row, ['holderHasSecondaryCertificate', 'hasSecondaryCertificate'], false), false),
    secondaryCertificateType: String(pick(row, ['holderSecondaryCertificateType', 'secondaryCertificateType'], '')).trim(),
    secondaryFaaCertificateNumber: String(pick(row, ['holderSecondaryFaaCertificateNumber', 'secondaryFaaCertificateNumber'], '')).trim(),
    secondaryIacraFtnNumber: String(pick(row, ['holderSecondaryIacraFtnNumber', 'secondaryIacraFtnNumber'], '')).trim(),
  };
}

function toBool(v, defaultValue = false) {
  if (v === undefined || v === null || v === '') return defaultValue;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  const s = String(v).trim().toLowerCase();
  return ['true', '1', 'yes', 'y', 'paid', 'active'].includes(s);
}

function buildAirlinePayload(raw) {
  const src = { ...raw };
  let subscriptionPlan = pick(src, ['subscriptionPlan', 'Subscription Plan'], '1 Year Subscription Plan');
  if (!subscriptionPlan) {
    const oneYearVal = toNumberOrUndefined(pick(src, ['1 Year Plan'], ''));
    const unlimitedVal = toNumberOrUndefined(pick(src, ['Unlimited Plan'], ''));
    subscriptionPlan = unlimitedVal ? 'Unlimited Plan' : (oneYearVal ? '1 Year Subscription Plan' : '1 Year Subscription Plan');
  }

  // Multi-year count: only treat as count if it looks like a year (integer 2-20), not a price
  const rawMYC = toNumberOrUndefined(pick(src, ['multiYearCount', 'years', 'Multi Year Plan'], ''));
  const multiYearCount = (rawMYC && Number.isFinite(rawMYC) && rawMYC >= 2 && rawMYC <= 20) ? Math.round(rawMYC) : 2;

  const holderCountNum = Number(toNumberOrUndefined(pick(src, ['holderCountValue', 'Team Members', 'TeamMembers'], '3')) || 3);
  const holderCount = pick(src, ['holderCount'], holderRangeFromCount(holderCountNum));
  const holderCountValue = String(holderCountNum || 3);

  const airlineName = String(pick(src, ['airlineName', 'Airlines'], '')).trim();
  const pocName = String(pick(src, ['pointOfContact', 'Point of Contact'], '')).trim();
  const splitName = splitFullName(pocName);
  const firstName = String(pick(src, ['firstName'], splitName.firstName)).trim();
  const lastName = String(pick(src, ['lastName'], splitName.lastName)).trim();
  const email = String(pick(src, ['email', 'Email', 'pointOfContactEmail'], '')).toLowerCase().trim();
  const phone = String(pick(src, ['phone', 'Phone', 'pointOfContactPhone'], '')).trim();

  if (!airlineName || !firstName || !lastName || !email || !phone) {
    throw new Error('airlineName, firstName, lastName, email, and phone are required.');
  }

  const paymentStatusRaw = String(pick(src, ['paymentStatus', 'Invoice ', 'Invoice', 'invoiceStatus'], 'pending')).toLowerCase();
  const paid = toBool(src.isPaid, paymentStatusRaw === 'paid');
  const paymentStatus = paid ? 'paid' : (paymentStatusRaw === 'failed' ? 'failed' : 'pending');
  const status = paid ? 'Active' : (pick(src, ['status', 'Status'], 'Pending'));

  const holder = buildHolderFromExportRow(src, email, pick(src, ['Primary Certificate', 'certificateType'], 'Part 65 - Aircraft Dispatcher')) || {
    fullName: `${firstName} ${lastName}`.trim(),
    dateOfBirth: parseDobText(pick(src, ['holderDateOfBirth', 'dateOfBirth', 'Date of Birth'])) || null,
    certificateType: pick(src, ['holderCertificateType', 'certificateType', 'Primary Certificate'], 'Part 65 - Aircraft Dispatcher'),
    certificateStatus: pick(src, ['holderCertificateStatus', 'certificateStatus'], 'EXISTING'),
    faaCertificateNumber: String(pick(src, ['holderFaaCertificateNumber', 'faaCertificateNumber', 'FAA Certificate Number'], '')).trim(),
    iacraFtnNumber: String(pick(src, ['holderIacraFtnNumber', 'iacraFtnNumber', 'IACRA Tracking Number (FTN)'], 'UNKNOWN-FTN')).trim(),
    email,
    hasSecondaryCertificate: false,
    secondaryCertificateType: '',
    secondaryFaaCertificateNumber: '',
    secondaryIacraFtnNumber: '',
  };

  const payload = {
    subscriptionPlan,
    holderCount,
    holderCountValue,
    airlineName,
    firstName,
    lastName,
    middleName: String(pick(src, ['middleName', 'Middle Name'], '')).trim(),
    dateOfBirth: parseDobText(pick(src, ['dateOfBirth', 'Date of Birth'])) || null,
    email,
    phone,
    addressLine1: String(pick(src, ['addressLine1', 'Address Line 1'], '')).trim(),
    addressLine2: String(pick(src, ['addressLine2', 'Address Line 2'], '')).trim(),
    city: String(pick(src, ['city', 'City'], '')).trim(),
    state: String(pick(src, ['state', 'State'], '')).trim(),
    postalCode: String(pick(src, ['postalCode', 'Zip/Postal Code', 'Postal Code'], '')).trim(),
    country: String(pick(src, ['country', 'Country'], '')).trim(),
    paymentEmail: String(src.paymentEmail || email).toLowerCase().trim(),
    paymentStatus,
    isFormCompleted: paid,
    isPaid: paid,
    status,
    agreedToTerms: src.agreedToTerms === undefined ? true : toBool(src.agreedToTerms, true),
    pointOfContact: String(pick(src, ['pointOfContact', 'Point of Contact'], `${firstName} ${lastName}`)).trim(),
    pointOfContactEmail: String(pick(src, ['pointOfContactEmail', 'Email'], email)).toLowerCase().trim(),
    pointOfContactPhone: String(pick(src, ['pointOfContactPhone', 'Phone'], phone)).trim(),
    certificateHolders: [holder],
  };

  const sourcePrice = toNumberOrUndefined(pick(src, ['pricePerCertificate', 'Unlimited Plan', '1 Year Plan'], ''));
  payload.pricePerCertificate = resolvePricePerCertificate(payload);
  if (sourcePrice) payload.pricePerCertificate = sourcePrice;
  const isUnlimited = payload.subscriptionPlan === 'Unlimited Plan';
  payload.committedCount = Number(payload.holderCountValue || payload.certificateHolders.length || 1);
  payload.totalAmount = isUnlimited ? payload.pricePerCertificate : payload.pricePerCertificate * payload.committedCount;
  payload.amountPaid = isUnlimited ? payload.pricePerCertificate : payload.pricePerCertificate * payload.certificateHolders.length;
  payload.multiYearCount = multiYearCount;
  payload.subscriptionDate = paid ? (toDateOrNull(pick(src, ['subscriptionDate', 'Subscription Date'])) || new Date()) : toDateOrNull(pick(src, ['subscriptionDate', 'Subscription Date']));
  // Compute expirationDate — use value from sheet if present, otherwise derive from plan + subscriptionDate
  payload.expirationDate = toDateOrNull(pick(src, ['expirationDate', 'Expiration Date']));
  if (!payload.expirationDate && payload.subscriptionDate) {
    payload.expirationDate = computeAirlinesExpirationDate(payload.subscriptionPlan, payload.subscriptionDate, multiYearCount);
  }
  payload.invoiceStatus = pick(src, ['invoiceStatus', 'Invoice ', 'Invoice'], paid ? 'Paid' : 'Pending');
  payload.invoiceNumber = pick(src, ['invoiceNumber', 'Invoice Number'], '');
  const totalServiceFees = toNumberOrUndefined(pick(src, ['totalServiceFees', 'Total Service Fees', 'TOTAL'], ''));
  if (totalServiceFees !== undefined) payload.totalServiceFees = totalServiceFees;

  return payload;
}

function parseAirlineRecordsFromRows(rows) {
  const hasExportAirlineShape = rows.some((r) => Object.prototype.hasOwnProperty.call(r, 'Airlines') || Object.prototype.hasOwnProperty.call(r, 'Team Members_1'));
  if (!hasExportAirlineShape) {
    return rows.map((row, idx) => ({ rowNumber: idx + 2, payload: buildAirlinePayload(row) }));
  }

  const parsed = [];
  let current = null;
  let currentRowNumber = null;

  const pushCurrent = () => {
    if (!current) return;
    if (!Array.isArray(current.certificateHolders) || !current.certificateHolders.length) {
      current.certificateHolders = [buildHolderFromExportRow({}, current.email, current.primaryCertificate) || {
        fullName: `${current.firstName} ${current.lastName}`.trim(),
        dateOfBirth: null,
        certificateType: 'Part 65 - Aircraft Dispatcher',
        certificateStatus: 'EXISTING',
        faaCertificateNumber: '',
        iacraFtnNumber: 'UNKNOWN-FTN',
        email: current.email,
        hasSecondaryCertificate: false,
        secondaryCertificateType: '',
        secondaryFaaCertificateNumber: '',
        secondaryIacraFtnNumber: '',
      }];
    }
    if (!current.holderCountValue || current.holderCountValue === '0') {
      current.holderCountValue = String(current.certificateHolders.length || 1);
      current.committedCount = Number(current.holderCountValue);
      current.holderCount = holderRangeFromCount(current.committedCount);
    }
    parsed.push({ rowNumber: currentRowNumber || 2, payload: current });
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;
    const airlineName = String(pick(row, ['airlineName', 'Airlines'], '')).trim();
    const holder = buildHolderFromExportRow(row, String(pick(row, ['Email'], '')).trim().toLowerCase(), pick(row, ['Primary Certificate'], 'Part 65 - Aircraft Dispatcher'));

    const rowHasAnyData = Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
    if (!rowHasAnyData) continue;

    if (airlineName) {
      pushCurrent();
      current = buildAirlinePayload(row);
      current.certificateHolders = [];
      currentRowNumber = rowNumber;
      if (holder) current.certificateHolders.push(holder);
      continue;
    }

    if (current && holder) {
      current.certificateHolders.push(holder);
    }
  }

  pushCurrent();
  return parsed;
}

function isAirlineSheet(sheetName, rows) {
  const name = String(sheetName || '').toLowerCase();
  if (name.includes('airline')) return true;
  if (!rows.length) return false;
  return rows.some((r) =>
    Object.prototype.hasOwnProperty.call(r, 'Airlines') ||
    Object.prototype.hasOwnProperty.call(r, 'Team Members') ||
    Object.prototype.hasOwnProperty.call(r, 'Team Members_1') ||
    Object.prototype.hasOwnProperty.call(r, 'Point of Contact')
  );
}

// ── Create ────────────────────────────────────────────────────────────────────
exports.createAirlinesSubscription = async (req, res) => {
  try {
    const body = { ...req.body };
    // Normalize email fields
    if (body.email)        body.email        = body.email.toLowerCase().trim();
    if (body.contactEmail) body.contactEmail = body.contactEmail.toLowerCase().trim();

    const normalizedEmail = body.email || body.contactEmail;
    if (normalizedEmail) {
      const emailRegex = new RegExp('^' + normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
      const [primaryDoc, legacyContactDoc, legacyEmailDoc] = await Promise.all([
        Airlines.findOne({ email: emailRegex }),
        AirlinesSubscription.findOne({ contactEmail: emailRegex }),
        AirlinesSubscription.findOne({ email: emailRegex }),
      ]);
      const existing = primaryDoc || legacyContactDoc || legacyEmailDoc;

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'You have already submitted this form. Please edit your submitted form from the Subscription dashboard.',
          data: existing,
        });
      }
    }

    // Always resolve price server-side to prevent client-side tampering
    body.pricePerCertificate = resolvePricePerCertificate(body);

    const isUnlimited   = body.subscriptionPlan === 'Unlimited Plan';
    const holdersFilled = body.certificateHolders?.length || 0;

    // committedCount = exact number the airline declared in Step 1
    body.committedCount = body.holderCountValue
      ? parseInt(body.holderCountValue, 10)
      : holdersFilled;

    // totalAmount = full amount for all committed slots (even if not all filled yet)
    // Unlimited Plan uses the same formula: pricePerCert × committedCount
    body.totalAmount = body.pricePerCertificate * body.committedCount;

    // amountPaid = amount for holders actually submitted now
    body.amountPaid = isUnlimited
      ? body.pricePerCertificate * body.committedCount
      : body.pricePerCertificate * holdersFilled;

    const doc = new Airlines(body);
    await doc.save();
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Add Holders (partial submission top-up) ───────────────────────────────────
exports.addHoldersToSubscription = async (req, res) => {
  try {
    const doc = await Airlines.findById(req.params.id);
    if (!doc)
      return res.status(404).json({ success: false, message: 'Subscription not found' });

    const { newHolders } = req.body;
    if (!Array.isArray(newHolders) || newHolders.length === 0)
      return res.status(400).json({ success: false, message: 'newHolders array is required' });

    if (doc.subscriptionPlan === 'Unlimited Plan') {
      // Unlimited plan: holders are pre-paid, slots are already committed.
      // Allow adding holders up to committedCount — no extra billing needed.
      const currentCount   = doc.certificateHolders.length;
      const committedCount = doc.committedCount || currentCount;
      const remainingSlots = committedCount - currentCount;
      if (remainingSlots <= 0)
        return res.status(400).json({
          success: false,
          message: `No remaining slots. Committed: ${committedCount}, current holders: ${currentCount}`,
        });
      const toAdd = newHolders.slice(0, remainingSlots);
      doc.certificateHolders.push(...toAdd);
      await doc.save();
      return res.json({
        success:        true,
        data:           doc,
        addedCount:     toAdd.length,
        extraAmountDue: 0,
        totalHolders:   doc.certificateHolders.length,
        committedCount: doc.committedCount,
        remainingSlots: committedCount - doc.certificateHolders.length,
      });
    }

    const currentCount   = doc.certificateHolders.length;
    const committedCount = doc.committedCount || currentCount;
    const remainingSlots = committedCount - currentCount;

    if (remainingSlots <= 0)
      return res.status(400).json({
        success: false,
        message: `No remaining slots. Committed: ${committedCount}, current holders: ${currentCount}`,
      });

    const toAdd      = newHolders.slice(0, remainingSlots);
    const extraAmount = doc.pricePerCertificate * toAdd.length;

    doc.certificateHolders.push(...toAdd);
    doc.amountPaid = (doc.amountPaid || 0) + extraAmount;
    await doc.save();

    res.json({
      success:        true,
      data:           doc,
      addedCount:     toAdd.length,
      extraAmountDue: extraAmount,
      totalHolders:   doc.certificateHolders.length,
      committedCount: doc.committedCount,
      remainingSlots: committedCount - doc.certificateHolders.length,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Read All (Admin) ──────────────────────────────────────────────────────────
// Primary Airlines collection is the source of truth.
// AirlinesSubscription (legacy) docs are only included when they have NO
// corresponding document in Airlines (checked by contactEmail match).
// This prevents duplicate rows in the admin dashboard.
exports.getAllAirlinesSubscriptions = async (req, res) => {
  try {
    const [newDocs, legacyDocs] = await Promise.all([
      Airlines.find().sort({ createdAt: -1 }),
      AirlinesSubscription.find().sort({ createdAt: -1 }),
    ]);

    // Build a Set of primary-collection emails so we can filter legacy duplicates
    const primaryEmails = new Set(
      newDocs.map(d => (d.email || '').toLowerCase().trim()).filter(Boolean)
    );

    // Only include legacy docs whose email is NOT already in the primary collection
    const dedupedLegacy = legacyDocs
      .filter(d => {
        const email = (d.contactEmail || d.email || '').toLowerCase().trim();
        return email ? !primaryEmails.has(email) : true; // keep if no email (can't dedup)
      })
      .map((d) => {
        const obj = d.toObject();
        // Normalise legacy field names to match the primary schema
        if (!obj.firstName && obj.contactFirstName) obj.firstName = obj.contactFirstName;
        if (!obj.lastName  && obj.contactLastName)  obj.lastName  = obj.contactLastName;
        if (!obj.email     && obj.contactEmail)      obj.email     = obj.contactEmail;
        if (!obj.phone     && obj.contactPhone)      obj.phone     = obj.contactPhone;
        obj._source = 'legacy';
        return obj;
      });

    const allDocs = [
      ...newDocs.map(d => ({ ...d.toObject(), _source: 'primary' })),
      ...dedupedLegacy,
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: allDocs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Read All by Email ─────────────────────────────────────────────────────────
exports.getAirlinesSubscriptionByEmail = async (req, res) => {
  try {
    const email = (req.query.email || req.params.email || '').trim();
    if (!email)
      return res.status(400).json({ success: false, message: 'Email is required' });

    // Non-admins may only query their own email
    if (req.user?.role !== 'admin' && email.toLowerCase() !== (req.user?.email || '').toLowerCase())
      return res.status(403).json({ success: false, message: 'Access denied.' });

    const safeEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const emailRegex = new RegExp('^' + safeEmail + '$', 'i');

    const [newDocs, legacyDocs] = await Promise.all([
      Airlines.find({ email: emailRegex }).sort({ createdAt: -1 }),
      AirlinesSubscription.find({ contactEmail: emailRegex }).sort({ createdAt: -1 }),
    ]);

    // Deduplicate by _id across both collections
    const seen = new Set();
    const all  = [
      ...newDocs.map(d  => ({ ...d.toObject(),  _source: 'primary' })),
      ...legacyDocs.map(d => ({ ...d.toObject(), _source: 'legacy'  })),
    ]
      .filter(d => {
        const key = d._id?.toString();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Return 200 with empty array when no records found (avoids noisy 404s in browser console)
    if (all.length === 0)
      return res.json({ success: true, data: null, all: [] });

    res.json({ success: true, data: all[0], all });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Read One ──────────────────────────────────────────────────────────────────
// Returns 200+null (not 404) when the ID is not found so that dashboard pages
// with stale registrationId / subscriptionIds values in the JWT don't generate
// noisy browser-console network errors. The frontend already handles null gracefully.
exports.getAirlinesSubscriptionById = async (req, res) => {
  try {
    // Validate that the id is a well-formed ObjectId before hitting the DB.
    // An invalid id (e.g. undefined or a bad string) would throw a CastError.
    const { id } = req.params;
    if (!id || !/^[a-f\d]{24}$/i.test(id)) {
      return res.status(200).json({ success: true, data: null });
    }

    let doc = await Airlines.findById(id);
    if (!doc) doc = await AirlinesSubscription.findById(id);

    // Return 200+null for missing records so stale IDs stored in user JWT
    // tokens fail silently — the caller already falls back to email lookup.
    if (!doc) return res.status(200).json({ success: true, data: null });

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update ────────────────────────────────────────────────────────────────────
exports.updateAirlinesSubscription = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';

    // Fields only admins may change — users editing their own profile cannot
    // elevate payment status, change pricing, or manipulate invoice records.
    const adminOnlyFields = new Set([
      'status', 'paymentStatus', 'isPaid', 'isFormCompleted',
      'pricePerCertificate', 'pricePerCert', 'totalAmount', 'totalServiceFees',
      'invoiceGenerated', 'invoiceNumber', 'invoiceStatus', 'invoiceDraft',
      'wirePaymentRequested', 'wirePaymentRequestedAt',
    ]);

    const allowedFields = [
      // Admin-only (filtered below for non-admins)
      'status', 'paymentStatus', 'isPaid', 'isFormCompleted',
      'pricePerCertificate', 'pricePerCert', 'totalAmount', 'totalServiceFees',
      'invoiceGenerated', 'invoiceNumber', 'invoiceStatus', 'invoiceDraft',
      'wirePaymentRequested', 'wirePaymentRequestedAt',
      // User-editable profile fields
      'subscriptionPlan', 'subscriptionDate', 'expirationDate',
      'holderCount', 'holderCountValue', 'committedCount',
      'airlineName',
      'firstName', 'lastName', 'middleName', 'dateOfBirth',
      'email', 'phone',
      'pointOfContact', 'pointOfContactEmail', 'pointOfContactPhone',
      'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country',
      'certificateHolders',
      'paymentEmail',
    ];

    const payload = {};
    allowedFields.forEach((field) => {
      if (!isAdmin && adminOnlyFields.has(field)) return; // non-admins cannot set these
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        payload[field] = req.body[field];
      }
    });

    if (payload.email) payload.email = String(payload.email).toLowerCase().trim();
    if (payload.pointOfContactEmail) payload.pointOfContactEmail = String(payload.pointOfContactEmail).toLowerCase().trim();

    // Keep completion flag in sync when payment state is explicitly changed.
    if (payload.paymentStatus === 'paid' || payload.isPaid === true) {
      payload.isFormCompleted = true;
    }
    if (payload.paymentStatus === 'failed' || payload.isPaid === false) {
      payload.isFormCompleted = false;
    }

    // Recompute holderCount range, pricePerCertificate, and totalAmount whenever
    // committedCount / holderCountValue changes — for both pre-payment (non-admin)
    // AND admin edits on already-paid records.
    if (payload.holderCountValue !== undefined || payload.committedCount !== undefined) {
      let existingForPrice = await Airlines.findById(req.params.id)
        .select('isPaid pricePerCertificate pricePerCert holderCountValue committedCount subscriptionPlan');
      if (!existingForPrice) {
        existingForPrice = await AirlinesSubscription.findById(req.params.id)
          .select('isPaid pricePerCertificate pricePerCert holderCountValue committedCount subscriptionPlan');
      }
      if (existingForPrice) {
        const newCount = Number(payload.holderCountValue ?? payload.committedCount ?? existingForPrice.holderCountValue ?? existingForPrice.committedCount ?? 0);
        const newRange = holderRangeFromCount(newCount);
        // Always sync the holderCount range string
        payload.holderCount = newRange;
        // Recompute price per cert from server-side table (keeps price authoritative)
        const plan = payload.subscriptionPlan || existingForPrice.subscriptionPlan || '1 Year Subscription Plan';
        const recomputedPpc = resolvePricePerCertificate({ subscriptionPlan: plan, holderCount: newRange });
        if (newCount > 0) {
          if (isAdmin) {
            // Admin: always update price and total
            payload.pricePerCertificate = recomputedPpc;
            payload.totalAmount = recomputedPpc * newCount;
            payload.totalServiceFees = recomputedPpc * newCount;
            payload.committedCount = newCount;
          } else if (!existingForPrice.isPaid) {
            // Non-admin, pre-payment: recalculate from selected plan + holder range.
            // Using the existing DB price here causes stale totals after plan changes.
            payload.pricePerCertificate = recomputedPpc;
            payload.totalAmount = recomputedPpc * newCount;
            payload.totalServiceFees = recomputedPpc * newCount;
            payload.committedCount = newCount;
          }
        }
      }
    }

    // If the user changes only plan/range (count unchanged) before payment,
    // still recompute the pending pricing to keep Subscription and Step 4 aligned.
    if (!isAdmin && (payload.subscriptionPlan !== undefined || payload.holderCount !== undefined)) {
      let existingForPlan = await Airlines.findById(req.params.id)
        .select('isPaid subscriptionPlan holderCount holderCountValue committedCount');
      if (!existingForPlan) {
        existingForPlan = await AirlinesSubscription.findById(req.params.id)
          .select('isPaid subscriptionPlan holderCount holderCountValue committedCount');
      }
      if (existingForPlan && !existingForPlan.isPaid) {
        const currentCount = Number(existingForPlan.holderCountValue || existingForPlan.committedCount || 0);
        if (currentCount > 0) {
          const range = payload.holderCount || existingForPlan.holderCount || holderRangeFromCount(currentCount);
          const plan = payload.subscriptionPlan || existingForPlan.subscriptionPlan || '1 Year Subscription Plan';
          const recomputedPpc = resolvePricePerCertificate({ subscriptionPlan: plan, holderCount: range });
          payload.holderCount = range;
          payload.pricePerCertificate = recomputedPpc;
          payload.totalAmount = recomputedPpc * currentCount;
          payload.totalServiceFees = recomputedPpc * currentCount;
          payload.committedCount = currentCount;
          payload.holderCountValue = String(currentCount);
        }
      }
    }

    // Auto-compute expirationDate when marking as paid via wire transfer
    // (Stripe flow sets it in applyPaymentToRegistration, but wire/manual does not).
    // Only compute if not explicitly provided and the record is being marked paid.
    if ((payload.isPaid === true || payload.paymentStatus === 'paid') && !payload.expirationDate) {
      const existingForExpiry = await Airlines.findById(req.params.id)
        .select('subscriptionPlan subscriptionDate expirationDate multiYearCount totalAmount pricePerCertificate committedCount holderCountValue');
      if (existingForExpiry && !existingForExpiry.expirationDate) {
        const plan = payload.subscriptionPlan || existingForExpiry.subscriptionPlan;
        const fromDate = payload.subscriptionDate || existingForExpiry.subscriptionDate || new Date();
        if (!existingForExpiry.subscriptionDate && !payload.subscriptionDate) {
          payload.subscriptionDate = new Date();
        }
        if (plan === '1 Year Subscription Plan') {
          const d = new Date(fromDate);
          d.setFullYear(d.getFullYear() + 1);
          payload.expirationDate = d;
        } else if (plan === 'Multiple Years Subscription Plan') {
          // Derive year count from multiYearCount field, or from totalAmount / pricePerCert
          let years = Number(existingForExpiry.multiYearCount || 0);
          if (!years) {
            const total     = Number(existingForExpiry.totalAmount || 0);
            const ppc       = Number(existingForExpiry.pricePerCertificate || 0);
            const holders   = Number(existingForExpiry.committedCount || existingForExpiry.holderCountValue || 1);
            const pricePerHolder = ppc > 0 && holders > 0 ? ppc : (total / Math.max(holders, 1));
            if (pricePerHolder > 0) years = Math.max(2, Math.round(pricePerHolder / 55));
          }
          const d = new Date(fromDate);
          d.setFullYear(d.getFullYear() + Math.max(2, years));
          payload.expirationDate = d;
        }
        // Unlimited Plan → no expiry (leave undefined)
      }
    }

    // Detect unpaid → paid transition so we know whether to send the confirmation email.
    let wasAlreadyPaidAir = false;
    if (isAdmin && (payload.isPaid === true || payload.paymentStatus === 'paid')) {
      const prevAir = await Airlines.findById(req.params.id).select('isPaid paymentStatus')
        || await AirlinesSubscription.findById(req.params.id).select('isPaid paymentStatus');
      wasAlreadyPaidAir = !!(prevAir?.isPaid || prevAir?.paymentStatus === 'paid');
    }

    let doc = await Airlines.findByIdAndUpdate(
      req.params.id, payload, { new: true, runValidators: false },
    );
    if (!doc) {
      doc = await AirlinesSubscription.findByIdAndUpdate(
        req.params.id, payload, { new: true, runValidators: false },
      );
    }
    if (!doc)
      return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });

    // Send confirmation email when admin activates a subscription for the first time.
    if (isAdmin && (payload.isPaid === true || payload.paymentStatus === 'paid') && !wasAlreadyPaidAir) {
      sendAirlinePaymentConfirmation(doc).catch((e) =>
        console.warn('[updateAirlines] Confirmation email failed:', e.message)
      );
    }
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Delete ────────────────────────────────────────────────────────────────────
exports.deleteAirlinesSubscription = async (req, res) => {
  try {
    let doc = await Airlines.findByIdAndDelete(req.params.id);
    if (!doc) doc = await AirlinesSubscription.findByIdAndDelete(req.params.id);
    if (!doc)
      return res.status(404).json({ success: false, message: 'Not found' });

    // Unlink deleted subscription from any linked user account.
    await User.updateMany(
      { subscriptionIds: doc._id },
      { $pull: { subscriptionIds: doc._id } },
    );

    await User.updateMany(
      { registrationId: doc._id },
      { $set: { registrationId: null, registrationModel: null } },
    );

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Compute expiration date from plan ─────────────────────────────────────────
function computeAirlinesExpirationDate(subscriptionPlan, fromDate, multiYearCount) {
  const d = new Date(fromDate);
  if (subscriptionPlan === '1 Year Subscription Plan') {
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  if (subscriptionPlan === 'Multiple Years Subscription Plan') {
    const years = Number(multiYearCount) >= 2 ? Number(multiYearCount) : 2;
    d.setFullYear(d.getFullYear() + years);
    return d;
  }
  return null; // Unlimited Plan
}

// ── Mark Paid (fallback after Stripe payment if /payments/confirm failed) ─────
// Idempotent — safe to call multiple times.
exports.markAirlinesPaid = async (req, res) => {
  try {
    const now = new Date();

    let doc   = await Airlines.findById(req.params.id);
    let Model = Airlines;
    if (!doc) {
      doc   = await AirlinesSubscription.findById(req.params.id);
      Model = AirlinesSubscription;
    }
    if (!doc)
      return res.status(404).json({ success: false, message: 'Not found' });

    // Idempotent: return existing if already paid
    if (doc.isPaid || doc.paymentStatus === 'paid')
      return res.json({ success: true, data: doc, alreadyPaid: true });

    const expirationDate = computeAirlinesExpirationDate(doc.subscriptionPlan, now, doc.multiYearCount);

    const update = {
      paymentStatus:    'paid',
      isPaid:           true,
      isFormCompleted:  true,
      status:           'Active',
      subscriptionDate: now,
      invoiceStatus:    'Paid',
      invoiceNumber:    doc.invoiceNumber || await generateInvoiceNumber(),
      wirePaymentRequested: false,
      wirePaymentRequestedAt: null,
    };
    if (expirationDate !== null) {
      update.expirationDate = expirationDate;
    }

    const updated = await Model.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true },
    );

    // Create canonical Invoice document so admin and user see the same invoice.
    try {
      const holderCount  = Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0);
      const pricePerCert = Number(doc.pricePerCertificate || doc.pricePerCert || 0);
      const totalAmount  = pricePerCert > 0 && holderCount > 0 ? pricePerCert * holderCount : Number(doc.totalAmount || 0);
      await createOrUpdateInvoice({
        registrationId:    doc._id,
        registrationModel: doc.constructor.modelName || 'Airlines',
        paymentId:         doc.paymentId || null,
        snapshot: {
          name:             [doc.firstName, doc.lastName].filter(Boolean).join(' '),
          email:            doc.email || doc.contactEmail || '',
          phone:            doc.phone || doc.contactPhone || '',
          address:          [doc.addressLine1, doc.city, doc.state, doc.postalCode, doc.country].filter(Boolean).join(', '),
          isAirline:        true,
          airlineName:      doc.airlineName || '',
          subscriptionPlan: doc.subscriptionPlan || '',
          subscriptionDate: now,
          expirationDate:   update.expirationDate || null,
          holderCount,
          pricePerCert,
          subtotal:   totalAmount,
          tax:        0,
          totalPaid:  totalAmount,
        },
        amountDollars:         totalAmount,
        paidAt:                now,
        paymentMethod:         'wire',
        existingInvoiceNumber: update.invoiceNumber,
      });
    } catch (invErr) {
      console.warn('[airlineMarkPaid] Invoice doc creation failed:', invErr.message);
    }

    res.json({ success: true, data: updated });

    // Send payment confirmation email (non-blocking)
    sendAirlinePaymentConfirmation(updated).catch((e) =>
      console.warn('[markAirlinesPaid] Email failed:', e.message)
    );
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Airline Wire Transfer Invoice Request ───────────────────────────────────
// Called when airline user selects "Wire Transfer" in step 4 and submits request.
exports.requestAirlineInvoice = async (req, res) => {
  try {
    const id = req.params.id;
    const now = new Date(); // always use server time — never trust client-supplied timestamps

    if (!id) {
      return res.status(400).json({ success: false, message: 'Airline ID is required.' });
    }

    const update = {
      wirePaymentRequested: true,
      wirePaymentRequestedAt: Number.isNaN(now.getTime()) ? new Date() : now,
      paymentStatus: 'pending',
      status: 'Pending',
      invoiceStatus: 'Wire Requested',
    };

    const updated = await Airlines.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Airline subscription not found.' });
    }

    return res.json({
      success: true,
      message: 'Wire transfer invoice request submitted successfully.',
      data: updated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Export Airlines Excel ─────────────────────────────────────────────────────
exports.exportAirlinesExcel = async (req, res) => {
  try {
    const [newDocs, legacyDocs] = await Promise.all([
      Airlines.find().sort({ createdAt: -1 }),
      AirlinesSubscription.find().sort({ createdAt: -1 }),
    ]);

    const primaryEmails = new Set(
      newDocs.map(d => (d.email || '').toLowerCase().trim()).filter(Boolean)
    );

    const normaliseLegacy = (arr) => arr
      .filter(d => {
        const email = (d.contactEmail || d.email || '').toLowerCase().trim();
        return email ? !primaryEmails.has(email) : true;
      })
      .map((d) => {
        const o = d.toObject();
        if (!o.firstName && o.contactFirstName) o.firstName = o.contactFirstName;
        if (!o.lastName  && o.contactLastName)  o.lastName  = o.contactLastName;
        if (!o.email     && o.contactEmail)      o.email     = o.contactEmail;
        if (!o.phone     && o.contactPhone)      o.phone     = o.contactPhone;
        return o;
      });

    const docs = [
      ...newDocs.map(d => d.toObject()),
      ...normaliseLegacy(legacyDocs),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const fmt = (date) => date ? new Date(date).toLocaleDateString('en-US') : '';

    const workbook = new ExcelJS.Workbook();
    const sheet    = workbook.addWorksheet('Agent_for_Serv_ Airlines');

    const COL_WIDTHS = {
      1: 13.9, 2: 33.4, 3: 16.2, 4: 16.2, 5: 29.3, 6: 17.7, 7: 14.5, 8: 14.5,
      9: 36.0, 10: 21.5, 11: 14.9, 12: 23.4, 13: 15.5, 14: 27.3, 15: 15.4,
      16: 28.5, 17: 28.2, 18: 20.0, 19: 19.0, 20: 18.9, 21: 29.7, 22: 29.4,
      23: 16.1, 24: 17.5, 25: 16.0,
    };
    Object.entries(COL_WIDTHS).forEach(([col, w]) => {
      sheet.getColumn(Number(col)).width = w;
    });

    const CENTER    = { vertical: 'middle', horizontal: 'center', wrapText: true };
    const hdrFont   = { bold: true,  name: 'Arial', size: 10 };
    const dataFont  = { bold: false, name: 'Arial', size: 10 };
    const boldFont  = { bold: true,  name: 'Arial', size: 10 };
    const greenBold = { bold: true,  name: 'Arial', size: 10, color: { argb: 'FF00B050' } };

    const thin = () => ({
      top:    { style: 'thin' }, bottom: { style: 'thin' },
      left:   { style: 'thin' }, right:  { style: 'thin' },
    });
    const thickBottom = () => ({
      top:    { style: 'thin' }, bottom: { style: 'medium' },
      left:   { style: 'thin' }, right:  { style: 'thin' },
    });

    // ROW 1 — main headers
    sheet.mergeCells('R1:V1');
    const r1 = sheet.getRow(1);
    r1.height = 22.8;

    const ROW1_LABELS = [
      'Status', 'Airlines', 'Subscription Date', 'Expiration Date',
      'Subscription Plan', '1 Year Plan', 'Unlimited Plan', 'Team Members',
      'Address Line 1', 'Address Line 2', 'City', 'Zip/Postal Code',
      'Country', 'Point of Contact', 'Phone', 'Email', 'Primary Certificate',
    ];
    ROW1_LABELS.forEach((label, i) => {
      const cell = r1.getCell(i + 1);
      cell.value = label; cell.font = hdrFont; cell.alignment = CENTER; cell.border = thin();
    });
    const tmCell = r1.getCell(18);
    tmCell.value = 'Team Members'; tmCell.font = hdrFont; tmCell.alignment = CENTER; tmCell.border = thin();
    [['Total Service Fees', 23], ['Invoice', 24], ['TOTAL', 25]].forEach(([label, col]) => {
      const cell = r1.getCell(col);
      cell.value = label; cell.font = hdrFont; cell.alignment = CENTER; cell.border = thin();
    });

    // ROW 2 — sub-headers
    const r2 = sheet.getRow(2);
    r2.height = 23.4;
    const ROW2_MAP = {
      18: 'Name', 19: 'FAA USAS Confirmation',
      20: 'FAA Certificate Number', 21: 'IACRA Tracking Number (FTN)', 22: 'Email',
    };
    for (let c = 1; c <= 25; c++) {
      const cell = r2.getCell(c);
      cell.value = ROW2_MAP[c] || ''; cell.font = hdrFont; cell.alignment = CENTER; cell.border = thin();
    }

    // Data rows
    let currentRow = 3;
    docs.forEach((d) => {
      const isUnlimited = d.subscriptionPlan === 'Unlimited Plan';
      const isOneYear   = d.subscriptionPlan === '1 Year Subscription Plan';
      const holders     = d.certificateHolders || [];
      const ppc         = d.pricePerCertificate || d.pricePerCert || 0;
      const committedCount = d.committedCount || Number(d.holderCountValue) || holders.length || 1;
      const total       = d.totalAmount || (ppc * committedCount);
      const contactName = [d.firstName, d.lastName].filter(Boolean).join(' ');
      const rowCount    = Math.max(holders.length, 1);
      const startRow    = currentRow;
      const endRow      = currentRow + rowCount - 1;
      const holderList  = holders.length > 0 ? holders : [null];

      holderList.forEach((h, idx) => {
        const r = sheet.getRow(currentRow);
        r.height = idx === 0 ? 14.4 : 12.9;

        if (idx === 0) {
          const compData = [
            d.status || '',
            d.airlineName || '',
            d.subscriptionDate ? fmt(d.subscriptionDate) : fmt(d.createdAt),
            d.expirationDate   ? fmt(d.expirationDate)   : (isUnlimited ? 'Never' : ''),
            d.subscriptionPlan || '',
            isOneYear   ? `$${ppc}` : '',
            isUnlimited ? `$${ppc}` : '',
            d.holderCountValue || String(holders.length) || '',
            d.addressLine1 || '',
            d.addressLine2 || '',
            d.city         || '',
            d.postalCode   || '',
            d.country      || '',
            contactName,
            d.phone ? `+${d.phone}` : '',
            d.email || '',
          ];
          compData.forEach((val, i) => {
            const cell = r.getCell(i + 1);
            cell.value = val; cell.font = i === 1 ? boldFont : dataFont;
            cell.alignment = CENTER; cell.border = thin();
          });
          const wCell = r.getCell(23);
          wCell.value = total || ''; wCell.font = dataFont; wCell.alignment = CENTER; wCell.border = thin();
          const xCell = r.getCell(24);
          xCell.value = d.invoiceStatus || d.paymentStatus || ''; xCell.font = dataFont; xCell.alignment = CENTER; xCell.border = thin();
          const yCell = r.getCell(25);
          yCell.value = total || ''; yCell.font = greenBold; yCell.alignment = CENTER; yCell.border = thin();
        } else {
          for (let c = 1; c <= 16; c++) {
            const cell = r.getCell(c); cell.value = ''; cell.font = dataFont; cell.alignment = CENTER; cell.border = thin();
          }
          [23, 24, 25].forEach(c => {
            const cell = r.getCell(c); cell.value = ''; cell.font = dataFont; cell.alignment = CENTER; cell.border = thin();
          });
        }

        if (h) {
          const hData = [
            h.certificateType || '',
            h.fullName || '',
            h.certificateStatus === 'EXISTING' ? 'Y' : 'N',
            h.faaCertificateNumber || '',
            h.iacraFtnNumber || '',
            h.email || '',
          ];
          hData.forEach((val, i) => {
            const cell = r.getCell(17 + i);
            cell.value = val; cell.font = dataFont; cell.alignment = CENTER; cell.border = thin();
          });
        } else {
          for (let c = 17; c <= 22; c++) {
            const cell = r.getCell(c); cell.value = ''; cell.font = dataFont; cell.alignment = CENTER; cell.border = thin();
          }
        }

        currentRow++;
      });

      if (rowCount > 1) {
        [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,23,24,25].forEach(c => {
          try { sheet.mergeCells(startRow, c, endRow, c); } catch (_) {}
        });
      }

      const lastRow = sheet.getRow(endRow);
      for (let c = 1; c <= 25; c++) {
        lastRow.getCell(c).border = thickBottom();
      }
    });

    sheet.views = [{ state: 'frozen', ySplit: 2 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Export_Airlines_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: Get all signed-up airlines for dropdown ────────────────────────────
exports.getSignUpAirlines = async (req, res) => {
  try {
    const airlines = await Airlines.find({ status: 'Active' })
      .select('airlineName email _id')
      .sort({ airlineName: 1 });

    const formattedAirlines = airlines.map(a => ({
      id: a._id,
      name: a.airlineName,
      email: a.email,
    }));

    res.json({ success: true, data: formattedAirlines });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: Create airline form with new User account ───────────────────────────
exports.adminCreateAirlineForm = async (req, res) => {
  try {
    const body = { ...req.body };

    // Normalize emails
    if (body.email) body.email = body.email.toLowerCase().trim();
    if (body.pointOfContactEmail) body.pointOfContactEmail = body.pointOfContactEmail.toLowerCase().trim();

    // Resolve price server-side
    body.pricePerCertificate = resolvePricePerCertificate(body);

    const isUnlimited = body.subscriptionPlan === 'Unlimited Plan';
    const holdersFilled = body.certificateHolders?.length || 0;

    body.committedCount = body.holderCountValue
      ? parseInt(body.holderCountValue, 10)
      : holdersFilled;

    body.totalAmount = body.pricePerCertificate * body.committedCount;
    body.amountPaid  = body.pricePerCertificate * body.committedCount;

    body.status = 'Active';
    body.paymentStatus = 'paid';
    body.isPaid = true;
    body.subscriptionDate = new Date();

    // Create airline record
    const airline = new Airlines(body);
    await airline.save();

    // Create or update User account for airline
    let user = await User.findOne({ email: body.pointOfContactEmail });

    // Password = airlineName stripped of spaces, lowercased.
    // Simple and predictable so admin can verbally tell the airline.
    // mustChangePassword=true forces a password-change prompt on first login.
    const defaultPassword = (body.airlineName || 'ifoa12345').replace(/\s+/g, '').toLowerCase();

    if (!user) {
      user = new User({
        email: body.pointOfContactEmail,
        password: defaultPassword,
        role: 'airline',
        airlineName: body.airlineName,
        firstName: body.firstName,
        lastName: body.lastName,
        registrationId: airline._id,
        registrationModel: 'Airlines',
        subscriptionIds: [airline._id],
        mustChangePassword: true, // user must set their own password on first login
      });
      await user.save();
    } else {
      // Existing user — update linkage but do NOT reset their password
      user.airlineName = body.airlineName;
      user.registrationId = airline._id;
      user.registrationModel = 'Airlines';
      if (!user.subscriptionIds.includes(airline._id)) {
        user.subscriptionIds.push(airline._id);
      }
      await user.save();
    }

    res.status(201).json({
      success: true,
      data: {
        airline: airline,
        user: {
          email: user.email,
          role: user.role,
          airlineName: user.airlineName,
        },
        loginCredentials: {
          email: body.pointOfContactEmail,
          // Default password = airlineName lowercase no spaces (e.g. "Air India" → "airindia")
          // The airline will be prompted to change it on first login.
          password: defaultPassword,
        },
      },
      message: 'Airline form created successfully. Login credentials have been set.',
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Admin: Bulk import airlines from Excel ───────────────────────────────────
exports.adminImportAirlinesFromExcel = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Excel file is required.' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    if (!workbook.SheetNames.length) {
      return res.status(400).json({ success: false, message: 'No worksheet found in uploaded file.' });
    }

    const sheetRows = workbook.SheetNames.flatMap((sheetName) => {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
      return rows.map((row) => ({ ...row, __sheetName: sheetName }));
    });
    if (!sheetRows.length) {
      return res.status(400).json({ success: false, message: 'The uploaded sheet is empty.' });
    }

    const created = [];
    const failed = [];
    const skipped = [];

    const bySheet = new Map();
    sheetRows.forEach((row) => {
      const s = row.__sheetName || 'Sheet1';
      if (!bySheet.has(s)) bySheet.set(s, []);
      bySheet.get(s).push(row);
    });

    const recordsToImport = [];
    for (const [sheetName, rows] of bySheet.entries()) {
      if (!isAirlineSheet(sheetName, rows)) {
        skipped.push({ row: `${sheetName}!1`, reason: 'Skipped non-airline worksheet.' });
        continue;
      }

      try {
        const parsed = parseAirlineRecordsFromRows(rows);
        parsed.forEach((entry) => {
          const rowKind = inferRowKind(entry.payload);
          if (rowKind !== 'airline') {
            skipped.push({ row: `${sheetName}!${entry.rowNumber}`, reason: `Skipped ${rowKind} row during airline import.` });
          } else {
            recordsToImport.push({ sheetName, rowNumber: entry.rowNumber, payload: entry.payload });
          }
        });
      } catch (sheetErr) {
        failed.push({ row: `${sheetName}!2`, error: sheetErr.message });
      }
    }

    for (const rec of recordsToImport) {
      const { payload, rowNumber, sheetName } = rec;

      try {
        const existing = await Airlines.findOne({
          airlineName: payload.airlineName,
          email: payload.email,
        });
        if (existing) {
          skipped.push({ row: `${sheetName}!${rowNumber}`, reason: `Airline already exists: ${payload.airlineName}` });
          continue;
        }

        const airline = await Airlines.create(payload);

        let user = await User.findOne({ email: payload.pointOfContactEmail });
        if (!user) {
          const importPassword = (payload.airlineName || 'ifoa12345').replace(/\s+/g, '').toLowerCase();
          user = await User.create({
            email: payload.pointOfContactEmail,
            password: importPassword,
            role: 'airline',
            airlineName: payload.airlineName,
            firstName: payload.firstName,
            lastName: payload.lastName,
            registrationId: airline._id,
            registrationModel: 'Airlines',
            subscriptionIds: [airline._id],
            mustChangePassword: true, // forced change on first login
          });
          created.push({
            row: `${sheetName}!${rowNumber}`,
            id: airline._id,
            airlineName: airline.airlineName,
            email: payload.pointOfContactEmail,
            // Password is always airlineName lowercase no spaces — easy for admin to communicate
            loginCredentials: { email: payload.pointOfContactEmail, password: importPassword },
          });
        } else {
          user.airlineName = payload.airlineName;
          user.registrationId = airline._id;
          user.registrationModel = 'Airlines';
          if (!Array.isArray(user.subscriptionIds)) user.subscriptionIds = [];
          if (!user.subscriptionIds.some((id) => String(id) === String(airline._id))) {
            user.subscriptionIds.push(airline._id);
          }
          await user.save();
        }
        // Note: created.push is handled inside the !user branch above to include loginCredentials.
        // For existing users whose account was just linked, still record the row.
        if (created.every(c => String(c.id) !== String(airline._id))) {
          created.push({
            row: `${sheetName}!${rowNumber}`,
            id: airline._id,
            airlineName: airline.airlineName,
            email: payload.pointOfContactEmail,
            loginCredentials: null, // existing user — password unchanged
          });
        }
      } catch (rowErr) {
        failed.push({ row: `${sheetName}!${rowNumber}`, error: rowErr.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `Imported ${created.length} airline row(s) from Excel.`,
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

// ── Renew Subscription ────────────────────────────────────────────────────────
// Extends an existing subscription without re-filling the form.
// Body may include { subscriptionPlan } to change plan on renewal.
// Unlimited plan subscriptions cannot be renewed (they never expire).
exports.renewAirlinesSubscription = async (req, res) => {
  try {
    const doc = await Airlines.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });

    if (doc.subscriptionPlan === 'Unlimited Plan') {
      return res.status(400).json({ success: false, message: 'Unlimited plan does not require renewal.' });
    }

    const newPlan = req.body.subscriptionPlan || doc.subscriptionPlan;
    if (newPlan === 'Unlimited Plan') {
      return res.status(400).json({ success: false, message: 'Switching to Unlimited plan requires a new subscription.' });
    }

    // Extend from current expiry (or now if already expired)
    const base = doc.expirationDate && new Date(doc.expirationDate) > new Date()
      ? new Date(doc.expirationDate)
      : new Date();

    const renewMultiYearCount = req.body.multiYearCount || doc.multiYearCount || 2;
    const newExpiry = computeAirlinesExpirationDate(newPlan, base, renewMultiYearCount);
    if (!newExpiry) {
      return res.status(400).json({ success: false, message: 'Cannot compute expiry for the selected plan.' });
    }

    const newPrice = resolvePricePerCertificate({ subscriptionPlan: newPlan, holderCount: doc.holderCount });

    const renewedCount = doc.committedCount || Number(doc.holderCountValue) || doc.certificateHolders?.length || 1;
    const renewedRange = holderRangeFromCount(renewedCount);

    const updated = await Airlines.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          subscriptionPlan: newPlan,
          expirationDate: newExpiry,
          pricePerCertificate: newPrice,
          holderCount: renewedRange,
          holderCountValue: String(renewedCount),
          committedCount: renewedCount,
          totalAmount: newPrice * renewedCount,
          status: 'Active',
          // Reset reminder flags so renewed users get reminders again
          expiryReminder60SentAt: null,
          expiryReminder30SentAt: null,
        },
      },
      { new: true },
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PATCH /api/airlines/:id/mark-invoice-generated ─────────────────────────
// Called by admin after downloading the PDF invoice — marks invoiceGenerated = true
exports.markAirlinesInvoiceGenerated = async (req, res) => {
  try {
    const doc = await Airlines.findByIdAndUpdate(
      req.params.id,
      { $set: { invoiceGenerated: true } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Airline not found.' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Duplicate removed — requestAirlineInvoice is defined above (exports at line ~796).
