import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { IconChevronLeft, IconPrinter } from '@tabler/icons-react';
import api from '../services/api';
import { toRupeesInWords } from '../utils/numberToWords';

interface POItem {
  po_item_id: number;
  part_id: number;
  quantity: number;
  unit_price: number;
  total_amount: number;
  batch_number?: string;
  part: {
    name: string;
    hsn_code?: string;
  };
}

interface PODetailType {
  po_id: number;
  po_number: string;
  order_date: string;
  expected_delivery?: string;
  status: string;
  total_amount: number;
  notes?: string;
  supplier?: {
    name: string;
    phone?: string;
    email?: string;
    gstin?: string;
    address?: string;
    supplier_code?: string;
  };
}

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [po, setPo] = useState<PODetailType | null>(null);
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
    api.get(`/purchases/${id}`)
      .then((r) => {
        const data = r.data;
        if (data) {
          data.total_amount = Number(data.total_amount || 0);
          if (data.items) {
            data.items = data.items.map((i: any) => ({
              ...i,
              unit_price: Number(i.unit_price || 0),
              total_amount: Number(i.total_amount || 0),
            }));
          }
        }
        setPo(data);
      })
      .catch((e) => {
        console.error('Error loading purchase order', e);
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
    return <div className="text-center py-20 text-gray-400">Loading purchase order...</div>;
  }

  if (!po) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-xl font-bold">Purchase Order not found</p>
        <Link to="/purchases" className="text-blue-600 hover:underline mt-2 inline-block">
          Return to list
        </Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const items = (po as any).items as POItem[] || [];

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

  return (
    <div className="print-page-container">
      <style>{getPageSizeCSS()}</style>

      {/* Toolbar */}
      <div className="no-print bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/purchases" className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <IconChevronLeft size={20} />
          </Link>
          <div>
            <h2 className="text-[16px] font-semibold text-gray-800">Purchase Order: {po.po_number}</h2>
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
            <IconPrinter size={16} /> Print Order
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
              Purchase Order
            </div>
            <div className="text-[11px] text-gray-600">
              <div className="mb-0.5"><span className="font-semibold">PO Number:</span> <span className="font-bold">{po.po_number}</span></div>
              <div className="mb-0.5"><span className="font-semibold">Date:</span> {new Date(po.order_date).toLocaleDateString('en-IN')}</div>
              {po.expected_delivery && <div><span className="font-semibold">Delivery By:</span> {new Date(po.expected_delivery).toLocaleDateString('en-IN')}</div>}
            </div>
          </div>
        </div>

        {/* Supplier Profile Box */}
        <div className="mb-5 p-3 border border-gray-100 rounded-lg billto-box max-w-md">
          <h3 className={`text-[12px] font-bold uppercase mb-2 ${theme === 'saffron' ? 'saffron-text' : 'text-gray-700'}`}>
            Order From (Supplier)
          </h3>
          {po.supplier ? (
            <div className="text-[11px] text-gray-600 leading-relaxed">
              <div className="font-bold text-[13px] text-gray-800 mb-0.5">{po.supplier.name}</div>
              {po.supplier.address && <div className="mb-1">{po.supplier.address}</div>}
              {po.supplier.phone && <div><span className="font-semibold">Mobile:</span> {po.supplier.phone}</div>}
              {po.supplier.email && <div><span className="font-semibold">Email:</span> {po.supplier.email}</div>}
              {po.supplier.gstin && <div className="font-semibold text-gray-700 mt-1">GSTIN: {po.supplier.gstin}</div>}
              {po.supplier.supplier_code && <div className="text-[10px] text-gray-400">Code: {po.supplier.supplier_code}</div>}
            </div>
          ) : (
            <div className="text-[11px] text-gray-400 italic">No supplier linked</div>
          )}
        </div>

        {/* PO Items Table */}
        <div className="mb-4">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-center py-1.5" style={{ width: '5%' }}>#</th>
                <th className="text-left py-1.5" style={{ width: '50%' }}>Description of Parts Ordered</th>
                <th className="text-center py-1.5" style={{ width: '12%' }}>HSN/SAC</th>
                <th className="text-center py-1.5" style={{ width: '8%' }}>Qty</th>
                <th className="text-right py-1.5" style={{ width: '12%' }}>Unit Cost</th>
                <th className="text-right py-1.5" style={{ width: '13%' }}>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.po_item_id || idx} className="border-b border-gray-100">
                  <td className="text-center py-2">{idx + 1}</td>
                  <td className="py-2">
                    <span className="font-bold text-[12px] block text-gray-800">{item.part.name}</span>
                    {item.batch_number && <span className="text-[9px] text-gray-400 block mt-0.5">Batch: {item.batch_number}</span>}
                  </td>
                  <td className="text-center py-2">{item.part.hsn_code || '998729'}</td>
                  <td className="text-center py-2">{item.quantity}</td>
                  <td className="text-right py-2">₹{item.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="text-right py-2 font-semibold">₹{item.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="text-[11px] text-gray-500">
            <div className="font-bold mb-1 uppercase text-gray-700">Total in words (For Billing):</div>
            <div className="italic font-semibold bg-gray-50 p-2 rounded border border-gray-100 text-gray-700">
              {toRupeesInWords(Number(po.total_amount))}
            </div>
            
            {po.notes && (
              <div className="mt-3">
                <span className="font-bold text-gray-700 block mb-0.5">Instructions:</span>
                <span className="text-[11px] text-gray-600 block">{po.notes}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <table className="w-[80%] text-[11px] border-none summary-box">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">Total Quantity</td>
                  <td className="text-right py-1 font-semibold">{items.reduce((s,i) => s + i.quantity, 0)} Unit(s)</td>
                </tr>
                <tr className={`font-bold text-[13px] ${theme === 'tally' ? 'tally-double-border' : 'text-gray-800'}`}>
                  <td className="py-2">Grand Total Value</td>
                  <td className="text-right py-2 text-[14px]">
                    ₹{Number(po.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* PO Terms and Signatures */}
        <div className="border-t border-gray-200 pt-4 mt-6 print-section">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-[9px] text-gray-400">
              <span className="font-bold text-gray-500 block uppercase">Terms & Instructions:</span>
              1. Please mention PO number on all bills and packages.
              <br />
              2. Goods must be delivered in proper packing to avoid transit damage.
              <br />
              3. Items must carry manufacturer warranty as applicable.
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
