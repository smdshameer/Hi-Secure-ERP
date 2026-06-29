import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { IconChevronLeft, IconPrinter } from '@tabler/icons-react';
import api from '../services/api';
import { toRupeesInWords } from '../utils/numberToWords';
import { ThemeHiSecure, ThemeClassic, ThemeModernBlue, ThemeMinimal, ThemeSaffron, ThemeDefault, ThemeTally, ThemeEmerald, ThemeCharcoal } from '../components/print/PrintTemplates';
import PrintPreviewWrapper from '../components/print/PrintPreviewWrapper';

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

  const renderTemplates = () => (
    <>

        {theme === 'default' && (
          <ThemeDefault
            company={company}
            invoice={{
              number: challan.challan_number,
              date: new Date(challan.challan_date).toLocaleDateString('en-IN'),
              place_of_supply: '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Delivery Challan',
              grand_total: challan.total_amount,
              subtotal: challan.total_amount,
              tax_amount: 0,
              notes: challan.notes,
              title: 'DELIVERY CHALLAN',
            }}
            customer={{
              name: challan.customer?.name || '—',
              phone: challan.customer?.phone || '—',
              email: undefined,
              address: challan.customer?.address || '—',
              gstin: challan.customer?.gstin,
              state: undefined,
              contactPerson: undefined,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name,
              model: item.part.name,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price || 0,
              cgst_rate: 0,
              cgst_amount: 0,
              sgst_rate: 0,
              sgst_amount: 0,
              igst_rate: 0,
              igst_amount: 0,
              total: (item.unit_price || 0) * item.quantity,
            }))}
            summary={{
              taxable_total: challan.total_amount,
              cgst_total: 0,
              sgst_total: 0,
              igst_total: 0,
              round_off: 0,
              grand_total: challan.total_amount,
              amount_in_words: toRupeesInWords(challan.total_amount),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'hisecure' && (
          <ThemeHiSecure
            company={company}
            invoice={{
              number: challan.challan_number,
              date: new Date(challan.challan_date).toLocaleDateString('en-IN'),
              place_of_supply: '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Delivery Challan',
              grand_total: challan.total_amount,
              subtotal: challan.total_amount,
              tax_amount: 0,
              notes: challan.notes,
              title: 'DELIVERY CHALLAN',
            }}
            customer={{
              name: challan.customer?.name || '—',
              phone: challan.customer?.phone || '—',
              email: undefined,
              address: challan.customer?.address || '—',
              gstin: challan.customer?.gstin,
              state: undefined,
              contactPerson: undefined,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name,
              model: item.part.name,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price || 0,
              cgst_rate: 0,
              cgst_amount: 0,
              sgst_rate: 0,
              sgst_amount: 0,
              igst_rate: 0,
              igst_amount: 0,
              total: (item.unit_price || 0) * item.quantity,
            }))}
            summary={{
              taxable_total: challan.total_amount,
              cgst_total: 0,
              sgst_total: 0,
              igst_total: 0,
              round_off: 0,
              grand_total: challan.total_amount,
              amount_in_words: toRupeesInWords(challan.total_amount),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'classic' && (
          <ThemeClassic
            company={company}
            invoice={{
              number: challan.challan_number,
              date: new Date(challan.challan_date).toLocaleDateString('en-IN'),
              place_of_supply: '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Delivery Challan',
              grand_total: challan.total_amount,
              subtotal: challan.total_amount,
              tax_amount: 0,
              notes: challan.notes,
              title: 'DELIVERY CHALLAN',
            }}
            customer={{
              name: challan.customer?.name || '—',
              phone: challan.customer?.phone || '—',
              email: undefined,
              address: challan.customer?.address || '—',
              gstin: challan.customer?.gstin,
              state: undefined,
              contactPerson: undefined,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name,
              model: item.part.name,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price || 0,
              cgst_rate: 0,
              cgst_amount: 0,
              sgst_rate: 0,
              sgst_amount: 0,
              igst_rate: 0,
              igst_amount: 0,
              total: (item.unit_price || 0) * item.quantity,
            }))}
            summary={{
              taxable_total: challan.total_amount,
              cgst_total: 0,
              sgst_total: 0,
              igst_total: 0,
              round_off: 0,
              grand_total: challan.total_amount,
              amount_in_words: toRupeesInWords(challan.total_amount),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'modern-blue' && (
          <ThemeModernBlue
            company={company}
            invoice={{
              number: challan.challan_number,
              date: new Date(challan.challan_date).toLocaleDateString('en-IN'),
              place_of_supply: '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Delivery Challan',
              grand_total: challan.total_amount,
              subtotal: challan.total_amount,
              tax_amount: 0,
              notes: challan.notes,
              title: 'DELIVERY CHALLAN',
            }}
            customer={{
              name: challan.customer?.name || '—',
              phone: challan.customer?.phone || '—',
              email: undefined,
              address: challan.customer?.address || '—',
              gstin: challan.customer?.gstin,
              state: undefined,
              contactPerson: undefined,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name,
              model: item.part.name,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price || 0,
              cgst_rate: 0,
              cgst_amount: 0,
              sgst_rate: 0,
              sgst_amount: 0,
              igst_rate: 0,
              igst_amount: 0,
              total: (item.unit_price || 0) * item.quantity,
            }))}
            summary={{
              taxable_total: challan.total_amount,
              cgst_total: 0,
              sgst_total: 0,
              igst_total: 0,
              round_off: 0,
              grand_total: challan.total_amount,
              amount_in_words: toRupeesInWords(challan.total_amount),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'minimal' && (
          <ThemeMinimal
            company={company}
            invoice={{
              number: challan.challan_number,
              date: new Date(challan.challan_date).toLocaleDateString('en-IN'),
              place_of_supply: '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Delivery Challan',
              grand_total: challan.total_amount,
              subtotal: challan.total_amount,
              tax_amount: 0,
              notes: challan.notes,
              title: 'DELIVERY CHALLAN',
            }}
            customer={{
              name: challan.customer?.name || '—',
              phone: challan.customer?.phone || '—',
              email: undefined,
              address: challan.customer?.address || '—',
              gstin: challan.customer?.gstin,
              state: undefined,
              contactPerson: undefined,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name,
              model: item.part.name,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price || 0,
              cgst_rate: 0,
              cgst_amount: 0,
              sgst_rate: 0,
              sgst_amount: 0,
              igst_rate: 0,
              igst_amount: 0,
              total: (item.unit_price || 0) * item.quantity,
            }))}
            summary={{
              taxable_total: challan.total_amount,
              cgst_total: 0,
              sgst_total: 0,
              igst_total: 0,
              round_off: 0,
              grand_total: challan.total_amount,
              amount_in_words: toRupeesInWords(challan.total_amount),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'saffron' && (
          <ThemeSaffron
            company={company}
            invoice={{
              number: challan.challan_number,
              date: new Date(challan.challan_date).toLocaleDateString('en-IN'),
              place_of_supply: '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Delivery Challan',
              grand_total: challan.total_amount,
              subtotal: challan.total_amount,
              tax_amount: 0,
              notes: challan.notes,
              title: 'DELIVERY CHALLAN',
            }}
            customer={{
              name: challan.customer?.name || '—',
              phone: challan.customer?.phone || '—',
              email: undefined,
              address: challan.customer?.address || '—',
              gstin: challan.customer?.gstin,
              state: undefined,
              contactPerson: undefined,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name,
              model: item.part.name,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price || 0,
              cgst_rate: 0,
              cgst_amount: 0,
              sgst_rate: 0,
              sgst_amount: 0,
              igst_rate: 0,
              igst_amount: 0,
              total: (item.unit_price || 0) * item.quantity,
            }))}
            summary={{
              taxable_total: challan.total_amount,
              cgst_total: 0,
              sgst_total: 0,
              igst_total: 0,
              round_off: 0,
              grand_total: challan.total_amount,
              amount_in_words: toRupeesInWords(challan.total_amount),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'tally' && (
          <ThemeTally
            company={company}
            invoice={{
              number: challan.challan_number,
              date: new Date(challan.challan_date).toLocaleDateString('en-IN'),
              place_of_supply: '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Delivery Challan',
              grand_total: challan.total_amount,
              subtotal: challan.total_amount,
              tax_amount: 0,
              notes: challan.notes,
              title: 'DELIVERY CHALLAN',
            }}
            customer={{
              name: challan.customer?.name || '—',
              phone: challan.customer?.phone || '—',
              email: undefined,
              address: challan.customer?.address || '—',
              gstin: challan.customer?.gstin,
              state: undefined,
              contactPerson: undefined,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name,
              model: item.part.name,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price || 0,
              cgst_rate: 0,
              cgst_amount: 0,
              sgst_rate: 0,
              sgst_amount: 0,
              igst_rate: 0,
              igst_amount: 0,
              total: (item.unit_price || 0) * item.quantity,
            }))}
            summary={{
              taxable_total: challan.total_amount,
              cgst_total: 0,
              sgst_total: 0,
              igst_total: 0,
              round_off: 0,
              grand_total: challan.total_amount,
              amount_in_words: toRupeesInWords(challan.total_amount),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'emerald' && (
          <ThemeEmerald
            company={company}
            invoice={{
              number: challan.challan_number,
              date: new Date(challan.challan_date).toLocaleDateString('en-IN'),
              place_of_supply: '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Delivery Challan',
              grand_total: challan.total_amount,
              subtotal: challan.total_amount,
              tax_amount: 0,
              notes: challan.notes,
              title: 'DELIVERY CHALLAN',
            }}
            customer={{
              name: challan.customer?.name || '—',
              phone: challan.customer?.phone || '—',
              email: undefined,
              address: challan.customer?.address || '—',
              gstin: challan.customer?.gstin,
              state: undefined,
              contactPerson: undefined,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name,
              model: item.part.name,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price || 0,
              cgst_rate: 0,
              cgst_amount: 0,
              sgst_rate: 0,
              sgst_amount: 0,
              igst_rate: 0,
              igst_amount: 0,
              total: (item.unit_price || 0) * item.quantity,
            }))}
            summary={{
              taxable_total: challan.total_amount,
              cgst_total: 0,
              sgst_total: 0,
              igst_total: 0,
              round_off: 0,
              grand_total: challan.total_amount,
              amount_in_words: toRupeesInWords(challan.total_amount),
            }}
            logoSize={logoSize}
          />
        )}

        {theme === 'charcoal' && (
          <ThemeCharcoal
            company={company}
            invoice={{
              number: challan.challan_number,
              date: new Date(challan.challan_date).toLocaleDateString('en-IN'),
              place_of_supply: '',
              reverse_charge: 'No',
              is_interstate: false,
              copy_type: 'Delivery Challan',
              grand_total: challan.total_amount,
              subtotal: challan.total_amount,
              tax_amount: 0,
              notes: challan.notes,
              title: 'DELIVERY CHALLAN',
            }}
            customer={{
              name: challan.customer?.name || '—',
              phone: challan.customer?.phone || '—',
              email: undefined,
              address: challan.customer?.address || '—',
              gstin: challan.customer?.gstin,
              state: undefined,
              contactPerson: undefined,
            }}
            items={items.map((item, idx) => ({
              sr: idx + 1,
              description: item.part.name,
              model: item.part.name,
              warranty: undefined,
              hsn_sac: item.part.hsn_code || '998729',
              qty: item.quantity,
              unit: 'NOS',
              rate: item.unit_price || 0,
              cgst_rate: 0,
              cgst_amount: 0,
              sgst_rate: 0,
              sgst_amount: 0,
              igst_rate: 0,
              igst_amount: 0,
              total: (item.unit_price || 0) * item.quantity,
            }))}
            summary={{
              taxable_total: challan.total_amount,
              cgst_total: 0,
              sgst_total: 0,
              igst_total: 0,
              round_off: 0,
              grand_total: challan.total_amount,
              amount_in_words: toRupeesInWords(challan.total_amount),
            }}
            logoSize={logoSize}
          />
        )}

    </>
  );

  return (
    <div className="print-page-container flex-grow flex flex-col min-h-0 h-full overflow-hidden">
      {/* Dynamic Style Injection */}
      <style>{getPageSizeCSS()}</style>

      {/* Print-only container */}
      <div className="only-print">
        <div className={`print-document theme-${theme} size-${size} flex flex-col`}>
          {renderTemplates()}
        </div>
      </div>

      {/* Screen-only preview framework */}
      <div className="no-print flex-1 flex flex-col min-h-0 overflow-hidden bg-gray-100">
        <div className="bg-white p-4 border-b border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
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
                className="border border-gray-200 rounded-lg px-2 h-[34px] text-[13px] text-gray-700 outline-none focus:border-blue-300 bg-white"
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
                className="border border-gray-200 rounded-lg px-2 h-[34px] text-[13px] text-gray-700 outline-none focus:border-blue-300 bg-white"
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
              <span className="text-[12px] font-medium text-gray-500">Logo:</span>
              <select 
                value={logoSize} 
                onChange={(e) => setLogoSize(e.target.value as any)}
                className="border border-gray-200 rounded-lg px-2 h-[34px] text-[13px] text-gray-700 outline-none focus:border-blue-300 bg-white"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="hidden">Hide</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
          <PrintPreviewWrapper 
            title={`Challan Preview`}
            size={size}
            theme={theme}
            onPrint={handlePrint}
          >
            <div className={`print-document theme-${theme} size-${size} flex flex-col`}>
              {renderTemplates()}
            </div>
          </PrintPreviewWrapper>
        </div>
      </div>
    </div>
  );
}