import { useEffect, useState } from 'react';
import {
  IconBuildingBank, IconPlus, IconSearch,
  IconArrowUpRight, IconArrowDownRight, IconRefresh,
  IconCreditCard, IconDownload,
} from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';

interface BankAccount {
  id: number;
  name: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  type: 'current' | 'savings' | 'cash';
  balance: number;
  currency: string;
}

interface BankTransaction {
  id: number;
  accountId: number;
  accountName: string;
  date: string;
  description: string;
  reference: string;
  type: 'credit' | 'debit';
  amount: number;
  balance: number;
  category: string;
}

const typeClass: Record<string, string> = {
  credit:  'pill pill-green',
  debit:   'pill pill-red',
};

const categoryClass: Record<string, string> = {
  sales:     'pill pill-green',
  purchase:  'pill pill-blue',
  salary:    'pill pill-purple',
  tax:       'pill pill-amber',
  transfer:  'pill pill-teal',
  expense:   'pill pill-red',
  other:     'pill pill-gray',
};

const accountTypeIcon: Record<string, string> = {
  current: '🏦',
  savings: '💰',
  cash:    '💵',
};

export default function Banking() {
  const [accounts, setAccounts]         = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<number | 'all'>('all');
  const [search, setSearch]             = useState('');
  const [loading, setLoading]           = useState(true);
  const [txLoading, setTxLoading]       = useState(true);

  useEffect(() => {
    api.get('/banking/accounts')
      .then(r => setAccounts(r.data.data ?? r.data))
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setTxLoading(true);
    api.get('/banking/transactions', {
      params: {
        accountId: selectedAccount === 'all' ? undefined : selectedAccount,
        search,
      },
    })
      .then(r => setTransactions(r.data.data ?? r.data))
      .catch(() => setTransactions([]))
      .finally(() => setTxLoading(false));
  }, [selectedAccount, search]);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const selectedAcc  = accounts.find(a => a.id === selectedAccount);
  const totalCredits = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalDebits  = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

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
        icon={<IconBuildingBank size={28} />}
        title="Banking"
        subtitle="Manage bank accounts and track transactions"
        backLabel="Back"
        backPath="/"
        action={
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-[13px] px-3 py-1.5 rounded-lg transition-colors">
              <IconDownload size={15} /> Export Statement
            </button>
            <button className="flex items-center gap-1.5 bg-white text-[#1a3480] text-[13px] font-semibold px-3 py-1.5 rounded-lg">
              <IconPlus size={15} /> Add Account
            </button>
          </div>
        }
      />

      {/* Bank account cards */}
      <div className="flex gap-3 mb-4 overflow-x-auto pb-1">
        {/* All accounts card */}
        <button
          onClick={() => setSelectedAccount('all')}
          className={[
            'flex-shrink-0 w-[200px] rounded-xl border p-4 text-left transition-all',
            selectedAccount === 'all'
              ? 'border-[#1a3480] bg-[#1a3480] text-white shadow-md'
              : 'border-gray-100 bg-white text-gray-800 hover:border-blue-200 shadow-sm',
          ].join(' ')}>
          <div className="text-[20px] mb-2">🏦</div>
          <p className={['text-[11px] font-medium mb-1', selectedAccount === 'all' ? 'text-white/70' : 'text-gray-400'].join(' ')}>
            All Accounts
          </p>
          <p className={['text-[18px] font-bold', selectedAccount === 'all' ? 'text-white' : 'text-[#1a3480]'].join(' ')}>
            ₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          {!loading && (
            <p className={['text-[10px] mt-1', selectedAccount === 'all' ? 'text-white/60' : 'text-gray-400'].join(' ')}>
              {accounts.length} accounts
            </p>
          )}
        </button>

        {loading ? (
          <div className="flex items-center text-gray-400 text-[13px] px-4">Loading accounts...</div>
        ) : (
          accounts.map(acc => (
            <button key={acc.id}
              onClick={() => setSelectedAccount(acc.id)}
              className={[
                'flex-shrink-0 w-[200px] rounded-xl border p-4 text-left transition-all',
                selectedAccount === acc.id
                  ? 'border-[#1a3480] bg-[#1a3480] text-white shadow-md'
                  : 'border-gray-100 bg-white text-gray-800 hover:border-blue-200 shadow-sm',
              ].join(' ')}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[18px]">{accountTypeIcon[acc.type] ?? '🏦'}</span>
                <span className={[
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize',
                  selectedAccount === acc.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500',
                ].join(' ')}>
                  {acc.type}
                </span>
              </div>
              <p className={['text-[11px] font-medium truncate mb-0.5', selectedAccount === acc.id ? 'text-white/80' : 'text-gray-500'].join(' ')}>
                {acc.bankName}
              </p>
              <p className={['text-[12px] font-medium truncate mb-1', selectedAccount === acc.id ? 'text-white/90' : 'text-gray-700'].join(' ')}>
                {acc.name}
              </p>
              <p className={['text-[18px] font-bold', selectedAccount === acc.id ? 'text-white' : 'text-[#1a3480]'].join(' ')}>
                ₹{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className={['text-[10px] font-mono mt-1', selectedAccount === acc.id ? 'text-white/50' : 'text-gray-300'].join(' ')}>
                ••••{acc.accountNumber.slice(-4)}
              </p>
            </button>
          ))
        )}

        {/* Add new account button */}
        <button className="flex-shrink-0 w-[200px] rounded-xl border-2 border-dashed border-gray-200 p-4 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
          <IconPlus size={22} />
          <span className="text-[12px]">Add Account</span>
        </button>
      </div>

      {/* Transaction summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {[
          { label: selectedAccount === 'all' ? 'Total Balance' : `${selectedAcc?.name ?? ''} Balance`,
            value: selectedAccount === 'all' ? totalBalance : (selectedAcc?.balance ?? 0),
            color: '#1a3480', bg: '#eff6ff', icon: <IconCreditCard size={20} color="#1a3480" /> },
          { label: 'Total Credits',
            value: totalCredits, color: '#16a34a', bg: '#f0fdf4',
            icon: <IconArrowDownRight size={20} color="#16a34a" /> },
          { label: 'Total Debits',
            value: totalDebits, color: '#dc2626', bg: '#fef2f2',
            icon: <IconArrowUpRight size={20} color="#dc2626" /> },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              {icon}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{label}</p>
              <p className="text-[20px] font-semibold" style={{ color }}>
                ₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Transactions table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-gray-50 gap-3">
          <h2 className="text-[14px] font-medium text-gray-800 flex items-center gap-2">
            <IconRefresh size={16} color="#1a3480" />
            Transactions
            {selectedAccount !== 'all' && selectedAcc && (
              <span className="text-[12px] text-gray-400 font-normal">— {selectedAcc.name}</span>
            )}
          </h2>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-[34px] w-full sm:w-[240px]">
            <IconSearch size={14} className="text-gray-400 flex-shrink-0" />
            <input type="text" placeholder="Search transaction..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="outline-none border-none text-[13px] text-gray-700 placeholder:text-gray-400 w-full" />
          </div>
        </div>

        <div className="overflow-x-auto flex-1 overflow-y-auto no-scrollbar">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Reference</th>
                <th>Account</th>
                <th>Category</th>
                <th>Type</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {txLoading ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading transactions...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">No transactions found</td></tr>
              ) : transactions.map(tx => (
                <tr key={tx.id}>
                  <td className="text-[12px] text-gray-500 whitespace-nowrap">
                    {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="text-[13px] font-medium">{tx.description}</td>
                  <td className="text-[12px] text-blue-600 font-mono">{tx.reference}</td>
                  <td className="text-[12px] text-gray-500">{tx.accountName}</td>
                  <td>
                    <span className={categoryClass[tx.category] ?? 'pill pill-gray'}>
                      {tx.category}
                    </span>
                  </td>
                  <td>
                    <span className={`${typeClass[tx.type]} flex items-center gap-1 w-fit`}>
                      {tx.type === 'credit'
                        ? <IconArrowDownRight size={11} />
                        : <IconArrowUpRight size={11} />}
                      {tx.type}
                    </span>
                  </td>
                  <td className={[
                    'text-right font-semibold text-[13px]',
                    tx.type === 'credit' ? 'text-green-600' : 'text-red-600',
                  ].join(' ')}>
                    {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={[
                    'text-right text-[13px] font-medium',
                    tx.balance >= 0 ? 'text-gray-700' : 'text-red-600',
                  ].join(' ')}>
                    ₹{tx.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
