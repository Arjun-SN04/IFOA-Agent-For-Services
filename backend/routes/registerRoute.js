const express = require('express');
const router = express.Router();
const {
  createIndividual,
} = require('../controller/individualController');
const {
  createAirlinesSubscription,
} = require('../controller/airlinesController');

/**
 * POST /api/register
 * Unified registration endpoint for both individual and airline registrations.
 * Body must include: { type: 'individual' | 'airline', ...formFields }
 */
router.post('/', async (req, res) => {
  const { type, ...body } = req.body;

  if (!type || !['individual', 'airline'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Field "type" is required and must be "individual" or "airline".',
    });
  }

  // Delegate to the appropriate controller by mutating req.body
  req.body = body;

  if (type === 'individual') {
    return createIndividual(req, res);
  } else {
    return createAirlinesSubscription(req, res);
  }
});

module.exports = router;
