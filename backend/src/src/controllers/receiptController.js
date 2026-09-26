const { queryAll, queryOne, runSql, transaction } = require('../config/database');

async function getReceipts(req, res) {
  const receipts = queryAll(`
    SELECT 
      r.*,
      u.name as created_by_name,
      COUNT(ri.id) as item_count,
      COALESCE(SUM(ri.quantity * ri.unit_price), 0) as total_value
    FROM receipts r
    JOIN users u ON r.created_by = u.id
    LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `);

  return res.json({
    success: true,
    data: receipts
  });
}

async function getReceiptById(req, res) {
  const { id } = req.params;

  const receipt = queryOne(`
    SELECT r.*, u.name as created_by_name
    FROM receipts r
    JOIN users u ON r.created_by = u.id
    WHERE r.id = ?
  `, [id]);

  if (!receipt) {
    return res.status(404).json({ success: false, message: 'Receipt not found.' });
  }

  const items = queryAll(`
    SELECT 
      ri.*,
      p.sku as product_sku,
      p.name as product_name,
      p.unit as product_unit,
      l.name as location_name,
      l.code as location_code
    FROM receipt_items ri
    JOIN products p ON ri.product_id = p.id
    JOIN locations l ON ri.location_id = l.id
    WHERE ri.receipt_id = ?
  `, [id]);

  return res.json({
    success: true,
    data: {
      ...receipt,
      items
    }
  });
}

async function createReceipt(req, res) {
  const { supplier, notes, items } = req.body;

  if (!supplier || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Supplier and at least one item are required.' });
  }

  // Generate unique reference number: REC-YYYYMMDD-XXXX
  const timestamp = new Date().toISOString().slice(0,10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const referenceNo = `REC-${timestamp}-${randomSuffix}`;

  try {
    const result = transaction(() => {
      const recRes = runSql(
        `INSERT INTO receipts (reference_no, supplier, status, notes, created_by)
         VALUES (?, ?, 'DRAFT', ?, ?)`,
        [referenceNo, supplier.trim(), notes || '', req.user.id]
      );
      const receiptId = recRes.lastInsertRowid;

      for (const item of items) {
        if (!item.product_id || !item.location_id || !item.quantity || item.quantity <= 0) {
          throw new Error('Each item must have a valid product, location, and quantity > 0.');
        }
        runSql(
          `INSERT INTO receipt_items (receipt_id, product_id, location_id, quantity, unit_price)
           VALUES (?, ?, ?, ?, ?)`,
          [receiptId, item.product_id, item.location_id, parseInt(item.quantity), parseFloat(item.unit_price) || 0.0]
        );
      }

      return receiptId;
    });

    const newReceipt = queryOne('SELECT * FROM receipts WHERE id = ?', [result]);

    return res.status(201).json({
      success: true,
      message: 'Receipt draft created successfully',
      data: newReceipt
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

async function validateReceipt(req, res) {
  const { id } = req.params;

  const receipt = queryOne('SELECT * FROM receipts WHERE id = ?', [id]);
  if (!receipt) {
    return res.status(404).json({ success: false, message: 'Receipt not found.' });
  }

  if (receipt.status === 'VALIDATED') {
    return res.status(400).json({ success: false, message: 'This receipt has already been validated.' });
  }

  const items = queryAll('SELECT * FROM receipt_items WHERE receipt_id = ?', [id]);
  if (items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cannot validate a receipt with no items.' });
  }

  try {
    transaction(() => {
      for (const item of items) {
        // 1. Get current stock
        const currentStockRow = queryOne(
          'SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?',
          [item.product_id, item.location_id]
        );

        const qtyBefore = currentStockRow ? currentStockRow.quantity : 0;
        const qtyAfter = qtyBefore + item.quantity;

        // 2. Update stock table
        if (currentStockRow) {
          runSql(
            'UPDATE stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND location_id = ?',
            [qtyAfter, item.product_id, item.location_id]
          );
        } else {
          runSql(
            'INSERT INTO stock (product_id, location_id, quantity) VALUES (?, ?, ?)',
            [item.product_id, item.location_id, qtyAfter]
          );
        }

        // 3. Create Stock Ledger entry
        runSql(
          `INSERT INTO stock_ledger 
            (product_id, location_id, transaction_type, reference_no, quantity_change, quantity_before, quantity_after, notes, created_by)
           VALUES (?, ?, 'RECEIPT', ?, ?, ?, ?, ?, ?)`,
          [
            item.product_id,
            item.location_id,
            receipt.reference_no,
            item.quantity,
            qtyBefore,
            qtyAfter,
            `Receipt intake from ${receipt.supplier}`,
            req.user.id
          ]
        );
      }

      // 4. Mark receipt as VALIDATED
      runSql(
        `UPDATE receipts SET status = 'VALIDATED', validated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id]
      );
    });

    const updatedReceipt = queryOne('SELECT * FROM receipts WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: 'Receipt validated successfully! Stock updated and ledger entries created.',
      data: updatedReceipt
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Validation failed: ${err.message}` });
  }
}

module.exports = {
  getReceipts,
  getReceiptById,
  createReceipt,
  validateReceipt
};
