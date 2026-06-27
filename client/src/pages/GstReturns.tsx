import { useEffect, useState } from 'react';
import {
  IconReceipt, IconDownload, IconSearch, IconCalendar,
  IconFileText, IconAlertCircle, IconCircleCheck, IconTrendingUp
} from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';

type GstTab = 'overview' | 'sales' | 'purchase' | 'hsn' | 'export';

interface GstTransaction {
  gst_transaction_id: number;
  line_id: number;
  entry_id: number;
  entry_date: string;
  reference: string;
  description: string;
  hsn_sac_code: string;
  taxable_value: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  total_tax: number;
  gstin: string;
  account_name: string;
}

interface HsnSummaryRow {
  hsn_sac_code: string;
  description: string;
  total_taxable_value: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_tax: number;
  count: number;
}

interface Gstr3bSummary {
  outward_supplies: {
    taxable_value: number;
    cgst: number;
    sgst: number;
    igst: number;
  };
  eligible_itc: {
    taxable_value: number;
    cgst: number;
    sgst: number;
    igst: number;
  };
  net_gst_payable: {
    cgst: number;
    sgst: number;
    igst: number;
  };
}

export default function GstReturns() {
  const [tab, setTab] = useState<GstTab>('overview');
  const [sales, setSales] = useState<GstTransaction[]>([]);
  const [purchases, setPurchases] = useState<GstTransaction[]>([]);
  const [hsn, setHsn] = useState<HsnSummaryRow[]>([]);
  const [gstr3b, setGstr3b] = useState<Gstr3bSummary | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0]; // Today
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Export options
  const [exportMonth, setExportMonth] = useState(() => String(new Date().getMonth() + 1));
  const [exportYear, setExportYear] = useState(() => String(new Date().getFullYear()));
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState('');

  // Fetch registers and summaries
  useEffect(() => {
    setLoading(true);
    const params = { dateFrom, dateTo };

    Promise.all([
      api.get('/gst/sales-register', { params }).then(r => setSales(r.data.data ?? r.data ?? [])).catch(() => setSales([])),
      api.get('/gst/purchase-register', { params }).then(r => setPurchases(r.data.data ?? r.data ?? [])).catch(() => setPurchases([])),
      api.get('/gst/hsn-summary', { params }).then(r => setHsn(r.data.data ?? r.data ?? [])).catch(() => setHsn([])),
      api.get('/gst/gstr3b', { params }).then(r => setGstr3b(r.data.data ?? r.data ?? null)).catch(() => setGstr3b(null))
    ]).finally(() => {
      setLoading(false);
    });
  }, [dateFrom, dateTo]);

  // Download GSTR-1 Offline Utility JSON
  const handleExportGstr1 = async () => {
    setExporting(true);
    setExportError('');
    setExportSuccess(false);

    try {
      const res = await api.get('/gst/gstr1/export', {
        params: { month: exportMonth, year: exportYear }
      });

      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GSTR1_Offline_Export_${exportMonth.padStart(2, '0')}${exportYear}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setExportSuccess(true);
    } catch (err: any) {
      setExportError(err.response?.data?.error || err.message || 'Failed to export GSTR-1 JSON.');
    } finally {
      setExporting(false);
    }
  };

  // Filtered registers
  const filteredSales = sales.filter(s =>
    s.reference.toLowerCase().includes(search.toLowerCase()) ||
    (s.gstin || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase()) ||
    s.account_name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPurchases = purchases.filter(p =>
    p.reference.toLowerCase().includes(search.toLowerCase()) ||
    (p.gstin || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
    p.account_name.toLowerCase().includes(search.toLowerCase())
  );

  // Totals calculations
  const totalSalesTaxable = sales.reduce((sum, s) => sum + s.taxable_value, 0);
  const totalSalesTax = sales.reduce((sum, s) => sum + s.cgst_amount + s.sgst_amount + s.igst_amount, 0);

  const totalPurchasesTaxable = purchases.reduce((sum, p) => sum + p.taxable_value, 0);
  const totalPurchasesTax = purchases.reduce((sum, p) => sum + p.cgst_amount + p.sgst_amount + p.igst_amount, 0);

  const netPayableCgst = gstr3b?.net_gst_payable?.cgst ?? Math.max(0, sales.reduce((sum, s) => sum + s.cgst_amount, 0) - purchases.reduce((sum, p) => sum + p.cgst_amount, 0));
  const netPayableSgst = gstr3b?.net_gst_payable?.sgst ?? Math.max(0, sales.reduce((sum, s) => sum + s.sgst_amount, 0) - purchases.reduce((sum, p) => sum + p.sgst_amount, 0));
  const netPayableIgst = gstr3b?.net_gst_payable?.igst ?? Math.max(0, sales.reduce((sum, s) => sum + s.igst_amount, 0) - purchases.reduce((sum, p) => sum + p.igst_amount, 0));
  const totalNetPayable = netPayableCgst + netPayableSgst + netPayableIgst;

  const TABS = [
    { key: 'overview', label: 'Tax Overview' },
    { key: 'sales', label: 'Sales Register (GSTR-1)' },
    { key: 'purchase', label: 'Purchase Register (GSTR-2)' },
    { key: 'hsn', label: 'HSN/SAC Summary' },
    { key: 'export', label: 'GSTR Filing Export' },
  ] as const;

  return (
    <div className="max-w-[1600px] w-full mx-auto px-4 relative flex-1 min-h-0 flex flex-col gap-4 pb-4 lg:pb-0">
      <PageBanner
        icon={<IconReceipt />}
        title="GST & Returns"
        subtitle="Manage sales/purchase tax registers, compile HSN reports, and export GSTR-1 offline filings."
      />

      {/* Date Filter & Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-250 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-500 text-[13px]">
            <IconCalendar size={16} />
            <span>Range:</span>
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-[13px] text-gray-700 focus:outline-none focus:border-blue-500"
          />
          <span className="text-gray-400 text-[13px]">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-[13px] text-gray-700 focus:outline-none focus:border-blue-500"
          />
        </div>

        {(tab === 'sales' || tab === 'purchase') && (
          <div className="relative w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <IconSearch size={15} />
            </span>
            <input
              type="text"
              placeholder="Search reference, GSTIN..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setSearch('');
            }}
            className={[
              'px-4 py-2 text-[14px] font-medium border-b-2 transition-colors whitespace-nowrap',
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-250 p-12 text-center text-gray-400">
            Loading tax ledger details...
          </div>
        ) : tab === 'overview' ? (
          <div className="space-y-6 overflow-y-auto pr-1">
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Sales Liability */}
              <div className="bg-white p-5 rounded-xl border border-gray-250 shadow-sm flex flex-col gap-1">
                <span className="text-[12px] uppercase font-bold text-gray-400 tracking-wider">Outward Liability (Sales)</span>
                <span className="text-2xl font-bold text-gray-800">₹{totalSalesTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-[12px] text-gray-500 mt-1">Taxable Sales: ₹{totalSalesTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Purchase Credit */}
              <div className="bg-white p-5 rounded-xl border border-gray-250 shadow-sm flex flex-col gap-1">
                <span className="text-[12px] uppercase font-bold text-gray-400 tracking-wider">Input Tax Credit (Purchases)</span>
                <span className="text-2xl font-bold text-emerald-600">₹{totalPurchasesTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-[12px] text-gray-500 mt-1">Taxable Purchases: ₹{totalPurchasesTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Net Tax Payable */}
              <div className="bg-white p-5 rounded-xl border border-gray-250 shadow-sm flex flex-col gap-1">
                <span className="text-[12px] uppercase font-bold text-gray-400 tracking-wider">Net Tax Payable (Est.)</span>
                <span className={`text-2xl font-bold ${totalNetPayable > 0 ? 'text-amber-600 animate-pulse' : 'text-gray-800'}`}>
                  ₹{totalNetPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[12px] text-gray-500 mt-1">Output Tax Liability minus Eligible ITC</span>
              </div>
            </div>

            {/* GSTR-3B Summary Card */}
            <div className="bg-white rounded-xl border border-gray-250 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 text-gray-800 font-semibold border-b pb-3">
                <IconTrendingUp size={20} className="text-blue-600" />
                <h2>GSTR-3B Reconciliation Summary</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">1. Outward Taxable Supplies (Output Tax)</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Taxable Value</span>
                      <span className="font-medium text-gray-700">₹{totalSalesTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">CGST</span>
                      <span className="font-medium text-gray-700">₹{sales.reduce((sum, s) => sum + s.cgst_amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">SGST</span>
                      <span className="font-medium text-gray-700">₹{sales.reduce((sum, s) => sum + s.sgst_amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-500">IGST</span>
                      <span className="font-medium text-gray-700">₹{sales.reduce((sum, s) => sum + s.igst_amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">2. Eligible Input Tax Credit (ITC)</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Taxable Purchases</span>
                      <span className="font-medium text-gray-700">₹{totalPurchasesTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">CGST Credit</span>
                      <span className="font-medium text-gray-700">₹{purchases.reduce((sum, p) => sum + p.cgst_amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">SGST Credit</span>
                      <span className="font-medium text-gray-700">₹{purchases.reduce((sum, p) => sum + p.sgst_amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-500">IGST Credit</span>
                      <span className="font-medium text-gray-700">₹{purchases.reduce((sum, p) => sum + p.igst_amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center justify-between text-[13.5px]">
                <div className="text-blue-800 font-medium">
                  Net GST payable for this period: ₹{totalNetPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[12px] text-blue-600">
                  Breakdown: CGST (₹{netPayableCgst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}), SGST (₹{netPayableSgst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}), IGST (₹{netPayableIgst.toLocaleString('en-IN', { maximumFractionDigits: 0 })})
                </div>
              </div>
            </div>
          </div>
        ) : tab === 'sales' ? (
          <div className="bg-white rounded-xl border border-gray-250 flex flex-col flex-1 min-h-0">
            <div className="overflow-x-auto flex-1 min-h-0">
              <table className="min-w-full text-left text-[13px]">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">GSTIN</th>
                    <th className="px-4 py-3 text-right">Taxable Value</th>
                    <th className="px-4 py-3 text-right">CGST</th>
                    <th className="px-4 py-3 text-right">SGST</th>
                    <th className="px-4 py-3 text-right">IGST</th>
                    <th className="px-4 py-3 text-right font-bold">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-400">No sales transactions found for the selected range.</td>
                    </tr>
                  ) : (
                    filteredSales.map(s => (
                      <tr key={s.gst_transaction_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3.5 whitespace-nowrap text-gray-600">{new Date(s.entry_date).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-gray-700">{s.reference}</td>
                        <td className="px-4 py-3.5 text-gray-700 max-w-[200px] truncate">{s.account_name}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-gray-500">{s.gstin || 'Unregistered'}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-gray-700">₹{s.taxable_value.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-gray-600">₹{s.cgst_amount.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-gray-600">₹{s.sgst_amount.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-gray-600">₹{s.igst_amount.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-800">
                          ₹{(s.cgst_amount + s.sgst_amount + s.igst_amount).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === 'purchase' ? (
          <div className="bg-white rounded-xl border border-gray-250 flex flex-col flex-1 min-h-0">
            <div className="overflow-x-auto flex-1 min-h-0">
              <table className="min-w-full text-left text-[13px]">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">GSTIN</th>
                    <th className="px-4 py-3 text-right">Taxable Value</th>
                    <th className="px-4 py-3 text-right">CGST Credit</th>
                    <th className="px-4 py-3 text-right">SGST Credit</th>
                    <th className="px-4 py-3 text-right">IGST Credit</th>
                    <th className="px-4 py-3 text-right font-bold">Total Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-400">No purchase transactions found for the selected range.</td>
                    </tr>
                  ) : (
                    filteredPurchases.map(p => (
                      <tr key={p.gst_transaction_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3.5 whitespace-nowrap text-gray-600">{new Date(p.entry_date).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-gray-700">{p.reference}</td>
                        <td className="px-4 py-3.5 text-gray-700 max-w-[200px] truncate">{p.account_name}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-gray-500">{p.gstin || 'Unregistered'}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-gray-700">₹{p.taxable_value.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-gray-600">₹{p.cgst_amount.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-gray-600">₹{p.sgst_amount.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-gray-600">₹{p.igst_amount.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600">
                          ₹{(p.cgst_amount + p.sgst_amount + p.igst_amount).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === 'hsn' ? (
          <div className="bg-white rounded-xl border border-gray-250 flex flex-col flex-1 min-h-0">
            <div className="overflow-x-auto flex-1 min-h-0">
              <table className="min-w-full text-left text-[13px]">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">HSN/SAC Code</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Taxable Value</th>
                    <th className="px-4 py-3 text-right">CGST</th>
                    <th className="px-4 py-3 text-right">SGST</th>
                    <th className="px-4 py-3 text-right">IGST</th>
                    <th className="px-4 py-3 text-right font-bold">Total Tax</th>
                    <th className="px-4 py-3 text-center">Transactions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {hsn.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">No HSN data found for the selected range.</td>
                    </tr>
                  ) : (
                    hsn.map(h => (
                      <tr key={h.hsn_sac_code} className="hover:bg-gray-50">
                        <td className="px-4 py-3.5 font-mono font-medium text-gray-700">{h.hsn_sac_code}</td>
                        <td className="px-4 py-3.5 text-gray-600">{h.description}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-gray-700">₹{h.total_taxable_value.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-gray-600">₹{h.total_cgst.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-gray-600">₹{h.total_sgst.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-gray-600">₹{h.total_igst.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-800">₹{h.total_tax.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-center text-gray-500">{h.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto pr-1">
            {/* Export options card */}
            <div className="bg-white rounded-xl border border-gray-250 shadow-sm p-6 flex flex-col gap-4 h-fit">
              <div className="flex items-center gap-2 text-gray-800 font-semibold border-b pb-3">
                <IconFileText size={20} className="text-blue-600" />
                <h2>GSTR-1 Offline Export</h2>
              </div>
              <p className="text-[13px] text-gray-500">
                Choose the month and year of the return period. The file will be exported as a government-compliant JSON file.
              </p>

              <div className="space-y-3.5 pt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold uppercase text-gray-400">Return Month</label>
                  <select
                    value={exportMonth}
                    onChange={e => setExportMonth(e.target.value)}
                    className="border border-gray-300 rounded-lg p-2 text-[13px] focus:outline-none focus:border-blue-500 text-gray-700"
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(m => (
                      <option key={m} value={m}>
                        {new Date(0, parseInt(m) - 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold uppercase text-gray-400">Return Year</label>
                  <select
                    value={exportYear}
                    onChange={e => setExportYear(e.target.value)}
                    className="border border-gray-300 rounded-lg p-2 text-[13px] focus:outline-none focus:border-blue-500 text-gray-700"
                  >
                    {['2025', '2026', '2027'].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {exportError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start gap-2 text-[12.5px] mt-2">
                  <IconAlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{exportError}</span>
                </div>
              )}

              {exportSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg flex items-start gap-2 text-[12.5px] mt-2">
                  <IconCircleCheck size={16} className="mt-0.5 flex-shrink-0" />
                  <span>JSON File exported successfully! You can upload this directly on the government portal.</span>
                </div>
              )}

              <button
                type="button"
                disabled={exporting}
                onClick={handleExportGstr1}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 px-4 font-semibold text-[13.5px] flex items-center justify-center gap-2 transition-colors mt-2"
              >
                <IconDownload size={18} />
                {exporting ? 'Generating JSON...' : 'Download GSTR-1 JSON'}
              </button>
            </div>

            {/* Instruction / Help Box */}
            <div className="bg-white rounded-xl border border-gray-250 shadow-sm p-6 col-span-2 space-y-4">
              <div className="flex items-center gap-2 text-gray-800 font-semibold border-b pb-3">
                <IconReceipt size={20} className="text-emerald-600" />
                <h2>How to Upload your GSTR-1 to the GST Portal</h2>
              </div>
              <div className="text-[13.5px] text-gray-600 space-y-3.5 pt-1">
                <p>
                  You do not need a paid API key to file your returns. Use the exported JSON file with the official government portal for 100% free filing:
                </p>
                <ol className="list-decimal list-inside space-y-2 pl-1">
                  <li>Click <strong>Download GSTR-1 JSON</strong> on the left to download the tax utility file for your selected period.</li>
                  <li>Log in to the official GST Portal at <a href="https://www.gst.gov.in" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline">www.gst.gov.in</a>.</li>
                  <li>Navigate to <strong>Services &gt; Returns &gt; Returns Dashboard</strong>.</li>
                  <li>Select the Financial Year and Month of the filing, and click <strong>Search</strong>.</li>
                  <li>Under GSTR-1 (Details of outward supplies), click on the <strong>Prepare Offline</strong> button.</li>
                  <li>Go to the <strong>Upload</strong> tab, click <strong>Choose File</strong>, and upload the JSON file you downloaded from this ERP.</li>
                  <li>Wait 1-2 minutes for processing. All B2B, B2C invoices, and HSN summaries will be automatically imported.</li>
                  <li>Preview the tax summary, sign, and file!</li>
                </ol>
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-[13px] leading-relaxed">
                  <strong>Reconciliation Tip:</strong> Before filing, always check the <strong>Sales Register</strong> and <strong>HSN Summary</strong> tables in this dashboard to verify that all tax values match the GSTR-1 summaries.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
