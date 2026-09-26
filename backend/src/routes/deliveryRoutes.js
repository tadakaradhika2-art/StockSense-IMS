const express = require('express');
const router = express.Router();
const {
  getDeliveries,
  getDeliveryById,
  createDelivery,
  markPicked,
  markPacked,
  validateDelivery
} = require('../controllers/deliveryController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getDeliveries);
router.get('/:id', verifyToken, getDeliveryById);
router.post('/', verifyToken, createDelivery);
router.post('/:id/pick', verifyToken, markPicked);
router.post('/:id/pack', verifyToken, markPacked);
router.post('/:id/validate', verifyToken, validateDelivery);

module.exports = router;
