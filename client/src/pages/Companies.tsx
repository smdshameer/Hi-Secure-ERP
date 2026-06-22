import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';
import {
  IconBuilding, IconPlus, IconSearch,
  IconEdit, IconPhone, IconMail, IconWorld,
  IconCheck, IconToggleRight, IconToggleLeft,
} from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';

interface Company {
  id: number;
  name: string;
  legalName: string;
  gstin?: string;
  pan?: string;
  phone: string;
  email?: string;
  website?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  stateCode: string;
  isDefault: boolean;
  isActive: boolean;
  logo?: string;
  financialYearStart: string;
}

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/companies', { params: { search } })
      .then(r => {
        const raw = r.data.data ?? r.data ?? [];
        const mapped = (raw as any[]).map(c => ({
          id: c.company_id ?? c.id,
          name: c.name,
          legalName: c.code ?? c.legalName ?? '—',
          address: c.address ?? '',
          city: c.city ?? 'Nagapattinam',
          state: c.state ?? 'Tamil Nadu',
          stateCode: c.stateCode ?? '33',
          pincode: c.pincode ?? '611001',
          phone: c.phone ?? '',
          email: c.email ?? '',
          gstin: c.gstin ?? '',
          pan: c.pan ?? '',
          isDefault: c.is_active ?? c.isDefault ?? false,
          financialYearStart: c.financialYearStart ?? 'April 1st',
          isActive: c.is_active ?? c.isActive ?? true,
        }));
        setCompanies(mapped);
      })
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, [search]);

  const setDefault = async (id: number) => {
    try {
      await api.put(`/companies/${id}`, { is_active: true });
      setCompanies(prev => prev.map(c => ({ ...c, isDefault: c.id === id })));
    } catch {
      alert('Failed to set default company');
    }
  };

  const toggleActive = async (id: number, current: boolean) => {
    try {
      await api.put(`/companies/${id}`, { is_active: !current });
      setCompanies(prev =>
        prev.map(c => (c.id === id ? { ...c, isActive: !current } : c))
      );
    } catch {
      alert('Failed to update status');
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
        icon={<IconBuilding size={28} />}
        title="Companies"
        subtitle="Manage multiple companies and business entities"
        backLabel="Back"
        backPath="/"
        action={
          <Link to="/companies/new"
            className="flex items-center gap-1.5 bg-white text-[#1a3480] text-[13px] font-semibold px-3 py-1.5 rounded-lg">
            <IconPlus size={15} /> Add Company
          </Link>
        }
      />

      {/* Company cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {loading ? (
          <div className="col-span-2 text-center py-8 text-gray-400">Loading companies...</div>
        ) : companies.length === 0 ? (
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
            <IconBuilding size={40} color="#e5e7eb" />
            <p className="text-[14px] text-gray-400">No companies found</p>
            <Link to="/companies/new"
              className="flex items-center gap-1.5 text-white text-[13px] font-medium px-4 py-2 rounded-lg"
              style={{ background: '#1a3480' }}>
              <IconPlus size={14} /> Add First Company
            </Link>
          </div>
        ) : companies.map(c => (
          <div key={c.id}
            className={[
              'bg-white rounded-xl border shadow-sm p-5 relative',
              c.isDefault ? 'border-[#1a3480]' : 'border-gray-100',
            ].join(' ')}>

            {/* Default badge */}
            {c.isDefault && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#1a3480] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                <IconCheck size={10} /> Default
              </div>
            )}

            {/* Header */}
            <Link to={"/companies/" + c.id} className="flex items-start gap-3 mb-4 group block">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                {c.logo
                  ? <img src={c.logo} alt={c.name} className="w-10 h-10 object-contain rounded" />
                  : <IconBuilding size={24} color="#1a3480" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{c.name}</h3>
                <p className="text-[12px] text-gray-400 truncate">{c.legalName}</p>
              </div>
            </Link>

            {/* Details grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mb-4">
              {c.gstin && (
                <div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase">GSTIN</p>
                  <p className="text-[12px] font-mono text-gray-700">{c.gstin}</p>
                </div>
              )}
              {c.pan && (
                <div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase">PAN</p>
                  <p className="text-[12px] font-mono text-gray-700">{c.pan}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-gray-400 font-medium uppercase">State</p>
                <p className="text-[12px] text-gray-700">{c.state} ({c.stateCode})</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium uppercase">FY Start</p>
                <p className="text-[12px] text-gray-700">{c.financialYearStart}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-gray-400 font-medium uppercase">Address</p>
                <p className="text-[12px] text-gray-700">{c.address}, {c.city} — {c.pincode}</p>
              </div>
            </div>

            {/* Contact row */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <Link to="/tel:${c.phone}"
                className="flex items-center gap-1 text-[12px] text-blue-600 hover:underline">
                <IconPhone size={12} />{c.phone}
              </Link>
              {c.email && (
                <Link to="/mailto:${c.email}"
                  className="flex items-center gap-1 text-[12px] text-blue-600 hover:underline">
                  <IconMail size={12} />{c.email}
                </Link>
              )}
              {c.website && (
                <Link to={c.website} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-[12px] text-blue-600 hover:underline">
                  <IconWorld size={12} />{c.website}
                </Link>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
              {!c.isDefault && (
                <button onClick={() => setDefault(c.id)}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                  <IconCheck size={13} /> Set Default
                </button>
              )}
              <Link to={"/companies/" + c.id + "/edit"}
                className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                <IconEdit size={13} /> Edit
              </Link>
              <button onClick={() => toggleActive(c.id, c.isActive)}
                className="flex items-center gap-1 ml-auto transition-colors"
                title={c.isActive ? 'Active — click to deactivate' : 'Inactive — click to activate'}>
                {c.isActive
                  ? <><IconToggleRight size={22} color="#16a34a" /><span className="text-[11px] text-green-600">Active</span></>
                  : <><IconToggleLeft size={22} color="#9ca3af" /><span className="text-[11px] text-gray-400">Inactive</span></>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Search bar when many companies */}
      {companies.length > 4 && (
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-[36px] w-[260px] mb-4 bg-white">
          <IconSearch size={14} className="text-gray-400 flex-shrink-0" />
          <input type="text" placeholder="Search company..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="outline-none border-none text-[13px] text-gray-700 placeholder:text-gray-400 w-full" />
        </div>
      )}
    </div>
  );
}



