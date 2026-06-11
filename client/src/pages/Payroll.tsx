import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconCash, IconPlus, IconSearch, IconEye, IconCheck } from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';
import type { PayrollRecord } from '../types';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default function Payroll() {
  const now = new Date();
  const [records, setRecords]   = useState<PayrollRecord[]>([]);
  const [month, setMonth]       = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/payroll', { params: { month, search } })
      .then(r => setRecords(r.data.data ?? r.data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [month, search]);

  const markPaid = async (id: number) => {
    try {
      await api.patch(`/payroll/${id}/pay`);
      setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'paid', paidAt: new Date().toISOString() } : r));
    } catch { alert('Failed to mark as paid'); }
  };

  const totalNet = records.reduce((s, r) => s + r.netSalary, 0);
  const totalPaid = records.filter(r => r.status === 'paid').reduce((s, r) => s + r.netSalary, 0);
  const totalPending = totalNet - totalPaid;

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
        icon={<IconCash size={28} />}
        title="Payroll"
        subtitle="Manage employee salaries and payroll"
        backLabel="Back"
        backPath="/"
        action={
          <Link to="/payroll/runs"
            className="flex items-center gap-1.5 bg-white text-[#1a3480] text-[13px] font-semibold px-3 py-1.5 rounded-lg">
            <IconPlus size={15} /> Generate Payroll
          </Link>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Total Payroll',   value: totalNet,     color: '#1a3480', bg: '#eff6ff' },
          { label: 'Paid',            value: totalPaid,    color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Pending',         value: totalPending, color: '#d97706', bg: '#fffbeb' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: bg }}>
              <IconCash size={20} color={color} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{label}</p>
              <p className="text-[20px] font-semibold text-gray-900">
                ₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 gap-4">
          {/* Month selector */}
          <select value={month} onChange={e => setMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 h-[34px] text-[13px] text-gray-700 outline-none">
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
              const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
              return (
                <option key={val} value={val}>
                  {MONTHS[d.getMonth()]} {d.getFullYear()}
                </option>
              );
            })}
          </select>

          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-[34px] w-[240px]">
            <IconSearch size={14} className="text-gray-400 flex-shrink-0" />
            <input type="text" placeholder="Search employee..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="outline-none border-none text-[13px] text-gray-700 placeholder:text-gray-400 w-full" />
          </div>
        </div>

        <div className="overflow-x-auto flex-1 overflow-y-auto no-scrollbar">
          <table className="erp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Employee</th>
                <th className="text-right">Basic Salary</th>
                <th className="text-right">Allowances</th>
                <th className="text-right">Deductions</th>
                <th className="text-right">Net Salary</th>
                <th>Status</th>
                <th>Paid On</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">No payroll records for this month</td></tr>
              ) : (
                records.map((r, i) => (
                  <tr key={r.id}>
                    <td className="text-gray-400 text-[12px]">{i + 1}</td>
                    <td className="font-medium text-[13px]">{r.employeeName}</td>
                    <td className="text-right text-[13px]">₹{r.basicSalary.toLocaleString('en-IN')}</td>
                    <td className="text-right text-[13px] text-green-600">+₹{r.allowances.toLocaleString('en-IN')}</td>
                    <td className="text-right text-[13px] text-red-500">-₹{r.deductions.toLocaleString('en-IN')}</td>
                    <td className="text-right font-semibold text-[13px]">₹{r.netSalary.toLocaleString('en-IN')}</td>
                    <td>
                      <span className={r.status === 'paid' ? 'pill pill-green' : 'pill pill-amber'}>
                        {r.status}
                      </span>
                    </td>
                    <td className="text-[12px] text-gray-400">
                      {r.paidAt ? new Date(r.paidAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>
                      <div className="flex justify-center">
                        {r.status === 'pending' ? (
                          <button onClick={() => markPaid(r.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded border border-green-300 text-green-600 text-[12px] hover:bg-green-50 transition-colors">
                            <IconCheck size={13} /> Mark Paid
                          </button>
                        ) : (
                          <Link to="/payroll/runs"
                            className="flex items-center gap-1 px-2.5 py-1 rounded border border-gray-200 text-gray-500 text-[12px] hover:text-blue-600 hover:border-blue-300 transition-colors">
                            <IconEye size={13} /> View
                          </Link>
                        )}
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




