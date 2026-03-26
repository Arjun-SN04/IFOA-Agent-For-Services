const Airlines = require('../models/Airlines');
const AirlinesSubscription = require('../models/AirlinesSubscription'); // legacy model alias
const ExcelJS = require('exceljs');

// Pricing tables (used as server-side fallback validation)
const UNLIMITED_PRICES = { '3 to 5': 265, '5 to 10': 255, 'More than 10': 245 };
const ONE_YEAR_PRICES  = { '3 to 5': 60,  '5 to 10': 55,  'More than 10': 49  };

function resolvePricePerCertificate(body) {
  const { subscriptionPlan, holderCount } = body;
  if (subscriptionPlan === 'Unlimited Plan')             return UNLIMITED_PRICES[holderCount] ?? 265;
  if (subscriptionPlan === '1 Year Subscription Plan')   return ONE_YEAR_PRICES[holderCount]  ?? 49;
  return 55; // Multiple Years fallback
}

// ── Create ──────────────────────────────────────────────────────────────────
exports.createAirlinesSubscription = async (req, res) => {
  try {
    const body = req.body;

    // Always resolve price server-side to prevent tampering
    body.pricePerCertificate = resolvePricePerCertificate(body);

    // Compute totalAmount
    const isUnlimited = body.subscriptionPlan === 'Unlimited Plan';
    body.totalAmount = isUnlimited
      ? body.pricePerCertificate
      : body.pricePerCertificate * (body.certificateHolders?.length || 1);

    const doc = new Airlines(body);
    await doc.save();
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Read All ─────────────────────────────────────────────────────────────────
exports.getAllAirlinesSubscriptions = async (req, res) => {
  try {
    // Fetch from both collections (Airlines = new, AirlinesSubscription = legacy)
    const [newDocs, legacyDocs] = await Promise.all([
      Airlines.find().sort({ createdAt: -1 }),
      AirlinesSubscription.find().sort({ createdAt: -1 }),
    ]);
    // Merge and normalise legacy docs to Airlines shape
    const legacyNorm = legacyDocs.map((d) => {
      const obj = d.toObject();
      // Legacy model uses contactFirstName/contactLastName
      if (!obj.firstName && obj.contactFirstName) obj.firstName = obj.contactFirstName;
      if (!obj.lastName  && obj.contactLastName)  obj.lastName  = obj.contactLastName;
      if (!obj.email     && obj.contactEmail)      obj.email     = obj.contactEmail;
      if (!obj.phone     && obj.contactPhone)      obj.phone     = obj.contactPhone;
      obj._source = 'legacy';
      return obj;
    });
    const allDocs = [...newDocs.map(d => ({ ...d.toObject(), _source: 'primary' })), ...legacyNorm];
    allDocs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, data: allDocs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Read One ─────────────────────────────────────────────────────────────────
exports.getAirlinesSubscriptionById = async (req, res) => {
  try {
    const doc = await Airlines.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update ───────────────────────────────────────────────────────────────────
exports.updateAirlinesSubscription = async (req, res) => {
  try {
    let doc = await Airlines.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: false });
    if (!doc) {
      // Try legacy collection
      doc = await AirlinesSubscription.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: false });
    }
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Delete ───────────────────────────────────────────────────────────────────
exports.deleteAirlinesSubscription = async (req, res) => {
  try {
    let doc = await Airlines.findByIdAndDelete(req.params.id);
    if (!doc) {
      doc = await AirlinesSubscription.findByIdAndDelete(req.params.id);
    }
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Export Excel — matches reference: Agent_for_Serv_ Airlines ───────────────
exports.exportAirlinesExcel = async (req, res) => {
  try {
    const [newDocs, legacyDocs] = await Promise.all([
      Airlines.find().sort({ createdAt: -1 }),
      AirlinesSubscription.find().sort({ createdAt: -1 }),
    ]);
    const normalise = (arr, isLegacy) => arr.map((d) => {
      const o = d.toObject();
      if (isLegacy) {
        if (!o.firstName && o.contactFirstName) o.firstName = o.contactFirstName;
        if (!o.lastName  && o.contactLastName)  o.lastName  = o.contactLastName;
        if (!o.email     && o.contactEmail)      o.email     = o.contactEmail;
        if (!o.phone     && o.contactPhone)      o.phone     = o.contactPhone;
      }
      return o;
    });
    const docs = [
      ...normalise(newDocs, false),
      ...normalise(legacyDocs, true),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const fmt = (date) => date ? new Date(date).toLocaleDateString('en-US') : '';

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Agent_for_Serv_ Airlines');

    // ── Column widths (no .columns assignment with headers — we build rows manually) ──
    const COL_WIDTHS = [12, 26, 20, 20, 26, 14, 14, 14, 30, 20, 16, 14, 12, 24, 18, 28, 34, 26, 22, 22, 24, 28, 18, 12, 12];
    COL_WIDTHS.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

    // ── Shared styles ──
    const headerFont  = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
    const headerFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
    const centerAlign = { vertical: 'middle', horizontal: 'center', wrapText: true };
    const subFill     = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F7' } };
    const subFont     = { bold: true, name: 'Arial', size: 10, color: { argb: 'FF1F3864' } };

    // ── ROW 1: Main header — columns A–Y ──
    // Matches reference exactly: merged groups for "Team Members" section
    const ROW1_LABELS = [
      'Status',              // A1
      'Airlines',            // B1
      'Subscription Date',   // C1
      'Expiration Date',     // D1
      'Subscription Plan',   // E1
      '1 Year Plan',         // F1
      'Unlimited Plan',      // G1
      'Team Members',        // H1
      'Address Line 1',      // I1
      'Address Line 2',      // J1
      'City',                // K1
      'Zip/Postal Code',     // L1
      'Country',             // M1
      'Point of Contact',    // N1
      'Phone',               // O1
      'Email',               // P1
      'Primary Certificate', // Q1
      // R1–V1: "Team Members" group header spanning 5 cols
      'Team Members',        // R1 (will be merged R1:V1)
      '', '', '', '',        // S1, T1, U1, V1 — merged into R1
      'Total Service Fees',  // W1
      'Invoice ',            // X1
      'TOTAL',               // Y1
    ];

    const row1 = sheet.getRow(1);
    ROW1_LABELS.forEach((label, i) => {
      const cell = row1.getCell(i + 1);
      cell.value     = label;
      cell.font      = headerFont;
      cell.fill      = headerFill;
      cell.alignment = centerAlign;
    });
    row1.height = 30;

    // Merge R1:V1 for "Team Members" group header
    sheet.mergeCells('R1:V1');

    // ── ROW 2: Sub-header — only columns Q–V get labels (rest blank) ──
    // Matches reference: Q2=Primary Certificate (blank continuation), R2=Name, S2=FAA USAS Confirmation,
    // T2=FAA Certificate Number, U2=IACRA Tracking Number (FTN), V2=Email
    const row2 = sheet.getRow(2);

    // Style all cells A2–Y2 with sub-header fill
    for (let c = 1; c <= 25; c++) {
      const cell = row2.getCell(c);
      cell.fill      = subFill;
      cell.font      = subFont;
      cell.alignment = centerAlign;
    }

    // Only these columns get text in row 2 (others stay blank with fill)
    const row2Labels = {
      18: 'Name',                         // R2
      19: 'FAA USAS Confirmation',        // S2
      20: 'FAA Certificate Number',       // T2
      21: 'IACRA Tracking Number (FTN)', // U2
      22: 'Email',                        // V2
    };
    Object.entries(row2Labels).forEach(([col, label]) => {
      const cell = row2.getCell(Number(col));
      cell.value = label;
    });
    row2.height = 22;

    // ── Data rows ──
    const dataFont      = { name: 'Arial', size: 10 };
    const dataCenterAlign = { vertical: 'top', horizontal: 'center', wrapText: false };

    docs.forEach((d) => {
      const isUnlimited = d.subscriptionPlan === 'Unlimited Plan';
      const isOneYear   = d.subscriptionPlan === '1 Year Subscription Plan';
      const holders     = d.certificateHolders || [];
      const ppc         = d.pricePerCertificate || d.pricePerCert || 0;
      const total       = isUnlimited ? ppc : ppc * (parseInt(d.holderCountValue) || holders.length || 1);
      const contactName = [d.firstName, d.lastName].filter(Boolean).join(' ');

      // Build base values for first-row-of-airline columns (A–Q, W–Y)
      const base = (idx) => [
        idx === 0 ? (d.status || '')                                                          : '', // A
        idx === 0 ? (d.airlineName || '')                                                     : '', // B
        idx === 0 ? fmt(d.subscriptionDate || d.createdAt)                                   : '', // C
        idx === 0 ? (d.expirationDate ? fmt(d.expirationDate) : (isUnlimited ? 'Never' : '')): '', // D
        idx === 0 ? (d.subscriptionPlan || '')                                                : '', // E
        idx === 0 && isOneYear   ? `$${ppc}.00`                                              : '', // F
        idx === 0 && isUnlimited ? `$${ppc}.00`                                              : '', // G
        idx === 0 ? (d.holderCountValue || String(holders.length))                           : '', // H
        idx === 0 ? (d.addressLine1 || '')                                                   : '', // I
        idx === 0 ? (d.addressLine2 || '')                                                   : '', // J
        idx === 0 ? (d.city || '')                                                           : '', // K
        idx === 0 ? (d.postalCode || '')                                                     : '', // L
        idx === 0 ? (d.country || '')                                                        : '', // M
        idx === 0 ? contactName                                                              : '', // N
        idx === 0 ? (d.phone ? `+${d.phone}` : '')                                          : '', // O
        idx === 0 ? (d.email || '')                                                          : '', // P
      ];

      // Tail columns W–Y (indices 22–24)
      const tail = (idx) => [
        idx === 0 ? (d.totalServiceFees || total || '') : '', // W
        idx === 0 ? (d.invoiceStatus || d.paymentStatus || '') : '', // X
        idx === 0 ? (total || '') : '', // Y
      ];

      if (holders.length === 0) {
        const rowData = [
          ...base(0),
          '',  // Q — Primary Certificate (no holder)
          '',  // R — Name
          '',  // S — FAA USAS Confirmation
          '',  // T — FAA Certificate Number
          '',  // U — IACRA FTN
          '',  // V — Email
          ...tail(0),
        ];
        const r = sheet.addRow(rowData);
        r.font = dataFont;
        r.eachCell(cell => { cell.alignment = dataCenterAlign; });
      } else {
        holders.forEach((h, idx) => {
          const rowData = [
            ...base(idx),
            h.certificateType || '',                                    // Q
            h.fullName || '',                                           // R
            h.certificateStatus === 'EXISTING' ? 'Y' : 'N',           // S
            h.faaCertificateNumber || '',                               // T
            h.iacraFtnNumber || '',                                     // U
            h.email || '',                                              // V
            ...tail(idx),
          ];
          const r = sheet.addRow(rowData);
          r.font = dataFont;
          r.eachCell(cell => { cell.alignment = dataCenterAlign; });
        });
      }
    });

    // ── Thin borders on header rows ──
    [1, 2].forEach(rowNum => {
      const row = sheet.getRow(rowNum);
      for (let c = 1; c <= 25; c++) {
        row.getCell(c).border = {
          top:    { style: 'thin', color: { argb: 'FF1F3864' } },
          bottom: { style: 'thin', color: { argb: 'FF1F3864' } },
          left:   { style: 'thin', color: { argb: 'FF1F3864' } },
          right:  { style: 'thin', color: { argb: 'FF1F3864' } },
        };
      }
    });

    // ── Freeze top 2 rows ──
    sheet.views = [{ state: 'frozen', ySplit: 2 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Export_Airlines_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
