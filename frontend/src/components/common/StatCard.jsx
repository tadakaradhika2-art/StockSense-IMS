import React from 'react';

export default function StatCard({ title, value, icon: Icon, color = 'navy', subtext, trend }) {
  const colorMap = {
    navy: 'text-[#121E36] bg-[#D6DCE0] border-[#B5C1C8]',
    emerald: 'text-[#059669] bg-emerald-50 border-emerald-200',
    amber: 'text-[#D97706] bg-amber-50 border-amber-200',
    rose: 'text-[#E11D48] bg-rose-50 border-rose-200',
    indigo: 'text-[#4F46E5] bg-indigo-50 border-indigo-200',
    purple: 'text-[#7C3AED] bg-purple-50 border-purple-200',
  };

  const styleClass = colorMap[color] || colorMap.navy;

  return (
    <div className="relative overflow-hidden rounded-2xl p-5 bg-[#FEFEFE] border border-[#B5C1C8] glass-card transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#727A84]">{title}</p>
          <h3 className="text-2xl font-black mt-1 text-[#121E36] font-mono">{value}</h3>
          {subtext && (
            <p className="text-xs text-[#727A84] mt-1.5 flex items-center gap-1 font-medium">
              {trend && <span className={trend > 0 ? 'text-[#059669]' : 'text-[#E11D48]'}>{trend > 0 ? '↑' : '↓'}</span>}
              {subtext}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl border ${styleClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
