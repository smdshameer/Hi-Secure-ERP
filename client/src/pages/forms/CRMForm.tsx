import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronLeft, IconUserCheck } from '@tabler/icons-react';
import api from '../../services/api';

export default function CRMForm({ backPath }: { backPath: string }) {
  const fromDashboard = typeof window !== 'undefined' && window.location.search.includes('dashboard');
  const [form, setForm] = useState({
    name: '', phone: '', email: '', company: '', source: 'direct', status: 'new', value: 0, notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const getId = () => window.location.pathname.match(/crm\/(\d+)/)?.[1];

  useEffect(() => {
    const id = getId();
    if (id) {
      setLoading(true);
      api.get(`/crm/leads/${id}`).then(r => {
        const lead = r.data.data ?? r.data;
        if (lead) setForm({
          name: `${lead.first_name} ${lead.last_name || ''}`.trim(),
          phone: lead.phone ?? '',
          email: lead.email ?? '',
          company: lead.company_name ?? '',
          source: (lead.source ?? 'direct').toLowerCase(),
          status: (lead.status ?? 'new').toLowerCase(),
          value: lead.opportunities && lead.opportunities.length > 0 
            ? lead.opportunities.reduce((s: number, o: any) => s + (o.estimated_revenue || 0), 0)
            : 0,
          notes: lead.notes ?? '',
        });
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, []);

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const isEdit = !!getId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const id = getId();
      const nameParts = form.name.trim().split(/\s+/);
      const first_name = nameParts[0];
      const last_name = nameParts.slice(1).join(' ') || undefined;

      const data: any = {
        first_name,
        last_name,
        phone: form.phone,
        email: form.email,
        company_name: form.company || undefined,
        source: form.source.toUpperCase(),
        notes: form.notes || undefined,
        status: form.status.toUpperCase()
      };

      if (id) await api.put(`/crm/leads/${id}`, data);
      else await api.post('/crm/leads', data);
      window.location.href = '/crm';
    } catch { alert('Failed to save lead details'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 px-4">
      {/* PAGE HEADER */}
      <div
        className="text-white p-6 md:p-7 rounded-xl mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2.5">
            <IconUserCheck size={26} />
            {isEdit ? 'Modify CRM Lead' : 'New CRM Lead'}
          </h1>
          <p className="text-[13px] opacity-90 mt-1">
            {isEdit ? 'Configure and update CRM lead details' : 'Register and capture a new customer lead'}
          </p>
        </div>
        <Link
          to={fromDashboard ? '/' : backPath}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[13px] transition-all hover:bg-white/30"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
        >
          <IconChevronLeft size={16} /> {fromDashboard ? 'Back to Dashboard' : 'Back to CRM'}
        </Link>
      </div>

      {loading && <div className="text-center py-20 text-gray-400">Loading lead details...</div>}

      {!loading && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-200">
          <div className="p-6 space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lead Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Lead Name <span className="text-red-450">*</span></label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => update('name', e.target.value)} 
                  required 
                  placeholder="Full Name"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white" 
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Phone</label>
                <input 
                  type="tel" 
                  value={form.phone} 
                  onChange={e => update('phone', e.target.value)} 
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white font-mono" 
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email</label>
                <input 
                  type="email" 
                  value={form.email} 
                  onChange={e => update('email', e.target.value)} 
                  placeholder="email@address.com"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white" 
                />
              </div>

              {/* Company */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Company</label>
                <input 
                  type="text" 
                  value={form.company} 
                  onChange={e => update('company', e.target.value)} 
                  placeholder="Organization/Firm"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white" 
                />
              </div>

              {/* Source */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Source</label>
                <select 
                  value={form.source} 
                  onChange={e => update('source', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                >
                  <option value="direct">Direct</option>
                  <option value="referral">Referral</option>
                  <option value="website">Website</option>
                  <option value="social">Social Media</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</label>
                <select 
                  value={form.status} 
                  onChange={e => update('status', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white font-bold text-blue-700"
                >
                  <option value="new">🆕 New</option>
                  <option value="contacted">📞 Contacted</option>
                  <option value="qualified">🎯 Qualified</option>
                  <option value="proposal">📄 Proposal</option>
                  <option value="won">🎉 Won</option>
                  <option value="lost">❌ Lost</option>
                </select>
              </div>

              {/* Value */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Est. Deal Value (₹)</label>
                <input 
                  type="number" 
                  value={form.value} 
                  onChange={e => update('value', Number(e.target.value))}
                  placeholder="₹ Value"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white text-right" 
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Internal Notes / Requirements</label>
              <textarea 
                value={form.notes} 
                onChange={e => update('notes', e.target.value)} 
                rows={4}
                placeholder="Details of discussions or client specific requests..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[11.5px] text-gray-850 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white resize-none" 
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-150">
              <Link
                to={fromDashboard ? '/' : backPath}
                className="px-5 h-[38px] flex items-center justify-center rounded-lg border border-gray-300 text-[12.5px] font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 bg-white"
              >
                Cancel
              </Link>
              <button 
                type="submit" 
                disabled={saving}
                className="px-6 h-[38px] flex items-center justify-center rounded-lg text-white text-[12.5px] font-bold disabled:opacity-50 transition-all hover:translate-y-[-1px] hover:shadow-md cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
              >
                {saving ? 'Saving...' : (isEdit ? 'Update Lead' : 'Create Lead')}
              </button>
            </div>

          </div>
        </form>
      )}
    </div>
  );
}
