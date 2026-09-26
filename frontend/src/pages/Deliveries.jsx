import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { ArrowUpRight, Plus, CheckCircle2, Eye, Trash2, Box, Truck } from 'lucide-react';

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [customer, setCustomer] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { product_id: '', location_id: '', quantity: 1 }
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [delRes, prodRes, locRes, stkRes] = await Promise.all([
        api.get('/deliveries'),
        api.get('/products'),
        api.get('/stock/locations'),
        api.get('/stock/stock')
      ]);
      if (delRes.data.success) setDeliveries(delRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (locRes.data.success) setLocations(locRes.data.data);
      if (stkRes.data.success) setStockList(stkRes.data.data);
    } catch (err) {
      console.error('Failed to fetch deliveries data', err);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableStock = (productId, locationId) => {
    if (!productId || !locationId) return 0;
    const item = stockList.find(s => s.product_id === parseInt(productId) && s.location_id === parseInt(locationId));
    return item ? item.quantity : 0;
  };

  const handleAddItemRow = () => {
    setItems([...items, { product_id: products[0]?.id || '', location_id: locations[0]?.id || '', quantity: 1 }]);
  };

  const handleRemoveItemRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleCreateDelivery = async (e) => {
    e.preventDefault();
    if (items.length === 0) return alert('Add at least one item');
    
    // Check stock before submission
    for (const item of items) {
      const avail = getAvailableStock(item.product_id, item.location_id);
      if (avail < parseInt(item.quantity)) {
        const prod = products.find(p => p.id === parseInt(item.product_id));
        return alert(`Cannot create delivery: Requested ${item.quantity} units of '${prod ? prod.name : item.product_id}', but only ${avail} available in selected location.`);
      }
    }

    setSubmitting(true);
    try {
      const res = await api.post('/deliveries', { customer, notes, items });
      if (res.data.success) {
        setIsCreateOpen(false);
        setCustomer('');
        setNotes('');
        setItems([{ product_id: '', location_id: locations[0]?.id || '', quantity: 1 }]);
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create delivery order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDelivery = async (id) => {
    try {
      const res = await api.get(`/deliveries/${id}`);
      if (res.data.success) {
        setSelectedDelivery(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (err) {
      alert('Failed to load delivery order details');
    }
  };

  const handleStepAction = async (id, action) => {
    try {
      setSubmitting(true);
      const res = await api.post(`/deliveries/${id}/${action}`);
      if (res.data.success) {
        handleViewDelivery(id);
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Step action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidateDelivery = async (id) => {
    if (!window.confirm('Validate and dispatch this delivery order? Stock will be deducted from warehouse location and recorded in Stock Ledger.')) return;
    try {
      setSubmitting(true);
      const res = await api.post(`/deliveries/${id}/validate`);
      if (res.data.success) {
        alert('Delivery validated! Stock deducted and ledger entries recorded.');
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
            <ArrowUpRight className="w-7 h-7 text-blue-400" />
            Delivery Orders (Outgoing)
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Fulfill customer delivery orders with operational workflow (Pick → Pack → Validate)
          </p>
        </div>

        <button
          onClick={() => {
            if (products.length > 0 && locations.length > 0) {
              setItems([{ product_id: products[0].id, location_id: locations[0].id, quantity: 1 }]);
            }
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Delivery Order
        </button>
      </div>

      {/* Deliveries Table */}
      <div className="rounded-2xl glass-panel border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Reference No</th>
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-4">Workflow Status</th>
                <th className="py-3.5 px-4 text-center">Items</th>
                <th className="py-3.5 px-4">Created By</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-slate-200">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-8 text-slate-500">Loading delivery orders...</td></tr>
              ) : deliveries.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-8 text-slate-500">No delivery orders found. Click 'Create Delivery Order' to start.</td></tr>
              ) : deliveries.map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-white">{d.reference_no}</td>
                  <td className="py-3.5 px-4 font-semibold text-sky-300">{d.customer}</td>
                  <td className="py-3.5 px-4"><StatusBadge status={d.status} /></td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold">{d.item_count}</td>
                  <td className="py-3.5 px-4 text-slate-400">{d.created_by_name}</td>
                  <td className="py-3.5 px-4 text-slate-400 font-sans">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleViewDelivery(d.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Manage Order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Delivery Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Outgoing Delivery Order (Draft)"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateDelivery} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Customer Name / Client</label>
              <input
                type="text"
                required
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="e.g. Acme Corp Logistics"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Shipping Notes / Order Ref</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Shipping instructions..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Order Items & Source Warehouse</label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product Row
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => {
                const avail = getAvailableStock(item.product_id, item.location_id);
                const isInsufficient = avail < parseInt(item.quantity || 0);

                return (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
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

                    <div className="col-span-4">
                      <label className="block text-[10px] text-slate-500">Dispatch Location</label>
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
                      <label className="block text-[10px] text-slate-500">Qty (Avail: {avail})</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className={`w-full bg-slate-900 border rounded-lg text-xs py-1.5 px-2 font-mono ${
                          isInsufficient ? 'border-rose-500 text-rose-400 font-bold' : 'border-slate-700 text-white'
                        }`}
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
                );
              })}
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
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30"
            >
              {submitting ? 'Creating...' : 'Save Delivery Draft'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View & Process Delivery Order Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedDelivery ? `Delivery Order ${selectedDelivery.reference_no}` : 'Delivery Details'}
        maxWidth="max-w-3xl"
      >
        {selectedDelivery && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400">Customer: <span className="text-white font-bold">{selectedDelivery.customer}</span></p>
                <p className="text-xs text-slate-400 mt-1">Created By: <span className="text-slate-200">{selectedDelivery.created_by_name}</span></p>
                {selectedDelivery.notes && <p className="text-xs text-slate-400 mt-1 italic">"{selectedDelivery.notes}"</p>}
              </div>
              <div className="text-right space-y-1">
                <StatusBadge status={selectedDelivery.status} />
                {selectedDelivery.validated_at && (
                  <p className="text-[10px] text-blue-400 font-mono">Dispatched: {new Date(selectedDelivery.validated_at).toLocaleString()}</p>
                )}
              </div>
            </div>

            {/* Workflow Progress Bar */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              {['DRAFT', 'PICKED', 'PACKED', 'VALIDATED'].map((step, idx) => {
                const steps = ['DRAFT', 'PICKED', 'PACKED', 'VALIDATED'];
                const currentIdx = steps.indexOf(selectedDelivery.status);
                const isPassed = idx <= currentIdx;

                return (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      isPassed ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className={`text-xs font-semibold ${isPassed ? 'text-white' : 'text-slate-500'}`}>{step}</span>
                  </div>
                );
              })}
            </div>

            {/* Line Items */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Delivery Line Items</h4>
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">SKU</th>
                      <th className="py-2.5 px-4">Product Name</th>
                      <th className="py-2.5 px-4">Source Warehouse</th>
                      <th className="py-2.5 px-4 text-right">Available Stock</th>
                      <th className="py-2.5 px-4 text-right">Delivery Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedDelivery.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-4 font-mono font-bold text-indigo-400">{item.product_sku}</td>
                        <td className="py-2.5 px-4 font-medium text-white">{item.product_name}</td>
                        <td className="py-2.5 px-4 text-slate-300">{item.location_name} ({item.location_code})</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-400">{item.available_stock} {item.product_unit}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-400">-{item.quantity} {item.product_unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Operational Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>

              {selectedDelivery.status !== 'VALIDATED' && (
                <div className="flex items-center gap-2">
                  {selectedDelivery.status === 'DRAFT' && (
                    <button
                      onClick={() => handleStepAction(selectedDelivery.id, 'pick')}
                      disabled={submitting}
                      className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-all"
                    >
                      Mark as PICKED
                    </button>
                  )}

                  {selectedDelivery.status === 'PICKED' && (
                    <button
                      onClick={() => handleStepAction(selectedDelivery.id, 'pack')}
                      disabled={submitting}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all"
                    >
                      Mark as PACKED
                    </button>
                  )}

                  <button
                    onClick={() => handleValidateDelivery(selectedDelivery.id)}
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Validate & Dispatch Delivery
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
