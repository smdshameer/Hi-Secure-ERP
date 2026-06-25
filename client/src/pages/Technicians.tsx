import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconCut, IconPlus, IconSearch, IconEye, IconEdit, IconPhone } from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';
import type { Technician } from '../types';

export default function Technicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/technicians', { params: { search } })
      .then(r => {
        const raw = r.data.data ?? r.data ?? [];
        const mapped = (raw as any[]).map(t => ({
          id: t.technician_id ?? t.id,
          name: t.name,
          phone: t.phone ?? '—',
          email: t.email ?? '—',
          specialization: t.specialization ?? '—',
          activeRepairs: t.activeRepairs ?? 0,
          completedRepairs: t.completedRepairs ?? 0,
          joinedAt: t.created_at ?? t.joinedAt,
        }));
        setTechnicians(mapped);
      })
      .catch(() => setTechnicians([]))
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
        icon={<IconCut size={28} />}
        title="Technicians"
        subtitle="Manage your repair technician team"
        backLabel="Back"
        backPath="/"
        action={
          <Link to="/technicians/new"
            className="flex items-center gap-1.5 bg-white text-[#1a3480] text-[13px] font-semibold px-3 py-1.5 rounded-lg">
            <IconPlus size={15} /> Add Technician
          </Link>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-gray-50 gap-3">
          <p className="text-[13px] text-gray-500">{technicians.length} technicians registered</p>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-[34px] w-full sm:w-[240px]">
            <IconSearch size={14} className="text-gray-400 flex-shrink-0" />
            <input type="text" placeholder="Search technician..."
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
                <th>Specialization</th>
                <th className="text-center">Active Repairs</th>
                <th className="text-center">Completed</th>
                <th>Joined</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : technicians.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">No technicians found</td></tr>
              ) : (
                technicians.map((t, i) => (
                  <tr key={t.id}>
                    <td className="text-gray-400 text-[12px]">{i + 1}</td>
                    <td className="font-medium text-[13px]">{t.name}</td>
                    <td>
                      <Link to="/tel:${t.phone}"
                        className="flex items-center gap-1 text-[12px] text-blue-600 hover:underline">
                        <IconPhone size={12} />{t.phone}
                      </Link>
                    </td>
                    <td className="text-[12px] text-gray-500">{t.email ?? '—'}</td>
                    <td><span className="pill pill-blue">{t.specialization}</span></td>
                    <td className="text-center">
                      <span className="font-semibold text-[13px] text-amber-600">{t.activeRepairs}</span>
                    </td>
                    <td className="text-center">
                      <span className="font-semibold text-[13px] text-green-600">{t.completedRepairs}</span>
                    </td>
                    <td className="text-[12px] text-gray-400">
                      {new Date(t.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <Link to={"/technicians/" + t.id}
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors">
                          <IconEye size={14} />
                        </Link>
                        <Link to={"/technicians/" + t.id + "/edit"}
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


