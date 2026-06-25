import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';
import {
  IconMapPin, IconPlus, IconSearch,
  IconEdit, IconPhone, IconMail, IconToggleLeft, IconToggleRight, IconEye,
} from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';

interface Location {
  id: number;
  name: string;
  type: 'branch' | 'warehouse' | 'service-center';
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  email?: string;
  manager?: string;
  isActive: boolean;
}

const typeClass: Record<Location['type'], string> = {
  branch:          'pill pill-blue',
  warehouse:       'pill pill-purple',
  'service-center':'pill pill-teal',
};

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/locations', { params: { search } })
      .then(r => {
        const raw = r.data.data ?? r.data ?? [];
        const mapped = (raw as any[]).map(loc => ({
          id: loc.location_id ?? loc.id,
          name: loc.name,
          type: (loc.is_main ? 'service-center' : 'branch') as any,
          address: loc.address ?? '',
          city: loc.city ?? 'Nagapattinam',
          state: loc.state ?? 'Tamil Nadu',
          pincode: loc.pincode ?? '611001',
          phone: loc.phone ?? '',
          manager: loc.manager ?? 'Manager',
          isActive: loc.is_active ?? loc.isActive ?? true,
          email: loc.email,
        }));
        setLocations(mapped);
      })
      .catch(() => setLocations([]))
      .finally(() => setLoading(false));
  }, [search]);

  const toggleActive = async (id: number, current: boolean) => {
    try {
      await api.put(`/locations/${id}`, { is_active: !current });
      setLocations(prev =>
        prev.map(l => (l.id === id ? { ...l, isActive: !current } : l))
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
        icon={<IconMapPin size={28} />}
        title="Locations"
        subtitle="Manage branches, warehouses and service centers"
        backLabel="Back"
        backPath="/"
        action={
          <Link to="/locations/new"
            className="flex items-center gap-1.5 bg-white text-[#1a3480] text-[13px] font-semibold px-3 py-1.5 rounded-lg">
            <IconPlus size={15} /> Add Location
          </Link>
        }
      />

      {/* Location cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Total',         value: locations.length,                         bg: '#eff6ff', color: '#1a3480' },
          { label: 'Active',        value: locations.filter(l => l.isActive).length,  bg: '#f0fdf4', color: '#16a34a' },
          { label: 'Inactive',      value: locations.filter(l => !l.isActive).length, bg: '#fef2f2', color: '#dc2626' },
        ].map(({ label, value, bg, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <IconMapPin size={20} color={color} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{label} Locations</p>
              <p className="text-[22px] font-semibold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-gray-50 gap-3">
          <p className="text-[13px] text-gray-500">{locations.length} locations registered</p>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-[34px] w-full sm:w-[240px]">
            <IconSearch size={14} className="text-gray-400 flex-shrink-0" />
            <input type="text" placeholder="Search location, city..."
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
                <th>Type</th>
                <th>Address</th>
                <th>City / State</th>
                <th>Phone</th>
                <th>Manager</th>
                <th className="text-center">Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : locations.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">No locations found</td></tr>
              ) : locations.map((loc, i) => (
                <tr key={loc.id}>
                  <td className="text-gray-400 text-[12px]">{i + 1}</td>
                  <td className="font-medium text-[13px]">{loc.name}</td>
                  <td><span className={typeClass[loc.type]}>{loc.type}</span></td>
                  <td className="text-[12px] text-gray-500 max-w-[160px] truncate">{loc.address}</td>
                  <td className="text-[12px] text-gray-600">{loc.city}, {loc.state} — {loc.pincode}</td>
                  <td>
                    {loc.phone ? (
                      <Link to="/tel:${loc.phone}"
                        className="flex items-center gap-1 text-[12px] text-blue-600 hover:underline">
                        <IconPhone size={11} />{loc.phone}
                      </Link>
                    ) : <span className="text-gray-300 text-[12px]">—</span>}
                  </td>
                  <td className="text-[12px] text-gray-600">{loc.manager ?? '—'}</td>
                  <td className="text-center">
                    <button onClick={() => toggleActive(loc.id, loc.isActive)}
                      className="flex items-center gap-1 mx-auto transition-colors"
                      title={loc.isActive ? 'Click to deactivate' : 'Click to activate'}>
                      {loc.isActive
                        ? <IconToggleRight size={24} color="#16a34a" />
                        : <IconToggleLeft size={24} color="#9ca3af" />}
                    </button>
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-1.5">
                      {loc.email && (
                        <Link to="/mailto:${loc.email}"
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors">
                          <IconMail size={14} />
                        </Link>
                      )}
                      <Link to={"/locations/" + loc.id}
                        className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors" title="View">
                        <IconEye size={14} />
                      </Link>
                      <Link to={"/locations/" + loc.id + "/edit"}
                        className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors" title="Edit">
                        <IconEdit size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



