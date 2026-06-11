import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { IconChevronLeft, IconPlus, IconTrash, IconCalculator, IconFileDescription, IconUser, IconSquarePlus, IconCalendar, IconDeviceFloppy, IconFileCheck } from '@tabler/icons-react';
import api from '../../services/api';
import { toRupeesInWords } from '../../utils/numberToWords';

const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir (01)' },
  { code: '02', name: 'Himachal Pradesh (02)' },
  { code: '03', name: 'Punjab (03)' },
  { code: '04', name: 'Chandigarh (04)' },
  { code: '05', name: 'Uttarakhand (05)' },
  { code: '06', name: 'Haryana (06)' },
  { code: '07', name: 'Delhi (07)' },
  { code: '08', name: 'Rajasthan (08)' },
  { code: '09', name: 'Uttar Pradesh (09)' },
  { code: '10', name: 'Bihar (10)' },
  { code: '11', name: 'Sikkim (11)' },
  { code: '12', name: 'Arunachal Pradesh (12)' },
  { code: '13', name: 'Nagaland (13)' },
  { code: '14', name: 'Manipur (14)' },
  { code: '15', name: 'Mizoram (15)' },
  { code: '16', name: 'Tripura (16)' },
  { code: '17', name: 'Meghalaya (17)' },
  { code: '18', name: 'Assam (18)' },
  { code: '19', name: 'West Bengal (19)' },
  { code: '20', name: 'Jharkhand (20)' },
  { code: '21', name: 'Odisha (21)' },
  { code: '22', name: 'Chhattisgarh (22)' },
  { code: '23', name: 'Madhya Pradesh (23)' },
  { code: '24', name: 'Gujarat (24)' },
  { code: '25', name: 'Daman & Diu (25)' },
  { code: '26', name: 'Dadra & Nagar Haveli (26)' },
  { code: '27', name: 'Maharashtra (27)' },
  { code: '28', name: 'Andhra Pradesh (28)' },
  { code: '29', name: 'Karnataka (29)' },
  { code: '30', name: 'Goa (30)' },
  { code: '31', name: 'Lakshadweep (31)' },
  { code: '32', name: 'Kerala (32)' },
  { code: '33', name: 'Tamil Nadu (33)' },
  { code: '34', name: 'Puducherry (34)' },
  { code: '35', name: 'Andaman & Nicobar Islands (35)' },
  { code: '36', name: 'Telangana (36)' },
  { code: '37', name: 'Andhra Pradesh (37)' },
];

interface LineItem {
  part_id: number;
  quantity: number;
  unit_price: number;
}

interface SupplierType {
  supplier_id: number;
  name: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  state?: string;
}

interface PartType {
  part_id: number;
  part_number: string;
  name: string;
  cost_price: number;
  stock_quantity: number;
}

interface BrandType {
  brand_id: number;
  name: string;
}

