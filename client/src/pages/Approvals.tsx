import { useEffect, useState } from 'react';
import {
  IconShieldCheck, IconSearch, IconEye, IconCheck, IconX,
  IconClock, IconMessage2, IconAlertCircle
} from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';

interface PendingApproval {
  entity_type: string;
  record_id: number;
  document_number: string;
  amount: number;
  date: string;
  description: string;
  step_id: number;
  step_number: number;
}

interface ApprovalHistory {
  history_id: number;
  record_id: number;
  status: 'approved' | 'rejected';
  notes?: string;
  created_at: string;
  user: {
    full_name: string;
    username: string;
  };
  step: {
    step_number: number;
    role: {
      name: string;
    };
  };
}

export default function Approvals() {
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedItem, setSelectedItem] = useState<PendingApproval | null>(null);
  const [history, setHistory] = useState<ApprovalHistory[]>([]);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPending = () => {
    setLoading(true);
    api.get('/approvals/pending')
      .then(res => {
        setPending(res.data || []);
      })
      .catch(err => {
        console.error('Fetch pending error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const openItemDetails = async (item: PendingApproval) => {
    setSelectedItem(item);
    setNotes('');
    setErrorMsg('');
    try {
      const res = await api.get(`/approvals/history/${item.record_id}`);
      setHistory(res.data || []);
    } catch (err) {
      console.error('Failed to load history:', err);
      setHistory([]);
    }
  };

  const handleDecision = async (status: 'approved' | 'rejected') => {
    if (!selectedItem) return;
    setActionLoading(true);
    setErrorMsg('');
    try {
      await api.post('/approvals/submit', {
        recordId: selectedItem.record_id,
        stepId: selectedItem.step_id,
        status,
        notes: notes.trim() || undefined
      });
      setSelectedItem(null);
      fetchPending();
    } catch (err: any) {
      console.error('Failed to submit decision:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to submit decision.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPending = pending.filter(item => {
    const term = search.toLowerCase();
    return (
      item.document_number.toLowerCase().includes(term) ||
      item.entity_type.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-[1600px] w-full mx-auto px-4 relative flex-1 min-h-0 flex flex-col gap-4 pb-4">
      <style>{`
        thead th {
          position: sticky;
          top: 0;
          z-index: 10;
          background-color: #fcfdfe !important;
          box-shadow: inset 0 -1px 0 #e2e8f0;
        }
      `}</style>

      <PageBanner
        icon={<IconShieldCheck size={28} />}
        title="Workflow Approvals"
        subtitle="Review and process pending high-value transactions and purchase controls"
        backLabel="Back to Dashboard"
        backPath="/"
      />

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center bg-slate-50 border border-slate-250 rounded-lg px-3 gap-2 h-9 w-full sm:w-[320px]">
          <IconSearch className="text-slate-400" size={17} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pending approvals..."
            className="bg-transparent border-none outline-none text-[13px] w-full text-slate-700 placeholder:text-slate-400"
          />
        </div>
        <div className="text-[12.5px] text-slate-500 font-medium">
          Showing {filteredPending.length} pending items
        </div>
      </div>

      {/* Pending Items Grid/Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[300px]">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-350 border-t-brand"></div>
            <p className="text-[13px]">Loading pending approvals...</p>
          </div>
        ) : filteredPending.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 p-8">
            <IconShieldCheck size={48} className="text-emerald-500/80" />
            <p className="text-[14px] font-medium text-slate-700">All caught up!</p>
            <p className="text-[13px] text-slate-500 text-center max-w-[320px]">
              There are no pending documents requiring your approval right now.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-650 text-[11px] font-bold uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Value</th>
                  <th className="py-3 px-4 text-center">Step</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px] text-slate-700">
                {filteredPending.map((item) => (
                  <tr key={`${item.entity_type}-${item.record_id}-${item.step_id}`} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-brand-dark">
                      {item.document_number}
                    </td>
                    <td className="py-3 px-4">
                      <span className="pill pill-blue">
                        {item.entity_type === 'PurchaseOrder' ? 'Purchase Order' : item.entity_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(item.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-4 max-w-[280px] truncate text-slate-600">
                      {item.description}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-slate-500">
                      Step {item.step_number}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openItemDetails(item)}
                          className="flex items-center gap-1 text-[12px] bg-slate-100 hover:bg-slate-200 text-slate-750 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <IconEye size={14} />
                          Review
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Side Drawer / Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-[550px] bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <IconShieldCheck className="text-brand text-[22px]" />
                <div>
                  <h3 className="font-bold text-[16px] text-slate-800">
                    Review Approval: {selectedItem.document_number}
                  </h3>
                  <p className="text-[12px] text-slate-500">
                    {selectedItem.entity_type === 'PurchaseOrder' ? 'Purchase Order' : selectedItem.entity_type} Control Gate
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-450 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <IconX size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              {/* Document Overview Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-[12px] text-slate-500 uppercase tracking-wide font-semibold">Value</span>
                  <span className="text-[18px] font-extrabold text-slate-900">
                    ₹{Number(selectedItem.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-[13px] text-slate-700 flex flex-col gap-1.5">
                  <p><span className="text-slate-450 font-medium">Description:</span> {selectedItem.description}</p>
                  <p><span className="text-slate-450 font-medium">Submission Date:</span> {new Date(selectedItem.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Workflow History Timeline */}
              <div className="flex flex-col gap-3">
                <h4 className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5">
                  <IconClock size={16} className="text-slate-450" />
                  Approval Workflow History
                </h4>
                {history.length === 0 ? (
                  <div className="text-[12px] text-slate-400 border border-dashed border-slate-200 rounded-xl p-4 text-center">
                    This is the initial step. No prior approvals have been recorded.
                  </div>
                ) : (
                  <div className="relative border-l border-slate-200 ml-3.5 pl-6 py-2 flex flex-col gap-5">
                    {history.map((hist) => (
                      <div key={hist.history_id} className="relative text-[12.5px]">
                        {/* Timeline dot */}
                        <span className={`absolute -left-[31px] top-0.5 rounded-full p-0.5 border-2 border-white text-white
                          ${hist.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                          {hist.status === 'approved' ? <IconCheck size={10} /> : <IconX size={10} />}
                        </span>
                        
                        <div className="flex items-center gap-2 justify-between">
                          <span className="font-semibold text-slate-800">
                            {hist.user.full_name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(hist.created_at).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {hist.step.role.name} — Step {hist.step.step_number} ({hist.status})
                        </p>
                        {hist.notes && (
                          <div className="mt-1.5 bg-slate-50 border border-slate-150 rounded-lg p-2 text-slate-650 flex gap-1 items-start">
                            <IconMessage2 size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                            <span className="text-[12px] italic">"{hist.notes}"</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes input */}
              <div className="flex flex-col gap-1.5 mt-auto">
                <label className="text-[12.5px] font-bold text-slate-700">
                  Reviewer Notes / Reason
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter comments, notes, or rejection reason..."
                  rows={4}
                  className="w-full border border-slate-250 rounded-xl p-3 text-[13px] outline-none focus:border-brand transition-colors placeholder:text-slate-400"
                />
              </div>

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-[12.5px] flex gap-2 items-center">
                  <IconAlertCircle size={16} className="flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3">
              <button
                disabled={actionLoading}
                onClick={() => handleDecision('rejected')}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-750 text-white font-semibold text-[13px] h-10 rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                <IconX size={15} />
                Reject
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleDecision('approved')}
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-750 text-white font-semibold text-[13px] h-10 rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                <IconCheck size={15} />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}