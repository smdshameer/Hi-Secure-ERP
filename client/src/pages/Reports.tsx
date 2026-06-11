import { useEffect, useState } from 'react';
import { IconChartLine, IconDownload, IconCalendar } from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';

interface ReportData {
  revenue:       { month: string; sales: number; repairs: number }[];
  repairStatus:  { name: string; value: number }[];
  topProducts:   { name: string; qty: number; revenue: number }[];
  topCustomers:  { name: string; total: number }[];
}

const RANGES = [
  { label: 'Last 7 days',  value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 6 months',value: '6m' },
  { label: 'This year',    value: '1y' },
];

const emptyData: ReportData = {
  revenue:      [],
  repairStatus: [],
  topProducts:  [],
  topCustomers: [],
};

const PIE_COLORS = ['#1a3480', '#2563eb', '#f59e0b', '#16a34a', '#dc2626', '#9333ea'];

export default function Reports() {
  const [data, setData]     = useState<ReportData>(emptyData);
  const [range, setRange]   = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/reports', { params: { range } })
      .then(r => setData(r.data ?? emptyData))
      .catch(() => setData(emptyData))
      .finally(() => setLoading(false));
  }, [range]);

  // Calculate maximums for chart scaling
  const maxRevenue = Math.max(
    ...data.revenue.map(r => Math.max(r.sales, r.repairs)),
    1000
  );

  const maxCustomerTotal = Math.max(
    ...data.topCustomers.map(c => c.total),
    1000
  );

  const totalRepairsCount = data.repairStatus.reduce((sum, s) => sum + s.value, 0);

  return (
    <div>
      <PageBanner
        icon={<IconChartLine size={28} />}
        title="Reports & Analytics"
        subtitle="Business performance insights and statistics"
        backLabel="Back"
        backPath="/"
        action={
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-[13px] px-3 py-1.5 rounded-lg transition-colors">
              <IconDownload size={15} /> Export PDF
            </button>
          </div>
        }
      />

      {/* Range filter */}
      <div className="flex items-center gap-2 mb-4">
        <IconCalendar size={15} className="text-gray-400" />
        {RANGES.map(r => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={[
              'px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all cursor-pointer',
              range === r.value
                ? 'bg-[#1a3480] text-white border-[#1a3480]'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300',
            ].join(' ')}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">Loading reports...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Revenue chart (Double Bar Chart using Flexbox) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 col-span-1 md:col-span-2">
            <h2 className="text-[14px] font-medium text-gray-800 mb-4">Revenue Overview — Sales vs Repairs</h2>
            <div className="relative flex gap-4 h-[220px] pt-4 pl-10 pr-4 pb-6 border-l border-b border-gray-100">
              
              {/* Y-Axis Labels & Grid Lines */}
              <div className="absolute left-0 top-4 bottom-6 flex flex-col justify-between text-[10px] text-gray-400 w-8 text-right pr-2">
                <span>₹{(maxRevenue / 1000).toFixed(0)}k</span>
                <span>₹{(maxRevenue * 0.75 / 1000).toFixed(0)}k</span>
                <span>₹{(maxRevenue * 0.5 / 1000).toFixed(0)}k</span>
                <span>₹{(maxRevenue * 0.25 / 1000).toFixed(0)}k</span>
                <span>₹0</span>
              </div>
              
              <div className="absolute left-8 right-4 top-4 bottom-6 flex flex-col justify-between pointer-events-none">
                <div className="border-t border-dashed border-gray-100 w-full h-0" />
                <div className="border-t border-dashed border-gray-100 w-full h-0" />
                <div className="border-t border-dashed border-gray-100 w-full h-0" />
                <div className="border-t border-dashed border-gray-100 w-full h-0" />
                <div className="border-t border-solid border-gray-200 w-full h-0" />
              </div>

              {/* Bar Columns */}
              <div className="flex-1 flex justify-around items-end h-full z-10">
                {data.revenue.map((r, idx) => {
                  const salesPct = (r.sales / maxRevenue) * 100;
                  const repairsPct = (r.repairs / maxRevenue) * 100;
                  return (
                    <div key={idx} className="flex flex-col items-center h-full justify-end w-14 relative group">
                      
                      {/* Tooltip on Hover */}
                      <div className="absolute bottom-full mb-1 bg-gray-800 text-white text-[10px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 flex flex-col gap-0.5 whitespace-nowrap shadow">
                        <span>Sales: ₹{r.sales.toLocaleString('en-IN')}</span>
                        <span>Repairs: ₹{r.repairs.toLocaleString('en-IN')}</span>
                      </div>

                      {/* Side-by-side bars */}
                      <div className="flex items-end gap-1 w-full h-full justify-center">
                        <div
                          className="w-[16px] rounded-t bg-[#1a3480] transition-all hover:brightness-110"
                          style={{ height: `${salesPct}%` }}
                        />
                        <div
                          className="w-[16px] rounded-t bg-[#2563eb] transition-all hover:brightness-110"
                          style={{ height: `${repairsPct}%` }}
                        />
                      </div>
                      
                      {/* X-Axis Month label */}
                      <span className="absolute top-full mt-1.5 text-[11px] text-gray-400 font-medium">
                        {r.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Chart Legend */}
            <div className="flex justify-center gap-4 mt-3 text-[12px] font-medium text-gray-600">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#1a3480]" /> Sales
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#2563eb]" /> Repairs
              </div>
            </div>
          </div>

          {/* Repair status breakdown list (Progress rows) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-[14px] font-medium text-gray-800 mb-3">Repair Status Breakdown</h2>
            <div className="flex flex-col gap-3 py-2">
              {data.repairStatus.map((status, i) => {
                const pct = totalRepairsCount > 0 ? (status.value / totalRepairsCount) * 100 : 0;
                const color = PIE_COLORS[i % PIE_COLORS.length];
                return (
                  <div key={status.name} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[12px] font-medium text-gray-700">
                      <span>{status.name}</span>
                      <span className="text-gray-400">
                        {status.value} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
              {data.repairStatus.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-[13px]">No status data available</div>
              )}
            </div>
          </div>

          {/* Top Customers (Horizontal Bar Chart) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-[14px] font-medium text-gray-800 mb-3">Top Customers by Revenue</h2>
            <div className="flex flex-col gap-3 py-2">
              {data.topCustomers.map((c) => {
                const pct = maxCustomerTotal > 0 ? (c.total / maxCustomerTotal) * 100 : 0;
                return (
                  <div key={c.name} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[12px] font-medium text-gray-700">
                      <span className="truncate max-w-[150px]">{c.name}</span>
                      <span className="font-semibold text-[#1a3480]">
                        ₹{c.total.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: '#1a3480' }}
                      />
                    </div>
                  </div>
                );
              })}
              {data.topCustomers.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-[13px]">No customer data available</div>
              )}
            </div>
          </div>

          {/* Top products table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm col-span-1 md:col-span-2">
            <div className="px-4 py-3 border-b border-gray-50">
              <h2 className="text-[14px] font-medium text-gray-800">Top Products / Parts by Sales</h2>
            </div>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th className="text-center">Qty Sold</th>
                  <th className="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400">No data</td></tr>
                ) : data.topProducts.map((p, i) => (
                  <tr key={i}>
                    <td className="text-gray-400 text-[12px]">{i + 1}</td>
                    <td className="font-medium text-[13px]">{p.name}</td>
                    <td className="text-center text-[13px]">{p.qty}</td>
                    <td className="text-right font-semibold text-[13px]">
                      ₹{p.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );
}
