const { queryAll, queryOne, runSql, transaction } = require('../config/database');

async function getAdjustments(req, res) {
  const adjustments = queryAll(`
    SELECT 
      a.*,
      l.name as location_name,
      l.code as location_code,
      u.name as created_by_name,
      COUNT(ai.id) as item_count
    FROM inventory_adjustments a
    JOIN locations l ON a.location_id = l.id
    JOIN users u ON a.created_by = u.id
    LEFT JOIN adjustment_items ai ON a.id = ai.adjustment_id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `);

  return res.json({
    success: true,
    data: adjustments
  });
}

async function getAdjustmentById(req, res) {
  const { id } = req.params;

  const adjustment = queryOne(`
    SELECT 
      a.*,
      l.name as location_name,
      l.code as location_code,
      u.name as created_by_name
    FROM inventory_adjustments a
    JOIN locations l ON a.location_id = l.id
    JOIN users u ON a.created_by = u.id
    WHERE a.id = ?
  `, [id]);

  if (!adjustment) {
    return res.status(404).json({ success: false, message: 'Adjustment not found.' });
  }

  const items = queryAll(`
    SELECT 
      ai.*,
      p.sku as product_sku,
      p.name as product_name,
      p.unit as product_unit
    FROM adjustment_items ai
    JOIN products p ON ai.product_id = p.id
    WHERE ai.adjustment_id = ?
  `, [id]);

  return res.json({
    success: true,
    data: {
      ...adjustment,
      items
    }
  });
}

async function createAdjustment(req, res) {
  const { location_id, notes, items } = req.body;

  if (!location_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Location and at least one product adjustment item are required.' });
  }

  const timestamp = new Date().toISOString().slice(0,10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const referenceNo = `ADJ-${timestamp}-${randomSuffix}`;

  try {
    const result = transaction(() => {
      const adjRes = runSql(
        `INSERT INTO inventory_adjustments (reference_no, location_id, status, notes, created_by)
         VALUES (?, ?, 'DRAFT', ?, ?)`,
        [referenceNo, location_id, notes || '', req.user.id]
      );
      const adjustmentId = adjRes.lastInsertRowid;

      for (const item of items) {
        if (!item.product_id || item.physical_quantity === undefined || item.physical_quantity < 0) {
          throw new Error('Each item must have a valid product_id and non-negative physical_quantity.');
        }

        // Retrieve current system quantity for this product & location directly from database
        const stockRow = queryOne(
          'SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?',
          [item.product_id, location_id]
        );
        const systemQuantity = stockRow ? stockRow.quantity : 0;
        const physicalQuantity = parseInt(item.physical_quantity);
        const difference = physicalQuantity - systemQuantity;

        runSql(
          `INSERT INTO adjustment_items 
            (adjustment_id, product_id, system_quantity, physical_quantity, difference, reason)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            adjustmentId,
            item.product_id,
            systemQuantity,
            physicalQuantity,
            difference,
            item.reason || 'Physical Count Audit'
          ]
        );
      }

      return adjustmentId;
    });

    const newAdjustment = queryOne('SELECT * FROM inventory_adjustments WHERE id = ?', [result]);

    return res.status(201).json({
      success: true,
      message: 'Inventory adjustment draft created successfully',
      data: newAdjustment
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

async function confirmAdjustment(req, res) {
  const { id } = req.params;

  const adjustment = queryOne('SELECT * FROM inventory_adjustments WHERE id = ?', [id]);
  if (!adjustment) {
    return res.status(404).json({ success: false, message: 'Adjustment not found.' });
  }

  if (adjustment.status === 'CONFIRMED') {
    return res.status(400).json({ success: false, message: 'This inventory adjustment has already been confirmed.' });
  }

  const items = queryAll('SELECT * FROM adjustment_items WHERE adjustment_id = ?', [id]);
  if (items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cannot confirm an adjustment with no items.' });
  }

  try {
    transaction(() => {
      for (const item of items) {
        // 1. Get current stock
        const stockRow = queryOne(
          'SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?',
          [item.product_id, adjustment.location_id]
        );
        const systemBefore = stockRow ? stockRow.quantity : 0;
        const systemAfter = item.physical_quantity;
        const difference = systemAfter - systemBefore;

        // 2. Update stock table to reflect physical count exactly
        if (stockRow) {
          runSql(
            'UPDATE stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND location_id = ?',
            [systemAfter, item.product_id, adjustment.location_id]
          );
        } else {
          runSql(
            'INSERT INTO stock (product_id, location_id, quantity) VALUES (?, ?, ?)',
            [item.product_id, adjustment.location_id, systemAfter]
          );
        }

        // 3. Insert Stock Ledger entry
        runSql(
          `INSERT INTO stock_ledger 
            (product_id, location_id, transaction_type, reference_no, quantity_change, quantity_before, quantity_after, notes, created_by)
           VALUES (?, ?, 'ADJUSTMENT', ?, ?, ?, ?, ?, ?)`,
          [
            item.product_id,
            adjustment.location_id,
            adjustment.reference_no,
            difference,
            systemBefore,
            systemAfter,
            `Adjustment: ${item.reason} (Sys: ${systemBefore} → Physical: ${systemAfter})`,
            req.user.id
          ]
        );
      }

      // 4. Mark adjustment as CONFIRMED
      runSql(
        `UPDATE inventory_adjustments SET status = 'CONFIRMED', confirmed_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id]
      );
    });

    const updatedAdjustment = queryOne('SELECT * FROM inventory_adjustments WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: 'Inventory adjustment confirmed successfully! System stock reconciled with physical count and ledger updated.',
      data: updatedAdjustment
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getAdjustments,
  getAdjustmentById,
  createAdjustment,
  confirmAdjustment
};
