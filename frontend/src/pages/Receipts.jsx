import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { ArrowDownLeft, Plus, CheckCircle2, Eye, Trash2, Building2, Package } from 'lucide-react';

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Receipt Form
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { product_id: '', location_id: '', quantity: 1, unit_price: 0 }
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recRes, prodRes, locRes] = await Promise.all([
        api.get('/receipts'),
        api.get('/products'),
        api.get('/stock/locations')
      ]);
      if (recRes.data.success) setReceipts(recRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (locRes.data.success) setLocations(locRes.data.data);
    } catch (err) {
      console.error('Failed to fetch receipts data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItemRow = () => {
    setItems([...items, { product_id: '', location_id: locations[0]?.id || '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItemRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === 'product_id') {
      const prod = products.find(p => p.id === parseInt(value));
      if (prod) updated[index].unit_price = prod.price;
    }

    setItems(updated);
  };

  const handleCreateReceipt = async (e) => {
    e.preventDefault();
    if (items.length === 0) return alert('Add at least one item');
    setSubmitting(true);
    try {
      const res = await api.post('/receipts', { supplier, notes, items });
      if (res.data.success) {
        setIsCreateOpen(false);
        setSupplier('');
        setNotes('');
        setItems([{ product_id: '', location_id: locations[0]?.id || '', quantity: 1, unit_price: 0 }]);
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create receipt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewReceipt = async (id) => {
    try {
      const res = await api.get(`/receipts/${id}`);
      if (res.data.success) {
        setSelectedReceipt(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (err) {
      alert('Failed to view receipt details');
    }
  };

  const handleValidateReceipt = async (id) => {
    if (!window.confirm('Validate this receipt? This will permanently update recorded stock levels and create Stock Ledger entries.')) return;
    try {
      setSubmitting(true);
      const res = await api.post(`/receipts/${id}/validate`);
      if (res.data.success) {
        alert('Receipt validated! Stock levels updated and ledger records created.');
        setIsDetailOpen(false);
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Validation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ArrowDownLeft className="w-7 h-7 text-emerald-400" />
            Stock Receipts (Incoming)
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Record incoming goods from suppliers and validate stock intakes into warehouse locations
          </p>
        </div>

        <button
          onClick={() => {
            if (locations.length > 0) {
              setItems([{ product_id: products[0]?.id || '', location_id: locations[0]?.id || '', quantity: 1, unit_price: products[0]?.price || 0 }]);
            }
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Stock Receipt
        </button>
      </div>

      {/* Receipts Table */}
      <div className="rounded-2xl glass-panel border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Reference No</th>
                <th className="py-3.5 px-4">Supplier Name</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Items Count</th>
                <th className="py-3.5 px-4 text-right">Total Value</th>
                <th className="py-3.5 px-4">Created By</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-slate-200">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-8 text-slate-500">Loading receipts...</td></tr>
              ) : receipts.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-8 text-slate-500">No stock receipts found. Click 'Create Stock Receipt' to start.</td></tr>
              ) : receipts.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-white">{r.reference_no}</td>
                  <td className="py-3.5 px-4 font-semibold text-indigo-300">{r.supplier}</td>
                  <td className="py-3.5 px-4"><StatusBadge status={r.status} /></td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold">{r.item_count}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-400">${Number(r.total_value).toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-slate-400">{r.created_by_name}</td>
                  <td className="py-3.5 px-4 text-slate-400 font-sans">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleViewReceipt(r.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View & Process
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Receipt Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Incoming Stock Receipt (Draft)"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateReceipt} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Supplier Name</label>
              <input
                type="text"
                required
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Acme Global Distributors"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Notes / PO Reference</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Purchase Order #, Shipment tracking..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Receipt Line Items</label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product Row
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <label className="block text-[10px] text-slate-500">Product</label>
                    <select
                      required
                      value={item.product_id}
                      onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg text-xs text-white py-1.5 px-2"
                    >
                      <option value="">Select Product...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <label className="block text-[10px] text-slate-500">Intake Warehouse</label>
                    <select
                      required
                      value={item.location_id}
                      onChange={(e) => handleItemChange(idx, 'location_id', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg text-xs text-white py-1.5 px-2"
                    >
                      {locations.map(l => (
                        <option key={l.id} value={l.id}>{l.code} ({l.name})</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg text-xs text-white py-1.5 px-2 font-mono"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500">Unit Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg text-xs text-white py-1.5 px-2 font-mono"
                    />
                  </div>

                  <div className="col-span-1 text-center pt-3">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30"
            >
              {submitting ? 'Creating...' : 'Save Draft Receipt'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View & Validate Receipt Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedReceipt ? `Receipt ${selectedReceipt.reference_no}` : 'Receipt Details'}
        maxWidth="max-w-3xl"
      >
        {selectedReceipt && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400">Supplier: <span className="text-white font-bold">{selectedReceipt.supplier}</span></p>
                <p className="text-xs text-slate-400 mt-1">Created By: <span className="text-slate-200">{selectedReceipt.created_by_name}</span> on {new Date(selectedReceipt.created_at).toLocaleString()}</p>
                {selectedReceipt.notes && <p className="text-xs text-slate-400 mt-1 italic">"{selectedReceipt.notes}"</p>}
              </div>
              <div className="text-right space-y-1">
                <StatusBadge status={selectedReceipt.status} />
                {selectedReceipt.validated_at && (
                  <p className="text-[10px] text-emerald-400 font-mono">Validated: {new Date(selectedReceipt.validated_at).toLocaleString()}</p>
                )}
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Receipt Products List</h4>
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Product SKU</th>
                      <th className="py-2.5 px-4">Name</th>
                      <th className="py-2.5 px-4">Target Warehouse</th>
                      <th className="py-2.5 px-4 text-right">Intake Qty</th>
                      <th className="py-2.5 px-4 text-right">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedReceipt.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-4 font-mono font-bold text-indigo-400">{item.product_sku}</td>
                        <td className="py-2.5 px-4 font-medium text-white">{item.product_name}</td>
                        <td className="py-2.5 px-4 text-slate-300">{item.location_name} ({item.location_code})</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">+{item.quantity} {item.product_unit}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-300">${Number(item.unit_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>

              {selectedReceipt.status === 'DRAFT' && (
                <button
                  type="button"
                  onClick={() => handleValidateReceipt(selectedReceipt.id)}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? 'Validating...' : 'Validate & Commit to Stock Ledger'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
