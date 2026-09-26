import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { AlertTriangle, ArrowDownLeft, RefreshCw, Building2, Package, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/alerts');
      if (res.data.success) {
        setAlerts(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch low stock alerts', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <AlertTriangle className="w-7 h-7 text-rose-400" />
          Low Stock Alerts & Notifications
        </h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">
          Real-time inventory alerts when recorded stock falls below minimum threshold
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Scanning warehouse stock levels...</div>
      ) : alerts.length === 0 ? (
        <div className="p-12 rounded-3xl glass-panel border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">All Stock Levels Healthy!</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No items are currently below their minimum stock threshold in any warehouse location.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {alerts.map((a) => (
            <div
              key={`${a.product_id}-${a.location_id}`}
              className="p-5 rounded-2xl glass-panel border border-rose-500/30 hover:border-rose-500/60 transition-all duration-300 space-y-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-xl pointer-events-none"></div>

              {/* Product Info */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold uppercase">
                    Deficit: {a.deficit} {a.product_unit}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5">{a.product_name}</h3>
                  <p className="text-xs font-mono text-indigo-400">{a.product_sku} • {a.product_category}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              {/* Location & Quantity Breakdown */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    Warehouse:
                  </span>
                  <span className="font-bold text-white">{a.location_name} ({a.location_code})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Current Stock:</span>
                  <span className="font-bold font-mono text-rose-400 text-sm">{a.current_quantity} {a.product_unit}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800/80 pt-1.5">
                  <span className="text-slate-400">Min Threshold:</span>
                  <span className="font-bold font-mono text-slate-300">{a.min_stock_threshold} {a.product_unit}</span>
                </div>
              </div>

              {/* Quick Restock Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/receipts"
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  + Intake Receipt
                </Link>
                <Link
                  to="/transfers"
                  className="py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-600/20"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  + Transfer Stock
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
