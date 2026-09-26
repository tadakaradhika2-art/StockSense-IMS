import React from 'react';

export default function StatusBadge({ status, type = 'status' }) {
  const getBadgeStyle = () => {
    switch (status) {
      // General Statuses
      case 'DRAFT':
        return 'bg-amber-50 text-[#B45309] border-amber-200';
      case 'VALIDATED':
      case 'CONFIRMED':
        return 'bg-emerald-50 text-[#047857] border-emerald-200';
      case 'PICKED':
        return 'bg-blue-50 text-[#1D4ED8] border-blue-200';
      case 'PACKED':
        return 'bg-purple-50 text-[#6D28D9] border-purple-200';
      
      // Stock Statuses
      case 'IN_STOCK':
        return 'bg-emerald-50 text-[#047857] border-emerald-200';
      case 'LOW_STOCK':
        return 'bg-rose-50 text-[#E11D48] border-rose-200 animate-pulse';

      // Ledger Transaction Types
      case 'RECEIPT':
        return 'bg-emerald-50 text-[#047857] border-emerald-200';
      case 'DELIVERY':
        return 'bg-[#0C1629] text-[#FEFEFE] border-[#0C1629]';
      case 'TRANSFER_IN':
      case 'TRANSFER_OUT':
        return 'bg-purple-50 text-[#6D28D9] border-purple-200';
      case 'ADJUSTMENT':
        return 'bg-amber-50 text-[#B45309] border-amber-200';

      default:
        return 'bg-[#F0F3F3] text-[#727A84] border-[#D6DCE0]';
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getBadgeStyle()}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {status ? status.replace('_', ' ') : 'N/A'}
    </span>
  );
}
