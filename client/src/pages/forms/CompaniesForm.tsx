import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronLeft, IconBuilding } from '@tabler/icons-react';
import api from '../../services/api';

export default function CompaniesForm({ backPath }: { backPath: string }) {
  const fromDashboard = typeof window !== 'undefined' && window.location.search.includes('dashboard');
  const [form, setForm] = useState({
    name: '', code: '', address: '', city: '', state: '', stateCode: '', pincode: '',
    phone: '', email: '', gstin: '', pan: '', is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const getId = () => window.location.pathname.match(/companies\/(\d+)/)?.[1];

  useEffect(() => {
    const id = getId();
    if (id) {
      setLoading(true);
      api.get(`/companies/${id}`).then(r => {
        const c = r.data;
        setForm({
          name: c.name, code: c.code ?? '', address: c.address ?? '', city: c.city ?? '',
          state: c.state ?? '', stateCode: c.stateCode ?? '', pincode: c.pincode ?? '',
          phone: c.phone ?? '', email: c.email ?? '', gstin: c.gstin ?? '', pan: c.pan ?? '',
          is_active: c.is_active ?? true,
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
      if (id) await api.put(`/companies/${id}`, form);
      else await api.post('/companies', form);
      window.location.href = '/companies';
    } catch { alert('Failed to save company details'); }
    finally { setSaving(false); }
  };

  const v = (key: string) => (form as any)[key] ?? '';

  return (
    <div className="max-w-4xl mx-auto pb-12 px-4">
      {/* PAGE HEADER */}
      <div
        className="text-white p-6 md:p-7 rounded-xl mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2.5">
            <IconBuilding size={26} />
            {isEdit ? 'Modify Company Profile' : 'New Company Profile'}
          </h1>
          <p className="text-[13px] opacity-90 mt-1">
            {isEdit ? 'Configure and update company legal/branch details' : 'Register a new company entity in system database'}
          </p>
        </div>
        <Link
          to={fromDashboard ? '/' : backPath}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[13px] transition-all hover:bg-white/30"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
        >
          <IconChevronLeft size={16} /> {fromDashboard ? 'Back to Dashboard' : 'Back to Companies'}
        </Link>
      </div>

      {loading && <div className="text-center py-20 text-gray-400">Loading company details...</div>}

      {!loading && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-200">
          <div className="p-6 space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { n: 'name', l: 'Company Name', r: true, placeholder: 'Legal Entity Name' },
                { n: 'code', l: 'Company Code', placeholder: 'e.g. CO-01' },
                { n: 'phone', l: 'Phone', t: 'tel', placeholder: 'Office contact phone' },
                { n: 'email', l: 'Email', t: 'email', placeholder: 'accounts@company.com' },
                { n: 'gstin', l: 'GSTIN', placeholder: '15-digit GSTIN' },
                { n: 'pan', l: 'PAN', placeholder: '10-digit PAN' },
                { n: 'stateCode', l: 'State Code', placeholder: 'e.g. 07' },
              ].map(f => (
                <div key={f.n} className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{f.l} {f.r && <span className="text-red-450">*</span>}</label>
                  <input 
                    type={f.t || 'text'} 
                    value={v(f.n)} 
                    onChange={e => update(f.n, e.target.value)} 
                    required={f.r}
                    placeholder={f.placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white" 
                  />
                </div>
              ))}

              <div className="col-span-1 md:col-span-2 space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Address</label>
                <textarea 
                  value={v('address')} 
                  onChange={e => update('address', e.target.value)} 
                  rows={2}
                  placeholder="Billing / Shipping registered address..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[11.5px] text-gray-850 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white resize-none" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">City</label>
                <input 
                  type="text" 
                  value={v('city')} 
                  onChange={e => update('city', e.target.value)}
                  placeholder="City"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">State</label>
                <input 
                  type="text" 
                  value={v('state')} 
                  onChange={e => update('state', e.target.value)}
                  placeholder="State"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pincode</label>
                <input 
                  type="text" 
                  value={v('pincode')} 
                  onChange={e => update('pincode', e.target.value)}
                  placeholder="6-digit ZIP code"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white font-mono" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</label>
                <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={form.is_active} 
                    onChange={e => update('is_active', e.target.checked)} 
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" 
                  />
                  <span className="text-[12px] font-semibold text-gray-700">Active (Accept Transactions)</span>
                </label>
              </div>
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
                {saving ? 'Saving...' : (isEdit ? 'Update Company' : 'Create Company')}
              </button>
            </div>

          </div>
        </form>
      )}
    </div>
  );
}
