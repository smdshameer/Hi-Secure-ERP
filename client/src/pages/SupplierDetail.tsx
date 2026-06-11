import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  IconChevronLeft, IconBuildingStore, IconPhone, IconMail, IconMapPin,
  IconCertificate, IconCreditCard, IconHistory, IconFileText,
  IconFileDescription, IconTruck, IconEdit, IconPrinter, IconTrash
} from '@tabler/icons-react';
import api from '../services/api';
import PageBanner from '../components/PageBanner';

interface SupplierDetailType {
  supplier_id: number;
  supplier_code: string;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  is_active: boolean;
  created_at: string;
  purchaseOrders: any[];
  deliveryChallansSupplier: any[];
}

interface SupplierNote {
  id: number;
  note: string;
  created_by: string;
  created_at: string;
}

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<SupplierDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<SupplierNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'purchases' | 'challans'>('purchases');

  useEffect(() => {
    setLoading(true);
    api.get(`/suppliers/${id}`)
      .then((r) => {
        setSupplier(r.data);
      })
      .catch((e) => {
        console.error('Error loading supplier details', e);
      })
      .finally(() => {
        setLoading(false);
      });

    // Load notes history from local storage
    const cachedNotes = localStorage.getItem(`notes_supplier_${id}`);
    if (cachedNotes) {
      try {
        setNotes(JSON.parse(cachedNotes));
      } catch (e) {
        console.error('Failed to parse supplier notes', e);
      }
    } else {
      setNotes([]);
    }
  }, [id]);

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading supplier details...</div>;
  }

  if (!supplier) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-xl font-bold">Supplier not found</p>
        <Link to="/suppliers" className="text-blue-600 hover:underline mt-2 inline-block">
          Return to list
        </Link>
      </div>
    );
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this supplier? This will also delete all associated purchase order records.')) {
      try {
        await api.delete(`/suppliers/${id}`);
        alert('Supplier deleted successfully.');
        window.location.href = '/suppliers';
      } catch (error) {
        console.error('Error deleting supplier', error);
        alert('Failed to delete supplier. Please try again.');
      }
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const noteObj: SupplierNote = {
      id: Date.now(),
      note: newNote.trim(),
      created_by: 'System Admin',
      created_at: new Date().toISOString(),
    };
    const updated = [...notes, noteObj];
    setNotes(updated);
    localStorage.setItem(`notes_supplier_${id}`, JSON.stringify(updated));
    setNewNote('');
  };

  // Calculations for statistics
  const totalOrders = supplier.purchaseOrders?.length || 0;
  const lifetimeValue = supplier.purchaseOrders?.reduce((sum, po) => sum + Number(po.total_amount || 0), 0) || 0;
  const lastOrderDate = supplier.purchaseOrders?.length > 0
    ? new Date(Math.max(...supplier.purchaseOrders.map(po => new Date(po.order_date).getTime())))
    : null;

  // Status Badge Classes
  const getPOStatusBadgeClass = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'received':
      case 'completed':
        return 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-250';
      case 'pending':
      case 'sent':
      case 'ordered':
        return 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200';
      case 'draft':
        return 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-50 text-slate-600 border border-slate-200';
      case 'cancelled':
        return 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-255';
      default:
        return 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-50 text-gray-650 border border-gray-200';
    }
  };

  const getChallanStatusBadgeClass = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'approved':
        return 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-255';
      case 'draft':
        return 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-50 text-slate-650 border border-slate-200';
      default:
        return 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-750 border border-blue-200';
    }
  };

  return (
    <div className="max-w-[1600px] w-full mx-auto px-4 relative flex-1 min-h-0 flex flex-col gap-4 pb-6">
      <style>{`
        @media print {
          header, nav, .no-print, .page-banner, .notes-form-area {
            display: none !important;
          }
          .layout-wrapper, .main-container, .content-area, body, html {
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          .max-w-\\[1600px\\] {
            max-w: 100% !important;
            width: 100% !important;
            padding: 0 !important;
          }
          .grid-container, .print-block {
            display: block !important;
          }
          .card-wrapper {
            width: 100% !important;
            page-break-inside: avoid;
            margin-bottom: 20px !important;
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
          }
          .card-wrapper .tab-content-print-visible {
            display: block !important;
          }
          .card-wrapper .overflow-x-auto,
          .card-wrapper .overflow-y-auto {
            max-height: none !important;
            overflow: visible !important;
          }
          .print-section-header {
            display: block !important;
            font-size: 13px !important;
            font-weight: bold !important;
            color: #374151 !important;
            background-color: #f9fafb !important;
            border-bottom: 1px solid #e5e7eb !important;
            padding: 8px 20px !important;
            margin-top: 0 !important;
          }
        }
      `}</style>

      {/* PAGE HEADER */}
      <PageBanner
        icon={<IconBuildingStore size={28} />}
        title="Supplier Profile"
        subtitle={`Detailed view and records history for ${supplier.name}`}
        backLabel="Back to Suppliers"
        backPath="/suppliers"
        action={
          <div className="flex gap-2 no-print">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <IconPrinter size={15} /> Print Profile
            </button>
            <Link
              to={`/suppliers/${supplier.supplier_id}/edit`}
              className="flex items-center gap-1.5 bg-white text-[#1a3480] text-[13px] font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
            >
              <IconEdit size={15} /> Edit Profile
            </Link>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <IconTrash size={15} /> Delete Supplier
            </button>
          </div>
        }
      />

      {/* SCROLLABLE PAGE WORKSPACE CONTAINER */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid-container">
        
        {/* UPPER GRID: Supplier Info & Document Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.2fr] gap-5 items-stretch print-block">
          
          {/* LEFT COLUMN: Supplier Information Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden card-wrapper flex flex-col h-full">
              <div className="px-5 py-3 border-b border-gray-150 bg-gray-50/70 flex items-center gap-2 text-[13px] font-bold text-gray-700">
                <IconBuildingStore size={16} className="text-blue-600" />
                <span>Supplier Information</span>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-1">{supplier.name}</h2>
                  <p className="text-[11px] text-gray-400 font-mono">Code: {supplier.supplier_code}</p>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <table className="w-full text-[13px] text-left text-gray-650 border-collapse">
                    <tbody>
                      {supplier.contact_person && (
                        <tr className="border-b border-gray-50">
                          <th className="py-2 font-bold text-gray-500 w-[120px]">Contact Person</th>
                          <td className="py-2 text-gray-700 font-semibold">{supplier.contact_person}</td>
                        </tr>
                      )}
                      <tr className="border-b border-gray-50">
                        <th className="py-2 font-bold text-gray-500 w-[120px] flex items-center gap-1.5"><IconPhone size={14} /> Phone</th>
                        <td className="py-2 font-semibold text-gray-800">
                          <a href={`tel:${supplier.phone}`} className="hover:text-blue-600 hover:underline">{supplier.phone}</a>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-50">
                        <th className="py-2 font-bold text-gray-500 flex items-center gap-1.5"><IconMail size={14} /> Email</th>
                        <td className="py-2 text-gray-700">
                          {supplier.email ? (
                            <a href={`mailto:${supplier.email}`} className="hover:text-blue-600 hover:underline">{supplier.email}</a>
                          ) : '—'}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-50">
                        <th className="py-2 font-bold text-gray-500 flex items-center gap-1.5"><IconMapPin size={14} /> Address</th>
                        <td className="py-2 text-gray-700 whitespace-pre-line leading-relaxed">
                          {supplier.address || '—'}
                        </td>
                      </tr>
                      {(supplier.city || supplier.state || supplier.pincode) && (
                        <tr className="border-b border-gray-50">
                          <th className="py-2 font-bold text-gray-500">Location</th>
                          <td className="py-2 text-gray-700">
                            {[supplier.city, supplier.state, supplier.pincode].filter(Boolean).join(', ')}
                          </td>
                        </tr>
                      )}
                      <tr className="border-b border-gray-50">
                        <th className="py-2 font-bold text-gray-500 flex items-center gap-1.5"><IconCertificate size={14} /> GSTIN</th>
                        <td className="py-2 font-mono text-gray-700 font-semibold">{supplier.gstin || 'Unregistered'}</td>
                      </tr>
                      {supplier.pan && (
                        <tr className="border-b border-gray-50">
                          <th className="py-2 font-bold text-gray-500">PAN No</th>
                          <td className="py-2 font-mono text-gray-700">{supplier.pan}</td>
                        </tr>
                      )}
                      <tr>
                        <th className="py-2 font-bold text-gray-500">Status</th>
                        <td className="py-2">
                          {supplier.is_active ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-250">Active</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-255">Inactive</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-[11px] text-gray-400">
                  <span>Registered since</span>
                  <span className="font-semibold text-gray-600">
                    {new Date(supplier.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

          {/* RIGHT COLUMN: Segmented Document Tabs Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden card-wrapper flex flex-col h-full">
              {/* Tabs Header (Visible on screen, hidden on print) */}
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-start no-print">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full max-w-md shadow-inner">
                  <button
                    type="button"
                    onClick={() => setActiveTab('purchases')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-[13px] font-bold transition-all cursor-pointer ${
                      activeTab === 'purchases'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-650 hover:text-slate-800 hover:bg-slate-200/50'
                    }`}
                  >
                    <IconFileText size={16} className="flex-shrink-0" />
                    <span className="whitespace-nowrap">Purchase Orders</span>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                      activeTab === 'purchases'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-red-50/60 text-red-500 border border-red-100/40'
                    }`}>
                      {supplier.purchaseOrders?.length || 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('challans')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-[13px] font-bold transition-all cursor-pointer ${
                      activeTab === 'challans'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-650 hover:text-slate-800 hover:bg-slate-200/50'
                    }`}
                  >
                    <IconTruck size={16} className="flex-shrink-0" />
                    <span className="whitespace-nowrap">Challans</span>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                      activeTab === 'challans'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-red-50/65 text-red-500 border border-red-100/40'
                    }`}>
                      {supplier.deliveryChallansSupplier?.length || 0}
                    </span>
                  </button>
                </div>
              </div>

              {/* Document Content Sections */}
              <div className="p-0 min-h-[380px]">

                {/* Purchase Orders Section */}
                <div className={`${activeTab === 'purchases' ? 'block' : 'hidden'} tab-content-print-visible`}>
                  {/* Print-only Section Header */}
                  <div className="hidden print-section-header px-5 py-2">
                    Purchase Orders ({supplier.purchaseOrders?.length || 0})
                  </div>
                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                    <table className="w-full text-[13px] text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-55/65 text-gray-500 font-bold uppercase tracking-wider text-[11px] border-b border-gray-100">
                          <th className="py-2.5 px-5">PO #</th>
                          <th className="py-2.5 px-5">Order Date</th>
                          <th className="py-2.5 px-5">Status</th>
                          <th className="py-2.5 px-5 text-right">Amount</th>
                          <th className="py-2.5 px-5 text-center no-print">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(!supplier.purchaseOrders || supplier.purchaseOrders.length === 0) ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-gray-400 italic">
                              No purchase orders recorded
                            </td>
                          </tr>
                        ) : (
                          supplier.purchaseOrders.map((po) => (
                            <tr key={po.po_id} className="hover:bg-blue-50/30 transition-colors">
                              <td className="py-2.5 px-5 font-bold text-blue-700">{po.po_number || `PO-${po.po_id}`}</td>
                              <td className="py-2.5 px-5 text-gray-500">
                                {new Date(po.order_date).toLocaleDateString('en-IN')}
                              </td>
                              <td className="py-2.5 px-5">
                                <span className={getPOStatusBadgeClass(po.status)}>
                                  {po.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-5 text-right font-extrabold text-gray-855">
                                ₹{Number(po.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-5 text-center no-print">
                                <Link
                                  to={`/purchases/${po.po_id}`}
                                  className="text-[11px] font-bold text-blue-600 hover:underline"
                                >
                                  View
                                </Link>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Delivery Challans Section */}
                <div className={`${activeTab === 'challans' ? 'block' : 'hidden'} tab-content-print-visible`}>
                  {/* Print-only Section Header */}
                  <div className="hidden print-section-header px-5 py-2">
                    Delivery Challans ({supplier.deliveryChallansSupplier?.length || 0})
                  </div>
                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                    <table className="w-full text-[13px] text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-55/65 text-gray-500 font-bold uppercase tracking-wider text-[11px] border-b border-gray-100">
                          <th className="py-2.5 px-5">Challan #</th>
                          <th className="py-2.5 px-5">Challan Date</th>
                          <th className="py-2.5 px-5">Vehicle No</th>
                          <th className="py-2.5 px-5">Status</th>
                          <th className="py-2.5 px-5 text-center no-print">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(!supplier.deliveryChallansSupplier || supplier.deliveryChallansSupplier.length === 0) ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-gray-400 italic">
                              No delivery challans recorded
                            </td>
                          </tr>
                        ) : (
                          supplier.deliveryChallansSupplier.map((dc) => (
                            <tr key={dc.delivery_challan_id} className="hover:bg-blue-50/30 transition-colors">
                              <td className="py-2.5 px-5 font-bold text-blue-700">{dc.challan_number || `DC-${dc.delivery_challan_id}`}</td>
                              <td className="py-2.5 px-5 text-gray-500">
                                {new Date(dc.challan_date).toLocaleDateString('en-IN')}
                              </td>
                              <td className="py-2.5 px-5 font-mono text-[11.5px]">
                                {dc.vehicle_number || '—'}
                              </td>
                              <td className="py-2.5 px-5">
                                <span className={getChallanStatusBadgeClass(dc.status)}>
                                  {dc.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-5 text-center no-print">
                                <Link
                                  to={`/delivery-challans/${dc.delivery_challan_id}`}
                                  className="text-[11px] font-bold text-blue-600 hover:underline"
                                >
                                  View
                                </Link>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

        </div>

        {/* LOWER GRID: Stats & Notes (Symmetrical, matching the upper columns grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.2fr] gap-5 mt-5 items-stretch print-block">
          
          {/* Statistics Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden card-wrapper flex flex-col min-h-[160px] h-full">
            <div className="px-5 py-3 border-b border-gray-150 bg-gray-50/70 flex items-center gap-2 text-[13px] font-bold text-gray-700">
              <IconHistory size={16} className="text-blue-600" />
              <span>Statistics Dashboard</span>
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-blue-50/45 p-3 rounded-lg border border-blue-100/60">
                  <h3 className="text-2xl font-black text-blue-600">{totalOrders}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-1">Total Orders</p>
                </div>
                <div className="bg-emerald-50/45 p-3 rounded-lg border border-emerald-100/65">
                  <h3 className="text-xl font-black text-emerald-600">
                    ₹{lifetimeValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-2">Total Purchases</p>
                </div>
              </div>

              {lastOrderDate && (
                <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-[12px] text-gray-600 bg-gray-50/30 p-2.5 rounded-lg border border-gray-100/40 mt-4">
                  <span className="font-semibold text-gray-400 text-[11px] uppercase tracking-wide">Last Order Date</span>
                  <span className="font-bold text-gray-800">
                    {lastOrderDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes & Interactions Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden card-wrapper flex flex-col min-h-[160px] h-full">
            <div className="px-5 py-3 border-b border-gray-150 bg-gray-50/70 flex items-center gap-2 text-[13px] font-bold text-gray-700">
              <IconFileText size={16} className="text-blue-500" />
              <span>Notes & Staff Interactions</span>
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
              <div className="notes-form-area flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(); }}
                  placeholder="Type a comment & press Enter..."
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[13px] outline-none hover:border-gray-300 focus:border-blue-400 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)] transition-all"
                />
                <button
                  onClick={handleAddNote}
                  className="bg-[#1a3480] hover:bg-blue-800 text-white text-[12px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  Add Note
                </button>
              </div>

              <div className="border-t border-gray-100 pt-2 max-h-[80px] overflow-y-auto space-y-2.5 pr-1 flex-1">
                {notes.length === 0 ? (
                  <p className="text-center text-[12px] text-gray-400 italic py-4">No notes recorded yet</p>
                ) : (
                  [...notes].reverse().map((n) => (
                    <div key={n.id} className="border-b border-gray-50 pb-2.5 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-center mb-1 text-[10.5px] text-gray-400">
                        <span className="font-bold text-gray-500">by {n.created_by}</span>
                        <span>
                          {new Date(n.created_at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[12.5px] text-gray-750 leading-relaxed bg-gray-50/60 p-2 rounded border border-gray-100/35">
                        {n.note}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
