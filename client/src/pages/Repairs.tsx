import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconTool, IconPlus, IconSearch, IconEye, IconEdit, IconPrinter,
} from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';
import type { Repair, RepairStatus } from '../types';

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Received', value: 'received' },
  { label: 'Diagnosed', value: 'diagnosed' },
  { label: 'In Repair', value: 'in repair' },
  { label: 'Waiting Parts', value: 'waiting parts' },
  { label: 'Completed', value: 'completed' },
  { label: 'Delivered', value: 'delivered' },
];

const statusClass: Record<RepairStatus, string> = {
  'received': 'pill pill-amber',
  'diagnosed': 'pill pill-gray',
  'in repair': 'pill pill-blue',
  'waiting parts': 'pill pill-purple',
  'completed': 'pill pill-green',
  'delivered': 'pill pill-teal',
  'cancelled': 'pill pill-red',
};

export default function Repairs() {
  const fromDashboard = typeof window !== 'undefined' && window.location.search.includes('dashboard');
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [filter, setFilter] = useState(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      return q.get('status') || 'all';
    }
    return 'all';
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/repairs', { params: { status: filter === 'all' ? undefined : filter, search } })
      .then(r => {
        const raw = r.data.data ?? r.data ?? [];
        const mapped = (raw as any[]).map(rep => {
          const rxDate = rep.received_date ?? rep.receivedAt;
          const days = rxDate ? Math.floor((Date.now() - new Date(rxDate).getTime()) / (86400000)) : 0;
          return {
            id: rep.repair_id ?? rep.id,
            ticketNumber: rep.ticket_number ?? rep.ticketNumber,
            customerName: rep.customer?.name ?? rep.customerName ?? '—',
            customerPhone: rep.customer?.phone ?? rep.customerPhone ?? '—',
            product: rep.product_type ?? rep.product ?? '—',
            issue: rep.problem_description ?? rep.issue ?? '—',
            technicianName: rep.assigned_technician?.name ?? rep.technicianName ?? '—',
            status: rep.repair_status ?? rep.status ?? 'received',
            brand: rep.brand_name ?? rep.brand?.name ?? rep.brand ?? '—',
            model: rep.model_number ?? rep.model ?? '—',
            estimatedCost: Number(rep.estimated_cost ?? rep.estimatedCost ?? 0),
            actualCost: Number(rep.actual_cost ?? rep.actualCost ?? 0),
            receivedAt: rep.received_date ?? rep.receivedAt ?? '',
            updatedAt: rep.updated_at ?? rep.updatedAt ?? '',
            age: `${days} days`,
          };
        });
        setRepairs(mapped);
      })
      .catch(() => setRepairs([]))
      .finally(() => setLoading(false));
  }, [filter, search]);

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
        icon={<IconTool size={28} />}
        title="Repairs"
        subtitle="Manage repair tickets and track job status"
        backLabel={fromDashboard ? "Back to Dashboard" : "Back"}
        backPath="/"
        action={
          <Link to="/repairs/new"
            className="flex items-center gap-1.5 bg-white text-[#1a3480] text-[13px] font-semibold px-3 py-1.5 rounded-lg"
          >
            <IconPlus size={15} /> New Repair
          </Link>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-gray-50 gap-3">
          <div className="overflow-x-auto no-scrollbar scroll-container w-full sm:w-auto">
            <div className="flex border border-gray-200 rounded-lg overflow-hidden segment-control min-w-max">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={[
                    'px-3 py-1.5 text-[12px] font-medium transition-all cursor-pointer capitalize flex-1 text-center',
                    filter === f.value
                      ? 'bg-[#1a3480] text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-[34px] w-full sm:w-[240px]">
            <IconSearch size={14} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search ticket, customer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="outline-none border-none text-[13px] text-gray-700 placeholder:text-gray-400 w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto flex-1 overflow-y-auto no-scrollbar">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Product</th>
                <th>Issue</th>
                <th>Technician</th>
                <th>Status</th>
                <th>Age</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : repairs.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">No repairs found</td></tr>
              ) : (
                repairs.map(r => (
                  <tr key={r.id}>
                    <td>
                      <Link to={"/repairs/" + r.id} className="text-blue-600 text-[12px] hover:underline font-medium">
                        {r.ticketNumber}
                      </Link>
                    </td>
                    <td className="text-[13px]">{r.customerName}</td>
                    <td className="text-[12px] text-gray-500">{r.customerPhone}</td>
                    <td className="text-[13px]">{r.product}</td>
                    <td className="text-[12px] text-gray-600 max-w-[160px] truncate">{r.issue}</td>
                    <td className="text-[12px]">{r.technicianName ?? '—'}</td>
                    <td><span className={statusClass[r.status]}>{r.status}</span></td>
                    <td className="text-amber-500 font-medium text-[12px]">{r.age}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <Link to={"/repairs/" + r.id}
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
                          title="View"
                        >
                          <IconEye size={14} />
                        </Link>
                        <Link to={"/repairs/" + r.id + "/edit"}
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
                          title="Edit"
                        >
                          <IconEdit size={14} />
                        </Link>
                        <button
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
                          title="Print"
                          onClick={() => window.open(`/api/repairs/${r.id}/print`, '_blank')}
                        >
                          <IconPrinter size={14} />
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
