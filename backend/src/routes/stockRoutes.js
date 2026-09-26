const express = require('express');
const router = express.Router();
const { getStock, getLocations, createLocation } = require('../controllers/stockController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/stock', verifyToken, getStock);
router.get('/locations', verifyToken, getLocations);
router.post('/locations', verifyToken, requireRole('ADMIN'), createLocation);

module.exports = router;
