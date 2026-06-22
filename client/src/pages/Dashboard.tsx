import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconTool, IconClock, IconUsers, IconAlertTriangle,
  IconCircleCheck, IconFileInvoice, IconCurrencyRupee, IconBox,
  IconBolt, IconPlus, IconFileText, IconShoppingCart, IconTruckDelivery,
  IconChartLine, IconDeviceDesktop, IconCash, IconMapPin, IconChevronRight, IconBell,
} from '@tabler/icons-react';
import api from '../services/api';
import type { DashboardStats } from '../types';

const revenueData = [
  { month: 'Jan', revenue: 12000, invoices: 24 },
  { month: 'Feb', revenue: 18500, invoices: 37 },
  { month: 'Mar', revenue: 14200, invoices: 28 },
  { month: 'Apr', revenue: 9800, invoices: 20 },
  { month: 'May', revenue: 21000, invoices: 42 },
  { month: 'Jun', revenue: 8500, invoices: 17 },
];

const repairStatusColor: Record<string, string> = {
  received: 'pill pill-amber',
  diagnosed: 'pill pill-gray',
  'in repair': 'pill pill-blue',
  'waiting parts': 'pill pill-purple',
  completed: 'pill pill-green',
  delivered: 'pill pill-teal',
  cancelled: 'pill pill-red',
};

