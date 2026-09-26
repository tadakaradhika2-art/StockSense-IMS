import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import {
  Package,
  DollarSign,
  AlertTriangle,
  ClipboardList,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  SlidersHorizontal,
  Building2,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-[#B5C1C8] rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => <div key={n} className="h-32 bg-[#FEFEFE] rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-rose-50 border border-rose-200 text-[#E11D48] rounded-xl">
          {error}
        </div>
      </div>
    );
  }

  const { kpis, lowStockAlerts, locationBreakdown, recentMovements, ledgerSummary } = data;

  const CONTROL_PANEL_BAR_COLORS = ['#121E36', '#727A84', '#B5C1C8', '#059669', '#D97706'];

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#121E36] tracking-tight">Inventory Dashboard</h1>
          <p className="text-[#727A84] text-xs md:text-sm mt-1">
            Real-time stock status, location distribution, and movement history
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/receipts"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-[#FEFEFE] font-bold text-xs shadow-md shadow-[#059669]/20 transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            + Receipt
          </Link>
          <Link
            to="/deliveries"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#121E36] hover:bg-[#182846] text-[#FEFEFE] font-bold text-xs shadow-md shadow-[#121E36]/20 transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            + Delivery
          </Link>
          <Link
            to="/transfers"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-[#FEFEFE] font-bold text-xs shadow-md shadow-[#7C3AED]/20 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            + Transfer
          </Link>
          <Link
            to="/adjustments"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FEFEFE] hover:bg-[#D6DCE0] text-[#121E36] border border-[#B5C1C8] font-bold text-xs transition-all shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#727A84]" />
            Adjust Count
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={kpis.totalProducts}
          icon={Package}
          color="navy"
          subtext="Active SKUs in catalog"
        />
        <StatCard
          title="Total Inventory Value"
          value={`$${Number(kpis.totalStockValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="emerald"
          subtext="Valuation across warehouses"
        />
        <StatCard
          title="Low Stock Alerts"
          value={kpis.lowStockAlertCount}
          icon={AlertTriangle}
          color={kpis.lowStockAlertCount > 0 ? "rose" : "emerald"}
          subtext={kpis.lowStockAlertCount > 0 ? "Requires restock action" : "All items well stocked"}
        />
        <StatCard
          title="Pending Operations"
          value={kpis.pendingReceipts + kpis.pendingDeliveries + kpis.pendingTransfers}
          icon={ClipboardList}
          color="amber"
          subtext={`${kpis.pendingReceipts} In | ${kpis.pendingDeliveries} Out | ${kpis.pendingTransfers} Trf`}
        />
      </div>

      {/* Low Stock Warning Banner if any */}
      {lowStockAlerts.length > 0 && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 text-[#E11D48] mt-0.5">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-[#E11D48] text-sm">Low Stock Alert: {lowStockAlerts.length} item(s) below threshold</h3>
              <p className="text-xs text-[#727A84] mt-0.5">
                Immediate stock replenishment or internal transfer recommended for {lowStockAlerts.slice(0, 3).map(i => i.name).join(', ')}...
              </p>
            </div>
          </div>
          <Link
            to="/alerts"
            className="px-4 py-2 rounded-xl bg-[#E11D48] hover:bg-rose-700 text-[#FEFEFE] font-bold text-xs transition-all self-start md:self-auto shrink-0 shadow-md shadow-[#E11D48]/20"
          >
            Manage Low Stock Alerts
          </Link>
        </div>
      )}

      {/* Charts & Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Warehouse Stock Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#FEFEFE] border border-[#B5C1C8] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#121E36] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#121E36]" />
                Stock Distribution by Location
              </h3>
              <p className="text-xs text-[#727A84]">Total physical units stored in each warehouse location</p>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="code" stroke="#727A84" fontSize={12} tickLine={false} />
                <YAxis stroke="#727A84" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#121E36', borderColor: '#121E36', borderRadius: '12px', color: '#FEFEFE', fontSize: '12px' }}
                  formatter={(val, name) => [val, 'Total Units']}
                />
                <Bar dataKey="total_units" radius={[8, 8, 0, 0]}>
                  {locationBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CONTROL_PANEL_BAR_COLORS[index % CONTROL_PANEL_BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Signature Dark Contrast Card (Matches "Projects in Progress" dark card in BRESS palette screenshot) */}
        <div className="p-6 rounded-2xl bg-[#121E36] text-[#FEFEFE] border border-[#121E36] shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#FEFEFE] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#B5C1C8]" />
              Stock Operations Summary
            </h3>
            <p className="text-xs text-[#B5C1C8] mt-1">Transaction types recorded in Stock Ledger</p>
          </div>

          <div className="space-y-3">
            {ledgerSummary.map((item) => (
              <div key={item.transaction_type} className="p-3.5 rounded-xl bg-[#182846] border border-[#203459] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge status={item.transaction_type} />
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#FEFEFE] font-mono">{item.transaction_count} ops</p>
                  <p className="text-[11px] text-[#B5C1C8]">{item.total_volume} units moved</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Link
              to="/ledger"
              className="w-full py-2.5 rounded-xl bg-[#FEFEFE] hover:bg-[#D6DCE0] text-[#121E36] text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Activity className="w-4 h-4 text-[#121E36]" />
              View Full Stock Ledger History
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Ledger Activity Table Stream */}
      <div className="p-6 rounded-2xl bg-[#FEFEFE] border border-[#B5C1C8] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#121E36] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#121E36]" />
              Recent Stock Movements Stream
            </h3>
            <p className="text-xs text-[#727A84]">Live audit log of stock changes committed to the system</p>
          </div>
          <Link to="/ledger" className="text-xs font-bold text-[#121E36] hover:underline">
            View All →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#D6DCE0] text-[#727A84] uppercase font-semibold border-b border-[#B5C1C8]">
              <tr>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Reference</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4 text-right">Change</th>
                <th className="py-3.5 px-4 text-right">Stock (Before → After)</th>
                <th className="py-3.5 px-4">By User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#B5C1C8] font-mono text-[#121E36]">
              {recentMovements.map((m) => (
                <tr key={m.id} className="hover:bg-[#D6DCE0]/50 transition-colors">
                  <td className="py-3 px-4 text-[#727A84] font-sans">
                    {new Date(m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 font-bold text-[#121E36]">{m.reference_no}</td>
                  <td className="py-3 px-4 font-sans"><StatusBadge status={m.transaction_type} /></td>
                  <td className="py-3 px-4 font-sans text-[#121E36] font-medium">{m.product_name} <span className="text-[#727A84] font-mono text-[10px]">({m.product_sku})</span></td>
                  <td className="py-3 px-4 font-sans text-[#727A84]">{m.location_name}</td>
                  <td className={`py-3 px-4 text-right font-bold ${m.quantity_change > 0 ? 'text-[#059669]' : 'text-[#E11D48]'}`}>
                    {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                  </td>
                  <td className="py-3 px-4 text-right text-[#727A84]">
                    {m.quantity_before} → <span className="text-[#121E36] font-bold">{m.quantity_after}</span>
                  </td>
                  <td className="py-3 px-4 font-sans text-[#727A84]">{m.user_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
