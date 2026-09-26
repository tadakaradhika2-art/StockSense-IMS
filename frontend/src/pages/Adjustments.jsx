import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { SlidersHorizontal, Plus, CheckCircle2, Eye, ShieldAlert, Building2 } from 'lucide-react';

export default function Adjustments() {
  const [adjustments, setAdjustments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [targetLocationId, setTargetLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [adjustmentItems, setAdjustmentItems] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adjRes, locRes, prodRes, stkRes] = await Promise.all([
        api.get('/adjustments'),
        api.get('/stock/locations'),
        api.get('/products'),
        api.get('/stock/stock')
      ]);
      if (adjRes.data.success) setAdjustments(adjRes.data.data);
      if (locRes.data.success) setLocations(locRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (stkRes.data.success) setStockList(stkRes.data.data);
    } catch (err) {
      console.error('Failed to fetch adjustments data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelectChange = (locId) => {
    setTargetLocationId(locId);
    if (!locId) {
      setAdjustmentItems([]);
      return;
    }

    // Auto populate products and their current system quantities in target location
    const items = products.map(p => {
      const stk = stockList.find(s => s.product_id === p.id && s.location_id === parseInt(locId));
      const sysQty = stk ? stk.quantity : 0;
      return {
        product_id: p.id,
        product_sku: p.sku,
        product_name: p.name,
        product_unit: p.unit,
        system_quantity: sysQty,
        physical_quantity: sysQty,
        reason: 'Physical Count Audit'
      };
    });

    setAdjustmentItems(items);
  };

  const handlePhysicalQtyChange = (idx, newPhysQty) => {
    const updated = [...adjustmentItems];
    updated[idx].physical_quantity = newPhysQty === '' ? '' : parseInt(newPhysQty);
    setAdjustmentItems(updated);
  };

  const handleReasonChange = (idx, newReason) => {
    const updated = [...adjustmentItems];
    updated[idx].reason = newReason;
    setAdjustmentItems(updated);
  };

  const handleCreateAdjustment = async (e) => {
    e.preventDefault();
    if (!targetLocationId) return alert('Select target warehouse location');

    // Filter only items where physical quantity was actually modified or user explicitly adjusted
    const itemsToSubmit = adjustmentItems.filter(
      item => item.physical_quantity !== '' && item.physical_quantity !== item.system_quantity
    );

    if (itemsToSubmit.length === 0) {
      return alert('No difference detected! Change physical count for at least one item to record an adjustment.');
    }

    setSubmitting(true);
    try {
      const res = await api.post('/adjustments', {
        location_id: targetLocationId,
        notes,
        items: itemsToSubmit
      });

      if (res.data.success) {
        setIsCreateOpen(false);
        setNotes('');
        setAdjustmentItems([]);
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create adjustment draft');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewAdjustment = async (id) => {
    try {
      const res = await api.get(`/adjustments/${id}`);
      if (res.data.success) {
        setSelectedAdjustment(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (err) {
      alert('Failed to view adjustment details');
    }
  };

  const handleConfirmAdjustment = async (id) => {
    if (!window.confirm('Confirm this physical count reconciliation? Recorded system stock will be overwritten to match physical count exactly, and Stock Ledger entries will be created.')) return;
    try {
      setSubmitting(true);
      const res = await api.post(`/adjustments/${id}/confirm`);
      if (res.data.success) {
        alert('Inventory adjustment confirmed! Recorded stock reconciled with physical count.');
        setIsDetailOpen(false);
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Confirmation failed');
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
            <SlidersHorizontal className="w-7 h-7 text-amber-400" />
            Inventory Adjustments
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Reconcile recorded system stock with physical warehouse audit counts
          </p>
        </div>

        <button
          onClick={() => {
            if (locations.length > 0) {
              handleLocationSelectChange(locations[0].id);
            }
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-lg shadow-amber-600/30 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Physical Audit / Adjustment
        </button>
      </div>

      {/* Concept Explanation Card */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <span className="font-bold text-amber-300">Core Reconciliation Rule:</span> StockSense maintains recorded system stock. When staff performs physical counting, entering the physical count calculates <span className="font-mono text-amber-300">Difference = Physical Count - System Stock</span>. Confirming the adjustment updates system stock to match physical reality and logs the ledger entry.
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="rounded-2xl glass-panel border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Reference No</th>
                <th className="py-3.5 px-4">Warehouse Location</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Reconciled Items</th>
                <th className="py-3.5 px-4">Audit Created By</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-slate-200">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-8 text-slate-500">Loading inventory adjustments...</td></tr>
              ) : adjustments.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-8 text-slate-500">No inventory adjustments found. Click 'New Physical Audit' to begin.</td></tr>
              ) : adjustments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-white">{a.reference_no}</td>
                  <td className="py-3.5 px-4 font-semibold text-amber-300">{a.location_code} ({a.location_name})</td>
                  <td className="py-3.5 px-4"><StatusBadge status={a.status} /></td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold">{a.item_count}</td>
                  <td className="py-3.5 px-4 text-slate-400">{a.created_by_name}</td>
                  <td className="py-3.5 px-4 text-slate-400 font-sans">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleViewAdjustment(a.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View & Confirm
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Adjustment Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Physical Inventory Audit & Adjustment (Draft)"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleCreateAdjustment} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Audit Warehouse Location</label>
              <select
                required
                value={targetLocationId}
                onChange={(e) => handleLocationSelectChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl text-xs text-white py-2 px-3"
              >
                <option value="">Select Warehouse...</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.code} - {l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Audit Notes / Reason</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Quarterly physical count..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          {/* Reconciliation Table */}
          {targetLocationId && (
            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Physical Count Entry Table ({adjustmentItems.length} Products)
              </label>

              <div className="rounded-xl border border-slate-800 overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 text-right">Recorded System Stock</th>
                      <th className="py-2.5 px-3 text-right">Physical Count</th>
                      <th className="py-2.5 px-3 text-right">Calculated Diff</th>
                      <th className="py-2.5 px-3">Reason for Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-sans">
                    {adjustmentItems.map((item, idx) => {
                      const diff = item.physical_quantity !== '' ? item.physical_quantity - item.system_quantity : 0;
                      const hasDiff = diff !== 0;

                      return (
                        <tr key={item.product_id} className={hasDiff ? 'bg-amber-500/10' : 'hover:bg-slate-800/40'}>
                          <td className="py-2 px-3 font-mono font-bold text-indigo-400">{item.product_sku}</td>
                          <td className="py-2 px-3 font-medium text-white">{item.product_name}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-300">{item.system_quantity}</td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.physical_quantity}
                              onChange={(e) => handlePhysicalQtyChange(idx, e.target.value)}
                              className="w-20 bg-slate-900 border border-slate-700 rounded-lg text-xs py-1 px-2 text-right font-mono text-white focus:border-amber-500"
                            />
                          </td>
                          <td className={`py-2 px-3 text-right font-mono font-bold ${
                            diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-slate-500'
                          }`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={item.reason}
                              onChange={(e) => handleReasonChange(idx, e.target.value)}
                              className="bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-slate-300 py-1 px-2"
                            >
                              <option value="Physical Count Audit">Physical Count Audit</option>
                              <option value="Damaged Stock">Damaged Stock</option>
                              <option value="Lost / Missing">Lost / Missing</option>
                              <option value="Found Unrecorded">Found Unrecorded</option>
                              <option value="Expired">Expired</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/30"
            >
              {submitting ? 'Creating...' : 'Save Adjustment Draft'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View & Confirm Adjustment Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedAdjustment ? `Adjustment ${selectedAdjustment.reference_no}` : 'Adjustment Details'}
        maxWidth="max-w-3xl"
      >
        {selectedAdjustment && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400">Warehouse Location: <span className="text-white font-bold">{selectedAdjustment.location_name} ({selectedAdjustment.location_code})</span></p>
                <p className="text-xs text-slate-400 mt-1">Audit Conducted By: <span className="text-slate-200">{selectedAdjustment.created_by_name}</span> on {new Date(selectedAdjustment.created_at).toLocaleString()}</p>
                {selectedAdjustment.notes && <p className="text-xs text-slate-400 mt-1 italic">"{selectedAdjustment.notes}"</p>}
              </div>
              <div className="text-right space-y-1">
                <StatusBadge status={selectedAdjustment.status} />
                {selectedAdjustment.confirmed_at && (
                  <p className="text-[10px] text-amber-400 font-mono">Confirmed: {new Date(selectedAdjustment.confirmed_at).toLocaleString()}</p>
                )}
              </div>
            </div>

            {/* Reconciliation Difference List */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Reconciliation Breakdown</h4>
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">SKU</th>
                      <th className="py-2.5 px-4">Product Name</th>
                      <th className="py-2.5 px-4 text-right">Recorded System</th>
                      <th className="py-2.5 px-4 text-right">Physical Count</th>
                      <th className="py-2.5 px-4 text-right">Difference</th>
                      <th className="py-2.5 px-4">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedAdjustment.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-4 font-mono font-bold text-indigo-400">{item.product_sku}</td>
                        <td className="py-2.5 px-4 font-medium text-white">{item.product_name}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-400">{item.system_quantity}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-white">{item.physical_quantity}</td>
                        <td className={`py-2.5 px-4 text-right font-mono font-bold ${
                          item.difference > 0 ? 'text-emerald-400' : item.difference < 0 ? 'text-rose-400' : 'text-slate-500'
                        }`}>
                          {item.difference > 0 ? `+${item.difference}` : item.difference}
                        </td>
                        <td className="py-2.5 px-4 text-slate-300 font-medium">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>

              {selectedAdjustment.status === 'DRAFT' && isAdmin && (
                <button
                  type="button"
                  onClick={() => handleConfirmAdjustment(selectedAdjustment.id)}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? 'Confirming...' : 'Confirm & Reconcile System Stock'}
                </button>
              )}

              {selectedAdjustment.status === 'DRAFT' && !isAdmin && (
                <span className="text-xs text-amber-400/80 italic font-medium">
                  * Restricted: Only Admin users can confirm inventory adjustments.
                </span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
