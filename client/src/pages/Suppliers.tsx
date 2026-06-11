import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconBuildingStore, IconPlus, IconSearch,
  IconEye, IconEdit, IconPhone, IconMail,
} from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';
import type { Supplier } from '../types';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/suppliers', { params: { search } })
      .then(r => {
        const raw = r.data.data ?? r.data ?? [];
        const mapped = (raw as any[]).map(s => ({
          id: s.supplier_id ?? s.id,
          name: s.name,
          contactPerson: s.contact_person ?? s.contactPerson ?? '—',
          phone: s.phone,
          email: s.email,
          gstin: s.gstin,
          address: s.address,
        }));
        setSuppliers(mapped);
      })
      .catch(() => setSuppliers([]))
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
        icon={<IconBuildingStore size={28} />}
        title="Suppliers"
        subtitle="Manage your supplier and vendor directory"
        backLabel="Back"
        backPath="/"
        action={
          <Link to="/suppliers/new"
            className="flex items-center gap-1.5 bg-white text-[#1a3480] text-[13px] font-semibold px-3 py-1.5 rounded-lg">
            <IconPlus size={15} /> Add Supplier
          </Link>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <p className="text-[13px] text-gray-500">{suppliers.length} suppliers registered</p>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-[34px] w-[240px]">
            <IconSearch size={14} className="text-gray-400 flex-shrink-0" />
            <input type="text" placeholder="Search supplier, GSTIN..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="outline-none border-none text-[13px] text-gray-700 placeholder:text-gray-400 w-full" />
          </div>
        </div>

        <div className="overflow-x-auto flex-1 overflow-y-auto no-scrollbar">
          <table className="erp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Supplier Name</th>
                <th>Contact Person</th>
                <th>Phone</th>
                <th>Email</th>
                <th>GSTIN</th>
                <th>Address</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">No suppliers found</td></tr>
              ) : (
                suppliers.map((s, i) => (
                  <tr key={s.id}>
                    <td className="text-gray-400 text-[12px]">{i + 1}</td>
                    <td className="font-medium text-[13px]">{s.name}</td>
                    <td className="text-[12px] text-gray-600">{s.contactPerson ?? '—'}</td>
                    <td>
                      <Link to="/tel:${s.phone}"
                        className="flex items-center gap-1 text-[12px] text-blue-600 hover:underline">
                        <IconPhone size={12} />{s.phone}
                      </Link>
                    </td>
                    <td>
                      {s.email ? (
                        <Link to="/mailto:${s.email}"
                          className="flex items-center gap-1 text-[12px] text-blue-600 hover:underline">
                          <IconMail size={12} />{s.email}
                        </Link>
                      ) : <span className="text-gray-400 text-[12px]">—</span>}
                    </td>
                    <td className="font-mono text-[11px] text-gray-500">{s.gstin ?? '—'}</td>
                    <td className="text-[12px] text-gray-500 max-w-[180px] truncate">{s.address ?? '—'}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <Link to={"/suppliers/" + s.id}
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors">
                          <IconEye size={14} />
                        </Link>
                        <Link to={"/suppliers/" + s.id + "/edit"}
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


