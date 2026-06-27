import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { IconChevronLeft, IconPrinter, IconEdit } from '@tabler/icons-react';
import api from '../services/api';
import { toRupeesInWords } from '../utils/numberToWords';
import { ThemeHiSecure, ThemeClassic, ThemeModernBlue, ThemeMinimal, ThemeSaffron, ThemeDefault, ThemeTally, ThemeEmerald, ThemeCharcoal } from '../components/print/PrintTemplates';

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
  const [theme, setTheme] = useState<'default' | 'tally' | 'hisecure' | 'classic' | 'modern-blue' | 'minimal' | 'saffron' | 'emerald' | 'charcoal'>('default');
  const [size, setSize] = useState<'a4' | 'a5' | 'letter' | 'legal' | 'thermal-80mm' | 'thermal-58mm'>('a4');
  const [logoSize, setLogoSize] = useState<'small' | 'medium' | 'large' | 'hidden'>('medium');

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
          const defaultTheme = d.print.default_theme === 'legacy' ? 'default' : d.print.default_theme;
          setTheme(defaultTheme as any);
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

          {/* Logo Size Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium text-gray-500">Logo Size:</span>
            <select 
              value={logoSize} 
              onChange={(e) => setLogoSize(e.target.value as any)}
              className="border border-gray-200 rounded-lg px-2 h-[34px] text-[13px] text-gray-700 outline-none focus:border-blue-300"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="hidden">Hide Logo</option>
            </select>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium text-gray-500">Theme:</span>
            <select 
              value={theme} 
              onChange={(e) => setTheme(e.target.value as any)}
              className="border border-gray-200 rounded-lg px-2 h-[34px] text-[13px] text-gray-700 outline-none focus:border-blue-300"
            >
              <option value="default">Hi Secure Default</option>
              <option value="tally">Tally (Monospace)</option>
              <option value="hisecure">HiSecure Premium</option>
              <option value="classic">Classic (Serif B&W)</option>
              <option value="modern-blue">Modern Blue</option>
              <option value="minimal">Minimalist</option>
              <option value="saffron">Saffron (Tricolor)</option>
              <option value="emerald">Emerald Green</option>
              <option value="charcoal">Charcoal Sleek</option>
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
        {theme === 'default' && (
          <ThemeDefault
            company={company}
            invoice={{
              number: invoice.invoice_number,
              date: new Date(invoice.invoice_date).toLocaleDateString('en-IN'),
              due_date: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : undefined,
              place_of_supply: invoice.place_of_supply,
              reverse_charge: 'No',
              is_interstate: !isIntrastate,
              copy_type: 'Original for Recipient',
              grand_total: invoice.grand_total,
              subtotal: totalTaxable,
              tax_amount: totalGST,
              notes: invoice.notes,
            }}
            customer={{
              name: invoice.customer?.name || '—',
              phone: invoice.customer?.phone || '—',
              email: invoice.customer?.email,
              address: (invoice as any)._billingAddress || invoice.customer?.address || '—',
              gstin: invoice.customer?.gstin,
              state: invoice.customer?.state,
              contactPerson: (invoice as any).customer?._contactPerson,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name + (item.part.part_number ? ` (${item.part.part_number})` : ''),
              model: item.batch_number || item.part.part_number,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price,
              cgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              cgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              sgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              sgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              igst_rate: !isIntrastate ? item.tax_rate : 0,
              igst_amount: !isIntrastate ? item.tax_amount : 0,
              total: item.total_amount,
            }))}
            summary={{
              taxable_total: totalTaxable,
              cgst_total: isIntrastate ? (totalGST / 2) : 0,
              sgst_total: isIntrastate ? (totalGST / 2) : 0,
              igst_total: !isIntrastate ? totalGST : 0,
              round_off: invoice.grand_total - (totalTaxable + totalGST),
              grand_total: invoice.grand_total,
              amount_in_words: toRupeesInWords(invoice.grand_total),
            }}
            upiPaymentId={upiPaymentId}
            logoSize={logoSize}
          />
        )}

        {theme === 'hisecure' && (
          <ThemeHiSecure
            company={company}
            invoice={{
              number: invoice.invoice_number,
              date: new Date(invoice.invoice_date).toLocaleDateString('en-IN'),
              due_date: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : undefined,
              place_of_supply: invoice.place_of_supply,
              reverse_charge: 'No',
              is_interstate: !isIntrastate,
              copy_type: 'Original for Recipient',
              grand_total: invoice.grand_total,
              subtotal: totalTaxable,
              tax_amount: totalGST,
              notes: invoice.notes,
            }}
            customer={{
              name: invoice.customer?.name || '—',
              phone: invoice.customer?.phone || '—',
              email: invoice.customer?.email,
              address: (invoice as any)._billingAddress || invoice.customer?.address || '—',
              gstin: invoice.customer?.gstin,
              state: invoice.customer?.state,
              contactPerson: (invoice as any).customer?._contactPerson,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name + (item.part.part_number ? ` (${item.part.part_number})` : ''),
              model: item.batch_number || item.part.part_number,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price,
              cgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              cgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              sgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              sgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              igst_rate: !isIntrastate ? item.tax_rate : 0,
              igst_amount: !isIntrastate ? item.tax_amount : 0,
              total: item.total_amount,
            }))}
            summary={{
              taxable_total: totalTaxable,
              cgst_total: isIntrastate ? (totalGST / 2) : 0,
              sgst_total: isIntrastate ? (totalGST / 2) : 0,
              igst_total: !isIntrastate ? totalGST : 0,
              round_off: invoice.grand_total - (totalTaxable + totalGST),
              grand_total: invoice.grand_total,
              amount_in_words: toRupeesInWords(invoice.grand_total),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'classic' && (
          <ThemeClassic
            company={company}
            invoice={{
              number: invoice.invoice_number,
              date: new Date(invoice.invoice_date).toLocaleDateString('en-IN'),
              due_date: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : undefined,
              place_of_supply: invoice.place_of_supply,
              reverse_charge: 'No',
              is_interstate: !isIntrastate,
              copy_type: 'Original for Recipient',
              grand_total: invoice.grand_total,
              subtotal: totalTaxable,
              tax_amount: totalGST,
              notes: invoice.notes,
            }}
            customer={{
              name: invoice.customer?.name || '—',
              phone: invoice.customer?.phone || '—',
              email: invoice.customer?.email,
              address: (invoice as any)._billingAddress || invoice.customer?.address || '—',
              gstin: invoice.customer?.gstin,
              state: invoice.customer?.state,
              contactPerson: (invoice as any).customer?._contactPerson,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name + (item.part.part_number ? ` (${item.part.part_number})` : ''),
              model: item.batch_number || item.part.part_number,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price,
              cgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              cgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              sgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              sgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              igst_rate: !isIntrastate ? item.tax_rate : 0,
              igst_amount: !isIntrastate ? item.tax_amount : 0,
              total: item.total_amount,
            }))}
            summary={{
              taxable_total: totalTaxable,
              cgst_total: isIntrastate ? (totalGST / 2) : 0,
              sgst_total: isIntrastate ? (totalGST / 2) : 0,
              igst_total: !isIntrastate ? totalGST : 0,
              round_off: invoice.grand_total - (totalTaxable + totalGST),
              grand_total: invoice.grand_total,
              amount_in_words: toRupeesInWords(invoice.grand_total),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'modern-blue' && (
          <ThemeModernBlue
            company={company}
            invoice={{
              number: invoice.invoice_number,
              date: new Date(invoice.invoice_date).toLocaleDateString('en-IN'),
              due_date: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : undefined,
              place_of_supply: invoice.place_of_supply,
              reverse_charge: 'No',
              is_interstate: !isIntrastate,
              copy_type: 'Original for Recipient',
              grand_total: invoice.grand_total,
              subtotal: totalTaxable,
              tax_amount: totalGST,
              notes: invoice.notes,
            }}
            customer={{
              name: invoice.customer?.name || '—',
              phone: invoice.customer?.phone || '—',
              email: invoice.customer?.email,
              address: (invoice as any)._billingAddress || invoice.customer?.address || '—',
              gstin: invoice.customer?.gstin,
              state: invoice.customer?.state,
              contactPerson: (invoice as any).customer?._contactPerson,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name + (item.part.part_number ? ` (${item.part.part_number})` : ''),
              model: item.batch_number || item.part.part_number,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price,
              cgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              cgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              sgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              sgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              igst_rate: !isIntrastate ? item.tax_rate : 0,
              igst_amount: !isIntrastate ? item.tax_amount : 0,
              total: item.total_amount,
            }))}
            summary={{
              taxable_total: totalTaxable,
              cgst_total: isIntrastate ? (totalGST / 2) : 0,
              sgst_total: isIntrastate ? (totalGST / 2) : 0,
              igst_total: !isIntrastate ? totalGST : 0,
              round_off: invoice.grand_total - (totalTaxable + totalGST),
              grand_total: invoice.grand_total,
              amount_in_words: toRupeesInWords(invoice.grand_total),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'minimal' && (
          <ThemeMinimal
            company={company}
            invoice={{
              number: invoice.invoice_number,
              date: new Date(invoice.invoice_date).toLocaleDateString('en-IN'),
              due_date: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : undefined,
              place_of_supply: invoice.place_of_supply,
              reverse_charge: 'No',
              is_interstate: !isIntrastate,
              copy_type: 'Original for Recipient',
              grand_total: invoice.grand_total,
              subtotal: totalTaxable,
              tax_amount: totalGST,
              notes: invoice.notes,
            }}
            customer={{
              name: invoice.customer?.name || '—',
              phone: invoice.customer?.phone || '—',
              email: invoice.customer?.email,
              address: (invoice as any)._billingAddress || invoice.customer?.address || '—',
              gstin: invoice.customer?.gstin,
              state: invoice.customer?.state,
              contactPerson: (invoice as any).customer?._contactPerson,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name + (item.part.part_number ? ` (${item.part.part_number})` : ''),
              model: item.batch_number || item.part.part_number,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price,
              cgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              cgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              sgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              sgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              igst_rate: !isIntrastate ? item.tax_rate : 0,
              igst_amount: !isIntrastate ? item.tax_amount : 0,
              total: item.total_amount,
            }))}
            summary={{
              taxable_total: totalTaxable,
              cgst_total: isIntrastate ? (totalGST / 2) : 0,
              sgst_total: isIntrastate ? (totalGST / 2) : 0,
              igst_total: !isIntrastate ? totalGST : 0,
              round_off: invoice.grand_total - (totalTaxable + totalGST),
              grand_total: invoice.grand_total,
              amount_in_words: toRupeesInWords(invoice.grand_total),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'saffron' && (
          <ThemeSaffron
            company={company}
            invoice={{
              number: invoice.invoice_number,
              date: new Date(invoice.invoice_date).toLocaleDateString('en-IN'),
              due_date: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : undefined,
              place_of_supply: invoice.place_of_supply,
              reverse_charge: 'No',
              is_interstate: !isIntrastate,
              copy_type: 'Original for Recipient',
              grand_total: invoice.grand_total,
              subtotal: totalTaxable,
              tax_amount: totalGST,
              notes: invoice.notes,
            }}
            customer={{
              name: invoice.customer?.name || '—',
              phone: invoice.customer?.phone || '—',
              email: invoice.customer?.email,
              address: (invoice as any)._billingAddress || invoice.customer?.address || '—',
              gstin: invoice.customer?.gstin,
              state: invoice.customer?.state,
              contactPerson: (invoice as any).customer?._contactPerson,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name + (item.part.part_number ? ` (${item.part.part_number})` : ''),
              model: item.batch_number || item.part.part_number,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price,
              cgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              cgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              sgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              sgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              igst_rate: !isIntrastate ? item.tax_rate : 0,
              igst_amount: !isIntrastate ? item.tax_amount : 0,
              total: item.total_amount,
            }))}
            summary={{
              taxable_total: totalTaxable,
              cgst_total: isIntrastate ? (totalGST / 2) : 0,
              sgst_total: isIntrastate ? (totalGST / 2) : 0,
              igst_total: !isIntrastate ? totalGST : 0,
              round_off: invoice.grand_total - (totalTaxable + totalGST),
              grand_total: invoice.grand_total,
              amount_in_words: toRupeesInWords(invoice.grand_total),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'tally' && (
          <ThemeTally
            company={company}
            invoice={{
              number: invoice.invoice_number,
              date: new Date(invoice.invoice_date).toLocaleDateString('en-IN'),
              due_date: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : undefined,
              place_of_supply: invoice.place_of_supply,
              reverse_charge: 'No',
              is_interstate: !isIntrastate,
              copy_type: 'Original for Recipient',
              grand_total: invoice.grand_total,
              subtotal: totalTaxable,
              tax_amount: totalGST,
              notes: invoice.notes,
            }}
            customer={{
              name: invoice.customer?.name || '—',
              phone: invoice.customer?.phone || '—',
              email: invoice.customer?.email,
              address: (invoice as any)._billingAddress || invoice.customer?.address || '—',
              gstin: invoice.customer?.gstin,
              state: invoice.customer?.state,
              contactPerson: (invoice as any).customer?._contactPerson,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name + (item.part.part_number ? ` (${item.part.part_number})` : ''),
              model: item.batch_number || item.part.part_number,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price,
              cgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              cgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              sgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              sgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              igst_rate: !isIntrastate ? item.tax_rate : 0,
              igst_amount: !isIntrastate ? item.tax_amount : 0,
              total: item.total_amount,
            }))}
            summary={{
              taxable_total: totalTaxable,
              cgst_total: isIntrastate ? (totalGST / 2) : 0,
              sgst_total: isIntrastate ? (totalGST / 2) : 0,
              igst_total: !isIntrastate ? totalGST : 0,
              round_off: invoice.grand_total - (totalTaxable + totalGST),
              grand_total: invoice.grand_total,
              amount_in_words: toRupeesInWords(invoice.grand_total),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'emerald' && (
          <ThemeEmerald
            company={company}
            invoice={{
              number: invoice.invoice_number,
              date: new Date(invoice.invoice_date).toLocaleDateString('en-IN'),
              due_date: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : undefined,
              place_of_supply: invoice.place_of_supply,
              reverse_charge: 'No',
              is_interstate: !isIntrastate,
              copy_type: 'Original for Recipient',
              grand_total: invoice.grand_total,
              subtotal: totalTaxable,
              tax_amount: totalGST,
              notes: invoice.notes,
            }}
            customer={{
              name: invoice.customer?.name || '—',
              phone: invoice.customer?.phone || '—',
              email: invoice.customer?.email,
              address: (invoice as any)._billingAddress || invoice.customer?.address || '—',
              gstin: invoice.customer?.gstin,
              state: invoice.customer?.state,
              contactPerson: (invoice as any).customer?._contactPerson,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name + (item.part.part_number ? ` (${item.part.part_number})` : ''),
              model: item.batch_number || item.part.part_number,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price,
              cgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              cgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              sgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              sgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              igst_rate: !isIntrastate ? item.tax_rate : 0,
              igst_amount: !isIntrastate ? item.tax_amount : 0,
              total: item.total_amount,
            }))}
            summary={{
              taxable_total: totalTaxable,
              cgst_total: isIntrastate ? (totalGST / 2) : 0,
              sgst_total: isIntrastate ? (totalGST / 2) : 0,
              igst_total: !isIntrastate ? totalGST : 0,
              round_off: invoice.grand_total - (totalTaxable + totalGST),
              grand_total: invoice.grand_total,
              amount_in_words: toRupeesInWords(invoice.grand_total),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'charcoal' && (
          <ThemeCharcoal
            company={company}
            invoice={{
              number: invoice.invoice_number,
              date: new Date(invoice.invoice_date).toLocaleDateString('en-IN'),
              due_date: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : undefined,
              place_of_supply: invoice.place_of_supply,
              reverse_charge: 'No',
              is_interstate: !isIntrastate,
              copy_type: 'Original for Recipient',
              grand_total: invoice.grand_total,
              subtotal: totalTaxable,
              tax_amount: totalGST,
              notes: invoice.notes,
            }}
            customer={{
              name: invoice.customer?.name || '—',
              phone: invoice.customer?.phone || '—',
              email: invoice.customer?.email,
              address: (invoice as any)._billingAddress || invoice.customer?.address || '—',
              gstin: invoice.customer?.gstin,
              state: invoice.customer?.state,
              contactPerson: (invoice as any).customer?._contactPerson,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name + (item.part.part_number ? ` (${item.part.part_number})` : ''),
              model: item.batch_number || item.part.part_number,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price,
              cgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              cgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              sgst_rate: isIntrastate ? (item.tax_rate / 2) : 0,
              sgst_amount: isIntrastate ? (item.tax_amount / 2) : 0,
              igst_rate: !isIntrastate ? item.tax_rate : 0,
              igst_amount: !isIntrastate ? item.tax_amount : 0,
              total: item.total_amount,
            }))}
            summary={{
              taxable_total: totalTaxable,
              cgst_total: isIntrastate ? (totalGST / 2) : 0,
              sgst_total: isIntrastate ? (totalGST / 2) : 0,
              igst_total: !isIntrastate ? totalGST : 0,
              round_off: invoice.grand_total - (totalTaxable + totalGST),
              grand_total: invoice.grand_total,
              amount_in_words: toRupeesInWords(invoice.grand_total),
            }}
            logoSize={logoSize}
          />
        )}
      </div>
    </div>
  );
}
