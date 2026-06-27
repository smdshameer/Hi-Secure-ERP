import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconHierarchy, IconPlus, IconSearch, IconEye,
  IconPhone, IconMail, IconCalendar, IconTag,
} from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';

interface CRMLead {
  id: number;
  name: string;
  phone: string;
  email?: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  value: number;
  assignedTo?: string;
  lastContact?: string;
  createdAt: string;
}

const STATUS_FILTERS = [
  { label: 'All',       value: 'all' },
  { label: 'New',       value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Proposal',  value: 'proposal' },
  { label: 'Won',       value: 'won' },
  { label: 'Lost',      value: 'lost' },
];

const statusClass: Record<CRMLead['status'], string> = {
  new:       'pill pill-blue',
  contacted: 'pill pill-amber',
  qualified: 'pill pill-purple',
  proposal:  'pill pill-teal',
  won:       'pill pill-green',
  lost:      'pill pill-red',
};

const PIPELINE_STAGES = ['new','contacted','qualified','proposal','won'] as const;
const stageColors: Record<string, string> = {
  new: '#2563eb', contacted: '#f59e0b',
  qualified: '#9333ea', proposal: '#0d9488', won: '#16a34a',
};

export default function CRM() {
  const fromDashboard = typeof window !== 'undefined' && window.location.search.includes('dashboard');
  const [leads, setLeads]   = useState<CRMLead[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView]     = useState<'list' | 'pipeline'>('list');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/crm/leads', { params: { status: filter === 'all' ? undefined : filter.toUpperCase(), search } })
      .then(r => {
        const d = r.data.data ?? r.data;
        const mapped = (Array.isArray(d) ? d : []).map((l: any) => ({
          id: l.lead_id,
          name: `${l.first_name} ${l.last_name || ''}`.trim(),
          phone: l.phone,
          email: l.email,
          source: l.source || 'Direct',
          status: (l.status || 'new').toLowerCase(),
          value: l.opportunities && l.opportunities.length > 0 
            ? l.opportunities.reduce((s: number, o: any) => s + (o.estimated_revenue || 0), 0)
            : 0,
          assignedTo: l.assignedUser ? l.assignedUser.full_name : undefined,
          lastContact: l.followUps && l.followUps.length > 0 ? l.followUps[0].scheduled_at : undefined,
          createdAt: l.created_at
        }));
        setLeads(mapped);
      })
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, [filter, search]);

  const byStage = (stage: string) => leads.filter(l => l.status === stage);
  const totalValue = leads.filter(l => l.status === 'won').reduce((s, l) => s + l.value, 0);

  return (
    <div className="page-crm max-w-[1600px] w-full mx-auto px-4 relative flex-1 min-h-0 flex flex-col gap-4 pb-4 lg:pb-0">
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
        icon={<IconHierarchy size={28} />}
        title="CRM"
        subtitle="Manage leads, follow-ups and customer relationships"
        backLabel={fromDashboard ? "Back to Dashboard" : "Back"}
        backPath="/"
        action={
          <Link to="/crm/new"
            className="flex items-center gap-1.5 bg-white text-[#1a3480] text-[13px] font-semibold px-3 py-1.5 rounded-lg">
            <IconPlus size={15} /> New Lead
          </Link>
        }
      />

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Leads',  value: leads.length,                                bg: '#eff6ff', color: '#1a3480' },
          { label: 'Active',       value: leads.filter(l => !['won','lost'].includes(l.status)).length, bg: '#fffbeb', color: '#d97706' },
          { label: 'Won',          value: leads.filter(l => l.status === 'won').length, bg: '#f0fdf4', color: '#16a34a' },
          { label: 'Won Value',    value: `₹${totalValue.toLocaleString('en-IN')}`,    bg: '#f0fdf4', color: '#16a34a' },
        ].map(({ label, value, bg, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <IconTag size={18} color={color} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{label}</p>
              <p className="text-[18px] font-semibold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* View toggle + filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3.5 flex flex-col lg:flex-row items-center justify-between gap-4 bg-gray-50/40 shrink-0 mb-3">
        {/* Status filters segment control */}
        <div data-tabs="7" className="flex items-center bg-slate-100/85 p-0.5 rounded-lg border border-slate-200/50 overflow-x-auto no-scrollbar flex-nowrap max-w-full whitespace-nowrap shrink-0 segment-control w-full lg:w-auto">
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
        
        {/* Search & View toggle wrapper */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto justify-end">
          {/* Search bar */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 bg-white h-[34px] w-full sm:w-[240px] shadow-sm hover:border-gray-300 focus-within:border-blue-400 focus-within:shadow-[0_0_0_2px_rgba(59,130,246,0.12)] transition-all duration-200">
            <IconSearch size={14} className="text-gray-400 flex-shrink-0" />
            <input type="text" placeholder="Search lead..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="outline-none border-none text-[12.5px] text-gray-700 placeholder:text-gray-400 w-full bg-transparent" />
          </div>
          
          {/* View switcher segment control */}
          <div data-tabs="2" className="flex items-center bg-slate-100/85 p-0.5 rounded-lg border border-slate-200/50 overflow-x-auto no-scrollbar flex-nowrap max-w-full whitespace-nowrap shrink-0 segment-control w-full sm:w-auto">
            {(['list','pipeline'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3.5 py-1.5 rounded-md text-[12px] font-bold transition-all duration-200 cursor-pointer active:scale-95 shrink-0 flex-1 sm:flex-initial ${
                  view === v ? 'bg-[#1a3480] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
                    <div className="overflow-x-auto flex-1 overflow-y-auto no-scrollbar">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Name</th><th>Phone</th><th>Source</th>
                <th className="text-right">Value</th><th>Status</th>
                <th>Assigned</th><th>Last Contact</th><th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">No leads found</td></tr>
              ) : leads.map(l => (
                <tr key={l.id}>
                  <td className="font-medium text-[13px]">{l.name}</td>
                  <td>
                    <Link to={`tel:${l.phone}`}
                      className="flex items-center gap-1 text-[12px] text-blue-600 hover:underline">
                      <IconPhone size={11} />{l.phone}
                    </Link>
                  </td>
                  <td><span className="pill pill-gray text-[10px]">{l.source}</span></td>
                  <td className="text-right font-medium text-[13px]">₹{l.value.toLocaleString('en-IN')}</td>
                  <td><span className={statusClass[l.status]}>{l.status}</span></td>
                  <td className="text-[12px] text-gray-500">{l.assignedTo ?? '—'}</td>
                  <td className="text-[11px] text-gray-400 flex items-center gap-1">
                    {l.lastContact
                      ? <><IconCalendar size={11} />{new Date(l.lastContact).toLocaleDateString('en-IN')}</>
                      : '—'}
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-1.5">
                      <Link to={"/crm/" + l.id}
                        className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors">
                        <IconEye size={14} />
                      </Link>
                      {l.email && (
                        <Link to={`mailto:${l.email}`}
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors">
                          <IconMail size={14} />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* PIPELINE VIEW */}
      {view === 'pipeline' && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map(stage => (
            <div key={stage} className="flex-shrink-0 w-[200px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold capitalize" style={{ color: stageColors[stage] }}>
                  {stage}
                </span>
                <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {byStage(stage).length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {byStage(stage).map(l => (
                  <div key={l.id}
                    className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
                    <p className="text-[12px] font-medium text-gray-800">{l.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                      <IconPhone size={10} />{l.phone}
                    </p>
                    <p className="text-[12px] font-semibold text-[#1a3480] mt-1.5">
                      ₹{l.value.toLocaleString('en-IN')}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-gray-400">{l.source}</span>
                      <Link to={"/crm/" + l.id} className="text-blue-500">
                        <IconEye size={13} />
                      </Link>
                    </div>
                  </div>
                ))}
                {byStage(stage).length === 0 && (
                  <div className="bg-gray-50 rounded-lg border border-dashed border-gray-200 p-3 text-center text-[11px] text-gray-300">
                    No leads
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


