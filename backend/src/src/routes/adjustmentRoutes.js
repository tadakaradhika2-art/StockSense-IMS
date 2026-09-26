const express = require('express');
const router = express.Router();
const {
  getAdjustments,
  getAdjustmentById,
  createAdjustment,
  confirmAdjustment
} = require('../controllers/adjustmentController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getAdjustments);
router.get('/:id', verifyToken, getAdjustmentById);
router.post('/', verifyToken, createAdjustment);
router.post('/:id/confirm', verifyToken, requireRole('ADMIN'), confirmAdjustment);

module.exports = router;
