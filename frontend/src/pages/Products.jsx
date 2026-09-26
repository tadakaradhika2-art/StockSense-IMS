import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { 
  Package, 
  Search, 
  Plus, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Building2, 
  History,
  AlertTriangle,
  X
} from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const { isAdmin } = useAuth();

  // Modal States
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    unit: 'Pcs',
    min_stock_threshold: 10,
    price: 0,
    description: '',
    image_url: ''
  });

  useEffect(() => {
    fetchProducts();
  }, [search, categoryFilter, lowStockFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (lowStockFilter) params.lowStock = 'true';

      const res = await api.get('/products', { params });
      if (res.data.success) {
        setProducts(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      category: '',
      unit: 'Pcs',
      min_stock_threshold: 10,
      price: 0,
      description: '',
      image_url: ''
    });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku,
      name: p.name,
      category: p.category,
      unit: p.unit,
      min_stock_threshold: p.min_stock_threshold,
      price: p.price,
      description: p.description || '',
      image_url: p.image_url || ''
    });
    setIsAddEditOpen(true);
  };

  const handleViewDetails = async (id) => {
    try {
      const res = await api.get(`/products/${id}`);
      if (res.data.success) {
        setSelectedProductDetails(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (err) {
      alert('Failed to load product details');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, formData);
      } else {
        await api.post('/products', formData);
      }
      setIsAddEditOpen(false);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete product '${name}'?`)) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#121E36] tracking-tight">Products Catalog</h1>
          <p className="text-[#727A84] text-xs md:text-sm mt-1">Manage SKUs, unit measures, prices, and low stock thresholds</p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </button>
        )}
      </div>

      {/* Filter & Search Controls */}
      <div className="p-4 rounded-2xl bg-[#FEFEFE] border border-[#B5C1C8] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#727A84]" />
          <input
            type="text"
            placeholder="Search by SKU, product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#E8EBED] border border-[#B5C1C8] rounded-xl text-xs text-[#121E36] placeholder-[#8A929A] focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#E8EBED] border border-[#B5C1C8] text-xs text-[#4A5568] rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Low Stock Toggle Button */}
          <button
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              lowStockFilter
                ? 'bg-rose-50 border-rose-300 text-[#E11D48]'
                : 'bg-[#E8EBED] border-[#B5C1C8] text-[#727A84] hover:text-[#121E36]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock Only
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl bg-[#FEFEFE] border border-[#B5C1C8] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#E8EBED] text-[#727A84] uppercase font-semibold border-b border-[#B5C1C8]">
              <tr>
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Unit</th>
                <th className="py-3.5 px-4 text-right">Min Threshold</th>
                <th className="py-3.5 px-4 text-right">Total Recorded Stock</th>
                <th className="py-3.5 px-4 text-right">Unit Price</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#B5C1C8]/60 font-sans text-[#2D3748]">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-[#8A929A]">Loading products...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-[#8A929A]">No products found matching criteria.</td>
                </tr>
              ) : products.map((p) => (
                <tr key={p.id} className="hover:bg-[#E8EBED]/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#4F46E5]">{p.sku}</td>
                  <td className="py-3.5 px-4 font-semibold text-[#121E36]">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="w-8 h-8 rounded-lg object-cover bg-[#E8EBED] border border-[#B5C1C8]" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-[#E8EBED] border border-[#B5C1C8] flex items-center justify-center text-[#8A929A]">
                          <Package className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <p>{p.name}</p>
                        {p.description && <p className="text-[10px] text-[#727A84] truncate max-w-xs">{p.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-[#E8EBED] text-[#4A5568] font-medium text-[11px]">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#727A84]">{p.unit}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#727A84]">{p.min_stock_threshold}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-lg text-[#121E36]">
                    {p.total_stock}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#059669]">${Number(p.price).toFixed(2)}</td>
                  <td className="py-3.5 px-4"><StatusBadge status={p.status} /></td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleViewDetails(p.id)}
                        className="p-1.5 rounded-lg bg-[#E8EBED] hover:bg-[#D6DCE0] text-[#4A5568] hover:text-[#121E36] transition-colors"
                        title="View Location Breakdown & Ledger"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#E11D48] transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingProduct ? `Edit Product (${editingProduct.sku})` : 'Create New Product'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#727A84] mb-1">SKU Code</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="PROD-2001"
                className="w-full px-3 py-2 bg-[#E8EBED] border border-[#B5C1C8] rounded-xl text-xs text-[#121E36] uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#727A84] mb-1">Category</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Electronics, Hardware, etc."
                className="w-full px-3 py-2 bg-[#E8EBED] border border-[#B5C1C8] rounded-xl text-xs text-[#121E36]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#727A84] mb-1">Product Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Full Product Title"
              className="w-full px-3 py-2 bg-[#E8EBED] border border-[#B5C1C8] rounded-xl text-xs text-[#121E36]"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#727A84] mb-1">Unit</label>
              <input
                type="text"
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="Pcs, Boxes, Rolls"
                className="w-full px-3 py-2 bg-[#E8EBED] border border-[#B5C1C8] rounded-xl text-xs text-[#121E36]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#727A84] mb-1">Min Threshold</label>
              <input
                type="number"
                min="0"
                required
                value={formData.min_stock_threshold}
                onChange={(e) => setFormData({ ...formData, min_stock_threshold: e.target.value })}
                className="w-full px-3 py-2 bg-[#E8EBED] border border-[#B5C1C8] rounded-xl text-xs text-[#121E36] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#727A84] mb-1">Unit Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 bg-[#E8EBED] border border-[#B5C1C8] rounded-xl text-xs text-[#121E36] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#727A84] mb-1">Description</label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional specs or product details..."
              className="w-full px-3 py-2 bg-[#E8EBED] border border-[#B5C1C8] rounded-xl text-xs text-[#121E36]"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#B5C1C8]">
            <button
              type="button"
              onClick={() => setIsAddEditOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#D6DCE0] hover:bg-[#C4CDD3] text-[#4A5568] text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
            >
              {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Product Detail Modal (Stock by location & Ledger history) */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedProductDetails ? `${selectedProductDetails.name} (${selectedProductDetails.sku})` : 'Product Details'}
        maxWidth="max-w-4xl"
      >
        {selectedProductDetails && (
          <div className="space-y-6">
            {/* Overview Banner */}
            <div className="p-4 rounded-xl bg-[#E8EBED] border border-[#B5C1C8] flex items-center justify-between">
              <div>
                <p className="text-xs text-[#727A84] font-mono">Category: <span className="text-[#121E36] font-semibold">{selectedProductDetails.category}</span></p>
                <p className="text-xs text-[#727A84] font-mono mt-1">Min Threshold: <span className="text-[#B45309] font-bold">{selectedProductDetails.min_stock_threshold} {selectedProductDetails.unit}</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#727A84] uppercase font-semibold">Total Stock</p>
                <p className="text-3xl font-black font-mono text-[#4F46E5]">{selectedProductDetails.total_stock} <span className="text-xs font-sans text-[#727A84]">{selectedProductDetails.unit}</span></p>
              </div>
            </div>

            {/* Location Stock Breakdown Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#727A84] mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#4F46E5]" />
                Stock by Location
              </h4>
              <div className="rounded-xl border border-[#B5C1C8] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#E8EBED] text-[#727A84] uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Code</th>
                      <th className="py-2.5 px-4">Warehouse Name</th>
                      <th className="py-2.5 px-4 text-right">Recorded Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#B5C1C8]">
                    {selectedProductDetails.stockByLocation.map((loc) => (
                      <tr key={loc.location_id}>
                        <td className="py-2.5 px-4 font-mono font-bold text-[#4A5568]">{loc.location_code}</td>
                        <td className="py-2.5 px-4 font-medium text-[#121E36]">{loc.location_name}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-[#121E36] text-sm">
                          {loc.quantity} {selectedProductDetails.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Product Stock Ledger History */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#727A84] mb-3 flex items-center gap-2">
                <History className="w-4 h-4 text-[#059669]" />
                Recent Stock Ledger History for Product
              </h4>
              <div className="rounded-xl border border-[#B5C1C8] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#E8EBED] text-[#727A84] uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4">Ref #</th>
                      <th className="py-2.5 px-4">Location</th>
                      <th className="py-2.5 px-4 text-right">Change</th>
                      <th className="py-2.5 px-4 text-right">Before → After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#B5C1C8] font-mono">
                    {selectedProductDetails.ledgerHistory.map((lh) => (
                      <tr key={lh.id}>
                        <td className="py-2.5 px-4 font-sans text-[#727A84]">{new Date(lh.created_at).toLocaleDateString()}</td>
                        <td className="py-2.5 px-4 font-sans"><StatusBadge status={lh.transaction_type} /></td>
                        <td className="py-2.5 px-4 text-[#121E36] font-bold">{lh.reference_no}</td>
                        <td className="py-2.5 px-4 font-sans text-[#727A84]">{lh.location_name}</td>
                        <td className={`py-2.5 px-4 text-right font-bold ${lh.quantity_change > 0 ? 'text-[#059669]' : 'text-[#E11D48]'}`}>
                          {lh.quantity_change > 0 ? `+${lh.quantity_change}` : lh.quantity_change}
                        </td>
                        <td className="py-2.5 px-4 text-right text-[#727A84]">
                          {lh.quantity_before} → <span className="text-[#121E36] font-bold">{lh.quantity_after}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
