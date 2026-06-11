import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronLeft, IconReceiptRefund, IconCalendar } from '@tabler/icons-react';
import api from '../../services/api';

interface Employee { id?: number; name: string }

export default function PayrollForm({ backPath }: { backPath: string }) {
  const fromDashboard = typeof window !== 'undefined' && window.location.search.includes('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState<Record<string, any>>({
    employee_name: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(),
    basic_salary: 0, allowances: 0, deductions: 0, net_salary: 0, payment_date: '', status: 'pending', notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/repairs').then(r => {
      const raw = r.data.data ?? r.data ?? [];
      const names = [...new Set(raw.map((r: any) => (r as any).customer_name))].map(name => ({ name: String(name) }));
      setEmployees([...names.filter(n => n.name && n.name !== '—'), { name: '' }] as Employee[]);
    }).catch(() => {});
  }, []);

  const update = (k: string, v: any) => {
    setForm((p: Record<string, any>) => {
      const next = { ...p, [k]: v };
      if (k === 'basic_salary' || k === 'allowances' || k === 'deductions') {
        next.net_salary = (Number(next.basic_salary) || 0) + (Number(next.allowances) || 0) - (Number(next.deductions) || 0);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/payroll', form);
      window.location.href = '/payroll';
    } catch { alert('Failed to create payroll'); }
    finally { setSaving(false); }
  };

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <div className="max-w-4xl mx-auto pb-12 px-4">
      <style>{`
        .custom-date-input::-webkit-calendar-picker-indicator {
          opacity: 0;
          position: absolute;
          right: 0;
          width: 32px;
          height: 100%;
          cursor: pointer;
          z-index: 10;
        }
      `}</style>

      {/* PAGE HEADER */}
      <div
        className="text-white p-6 md:p-7 rounded-xl mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2.5">
            <IconReceiptRefund size={26} />
            Generate Payroll Entry
          </h1>
          <p className="text-[13px] opacity-90 mt-1">
            Calculate and file monthly payroll slips and allowances for branch staff members
          </p>
        </div>
        <Link
          to={fromDashboard ? '/' : backPath}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[13px] transition-all hover:bg-white/30"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
        >
          <IconChevronLeft size={16} /> {fromDashboard ? 'Back to Dashboard' : 'Back to Payroll'}
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-200">
        <div className="p-6 space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Employee Name</label>
              <select 
                value={form.employee_name} 
                onChange={e => update('employee_name', e.target.value)} 
                required
                className="w-full border border-gray-200 rounded-lg px-3.5 h-[36px] text-[11.5px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
              >
                <option value="">Select Employee...</option>
                {employees.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Month</label>
              <select 
                value={form.month} 
                onChange={e => update('month', Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3.5 h-[36px] text-[11.5px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white font-bold"
              >
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Year</label>
              <input 
                type="number" 
                value={form.year} 
                onChange={e => update('year', Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white text-center font-bold" 
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</label>
              <select 
                value={form.status} 
                onChange={e => update('status', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3.5 h-[36px] text-[11.5px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white font-bold text-blue-700"
              >
                <option value="pending">⏳ Pending</option>
                <option value="paid">✅ Paid</option>
              </select>
            </div>

            {[
              { n: 'basic_salary', l: 'Basic Salary (₹)' },
              { n: 'allowances', l: 'Allowances (₹)' },
              { n: 'deductions', l: 'Deductions (₹)' },
            ].map(f => (
              <div key={f.n} className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{f.l}</label>
                <input 
                  type="number" 
                  value={form[f.n]} 
                  onChange={e => update(f.n, Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white text-right" 
                />
              </div>
            ))}

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-550 uppercase tracking-wider">Net Salary (₹)</label>
              <input 
                type="number" 
                value={form.net_salary} 
                readOnly
                className="w-full border border-emerald-200 rounded-lg px-3 h-[36px] text-[12.5px] outline-none bg-emerald-50 text-right font-extrabold text-emerald-650" 
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payment Date</label>
              <div className="relative flex items-center">
                <input 
                  type="date" 
                  value={form.payment_date} 
                  onChange={e => update('payment_date', e.target.value)}
                  className="custom-date-input w-full border border-gray-200 rounded-lg px-3 pr-10 h-[36px] text-[11.5px] text-gray-850 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white" 
                />
                <IconCalendar size={14} className="absolute right-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Notes</label>
              <textarea 
                value={form.notes} 
                onChange={e => update('notes', e.target.value)} 
                rows={3}
                placeholder="Payroll adjustment details, deduction remarks, or bonuses..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[11.5px] text-gray-850 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white resize-none" 
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
              {saving ? 'Processing...' : 'Create Entry'}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
