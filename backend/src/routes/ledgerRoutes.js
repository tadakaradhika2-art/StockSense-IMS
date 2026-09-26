const express = require('express');
const router = express.Router();
const {
  getLedger,
  getLedgerByProduct,
  getLedgerByLocation
} = require('../controllers/ledgerController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getLedger);
router.get('/product/:productId', verifyToken, getLedgerByProduct);
router.get('/location/:locationId', verifyToken, getLedgerByLocation);

module.exports = router;
