import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconFileText, IconPlus, IconSearch, IconEye, IconEdit, IconFileInvoice, IconPrinter, IconTrash,
} from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';
import type { Quotation } from '../types';

type QStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

const STATUS_FILTERS = [
  { label: 'All',      value: 'all' },
  { label: 'Draft',    value: 'draft' },
  { label: 'Sent',     value: 'sent' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Expired',  value: 'expired' },
];

const statusClass: Record<QStatus, string> = {
  draft:    'pill pill-gray',
  sent:     'pill pill-blue',
  accepted: 'pill pill-green',
  rejected: 'pill pill-red',
  expired:  'pill pill-amber',
};

export default function Quotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [filter, setFilter]         = useState('all');
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/quotations', { params: { status: filter === 'all' ? undefined : filter, search } })
      .then(r => {
        const raw = r.data.data ?? r.data ?? [];
        const mapped = (raw as any[]).map(q => ({
          id: q.quote_id ?? q.id,
          quotationNumber: q.quote_number ?? q.quotationNumber,
          customerName: q.customer?.name ?? q.customerName ?? '—',
          quotationDate: q.quote_date ?? q.quotationDate,
          validUntil: q.valid_until ?? q.validUntil,
          grandTotal: Number(q.total_amount ?? q.grandTotal ?? 0),
          status: q.status,
          items: q.items ?? [],
        }));
        setQuotations(mapped);
      })
      .catch(() => setQuotations([]))
      .finally(() => setLoading(false));
  }, [filter, search]);

  const convertToInvoice = async (id: number) => {
    try {
      const res = await api.post(`/quotations/${id}/convert`);
      window.location.href = `/sales/${res.data.invoiceId}`;
    } catch {
      alert('Failed to convert quotation to invoice');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this quotation?')) return;
    try {
      await api.delete(`/quotations/${id}`);
      setQuotations(prev => prev.filter(q => q.id !== id));
    } catch {
      alert('Failed to delete quotation');
    }
  };

  return (
    <div className="page-quotations max-w-[1600px] w-full mx-auto px-4 relative flex-1 min-h-0 flex flex-col gap-4 pb-4 lg:pb-0">
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
          background-color: #fcfdfe;
          box-shadow: inset 0 -1px 0 #e2e8f0;
        }
        .page-banner {
          margin-bottom: 0px !important;
        }
      `}</style>

      <PageBanner
        icon={<IconFileText size={28} />}
        title="Quotations"
        subtitle="Create and manage customer quotations"
        backLabel="Back"
        backPath="/"
        action={
          <Link to="/quotations/new"
            className="flex items-center gap-1.5 bg-white text-[#1a3480] text-[13px] font-semibold px-3 py-1.5 rounded-lg">
            <IconPlus size={15} /> New Quotation
          </Link>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 border-b border-gray-100 gap-4 bg-gray-50/40 shrink-0">
          <div data-tabs="6" className="flex items-center bg-slate-100/85 p-0.5 rounded-lg border border-slate-200/50 overflow-x-auto no-scrollbar flex-nowrap max-w-full whitespace-nowrap shrink-0 segment-control">
            {STATUS_FILTERS.map(f => (
              <button key={f.value} onClick={() => setFilter(f.value)}
                className={`px-3.5 py-1.5 rounded-md text-[12px] font-bold transition-all duration-200 cursor-pointer active:scale-95 shrink-0 ${
                  filter === f.value ? 'bg-[#1a3480] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-[34px] w-full sm:w-[240px]">
            <IconSearch size={14} className="text-gray-400 flex-shrink-0" />
            <input type="text" placeholder="Search quotation, customer..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="outline-none border-none text-[13px] text-gray-700 placeholder:text-gray-400 w-full" />
          </div>
        </div>

        <div className="overflow-x-auto flex-1 overflow-y-auto no-scrollbar">
          <table className="w-full text-[13px] text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 text-gray-500 font-bold uppercase tracking-wider text-[11px] border-b border-gray-100">
                <th className="py-3.5 px-5">Quotation #</th>
                <th className="py-3.5 px-5">Customer</th>
                <th className="py-3.5 px-5">Date</th>
                <th className="py-3.5 px-5">Valid Until</th>
                <th className="py-3.5 px-5 text-right">Total</th>
                <th className="py-3.5 px-5 text-center">Status</th>
                <th className="py-3.5 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : quotations.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No quotations found</td></tr>
              ) : (
                quotations.map(q => (
                  <tr key={q.id} className="hover:bg-blue-50/30 transition-colors duration-150">
                    <td className="py-3.5 px-5 font-bold">
                      <Link to={"/quotations/" + q.id} className="text-blue-700 hover:text-blue-900 hover:underline">
                        {q.quotationNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-5 font-medium text-gray-800">{q.customerName}</td>
                    <td className="py-3.5 px-5 text-gray-500">
                      {new Date(q.quotationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-5 text-gray-500">
                      {new Date(q.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-5 text-right font-semibold text-gray-800 text-[14px]">
                      ₹{q.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-5 text-center"><span className={statusClass[q.status]}>{q.status}</span></td>
                    <td className="py-3.5 px-5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link to={"/quotations/" + q.id}
                          className="p-1.5 rounded-lg bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 border border-gray-200 hover:border-blue-200 shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-95" title="View">
                          <IconEye size={14} />
                        </Link>
                        <Link to={"/quotations/" + q.id + "/edit"}
                          className="p-1.5 rounded-lg bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 border border-gray-200 hover:border-blue-200 shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-95" title="Edit">
                          <IconEdit size={14} />
                        </Link>
                        <button
                          className="p-1.5 rounded-lg bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 border border-gray-200 hover:border-blue-200 shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                          title="Print"
                          onClick={() => window.open(`/quotations/${q.id}?print=true`, '_blank')}
                        >
                          <IconPrinter size={14} />
                        </button>
                        {q.status === 'accepted' && (
                          <button onClick={() => convertToInvoice(q.id)}
                            className="p-1.5 rounded-lg bg-white text-green-650 hover:bg-green-50 transition-all duration-200 border border-green-200 shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-95 cursor-pointer" title="Convert to Invoice">
                            <IconFileInvoice size={14} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(q.id)}
                          className="p-1.5 rounded-lg bg-white text-red-500 hover:bg-red-50 transition-all duration-200 border border-red-200 shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-95 cursor-pointer" title="Delete">
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


