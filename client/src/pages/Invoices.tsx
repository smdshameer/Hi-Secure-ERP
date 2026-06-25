import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconFileInvoice, IconPlus, IconFileExport,
  IconEye, IconPrinter, IconSearch, IconEdit
} from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';
import type { Invoice, InvoiceStatus, PaymentStatus } from '../types';

const STATUS_FILTERS: { label: string; value: string; color: string }[] = [
  { label: 'All', value: 'all', color: '#6b7280' },
  { label: 'Draft', value: 'draft', color: '#f59e0b' },
  { label: 'Issued', value: 'issued', color: '#2563eb' },
  { label: 'Paid', value: 'paid', color: '#16a34a' },
  { label: 'Unpaid', value: 'unpaid', color: '#ef4444' },
  { label: 'Partial', value: 'partial', color: '#f59e0b' },
];

const invoiceStatusClass: Record<InvoiceStatus, string> = {
  draft: 'pill pill-gray',
  issued: 'pill pill-blue',
  paid: 'pill pill-green',
  partial: 'pill pill-amber',
  cancelled: 'pill pill-red',
};

const paymentStatusClass: Record<PaymentStatus, string> = {
  unpaid: 'pill pill-gray',
  paid: 'pill pill-green',
  partial: 'pill pill-amber',
};

