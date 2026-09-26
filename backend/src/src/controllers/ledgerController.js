const { queryAll, queryOne } = require('../config/database');

async function getLedger(req, res) {
  const { productId, locationId, transactionType, search, limit = 100, offset = 0 } = req.query;

  let sql = `
    SELECT 
      sl.*,
      p.sku as product_sku,
      p.name as product_name,
      p.unit as product_unit,
      p.category as product_category,
      l.name as location_name,
      l.code as location_code,
      u.name as user_name
    FROM stock_ledger sl
    JOIN products p ON sl.product_id = p.id
    JOIN locations l ON sl.location_id = l.id
    JOIN users u ON sl.created_by = u.id
    WHERE 1=1
  `;

  const params = [];

  if (productId) {
    sql += ` AND sl.product_id = ?`;
    params.push(productId);
  }

  if (locationId) {
    sql += ` AND sl.location_id = ?`;
    params.push(locationId);
  }

  if (transactionType) {
    sql += ` AND sl.transaction_type = ?`;
    params.push(transactionType);
  }

  if (search) {
    sql += ` AND (sl.reference_no LIKE ? OR p.name LIKE ? OR p.sku LIKE ? OR sl.notes LIKE ?)`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  sql += ` ORDER BY sl.created_at DESC, sl.id DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const records = queryAll(sql, params);

  // Total count query
  let countSql = `
    SELECT COUNT(*) as total 
    FROM stock_ledger sl 
    JOIN products p ON sl.product_id = p.id
    WHERE 1=1
  `;
  const countParams = [];
  if (productId) { countSql += ` AND sl.product_id = ?`; countParams.push(productId); }
  if (locationId) { countSql += ` AND sl.location_id = ?`; countParams.push(locationId); }
  if (transactionType) { countSql += ` AND sl.transaction_type = ?`; countParams.push(transactionType); }
  if (search) {
    countSql += ` AND (sl.reference_no LIKE ? OR p.name LIKE ? OR p.sku LIKE ? OR sl.notes LIKE ?)`;
    const searchParam = `%${search}%`;
    countParams.push(searchParam, searchParam, searchParam, searchParam);
  }

  const countResult = queryOne(countSql, countParams);

  return res.json({
    success: true,
    data: records,
    pagination: {
      total: countResult ? countResult.total : 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}

async function getLedgerByProduct(req, res) {
  const { productId } = req.params;
  req.query.productId = productId;
  return getLedger(req, res);
}

async function getLedgerByLocation(req, res) {
  const { locationId } = req.params;
  req.query.locationId = locationId;
  return getLedger(req, res);
}

module.exports = {
  getLedger,
  getLedgerByProduct,
  getLedgerByLocation
};
