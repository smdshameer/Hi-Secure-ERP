import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronLeft, IconUsers } from '@tabler/icons-react';
import api from '../../services/api';

export default function UsersForm({ backPath }: { backPath: string }) {
  const fromDashboard = typeof window !== 'undefined' && window.location.search.includes('dashboard');
  const [form, setForm] = useState({
    username: '', email: '', password: '', full_name: '', role: 'viewer', phone: '', is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const getId = () => window.location.pathname.match(/users\/(\d+)/)?.[1];

  useEffect(() => {
    const id = getId();
    if (id) {
      setLoading(true);
      api.get(`/users/${id}`).then(r => {
        const u = r.data;
        setForm({
          username: u.username, email: u.email, full_name: u.full_name ?? '',
          phone: u.phone ?? '', role: u.role ?? 'viewer', is_active: u.is_active ?? true,
          password: '',
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
      if (id) {
        const data: any = { ...form };
        if (!data.password) delete data.password;
        await api.put(`/users/${id}`, data);
      } else {
        if (!form.password) { alert('Password is required'); setSaving(false); return; }
        await api.post('/users', form);
      }
      window.location.href = '/users';
    } catch { alert('Failed to save'); }
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
            <IconUsers size={26} />
            {isEdit ? 'Modify User Profile' : 'New User Profile'}
          </h1>
          <p className="text-[13px] opacity-90 mt-1">
            {isEdit ? 'Configure and update user roles, access level permissions, and credentials' : 'Register a new administrative, technician, or client viewer user account'}
          </p>
        </div>
        <Link
          to={fromDashboard ? '/' : backPath}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[13px] transition-all hover:bg-white/30"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
        >
          <IconChevronLeft size={16} /> {fromDashboard ? 'Back to Dashboard' : 'Back to Users'}
        </Link>
      </div>

      {loading && <div className="text-center py-20 text-gray-400">Loading user profile...</div>}

      {!loading && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-200">
          <div className="p-6 space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { n: 'username', l: 'Username', r: true, placeholder: 'Enter login username' },
                { n: 'email', l: 'Email', t: 'email', r: true, placeholder: 'e.g. name@company.com' },
                { n: 'full_name', l: 'Full Name', r: true, placeholder: 'Enter display name' },
                { n: 'phone', l: 'Phone', t: 'tel', placeholder: 'Contact number' },
              ].map(f => (
                <div key={f.n} className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{f.l} {f.r && <span className="text-red-400">*</span>}</label>
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
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Role *</label>
                <select 
                  value={form.role} 
                  onChange={e => update('role', e.target.value)} 
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-850 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                >
                  <option value="admin">Admin</option>
                  <option value="technician">Technician</option>
                  <option value="accountant">Accountant</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Password {isEdit ? <span className="text-gray-400 font-normal normal-case">(leave blank to keep)</span> : <span className="text-red-450">*</span>}
                </label>
                <input 
                  type="password" 
                  value={form.password} 
                  onChange={e => update('password', e.target.value)} 
                  required={!isEdit}
                  placeholder={isEdit ? 'Leave blank to keep current' : 'Enter login password'}
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white" 
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</label>
                <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={form.is_active} 
                    onChange={e => update('is_active', e.target.checked)} 
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" 
                  />
                  <span className="text-[12px] font-semibold text-gray-700">Active (Authorized to login and use system features)</span>
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
                disabled={saving || loading}
                className="px-6 h-[38px] flex items-center justify-center rounded-lg text-white text-[12.5px] font-bold disabled:opacity-50 transition-all hover:translate-y-[-1px] hover:shadow-md cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
              >
                {saving ? 'Saving...' : (isEdit ? 'Update User' : 'Create User')}
              </button>
            </div>

          </div>
        </form>
      )}
    </div>
  );
}
