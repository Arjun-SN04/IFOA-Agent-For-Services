const Individual = require('../models/Individual');
const User = require('../models/User');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');

function toBool(v, defaultValue = false) {
  if (v === undefined || v === null || v === '') return defaultValue;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  const s = String(v).trim().toLowerCase();
  return ['true', '1', 'yes', 'y', 'paid', 'active'].includes(s);
}

function toDateOrNull(v) {
  if (!v) return null;
  let parsed = v;
  if (typeof v === 'number') {
    // Excel serial date (days since 1899-12-30)
    parsed = new Date(Math.round((v - 25569) * 86400 * 1000));
  } else if (typeof v === 'string') {
    const s = v.trim();
    if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(s)) {
      const parts = s.replace(/[.-]/g, '/').split('/');
      const mm = parts[0].padStart(2, '0');
      const dd = parts[1].padStart(2, '0');
      const yyyy = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      parsed = `${yyyy}-${mm}-${dd}`;
    } else {
      parsed = s;
    }
  }

  const d = new Date(parsed);
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
  if (plan === '1 Year Subscription Plan') {
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  if (plan === 'Multiple Years Subscription Plan') {
    const years = Number(multiYearCount) > 1 ? Number(multiYearCount) : 3;
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

  const multiYearCount = Number(pick(src, ['multiYearCount', 'years'], 3));

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
    price: normalizePlanPrice(subscriptionPlan, multiYearCount, toNumberOrUndefined(pick(src, ['price', 'TOTAL', 'Total', 'total']))),
    subscriptionDate,
    expirationDate: toDateOrNull(pick(src, ['expirationDate', 'Expiration Date'])),
    totalServiceFees: toNumberOrUndefined(pick(src, ['totalServiceFees', 'Total Service Fees'])),

    firstName,
    lastName,
    middleName: String(pick(src, ['middleName', 'Middle Name'])).trim(),
    dateOfBirth: toDateOrNull(pick(src, ['dateOfBirth', 'Date of Birth'])) || toDateOrNull(pick(src, ['subscriptionDate', 'Subscription Date'])) || new Date('1990-01-01'),

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
    const generatedPassword = (payload.firstName || 'ifoa12345').trim();
    user = await User.create({
      email: payload.email,
      password: generatedPassword,
      role: 'individual',
      firstName: payload.firstName,
      lastName: payload.lastName,
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

// ── Create ────────────────────────────────────────────────────────────────────
exports.createIndividual = async (req, res) => {
  try {
    const body = { ...req.body };
    // Normalize email to lowercase so all lookups match regardless of case
    if (body.email) body.email = body.email.toLowerCase().trim();

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
    const allowedFields = [
      'status', 'paymentStatus', 'isPaid', 'isFormCompleted',
      'subscriptionPlan', 'subscriptionDate', 'expirationDate', 'multiYearCount',
      'price', 'totalServiceFees',
      'firstName', 'lastName', 'middleName', 'dateOfBirth',
      'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country',
      'phone', 'email',
      'paymentEmail',
      'primaryAirmanCertificate', 'primaryCertificate',
      'faaCertificateNumber', 'iacraTrackingNumber',
      'hasSecondaryCertificate', 'secondaryCertificate',
      'secondaryFaaCertificateNumber', 'secondaryIacraTrackingNumber',
      // Admin invoice fields
      'invoiceGenerated', 'invoiceNumber', 'invoiceStatus', 'invoiceDraft',
    ];

    const payload = {};
    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        payload[field] = req.body[field];
      }
    });

    if (payload.email) payload.email = String(payload.email).toLowerCase().trim();

    // Keep completion flag in sync when payment state is explicitly changed.
    if (payload.paymentStatus === 'paid' || payload.isPaid === true) {
      payload.isFormCompleted = true;
    }
    if (payload.paymentStatus === 'failed' || payload.isPaid === false) {
      payload.isFormCompleted = false;
    }

    const individual = await Individual.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: false },
    );
    if (!individual)
      return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: individual });
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
      invoiceNumber: individual.invoiceNumber || `INV-${Date.now()}`,
    };

    if (individual.subscriptionPlan === '1 Year Subscription Plan') {
      const exp = new Date(now);
      exp.setFullYear(exp.getFullYear() + 1);
      update.expirationDate = exp;
    } else if (individual.subscriptionPlan === 'Multiple Years Subscription Plan') {
      const years = individual.multiYearCount || 3;
      const exp   = new Date(now);
      exp.setFullYear(exp.getFullYear() + years);
      update.expirationDate = exp;
    }
    // Unlimited Plan — no expiry date set

    const updated = await Individual.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true },
    );
    res.json({ success: true, data: updated });
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
