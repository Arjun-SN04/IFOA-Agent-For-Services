const Individual = require('../models/Individual');
const ExcelJS = require('exceljs');

// Create new individual submission
exports.createIndividual = async (req, res) => {
  try {
    const individual = new Individual(req.body);
    await individual.save();
    res.status(201).json({ success: true, data: individual });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Get all individuals (Admin)
exports.getAllIndividuals = async (req, res) => {
  try {
    const individuals = await Individual.find().sort({ createdAt: -1 });
    res.json({ success: true, data: individuals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get individual by email (used as fallback when registrationId not linked yet)
exports.getIndividualByEmail = async (req, res) => {
  try {
    const email = req.query.email || req.params.email;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    // Return the most recent submission for this email
    const individual = await Individual.findOne({ email: email.toLowerCase() }).sort({ createdAt: -1 });
    if (!individual) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: individual });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single individual
exports.getIndividualById = async (req, res) => {
  try {
    const individual = await Individual.findById(req.params.id);
    if (!individual) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: individual });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update individual
exports.updateIndividual = async (req, res) => {
  try {
    const individual = await Individual.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!individual) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: individual });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Delete individual
exports.deleteIndividual = async (req, res) => {
  try {
    const individual = await Individual.findByIdAndDelete(req.params.id);
    if (!individual) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Export to Excel — matches reference sheet: Agent_for_Serv_ Indiv
exports.exportToExcel = async (req, res) => {
  try {
    const individuals = await Individual.find().sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Agent_for_Serv_ Indiv');

    // ── Columns exactly matching reference Excel ──
    sheet.columns = [
      { header: 'Status',                                    key: 'status',                         width: 12 },
      { header: 'Subscription Date',                        key: 'subscriptionDate',                width: 20 },
      { header: 'Expiration Date',                          key: 'expirationDate',                  width: 20 },
      { header: 'Subscription Plan',                        key: 'subscriptionPlan',                width: 28 },
      { header: '1 Year Plan',                              key: 'oneYearPlan',                     width: 12 },
      { header: 'Multi Year Plan',                          key: 'multiYearPlan',                   width: 14 },
      { header: 'Unlimited Plan',                           key: 'unlimitedPlan',                   width: 14 },
      { header: 'First Name',                               key: 'firstName',                       width: 16 },
      { header: 'Last Name',                                key: 'lastName',                        width: 16 },
      { header: 'Middle Name',                              key: 'middleName',                      width: 14 },
      { header: 'Date of Birth',                            key: 'dateOfBirth',                     width: 14 },
      { header: 'Address Line 1',                          key: 'addressLine1',                    width: 30 },
      { header: 'City',                                     key: 'city',                            width: 16 },
      { header: 'Zip/Postal Code',                          key: 'postalCode',                      width: 14 },
      { header: 'Country',                                  key: 'country',                         width: 12 },
      { header: 'Phone',                                    key: 'phone',                           width: 18 },
      { header: 'Email',                                    key: 'email',                           width: 28 },
      { header: 'Primary Airman Certificate',               key: 'primaryAirmanCertificate',        width: 22 },
      { header: 'Do you have a Secondary Airman Certificate?', key: 'hasSecondary',                width: 14 },
      { header: 'Primary Certificate',                      key: 'primaryCertificate',              width: 34 },
      { header: 'FAA Certificate Number',                   key: 'faaCertificateNumber',            width: 22 },
      { header: 'IACRA Tracking Number (FTN)',              key: 'iacraTrackingNumber',             width: 24 },
      { header: 'Secondary Certificate',                    key: 'secondaryCertificate',            width: 34 },
      { header: 'Secondary FAA Certificate Number',         key: 'secondaryFaaCertificateNumber',   width: 26 },
      { header: 'Secondary IACRA Tracking Number (FTN)',    key: 'secondaryIacraTrackingNumber',    width: 26 },
      { header: 'Total Service Fees',                       key: 'totalServiceFees',                width: 18 },
      { header: 'Invoice',                                  key: 'invoiceStatus',                   width: 12 },
      { header: 'TOTAL',                                    key: 'price',                           width: 10 },
    ];

    // Style header row — dark navy matching reference
    const hdr = sheet.getRow(1);
    hdr.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
    hdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a2e5a' } };
    hdr.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    hdr.height = 30;

    const fmt = (date) => date ? new Date(date).toLocaleDateString('en-US') : '';

    individuals.forEach((doc) => {
      const d = doc.toObject();
      const isOneYear  = d.subscriptionPlan === '1 Year Subscription Plan';
      const isMulti    = d.subscriptionPlan === 'Multiple Years Subscription Plan';
      const isUnlimited= d.subscriptionPlan === 'Unlimited Plan';

      const r = sheet.addRow({
        status:                       d.status || '',
        subscriptionDate:             fmt(d.subscriptionDate || d.createdAt),
        expirationDate:               d.expirationDate ? fmt(d.expirationDate) : (isUnlimited ? 'Never' : ''),
        subscriptionPlan:             d.subscriptionPlan || '',
        oneYearPlan:                  isOneYear   ? `${d.price?.toFixed(2) || '69.00'}` : '',
        multiYearPlan:                isMulti     ? `${d.price?.toFixed(2) || ''}` : '',
        unlimitedPlan:                isUnlimited ? `${d.price?.toFixed(2) || '299.00'}` : '',
        firstName:                    d.firstName || '',
        lastName:                     d.lastName  || '',
        middleName:                   d.middleName|| '',
        dateOfBirth:                  fmt(d.dateOfBirth),
        addressLine1:                 d.addressLine1 || '',
        city:                         d.city || '',
        postalCode:                   d.postalCode || '',
        country:                      d.country || '',
        phone:                        d.phone ? `+${d.phone}` : '',
        email:                        d.email || '',
        primaryAirmanCertificate:     d.primaryAirmanCertificate || '',
        hasSecondary:                 d.hasSecondaryCertificate ? 'Yes' : 'No',
        primaryCertificate:           d.primaryCertificate || '',
        faaCertificateNumber:         d.faaCertificateNumber || '',
        iacraTrackingNumber:          d.iacraTrackingNumber || '',
        secondaryCertificate:         d.hasSecondaryCertificate ? (d.secondaryCertificate || '') : '',
        secondaryFaaCertificateNumber:d.hasSecondaryCertificate ? (d.secondaryFaaCertificateNumber || '') : '',
        secondaryIacraTrackingNumber: d.hasSecondaryCertificate ? (d.secondaryIacraTrackingNumber || '') : '',
        totalServiceFees:             d.totalServiceFees || d.price || '',
        invoiceStatus:                d.invoiceStatus || d.paymentStatus || '',
        price:                        d.price || '',
      });
      r.font = { name: 'Arial', size: 10 };
      r.eachCell(cell => { cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false }; });
    });

    // Auto-filter
    sheet.autoFilter = { from: 'A1', to: { row: 1, column: sheet.columns.length } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Export_Individuals_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
