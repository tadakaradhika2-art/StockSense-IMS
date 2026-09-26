import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  SlidersHorizontal,
  ScrollText,
  AlertTriangle,
  Building2
} from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Receipts (In)', path: '/receipts', icon: ArrowDownLeft },
    { name: 'Deliveries (Out)', path: '/deliveries', icon: ArrowUpRight },
    { name: 'Internal Transfers', path: '/transfers', icon: RefreshCw },
    { name: 'Stock Adjustments', path: '/adjustments', icon: SlidersHorizontal },
    { name: 'Stock Ledger', path: '/ledger', icon: ScrollText },
    { name: 'Low Stock Alerts', path: '/alerts', icon: AlertTriangle },
    { name: 'Locations', path: '/locations', icon: Building2 },
  ];

  return (
    <aside className="w-64 bg-[#FEFEFE] border-r border-[#B5C1C8] p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-65px)] shadow-sm">
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#727A84] mb-2.5">Main Navigation</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${isActive
                  ? 'bg-[#121E36] text-[#FEFEFE] font-bold shadow-md shadow-[#121E36]/20'
                  : 'text-[#727A84] hover:text-[#121E36] hover:bg-[#D6DCE0]/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-[#D6DCE0] border border-[#B5C1C8] text-xs text-[#727A84] space-y-1">
        <p className="font-bold text-[#121E36]">Control Panel Principle</p>
        <p className="text-[11px] leading-relaxed text-[#727A84]">
          Real Operation → Stock Change → Ledger Entry → Current Stock.
        </p>
      </div>
    </aside>
  );
}