export default function Invoices() {
  const fromDashboard = typeof window !== 'undefined' && window.location.search.includes('dashboard');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Fetch invoices matching search and status filter from server
    api.get('/invoices', { params: { search, status: filter === 'all' ? undefined : filter } })
      .then(r => {
        const raw = r.data.data ?? r.data ?? [];
        const mapped = (raw as any[]).map(inv => ({
          id: inv.invoice_id ?? inv.id,
          invoiceNumber: inv.invoice_number ?? inv.invoiceNumber,
          customerName: inv.customer?.name ?? inv.customerName ?? '—',
          invoiceDate: inv.invoice_date ?? inv.invoiceDate,
          dueDate: inv.due_date ?? inv.dueDate,
          grandTotal: Number(inv.grand_total ?? inv.grandTotal ?? 0),
          status: inv.status,
          paymentStatus: (inv.status === 'paid' ? 'paid' : (inv.status === 'partial' ? 'partial' : 'unpaid')) as any,
          placeOfSupply: inv.place_of_supply ?? inv.placeOfSupply ?? '',
          items: inv.items ?? [],
          subtotal: Number(inv.total_amount ?? inv.subtotal ?? 0),
          discountTotal: Number(inv.discount_total ?? inv.discountTotal ?? 0),
          cgst: Number(inv.cgst_amount ?? inv.cgst ?? 0),
          sgst: Number(inv.sgst_amount ?? inv.sgst ?? 0),
          igst: Number(inv.igst_amount ?? inv.igst ?? 0),
        }));
        setInvoices(mapped);
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [search, filter]);

  const filteredInvoices = invoices;


  const getBadgeClass = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'paid':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-250';
      case 'issued':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-250';
      case 'draft':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-slate-50 text-slate-650 border border-slate-200';
      case 'unpaid':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-250';
      case 'partial':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-250';
      case 'cancelled':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-250';
      default:
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-gray-50 text-gray-600 border border-gray-200';
    }
  };



  const getActiveTabClass = (val: string) => {
    switch (val) {
      case 'draft': return 'bg-white text-slate-700 shadow-sm border border-slate-250';
      case 'issued': return 'bg-white text-blue-700 shadow-sm border border-blue-200';
      case 'paid': return 'bg-white text-emerald-700 shadow-sm border border-emerald-200';
      case 'unpaid': return 'bg-white text-rose-700 shadow-sm border border-rose-200';
      case 'partial': return 'bg-white text-amber-700 shadow-sm border border-amber-200';
      default: return 'bg-white text-indigo-700 shadow-sm border border-indigo-200';
    }
  };

  return (
    <div className="max-w-[1600px] w-full mx-auto px-4 relative flex-1 min-h-0 flex flex-col gap-4 pb-4 lg:pb-0">
      <style>{`

        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        thead th {
          position: sticky;
          top: 0;
          z-index: 10;
          background-color: #fcfdfe !important;
          box-shadow: inset 0 -1px 0 #e2e8f0;
        }
        .page-banner {
          margin-bottom: 0px !important;
        }
      `}</style>

      <PageBanner
        icon={<IconFileInvoice size={28} />}
        title="Sales Invoices"
        subtitle="Manage and track all your sales invoices"
        backLabel={fromDashboard ? "Back to Dashboard" : "Back"}
        backPath="/"
        action={
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-[13px] px-3 py-1.5 rounded-lg transition-colors border border-transparent cursor-pointer">
              <IconFileExport size={15} /> Export to Excel
            </button>
            <Link to="/sales/new"
              className="flex items-center gap-1.5 bg-white text-[#1a3480] text-[13px] font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <IconPlus size={15} /> New Invoice
            </Link>
          </div>
        }
      />


      {/* FILTER & TABLE SECTION */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 border-b border-gray-100 gap-4 bg-gray-50/40 shrink-0">
          {/* Status filters segment control style */}
          <div className="flex items-center bg-slate-100/85 p-0.5 rounded-lg border border-slate-200/50 overflow-x-auto no-scrollbar flex-nowrap max-w-full whitespace-nowrap shrink-0 segment-control">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3.5 py-1.5 rounded-md text-[12px] font-bold transition-all duration-200 cursor-pointer active:scale-95 shrink-0 ${
                  filter === f.value
                    ? getActiveTabClass(f.value)
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 bg-white h-[34px] w-full sm:w-[280px] shadow-sm hover:border-gray-300 focus-within:border-blue-400 focus-within:shadow-[0_0_0_2px_rgba(59,130,246,0.12)] transition-all duration-200">
            <IconSearch size={14} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search invoice or customer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="outline-none border-none text-[12.5px] text-gray-700 placeholder:text-gray-400 w-full bg-transparent"
            />
          </div>
        </div>

        {/* Invoices List Table */}
        <div className="overflow-x-auto flex-1 overflow-y-auto no-scrollbar">
          <table className="w-full text-[13px] text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-gray-500 font-bold uppercase tracking-wider text-[11px] border-b border-gray-100">
                <th className="py-3.5 px-5">Invoice No</th>
                <th className="py-3.5 px-5">Customer Name</th>
                <th className="py-3.5 px-5">Invoice Date</th>
                <th className="py-3.5 px-5">Due Date</th>
                <th className="py-3.5 px-5 text-right">Grand Total</th>
                <th className="py-3.5 px-5 text-center">Status</th>
                <th className="py-3.5 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-gray-400 italic">
                    No invoices found matching the criteria
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const isOverdue = inv.status !== 'paid' && inv.status !== 'draft' && inv.dueDate && new Date(inv.dueDate) < new Date();
                  
                  return (
                    <tr key={inv.id} className="hover:bg-blue-50/30 transition-colors duration-150">
                      {/* Invoice No */}
                      <td className="py-3.5 px-5 font-bold text-blue-700">
                        {inv.invoiceNumber}
                      </td>
                      
                      {/* Customer Name */}
                      <td className="py-3.5 px-5 font-medium text-gray-800">
                        {inv.customerName}
                      </td>
                      
                      {/* Invoice Date */}
                      <td className="py-3.5 px-5 text-gray-500">
                        {new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      
                      {/* Due Date */}
                      <td className="py-3.5 px-5">
                        {inv.dueDate ? (
                          <span className={isOverdue ? 'text-rose-600 font-semibold flex items-center gap-1' : 'text-gray-500'}>
                            {new Date(inv.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {isOverdue && <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Overdue</span>}
                          </span>
                        ) : '—'}
                      </td>
                      
                      {/* Grand Total */}
                      <td className="py-3.5 px-5 text-right font-extrabold text-gray-800 text-[14px]">
                        ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      
                      {/* Status badge */}
                      <td className="py-3.5 px-5 text-center">
                        <span className={getBadgeClass(inv.status)}>
                          {inv.status}
                        </span>
                      </td>
                      
                      {/* Actions */}
                      <td className="py-3.5 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* View */}
                          <Link 
                            to={`/sales/${inv.id}`}
                            className="p-1.5 rounded-lg bg-white text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 border border-gray-200 hover:border-indigo-200 shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-95"
                            title="View Preview"
                          >
                            <IconEye size={14} />
                          </Link>
                          
                          {/* Edit */}
                          <Link 
                            to={`/sales/${inv.id}/edit`}
                            className="p-1.5 rounded-lg bg-white text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition-all duration-200 border border-gray-200 hover:border-violet-200 shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-95"
                            title="Edit Invoice"
                          >
                            <IconEdit size={14} />
                          </Link>
                          
                          {/* Print */}
                          <button
                            onClick={() => window.open(`/sales/${inv.id}?print=true`, '_blank')}
                            className="p-1.5 rounded-lg bg-white text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-200 border border-gray-200 hover:border-emerald-250 shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                            title="Direct Print"
                          >
                            <IconPrinter size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
