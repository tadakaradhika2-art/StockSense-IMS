const { queryAll, queryOne, runSql, transaction } = require('../config/database');

async function getTransfers(req, res) {
  const transfers = queryAll(`
    SELECT 
      t.*,
      l_src.name as source_location_name,
      l_src.code as source_location_code,
      l_dst.name as destination_location_name,
      l_dst.code as destination_location_code,
      u.name as created_by_name,
      COUNT(ti.id) as item_count
    FROM internal_transfers t
    JOIN locations l_src ON t.source_location_id = l_src.id
    JOIN locations l_dst ON t.destination_location_id = l_dst.id
    JOIN users u ON t.created_by = u.id
    LEFT JOIN transfer_items ti ON t.id = ti.transfer_id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `);

  return res.json({
    success: true,
    data: transfers
  });
}

async function getTransferById(req, res) {
  const { id } = req.params;

  const transfer = queryOne(`
    SELECT 
      t.*,
      l_src.name as source_location_name,
      l_src.code as source_location_code,
      l_dst.name as destination_location_name,
      l_dst.code as destination_location_code,
      u.name as created_by_name
    FROM internal_transfers t
    JOIN locations l_src ON t.source_location_id = l_src.id
    JOIN locations l_dst ON t.destination_location_id = l_dst.id
    JOIN users u ON t.created_by = u.id
    WHERE t.id = ?
  `, [id]);

  if (!transfer) {
    return res.status(404).json({ success: false, message: 'Transfer not found.' });
  }

  const items = queryAll(`
    SELECT 
      ti.*,
      p.sku as product_sku,
      p.name as product_name,
      p.unit as product_unit,
      COALESCE(s.quantity, 0) as source_available_stock
    FROM transfer_items ti
    JOIN products p ON ti.product_id = p.id
    LEFT JOIN stock s ON ti.product_id = s.product_id AND s.location_id = ?
    WHERE ti.transfer_id = ?
  `, [transfer.source_location_id, id]);

  return res.json({
    success: true,
    data: {
      ...transfer,
      items
    }
  });
}

