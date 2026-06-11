import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  subColor?: string;
  icon: ReactNode;
  iconBg: string;
}

export default function StatCard({ label, value, sub, subColor, icon, iconBg }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3 shadow-sm">
      <div
        className="stat-icon-wrap flex-shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1">
          {label}
        </p>
        <p className="text-[22px] font-semibold text-gray-900 leading-none">{value}</p>
        {sub && (
          <p className="text-[11px] mt-1" style={{ color: subColor ?? '#9ca3af' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}