import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronLeft, IconSettings } from '@tabler/icons-react';
import api from '../../services/api';

export default function PartsForm({ backPath }: { backPath: string }) {
  const fromDashboard = typeof window !== 'undefined' && window.location.search.includes('dashboard');
  const [form, setForm] = useState({
    part_number: '', name: '', description: '', brand_id: 0, hsn_code: '',
    cost_price: 0, selling_price: 0, tax_rate: 0, stock_quantity: 0, reorder_level: 5, is_active: true,
  });
  const [brands, setBrands] = useState<{ brand_id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const getId = () => window.location.pathname.match(/parts\/(\d+)/)?.[1];

  useEffect(() => {
    api.get('/parts/brands').then(r => setBrands(r.data)).catch(() => {});
    const id = getId();
    if (id) {
      setLoading(true);
      api.get(`/parts/${id}`).then(r => {
        const p = r.data;
        setForm({
          part_number: p.part_number ?? '', name: p.name,
          description: p.description ?? '', brand_id: p.brand_id ?? 0,
          hsn_code: p.hsn_code ?? '', cost_price: p.cost_price ?? 0,
          selling_price: p.selling_price ?? 0, tax_rate: p.tax_rate ?? 0,
          stock_quantity: p.stock_quantity ?? 0, reorder_level: p.reorder_level ?? 5,
          is_active: p.is_active ?? true,
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
      if (id) await api.put(`/parts/${id}`, form);
      else await api.post('/parts', form);
      window.location.href = '/parts';
    } catch { alert('Failed to save part details'); }
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
            <IconSettings size={26} />
            {isEdit ? 'Modify Part Profile' : 'New Part Profile'}
          </h1>
          <p className="text-[13px] opacity-90 mt-1">
            {isEdit ? 'Configure and update inventory part parameters, prices, and stock indicators' : 'Register a new catalog part / product in inventory'}
          </p>
        </div>
        <Link
          to={fromDashboard ? '/' : backPath}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[13px] transition-all hover:bg-white/30"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
        >
          <IconChevronLeft size={16} /> {fromDashboard ? 'Back to Dashboard' : 'Back to Parts'}
        </Link>
      </div>

      {loading && <div className="text-center py-20 text-gray-400">Loading part details...</div>}

      {!loading && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-200">
          <div className="p-6 space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Part Number</label>
                <input 
                  type="text" 
                  value={v('part_number')} 
                  onChange={e => update('part_number', e.target.value)}
                  placeholder="e.g. HS-101"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white font-mono" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Part Name <span className="text-red-450">*</span></label>
                <input 
                  type="text" 
                  value={v('name')} 
                  onChange={e => update('name', e.target.value)}
                  required
                  placeholder="Part / Product title"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white font-bold" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">HSN Code</label>
                <input 
                  type="text" 
                  value={v('hsn_code')} 
                  onChange={e => update('hsn_code', e.target.value)}
                  placeholder="8-digit HSN"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white font-mono" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Brand</label>
                <select 
                  value={v('brand_id')} 
                  onChange={e => update('brand_id', Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3.5 h-[36px] text-[11.5px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                >
                  <option value={0}>None</option>
                  {brands.map(b => <option key={b.brand_id} value={b.brand_id}>{b.name}</option>)}
                </select>
              </div>

              <div className="col-span-1 md:col-span-2 space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Description</label>
                <textarea 
                  value={v('description')} 
                  onChange={e => update('description', e.target.value)} 
                  rows={2}
                  placeholder="Part specifications, compatibility notes, or details..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[11.5px] text-gray-855 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white resize-none" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cost Price (₹)</label>
                <input 
                  type="number" 
                  value={v('cost_price')} 
                  onChange={e => update('cost_price', Number(e.target.value))}
                  placeholder="Cost Price"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white text-right" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Selling Price (₹) <span className="text-red-450">*</span></label>
                <input 
                  type="number" 
                  value={v('selling_price')} 
                  onChange={e => update('selling_price', Number(e.target.value))}
                  required
                  placeholder="Selling Price"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white text-right font-bold text-emerald-600" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tax Rate (%)</label>
                <input 
                  type="number" 
                  value={v('tax_rate')} 
                  onChange={e => update('tax_rate', Number(e.target.value))}
                  placeholder="e.g. 18"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white text-center font-bold" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Stock Qty</label>
                <input 
                  type="number" 
                  value={v('stock_quantity')} 
                  onChange={e => update('stock_quantity', Number(e.target.value))}
                  placeholder="Initial Stock"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white text-center font-bold" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reorder Level</label>
                <input 
                  type="number" 
                  value={v('reorder_level')} 
                  onChange={e => update('reorder_level', Number(e.target.value))}
                  placeholder="Threshold for reordering"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white text-center font-bold text-red-500" 
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
                  <span className="text-[12px] font-semibold text-gray-700">Active (Show in Catalog &amp; Billing)</span>
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
                {saving ? 'Saving...' : (isEdit ? 'Update Part' : 'Create Part')}
              </button>
            </div>

          </div>
        </form>
      )}
    </div>
  );
}
