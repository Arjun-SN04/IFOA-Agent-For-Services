const express = require('express');
const router = express.Router();
const {
  createIndividual,
  getAllIndividuals,
  getIndividualById,
  updateIndividual,
  deleteIndividual,
  exportToExcel,
} = require('../controller/individualController');

// Public
router.post('/', createIndividual);

// Admin
router.get('/', getAllIndividuals);
router.get('/export/excel', exportToExcel);
router.get('/:id', getIndividualById);
router.put('/:id', updateIndividual);
router.delete('/:id', deleteIndividual);

module.exports = router;
