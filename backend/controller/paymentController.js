const Individual = require('../models/Individual');
const Airlines = require('../models/Airlines');
const AirlinesSubscription = require('../models/AirlinesSubscription');

/**
 * POST /api/payments/initiate
 * Body: { registrationId, registrationModel }
 * Validates the record and returns amount + a payment token.
 * Swap internals for real Stripe PaymentIntent in production.
 */
exports.initiatePayment = async (req, res) => {
  try {
    const { registrationId, registrationModel } = req.body;
    if (!registrationId || !registrationModel)
      return res.status(400).json({ success: false, message: 'registrationId and registrationModel are required.' });

    let record = null;
    if (registrationModel === 'Individual') {
      record = await Individual.findById(registrationId);
    } else {
      record = await Airlines.findById(registrationId);
      if (!record) record = await AirlinesSubscription.findById(registrationId);
    }

    if (!record)
      return res.status(404).json({ success: false, message: 'Subscription record not found.' });

    if (record.paymentStatus === 'paid' || record.status === 'Active')
      return res.status(400).json({ success: false, message: 'This subscription is already paid.' });

    const paymentToken = `pi_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const amount = record.price || record.totalAmount || record.totalServiceFees || 0;

    res.json({
      success: true,
      paymentToken,
      amount,
      currency: 'USD',
      plan: record.subscriptionPlan,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/payments/confirm
 * Body: { registrationId, registrationModel, paymentToken }
 * Marks the subscription as paid and sets Active status + subscription/expiry dates.
 */
exports.confirmPayment = async (req, res) => {
  try {
    const { registrationId, registrationModel, paymentToken } = req.body;
    if (!registrationId || !registrationModel || !paymentToken)
      return res.status(400).json({ success: false, message: 'Missing required fields.' });

    const now = new Date();
    const updateFields = {
      paymentStatus: 'paid',
      status: 'Active',
      subscriptionDate: now,
      invoiceStatus: 'Paid',
      invoiceNumber: `INV-${Date.now()}`,
    };

    let record = null;

    if (registrationModel === 'Individual') {
      const rec = await Individual.findById(registrationId);
      if (!rec) return res.status(404).json({ success: false, message: 'Record not found.' });

      if (rec.subscriptionPlan === '1 Year Subscription Plan') {
        const exp = new Date(now);
        exp.setFullYear(exp.getFullYear() + 1);
        updateFields.expirationDate = exp;
      } else if (rec.subscriptionPlan === 'Multiple Years Subscription Plan') {
        const exp = new Date(now);
        exp.setFullYear(exp.getFullYear() + 3);
        updateFields.expirationDate = exp;
      }
      // Unlimited Plan: no expiry date

      record = await Individual.findByIdAndUpdate(registrationId, updateFields, { new: true });
    } else {
      record = await Airlines.findByIdAndUpdate(registrationId, updateFields, { new: true });
      if (!record) {
        record = await AirlinesSubscription.findByIdAndUpdate(registrationId, updateFields, { new: true });
      }
    }

    if (!record)
      return res.status(404).json({ success: false, message: 'Record not found after update.' });

    res.json({
      success: true,
      message: 'Payment confirmed. Subscription is now active.',
      data: record,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
