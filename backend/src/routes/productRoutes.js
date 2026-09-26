const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getProducts);
router.get('/:id', verifyToken, getProductById);
router.post('/', verifyToken, requireRole('ADMIN'), createProduct);
router.put('/:id', verifyToken, requireRole('ADMIN'), updateProduct);
router.delete('/:id', verifyToken, requireRole('ADMIN'), deleteProduct);

module.exports = router;
