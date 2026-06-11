import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  IconChevronLeft, 
  IconTool, 
  IconCheck, 
  IconAlertCircle, 
  IconX,
  IconReceipt,
  IconSearch,
  IconHourglass,
  IconPackage,
  IconCircleCheck,
  IconPlus
} from '@tabler/icons-react';
import api from '../../services/api';

const STATUS_STEPS = [
  { value: 'received', label: 'Received', color: '#2563eb', desc: 'Product logged', icon: IconReceipt },
  { value: 'diagnosed', label: 'Diagnosed', color: '#7c3aed', desc: 'Issues identified', icon: IconSearch },
  { value: 'awaiting_parts', label: 'Awaiting Parts', color: '#d97706', desc: 'Procuring parts', icon: IconHourglass },
  { value: 'in_repair', label: 'In Repair', color: '#059669', desc: 'Fix in progress', icon: IconTool },
  { value: 'ready_for_pickup', label: 'Ready for Pickup', color: '#0891b2', desc: 'Repaired & tested', icon: IconPackage },
  { value: 'completed', label: 'Completed', color: '#16a34a', desc: 'Handed over', icon: IconCircleCheck }
];

export default function RepairsForm({ backPath }: { backPath: string }) {
  const [customers, setCustomers] = useState<{ customer_id: number; name: string; phone?: string; address?: string }[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [brands, setBrands] = useState<{ brand_id: number; name: string }[]>([]);
  const [technicians, setTechnicians] = useState<{ technician_id: number; name: string }[]>([]);
  const [form, setForm] = useState({
    customer_id: 0, product_type: '', brand_id: 0, serial_number: '', model_number: '',
    problem_description: '', estimated_cost: 0, warranty_status: 'off', notes: '', assigned_technician_id: 0, actual_cost: 0,
    repair_status: 'received',
    phone: '', address: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', address: '', email: '' });
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const getId = () => window.location.pathname.match(/repairs\/(\d+)/)?.[1];

  useEffect(() => {
    const id = getId();
    setLoading(true);
    Promise.all([
      api.get('/customers').then(r => r.data.data ?? r.data ?? []),
      api.get('/repairs/meta/brands').then(r => r.data),
      api.get('/repairs/meta/technicians').then(r => r.data),
      id ? api.get(`/repairs/${id}`).then(r => r.data) : Promise.resolve(null)
    ]).then(([custs, brs, techs, rp]) => {
      setCustomers(custs);
      setBrands(brs);
      setTechnicians(techs);
      if (rp) {
        const matchingCust = custs.find((c: any) => c.customer_id === rp.customer_id);
        setCustomerSearch(matchingCust?.name || '');
        setForm({
          customer_id: rp.customer_id ?? 0,
          product_type: rp.product_type ?? '',
          brand_id: rp.brand_id ?? 0,
          serial_number: rp.serial_number ?? '',
          model_number: rp.model_number ?? '',
          problem_description: rp.problem_description ?? '',
          estimated_cost: rp.estimated_cost ?? 0,
          warranty_status: rp.warranty_status ? 'on' : 'off',
          notes: rp.notes ?? '',
          assigned_technician_id: rp.assigned_technician_id ?? 0,
          actual_cost: rp.actual_cost ?? 0,
          repair_status: rp.repair_status ?? 'received',
          phone: matchingCust?.phone || '',
          address: matchingCust?.address || '',
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const isEdit = !!getId();

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newCustomerData.name.trim();
    const trimmedPhone = newCustomerData.phone.trim();

    if (!trimmedName || !trimmedPhone) {
      alert("Customer name and phone are required.");
      return;
    }

    // Check if phone already exists
    const existingPhone = customers.find(c => c.phone === trimmedPhone);
    if (existingPhone) {
      alert(`A customer with the contact number '${trimmedPhone}' already exists (Name: ${existingPhone.name}). Please use a different contact number or select the existing customer.`);
      return;
    }
    
    setCreatingCustomer(true);
    try {
      const payload = {
        name: newCustomerData.name.trim(),
        phone: newCustomerData.phone.trim(),
        address: newCustomerData.address.trim(),
        email: newCustomerData.email.trim()
      };
      const res = await api.post('/customers', payload);
      const responseData = res.data.data || res.data;
      
      const newCust = {
        ...payload,
        customer_id: responseData.customer_id,
        customer_code: responseData.customer_code
      };
      
      setCustomers(prev => [...prev, newCust]);
      update('customer_id', newCust.customer_id);
      update('phone', newCust.phone || '');
      update('address', newCust.address || '');
      setCustomerSearch(newCust.name);
      
      setShowNewCustomerModal(false);
      setNewCustomerData({ name: '', phone: '', address: '', email: '' });
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create customer");
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_id || form.customer_id === 0) {
      alert('Please select a Customer.');
      return;
    }
    if (!form.phone || !form.phone.trim()) {
      alert('Customer Contact Number is required.');
      return;
    }
    if (!form.serial_number || !form.serial_number.trim()) {
      alert('Product Serial Number is required.');
      return;
    }

    setSaving(true);
    try {
      // Update customer profile first (if modified)
      const selectedCustomer = customers.find(c => c.customer_id === form.customer_id);
      if (selectedCustomer) {
        await api.put(`/customers/${form.customer_id}`, {
          ...selectedCustomer,
          phone: form.phone.trim(),
          address: form.address.trim()
        });
      }

      const id = getId();
      if (id) {
        await api.put(`/repairs/${id}`, form);
        await api.patch(`/repairs/${id}/status`, { status: form.repair_status });
      } else {
        await api.post('/repairs', form);
      }
      window.location.href = '/repairs';
    } catch { alert('Failed to save repair entry'); }
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
            <IconTool size={26} />
            {isEdit ? 'Modify Repair Request' : 'New Repair Booking'}
          </h1>
          <p className="text-[13px] opacity-90 mt-1">
            {isEdit ? 'Configure and update repair status, parts assigned, and cost estimates' : 'Book and check-in a client product / machine repair request'}
          </p>
        </div>
        <Link
          to={backPath}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[13px] transition-all hover:bg-white/30"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
        >
          <IconChevronLeft size={16} /> Back to Repairs
        </Link>
      </div>

      {loading && <div className="text-center py-20 text-gray-400">Loading repair details...</div>}

      {!loading && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-200">
          <div className="p-6 space-y-5">

            {isEdit && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 mb-2 shadow-sm transition-all duration-300">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Repair Lifecycle Status</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click a step below to update the current repair status.</p>
                  </div>
                  {form.repair_status === 'cancelled' ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-650 font-bold text-[11px] border border-red-200">
                      <IconAlertCircle size={14} /> Cancelled
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => update('repair_status', 'cancelled')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 font-semibold text-[11px] transition-all hover:border-red-300 cursor-pointer"
                    >
                      <IconX size={14} /> Cancel Repair
                    </button>
                  )}
                </div>

                {form.repair_status === 'cancelled' && (
                  <div className="mb-5 p-3.5 bg-red-50/60 border border-red-100 rounded-lg flex items-center justify-between animate-fadeIn">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-650">
                        <IconX size={18} />
                      </div>
                      <div>
                        <h4 className="text-[12px] font-bold text-red-800">Repair Job Cancelled</h4>
                        <p className="text-[11px] text-red-600/95 mt-0.5 font-medium">This repair request has been marked as cancelled. No further action is required.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => update('repair_status', 'received')}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:border-red-200 hover:text-red-600 rounded-lg text-[11px] font-bold text-slate-700 transition-all cursor-pointer shadow-sm hover:shadow"
                    >
                      Restore Repair
                    </button>
                  </div>
                )}

                {/* Horizontal Stepper container */}
                <div className={`relative flex items-center justify-between py-2 ${form.repair_status === 'cancelled' ? 'opacity-40 pointer-events-none' : ''}`}>
                  {/* Background progress bar line */}
                  <div className="absolute top-[26px] left-[5%] right-[5%] h-1 bg-slate-200 rounded-full -translate-y-1/2 z-0" />
                  
                  {/* Active filled line based on progress */}
                  <div 
                    className="absolute top-[26px] left-[5%] h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full -translate-y-1/2 transition-all duration-500 ease-out z-0"
                    style={{ 
                      width: `${(STATUS_STEPS.findIndex(s => s.value === form.repair_status) / (STATUS_STEPS.length - 1)) * 90}%` 
                    }}
                  />

                  {/* Stepper items */}
                  {STATUS_STEPS.map((step, idx) => {
                    const stepIndex = STATUS_STEPS.findIndex(s => s.value === form.repair_status);
                    const isCompleted = idx < stepIndex;
                    const isActive = idx === stepIndex;
                    const IconComponent = step.icon;

                    return (
                      <button
                        key={step.value}
                        type="button"
                        onClick={() => update('repair_status', step.value)}
                        className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none transition-all duration-300"
                        style={{ width: `${100 / STATUS_STEPS.length}%` }}
                      >
                        {/* Circle badge */}
                        <div 
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                            isActive 
                              ? 'text-white shadow-lg scale-110 ring-4 ring-offset-2' 
                              : isCompleted 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow' 
                                : 'bg-white border-slate-350 text-slate-400 group-hover:border-slate-400 group-hover:text-slate-600 shadow-sm'
                          }`}
                          style={{
                            backgroundColor: isActive ? step.color : isCompleted ? undefined : '#ffffff',
                            borderColor: isActive ? step.color : isCompleted ? undefined : undefined,
                            boxShadow: isActive ? `0 4px 12px -2px ${step.color}50` : undefined,
                          }}
                        >
                          {isCompleted ? (
                            <IconCheck size={18} strokeWidth={3.5} />
                          ) : (
                            <IconComponent size={18} />
                          )}
                        </div>

                        {/* Labels */}
                        <span className={`text-[10px] font-bold mt-2.5 transition-all duration-200 tracking-tight text-center px-1 ${
                          isActive 
                            ? 'font-extrabold scale-105' 
                            : isCompleted 
                              ? 'text-slate-700' 
                              : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                        style={{
                          color: isActive ? step.color : undefined
                        }}
                        >
                          {step.label}
                        </span>
                        
                        <span className={`text-[8.5px] text-center mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden md:block max-w-[90%] font-medium ${
                          isActive ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {step.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Row 1: Customer Details */}
              <div className="space-y-1 relative">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Customer <span className="text-red-600 text-[14px] font-black ml-0.5 select-none">*</span></label>
                <div className="flex gap-2 relative">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      value={customerSearch} 
                      onChange={e => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                        if (form.customer_id !== 0) {
                          update('customer_id', 0);
                          update('phone', '');
                          update('address', '');
                        }
                      }} 
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                      placeholder="Search by customer name..."
                      required
                      className="w-full border border-gray-200 rounded-lg px-3.5 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white font-bold" 
                    />
                    {form.customer_id > 0 && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex h-2 w-2 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerModal(true)}
                    className="w-[36px] h-[36px] flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm flex-shrink-0"
                    title="Add New Customer"
                  >
                    <IconPlus size={18} />
                  </button>
                </div>

                {showCustomerDropdown && (
                  <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-[200px] overflow-y-auto no-scrollbar py-1">
                    {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone && c.phone.includes(customerSearch))).length === 0 ? (
                      <div className="px-3 py-2 text-[11.5px] text-gray-400 text-center">No customers found</div>
                    ) : (
                      customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone && c.phone.includes(customerSearch))).map(c => (
                        <button
                          key={c.customer_id}
                          type="button"
                          onClick={() => {
                            update('customer_id', c.customer_id);
                            update('phone', c.phone || '');
                            update('address', c.address || '');
                            setCustomerSearch(c.name);
                            setShowCustomerDropdown(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-[11.5px] hover:bg-slate-50 transition-colors flex justify-between items-center group cursor-pointer"
                        >
                          <span className="font-semibold text-gray-700 group-hover:text-blue-600">{c.name}</span>
                          {c.phone && <span className="text-[10px] text-gray-400 font-medium group-hover:text-blue-500">{c.phone}</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Customer Contact Number <span className="text-red-600 text-[14px] font-black ml-0.5 select-none">*</span></label>
                <input 
                  type="text" 
                  value={form.phone} 
                  onChange={e => update('phone', e.target.value)}
                  placeholder="Enter contact number"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white font-bold" 
                />
              </div>

              {/* Row 2: Customer Address (Full Width) */}
              <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Customer Address</label>
                <textarea 
                  value={form.address} 
                  onChange={e => update('address', e.target.value)}
                  rows={2}
                  placeholder="Enter customer address"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white resize-none font-semibold" 
                />
              </div>

              {/* Row 3: Product Spec */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Product Type <span className="text-red-600 text-[14px] font-black ml-0.5 select-none">*</span></label>
                <input 
                  type="text" 
                  value={v('product_type')} 
                  onChange={e => update('product_type', e.target.value)} 
                  placeholder="e.g. LED TV, CCTV Camera" 
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white font-bold" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Brand</label>
                <select 
                  value={form.brand_id} 
                  onChange={e => update('brand_id', e.target.value ? Number(e.target.value) : 0)}
                  className="w-full border border-gray-200 rounded-lg px-3.5 h-[36px] text-[11.5px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                >
                  <option value="0">Select Brand...</option>
                  {brands.map(b => <option key={b.brand_id} value={b.brand_id}>{b.name}</option>)}
                </select>
              </div>

              {/* Row 4: Device Identity */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Model Number</label>
                <input 
                  type="text" 
                  value={v('model_number')} 
                  onChange={e => update('model_number', e.target.value)}
                  placeholder="e.g. Model-XY"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Serial Number <span className="text-red-600 text-[14px] font-black ml-0.5 select-none">*</span></label>
                <input 
                  type="text" 
                  value={v('serial_number')} 
                  onChange={e => update('serial_number', e.target.value)}
                  placeholder="e.g. SN-XXXX"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white font-mono font-bold" 
                />
              </div>

              {/* Row 5: Workshop Details */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Assigned Technician</label>
                <select 
                  value={form.assigned_technician_id} 
                  onChange={e => update('assigned_technician_id', e.target.value ? Number(e.target.value) : 0)}
                  className="w-full border border-gray-200 rounded-lg px-3.5 h-[36px] text-[11.5px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white font-bold text-blue-700"
                >
                  <option value="0">Select Technician...</option>
                  {technicians.map(t => <option key={t.technician_id} value={t.technician_id}>{t.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Warranty Status</label>
                <select 
                  value={v('warranty_status')} 
                  onChange={e => update('warranty_status', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3.5 h-[36px] text-[11.5px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                >
                  <option value="off">No Warranty</option>
                  <option value="on">Under Warranty</option>
                </select>
              </div>

              {/* Row 6: Costs */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estimated Cost (₹)</label>
                <input 
                  type="number" 
                  value={v('estimated_cost')} 
                  onChange={e => update('estimated_cost', Number(e.target.value))}
                  placeholder="Est Cost"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white text-right" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actual Cost (₹)</label>
                <input 
                  type="number" 
                  value={v('actual_cost')} 
                  onChange={e => update('actual_cost', Number(e.target.value))}
                  placeholder="Actual Cost"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white text-right" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Problem Description <span className="text-red-600 text-[14px] font-black ml-0.5 select-none">*</span></label>
              <textarea 
                value={v('problem_description')} 
                onChange={e => update('problem_description', e.target.value)} 
                rows={3}
                required
                placeholder="Declare product defects or specific issues mentioned by customer..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[11.5px] text-gray-850 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white resize-none font-bold" 
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Internal Notes / Technician Observations</label>
              <textarea 
                value={v('notes')} 
                onChange={e => update('notes', e.target.value)} 
                rows={2}
                placeholder="Technician diagnostic details or notes not shared with customer..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[11.5px] text-gray-850 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white resize-none" 
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-150">
              <Link
                to={backPath}
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
                {saving ? 'Saving...' : (isEdit ? 'Update Booking' : 'Create Repair')}
              </button>
            </div>

          </div>
        </form>
      )}

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <IconPlus size={18} className="text-blue-600" /> Create New Customer
              </h3>
              <button 
                type="button" 
                onClick={() => setShowNewCustomerModal(false)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <IconX size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateCustomer} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">Customer Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={newCustomerData.name}
                  onChange={e => setNewCustomerData(p => ({ ...p, name: e.target.value }))}
                  placeholder="Enter full name"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[38px] text-[12px] text-gray-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">Contact Number <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={newCustomerData.phone}
                  onChange={e => setNewCustomerData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="Enter phone number"
                  className="w-full border border-gray-200 rounded-lg px-3 h-[38px] text-[12px] text-gray-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">Address</label>
                <textarea 
                  rows={2}
                  value={newCustomerData.address}
                  onChange={e => setNewCustomerData(p => ({ ...p, address: e.target.value }))}
                  placeholder="Enter full address"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-800 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>
              
              <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2 rounded-lg text-[12px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creatingCustomer}
                  className="px-4 py-2 rounded-lg text-[12px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {creatingCustomer ? 'Creating...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
