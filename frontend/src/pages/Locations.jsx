import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import { Building2, Plus, MapPin, Package, DollarSign } from 'lucide-react';

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  // Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const [locRes, dashRes] = await Promise.all([
        api.get('/stock/locations'),
        api.get('/dashboard')
      ]);
      if (locRes.data.success) setLocations(locRes.data.data);
      if (dashRes.data.success) setDashboardData(dashRes.data.data);
    } catch (err) {
      console.error('Failed to fetch locations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/stock/locations', { name, code, address });
      if (res.data.success) {
        setIsCreateOpen(false);
        setName('');
        setCode('');
        setAddress('');
        fetchLocations();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create location');
    } finally {
      setSubmitting(false);
    }
  };

  const getLocBreakdown = (locId) => {
    if (!dashboardData || !dashboardData.locationBreakdown) return { total_units: 0, total_value: 0 };
    return dashboardData.locationBreakdown.find(b => b.id === locId) || { total_units: 0, total_value: 0 };
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-sky-400" />
            Warehouse Locations
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Manage physical warehouses, distribution hubs, and retail store locations
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/30 transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Warehouse Location
          </button>
        )}
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-8 text-slate-500">Loading locations...</div>
        ) : locations.map((loc) => {
          const stats = getLocBreakdown(loc.id);

          return (
            <div key={loc.id} className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-5 hover:border-sky-500/40 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 font-mono text-xs font-bold border border-sky-500/20">
                    {loc.code}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-2">{loc.name}</h3>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-sky-400">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>

              {loc.address && (
                <p className="text-xs text-slate-400 flex items-start gap-1.5 leading-relaxed">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  {loc.address}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 font-mono text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[10px] uppercase font-sans text-slate-500">Stored Units</p>
                  <p className="text-lg font-bold text-white mt-0.5">{stats.total_units}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[10px] uppercase font-sans text-slate-500">Stock Valuation</p>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">${Number(stats.total_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Location Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Warehouse Location"
      >
        <form onSubmit={handleCreateLocation} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Location Code (e.g. WH-SOUTH)</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="WH-SOUTH"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Warehouse Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="South Distribution Hub"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Full Physical Address</label>
            <textarea
              rows="2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, City, State..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
            ></textarea>
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
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/30"
            >
              {submitting ? 'Creating...' : 'Create Location'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
