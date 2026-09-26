const bcrypt = require('bcryptjs');
const { initDatabase, runSql, queryOne, queryAll, transaction } = require('../config/database');

async function seed() {
  console.log('🌱 Starting StockSense database seeding...');
  await initDatabase();

  const userCount = queryOne('SELECT COUNT(*) as count FROM users');
  if (userCount && userCount.count > 0) {
    console.log('⚡ Database already contains data. Skipping initial seed.');
    return;
  }

  // 1. Create Users
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  const staffPasswordHash = bcrypt.hashSync('staff123', 10);

  const adminRes = runSql(
    `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
    ['Radhika Admin', 'admin@stocksense.com', adminPasswordHash, 'ADMIN']
  );
  const adminId = adminRes.lastInsertRowid;

  const staffRes = runSql(
    `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
    ['Sarika Staff', 'staff@stocksense.com', staffPasswordHash, 'WAREHOUSE_STAFF']
  );
  const staffId = staffRes.lastInsertRowid;

  console.log('✅ Users created: Admin (admin@stocksense.com / admin123), Staff (staff@stocksense.com / staff123)');

  // 2. Create Locations
  const locMainRes = runSql(
    `INSERT INTO locations (name, code, address) VALUES (?, ?, ?)`,
    ['Main Central Warehouse', 'WH-MAIN', 'Building A, 100 Supply Chain Way, Dallas, TX']
  );
  const locMainId = locMainRes.lastInsertRowid;

  const locNorthRes = runSql(
    `INSERT INTO locations (name, code, address) VALUES (?, ?, ?)`,
    ['North Logistics Hub', 'WH-NORTH', 'Dock 4, 88 Freight Express Ave, Chicago, IL']
  );
  const locNorthId = locNorthRes.lastInsertRowid;

  const locStoreRes = runSql(
    `INSERT INTO locations (name, code, address) VALUES (?, ?, ?)`,
    ['Storefront Retail Outlet', 'STORE-RETAIL', 'Suite 102, 500 Commerce St, Austin, TX']
  );
  const locStoreId = locStoreRes.lastInsertRowid;

  console.log('✅ Locations created: WH-MAIN, WH-NORTH, STORE-RETAIL');

  // 3. Create Products
  const productsData = [
    { sku: 'PROD-1001', name: 'Dell XPS 15 Laptop', category: 'Electronics', unit: 'Pcs', min_stock: 10, price: 1499.00, desc: 'Core i7, 16GB RAM, 512GB SSD Enterprise Edition', img: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=300' },
    { sku: 'PROD-1002', name: 'Logistics Heavy Pallet', category: 'Equipment', unit: 'Units', min_stock: 25, price: 85.00, desc: 'Reinforced Euro-Standard Industrial Wooden Pallet', img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300' },
    { sku: 'PROD-1003', name: 'Ergonomic Mesh Chair', category: 'Furniture', unit: 'Pcs', min_stock: 15, price: 249.50, desc: 'High-back mesh chair with dynamic lumbar support', img: 'https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?w=300' },
    { sku: 'PROD-1004', name: 'Wireless 2D Scanner', category: 'Hardware', unit: 'Pcs', min_stock: 8, price: 120.00, desc: 'Handheld Bluetooth Barcode & QR Code Reader', img: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=300' },
    { sku: 'PROD-1005', name: 'Thermal Labels 4x6', category: 'Packaging', unit: 'Rolls', min_stock: 50, price: 14.99, desc: 'Direct thermal shipping labels (500 labels per roll)', img: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=300' },
    { sku: 'PROD-1006', name: 'Samsung 34" Monitor', category: 'Electronics', unit: 'Pcs', min_stock: 6, price: 499.99, desc: 'Curved WQHD 144Hz Ultrawide Workspace Monitor', img: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300' },
    { sku: 'PROD-1007', name: 'Heavy Duty Box (Large)', category: 'Packaging', unit: 'Boxes', min_stock: 40, price: 8.50, desc: 'Double-walled corrugated shipping container', img: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300' },
    { sku: 'PROD-1008', name: 'Tape Dispenser Pro', category: 'Supplies', unit: 'Pcs', min_stock: 12, price: 19.99, desc: 'Heavy duty 2-inch packaging tape gun dispenser', img: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=300' }
  ];

  const productIds = {};
  for (const p of productsData) {
    const res = runSql(
      `INSERT INTO products (sku, name, category, unit, min_stock_threshold, price, description, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.sku, p.name, p.category, p.unit, p.min_stock, p.price, p.desc, p.img]
    );
    productIds[p.sku] = res.lastInsertRowid;
  }
  console.log(`✅ ${productsData.length} Products created.`);

  // 4. Initial Stock Setup & Ledger Seed
  const initialStockData = [
    { sku: 'PROD-1001', locId: locMainId, qty: 45 },
    { sku: 'PROD-1001', locId: locNorthId, qty: 8 }, // LOW STOCK (min 10)
    { sku: 'PROD-1002', locId: locMainId, qty: 120 },
    { sku: 'PROD-1002', locId: locNorthId, qty: 60 },
    { sku: 'PROD-1003', locId: locMainId, qty: 18 },
    { sku: 'PROD-1003', locId: locStoreId, qty: 4 }, // LOW STOCK (min 15)
    { sku: 'PROD-1004', locId: locMainId, qty: 14 },
    { sku: 'PROD-1004', locId: locNorthId, qty: 3 }, // LOW STOCK (min 8)
    { sku: 'PROD-1005', locId: locMainId, qty: 200 },
    { sku: 'PROD-1005', locId: locNorthId, qty: 25 }, // LOW STOCK (min 50)
    { sku: 'PROD-1006', locId: locMainId, qty: 15 },
    { sku: 'PROD-1006', locId: locStoreId, qty: 2 }, // LOW STOCK (min 6)
    { sku: 'PROD-1007', locId: locMainId, qty: 150 },
    { sku: 'PROD-1008', locId: locMainId, qty: 30 }
  ];

  for (const item of initialStockData) {
    const pId = productIds[item.sku];
    runSql(`INSERT INTO stock (product_id, location_id, quantity) VALUES (?, ?, ?)`, [pId, item.locId, item.qty]);
    
    // Seed initial ledger record
    runSql(
      `INSERT INTO stock_ledger (product_id, location_id, transaction_type, reference_no, quantity_change, quantity_before, quantity_after, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [pId, item.locId, 'RECEIPT', 'INIT-INTAKE-001', item.qty, 0, item.qty, 'Initial stock intake recorded on setup', adminId]
    );
  }
  console.log('✅ Stock levels and initial ledger records created.');

  // 5. Create Sample Validated Receipt
  const recRes = runSql(
    `INSERT INTO receipts (reference_no, supplier, status, notes, created_by, validated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    ['REC-2026-001', 'TechGlobal Wholesalers Ltd', 'VALIDATED', 'Quarterly bulk hardware batch shipment', adminId]
  );
  runSql(
    `INSERT INTO receipt_items (receipt_id, product_id, location_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)`,
    [recRes.lastInsertRowid, productIds['PROD-1001'], locMainId, 10, 1400.00]
  );

  // 6. Create Sample Validated Delivery
  const delRes = runSql(
    `INSERT INTO delivery_orders (reference_no, customer, status, notes, created_by, validated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    ['DEL-2026-001', 'Acme Logistics Inc', 'VALIDATED', 'Customer purchase order #8849', staffId]
  );
  runSql(
    `INSERT INTO delivery_items (delivery_id, product_id, location_id, quantity) VALUES (?, ?, ?, ?)`,
    [delRes.lastInsertRowid, productIds['PROD-1002'], locMainId, 10]
  );

  // 7. Create Sample Validated Internal Transfer
  const trfRes = runSql(
    `INSERT INTO internal_transfers (reference_no, source_location_id, destination_location_id, status, notes, created_by, validated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    ['TRF-2026-001', locMainId, locStoreId, 'VALIDATED', 'Storefront replenishment from Main Warehouse', staffId]
  );
  runSql(
    `INSERT INTO transfer_items (transfer_id, product_id, quantity) VALUES (?, ?, ?)`,
    [trfRes.lastInsertRowid, productIds['PROD-1003'], 2]
  );

  // 8. Create Sample Confirmed Adjustment
  const adjRes = runSql(
    `INSERT INTO inventory_adjustments (reference_no, location_id, status, notes, created_by, confirmed_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    ['ADJ-2026-001', locStoreId, 'CONFIRMED', 'Physical stock audit reconciliation', adminId]
  );
  runSql(
    `INSERT INTO adjustment_items (adjustment_id, product_id, system_quantity, physical_quantity, difference, reason) VALUES (?, ?, ?, ?, ?, ?)`,
    [adjRes.lastInsertRowid, productIds['PROD-1003'], 6, 4, -2, 'Damaged during transit']
  );

  console.log('🎉 Seeding complete! StockSense database is ready.');
}

if (require.main === module) {
  seed().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
}

module.exports = seed;
