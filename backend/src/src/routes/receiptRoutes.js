const express = require('express');
const router = express.Router();
const {
  getReceipts,
  getReceiptById,
  createReceipt,
  validateReceipt
} = require('../controllers/receiptController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getReceipts);
router.get('/:id', verifyToken, getReceiptById);
router.post('/', verifyToken, createReceipt);
router.post('/:id/validate', verifyToken, validateReceipt);

module.exports = router;
