const { queryAll, queryOne } = require('../config/database');

async function getDashboard(req, res) {
  // 1. KPI Stats
  const totalProducts = queryOne('SELECT COUNT(*) as count FROM products').count;
  
  const totalStockVal = queryOne(`
    SELECT COALESCE(SUM(s.quantity * p.price), 0) as total_value
    FROM stock s
    JOIN products p ON s.product_id = p.id
  `).total_value;

  const lowStockItems = queryAll(`
    SELECT p.id, p.name, p.sku, p.min_stock_threshold, l.name as location_name, COALESCE(s.quantity, 0) as quantity
    FROM products p
    CROSS JOIN locations l
    LEFT JOIN stock s ON p.id = s.product_id AND l.id = s.location_id
    WHERE l.is_active = 1 AND COALESCE(s.quantity, 0) <= p.min_stock_threshold
  `);

  const pendingReceipts = queryOne("SELECT COUNT(*) as count FROM receipts WHERE status = 'DRAFT'").count;
  const pendingDeliveries = queryOne("SELECT COUNT(*) as count FROM delivery_orders WHERE status IN ('DRAFT', 'PICKED', 'PACKED')").count;
  const pendingTransfers = queryOne("SELECT COUNT(*) as count FROM internal_transfers WHERE status = 'DRAFT'").count;
  const pendingAdjustments = queryOne("SELECT COUNT(*) as count FROM inventory_adjustments WHERE status = 'DRAFT'").count;

  // 2. Stock distribution by location
  const locationBreakdown = queryAll(`
    SELECT 
      l.id,
      l.name,
      l.code,
      COALESCE(SUM(s.quantity), 0) as total_units,
      COALESCE(SUM(s.quantity * p.price), 0) as total_value
    FROM locations l
    LEFT JOIN stock s ON l.id = s.location_id
    LEFT JOIN products p ON s.product_id = p.id
    WHERE l.is_active = 1
    GROUP BY l.id
  `);

  // 3. Stock movements history breakdown (last 7 days / recent 10)
  const recentMovements = queryAll(`
    SELECT 
      sl.*,
      p.name as product_name,
      p.sku as product_sku,
      l.name as location_name,
      u.name as user_name
    FROM stock_ledger sl
    JOIN products p ON sl.product_id = p.id
    JOIN locations l ON sl.location_id = l.id
    JOIN users u ON sl.created_by = u.id
    ORDER BY sl.created_at DESC
    LIMIT 10
  `);

  // 4. Movement status totals (Receiving vs Delivery vs Transfer vs Adjustment)
  const ledgerSummary = queryAll(`
    SELECT 
      transaction_type,
      COUNT(*) as transaction_count,
      SUM(ABS(quantity_change)) as total_volume
    FROM stock_ledger
    GROUP BY transaction_type
  `);

  return res.json({
    success: true,
    data: {
      kpis: {
        totalProducts,
        totalStockValue: totalStockVal,
        lowStockAlertCount: lowStockItems.length,
        pendingReceipts,
        pendingDeliveries,
        pendingTransfers,
        pendingAdjustments
      },
      lowStockAlerts: lowStockItems,
      locationBreakdown,
      recentMovements,
      ledgerSummary
    }
  });
}

async function getAlerts(req, res) {
  const alerts = queryAll(`
    SELECT 
      p.id as product_id,
      p.sku as product_sku,
      p.name as product_name,
      p.category as product_category,
      p.unit as product_unit,
      p.min_stock_threshold,
      l.id as location_id,
      l.name as location_name,
      l.code as location_code,
      COALESCE(s.quantity, 0) as current_quantity,
      (p.min_stock_threshold - COALESCE(s.quantity, 0)) as deficit,
      'LOW_STOCK' as status
    FROM products p
    CROSS JOIN locations l
    LEFT JOIN stock s ON p.id = s.product_id AND l.id = s.location_id
    WHERE l.is_active = 1 AND COALESCE(s.quantity, 0) <= p.min_stock_threshold
    ORDER BY (p.min_stock_threshold - COALESCE(s.quantity, 0)) DESC
  `);

  return res.json({
    success: true,
    data: alerts
  });
}

module.exports = {
  getDashboard,
  getAlerts
};
