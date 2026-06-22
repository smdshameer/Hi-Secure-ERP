import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconFileText, IconPlus, IconSearch, IconEye, IconEdit, IconFileInvoice, IconPrinter,
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-gray-50 gap-3">
          <div className="overflow-x-auto no-scrollbar scroll-container w-full sm:w-auto">
            <div className="flex border border-gray-200 rounded-lg overflow-hidden segment-control min-w-max">
              {STATUS_FILTERS.map(f => (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className={[
                    'px-3 py-1.5 text-[12px] font-medium transition-all cursor-pointer capitalize flex-1 text-center',
                    filter === f.value
                      ? 'bg-[#1a3480] text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50',
                  ].join(' ')}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-[34px] w-full sm:w-[240px]">
            <IconSearch size={14} className="text-gray-400 flex-shrink-0" />
            <input type="text" placeholder="Search quotation, customer..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="outline-none border-none text-[13px] text-gray-700 placeholder:text-gray-400 w-full" />
          </div>
        </div>

        <div className="overflow-x-auto flex-1 overflow-y-auto no-scrollbar">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Quotation #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Valid Until</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : quotations.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No quotations found</td></tr>
              ) : (
                quotations.map(q => (
                  <tr key={q.id}>
                    <td className="font-medium text-[13px]">{q.quotationNumber}</td>
                    <td className="text-[13px]">{q.customerName}</td>
                    <td className="text-[12px] text-gray-500">
                      {new Date(q.quotationDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="text-[12px] text-gray-500">
                      {new Date(q.validUntil).toLocaleDateString('en-IN')}
                    </td>
                    <td className="text-right font-semibold text-[13px]">
                      ₹{q.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td><span className={statusClass[q.status]}>{q.status}</span></td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <Link to={"/quotations/" + q.id}
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors" title="View">
                          <IconEye size={14} />
                        </Link>
                        <Link to={"/quotations/" + q.id + "/edit"}
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors" title="Edit">
                          <IconEdit size={14} />
                        </Link>
                        <button
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
                          title="Print"
                          onClick={() => window.open(`/quotations/${q.id}?print=true`, '_blank')}
                        >
                          <IconPrinter size={14} />
                        </button>
                        {q.status === 'accepted' && (
                          <button onClick={() => convertToInvoice(q.id)}
                            className="p-1.5 rounded border border-green-200 text-green-600 hover:bg-green-50 transition-colors" title="Convert to Invoice">
                            <IconFileInvoice size={14} />
                          </button>
                        )}
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


