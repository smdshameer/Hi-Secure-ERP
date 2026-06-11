import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { IconChevronLeft, IconPrinter, IconEdit } from '@tabler/icons-react';
import api from '../services/api';
import { toRupeesInWords } from '../utils/numberToWords';

interface InvoiceItem {
  item_id: number;
  part_id: number;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  batch_number?: string;
  part: {
    name: string;
    part_number?: string;
    hsn_code?: string;
  };
}

interface InvoiceDetailType {
  invoice_id: number;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  place_of_supply?: string;
  total_amount: number;
  tax_amount: number;
  grand_total: number;
  tax_type?: string;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  status: string;
  notes?: string;
  customer?: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    gstin?: string;
    state?: string;
  };
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [invoice, setInvoice] = useState<InvoiceDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'legacy' | 'tally' | 'classic' | 'modern-blue' | 'minimal' | 'saffron'>('legacy');
  const [size, setSize] = useState<'a4' | 'a5' | 'letter' | 'legal' | 'thermal-80mm' | 'thermal-58mm'>('a4');

  const [company, setCompany] = useState({
    name: 'Hi Secure Solutions',
    address: 'Plot No. 12, Dwarka Sector 7, New Delhi, Delhi - 110075',
    phone: '+91 99990 12345',
    email: 'billing@hisecuresolutions.com',
    gstin: '07AAAAA1111A1Z1',
    pan: 'AAAAA1111A',
    state: 'Delhi',
    website: 'www.hisecuresolutions.com',
    bank_name: 'HDFC Bank Ltd',
    bank_account: '50200012345678',
    ifsc_code: 'HDFC0000123',
    branch: 'Dwarka Sector 7',
    logo_url: '',
  });

  const [qrLoaded, setQrLoaded] = useState(false);
  const [upiPaymentId, setUpiPaymentId] = useState('gunalan@okaxis');

  useEffect(() => {
    // Check url search params or pathname for auto print
    const params = new URLSearchParams(location.search);
    const isPrintPath = location.pathname.endsWith('/print');
    if ((params.get('print') === 'true' || isPrintPath) && !loading && invoice && qrLoaded) {
      const autoPrint = () => {
        setTimeout(() => {
          window.print();
        }, 500);
      };
      autoPrint();
    }
  }, [location, loading, invoice, qrLoaded]);

  useEffect(() => {
    setLoading(true);
    api.get(`/invoices/${id}`)
      .then((r) => {
        const data = r.data;
        if (data) {
          data.grand_total = Number(data.grand_total || 0);
          data.tax_amount = Number(data.tax_amount || 0);
          data.total_amount = Number(data.total_amount || 0);
          if (data.items) {
            data.items = data.items.map((i: any) => ({
              ...i,
              unit_price: Number(i.unit_price || 0),
              tax_amount: Number(i.tax_amount || 0),
              total_amount: Number(i.total_amount || 0),
            }));
          }

          // Parse billing/shipping address from notes metadata
          if (data.notes) {
            const billMatch = data.notes.match(/Billing Address: (.*)/);
            const shipMatch = data.notes.match(/Shipping Address: (.*)/);
            const gstinMatch = data.notes.match(/GSTIN: (.*)/);
            const mobileMatch = data.notes.match(/Mobile Number: (.*)/);
            const contactMatch = data.notes.match(/Contact Person: (.*)/);
            if (billMatch) data._billingAddress = billMatch[1].trim();
            if (shipMatch) data._shippingAddress = shipMatch[1].trim();
            if (gstinMatch && data.customer) data.customer.gstin = gstinMatch[1].trim();
            if (mobileMatch && data.customer) data.customer.phone = mobileMatch[1].trim();
            if (contactMatch && data.customer) data.customer._contactPerson = contactMatch[1].trim();

            // Strip metadata block from notes display
            const metaIndex = data.notes.indexOf('--- METADATA ---');
            if (metaIndex !== -1) {
              let sliceEnd = metaIndex;
              if (data.notes.substring(Math.max(0, metaIndex - 2), metaIndex) === '\n\n') {
                sliceEnd = metaIndex - 2;
              } else if (data.notes.substring(Math.max(0, metaIndex - 1), metaIndex) === '\n') {
                sliceEnd = metaIndex - 1;
              }
              data.notes = data.notes.substring(0, sliceEnd).trim();
            }
          }
        }
        setInvoice(data);
      })
      .catch((e) => {
        console.error('Error loading invoice', e);
      })
      .finally(() => {
        setLoading(false);
      });

    api.get('/settings')
      .then((r) => {
        const d = r.data;
        const comp = d?.company || d;
        if (comp && comp.name) {
          setCompany((prev) => ({
            ...prev,
            name: comp.name || prev.name,
            address: comp.address || prev.address,
            phone: comp.phone ? String(comp.phone) : prev.phone,
            email: comp.email || prev.email,
            gstin: comp.gstin || prev.gstin,
            pan: comp.pan || prev.pan,
            state: comp.state || prev.state,
            website: comp.website || prev.website,
            bank_name: comp.bank_name || (comp.bank?.name) || prev.bank_name,
            bank_account: comp.bank_account || (comp.bank?.account_number) || prev.bank_account,
            ifsc_code: comp.ifsc_code || (comp.bank?.ifsc_code) || prev.ifsc_code,
            branch: comp.branch || (comp.bank?.branch) || prev.branch,
            logo_url: comp.logo_url || comp.logo_path || prev.logo_url,
          }));
        }
        if (d?.print?.default_theme) {
          setTheme(d.print.default_theme as any);
        }
        if (d?.print?.default_size) {
          setSize(d.print.default_size as any);
        }
        if (d?.print?.upi_payment_id) {
          setUpiPaymentId(d.print.upi_payment_id);
        }
      })
      .catch(() => {});
  }, [id]);

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading invoice details...</div>;
  }

  if (!invoice) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-xl font-bold">Invoice not found</p>
        <Link to="/sales" className="text-blue-600 hover:underline mt-2 inline-block">
          Return to list
        </Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const isIntrastate = !invoice.place_of_supply || 
    invoice.place_of_supply.toLowerCase().includes(company.state.toLowerCase()) ||
    (invoice.customer?.state && invoice.customer.state.toLowerCase().includes(company.state.toLowerCase()));

  const items = (invoice as any).items as InvoiceItem[] || [];
  
  // Calculate Totals
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalTaxable = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const totalGST = items.reduce((sum, item) => sum + (Number(item.tax_amount) || 0), 0);
  
  const cgstAmount = isIntrastate ? totalGST / 2 : 0;
  const sgstAmount = isIntrastate ? totalGST / 2 : 0;
  const igstAmount = !isIntrastate ? totalGST : 0;

  // HSN Summary Calculation
  const hsnSummaryMap: Record<string, { taxable: number; rate: number; tax: number }> = {};
  items.forEach((item) => {
    const hsn = item.part.hsn_code || '998729'; // Default service/repair HSN
    const taxable = item.quantity * item.unit_price;
    const tax = Number(item.tax_amount) || 0;
    const rate = Number(item.tax_rate) || 0;
    
    if (hsnSummaryMap[hsn]) {
      hsnSummaryMap[hsn].taxable += taxable;
      hsnSummaryMap[hsn].tax += tax;
    } else {
      hsnSummaryMap[hsn] = { taxable, rate, tax };
    }
  });

  const hsnSummaryList = Object.keys(hsnSummaryMap).map((hsn) => ({
    hsn,
    ...hsnSummaryMap[hsn],
  }));

  // Dynamic CSS Injector for Page Size
  const getPageSizeCSS = () => {
    let sizeValue = 'A4 portrait';
    let marginValue = '6.35mm';
    
    if (size === 'a5') {
      sizeValue = 'A5 portrait';
    } else if (size === 'letter') {
      sizeValue = 'letter portrait';
    } else if (size === 'legal') {
      sizeValue = 'legal portrait';
    } else if (size === 'thermal-80mm') {
      sizeValue = '80mm 250mm';
      marginValue = '2mm';
    } else if (size === 'thermal-58mm') {
      sizeValue = '58mm 250mm';
      marginValue = '2mm';
    }
    
    return `
      @page {
        size: ${sizeValue};
        margin: ${marginValue};
      }
    `;
  };

  return (
    <div className="print-page-container">
      {/* Dynamic Style Injection */}
      <style>{getPageSizeCSS()}</style>

      {/* Toolbar - hidden during print */}
      <div className="no-print bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/sales" className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <IconChevronLeft size={20} />
          </Link>
          <div>
            <h2 className="text-[16px] font-semibold text-gray-800">Invoice: {invoice.invoice_number}</h2>
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
              <option value="legacy">Legacy Box Layout</option>
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

          <Link 
            to={`/sales/${id}/edit`}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-[13px] font-semibold px-4 h-[34px] rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors bg-white"
          >
            <IconEdit size={16} /> Edit Invoice
          </Link>

          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-[#1a3480] text-white text-[13px] font-semibold px-4 h-[34px] rounded-lg hover:bg-blue-800 transition-colors"
          >
            <IconPrinter size={16} /> Print Document
          </button>
        </div>
      </div>

      {/* Invoice Document Canvas */}
      <div 
        className={`print-document theme-${theme} size-${size} flex flex-col`}
      >
            {/* Tricolor line for Saffron Theme */}
            {theme === 'saffron' && <div className="tricolor-line mb-3" />}

            {/* Document Header */}
            <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
              <div className="flex gap-4 items-start">
                {company.logo_url && (
                  <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: 4, padding: 2, background: '#fff' }}>
                    <img src={company.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                )}
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
              </div>
              
              <div className="text-right">
                <div className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded border uppercase mb-2 ${theme === 'saffron' ? 'saffron-bg border-transparent' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                  Tax Invoice
                </div>
                <div className="text-[11px] text-gray-600">
                  <div className="mb-0.5"><span className="font-semibold">Invoice No:</span> <span className="font-bold">{invoice.invoice_number}</span></div>
                  <div className="mb-0.5"><span className="font-semibold">Date:</span> {new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</div>
                  {invoice.due_date && <div><span className="font-semibold">Due Date:</span> {new Date(invoice.due_date).toLocaleDateString('en-IN')}</div>}
                  {invoice.place_of_supply && <div className="mt-1"><span className="font-semibold">Place of Supply:</span> {invoice.place_of_supply}</div>}
                </div>
              </div>
            </div>

            {/* Bill To & Ship To — perfectly aligned table */}
            <table className="w-full mb-5 text-[11px]" style={{ borderCollapse: 'collapse', border: theme === 'legacy' ? '1.5px solid #000' : '1px solid #e2e8f0', borderRadius: theme === 'legacy' ? '0' : '8px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: theme === 'legacy' ? '#ffffff' : undefined }}>
                  <th className={`w-1/2 text-left px-3 py-2 text-[12px] font-bold uppercase border-b border-r ${theme === 'saffron' ? 'saffron-text' : 'text-gray-700'}`} style={{ borderBottomColor: theme === 'legacy' ? '#000' : undefined, borderRightColor: theme === 'legacy' ? '#000' : undefined }}>
                    Billed To (Buyer)
                  </th>
                  <th className={`w-1/2 text-left px-3 py-2 text-[12px] font-bold uppercase border-b ${theme === 'saffron' ? 'saffron-text' : 'text-gray-700'} ${theme === 'legacy' ? '' : 'bg-gray-50'}`} style={{ borderBottomColor: theme === 'legacy' ? '#000' : undefined }}>
                    Shipped To (Consignee)
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Name row */}
                <tr>
                  <td className="px-3 pt-2 pb-0.5 font-bold text-[13px] text-gray-800 align-top" style={{ borderRight: theme === 'legacy' ? '1.5px solid #000' : undefined }}>
                    {(invoice as any).customer?._contactPerson || invoice.customer?.name || '—'}
                  </td>
                  <td className={`px-3 pt-2 pb-0.5 font-bold text-[13px] text-gray-800 align-top ${theme === 'legacy' ? '' : 'bg-gray-50/50'}`}>
                    {(invoice as any).customer?._contactPerson || invoice.customer?.name || '—'}
                  </td>
                </tr>
                {/* Address row */}
                <tr>
                  <td className="px-3 py-0.5 text-gray-600 align-top whitespace-pre-line" style={{ borderRight: theme === 'legacy' ? '1.5px solid #000' : undefined }}>
                    {(invoice as any)._billingAddress || invoice.customer?.address || '—'}
                  </td>
                  <td className={`px-3 py-0.5 text-gray-600 align-top whitespace-pre-line ${theme === 'legacy' ? '' : 'bg-gray-50/50'}`}>
                    {(invoice as any)._shippingAddress || (invoice as any)._billingAddress || invoice.customer?.address || '—'}
                  </td>
                </tr>
                {/* Mobile row */}
                <tr>
                  <td className="px-3 py-0.5 text-gray-600" style={{ borderRight: theme === 'legacy' ? '1.5px solid #000' : undefined }}>
                    <span className="font-semibold">Mobile:</span> {invoice.customer?.phone || '—'}
                  </td>
                  <td className={`px-3 py-0.5 text-gray-600 ${theme === 'legacy' ? '' : 'bg-gray-50/50'}`}>
                    <span className="font-semibold">State Code:</span> {invoice.customer?.gstin ? invoice.customer.gstin.substring(0, 2) : '—'}
                  </td>
                </tr>
                {/* GSTIN / Reverse Charge row */}
                <tr>
                  <td className="px-3 pt-0.5 pb-2 font-semibold text-gray-700 align-top" style={{ borderRight: theme === 'legacy' ? '1.5px solid #000' : undefined }}>
                    {invoice.customer?.gstin ? `GSTIN: ${invoice.customer.gstin}` : ''}
                  </td>
                  <td className={`px-3 pt-0.5 pb-2 text-gray-600 ${theme === 'legacy' ? '' : 'bg-gray-50/50'}`}>
                    <span className="font-semibold">Reverse Charge:</span> No
                  </td>
                </tr>
              </tbody>
            </table>


            {/* Invoice Items Table */}
            <div className="mb-4">
              <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse', border: theme === 'legacy' ? '1.5px solid #000' : undefined }}>
                <thead>
                  <tr style={{ background: theme === 'legacy' ? '#ffffff' : '#f3f4f6' }}>
                    <th className="text-center py-1.5 font-bold" style={{ width: '5%', border: theme === 'legacy' ? '1.5px solid #000' : undefined }}>#</th>
                    <th className="text-left py-1.5 font-bold" style={{ width: '40%', border: theme === 'legacy' ? '1.5px solid #000' : undefined }}>Description of Parts/Services</th>
                    <th className="text-center py-1.5 font-bold" style={{ width: '12%', border: theme === 'legacy' ? '1.5px solid #000' : undefined }}>HSN/SAC</th>
                    <th className="text-center py-1.5 font-bold" style={{ width: '8%', border: theme === 'legacy' ? '1.5px solid #000' : undefined }}>Qty</th>
                    <th className="text-right py-1.5 font-bold" style={{ width: '12%', border: theme === 'legacy' ? '1.5px solid #000' : undefined }}>Rate</th>
                    <th className="text-center py-1.5 font-bold" style={{ width: '8%', border: theme === 'legacy' ? '1.5px solid #000' : undefined }}>Tax %</th>
                    <th className="text-right py-1.5 font-bold" style={{ width: '15%', border: theme === 'legacy' ? '1.5px solid #000' : undefined }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.item_id || idx} style={{ borderBottom: theme === 'legacy' ? '1.5px solid #000' : '1px solid #f3f4f6' }}>
                      <td className="text-center py-2" style={{ borderRight: theme === 'legacy' ? '1.5px solid #000' : undefined }}>{idx + 1}</td>
                      <td className="py-2" style={{ borderRight: theme === 'legacy' ? '1.5px solid #000' : undefined }}>
                        <span className="font-bold text-[12px] block text-gray-800">{item.part.name}</span>
                        {item.batch_number && <span className="text-[9px] text-gray-400 block mt-0.5">Batch: {item.batch_number}</span>}
                      </td>
                      <td className="text-center py-2" style={{ borderRight: theme === 'legacy' ? '1.5px solid #000' : undefined }}>{item.part.hsn_code || '998729'}</td>
                      <td className="text-center py-2" style={{ borderRight: theme === 'legacy' ? '1.5px solid #000' : undefined }}>{item.quantity}</td>
                      <td className="text-right py-2" style={{ borderRight: theme === 'legacy' ? '1.5px solid #000' : undefined }}>₹{item.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="text-center py-2" style={{ borderRight: theme === 'legacy' ? '1.5px solid #000' : undefined }}>{item.tax_rate}%</td>
                      <td className="text-right py-2 font-semibold">₹{(item.quantity * item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400 italic" style={{ border: theme === 'legacy' ? '1.5px solid #000' : undefined }}>No line items added</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Tax Calculations Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="text-[11px] text-gray-500">
                <div className={`font-bold mb-1.5 uppercase ${theme === 'tally' ? 'text-black' : 'text-gray-700'}`}>Amount in words:</div>
                <div className="italic font-semibold bg-gray-50 p-2 rounded border border-gray-100 text-gray-700">
                  {toRupeesInWords(invoice.grand_total)}
                </div>
                
                {invoice.notes && (
                  <div className="mt-3">
                    <span className="font-bold text-gray-700 block mb-0.5">Remarks / Notes:</span>
                    <span className="text-[11px] text-gray-600 block">{invoice.notes}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <table className="w-[80%] text-[11px] border-none summary-box">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-1 text-gray-600">Total Taxable Value</td>
                      <td className="text-right py-1 font-semibold">₹{totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    {isIntrastate ? (
                      <>
                        <tr className="border-b border-gray-100">
                          <td className="py-1 text-gray-600">Central Tax (CGST)</td>
                          <td className="text-right py-1">₹{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-1 text-gray-600">State Tax (SGST)</td>
                          <td className="text-right py-1">₹{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      </>
                    ) : (
                      <tr className="border-b border-gray-100">
                        <td className="py-1 text-gray-600">Integrated Tax (IGST)</td>
                        <td className="text-right py-1">₹{igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}
                    <tr className="border-b border-gray-200">
                      <td className="py-1 text-gray-600">Round Off</td>
                      <td className="text-right py-1">
                        ₹{(invoice.grand_total - (totalTaxable + totalGST)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className={`font-bold text-[13px] ${theme === 'tally' ? 'tally-double-border' : 'text-gray-800'}`}>
                      <td className="py-2">Grand Total</td>
                      <td className="text-right py-2 text-[14px]">
                        ₹{invoice.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* GST HSN Summary Breakup Table (Compliant requirement) */}
            {hsnSummaryList.length > 0 && (
              <div className="mb-5 print-section">
                <h4 className="text-[10px] font-bold text-gray-700 uppercase mb-1">GST HSN Breakup Summary</h4>
                <table className="w-full text-[9px] border border-gray-200 text-center">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-1 border-r border-gray-200">HSN/SAC</th>
                      <th className="py-1 border-r border-gray-200">Taxable Value</th>
                      {isIntrastate ? (
                        <>
                          <th className="py-1 border-r border-gray-200" colSpan={2}>Central Tax</th>
                          <th className="py-1 border-r border-gray-200" colSpan={2}>State Tax</th>
                        </>
                      ) : (
                        <th className="py-1 border-r border-gray-200" colSpan={2}>Integrated Tax</th>
                      )}
                      <th className="py-1">Total Tax Amount</th>
                    </tr>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-1 border-r border-gray-200" />
                      <th className="py-1 border-r border-gray-200" />
                      {isIntrastate ? (
                        <>
                          <th className="py-0.5 border-r border-gray-200">Rate</th>
                          <th className="py-0.5 border-r border-gray-200">Amount</th>
                          <th className="py-0.5 border-r border-gray-200">Rate</th>
                          <th className="py-0.5 border-r border-gray-200">Amount</th>
                        </>
                      ) : (
                        <>
                          <th className="py-0.5 border-r border-gray-200">Rate</th>
                          <th className="py-0.5 border-r border-gray-200">Amount</th>
                        </>
                      )}
                      <th className="py-0.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {hsnSummaryList.map((h, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-1.5 border-r border-gray-200 font-semibold">{h.hsn}</td>
                        <td className="py-1.5 border-r border-gray-200 text-right pr-2">₹{h.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        {isIntrastate ? (
                          <>
                            <td className="py-1.5 border-r border-gray-200">{(h.rate / 2)}%</td>
                            <td className="py-1.5 border-r border-gray-200 text-right pr-2">₹{(h.tax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-1.5 border-r border-gray-200">{(h.rate / 2)}%</td>
                            <td className="py-1.5 border-r border-gray-200 text-right pr-2">₹{(h.tax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-1.5 border-r border-gray-200">{h.rate}%</td>
                            <td className="py-1.5 border-r border-gray-200 text-right pr-2">₹{h.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </>
                        )}
                        <td className="py-1.5 text-right pr-2 font-bold">₹{h.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bank Details & Terms & Signatory Block */}
            {theme === 'legacy' ? (
              <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse', marginTop: 10, border: '1px solid #000' }}>
                <tbody>
                  <tr>
                    <td className="w-1/2 p-2 border-r border-black align-top" style={{ height: 60 }}>
                      <span className="font-bold block mb-1">Important Notes:</span>
                      <span className="text-gray-700">{invoice.notes || 'We only accept bank and cheque transactions.'}</span>
                    </td>
                    <td className="w-1/2 p-2 align-top text-right flex flex-col justify-between" style={{ height: 60 }}>
                      <div className="font-bold">For, {company.name}</div>
                      <div className="text-[9px] text-gray-500 mt-6">(Authorized Signatory)</div>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="text-center py-1.5 border-t border-black text-[10px] font-semibold">
                      This is a Computer Generated Invoice.
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 pt-4 print-section">
                <div>
                  <div className="text-[10px] text-gray-500 leading-normal">
                    <span className="font-bold text-gray-700 block uppercase mb-1">Company Bank Details:</span>
                    <div><span className="font-semibold">Bank Name:</span> {company.bank_name}</div>
                    <div><span className="font-semibold">A/c Number:</span> {company.bank_account}</div>
                    <div><span className="font-semibold">IFSC Code:</span> {company.ifsc_code}</div>
                    <div><span className="font-semibold">Branch:</span> {company.branch}</div>
                  </div>
                  
                  <div className="text-[9px] text-gray-400 mt-3 max-w-sm">
                    <span className="font-bold text-gray-500 block uppercase">Terms & Conditions:</span>
                    1. Goods once sold will not be taken back.
                    <br />
                    2. Warranty is subject to manufacturer terms and conditions.
                    <br />
                    3. Interest @18% p.a. will be charged for delayed payment.
                  </div>
                </div>

                <div className="flex flex-col justify-between items-end text-right">
                  <div className="text-[11px] text-gray-600">
                    For <span className="font-bold text-gray-800 uppercase">{company.name}</span>
                  </div>
                  
                  <div className="mt-12 w-[160px] text-center signatory-box">
                    <div className="h-[35px]" /> {/* signature spacer */}
                    <div className="border-t border-gray-400 pt-1 text-[10px] font-semibold text-gray-600 uppercase">
                      Authorized Signatory
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            {theme !== 'legacy' && (
              <div className="border-t border-gray-100 pt-3 mt-4 text-center text-[9px] text-gray-400">
                This is a computer-generated tax invoice. No signature required. Thank you for your business!
              </div>
            )}
      </div>
    </div>
  );
}