async function createTransfer(req, res) {
  const { source_location_id, destination_location_id, notes, items } = req.body;

  if (!source_location_id || !destination_location_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Source location, destination location, and at least one item are required.' });
  }

  if (parseInt(source_location_id) === parseInt(destination_location_id)) {
    return res.status(400).json({ success: false, message: 'Source and destination locations must be different.' });
  }

  const timestamp = new Date().toISOString().slice(0,10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const referenceNo = `TRF-${timestamp}-${randomSuffix}`;

  try {
    const result = transaction(() => {
      const trfRes = runSql(
        `INSERT INTO internal_transfers (reference_no, source_location_id, destination_location_id, status, notes, created_by)
         VALUES (?, ?, ?, 'DRAFT', ?, ?)`,
        [referenceNo, source_location_id, destination_location_id, notes || '', req.user.id]
      );
      const transferId = trfRes.lastInsertRowid;

      for (const item of items) {
        if (!item.product_id || !item.quantity || item.quantity <= 0) {
          throw new Error('Each transfer item must have a valid product and quantity > 0.');
        }

        runSql(
          `INSERT INTO transfer_items (transfer_id, product_id, quantity)
           VALUES (?, ?, ?)`,
          [transferId, item.product_id, parseInt(item.quantity)]
        );
      }

      return transferId;
    });

    const newTransfer = queryOne('SELECT * FROM internal_transfers WHERE id = ?', [result]);

    return res.status(201).json({
      success: true,
      message: 'Internal transfer draft created successfully',
      data: newTransfer
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

async function validateTransfer(req, res) {
  const { id } = req.params;

  const transfer = queryOne('SELECT * FROM internal_transfers WHERE id = ?', [id]);
  if (!transfer) {
    return res.status(404).json({ success: false, message: 'Transfer not found.' });
  }

  if (transfer.status === 'VALIDATED') {
    return res.status(400).json({ success: false, message: 'This transfer has already been validated.' });
  }

  const items = queryAll('SELECT * FROM transfer_items WHERE transfer_id = ?', [id]);
  if (items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cannot validate a transfer with no items.' });
  }

  try {
    transaction(() => {
      // 1. Verify stock availability at source location
      for (const item of items) {
        const srcStockRow = queryOne(
          'SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?',
          [item.product_id, transfer.source_location_id]
        );
        const avail = srcStockRow ? srcStockRow.quantity : 0;
        if (avail < item.quantity) {
          const prod = queryOne('SELECT name FROM products WHERE id = ?', [item.product_id]);
          const srcLoc = queryOne('SELECT name FROM locations WHERE id = ?', [transfer.source_location_id]);
          throw new Error(
            `Transfer validation failed: Insufficient stock for '${prod ? prod.name : item.product_id}' at '${srcLoc ? srcLoc.name : transfer.source_location_id}'. Available: ${avail}, Requested: ${item.quantity}.`
          );
        }
      }

      // 2. Execute stock moves & ledger entries
      const srcLoc = queryOne('SELECT code FROM locations WHERE id = ?', [transfer.source_location_id]);
      const dstLoc = queryOne('SELECT code FROM locations WHERE id = ?', [transfer.destination_location_id]);

      for (const item of items) {
        // A. Source Location: Deduct
        const srcStockRow = queryOne(
          'SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?',
          [item.product_id, transfer.source_location_id]
        );
        const srcBefore = srcStockRow.quantity;
        const srcAfter = srcBefore - item.quantity;

        runSql(
          'UPDATE stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND location_id = ?',
          [srcAfter, item.product_id, transfer.source_location_id]
        );

        runSql(
          `INSERT INTO stock_ledger 
            (product_id, location_id, transaction_type, reference_no, quantity_change, quantity_before, quantity_after, notes, created_by)
           VALUES (?, ?, 'TRANSFER_OUT', ?, ?, ?, ?, ?, ?)`,
          [
            item.product_id,
            transfer.source_location_id,
            transfer.reference_no,
            -item.quantity,
            srcBefore,
            srcAfter,
            `Transferred to ${dstLoc ? dstLoc.code : transfer.destination_location_id}`,
            req.user.id
          ]
        );

        // B. Destination Location: Add
        const dstStockRow = queryOne(
          'SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?',
          [item.product_id, transfer.destination_location_id]
        );
        const dstBefore = dstStockRow ? dstStockRow.quantity : 0;
        const dstAfter = dstBefore + item.quantity;

        if (dstStockRow) {
          runSql(
            'UPDATE stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND location_id = ?',
            [dstAfter, item.product_id, transfer.destination_location_id]
          );
        } else {
          runSql(
            'INSERT INTO stock (product_id, location_id, quantity) VALUES (?, ?, ?)',
            [item.product_id, transfer.destination_location_id, dstAfter]
          );
        }

        runSql(
          `INSERT INTO stock_ledger 
            (product_id, location_id, transaction_type, reference_no, quantity_change, quantity_before, quantity_after, notes, created_by)
           VALUES (?, ?, 'TRANSFER_IN', ?, ?, ?, ?, ?, ?)`,
          [
            item.product_id,
            transfer.destination_location_id,
            transfer.reference_no,
            item.quantity,
            dstBefore,
            dstAfter,
            `Transferred from ${srcLoc ? srcLoc.code : transfer.source_location_id}`,
            req.user.id
          ]
        );
      }

      // 3. Mark transfer as VALIDATED
      runSql(
        `UPDATE internal_transfers SET status = 'VALIDATED', validated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id]
      );
    });

    const updatedTransfer = queryOne('SELECT * FROM internal_transfers WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: 'Internal transfer validated successfully! Stock moved between locations and ledger updated.',
      data: updatedTransfer
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

module.exports = {
  getTransfers,
  getTransferById,
  createTransfer,
  validateTransfer
};
