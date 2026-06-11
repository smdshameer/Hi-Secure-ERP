import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { IconChevronLeft, IconPrinter } from '@tabler/icons-react';
import api from '../services/api';
import { toRupeesInWords } from '../utils/numberToWords';

interface ChallanItem {
  challan_item_id: number;
  part_id: number;
  quantity: number;
  unit_price?: number;
  batch_number?: string;
  serial_numbers: string[];
  remarks?: string;
  part: {
    name: string;
    hsn_code?: string;
  };
}

interface ChallanDetailType {
  delivery_challan_id: number;
  challan_number: string;
  challan_date: string;
  expected_delivery_date?: string;
  vehicle_number?: string;
  driver_name?: string;
  transporter_name?: string;
  eway_bill_number?: string;
  purposes?: string;
  status: string;
  total_quantity: number;
  total_amount: number;
  notes?: string;
  customer?: {
    name: string;
    phone: string;
    address?: string;
    gstin?: string;
  };
  supplier?: {
    name: string;
    phone?: string;
    address?: string;
    gstin?: string;
  };
  fromLocation?: {
    name: string;
    address?: string;
  };
  toLocation?: {
    name: string;
    address?: string;
  };
}

export default function DeliveryChallanDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [challan, setChallan] = useState<ChallanDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'tally' | 'classic' | 'modern-blue' | 'minimal' | 'saffron'>('classic');
  const [size, setSize] = useState<'a4' | 'a5' | 'letter' | 'legal' | 'thermal-80mm' | 'thermal-58mm'>('a4');

  const [company, setCompany] = useState({
    name: 'Hi Secure Solutions',
    address: 'Plot No. 12, Dwarka Sector 7, New Delhi, Delhi - 110075',
    phone: '+91 99990 12345',
    email: 'billing@hisecuresolutions.com',
    gstin: '07AAAAA1111A1Z1',
    pan: 'AAAAA1111A',
    state: 'Delhi',
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('print') === 'true') {
      setTimeout(() => {
        window.print();
      }, 800);
    }
  }, [location]);

  useEffect(() => {
    setLoading(true);
    api.get(`/delivery-challans/${id}`)
      .then((r) => {
        const data = r.data;
        if (data) {
          data.total_amount = Number(data.total_amount || 0);
          data.total_quantity = Number(data.total_quantity || 0);
          if (data.items) {
            data.items = data.items.map((i: any) => ({
              ...i,
              unit_price: Number(i.unit_price || 0),
            }));
          }
        }
        setChallan(data);
      })
      .catch((e) => {
        console.error('Error loading challan', e);
      })
      .finally(() => {
        setLoading(false);
      });

    api.get('/settings')
      .then((r) => {
        const settings = r.data?.company || r.data;
        if (settings && settings.name) {
          setCompany((prev) => ({
            ...prev,
            name: settings.name || prev.name,
            address: settings.address || prev.address,
            phone: settings.phone || prev.phone,
            email: settings.email || prev.email,
            gstin: settings.gstin || prev.gstin,
            pan: settings.pan || prev.pan,
            state: settings.state || prev.state,
          }));
        }
      })
      .catch(() => {});
  }, [id]);

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading delivery challan...</div>;
  }

  if (!challan) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-xl font-bold">Delivery Challan not found</p>
        <Link to="/delivery-challans" className="text-blue-600 hover:underline mt-2 inline-block">
          Return to list
        </Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const items = (challan as any).items as ChallanItem[] || [];

  const getPageSizeCSS = () => {
    let sizeValue = 'A4 portrait';
    if (size === 'a5') sizeValue = 'A5 portrait';
    if (size === 'letter') sizeValue = 'letter portrait';
    if (size === 'legal') sizeValue = 'legal portrait';
    if (size === 'thermal-80mm') sizeValue = '80mm 250mm';
    if (size === 'thermal-58mm') sizeValue = '58mm 250mm';
    
    return `
      @page {
        size: ${sizeValue};
        margin: ${size.startsWith('thermal') ? '2mm' : '10mm 12mm'};
      }
    `;
  };

  // Determine Recipient (Customer or Supplier or Destination Location)
  const recipientName = challan.customer?.name || challan.supplier?.name || challan.toLocation?.name || 'Internal Transfer';
  const recipientAddress = challan.customer?.address || challan.supplier?.address || challan.toLocation?.address || '';
  const recipientGstin = challan.customer?.gstin || challan.supplier?.gstin || '';
  const recipientPhone = challan.customer?.phone || challan.supplier?.phone || '';

  return (
    <div className="print-page-container">
      <style>{getPageSizeCSS()}</style>

      {/* Toolbar */}
      <div className="no-print bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/delivery-challans" className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <IconChevronLeft size={20} />
          </Link>
          <div>
            <h2 className="text-[16px] font-semibold text-gray-800">Challan: {challan.challan_number}</h2>
            <p className="text-[12px] text-gray-400">Preview and print using custom themes</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Theme Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium text-gray-500">Theme:</span>
            <select 
              value={theme} 
              onChange={(e) => setTheme(e.target.value as any)}
              className="border border-gray-200 rounded-lg px-2 h-[34px] text-[13px] text-gray-700 outline-none focus:border-blue-300"
            >
              <option value="tally">Tally (Monospace)</option>
              <option value="classic">Classic (Serif B&W)</option>
              <option value="modern-blue">Modern Blue</option>
              <option value="minimal">Minimalist</option>
              <option value="saffron">Saffron (Tricolor)</option>
            </select>
          </div>

          {/* Size Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium text-gray-500">Paper:</span>
            <select 
              value={size} 
              onChange={(e) => setSize(e.target.value as any)}
              className="border border-gray-200 rounded-lg px-2 h-[34px] text-[13px] text-gray-700 outline-none focus:border-blue-300"
            >
              <option value="a4">A4</option>
              <option value="a5">A5</option>
              <option value="letter">Letter</option>
              <option value="legal">Legal</option>
              <option value="thermal-80mm">Thermal (80mm)</option>
              <option value="thermal-58mm">Thermal (58mm)</option>
            </select>
          </div>

          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-[#1a3480] text-white text-[13px] font-semibold px-4 h-[34px] rounded-lg hover:bg-blue-800 transition-colors"
          >
            <IconPrinter size={16} /> Print Challan
          </button>
        </div>
      </div>

      {/* Document Canvas */}
      <div className={`print-document theme-${theme} size-${size}`}>
        {theme === 'saffron' && <div className="tricolor-line mb-3" />}

        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
          <div>
            <h1 className={`text-2xl font-bold uppercase ${theme === 'saffron' ? 'saffron-text' : 'text-gray-800'}`}>
              {company.name}
            </h1>
            <p className="text-[11px] text-gray-500 max-w-sm whitespace-pre-line leading-relaxed">
              {company.address}
            </p>
            <div className="text-[11px] text-gray-500 mt-1">
              <span className="font-semibold">Ph:</span> {company.phone} · <span className="font-semibold">Email:</span> {company.email}
            </div>
            <div className="text-[11px] text-gray-600 mt-0.5">
              <span className="font-semibold">GSTIN:</span> {company.gstin} · <span className="font-semibold">PAN:</span> {company.pan}
            </div>
          </div>
          
          <div className="text-right">
            <div className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded border uppercase mb-2 ${theme === 'saffron' ? 'saffron-bg border-transparent' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
              Delivery Challan
            </div>
            <div className="text-[11px] text-gray-600">
              <div className="mb-0.5"><span className="font-semibold">Challan No:</span> <span className="font-bold">{challan.challan_number}</span></div>
              <div className="mb-0.5"><span className="font-semibold">Date:</span> {new Date(challan.challan_date).toLocaleDateString('en-IN')}</div>
              {challan.purposes && <div><span className="font-semibold">Purpose:</span> <span className="font-semibold uppercase text-blue-600">{challan.purposes}</span></div>}
            </div>
          </div>
        </div>

        {/* Dispatch & Transport Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div className="p-3 border border-gray-100 rounded-lg billto-box">
            <h3 className={`text-[12px] font-bold uppercase mb-2 ${theme === 'saffron' ? 'saffron-text' : 'text-gray-700'}`}>
              Delivery Recipient
            </h3>
            <div className="text-[11px] text-gray-600 leading-relaxed">
              <div className="font-bold text-[13px] text-gray-800 mb-0.5">{recipientName}</div>
              {recipientAddress && <div className="mb-1">{recipientAddress}</div>}
              {recipientPhone && <div><span className="font-semibold">Mobile:</span> {recipientPhone}</div>}
              {recipientGstin && <div className="font-semibold text-gray-700 mt-1">GSTIN: {recipientGstin}</div>}
            </div>
          </div>

          <div className="p-3 border border-gray-100 rounded-lg bg-gray-50/50">
            <h3 className="text-[12px] font-bold text-gray-700 uppercase mb-2">Transportation & Dispatch</h3>
            <div className="text-[11px] text-gray-600 space-y-0.5">
              <div><span className="font-semibold">Vehicle Number:</span> {challan.vehicle_number || '—'}</div>
              <div><span className="font-semibold">Driver Name:</span> {challan.driver_name || '—'}</div>
              <div><span className="font-semibold">Transporter:</span> {challan.transporter_name || '—'}</div>
              {challan.eway_bill_number && <div><span className="font-semibold">E-Way Bill:</span> <span className="font-bold">{challan.eway_bill_number}</span></div>}
              {challan.fromLocation && <div><span className="font-semibold">From Branch:</span> {challan.fromLocation.name}</div>}
              {challan.toLocation && <div><span className="font-semibold">To Branch:</span> {challan.toLocation.name}</div>}
            </div>
          </div>
        </div>

        {/* Challan Items Table */}
        <div className="mb-4">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-center py-1.5" style={{ width: '5%' }}>#</th>
                <th className="text-left py-1.5" style={{ width: '45%' }}>Description of Goods / Components</th>
                <th className="text-center py-1.5" style={{ width: '12%' }}>HSN/SAC</th>
                <th className="text-center py-1.5" style={{ width: '10%' }}>Qty</th>
                <th className="text-right py-1.5" style={{ width: '13%' }}>Value (Est.)</th>
                <th className="text-right py-1.5" style={{ width: '15%' }}>Total Value</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const price = Number(item.unit_price) || 0;
                return (
                  <tr key={item.challan_item_id || idx} className="border-b border-gray-100">
                    <td className="text-center py-2">{idx + 1}</td>
                    <td className="py-2">
                      <span className="font-bold text-[12px] block text-gray-800">{item.part.name}</span>
                      {item.batch_number && <span className="text-[9px] text-gray-400 block mt-0.5">Batch: {item.batch_number}</span>}
                      {item.serial_numbers?.length > 0 && (
                        <div className="text-[9px] text-gray-500 mt-1">
                          <span className="font-semibold">Serial Nos:</span> {item.serial_numbers.join(', ')}
                        </div>
                      )}
                      {item.remarks && <span className="text-[10px] text-gray-400 block italic">Remark: {item.remarks}</span>}
                    </td>
                    <td className="text-center py-2">{item.part.hsn_code || '998729'}</td>
                    <td className="text-center py-2">{item.quantity}</td>
                    <td className="text-right py-2">₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="text-right py-2 font-semibold">₹{(item.quantity * price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary Block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="text-[11px] text-gray-500">
            <div className="font-bold mb-1 uppercase text-gray-700">Valuation in words (For Transport):</div>
            <div className="italic font-semibold bg-gray-50 p-2 rounded border border-gray-100 text-gray-700">
              {toRupeesInWords(Number(challan.total_amount))}
            </div>
            
            {challan.notes && (
              <div className="mt-3">
                <span className="font-bold text-gray-700 block mb-0.5">Notes / Terms:</span>
                <span className="text-[11px] text-gray-600 block">{challan.notes}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <table className="w-[80%] text-[11px] border-none summary-box">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">Total Quantity</td>
                  <td className="text-right py-1 font-semibold">{challan.total_quantity} Unit(s)</td>
                </tr>
                <tr className={`font-bold text-[13px] ${theme === 'tally' ? 'tally-double-border' : 'text-gray-800'}`}>
                  <td className="py-2">Declared Valuation</td>
                  <td className="text-right py-2 text-[14px]">
                    ₹{Number(challan.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Declarations & Double Signature Block */}
        <div className="border-t border-gray-200 pt-4 mt-6 print-section">
          <div className="text-[9px] text-gray-400 max-w-xl mb-6">
            <span className="font-bold text-gray-500 block uppercase">Declaration:</span>
            This Delivery Challan is issued for transportation of goods/materials under Rule 55 of CGST Rules, 2017. 
            The goods listed herein are dispatched for purposes other than supply (e.g. branch transfer/job work/consignment) and do not represent a sale invoice. 
            Receipt of goods in good condition is acknowledged.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-left">
              <div className="text-[11px] text-gray-600">
                Receiver's Signature & Stamp
              </div>
              <div className="mt-12 w-[160px] signatory-box">
                <div className="h-[35px]" />
                <div className="border-t border-gray-400 pt-1 text-[10px] font-semibold text-gray-600 uppercase">
                  Received By
                </div>
              </div>
            </div>

            <div className="text-right flex flex-col items-end">
              <div className="text-[11px] text-gray-600">
                For <span className="font-bold text-gray-800 uppercase">{company.name}</span>
              </div>
              <div className="mt-12 w-[160px] text-center signatory-box">
                <div className="h-[35px]" />
                <div className="border-t border-gray-400 pt-1 text-[10px] font-semibold text-gray-600 uppercase">
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
