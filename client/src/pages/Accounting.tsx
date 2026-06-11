import { useEffect, useState } from 'react';
import {
  IconBook2, IconPlus, IconSearch, IconDownload,
  IconArrowUpRight, IconArrowDownRight, IconCalendar,
} from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';

type AccTab = 'ledger' | 'journal' | 'trial';

interface LedgerEntry {
  id: number;
  date: string;
  description: string;
  reference: string;
  type: 'debit' | 'credit';
  amount: number;
  balance: number;
  category: string;
}

interface JournalEntry {
  id: number;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  account: string;
  status: 'posted' | 'draft';
}

interface TrialRow {
  account: string;
  debit: number;
  credit: number;
}

const categoryClass: Record<string, string> = {
  sales:     'pill pill-green',
  purchase:  'pill pill-blue',
  expense:   'pill pill-red',
  payment:   'pill pill-teal',
  receipt:   'pill pill-purple',
  tax:       'pill pill-amber',
};

export default function Accounting() {
  const [tab, setTab]             = useState<AccTab>('ledger');
  const [ledger, setLedger]       = useState<LedgerEntry[]>([]);
  const [journal, setJournal]     = useState<JournalEntry[]>([]);
  const [trial, setTrial]         = useState<TrialRow[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');

  useEffect(() => {
    setLoading(true);
    if (tab === 'ledger') {
      api.get('/accounting/ledger', { params: { search, dateFrom, dateTo } })
        .then(r => setLedger(r.data.data ?? r.data))
        .catch(() => setLedger([]))
        .finally(() => setLoading(false));
    } else if (tab === 'journal') {
      api.get('/accounting/journal', { params: { search, dateFrom, dateTo } })
        .then(r => setJournal(r.data.data ?? r.data))
        .catch(() => setJournal([]))
        .finally(() => setLoading(false));
    } else {
      api.get('/accounting/trial-balance', { params: { dateFrom, dateTo } })
        .then(r => setTrial(r.data.data ?? r.data))
        .catch(() => setTrial([]))
        .finally(() => setLoading(false));
    }
  }, [tab, search, dateFrom, dateTo]);

  // Summary totals
  const totalDebit  = ledger.filter(e => e.type === 'debit').reduce((s, e) => s + e.amount, 0);
  const totalCredit = ledger.filter(e => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
  const netBalance  = totalCredit - totalDebit;

  const trialDebit  = trial.reduce((s, r) => s + r.debit, 0);
  const trialCredit = trial.reduce((s, r) => s + r.credit, 0);

  const TABS = [
    { key: 'ledger',  label: 'General Ledger' },
    { key: 'journal', label: 'Journal Entries' },
    { key: 'trial',   label: 'Trial Balance' },
  ] as const;

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
        icon={<IconBook2 size={28} />}
        title="Accounting"
        subtitle="General ledger, journal entries and financial statements"
        backLabel="Back"
        backPath="/"
        action={
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-[13px] px-3 py-1.5 rounded-lg transition-colors">
              <IconDownload size={15} /> Export
            </button>
            <button className="flex items-center gap-1.5 bg-white text-[#1a3480] text-[13px] font-semibold px-3 py-1.5 rounded-lg">
              <IconPlus size={15} /> New Entry
            </button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Total Debits',  value: totalDebit,  color: '#dc2626', bg: '#fef2f2', icon: <IconArrowUpRight size={20} color="#dc2626" /> },
          { label: 'Total Credits', value: totalCredit, color: '#16a34a', bg: '#f0fdf4', icon: <IconArrowDownRight size={20} color="#16a34a" /> },
          { label: 'Net Balance',   value: netBalance,  color: netBalance >= 0 ? '#16a34a' : '#dc2626', bg: '#eff6ff', icon: <IconBook2 size={20} color="#1a3480" /> },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              {icon}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{label}</p>
              <p className="text-[20px] font-semibold" style={{ color }}>
                {value < 0 ? '-' : ''}₹{Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={[
                'px-5 py-3 text-[13px] font-medium border-b-2 transition-colors',
                tab === t.key
                  ? 'border-b-[#1a3480] text-[#1a3480]'
                  : 'border-b-transparent text-gray-500 hover:text-gray-700',
              ].join(' ')}>
              {t.label}
            </button>
          ))}

          {/* Date filters */}
          <div className="ml-auto flex items-center gap-2 px-4">
            <IconCalendar size={14} className="text-gray-400" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 h-[30px] text-[12px] outline-none" />
            <span className="text-gray-400 text-[12px]">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 h-[30px] text-[12px] outline-none" />
            {tab !== 'trial' && (
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 h-[30px] w-[180px]">
                <IconSearch size={13} className="text-gray-400 flex-shrink-0" />
                <input type="text" placeholder="Search..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="outline-none border-none text-[12px] text-gray-700 placeholder:text-gray-400 w-full" />
              </div>
            )}
          </div>
        </div>

        {/* LEDGER TAB */}
        {tab === 'ledger' && (
          <div className="overflow-x-auto flex-1 overflow-y-auto no-scrollbar">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Reference</th>
                  <th>Category</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : ledger.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No ledger entries found</td></tr>
                ) : ledger.map(e => (
                  <tr key={e.id}>
                    <td className="text-[12px] text-gray-500 whitespace-nowrap">
                      {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="text-[13px] font-medium">{e.description}</td>
                    <td className="text-[12px] text-blue-600 font-mono">{e.reference}</td>
                    <td>
                      <span className={categoryClass[e.category] ?? 'pill pill-gray'}>
                        {e.category}
                      </span>
                    </td>
                    <td className="text-right text-[13px] text-red-600 font-medium">
                      {e.type === 'debit' ? `₹${e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="text-right text-[13px] text-green-600 font-medium">
                      {e.type === 'credit' ? `₹${e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className={[
                      'text-right text-[13px] font-semibold',
                      e.balance >= 0 ? 'text-green-700' : 'text-red-600',
                    ].join(' ')}>
                      {e.balance < 0 ? '-' : ''}₹{Math.abs(e.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              {ledger.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={4} className="px-4 py-2 text-[12px] text-gray-600">Total</td>
                    <td className="text-right px-4 py-2 text-[13px] text-red-600">
                      ₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right px-4 py-2 text-[13px] text-green-600">
                      ₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={['text-right px-4 py-2 text-[13px]', netBalance >= 0 ? 'text-green-700' : 'text-red-600'].join(' ')}>
                      ₹{Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* JOURNAL TAB */}
        {tab === 'journal' && (
          <div className="overflow-x-auto flex-1 overflow-y-auto no-scrollbar">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Description</th>
                  <th>Reference</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : journal.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No journal entries found</td></tr>
                ) : journal.map(j => (
                  <tr key={j.id}>
                    <td className="text-[12px] text-gray-500 whitespace-nowrap">
                      {new Date(j.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="text-[13px] font-medium">{j.account}</td>
                    <td className="text-[12px] text-gray-600">{j.description}</td>
                    <td className="text-[12px] text-blue-600 font-mono">{j.reference}</td>
                    <td className="text-right text-[13px] text-red-600 font-medium">
                      {j.debit > 0 ? `₹${j.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="text-right text-[13px] text-green-600 font-medium">
                      {j.credit > 0 ? `₹${j.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td>
                      <span className={j.status === 'posted' ? 'pill pill-green' : 'pill pill-gray'}>
                        {j.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TRIAL BALANCE TAB */}
        {tab === 'trial' && (
          <div className="overflow-x-auto flex-1 overflow-y-auto no-scrollbar">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th className="text-right">Debit (₹)</th>
                  <th className="text-right">Credit (₹)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : trial.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-10 text-gray-400">No trial balance data</td></tr>
                ) : trial.map((r, i) => (
                  <tr key={i}>
                    <td className="text-[13px] font-medium">{r.account}</td>
                    <td className="text-right text-[13px] text-red-600">
                      {r.debit > 0 ? `₹${r.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="text-right text-[13px] text-green-600">
                      {r.credit > 0 ? `₹${r.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {trial.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                    <td className="px-4 py-2.5 text-[13px] text-gray-700">Total</td>
                    <td className="text-right px-4 py-2.5 text-[13px] text-red-600">
                      ₹{trialDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right px-4 py-2.5 text-[13px] text-green-600">
                      ₹{trialCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className={['font-bold', trialDebit === trialCredit ? 'bg-green-50' : 'bg-red-50'].join(' ')}>
                    <td colSpan={3} className={[
                      'px-4 py-2 text-center text-[12px]',
                      trialDebit === trialCredit ? 'text-green-700' : 'text-red-600',
                    ].join(' ')}>
                      {trialDebit === trialCredit
                        ? '✓ Trial Balance is balanced'
                        : `⚠ Difference: ₹${Math.abs(trialDebit - trialCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
