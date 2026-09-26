const { queryAll, queryOne, runSql } = require('../config/database');

async function getStock(req, res) {
  const { productId, locationId, lowStockOnly } = req.query;

  let sql = `
    SELECT 
      s.id as stock_id,
      p.id as product_id,
      p.sku as product_sku,
      p.name as product_name,
      p.category as product_category,
      p.unit as product_unit,
      p.min_stock_threshold,
      p.price as product_price,
      p.image_url as product_image_url,
      l.id as location_id,
      l.name as location_name,
      l.code as location_code,
      COALESCE(s.quantity, 0) as quantity,
      (COALESCE(s.quantity, 0) * p.price) as total_value,
      CASE 
        WHEN COALESCE(s.quantity, 0) <= p.min_stock_threshold THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
      END as status
    FROM products p
    CROSS JOIN locations l
    LEFT JOIN stock s ON p.id = s.product_id AND l.id = s.location_id
    WHERE l.is_active = 1
  `;

  const params = [];
  if (productId) {
    sql += ` AND p.id = ?`;
    params.push(productId);
  }
  if (locationId) {
    sql += ` AND l.id = ?`;
    params.push(locationId);
  }

  sql += ` ORDER BY p.name ASC, l.name ASC`;

  let stockData = queryAll(sql, params);

  if (lowStockOnly === 'true') {
    stockData = stockData.filter(item => item.quantity <= item.min_stock_threshold);
  }

  return res.json({
    success: true,
    data: stockData
  });
}

async function getLocations(req, res) {
  const locations = queryAll('SELECT * FROM locations WHERE is_active = 1 ORDER BY name ASC');
  return res.json({
    success: true,
    data: locations
  });
}

async function createLocation(req, res) {
  const { name, code, address } = req.body;
  if (!name || !code) {
    return res.status(400).json({ success: false, message: 'Name and Code are required.' });
  }

  const existing = queryOne('SELECT id FROM locations WHERE code = ?', [code.trim().toUpperCase()]);
  if (existing) {
    return res.status(400).json({ success: false, message: `Location code '${code}' already exists.` });
  }

  const result = runSql(
    `INSERT INTO locations (name, code, address) VALUES (?, ?, ?)`,
    [name.trim(), code.trim().toUpperCase(), address || '']
  );

  const newLoc = queryOne('SELECT * FROM locations WHERE id = ?', [result.lastInsertRowid]);

  return res.status(201).json({
    success: true,
    message: 'Location created successfully',
    data: newLoc
  });
}

module.exports = {
  getStock,
  getLocations,
  createLocation
};
