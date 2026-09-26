import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import { ScrollText, Search, Download, Printer, Filter, RefreshCw } from 'lucide-react';

export default function Ledger() {
  const [ledger, setLedger] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [transactionType, setTransactionType] = useState('');

  useEffect(() => {
    fetchData();
  }, [search, productId, locationId, transactionType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (productId) params.productId = productId;
      if (locationId) params.locationId = locationId;
      if (transactionType) params.transactionType = transactionType;

      const [ledRes, prodRes, locRes] = await Promise.all([
        api.get('/ledger', { params }),
        api.get('/products'),
        api.get('/stock/locations')
      ]);

      if (ledRes.data.success) setLedger(ledRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (locRes.data.success) setLocations(locRes.data.data);
    } catch (err) {
      console.error('Failed to fetch ledger data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (ledger.length === 0) return alert('No ledger records to export');
    
    const headers = ['ID', 'Date Time', 'Reference No', 'Type', 'SKU', 'Product Name', 'Location Code', 'Location Name', 'Qty Change', 'Before', 'After', 'User', 'Notes'];
    const rows = ledger.map(l => [
      l.id,
      `"${new Date(l.created_at).toLocaleString()}"`,
      `"${l.reference_no}"`,
      `"${l.transaction_type}"`,
      `"${l.product_sku}"`,
      `"${l.product_name}"`,
      `"${l.location_code}"`,
      `"${l.location_name}"`,
      l.quantity_change,
      l.quantity_before,
      l.quantity_after,
      `"${l.user_name}"`,
      `"${l.notes || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StockSense_Ledger_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ScrollText className="w-7 h-7 text-indigo-400" />
            Stock Ledger & Audit Trail
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Permanent complete movement history of all stock receipts, deliveries, transfers, and adjustments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-all"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-all"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            Print Report
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search ref #, SKU, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Transaction Type Filter */}
        <select
          value={transactionType}
          onChange={(e) => setTransactionType(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Operation Types</option>
          <option value="RECEIPT">Stock Receipts (Incoming)</option>
          <option value="DELIVERY">Delivery Orders (Outgoing)</option>
          <option value="TRANSFER_IN">Transfer In</option>
          <option value="TRANSFER_OUT">Transfer Out</option>
          <option value="ADJUSTMENT">Inventory Adjustment</option>
        </select>

        {/* Product Filter */}
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Products</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
          ))}
        </select>

        {/* Location Filter */}
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Warehouse Locations</option>
          {locations.map(l => (
            <option key={l.id} value={l.id}>{l.code} - {l.name}</option>
          ))}
        </select>
      </div>

      {/* Ledger Records Table */}
      <div className="rounded-2xl glass-panel border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Reference No</th>
                <th className="py-3.5 px-4">Operation Type</th>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4 text-right">Quantity Change</th>
                <th className="py-3.5 px-4 text-right">Stock (Before → After)</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Notes / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-slate-200">
              {loading ? (
                <tr><td colSpan="9" className="text-center py-8 text-slate-500">Loading stock ledger records...</td></tr>
              ) : ledger.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-8 text-slate-500">No stock ledger records found matching criteria.</td></tr>
              ) : ledger.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 text-slate-400 font-sans whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-white">{l.reference_no}</td>
                  <td className="py-3.5 px-4"><StatusBadge status={l.transaction_type} /></td>
                  <td className="py-3.5 px-4 font-semibold text-slate-200">
                    {l.product_name} <span className="font-mono text-indigo-400 text-[11px]">({l.product_sku})</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-medium">
                    {l.location_name} <span className="font-mono text-slate-500 text-[10px]">({l.location_code})</span>
                  </td>
                  <td className={`py-3.5 px-4 text-right font-mono font-bold ${
                    l.quantity_change > 0 ? 'text-emerald-400' : l.quantity_change < 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {l.quantity_change > 0 ? `+${l.quantity_change}` : l.quantity_change}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                    {l.quantity_before} → <span className="text-white font-bold">{l.quantity_after}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-medium">{l.user_name}</td>
                  <td className="py-3.5 px-4 text-slate-400 text-[11px] max-w-xs truncate">{l.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
