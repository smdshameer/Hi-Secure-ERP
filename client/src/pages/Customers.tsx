import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconUsers, IconPlus, IconSearch, IconEye, IconEdit, IconPhone, IconDownload } from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';
import type { Customer } from '../types';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const response = await api.get('/customers', { params: { search: search || undefined } });
      const rawCustomers = response.data.data ?? response.data ?? [];

      const headers = [
        'Customer Code',
        'Name',
        'Phone',
        'Email',
        'Contact Person',
        'Customer Type',
        'GSTIN',
        'Credit Limit',
        'Address',
        'City',
        'State',
        'Pincode',
        'Status',
        'Joined Date'
      ];

      const rows = rawCustomers.map((c: any) => [
        c.customer_code ?? '',
        c.name ?? '',
        c.phone ?? '',
        c.email ?? '',
        c.contact_person ?? '',
        c.customer_type ?? 'retail',
        c.gstin ?? '',
        c.credit_limit ?? 0,
        c.address ?? '',
        c.city ?? '',
        c.state ?? '',
        c.pincode ?? '',
        c.is_active !== false ? 'Active' : 'Inactive',
        c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : ''
      ]);

      const csvContent = [
        headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
        ...rows.map((r: any[]) => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\r\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `customers_export_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export customer data', error);
      alert('Failed to export customer data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    api.get('/customers', { params: { search } })
      .then(r => {
        const raw = r.data.data ?? r.data ?? [];
        const mapped = (raw as any[]).map(c => ({
          id: c.customer_id ?? c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          gstin: c.gstin,
          totalRepairs: c._count?.repairs ?? c.totalRepairs ?? 0,
          totalInvoices: c.totalInvoices ?? 0,
          createdAt: c.created_at ?? c.createdAt,
        }));
        setCustomers(mapped);
      })
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, [search]);

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
        icon={<IconUsers size={28} />}
        title="Customers"
        subtitle="Manage your customer database"
        backLabel="Back"
        backPath="/"
        action={
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-[13px] font-semibold px-3 py-1.5 rounded-lg transition-colors border border-transparent cursor-pointer disabled:opacity-50"
            >
              <IconDownload size={15} /> {exporting ? 'Exporting...' : 'Export'}
            </button>
            <Link to="/customers/new"
              className="flex items-center gap-1.5 bg-white text-[#1a3480] text-[13px] font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors shadow-sm">
              <IconPlus size={15} /> New Customer
            </Link>
          </div>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <p className="text-[13px] text-gray-500">{customers.length} customers registered</p>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-[34px] w-[240px]">
            <IconSearch size={14} className="text-gray-400 flex-shrink-0" />
            <input type="text" placeholder="Search by name, phone, email..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="outline-none border-none text-[13px] text-gray-700 placeholder:text-gray-400 w-full" />
          </div>
        </div>

        <div className="overflow-x-auto flex-1 overflow-y-auto no-scrollbar">
          <table className="erp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>GSTIN</th>
                <th className="text-center">Repairs</th>
                <th className="text-center">Invoices</th>
                <th>Joined</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">No customers found</td></tr>
              ) : (
                customers.map((c, i) => (
                  <tr key={c.id}>
                    <td className="text-gray-400 text-[12px]">{i + 1}</td>
                    <td className="font-medium text-[13px]">{c.name}</td>
                    <td>
                      <a href={"tel:" + c.phone}
                        className="flex items-center gap-1 text-[12px] text-blue-600 hover:underline">
                        <IconPhone size={12} />{c.phone}
                      </a>
                    </td>
                    <td className="text-[12px] text-gray-500">{c.email ?? '—'}</td>
                    <td className="text-[12px] text-gray-500 font-mono">{c.gstin ?? '—'}</td>
                    <td className="text-center text-[13px] font-medium text-blue-600">{c.totalRepairs}</td>
                    <td className="text-center text-[13px] font-medium text-blue-600">{c.totalInvoices}</td>
                    <td className="text-[12px] text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <Link to={"/customers/" + c.id}
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors">
                          <IconEye size={14} />
                        </Link>
                        <Link to={"/customers/" + c.id + "/edit"}
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors">
                          <IconEdit size={14} />
                        </Link>
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
