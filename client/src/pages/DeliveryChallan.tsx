import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconTruckDelivery, IconPlus, IconSearch, IconEye, IconEdit, IconPrinter } from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';
import type { DeliveryChallan } from '../types';

type DCStatus = 'draft' | 'dispatched' | 'delivered';

const STATUS_FILTERS = [
  { label: 'All',        value: 'all' },
  { label: 'Draft',      value: 'draft' },
  { label: 'Dispatched', value: 'dispatched' },
  { label: 'Delivered',  value: 'delivered' },
];

const statusClass: Record<DCStatus, string> = {
  draft:      'pill pill-gray',
  dispatched: 'pill pill-blue',
  delivered:  'pill pill-green',
};

export default function DeliveryChallanPage() {
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/delivery-challans', { params: { status: filter === 'all' ? undefined : filter, search } })
      .then(r => {
        const raw = r.data.data ?? r.data ?? [];
        const mapped = (raw as any[]).map(c => ({
          id: c.delivery_challan_id ?? c.id,
          challanNumber: c.challan_number ?? c.challanNumber,
          customerId: c.customer_id ?? c.customerId ?? 0,
          customerName: c.customer?.name ?? c.customerName ?? '—',
          challanDate: c.challan_date ?? c.challanDate,
          items: c.items ?? [],
          status: c.status,
        }));
        setChallans(mapped);
      })
      .catch(() => setChallans([]))
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
        icon={<IconTruckDelivery size={28} />}
        title="Delivery Challan"
        subtitle="Manage and track delivery challans"
        backLabel="Back"
        backPath="/"
        action={
          <Link to="/delivery-challans/new"
            className="flex items-center gap-1.5 bg-white text-[#1a3480] text-[13px] font-semibold px-3 py-1.5 rounded-lg">
            <IconPlus size={15} /> New Challan
          </Link>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 border-b border-gray-100 gap-4 bg-gray-50/40 shrink-0">
          <div className="overflow-x-auto no-scrollbar scroll-container w-full sm:w-auto">
            <div data-tabs="4" className="flex items-center bg-slate-100/85 p-0.5 rounded-lg border border-slate-200/50 overflow-x-auto no-scrollbar flex-nowrap max-w-full whitespace-nowrap shrink-0 segment-control">
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
          </div>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-[34px] w-full sm:w-[240px]">
            <IconSearch size={14} className="text-gray-400 flex-shrink-0" />
            <input type="text" placeholder="Search challan, customer..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="outline-none border-none text-[13px] text-gray-700 placeholder:text-gray-400 w-full" />
          </div>
        </div>

        <div className="overflow-x-auto flex-1 overflow-y-auto no-scrollbar">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Customer</th>
                <th>Challan Date</th>
                <th className="text-center">Items</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : challans.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No delivery challans found</td></tr>
              ) : (
                challans.map(c => (
                  <tr key={c.id}>
                    <td className="font-medium text-[13px]">{c.challanNumber}</td>
                    <td className="text-[13px]">{c.customerName}</td>
                    <td className="text-[12px] text-gray-500">
                      {new Date(c.challanDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="text-center text-[13px]">{c.items.length}</td>
                    <td><span className={statusClass[c.status]}>{c.status}</span></td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <Link to={"/delivery-challans/" + c.id}
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors">
                          <IconEye size={14} />
                        </Link>
                        <Link to={"/delivery-challans/" + c.id + "/edit"}
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors">
                          <IconEdit size={14} />
                        </Link>
                        <button
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
                          title="Print"
                          onClick={() => window.open(`/delivery-challans/${c.id}?print=true`, '_blank')}
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


