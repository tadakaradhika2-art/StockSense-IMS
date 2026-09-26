const express = require('express');
const router = express.Router();
const { getDashboard, getAlerts } = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getDashboard);
router.get('/alerts', verifyToken, getAlerts);

module.exports = router;
