const Airlines             = require('../models/Airlines');
const AirlinesSubscription = require('../models/AirlinesSubscription'); // legacy model
const ExcelJS = require('exceljs');

// Server-side pricing tables (used to validate / recompute price on create)
const UNLIMITED_PRICES = { '3 to 5': 265, '5 to 10': 255, 'More than 10': 245 };
const ONE_YEAR_PRICES  = { '3 to 5': 60,  '5 to 10': 55,  'More than 10': 49  };

function resolvePricePerCertificate(body) {
  const { subscriptionPlan, holderCount } = body;
  if (subscriptionPlan === 'Unlimited Plan')             return UNLIMITED_PRICES[holderCount] ?? 265;
  if (subscriptionPlan === '1 Year Subscription Plan')   return ONE_YEAR_PRICES[holderCount]  ?? 49;
  return 55; // Multiple Years fallback
}

// ── Create ────────────────────────────────────────────────────────────────────
exports.createAirlinesSubscription = async (req, res) => {
  try {
    const body = { ...req.body };
    // Normalize email fields
    if (body.email)        body.email        = body.email.toLowerCase().trim();
    if (body.contactEmail) body.contactEmail = body.contactEmail.toLowerCase().trim();

    // Always resolve price server-side to prevent client-side tampering
    body.pricePerCertificate = resolvePricePerCertificate(body);

    const isUnlimited   = body.subscriptionPlan === 'Unlimited Plan';
    const holdersFilled = body.certificateHolders?.length || 0;

    // committedCount = exact number the airline declared in Step 1
    body.committedCount = body.holderCountValue
      ? parseInt(body.holderCountValue, 10)
      : holdersFilled;

    // totalAmount = full amount for all committed slots (even if not all filled yet)
    body.totalAmount = isUnlimited
      ? body.pricePerCertificate
      : body.pricePerCertificate * body.committedCount;

    // amountPaid = amount for holders actually submitted now
    body.amountPaid = isUnlimited
      ? body.pricePerCertificate
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

    if (doc.subscriptionPlan === 'Unlimited Plan')
      return res.status(400).json({
        success: false,
        message: 'Unlimited plan — no per-holder billing applies',
      });

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

    if (all.length === 0)
      return res.status(404).json({ success: false, message: 'Not found' });

    res.json({ success: true, data: all[0], all });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Read One ──────────────────────────────────────────────────────────────────
exports.getAirlinesSubscriptionById = async (req, res) => {
  try {
    let doc = await Airlines.findById(req.params.id);
    if (!doc) doc = await AirlinesSubscription.findById(req.params.id);
    if (!doc)
      return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update ────────────────────────────────────────────────────────────────────
exports.updateAirlinesSubscription = async (req, res) => {
  try {
    let doc = await Airlines.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: false },
    );
    if (!doc) {
      doc = await AirlinesSubscription.findByIdAndUpdate(
        req.params.id, req.body, { new: true, runValidators: false },
      );
    }
    if (!doc)
      return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
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
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Compute expiration date from plan ─────────────────────────────────────────
function computeAirlinesExpirationDate(subscriptionPlan, fromDate) {
  const d = new Date(fromDate);
  if (subscriptionPlan === '1 Year Subscription Plan') {
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  if (subscriptionPlan === 'Multiple Years Subscription Plan') {
    d.setFullYear(d.getFullYear() + 3);
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

    const expirationDate = computeAirlinesExpirationDate(doc.subscriptionPlan, now);

    const update = {
      paymentStatus:    'paid',
      isPaid:           true,
      status:           'Active',
      subscriptionDate: now,
      invoiceStatus:    'Paid',
      invoiceNumber:    doc.invoiceNumber || `INV-${Date.now()}`,
    };
    if (expirationDate !== null) {
      update.expirationDate = expirationDate;
    }

    const updated = await Model.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true },
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
      const total       = isUnlimited ? ppc : ppc * (holders.length || 1);
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