export default function PurchaseOrderForm({ backPath }: { backPath: string }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [suppliers, setSuppliers] = useState<SupplierType[]>([]);
  const [parts, setParts] = useState<PartType[]>([]);
  const [brands, setBrands] = useState<BrandType[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modals Visibility
  const [showSuppModal, setShowSuppModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  // Quick Add forms state
  const [quickSupp, setQuickSupp] = useState({ name: '', contact_person: '', phone: '', email: '', gstin: '', state: 'Delhi', address: '' });
  const [quickPart, setQuickPart] = useState({ part_number: '', name: '', brand_id: '', selling_price: '', cost_price: '', hsn_code: '', stock_quantity: '0' });

  // Add Item state
  const [newItem, setNewItem] = useState({
    part_id: 0,
    quantity: 1,
    unit_price: 0
  });

  const [form, setForm] = useState({
    supplier_id: 0,
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery: '',
    status: 'draft',
    notes: '',
  });

  const [lines, setLines] = useState<LineItem[]>([]);

  // Selected Supplier details for preview
  const selectedSupplier = suppliers.find(s => s.supplier_id === form.supplier_id);

  useEffect(() => {
    setLoading(true);
    const fetchDeps = async () => {
      try {
        const [suppRes, partRes, brandRes] = await Promise.all([
          api.get('/suppliers'),
          api.get('/parts'),
          api.get('/parts/brands').catch(() => ({ data: [] }))
        ]);
        setSuppliers(suppRes.data.data ?? suppRes.data ?? []);
        setParts(partRes.data.data ?? partRes.data ?? []);
        setBrands(brandRes.data ?? []);

        if (isEdit) {
          const res = await api.get(`/purchases/${id}`);
          const po = res.data;
          if (po) {
            setForm({
              supplier_id: po.supplier_id ?? 0,
              order_date: po.order_date ? new Date(po.order_date).toISOString().split('T')[0] : '',
              expected_delivery: po.expected_delivery ? new Date(po.expected_delivery).toISOString().split('T')[0] : '',
              status: po.status || 'draft',
              notes: po.notes || '',
            });

            if (po.items) {
              setLines(po.items.map((i: any) => ({
                part_id: i.part_id,
                quantity: Number(i.quantity || 0),
                unit_price: Number(i.unit_price || 0),
              })));
            }
          }
        }
      } catch (err) {
        console.error('Failed to load Purchase Order details', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeps();
  }, [id, isEdit]);

  const removeLine = (idx: number) => {
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  // Quick Supplier Submit
  const handleQuickSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/suppliers', quickSupp);
      const newSuppId = res.data.supplier_id;
      const suppRes = await api.get('/suppliers');
      const latestSupps = suppRes.data.data ?? suppRes.data ?? [];
      setSuppliers(latestSupps);

      setShowSuppModal(false);
      setForm(prev => ({ ...prev, supplier_id: newSuppId }));
      setQuickSupp({ name: '', contact_person: '', phone: '', email: '', gstin: '', state: 'Delhi', address: '' });
    } catch {
      alert('Failed to quickly create supplier.');
    }
  };

  // Quick Part Submit
  const handleQuickPartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/parts', {
        ...quickPart,
        brand_id: quickPart.brand_id ? Number(quickPart.brand_id) : null,
        selling_price: Number(quickPart.selling_price),
        cost_price: Number(quickPart.cost_price || 0),
        stock_quantity: Number(quickPart.stock_quantity || 0)
      });
      const newPartId = res.data.part_id;
      const partRes = await api.get('/parts');
      const latestParts = partRes.data.data ?? partRes.data ?? [];
      setParts(latestParts);

      // Select new part inside modal
      const part = latestParts.find((p: any) => p.part_id === newPartId);
      setNewItem(prev => ({
        ...prev,
        part_id: newPartId,
        unit_price: Number(part?.cost_price || 0)
      }));

      setShowPartModal(false);
      setQuickPart({ part_number: '', name: '', brand_id: '', selling_price: '', cost_price: '', hsn_code: '', stock_quantity: '0' });
    } catch {
      alert('Failed to quickly create part.');
    }
  };

  // Modal Part trigger
  const handleNewItemPartChange = (partId: number) => {
    const part = parts.find(p => p.part_id === partId);
    if (part) {
      setNewItem(prev => ({
        ...prev,
        part_id: partId,
        unit_price: Number(part.cost_price || 0)
      }));
    } else {
      setNewItem(prev => ({ ...prev, part_id: 0, unit_price: 0 }));
    }
  };

  // Add Item
  const handleAddItem = () => {
    if (newItem.part_id === 0) {
      alert('Please select a valid product.');
      return;
    }
    if (newItem.quantity <= 0) {
      alert('Quantity must be greater than 0.');
      return;
    }

    const added: LineItem = {
      part_id: newItem.part_id,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price
    };

    setLines(prev => [...prev, added]);
    setShowAddItemModal(false);
    setNewItem({
      part_id: 0,
      quantity: 1,
      unit_price: 0
    });
  };

  // Calculations
  const subtotal = lines.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
  const totalQuantity = lines.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.supplier_id === 0) {
      alert('Please select a supplier.');
      return;
    }
    if (lines.length === 0) {
      alert('Please add at least one valid line item.');
      return;
    }

    setSaving(true);
    const postData = {
      ...form,
      supplier_id: Number(form.supplier_id),
      total_amount: subtotal,
      items: lines
    };

    try {
      if (isEdit) {
        await api.put(`/purchases/${id}`, postData);
      } else {
        await api.post('/purchases', postData);
      }
      navigate('/purchases');
    } catch (err) {
      console.error(err);
      alert('Failed to save Purchase Order.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[1600px] w-full mx-auto pb-12 lg:pb-0 px-4 relative lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
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

        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* PAGE HEADER */}
      <div
        className="text-white p-6 md:p-7 rounded-xl mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm shrink-0"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2.5">
            <IconFileDescription size={26} />
            {isEdit ? 'Modify Purchase Order' : 'New Purchase Order'}
          </h1>
          <p className="text-[13px] opacity-90 mt-1">
            {isEdit ? 'Configure and update procurement document' : 'Create and issue a new purchase order for suppliers'}
          </p>
        </div>
        <Link
          to={backPath}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[13px] transition-all hover:bg-white/30"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
        >
          <IconChevronLeft size={16} /> Back to Purchases
        </Link>
      </div>

      {loading && <div className="text-center py-20 text-gray-400">Loading purchase order details...</div>}

      {!loading && (
        <form onSubmit={handleSubmit} className="lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-[78fr_22fr] gap-6 lg:flex-1 lg:min-h-0">
            
            {/* LEFT COLUMN */}
            <div className="space-y-6 pb-6 lg:h-full lg:overflow-y-auto lg:overscroll-contain no-scrollbar pr-1">

              {/* PO PARAMETERS AND SUPPLIER INFORMATION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* PO PARAMETERS CARD */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-200">
                  <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
                    <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
                      <IconFileDescription size={13} className="text-white" />
                    </div>
                    <span className="font-bold text-gray-800 text-[12.5px]">Order Parameters</span>
                  </div>

                  <div className="p-4 space-y-3.5">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Order Date <span className="text-red-500">*</span></label>
                      <div className="relative flex items-center">
                        <input
                          type="date"
                          value={form.order_date}
                          onChange={e => setForm(p => ({ ...p, order_date: e.target.value }))}
                          required
                          className="custom-date-input w-full border border-gray-200 rounded-lg px-3 pr-10 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                        />
                        <IconCalendar size={14} className="absolute right-3 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Expected Delivery Date</label>
                      <div className="relative flex items-center">
                        <input
                          type="date"
                          value={form.expected_delivery}
                          onChange={e => setForm(p => ({ ...p, expected_delivery: e.target.value }))}
                          className="custom-date-input w-full border border-gray-200 rounded-lg px-3 pr-10 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                        />
                        <IconCalendar size={14} className="absolute right-3 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Order Status <span className="text-red-500">*</span></label>
                      <select
                        value={form.status}
                        onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3.5 h-[36px] text-[11.5px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                      >
                        <option value="draft">Draft (PO Pending)</option>
                        <option value="ordered">Ordered (Awaiting Supplier)</option>
                        <option value="received">Received (Inventory Added)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SUPPLIER PROFILE */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-200">
                  <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
                    <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
                      <IconUser size={13} className="text-white" />
                    </div>
                    <span className="font-bold text-gray-800 text-[12.5px]">Supplier Details</span>
                    {form.supplier_id > 0 && <span className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Selected</span>}
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select Supplier <span className="text-red-500">*</span></label>
                      <div className="flex gap-1">
                        <select
                          value={form.supplier_id}
                          onChange={e => {
                            if (e.target.value === '__new__') {
                              setShowSuppModal(true);
                            } else {
                              setForm(p => ({ ...p, supplier_id: Number(e.target.value) }));
                            }
                          }}
                          required
                          className="w-full border border-gray-200 rounded-lg px-2 h-[36px] text-[11.5px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                        >
                          <option value="0">Choose Supplier...</option>
                          {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>)}
                          <option value="__new__">+ Add New Supplier</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowSuppModal(true)}
                          className="border border-blue-300 hover:border-blue-500 hover:bg-blue-600 hover:text-white text-blue-600 rounded-lg w-[36px] h-[36px] flex items-center justify-center transition-all duration-200 shrink-0 bg-blue-50"
                        >
                          <IconSquarePlus size={15} />
                        </button>
                      </div>
                    </div>

                    {selectedSupplier ? (
                      <div className="bg-gray-50 border border-gray-150 rounded-lg p-2.5 text-[11px] text-gray-600 space-y-1 leading-normal">
                        <div><span className="font-semibold text-gray-700">Contact:</span> {selectedSupplier.phone || '—'}</div>
                        {selectedSupplier.email && <div className="truncate"><span className="font-semibold text-gray-700">Email:</span> {selectedSupplier.email}</div>}
                        {selectedSupplier.gstin ? (
                          <div><span className="font-semibold text-gray-700">GSTIN:</span> <span className="font-bold text-blue-750">{selectedSupplier.gstin}</span></div>
                        ) : (
                          <div className="text-amber-600 italic">No GSTIN linked (Unregistered)</div>
                        )}
                        {selectedSupplier.address && <div className="truncate"><span className="font-semibold text-gray-700">Address:</span> {selectedSupplier.address}</div>}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-400 text-[11px] border border-dashed border-gray-200 rounded-lg">
                        Choose a supplier to load purchasing info
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* LINE ITEMS TABLE */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3 transition-all duration-300 hover:shadow-lg hover:border-blue-200">
                <div className="font-bold text-gray-800 border-b border-gray-100 pb-2.5 flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2">
                    <IconCalculator size={16} className="text-blue-600" />
                    <span>Purchase Line Items</span>
                    <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full text-[10px]">{lines.length}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddItemModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
                  >
                    <IconPlus size={13} /> Add Line
                  </button>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full border-collapse text-[11.5px]" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '45%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '35px' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase border-b border-gray-200">
                        <th className="py-2.5 px-3 text-left">Description of Parts</th>
                        <th className="py-2.5 px-2 text-center">Qty Ordered</th>
                        <th className="py-2.5 px-2 text-right">Unit Cost Price (₹)</th>
                        <th className="py-2.5 px-2 text-right">Total Valuation (₹)</th>
                        <th className="py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lines.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400">
                            <div className="flex flex-col items-center justify-center p-3 space-y-1">
                              <span className="text-xl opacity-30">🛒</span>
                              <p className="font-bold text-gray-600">No items ordered yet</p>
                              <small className="text-gray-400">Click "+ Add Line" above to request parts</small>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        lines.map((line, idx) => {
                          const part = parts.find(p => p.part_id === line.part_id);
                          return (
                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors duration-100">
                              <td className="py-2.5 px-3 text-left">
                                <div className="font-bold text-gray-800 leading-tight truncate">{part?.part_number || '—'}</div>
                                <div className="text-[10px] text-gray-400 truncate" title={part?.name}>{part?.name || '—'}</div>
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold text-gray-800">{line.quantity}</td>
                              <td className="py-2.5 px-2 text-right text-gray-700">₹{line.unit_price.toFixed(2)}</td>
                              <td className="py-2.5 px-2 text-right font-extrabold text-gray-800">
                                ₹{(line.quantity * line.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeLine(idx)}
                                  className="text-red-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                                >
                                  <IconTrash size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* REMARKS / SPECIAL TERMS */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-200">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                  <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
                    <IconFileDescription size={15} className="text-white" />
                  </div>
                  <span className="font-bold text-gray-800 text-[13px]">Supplier Instructions &amp; Remarks</span>
                </div>
                <div className="p-4 space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Purchase Terms Remarks</label>
                    <textarea 
                      value={form.notes} 
                      onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} 
                      rows={4}
                      placeholder="Specify shipping terms, packaging details, partial receipt agreements, bank wiring details..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[11.5px] text-gray-850 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white resize-none" 
                    />
                  </div>
                  {subtotal > 0 && (
                    <div className="text-[10px] text-indigo-600 font-medium italic bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100/30">
                      {toRupeesInWords(subtotal)}
                    </div>
                  )}
                </div>
              </div>

            </div>{/* END LEFT COLUMN */}

            {/* RIGHT COLUMN / SIDEBAR */}
            <div className="lg:h-full lg:overflow-y-auto no-scrollbar pb-6">
              
              {/* STICKY SUMMARY CARD */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 transition-all duration-300 hover:shadow-md hover:border-blue-200">
                <div className="font-bold text-gray-800 border-b border-gray-150 pb-2 flex items-center gap-2 text-[13px]">
                  <IconCalculator size={16} className="text-blue-600" />
                  Order Summary
                </div>

                <div className="bg-gradient-to-b from-[#f8faff] to-[#f9fafb] border-2 border-gray-100 rounded-xl p-4 space-y-2.5">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Declared Valuation</span>
                    <span className="font-extrabold text-gray-800">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="border-t border-gray-150 pt-2 text-[11px] text-gray-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Items Count:</span>
                      <span className="font-bold text-gray-700">{lines.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Qty Ordered:</span>
                      <span className="font-bold text-gray-700">{totalQuantity}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button 
                    type="submit" 
                    disabled={saving || lines.length === 0}
                    className="w-full h-[44px] rounded-lg text-white font-bold text-[13.5px] flex items-center justify-center gap-2 transition-all hover:translate-y-[-1px] hover:shadow-md disabled:opacity-50 disabled:translate-y-0 cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
                  >
                    <IconFileCheck size={16} />
                    {saving ? 'Processing...' : (isEdit ? 'Update PO' : 'Create PO')}
                  </button>

                  <Link 
                    to={backPath}
                    className="w-full h-[38px] border border-gray-300 rounded-lg text-gray-600 font-semibold text-[12px] flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 bg-white"
                  >
                    Cancel
                  </Link>
                </div>

                {/* Quick Tips */}
                <div className="tips-box bg-amber-50 border-l-4 border-amber-500 rounded-lg p-3.5 text-[11px] text-amber-900 leading-normal">
                  <h6 className="font-bold text-[11.5px] text-amber-850 flex items-center gap-1 mb-1">
                    💡 Quick Tips
                  </h6>
                  <ul className="list-disc list-inside space-y-1 text-amber-800/80">
                    <li>Cost prices are auto-loaded from parts index</li>
                    <li>Update PO to 'Received' to automatically increment parts stock levels</li>
                  </ul>
                </div>

              </div>

            </div>

          </div>
        </form>
      )}

      {/* ADD ITEM MODAL */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[3000] p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-250 max-w-md w-full p-6 space-y-4">
            <h3 className="text-[15px] font-bold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <IconPlus className="text-blue-600" size={18} /> Add Purchase Item
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Select Product *</label>
                <select 
                  value={newItem.part_id} 
                  onChange={e => {
                    if (e.target.value === '__new__') {
                      setShowPartModal(true);
                    } else {
                      handleNewItemPartChange(Number(e.target.value));
                    }
                  }}
                  className="w-full border border-gray-305 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white"
                >
                  <option value="0">-- Select Part --</option>
                  {parts.map(p => (
                    <option key={p.part_id} value={p.part_id}>
                      {p.part_number} - {p.name} (Stock: {p.stock_quantity})
                    </option>
                  ))}
                  <option value="__new__">+ Add New Part</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Quantity Ordered *</label>
                  <input 
                    type="number" 
                    value={newItem.quantity} 
                    onChange={e => setNewItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    min={1}
                    className="w-full border border-gray-305 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Unit Cost Price (₹) *</label>
                  <input 
                    type="number" 
                    value={newItem.unit_price} 
                    onChange={e => setNewItem(prev => ({ ...prev, unit_price: Number(e.target.value) }))}
                    min={0}
                    step="0.01"
                    className="w-full border border-gray-305 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white text-right"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 h-[34px] rounded-lg border border-gray-300 text-[12px] font-semibold text-gray-655 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 bg-white"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleAddItem}
                  className="px-5 h-[34px] rounded-lg text-white text-[12px] font-bold hover:brightness-110 active:scale-[0.98] transition-all duration-200"
                  style={{ background: '#1a3480' }}
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD SUPPLIER MODAL */}
      {showSuppModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[3000] p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-250 max-w-md w-full p-6 space-y-4">
            <h3 className="text-[16px] font-bold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <IconSquarePlus className="text-blue-600" size={20} /> Add New Supplier
            </h3>
            <form onSubmit={handleQuickSupplierSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Company Name *</label>
                <input 
                  type="text" 
                  value={quickSupp.name} 
                  onChange={e => setQuickSupp(p => ({ ...p, name: e.target.value }))}
                  required 
                  className="w-full border border-gray-350 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Contact Person</label>
                <input 
                  type="text" 
                  value={quickSupp.contact_person} 
                  onChange={e => setQuickSupp(p => ({ ...p, contact_person: e.target.value }))}
                  className="w-full border border-gray-350 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    value={quickSupp.phone} 
                    onChange={e => setQuickSupp(p => ({ ...p, phone: e.target.value }))}
                    className="w-full border border-gray-350 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={quickSupp.email} 
                    onChange={e => setQuickSupp(p => ({ ...p, email: e.target.value }))}
                    className="w-full border border-gray-355 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">GSTIN</label>
                  <input 
                    type="text" 
                    value={quickSupp.gstin} 
                    onChange={e => setQuickSupp(p => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                    placeholder="15-digit GSTIN"
                    className="w-full border border-gray-355 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">State *</label>
                  <select 
                    value={quickSupp.state} 
                    onChange={e => setQuickSupp(p => ({ ...p, state: e.target.value }))}
                    required
                    className="w-full border border-gray-355 rounded-lg px-3 h-[36px] text-[13px] text-gray-700 outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white"
                  >
                    <option value="Delhi">Delhi</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    {INDIAN_STATES.map(s => {
                      const cleanName = s.name.replace(/\s\(\d+\)/, '');
                      return <option key={cleanName} value={cleanName}>{cleanName}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Address</label>
                <textarea 
                  value={quickSupp.address} 
                  onChange={e => setQuickSupp(p => ({ ...p, address: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-355 rounded-lg px-3 py-1.5 text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white resize-y" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowSuppModal(false)}
                  className="px-4 h-[34px] rounded-lg border border-gray-300 text-[12px] font-semibold text-gray-655 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 bg-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 h-[34px] rounded-lg text-white text-[12px] font-bold hover:brightness-110 active:scale-[0.98] transition-all duration-200"
                  style={{ background: '#1a3480' }}
                >
                  Add Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD PART / PRODUCT MODAL */}
      {showPartModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[3000] p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-250 max-w-md w-full p-6 space-y-4">
            <h3 className="text-[16px] font-bold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <IconSquarePlus className="text-blue-600" size={20} /> Add New Part
            </h3>
            <form onSubmit={handleQuickPartSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Part Number *</label>
                  <input 
                    type="text" 
                    value={quickPart.part_number} 
                    onChange={e => setQuickPart(p => ({ ...p, part_number: e.target.value }))}
                    required 
                    placeholder="e.g. HS-101"
                    className="w-full border border-gray-350 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Part Name *</label>
                  <input 
                    type="text" 
                    value={quickPart.name} 
                    onChange={e => setQuickPart(p => ({ ...p, name: e.target.value }))}
                    required 
                    className="w-full border border-gray-350 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Brand</label>
                  <select 
                    value={quickPart.brand_id} 
                    onChange={e => setQuickPart(p => ({ ...p, brand_id: e.target.value }))}
                    className="w-full border border-gray-355 rounded-lg px-3 h-[36px] text-[13px] text-gray-700 outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white"
                  >
                    <option value="">-- Choose Brand --</option>
                    {brands.map(b => <option key={b.brand_id} value={b.brand_id}>{b.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">HSN Code</label>
                  <input 
                    type="text" 
                    value={quickPart.hsn_code} 
                    onChange={e => setQuickPart(p => ({ ...p, hsn_code: e.target.value }))}
                    placeholder="8-digit HSN"
                    className="w-full border border-gray-355 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Selling Price *</label>
                  <input 
                    type="number" 
                    value={quickPart.selling_price} 
                    onChange={e => setQuickPart(p => ({ ...p, selling_price: e.target.value }))}
                    min={0}
                    step="0.01"
                    required 
                    className="w-full border border-gray-355 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] text-right bg-white" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Cost Price</label>
                  <input 
                    type="number" 
                    value={quickPart.cost_price} 
                    onChange={e => setQuickPart(p => ({ ...p, cost_price: e.target.value }))}
                    min={0}
                    step="0.01"
                    className="w-full border border-gray-355 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] text-right bg-white" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Initial Stock</label>
                  <input 
                    type="number" 
                    value={quickPart.stock_quantity} 
                    onChange={e => setQuickPart(p => ({ ...p, stock_quantity: e.target.value }))}
                    min={0}
                    className="w-full border border-gray-355 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] text-center bg-white" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowPartModal(false)}
                  className="px-4 h-[34px] rounded-lg border border-gray-300 text-[12px] font-semibold text-gray-655 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 bg-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 h-[34px] rounded-lg text-white text-[12px] font-bold hover:brightness-110 active:scale-[0.98] transition-all duration-200"
                  style={{ background: '#1a3480' }}
                >
                  Add Part
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
