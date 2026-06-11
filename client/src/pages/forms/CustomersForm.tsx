import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronLeft, IconUser } from '@tabler/icons-react';
import api from '../../services/api';

export default function CustomersForm({ backPath }: { backPath: string }) {
  const fromDashboard = typeof window !== 'undefined' && window.location.search.includes('dashboard');
  const [form, setForm] = useState<Record<string, any>>({
    name: '', phone: '', email: '', address: '', city: '', state: '',
    pincode: '', gstin: '', customer_type: 'retail', credit_limit: 0,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pathId = typeof window !== 'undefined' ? window.location.pathname.match(/customers\/(\d+)/)?.[1] : null;
  const isEdit = !!pathId;

  useEffect(() => {
    if (pathId) {
      setLoading(true);
      api.get(`/customers/${pathId}`)
        .then(r => {
          const c = r.data;
          setForm({
            name: c.name, phone: c.phone ?? '', email: c.email ?? '',
            address: c.address ?? '', city: c.city ?? '', state: c.state ?? '',
            pincode: c.pincode ?? '', gstin: c.gstin ?? '',
            customer_type: c.customer_type ?? 'retail',
            credit_limit: c.credit_limit ?? 0,
          });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  const update = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data = { ...form };
      if (pathId) await api.put(`/customers/${pathId}`, data);
      else await api.post('/customers', data);
      window.location.href = '/customers';
    } catch { alert('Failed to save customer details'); }
    finally { setSaving(false); }
  };

  const v = (key: string) => (key === 'credit_limit' || key === 'amount') ? Number(form[key] ?? 0) : (form[key] ?? '');

  return (
    <div className="max-w-4xl mx-auto pb-12 px-4">
      {/* PAGE HEADER */}
      <div
        className="text-white p-6 md:p-7 rounded-xl mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2.5">
            <IconUser size={26} />
            {isEdit ? 'Modify Customer Profile' : 'New Customer Profile'}
          </h1>
          <p className="text-[13px] opacity-90 mt-1">
            {isEdit ? 'Configure and update customer address & billing parameters' : 'Register a new customer account in the system'}
          </p>
        </div>
        <Link
          to={fromDashboard ? '/' : backPath}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[13px] transition-all hover:bg-white/30"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
        >
          <IconChevronLeft size={16} /> {fromDashboard ? 'Back to Dashboard' : 'Back to Customers'}
        </Link>
      </div>

      {loading && <div className="text-center py-20 text-gray-400">Loading customer profile...</div>}

      {!loading && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-200">
          <div className="p-6 space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { n: 'name', l: 'Full Name', r: true, placeholder: 'Individual or Business Name' },
                { n: 'phone', l: 'Phone', t: 'tel', r: true, placeholder: 'Mobile Contact number' },
                { n: 'email', l: 'Email', t: 'email', placeholder: 'client@domain.com' },
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

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</label>
                <select 
                  value={String(v('customer_type'))} 
                  onChange={e => update('customer_type', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                >
                  <option value="retail">Retail</option> 
                  <option value="wholesale">Wholesale</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-2 space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Address</label>
                <textarea 
                  value={v('address')} 
                  onChange={e => update('address', e.target.value)} 
                  rows={2}
                  placeholder="Registered mailing address..."
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
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">GSTIN</label>
                <input 
                  type="text" 
                  value={v('gstin')} 
                  onChange={e => update('gstin', e.target.value.toUpperCase())}
                  placeholder="15-digit GSTIN code"
                  maxLength={15}
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white font-mono tracking-wide" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Credit Limit (₹)</label>
                <input 
                  type="number" 
                  value={v('credit_limit')} 
                  onChange={e => update('credit_limit', Number(e.target.value))}
                  placeholder="₹ Credit limit threshold"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white text-right font-bold text-red-600" 
                />
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
                {saving ? 'Saving...' : (isEdit ? 'Update Customer' : 'Create Customer')}
              </button>
            </div>

          </div>
        </form>
      )}
    </div>
  );
}