const invoiceStatusColor: Record<string, string> = {
  draft: 'pill pill-gray',
  issued: 'pill pill-blue',
  paid: 'pill pill-green',
  partial: 'pill pill-amber',
  cancelled: 'pill pill-red',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeRepairs: 0, newRepairs: 0, customers: 0, lowStock: 0,
    completedMonth: 0, completedRevenue: 0,
    pendingInvoices: 0, pendingAmount: 0,
    revenue30Day: 0, lowStockItems: 0,
    activeLeads: 0,
  });
  const [chartMode, setChartMode] = useState<'revenue' | 'invoices'>('revenue');
  const [hoveredData, setHoveredData] = useState<{ month: string; revenue: number; invoices: number } | null>(null);

  useEffect(() => {
    api.get('/dashboard')
      .then(r => {
        const d = r.data;
        const s = d.stats || d;
        setStats({
          activeRepairs: s.activeRepairs ?? 0,
          newRepairs: s.newRepairs ?? s.todayRepairs ?? 0,
          customers: s.customers ?? s.totalCustomers ?? 0,
          lowStock: s.lowStock ?? s.lowStockParts ?? 0,
          completedMonth: s.completedMonth ?? 0,
          completedRevenue: s.completedRevenue ?? s.monthlyRevenue ?? 0,
          pendingInvoices: s.pendingInvoices ?? 0,
          pendingAmount: s.pendingAmount ?? 0,
          revenue30Day: s.revenue30Day ?? 0,
          lowStockItems: s.lowStockItems ?? s.lowStockParts ?? 0,
          activeLeads: s.activeLeads ?? 0,
        });
      })
      .catch(() => {});
  }, []);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const formattedTime = currentTime.toLocaleString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:overflow-hidden">
      {/* Page header */}
      <div className="page-header flex-shrink-0 items-center !mb-0">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">
            Welcome back, <span className="font-semibold text-gray-700">System Admin</span>
          </p>
        </div>
        <div className="text-right flex-shrink-0 no-print">
          <div className="text-[12px] font-medium text-gray-500 bg-white border border-gray-200/80 rounded-xl px-3 py-1.5 shadow-sm flex items-center gap-2 date-time-container">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{formattedDate}</span>
            <span className="font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100 time-badge">{formattedTime}</span>
          </div>
        </div>
      </div>

      {/* Stats row - consolidated to 5 cards in a single row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 flex-shrink-0">
        <Link to="/repairs?from=dashboard" className="stat-card blue">
          <div className="stat-card-body">
            <div className="stat-icon blue">
              <IconTool size={20} />
            </div>
            <div>
              <div className="stat-label">Active Repairs</div>
              <div className="stat-value">{stats.activeRepairs}</div>
              <div className="stat-sub">Under active repair</div>
            </div>
          </div>
        </Link>
        <Link to="/crm?from=dashboard" className="stat-card amber">
          <div className="stat-card-body">
            <div className="stat-icon amber">
              <IconUsers size={20} />
            </div>
            <div>
              <div className="stat-label">Active Leads</div>
              <div className="stat-value">{stats.activeLeads}</div>
              <div className="stat-sub">In sales pipeline</div>
            </div>
          </div>
        </Link>
        <Link to="/repairs?status=completed&from=dashboard" className="stat-card green">
          <div className="stat-card-body">
            <div className="stat-icon green">
              <IconCircleCheck size={20} />
            </div>
            <div>
              <div className="stat-label">Completed (Month)</div>
              <div className="stat-value">{stats.completedMonth}</div>
              <div className="stat-sub text-emerald-600 font-bold truncate text-[11.5px]">
                ₹{stats.completedRevenue.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </Link>
        <Link to="/sales?from=dashboard" className="stat-card amber">
          <div className="stat-card-body">
            <div className="stat-icon amber">
              <IconFileInvoice size={20} />
            </div>
            <div>
              <div className="stat-label">Pending Invoices</div>
              <div className="stat-value">{stats.pendingInvoices}</div>
              <div className="stat-sub text-amber-600 font-bold truncate text-[11.5px]">
                ₹{stats.pendingAmount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </Link>
        <Link to="/parts?from=dashboard" className="stat-card red">
          <div className="stat-card-body">
            <div className="stat-icon red">
              <IconBox size={20} />
            </div>
            <div>
              <div className="stat-label">Low Stock Parts</div>
              <div className="stat-value">{stats.lowStockItems}</div>
              <div className="stat-sub">Needs reorder</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Main Workspace grid - 3 panels side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:flex-1 lg:min-h-0">
        {/* Panel 1: Revenue Chart (5 columns) */}
        <div className="lg:col-span-5 flex flex-col lg:min-h-0">
          <div className="panel flex flex-col lg:min-h-0 lg:flex-1 h-[240px] lg:h-auto">
            <div className="panel-header flex-shrink-0">
              <div className="panel-title text-gray-700 font-bold">
                {chartMode === 'revenue' ? (
                  <>
                    <IconCurrencyRupee size={18} className="text-blue-500" />
                    <span>Revenue Overview</span>
                  </>
                ) : (
                  <>
                    <IconFileInvoice size={18} className="text-emerald-500" />
                    <span>Sales Volume Overview</span>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {hoveredData ? (
                  <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded border transition-all ${
                    chartMode === 'revenue'
                      ? 'text-blue-600 bg-blue-50/50 border-blue-200'
                      : 'text-emerald-600 bg-emerald-50/50 border-emerald-200'
                  }`}>
                    {hoveredData.month}: {chartMode === 'revenue' 
                      ? `₹${hoveredData.revenue.toLocaleString('en-IN')}` 
                      : `${hoveredData.invoices} Sales`}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 font-bold">Last 6 months</span>
                )}
                
                <div className="flex items-center bg-gray-100 p-0.5 rounded-md border border-gray-200/60 no-print">
                  <button
                    type="button"
                    onClick={() => setChartMode('revenue')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      chartMode === 'revenue'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Revenue
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode('invoices')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      chartMode === 'invoices'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Sales
                  </button>
                </div>
              </div>
            </div>
            
            {/* Chart Area with Gridlines & Y-Axis */}
            <div className="flex flex-1 min-h-0 gap-3 mt-2">
              {/* Y-Axis Label Column */}
              <div className="flex flex-col justify-between text-[10px] text-gray-400 font-bold select-none pb-6 pt-1 flex-shrink-0 text-right w-7">
                {chartMode === 'revenue' ? (
                  <>
                    <span>25K</span>
                    <span>20K</span>
                    <span>15K</span>
                    <span>10K</span>
                    <span>5K</span>
                    <span>0</span>
                  </>
                ) : (
                  <>
                    <span>50</span>
                    <span>40</span>
                    <span>30</span>
                    <span>20</span>
                    <span>10</span>
                    <span>0</span>
                  </>
                )}
              </div>
              
              {/* Main Chart Container */}
              <div className="flex-1 min-h-0 flex flex-col relative">
                {/* Horizontal Dashed Gridlines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 pt-1 z-0">
                  <div className="border-b border-dashed border-gray-100 w-full h-0"></div>
                  <div className="border-b border-dashed border-gray-100 w-full h-0"></div>
                  <div className="border-b border-dashed border-gray-100 w-full h-0"></div>
                  <div className="border-b border-dashed border-gray-100 w-full h-0"></div>
                  <div className="border-b border-dashed border-gray-100 w-full h-0"></div>
                  <div className="border-b border-dashed border-gray-100 w-full h-0"></div>
                </div>

                {/* Dynamic Average trend line indicator */}
                {(() => {
                  const avgRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0) / revenueData.length;
                  const avgInvoices = revenueData.reduce((sum, d) => sum + d.invoices, 0) / revenueData.length;
                  const avgPct = chartMode === 'revenue' ? (avgRevenue / 25000) * 100 : (avgInvoices / 50) * 100;
                  return (
                    <div 
                      className="absolute left-0 right-0 border-t border-dashed pointer-events-none z-20 flex justify-end items-start transition-all duration-500"
                      style={{ bottom: `${avgPct}%` }}
                    >
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded -mt-2.5 mr-2 shadow-sm border transition-all duration-500 ${
                        chartMode === 'revenue'
                          ? 'bg-blue-50 text-blue-600 border-blue-150'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-150'
                      }`}>
                        Avg: {chartMode === 'revenue' 
                          ? `₹${Math.round(avgRevenue).toLocaleString('en-IN')}` 
                          : `${Math.round(avgInvoices)} Sales`}
                      </span>
                    </div>
                  );
                })()}

                {/* Bars Area */}
                <div className="chart-area flex-1 min-h-0 flex items-end gap-2.5 pb-2 pt-1 relative z-10">
                  {revenueData.map((d, index) => {
                    const value = chartMode === 'revenue' ? d.revenue : d.invoices;
                    const maxVal = chartMode === 'revenue' ? 25000 : 50;
                    const pct = (value / maxVal) * 100;
                    const isLast = index === revenueData.length - 1;
                    return (
                      <div
                        key={d.month}
                        className={`bar ${isLast ? 'active-bar' : ''} group relative ${
                          hoveredData && hoveredData.month !== d.month ? 'opacity-40 scale-x-[0.95]' : ''
                        }`}
                        style={{ height: `${pct}%` }}
                        onMouseEnter={() => setHoveredData(d)}
                        onMouseLeave={() => setHoveredData(null)}
                      >
                        {/* Interactive floating tooltip directly on top of the bar */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 z-30 flex flex-col items-center">
                          <div className={`text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap border ${
                            isLast ? 'bg-emerald-950/95 border-emerald-700' : 'bg-slate-900/95 border-slate-700'
                          }`}>
                            {chartMode === 'revenue' 
                              ? `₹${d.revenue.toLocaleString('en-IN')}` 
                              : `${d.invoices} Sales`}
                          </div>
                          <div className={`w-1.5 h-1.5 border-r border-b rotate-45 -mt-1 ${
                            isLast ? 'bg-emerald-950 border-emerald-700' : 'bg-slate-900 border-slate-700'
                          }`}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* X-Axis Labels Grid */}
                <div className="chart-labels flex-shrink-0 flex gap-2.5 relative z-10">
                  {revenueData.map((d) => (
                    <span key={d.month} className="chart-label flex-1 text-center font-bold">
                      {d.month}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: Operations Alert Desk (3 columns) */}
        <div className="lg:col-span-3 flex flex-col lg:min-h-0">
          <div className="panel flex flex-col lg:min-h-0 lg:flex-1 bg-slate-50/25 p-3">
            <div className="panel-header flex-shrink-0 mb-1.5">
              <div className="panel-title text-gray-700 font-bold">
                <IconBell size={18} className="text-amber-500" /> Operations Alert Desk
              </div>
            </div>
            
            <div className="space-y-1.5 flex-1 overflow-y-auto pr-0.5">
              {/* Alert 1: Low Stock Parts */}
              <Link to="/parts?from=dashboard" className="alert-card alert-red">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-[26px] h-[26px] rounded bg-red-50 flex items-center justify-center flex-shrink-0 text-red-500">
                    <IconBox size={13} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11.5px] font-bold text-gray-800 leading-tight">Stock Replenishment</div>
                    <div className="text-[9.5px] text-gray-500 truncate leading-none mt-0.5">Parts requiring restock</div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {stats.lowStockItems > 0 ? (
                    <span className="pill pill-red font-bold text-[9.5px] px-1.5 py-0.5">{stats.lowStockItems} Items</span>
                  ) : (
                    <span className="pill pill-green font-bold text-[9.5px] px-1.5 py-0.5">OK</span>
                  )}
                  <IconChevronRight size={11} className="text-gray-400" />
                </div>
              </Link>

              {/* Alert 2: New Repairs Pending */}
              <Link to="/repairs?status=received&from=dashboard" className="alert-card alert-amber">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-[26px] h-[26px] rounded bg-amber-50 flex items-center justify-center flex-shrink-0 text-amber-500">
                    <IconClock size={13} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11.5px] font-bold text-gray-800 leading-tight">Awaiting Assign</div>
                    <div className="text-[9.5px] text-gray-500 truncate leading-none mt-0.5">New tickets to diagnostic</div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {stats.newRepairs > 0 ? (
                    <span className="pill pill-amber font-bold text-[9.5px] px-1.5 py-0.5">{stats.newRepairs} New</span>
                  ) : (
                    <span className="pill pill-green font-bold text-[9.5px] px-1.5 py-0.5">OK</span>
                  )}
                  <IconChevronRight size={11} className="text-gray-400" />
                </div>
              </Link>

              {/* Alert 3: Pending Invoices Outstanding */}
              <Link to="/sales?from=dashboard" className="alert-card alert-purple">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-[26px] h-[26px] rounded bg-purple-50 flex items-center justify-center flex-shrink-0 text-purple-500">
                    <IconFileInvoice size={13} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11.5px] font-bold text-gray-800 leading-tight">Outstanding Invoices</div>
                    <div className="text-[9.5px] text-gray-500 truncate leading-none mt-0.5">Draft & unpaid sales bills</div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {stats.pendingInvoices > 0 ? (
                    <span className="pill pill-purple font-bold text-[9.5px] px-1.5 py-0.5">₹{stats.pendingAmount.toLocaleString('en-IN')}</span>
                  ) : (
                    <span className="pill pill-green font-bold text-[9.5px] px-1.5 py-0.5">OK</span>
                  )}
                  <IconChevronRight size={11} className="text-gray-400" />
                </div>
              </Link>

              {/* Alert 4: CRM Leads Desk */}
              <Link to="/crm?from=dashboard" className="alert-card alert-blue">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-[26px] h-[26px] rounded bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-500">
                    <IconUsers size={13} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11.5px] font-bold text-gray-800 leading-tight">CRM Leads Desk</div>
                    <div className="text-[9.5px] text-gray-500 truncate leading-none mt-0.5">Active sales pipeline leads</div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {stats.activeLeads && stats.activeLeads > 0 ? (
                    <span className="pill pill-blue font-bold text-[9.5px] px-1.5 py-0.5">{stats.activeLeads} Leads</span>
                  ) : (
                    <span className="pill pill-gray font-bold text-[9.5px] px-1.5 py-0.5">No Leads</span>
                  )}
                  <IconChevronRight size={11} className="text-gray-400" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Panel 3: Quick Actions (4 columns, 2x5 grid) */}
        <div className="lg:col-span-4 flex flex-col lg:min-h-0">
          <div className="panel flex flex-col justify-between lg:min-h-0 lg:flex-1 p-3">
            <div className="panel-header flex-shrink-0">
              <div className="panel-title text-gray-700 font-bold">
                <IconBolt size={18} className="text-indigo-500" /> Quick Actions
              </div>
            </div>
            <div className="grid grid-cols-2 grid-rows-5 grid-flow-col gap-2 flex-1 min-h-0 py-1 quick-actions-grid">
              <Link to="/quotations/new?from=dashboard" className="action-btn bg-[#0f766e]">
                <IconFileText size={14} />
                <span>Quotation</span>
              </Link>
              <Link to="/crm/new?from=dashboard" className="action-btn bg-[#0d9488]">
                <IconUsers size={14} />
                <span>Lead (CRM)</span>
              </Link>
              <Link to="/parts/new?from=dashboard" className="action-btn bg-[#4f46e5]">
                <IconBox size={14} />
                <span>Product</span>
              </Link>
              <Link to="/customers/new?from=dashboard" className="action-btn bg-[#059669]">
                <IconUsers size={14} />
                <span>Customer</span>
              </Link>
              <Link to="/suppliers/new?from=dashboard" className="action-btn bg-[#db2777]">
                <IconBox size={14} />
                <span>Supplier</span>
              </Link>
              <Link to="/payroll/runs?from=dashboard" className="action-btn bg-[#be123c]">
                <IconCash size={14} />
                <span>Payroll</span>
              </Link>
              <Link to="/locations/new?from=dashboard" className="action-btn bg-[#1e3a8a]">
                <IconMapPin size={14} />
                <span>Location</span>
              </Link>
              <Link to="/technicians/new?from=dashboard" className="action-btn bg-[#7c3aed]">
                <IconTool size={14} />
                <span>Technician</span>
              </Link>
              <Link to="/users/new?from=dashboard" className="action-btn bg-[#b45309]">
                <IconPlus size={14} />
                <span>User</span>
              </Link>
              <Link to="/companies/new?from=dashboard" className="action-btn bg-[#0369a1]">
                <IconDeviceDesktop size={14} />
                <span>Company</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Cards (Quick Links) */}
      <div className="quick-grid flex-shrink-0">
        <Link to="/sales" className="quick-card card-sales">
          <IconFileInvoice size={16} className="ic-sales" />
          <span className="qc-label">Sales</span>
          <span className="qc-sub">Invoices</span>
        </Link>
        <Link to="/pos?from=dashboard" className="quick-card card-pos">
          <IconDeviceDesktop size={16} className="ic-pos" />
          <span className="qc-label">POS</span>
          <span className="qc-sub">Checkout</span>
        </Link>
        <Link to="/repairs" className="quick-card card-repairs">
          <IconTool size={16} className="ic-repair" />
          <span className="qc-label">Repairs</span>
          <span className="qc-sub">Tickets</span>
        </Link>
        <Link to="/purchases" className="quick-card card-purchases">
          <IconShoppingCart size={16} className="ic-purchase" />
          <span className="qc-label">Purchases</span>
          <span className="qc-sub">Orders</span>
        </Link>
        <Link to="/delivery-challans" className="quick-card card-delivery">
          <IconTruckDelivery size={16} className="ic-delivery" />
          <span className="qc-label">Delivery</span>
          <span className="qc-sub">Challans</span>
        </Link>
        <Link to="/reports" className="quick-card card-reports">
          <IconChartLine size={16} className="ic-reports" />
          <span className="qc-label">Reports</span>
          <span className="qc-sub">Analytics</span>
        </Link>
      </div>
    </div>
  );
}
