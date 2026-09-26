const { queryAll, queryOne, runSql } = require('../config/database');

async function getProducts(req, res) {
  const { search, category, lowStock } = req.query;

  let sql = `
    SELECT 
      p.*,
      COALESCE(SUM(s.quantity), 0) AS total_stock,
      CASE 
        WHEN COALESCE(SUM(s.quantity), 0) <= p.min_stock_threshold THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
      END AS status
    FROM products p
    LEFT JOIN stock s ON p.id = s.product_id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    sql += ` AND (p.sku LIKE ? OR p.name LIKE ? OR p.category LIKE ?)`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  if (category) {
    sql += ` AND p.category = ?`;
    params.push(category);
  }

  sql += ` GROUP BY p.id ORDER BY p.name ASC`;

  let products = queryAll(sql, params);

  if (lowStock === 'true') {
    products = products.filter(p => p.total_stock <= p.min_stock_threshold);
  }

  return res.json({
    success: true,
    data: products
  });
}

async function getProductById(req, res) {
  const { id } = req.params;
  const product = queryOne(`
    SELECT p.*, COALESCE(SUM(s.quantity), 0) AS total_stock
    FROM products p
    LEFT JOIN stock s ON p.id = s.product_id
    WHERE p.id = ?
    GROUP BY p.id
  `, [id]);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  // Stock by location
  const stockByLocation = queryAll(`
    SELECT l.id as location_id, l.name as location_name, l.code as location_code, COALESCE(s.quantity, 0) as quantity
    FROM locations l
    LEFT JOIN stock s ON l.id = s.location_id AND s.product_id = ?
    WHERE l.is_active = 1
  `, [id]);

  // Ledger history for product
  const ledgerHistory = queryAll(`
    SELECT sl.*, l.name as location_name, u.name as user_name
    FROM stock_ledger sl
    JOIN locations l ON sl.location_id = l.id
    JOIN users u ON sl.created_by = u.id
    WHERE sl.product_id = ?
    ORDER BY sl.created_at DESC
    LIMIT 20
  `, [id]);

  return res.json({
    success: true,
    data: {
      ...product,
      stockByLocation,
      ledgerHistory
    }
  });
}

async function createProduct(req, res) {
  const { sku, name, category, unit, min_stock_threshold, price, description, image_url } = req.body;

  if (!sku || !name || !category) {
    return res.status(400).json({ success: false, message: 'SKU, Name, and Category are required.' });
  }

  const existing = queryOne('SELECT id FROM products WHERE sku = ?', [sku.trim()]);
  if (existing) {
    return res.status(400).json({ success: false, message: `Product with SKU '${sku}' already exists.` });
  }

  const result = runSql(
    `INSERT INTO products (sku, name, category, unit, min_stock_threshold, price, description, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sku.trim().toUpperCase(),
      name.trim(),
      category.trim(),
      unit || 'Pcs',
      parseInt(min_stock_threshold) || 10,
      parseFloat(price) || 0.0,
      description || '',
      image_url || ''
    ]
  );

  const newProduct = queryOne('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid]);

  return res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: newProduct
  });
}

async function updateProduct(req, res) {
  const { id } = req.params;
  const { sku, name, category, unit, min_stock_threshold, price, description, image_url } = req.body;

  const product = queryOne('SELECT id FROM products WHERE id = ?', [id]);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  if (sku) {
    const existing = queryOne('SELECT id FROM products WHERE sku = ? AND id != ?', [sku.trim(), id]);
    if (existing) {
      return res.status(400).json({ success: false, message: `SKU '${sku}' is already taken by another product.` });
    }
  }

  runSql(
    `UPDATE products SET
      sku = COALESCE(?, sku),
      name = COALESCE(?, name),
      category = COALESCE(?, category),
      unit = COALESCE(?, unit),
      min_stock_threshold = COALESCE(?, min_stock_threshold),
      price = COALESCE(?, price),
      description = COALESCE(?, description),
      image_url = COALESCE(?, image_url)
     WHERE id = ?`,
    [
      sku ? sku.trim().toUpperCase() : null,
      name ? name.trim() : null,
      category ? category.trim() : null,
      unit,
      min_stock_threshold !== undefined ? parseInt(min_stock_threshold) : null,
      price !== undefined ? parseFloat(price) : null,
      description,
      image_url,
      id
    ]
  );

  const updatedProduct = queryOne('SELECT * FROM products WHERE id = ?', [id]);

  return res.json({
    success: true,
    message: 'Product updated successfully',
    data: updatedProduct
  });
}

async function deleteProduct(req, res) {
  const { id } = req.params;
  const product = queryOne('SELECT id FROM products WHERE id = ?', [id]);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  runSql('DELETE FROM products WHERE id = ?', [id]);

  return res.json({
    success: true,
    message: 'Product deleted successfully'
  });
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
