import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { IconChevronLeft, IconPrinter, IconCheck, IconFileInvoice } from '@tabler/icons-react';
import api from '../services/api';
import { toRupeesInWords } from '../utils/numberToWords';
import { ThemeHiSecure, ThemeClassic, ThemeModernBlue, ThemeMinimal, ThemeSaffron, ThemeDefault, ThemeTally, ThemeEmerald, ThemeCharcoal } from '../components/print/PrintTemplates';

interface QuotationItem {
  quote_item_id: number;
  part_id: number;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  total: number;
  part: {
    name: string;
    hsn_code?: string;
  };
}

interface QuotationDetailType {
  quote_id: number;
  quote_number: string;
  quote_date: string;
  valid_until: string;
  status: string;
  subtotal: number;
  total_discount: number;
  total_tax: number;
  total_amount: number;
  terms?: string;
  notes?: string;
  customer?: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    gstin?: string;
    state?: string;
  };
  _reference_no?: string;
  _sales_executive?: string;
  _contact_person?: string;
  _mobile_number?: string;
  _gstin?: string;
  _billing_address?: string;
  _shipping_address?: string;
}

export default function QuotationDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [quotation, setQuotation] = useState<QuotationDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'default' | 'tally' | 'hisecure' | 'classic' | 'modern-blue' | 'minimal' | 'saffron' | 'emerald' | 'charcoal'>('default');
  const [size, setSize] = useState<'a4' | 'a5' | 'letter' | 'legal' | 'thermal-80mm' | 'thermal-58mm'>('a4');
  const [logoSize, setLogoSize] = useState<'small' | 'medium' | 'large' | 'hidden'>('medium');
  const [actionLoading, setActionLoading] = useState(false);

  // test local sync
  const handleAccept = async () => {
    try {
      setActionLoading(true);
      await api.patch(`/quotations/${id}/status`, { status: 'accepted' });
      const r = await api.get(`/quotations/${id}`);
      setQuotation(r.data);
    } catch (err) {
      alert('Failed to accept quotation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvert = async () => {
    try {
      setActionLoading(true);
      const res = await api.post(`/quotations/${id}/convert`);
      window.location.href = `/sales/${res.data.invoiceId}`;
    } catch {
      alert('Failed to convert quotation to invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const [company, setCompany] = useState({
    name: 'Hi Secure Solutions',
    address: 'Plot No. 12, Dwarka Sector 7, New Delhi, Delhi - 110075',
    phone: '+91 99990 12345',
    email: 'billing@hisecuresolutions.com',
    gstin: '07AAAAA1111A1Z1',
    pan: 'AAAAA1111A',
    state: 'Delhi',
    logo_url: '',
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
    api.get(`/quotations/${id}`)
      .then((r) => {
        const data = r.data;
        if (data) {
          data.subtotal = Number(data.subtotal || 0);
          data.total_discount = Number(data.total_discount || 0);
          data.total_tax = Number(data.total_tax || 0);
          data.total_amount = Number(data.total_amount || 0);
          if (data.items) {
            data.items = data.items.map((i: any) => ({
              ...i,
              unit_price: Number(i.unit_price || 0),
              total: Number(i.total || 0),
            }));
          }

          let notesCleaned = data.notes || '';
          let reference_no = '';
          let sales_executive = '';
          let contact_person = '';
          let mobile_number = data.customer?.phone || '';
          let gstin = data.customer?.gstin || '';
          let billing_address = data.customer?.address || '';
          let shipping_address = data.customer?.address || '';

          const metaIndex = notesCleaned.indexOf('\n\n--- METADATA ---');
          if (metaIndex !== -1) {
            const metaText = notesCleaned.substring(metaIndex);
            notesCleaned = notesCleaned.substring(0, metaIndex);

            const refMatch = metaText.match(/Reference No: (.*)/);
            if (refMatch) reference_no = refMatch[1];

            const execMatch = metaText.match(/Sales Executive: (.*)/);
            if (execMatch) sales_executive = execMatch[1];

            const contactMatch = metaText.match(/Contact Person: (.*)/);
            if (contactMatch) contact_person = contactMatch[1];

            const mobileMatch = metaText.match(/Mobile Number: (.*)/);
            if (mobileMatch) mobile_number = mobileMatch[1];

            const gstinMatch = metaText.match(/GSTIN: (.*)/);
            if (gstinMatch) gstin = gstinMatch[1];

            const billMatch = metaText.match(/Billing Address: (.*)/);
            if (billMatch) billing_address = billMatch[1];

            const shipMatch = metaText.match(/Shipping Address: (.*)/);
            if (shipMatch) shipping_address = shipMatch[1];
          }

          data.notes = notesCleaned;
          data._reference_no = reference_no;
          data._sales_executive = sales_executive;
          data._contact_person = contact_person;
          data._mobile_number = mobile_number;
          data._gstin = gstin;
          data._billing_address = billing_address;
          data._shipping_address = shipping_address;
        }
        setQuotation(data);
      })
      .catch((e) => {
        console.error('Error loading quotation', e);
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
            logo_url: settings.logo_url || settings.logo_path || '',
          }));
        }
        if (settings?.print?.default_theme) {
          const defaultTheme = settings.print.default_theme === 'legacy' ? 'default' : settings.print.default_theme;
          setTheme(defaultTheme as any);
        }
        if (settings?.print?.default_size) {
          setSize(settings.print.default_size as any);
        }
      })
      .catch(() => {});
  }, [id]);

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading quotation details...</div>;
  }

  if (!quotation) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-xl font-bold">Quotation not found</p>
        <Link to="/quotations" className="text-blue-600 hover:underline mt-2 inline-block">
          Return to list
        </Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const items = (quotation as any).items as QuotationItem[] || [];

  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

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
          <Link to="/quotations" className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <IconChevronLeft size={20} />
          </Link>
          <div>
            <h2 className="text-[16px] font-semibold text-gray-800">Quotation: {quotation.quote_number}</h2>
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

          {(quotation.status === 'draft' || quotation.status === 'sent') && (
            <button 
              onClick={handleAccept}
              disabled={actionLoading}
              className="flex items-center gap-1.5 bg-green-600 text-white text-[13px] font-semibold px-4 h-[34px] rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <IconCheck size={16} /> Accept Quotation
            </button>
          )}
          {quotation.status === 'accepted' && (
            <button 
              onClick={handleConvert}
              disabled={actionLoading}
              className="flex items-center gap-1.5 bg-emerald-600 text-white text-[13px] font-semibold px-4 h-[34px] rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <IconFileInvoice size={16} /> Convert to Invoice
            </button>
          )}
          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-[#1a3480] text-white text-[13px] font-semibold px-4 h-[34px] rounded-lg hover:bg-blue-800 transition-colors"
          >
            <IconPrinter size={16} /> Print Quotation
          </button>
        </div>
      </div>

      {/* Document Canvas */}
      <div className={`print-document theme-${theme} size-${size} flex flex-col`}>
        {theme === 'default' && (
          <ThemeDefault
            company={company}
            invoice={{
              number: quotation.quote_number,
              date: new Date(quotation.quote_date).toLocaleDateString('en-IN'),
              due_date: quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-IN') : undefined,
              place_of_supply: quotation.customer?.state || '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Original Quotation',
              grand_total: quotation.total_amount,
              subtotal: quotation.subtotal,
              tax_amount: quotation.total_tax,
              notes: quotation.notes,
              title: 'QUOTATION',
            }}
            customer={{
              name: quotation.customer?.name || '—',
              phone: quotation._mobile_number || quotation.customer?.phone || '—',
              email: quotation.customer?.email,
              address: quotation._billing_address || quotation.customer?.address || '—',
              gstin: quotation._gstin || quotation.customer?.gstin,
              state: quotation.customer?.state,
              contactPerson: quotation._contact_person,
            }}
            items={items.map((item, idx) => {
              const rawSubtotal = item.unit_price * item.quantity;
              const discAmount = rawSubtotal * (item.discount_percent / 100);
              const taxableVal = rawSubtotal - discAmount;
              const taxAmount = taxableVal * (item.tax_rate / 100);
              return {
                sr: idx + 1,
                description: item.part.name,
                model: item.part.name,
                warranty: undefined,
                hsn_sac: item.part.hsn_code || '998729',
                qty: item.quantity,
                unit: 'NOS',
                rate: item.unit_price,
                cgst_rate: item.tax_rate / 2,
                cgst_amount: taxAmount / 2,
                sgst_rate: item.tax_rate / 2,
                sgst_amount: taxAmount / 2,
                igst_rate: item.tax_rate,
                igst_amount: taxAmount,
                total: item.total,
              };
            })}
            summary={{
              taxable_total: items.reduce((sum, item) => sum + (item.unit_price * item.quantity * (1 - item.discount_percent / 100)), 0),
              cgst_total: quotation.total_tax / 2,
              sgst_total: quotation.total_tax / 2,
              igst_total: quotation.total_tax,
              round_off: quotation.total_amount - (quotation.subtotal - quotation.total_discount + quotation.total_tax),
              grand_total: quotation.total_amount,
              amount_in_words: toRupeesInWords(quotation.total_amount),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'hisecure' && (
          <ThemeHiSecure
            company={company}
            invoice={{
              number: quotation.quote_number,
              date: new Date(quotation.quote_date).toLocaleDateString('en-IN'),
              due_date: quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-IN') : undefined,
              place_of_supply: quotation.customer?.state || '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Original Quotation',
              grand_total: quotation.total_amount,
              subtotal: quotation.subtotal,
              tax_amount: quotation.total_tax,
              notes: quotation.notes,
              title: 'QUOTATION',
            }}
            customer={{
              name: quotation.customer?.name || '—',
              phone: quotation._mobile_number || quotation.customer?.phone || '—',
              email: quotation.customer?.email,
              address: quotation._billing_address || quotation.customer?.address || '—',
              gstin: quotation._gstin || quotation.customer?.gstin,
              state: quotation.customer?.state,
              contactPerson: quotation._contact_person,
            }}
            items={items.map((item, idx) => {
              const rawSubtotal = item.unit_price * item.quantity;
              const discAmount = rawSubtotal * (item.discount_percent / 100);
              const taxableVal = rawSubtotal - discAmount;
              const taxAmount = taxableVal * (item.tax_rate / 100);
              return {
                sr: idx + 1,
                description: item.part.name,
                model: item.part.name,
                warranty: undefined,
                hsn_sac: item.part.hsn_code || '998729',
                qty: item.quantity,
                unit: 'NOS',
                rate: item.unit_price,
                cgst_rate: item.tax_rate / 2,
                cgst_amount: taxAmount / 2,
                sgst_rate: item.tax_rate / 2,
                sgst_amount: taxAmount / 2,
                igst_rate: item.tax_rate,
                igst_amount: taxAmount,
                total: item.total,
              };
            })}
            summary={{
              taxable_total: items.reduce((sum, item) => sum + (item.unit_price * item.quantity * (1 - item.discount_percent / 100)), 0),
              cgst_total: quotation.total_tax / 2,
              sgst_total: quotation.total_tax / 2,
              igst_total: quotation.total_tax,
              round_off: quotation.total_amount - (quotation.subtotal - quotation.total_discount + quotation.total_tax),
              grand_total: quotation.total_amount,
              amount_in_words: toRupeesInWords(quotation.total_amount),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'classic' && (
          <ThemeClassic
            company={company}
            invoice={{
              number: quotation.quote_number,
              date: new Date(quotation.quote_date).toLocaleDateString('en-IN'),
              due_date: quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-IN') : undefined,
              place_of_supply: quotation.customer?.state || '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Original Quotation',
              grand_total: quotation.total_amount,
              subtotal: quotation.subtotal,
              tax_amount: quotation.total_tax,
              notes: quotation.notes,
              title: 'QUOTATION',
            }}
            customer={{
              name: quotation.customer?.name || '—',
              phone: quotation._mobile_number || quotation.customer?.phone || '—',
              email: quotation.customer?.email,
              address: quotation._billing_address || quotation.customer?.address || '—',
              gstin: quotation._gstin || quotation.customer?.gstin,
              state: quotation.customer?.state,
              contactPerson: quotation._contact_person,
            }}
            items={items.map((item, idx) => {
              const rawSubtotal = item.unit_price * item.quantity;
              const discAmount = rawSubtotal * (item.discount_percent / 100);
              const taxableVal = rawSubtotal - discAmount;
              const taxAmount = taxableVal * (item.tax_rate / 100);
              return {
                sr: idx + 1,
                description: item.part.name,
                model: item.part.name,
                warranty: undefined,
                hsn_sac: item.part.hsn_code || '998729',
                qty: item.quantity,
                unit: 'NOS',
                rate: item.unit_price,
                cgst_rate: item.tax_rate / 2,
                cgst_amount: taxAmount / 2,
                sgst_rate: item.tax_rate / 2,
                sgst_amount: taxAmount / 2,
                igst_rate: item.tax_rate,
                igst_amount: taxAmount,
                total: item.total,
              };
            })}
            summary={{
              taxable_total: items.reduce((sum, item) => sum + (item.unit_price * item.quantity * (1 - item.discount_percent / 100)), 0),
              cgst_total: quotation.total_tax / 2,
              sgst_total: quotation.total_tax / 2,
              igst_total: quotation.total_tax,
              round_off: quotation.total_amount - (quotation.subtotal - quotation.total_discount + quotation.total_tax),
              grand_total: quotation.total_amount,
              amount_in_words: toRupeesInWords(quotation.total_amount),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'modern-blue' && (
          <ThemeModernBlue
            company={company}
            invoice={{
              number: quotation.quote_number,
              date: new Date(quotation.quote_date).toLocaleDateString('en-IN'),
              due_date: quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-IN') : undefined,
              place_of_supply: quotation.customer?.state || '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Original Quotation',
              grand_total: quotation.total_amount,
              subtotal: quotation.subtotal,
              tax_amount: quotation.total_tax,
              notes: quotation.notes,
              title: 'QUOTATION',
            }}
            customer={{
              name: quotation.customer?.name || '—',
              phone: quotation._mobile_number || quotation.customer?.phone || '—',
              email: quotation.customer?.email,
              address: quotation._billing_address || quotation.customer?.address || '—',
              gstin: quotation._gstin || quotation.customer?.gstin,
              state: quotation.customer?.state,
              contactPerson: quotation._contact_person,
            }}
            items={items.map((item, idx) => {
              const rawSubtotal = item.unit_price * item.quantity;
              const discAmount = rawSubtotal * (item.discount_percent / 100);
              const taxableVal = rawSubtotal - discAmount;
              const taxAmount = taxableVal * (item.tax_rate / 100);
              return {
                sr: idx + 1,
                description: item.part.name,
                model: item.part.name,
                warranty: undefined,
                hsn_sac: item.part.hsn_code || '998729',
                qty: item.quantity,
                unit: 'NOS',
                rate: item.unit_price,
                cgst_rate: item.tax_rate / 2,
                cgst_amount: taxAmount / 2,
                sgst_rate: item.tax_rate / 2,
                sgst_amount: taxAmount / 2,
                igst_rate: item.tax_rate,
                igst_amount: taxAmount,
                total: item.total,
              };
            })}
            summary={{
              taxable_total: items.reduce((sum, item) => sum + (item.unit_price * item.quantity * (1 - item.discount_percent / 100)), 0),
              cgst_total: quotation.total_tax / 2,
              sgst_total: quotation.total_tax / 2,
              igst_total: quotation.total_tax,
              round_off: quotation.total_amount - (quotation.subtotal - quotation.total_discount + quotation.total_tax),
              grand_total: quotation.total_amount,
              amount_in_words: toRupeesInWords(quotation.total_amount),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'minimal' && (
          <ThemeMinimal
            company={company}
            invoice={{
              number: quotation.quote_number,
              date: new Date(quotation.quote_date).toLocaleDateString('en-IN'),
              due_date: quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-IN') : undefined,
              place_of_supply: quotation.customer?.state || '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Original Quotation',
              grand_total: quotation.total_amount,
              subtotal: quotation.subtotal,
              tax_amount: quotation.total_tax,
              notes: quotation.notes,
              title: 'QUOTATION',
            }}
            customer={{
              name: quotation.customer?.name || '—',
              phone: quotation._mobile_number || quotation.customer?.phone || '—',
              email: quotation.customer?.email,
              address: quotation._billing_address || quotation.customer?.address || '—',
              gstin: quotation._gstin || quotation.customer?.gstin,
              state: quotation.customer?.state,
              contactPerson: quotation._contact_person,
            }}
            items={items.map((item, idx) => {
              const rawSubtotal = item.unit_price * item.quantity;
              const discAmount = rawSubtotal * (item.discount_percent / 100);
              const taxableVal = rawSubtotal - discAmount;
              const taxAmount = taxableVal * (item.tax_rate / 100);
              return {
                sr: idx + 1,
                description: item.part.name,
                model: item.part.name,
                warranty: undefined,
                hsn_sac: item.part.hsn_code || '998729',
                qty: item.quantity,
                unit: 'NOS',
                rate: item.unit_price,
                cgst_rate: item.tax_rate / 2,
                cgst_amount: taxAmount / 2,
                sgst_rate: item.tax_rate / 2,
                sgst_amount: taxAmount / 2,
                igst_rate: item.tax_rate,
                igst_amount: taxAmount,
                total: item.total,
              };
            })}
            summary={{
              taxable_total: items.reduce((sum, item) => sum + (item.unit_price * item.quantity * (1 - item.discount_percent / 100)), 0),
              cgst_total: quotation.total_tax / 2,
              sgst_total: quotation.total_tax / 2,
              igst_total: quotation.total_tax,
              round_off: quotation.total_amount - (quotation.subtotal - quotation.total_discount + quotation.total_tax),
              grand_total: quotation.total_amount,
              amount_in_words: toRupeesInWords(quotation.total_amount),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'saffron' && (
          <ThemeSaffron
            company={company}
            invoice={{
              number: quotation.quote_number,
              date: new Date(quotation.quote_date).toLocaleDateString('en-IN'),
              due_date: quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-IN') : undefined,
              place_of_supply: quotation.customer?.state || '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Original Quotation',
              grand_total: quotation.total_amount,
              subtotal: quotation.subtotal,
              tax_amount: quotation.total_tax,
              notes: quotation.notes,
              title: 'QUOTATION',
            }}
            customer={{
              name: quotation.customer?.name || '—',
              phone: quotation._mobile_number || quotation.customer?.phone || '—',
              email: quotation.customer?.email,
              address: quotation._billing_address || quotation.customer?.address || '—',
              gstin: quotation._gstin || quotation.customer?.gstin,
              state: quotation.customer?.state,
              contactPerson: quotation._contact_person,
            }}
            items={items.map((item, idx) => {
              const rawSubtotal = item.unit_price * item.quantity;
              const discAmount = rawSubtotal * (item.discount_percent / 100);
              const taxableVal = rawSubtotal - discAmount;
              const taxAmount = taxableVal * (item.tax_rate / 100);
              return {
                sr: idx + 1,
                description: item.part.name,
                model: item.part.name,
                warranty: undefined,
                hsn_sac: item.part.hsn_code || '998729',
                qty: item.quantity,
                unit: 'NOS',
                rate: item.unit_price,
                cgst_rate: item.tax_rate / 2,
                cgst_amount: taxAmount / 2,
                sgst_rate: item.tax_rate / 2,
                sgst_amount: taxAmount / 2,
                igst_rate: item.tax_rate,
                igst_amount: taxAmount,
                total: item.total,
              };
            })}
            summary={{
              taxable_total: items.reduce((sum, item) => sum + (item.unit_price * item.quantity * (1 - item.discount_percent / 100)), 0),
              cgst_total: quotation.total_tax / 2,
              sgst_total: quotation.total_tax / 2,
              igst_total: quotation.total_tax,
              round_off: quotation.total_amount - (quotation.subtotal - quotation.total_discount + quotation.total_tax),
              grand_total: quotation.total_amount,
              amount_in_words: toRupeesInWords(quotation.total_amount),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'tally' && (
          <ThemeTally
            company={company}
            invoice={{
              number: quotation.quote_number,
              date: new Date(quotation.quote_date).toLocaleDateString('en-IN'),
              due_date: quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-IN') : undefined,
              place_of_supply: quotation.customer?.state || '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Original Quotation',
              grand_total: quotation.total_amount,
              subtotal: quotation.subtotal,
              tax_amount: quotation.total_tax,
              notes: quotation.notes,
              title: 'QUOTATION',
            }}
            customer={{
              name: quotation.customer?.name || '—',
              phone: quotation._mobile_number || quotation.customer?.phone || '—',
              email: quotation.customer?.email,
              address: quotation._billing_address || quotation.customer?.address || '—',
              gstin: quotation._gstin || quotation.customer?.gstin,
              state: quotation.customer?.state,
              contactPerson: quotation._contact_person,
            }}
            items={items.map((item, idx) => {
              const rawSubtotal = item.unit_price * item.quantity;
              const discAmount = rawSubtotal * (item.discount_percent / 100);
              const taxableVal = rawSubtotal - discAmount;
              const taxAmount = taxableVal * (item.tax_rate / 100);
              return {
                sr: idx + 1,
                description: item.part.name,
                model: item.part.name,
                warranty: undefined,
                hsn_sac: item.part.hsn_code || '998729',
                qty: item.quantity,
                unit: 'NOS',
                rate: item.unit_price,
                cgst_rate: item.tax_rate / 2,
                cgst_amount: taxAmount / 2,
                sgst_rate: item.tax_rate / 2,
                sgst_amount: taxAmount / 2,
                igst_rate: item.tax_rate,
                igst_amount: taxAmount,
                total: item.total,
              };
            })}
            summary={{
              taxable_total: items.reduce((sum, item) => sum + (item.unit_price * item.quantity * (1 - item.discount_percent / 100)), 0),
              cgst_total: quotation.total_tax / 2,
              sgst_total: quotation.total_tax / 2,
              igst_total: quotation.total_tax,
              round_off: quotation.total_amount - (quotation.subtotal - quotation.total_discount + quotation.total_tax),
              grand_total: quotation.total_amount,
              amount_in_words: toRupeesInWords(quotation.total_amount),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'emerald' && (
          <ThemeEmerald
            company={company}
            invoice={{
              number: quotation.quote_number,
              date: new Date(quotation.quote_date).toLocaleDateString('en-IN'),
              due_date: quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-IN') : undefined,
              place_of_supply: quotation.customer?.state || '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Original Quotation',
              grand_total: quotation.total_amount,
              subtotal: quotation.subtotal,
              tax_amount: quotation.total_tax,
              notes: quotation.notes,
              title: 'QUOTATION',
            }}
            customer={{
              name: quotation.customer?.name || '—',
              phone: quotation._mobile_number || quotation.customer?.phone || '—',
              email: quotation.customer?.email,
              address: quotation._billing_address || quotation.customer?.address || '—',
              gstin: quotation._gstin || quotation.customer?.gstin,
              state: quotation.customer?.state,
              contactPerson: quotation._contact_person,
            }}
            items={items.map((item, idx) => {
              const rawSubtotal = item.unit_price * item.quantity;
              const discAmount = rawSubtotal * (item.discount_percent / 100);
              const taxableVal = rawSubtotal - discAmount;
              const taxAmount = taxableVal * (item.tax_rate / 100);
              return {
                sr: idx + 1,
                description: item.part.name,
                model: item.part.name,
                warranty: undefined,
                hsn_sac: item.part.hsn_code || '998729',
                qty: item.quantity,
                unit: 'NOS',
                rate: item.unit_price,
                cgst_rate: item.tax_rate / 2,
                cgst_amount: taxAmount / 2,
                sgst_rate: item.tax_rate / 2,
                sgst_amount: taxAmount / 2,
                igst_rate: item.tax_rate,
                igst_amount: taxAmount,
                total: item.total,
              };
            })}
            summary={{
              taxable_total: items.reduce((sum, item) => sum + (item.unit_price * item.quantity * (1 - item.discount_percent / 100)), 0),
              cgst_total: quotation.total_tax / 2,
              sgst_total: quotation.total_tax / 2,
              igst_total: quotation.total_tax,
              round_off: quotation.total_amount - (quotation.subtotal - quotation.total_discount + quotation.total_tax),
              grand_total: quotation.total_amount,
              amount_in_words: toRupeesInWords(quotation.total_amount),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'charcoal' && (
          <ThemeCharcoal
            company={company}
            invoice={{
              number: quotation.quote_number,
              date: new Date(quotation.quote_date).toLocaleDateString('en-IN'),
              due_date: quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-IN') : undefined,
              place_of_supply: quotation.customer?.state || '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Original Quotation',
              grand_total: quotation.total_amount,
              subtotal: quotation.subtotal,
              tax_amount: quotation.total_tax,
              notes: quotation.notes,
              title: 'QUOTATION',
            }}
            customer={{
              name: quotation.customer?.name || '—',
              phone: quotation._mobile_number || quotation.customer?.phone || '—',
              email: quotation.customer?.email,
              address: quotation._billing_address || quotation.customer?.address || '—',
              gstin: quotation._gstin || quotation.customer?.gstin,
              state: quotation.customer?.state,
              contactPerson: quotation._contact_person,
            }}
            items={items.map((item, idx) => {
              const rawSubtotal = item.unit_price * item.quantity;
              const discAmount = rawSubtotal * (item.discount_percent / 100);
              const taxableVal = rawSubtotal - discAmount;
              const taxAmount = taxableVal * (item.tax_rate / 100);
              return {
                sr: idx + 1,
                description: item.part.name,
                model: item.part.name,
                warranty: undefined,
                hsn_sac: item.part.hsn_code || '998729',
                qty: item.quantity,
                unit: 'NOS',
                rate: item.unit_price,
                cgst_rate: item.tax_rate / 2,
                cgst_amount: taxAmount / 2,
                sgst_rate: item.tax_rate / 2,
                sgst_amount: taxAmount / 2,
                igst_rate: item.tax_rate,
                igst_amount: taxAmount,
                total: item.total,
              };
            })}
            summary={{
              taxable_total: items.reduce((sum, item) => sum + (item.unit_price * item.quantity * (1 - item.discount_percent / 100)), 0),
              cgst_total: quotation.total_tax / 2,
              sgst_total: quotation.total_tax / 2,
              igst_total: quotation.total_tax,
              round_off: quotation.total_amount - (quotation.subtotal - quotation.total_discount + quotation.total_tax),
              grand_total: quotation.total_amount,
              amount_in_words: toRupeesInWords(quotation.total_amount),
            }}
            logoSize={logoSize}
          />
        )}
      </div>
    </div>
  );
}
