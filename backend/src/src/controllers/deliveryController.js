const { queryAll, queryOne, runSql, transaction } = require('../config/database');

async function getDeliveries(req, res) {
  const deliveries = queryAll(`
    SELECT 
      d.*,
      u.name as created_by_name,
      COUNT(di.id) as item_count
    FROM delivery_orders d
    JOIN users u ON d.created_by = u.id
    LEFT JOIN delivery_items di ON d.id = di.delivery_id
    GROUP BY d.id
    ORDER BY d.created_at DESC
  `);

  return res.json({
    success: true,
    data: deliveries
  });
}

async function getDeliveryById(req, res) {
  const { id } = req.params;

  const delivery = queryOne(`
    SELECT d.*, u.name as created_by_name
    FROM delivery_orders d
    JOIN users u ON d.created_by = u.id
    WHERE d.id = ?
  `, [id]);

  if (!delivery) {
    return res.status(404).json({ success: false, message: 'Delivery order not found.' });
  }

  const items = queryAll(`
    SELECT 
      di.*,
      p.sku as product_sku,
      p.name as product_name,
      p.unit as product_unit,
      p.price as product_price,
      l.name as location_name,
      l.code as location_code,
      COALESCE(s.quantity, 0) as available_stock
    FROM delivery_items di
    JOIN products p ON di.product_id = p.id
    JOIN locations l ON di.location_id = l.id
    LEFT JOIN stock s ON di.product_id = s.product_id AND di.location_id = s.location_id
    WHERE di.delivery_id = ?
  `, [id]);

  return res.json({
    success: true,
    data: {
      ...delivery,
      items
    }
  });
}

async function createDelivery(req, res) {
  const { customer, notes, items } = req.body;

  if (!customer || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Customer and at least one item are required.' });
  }

  const timestamp = new Date().toISOString().slice(0,10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const referenceNo = `DEL-${timestamp}-${randomSuffix}`;

  try {
    const result = transaction(() => {
      const delRes = runSql(
        `INSERT INTO delivery_orders (reference_no, customer, status, notes, created_by)
         VALUES (?, ?, 'DRAFT', ?, ?)`,
        [referenceNo, customer.trim(), notes || '', req.user.id]
      );
      const deliveryId = delRes.lastInsertRowid;

      for (const item of items) {
        if (!item.product_id || !item.location_id || !item.quantity || item.quantity <= 0) {
          throw new Error('Each item must have a valid product, location, and quantity > 0.');
        }

        // Optional pre-check stock availability
        const currentStock = queryOne(
          'SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?',
          [item.product_id, item.location_id]
        );
        const avail = currentStock ? currentStock.quantity : 0;
        if (avail < item.quantity) {
          const prod = queryOne('SELECT name FROM products WHERE id = ?', [item.product_id]);
          const loc = queryOne('SELECT name FROM locations WHERE id = ?', [item.location_id]);
          throw new Error(`Insufficient stock for '${prod ? prod.name : item.product_id}' at '${loc ? loc.name : item.location_id}'. Requested: ${item.quantity}, Available: ${avail}`);
        }

        runSql(
          `INSERT INTO delivery_items (delivery_id, product_id, location_id, quantity)
           VALUES (?, ?, ?, ?)`,
          [deliveryId, item.product_id, item.location_id, parseInt(item.quantity)]
        );
      }

      return deliveryId;
    });

    const newDelivery = queryOne('SELECT * FROM delivery_orders WHERE id = ?', [result]);

    return res.status(201).json({
      success: true,
      message: 'Delivery order draft created successfully',
      data: newDelivery
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

async function markPicked(req, res) {
  const { id } = req.params;
  const delivery = queryOne('SELECT * FROM delivery_orders WHERE id = ?', [id]);
  if (!delivery) return res.status(404).json({ success: false, message: 'Delivery order not found.' });

  if (delivery.status === 'VALIDATED') {
    return res.status(400).json({ success: false, message: 'Cannot modify a validated delivery.' });
  }

  runSql("UPDATE delivery_orders SET status = 'PICKED' WHERE id = ?", [id]);
  const updated = queryOne('SELECT * FROM delivery_orders WHERE id = ?', [id]);
  return res.json({ success: true, message: 'Delivery status updated to PICKED', data: updated });
}

async function markPacked(req, res) {
  const { id } = req.params;
  const delivery = queryOne('SELECT * FROM delivery_orders WHERE id = ?', [id]);
  if (!delivery) return res.status(404).json({ success: false, message: 'Delivery order not found.' });

  if (delivery.status === 'VALIDATED') {
    return res.status(400).json({ success: false, message: 'Cannot modify a validated delivery.' });
  }

  runSql("UPDATE delivery_orders SET status = 'PACKED' WHERE id = ?", [id]);
  const updated = queryOne('SELECT * FROM delivery_orders WHERE id = ?', [id]);
  return res.json({ success: true, message: 'Delivery status updated to PACKED', data: updated });
}

async function validateDelivery(req, res) {
  const { id } = req.params;

  const delivery = queryOne('SELECT * FROM delivery_orders WHERE id = ?', [id]);
  if (!delivery) {
    return res.status(404).json({ success: false, message: 'Delivery order not found.' });
  }

  if (delivery.status === 'VALIDATED') {
    return res.status(400).json({ success: false, message: 'This delivery order has already been validated.' });
  }

  const items = queryAll('SELECT * FROM delivery_items WHERE delivery_id = ?', [id]);
  if (items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cannot validate a delivery order with no items.' });
  }

  try {
    transaction(() => {
      // 1. Verify all items have enough stock
      for (const item of items) {
        const stockRow = queryOne(
          'SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?',
          [item.product_id, item.location_id]
        );

        const currentQty = stockRow ? stockRow.quantity : 0;
        if (currentQty < item.quantity) {
          const prod = queryOne('SELECT name FROM products WHERE id = ?', [item.product_id]);
          const loc = queryOne('SELECT name FROM locations WHERE id = ?', [item.location_id]);
          throw new Error(
            `Stock validation failed: Product '${prod ? prod.name : item.product_id}' has only ${currentQty} units available at location '${loc ? loc.name : item.location_id}', but delivery requires ${item.quantity}.`
          );
        }
      }

      // 2. Perform stock reduction and ledger recording
      for (const item of items) {
        const stockRow = queryOne(
          'SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?',
          [item.product_id, item.location_id]
        );

        const qtyBefore = stockRow.quantity;
        const qtyAfter = qtyBefore - item.quantity;

        // Update stock
        runSql(
          'UPDATE stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND location_id = ?',
          [qtyAfter, item.product_id, item.location_id]
        );

        // Record Ledger entry
        runSql(
          `INSERT INTO stock_ledger 
            (product_id, location_id, transaction_type, reference_no, quantity_change, quantity_before, quantity_after, notes, created_by)
           VALUES (?, ?, 'DELIVERY', ?, ?, ?, ?, ?, ?)`,
          [
            item.product_id,
            item.location_id,
            delivery.reference_no,
            -item.quantity,
            qtyBefore,
            qtyAfter,
            `Delivery fulfillment for customer: ${delivery.customer}`,
            req.user.id
          ]
        );
      }

      // 3. Update Delivery Order status
      runSql(
        `UPDATE delivery_orders SET status = 'VALIDATED', validated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id]
      );
    });

    const updatedDelivery = queryOne('SELECT * FROM delivery_orders WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: 'Delivery order validated successfully! Stock deducted and ledger updated.',
      data: updatedDelivery
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

module.exports = {
  getDeliveries,
  getDeliveryById,
  createDelivery,
  markPicked,
  markPacked,
  validateDelivery
};
