const express = require('express');
const router = express.Router();
const {
  getTransfers,
  getTransferById,
  createTransfer,
  validateTransfer
} = require('../controllers/transferController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getTransfers);
router.get('/:id', verifyToken, getTransferById);
router.post('/', verifyToken, createTransfer);
router.post('/:id/validate', verifyToken, validateTransfer);

module.exports = router;
