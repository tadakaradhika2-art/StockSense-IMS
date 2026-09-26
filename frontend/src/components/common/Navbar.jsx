import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, LogOut, ShieldCheck, UserCheck, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlertCount = async () => {
    try {
      const res = await api.get('/dashboard/alerts');
      if (res.data.success) {
        setAlertCount(res.data.data.length);
      }
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FEFEFE] border-b border-[#B5C1C8] px-6 py-3.5 flex items-center justify-between shadow-sm">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#121E36] shadow-md shadow-[#121E36]/15 flex items-center justify-center">
          <Layers className="w-5 h-5 text-[#FEFEFE]" />
        </div>
        <div>
          <span className="font-extrabold text-xl tracking-tight text-[#121E36]">
            StockSense
          </span>
          <span className="hidden sm:inline-block ml-2.5 text-xs font-medium text-[#727A84] border-l border-[#B5C1C8] pl-2.5">
            Control Panel Inventory
          </span>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        {/* Low Stock Alert Bell */}
        <Link
          to="/alerts"
          className="relative p-2.5 rounded-xl bg-[#D6DCE0] hover:bg-[#C4CDD3] text-[#121E36] border border-[#B5C1C8] transition-all group"
          title="View Low Stock Alerts"
        >
          <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E11D48] text-[10px] font-bold text-[#FEFEFE] shadow-md animate-bounce">
              {alertCount}
            </span>
          )}
        </Link>

        {/* User Info & Role */}
        <div className="flex items-center gap-3 border-l border-[#B5C1C8] pl-4">
          <div className="hidden md:block text-right">
            <p className="text-sm font-bold text-[#121E36] leading-tight">{user?.name}</p>
            <p className="text-xs text-[#727A84] leading-tight">{user?.email}</p>
          </div>

          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
            isAdmin 
              ? 'bg-[#121E36] text-[#FEFEFE] border-[#121E36]' 
              : 'bg-[#10B981]/15 text-[#047857] border-[#10B981]/30'
          }`}>
            {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
            {user?.role ? user.role.replace('_', ' ') : 'USER'}
          </span>

          <button
            onClick={logout}
            className="p-2.5 rounded-xl bg-[#D6DCE0] hover:bg-rose-100 text-[#E11D48] border border-[#B5C1C8] transition-all"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
