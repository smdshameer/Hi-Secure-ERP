import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { IconChevronLeft, IconPlus, IconTrash, IconCalculator, IconFileDescription, IconUser, IconSquarePlus, IconSearch, IconCalendar, IconDeviceFloppy, IconBarcode } from '@tabler/icons-react';
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
  discount_percent: number;
  tax_rate: number;
  total: number;
}

interface CustomerType {
  customer_id: number;
  name: string;
  phone: string;
  address?: string;
  gstin?: string;
  state?: string;
}

interface PartType {
  part_id: number;
  part_number: string;
  name: string;
  selling_price: number;
  tax_rate: number;
  stock_quantity: number;
  hsn_code?: string;
  brand_id?: number;
}

interface BrandType {
  brand_id: number;
  name: string;
}

export default function QuotationsForm({ backPath }: { backPath: string }) {
  const fromDashboard = typeof window !== 'undefined' && window.location.search.includes('dashboard');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [parts, setParts] = useState<PartType[]>([]);
  const [brands, setBrands] = useState<BrandType[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modals Visibility
  const [showCustModal, setShowCustModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);

  // GST Captcha states
  const [captchaImg, setCaptchaImg] = useState<string>('');
  const [captchaSessionId, setCaptchaSessionId] = useState<string>('');
  const [captchaValue, setCaptchaValue] = useState<string>('');
  const [showCaptchaPrompt, setShowCaptchaPrompt] = useState<boolean>(false);
  const [captchaLoading, setCaptchaLoading] = useState<boolean>(false);
  const [captchaError, setCaptchaError] = useState<string>('');

  // Quick Add forms state
  const [quickCust, setQuickCust] = useState({ name: '', phone: '', email: '', address: '', gstin: '', state: 'Delhi' });
  const [quickPart, setQuickPart] = useState({ part_number: '', name: '', brand_id: '', selling_price: '', cost_price: '', hsn_code: '', stock_quantity: '0' });

  const [form, setForm] = useState({
    customer_id: 0,
    quote_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    terms: 'This quotation is valid for 30 days from the date of issue.',
    notes: '',
    quote_number: '',
    reference_no: '',
    sales_executive: '',
    contact_person: '',
    mobile_number: '',
    gstin: '',
    billing_address: '',
    shipping_address: '',
    customer_state: 'Delhi',
  });

  const [lines, setLines] = useState<LineItem[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  useEffect(() => {
    if (focusIndex !== null) {
      const idx = focusIndex;
      setFocusIndex(null);
      setTimeout(() => {
        const input = document.getElementById(`line-qty-${idx}`);
        if (input) {
          (input as HTMLInputElement).focus();
          (input as HTMLInputElement).select();
        }
      }, 50);
    }
  }, [focusIndex]);

  const selectedCustomer = customers.find(c => c.customer_id === form.customer_id);

  useEffect(() => {
    setLoading(true);
    const fetchDeps = async () => {
      try {
        const [custRes, partRes, brandRes] = await Promise.all([
          api.get('/customers'),
          api.get('/parts'),
          api.get('/parts/brands').catch(() => ({ data: [] }))
        ]);
        setCustomers(custRes.data.data ?? custRes.data ?? []);
        setParts(partRes.data.data ?? partRes.data ?? []);
        setBrands(brandRes.data ?? []);

        if (isEdit) {
          const res = await api.get(`/quotations/${id}`);
          const q = res.data;
          if (q) {
            let notesCleaned = q.notes || '';
            let reference_no = '';
            let sales_executive = '';
            let contact_person = '';
            let mobile_number = q.customer?.phone || '';
            let gstin = q.customer?.gstin || '';
            let billing_address = q.customer?.address || '';
            let shipping_address = q.customer?.address || '';

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

            setForm({
              customer_id: q.customer_id ?? 0,
              quote_date: q.quote_date ? new Date(q.quote_date).toISOString().split('T')[0] : '',
              valid_until: q.valid_until ? new Date(q.valid_until).toISOString().split('T')[0] : '',
              terms: q.terms ?? 'This quotation is valid for 30 days from the date of issue.',
              notes: notesCleaned,
              quote_number: q.quote_number || '',
              reference_no,
              sales_executive,
              contact_person,
              mobile_number,
              gstin,
              billing_address,
              shipping_address,
              customer_state: q.customer?.state || 'Delhi',
            });

            if (q.items) {
              setLines(q.items.map((i: any) => ({
                part_id: i.part_id,
                quantity: Number(i.quantity || 0),
                unit_price: Number(i.unit_price || 0),
                discount_percent: Number(i.discount_percent || 0),
                tax_rate: Number(i.tax_rate || 0),
                total: Number(i.total || 0),
              })));
            }
          }
        }
      } catch (err) {
        console.error('Failed to load quotation form dependencies', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeps();
  }, [id, isEdit]);

  const handleCustomerChange = (customerId: number) => {
    const cust = customers.find(c => c.customer_id === customerId);
    let stateCode = '07';
    let stateName = 'Delhi (07)';
    
    if (cust && cust.gstin && cust.gstin.length >= 2) {
      const code = cust.gstin.substring(0, 2);
      const matchedState = INDIAN_STATES.find(s => s.code === code);
      if (matchedState) {
        stateCode = matchedState.code;
        stateName = matchedState.name;
      }
    } else if (cust && cust.state) {
      const matchedState = INDIAN_STATES.find(s => s.name.toLowerCase().includes(cust.state!.toLowerCase()));
      if (matchedState) {
        stateCode = matchedState.code;
        stateName = matchedState.name;
      }
    }

    setForm(prev => ({
      ...prev,
      customer_id: customerId,
      customer_state: stateName,
      mobile_number: cust?.phone || '',
      gstin: cust?.gstin || '',
      billing_address: cust?.address || '',
      shipping_address: cust?.address || ''
    }));
  };

  // Fetch a new captcha image from backend proxy (Selenium session)
  const fetchGstCaptcha = async (gstinVal?: string | React.MouseEvent) => {
    let targetGstin = '';
    if (gstinVal && typeof gstinVal === 'string') {
      targetGstin = gstinVal;
    } else {
      targetGstin = form.gstin;
    }
    targetGstin = (targetGstin || '').toUpperCase().trim();

    // Show the modal immediately with loading state
    setCaptchaImg('');
    setCaptchaSessionId('');
    setShowCaptchaPrompt(true);
    setCaptchaError('');
    setCaptchaValue('');

    if (targetGstin.length !== 15) {
      setCaptchaError('A valid 15-digit GSTIN is required to fetch the captcha.');
      return;
    }

    setCaptchaLoading(true);
    try {
      const res = await api.get('/customers/captcha', { params: { gstin: targetGstin } });
      if (res.data && res.data.success) {
        setCaptchaImg(res.data.image);
        setCaptchaSessionId(res.data.sessionId);
      } else {
        setCaptchaError(res.data?.error || 'Failed to load captcha image.');
      }
    } catch (err: any) {
      console.error('[GST Captcha] Error fetching captcha:', err);
      const errMsg = err.response?.data?.error || 'Could not connect to the captcha service. Please try again.';
      setCaptchaError(errMsg);
    } finally {
      setCaptchaLoading(false);
    }
  };

  // Submit the solved captcha to perform live look up of GSTIN details on the portal
  const handleVerifyGstCaptcha = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!captchaValue.trim()) return;

    try {
      setCaptchaLoading(true);
      setCaptchaError('');
      const uppercaseVal = form.gstin.toUpperCase();

      if (captchaSessionId === 'DEMO_SESSION') {
        if (captchaValue.trim() !== '575757') {
          setCaptchaError('Incorrect CAPTCHA (Demo code: 575757)');
          setCaptchaLoading(false);
          return;
        }
        
        // Auto register a realistic demo company for any typed GSTIN in database
        const stateCode = uppercaseVal.substring(0, 2);
        const matchedState = INDIAN_STATES.find(s => s.code === stateCode);
        const stateName = matchedState ? matchedState.name : 'Tamil Nadu';

        const demoData = {
          name: `DEMO ACTIVE CUSTOMER (GSTIN: ${uppercaseVal})`,
          gstin: uppercaseVal,
          address: `No. 120, GST Business Park, Guindy, Chennai, Tamil Nadu - 600032`,
          state: stateName,
          phone: String(Math.floor(6000000000 + Math.random() * 3999999999)),
          city: 'Guindy',
          pincode: '600032'
        };

        const createRes = await api.post('/customers', {
          name: demoData.name,
          phone: demoData.phone,
          email: 'accounts@demogst.in',
          address: demoData.address,
          city: demoData.city,
          state: demoData.state,
          pincode: demoData.pincode,
          gstin: demoData.gstin,
          customer_type: 'retail'
        });

        const customerId = createRes.data.customer_id;
        const custRes = await api.get('/customers');
        setCustomers(custRes.data.data ?? custRes.data ?? []);

        setForm(prev => ({
          ...prev,
          customer_id: customerId,
          customer_state: stateName,
          mobile_number: demoData.phone,
          gstin: demoData.gstin,
          billing_address: demoData.address,
          shipping_address: '',
          contact_person: 'Finance Lead'
        }));

        setShowCaptchaPrompt(false);
        return;
      }

      const res = await api.get(`/customers/gstin/${uppercaseVal}`, {
        params: {
          captcha: captchaValue,
          session_id: captchaSessionId
        }
      });

      if (res.data) {
        if (res.data.success === false) {
          setCaptchaError(res.data.errorMsg || 'Incorrect CAPTCHA, please try again.');
          // Refresh captcha on incorrect entry
          fetchGstCaptcha();
          return;
        }

        const gstData = res.data.data;
        // Always reload fresh customers from server to avoid stale local state
        const custRes = await api.get('/customers');
        const latestCusts: any[] = custRes.data.data ?? custRes.data ?? [];
        setCustomers(latestCusts);

        // Find the customer in freshly loaded list
        let customerId = 0;
        let freshCust = latestCusts.find((c: any) => c.gstin?.toUpperCase() === uppercaseVal && !c.name.toUpperCase().includes('DEMO'));
        if (!freshCust) {
          freshCust = latestCusts.find((c: any) => c.gstin?.toUpperCase() === uppercaseVal);
        }
        if (freshCust) {
          customerId = freshCust.customer_id;
        } else if (res.data.source !== 'database') {
          // Brand new customer — create in database
          const createRes = await api.post('/customers', {
            name: gstData.name,
            phone: gstData.phone || `9${Math.floor(100000000 + Math.random() * 900000000)}`,
            email: gstData.email || '',
            address: gstData.address || '',
            city: gstData.city || '',
            state: gstData.state || '',
            pincode: gstData.pincode || '',
            gstin: gstData.gstin,
            customer_type: 'retail'
          });
          customerId = createRes.data.customer_id;
          // Reload again after creation
          const custRes2 = await api.get('/customers');
          setCustomers(custRes2.data.data ?? custRes2.data ?? []);
        }

        // Populate all form fields from fresh API data
        setForm(prev => ({
          ...prev,
          customer_id: customerId,
          customer_state: gstData.state || prev.customer_state,
          mobile_number: gstData.phone || prev.mobile_number || '',
          gstin: gstData.gstin,
          billing_address: gstData.address || prev.billing_address || '',
          shipping_address: prev.shipping_address || '',
          contact_person: gstData.legal_name || gstData.contact_person || prev.contact_person || ''
        }));
        
        // Hide captcha modal on success
        setShowCaptchaPrompt(false);
      }
    } catch (err) {
      setCaptchaError('Failed to verify captcha and fetch GST details');
      console.error(err);
    } finally {
      setCaptchaLoading(false);
    }
  };

  // Auto-fill state and place of supply when GSTIN is typed/changed
  const handleGstinChange = async (val: string) => {
    const uppercaseVal = val.toUpperCase();
    let updates: Partial<typeof form> = { gstin: uppercaseVal };

    if (uppercaseVal.length >= 2) {
      const code = uppercaseVal.substring(0, 2);
      const matchedState = INDIAN_STATES.find(s => s.code === code);
      if (matchedState) {
        updates.customer_state = matchedState.name;
      }
    }
    setForm(prev => ({ ...prev, ...updates }));

    if (uppercaseVal.length === 15) {
      try {
        setLoading(true);
        const response = await api.get(`/customers/gstin/${uppercaseVal}`);
        if (response.data && response.data.success) {
          const gstData = response.data.data;
          
          if (response.data.source === 'database') {
            // Already cached in db — select and populate directly
            const custRes = await api.get('/customers');
            const latestCusts: any[] = custRes.data.data ?? custRes.data ?? [];
            setCustomers(latestCusts);

            let customerId = 0;
            let freshCust = latestCusts.find((c: any) => c.gstin?.toUpperCase() === uppercaseVal && !c.name.toUpperCase().includes('DEMO'));
            if (!freshCust) {
              freshCust = latestCusts.find((c: any) => c.gstin?.toUpperCase() === uppercaseVal);
            }
            if (freshCust) customerId = freshCust.customer_id;

            setForm(prev => ({
              ...prev,
              customer_id: customerId,
              customer_state: updates.customer_state || prev.customer_state,
              mobile_number: gstData.phone || prev.mobile_number || '',
              gstin: gstData.gstin,
              billing_address: gstData.address || prev.billing_address || '',
              shipping_address: prev.shipping_address || '',
              contact_person: gstData.legal_name || gstData.contact_person || prev.contact_person || ''
            }));
          } else {
            // New GSTIN not in DB — request CAPTCHA validation
            fetchGstCaptcha(uppercaseVal);
          }
        }
      } catch (err) {
        console.error('Failed to look up GSTIN from portal/db', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const addItemToQuotation = (part: PartType, customQty?: number) => {
    const qtyToAdd = customQty !== undefined ? customQty : 1;
    const existingLineIdx = lines.findIndex(l => l.part_id === part.part_id);
    const sellingPrice = Number(part.selling_price) || 0;
    const taxRate = Number(part.tax_rate) || 0;

    if (existingLineIdx !== -1) {
      const updated = [...lines];
      const newQty = Number(updated[existingLineIdx].quantity) + qtyToAdd;
      updated[existingLineIdx].quantity = newQty;
      
      const lineTotal = newQty * Number(updated[existingLineIdx].unit_price);
      const discountAmount = lineTotal * (Number(updated[existingLineIdx].discount_percent || 0) / 100);
      const total = lineTotal - discountAmount;
      
      updated[existingLineIdx].total = Number(total.toFixed(2));
      setLines(updated);
      setFocusIndex(existingLineIdx);
    } else {
      const lineTotal = qtyToAdd * sellingPrice;
      
      const newLine: LineItem = {
        part_id: part.part_id,
        quantity: qtyToAdd,
        unit_price: sellingPrice,
        discount_percent: 0,
        tax_rate: taxRate,
        total: Number(lineTotal.toFixed(2))
      };
      setLines(prev => [...prev, newLine]);
      setFocusIndex(lines.length);
    }
  };

  const updateLineItem = (idx: number, field: keyof LineItem, val: any) => {
    const updated = [...lines];
    const item = { ...updated[idx] };
    
    if (field === 'quantity') {
      const qty = Math.max(1, parseInt(val) || 1);
      item.quantity = qty;
    } else if (field === 'unit_price') {
      item.unit_price = Math.max(0, parseFloat(val) || 0);
    } else if (field === 'discount_percent') {
      item.discount_percent = Math.min(100, Math.max(0, parseFloat(val) || 0));
    } else if (field === 'tax_rate') {
      item.tax_rate = Number(val) || 0;
    }
    
    const lineTotal = item.quantity * item.unit_price;
    const discountAmount = lineTotal * (item.discount_percent / 100);
    const total = lineTotal - discountAmount;
    
    item.total = Number(total.toFixed(2));
    updated[idx] = item;
    setLines(updated);
  };

  const removeLine = (idx: number) => {
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  // Quick Customer Submit
  const handleQuickCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/customers', {
        ...quickCust,
        customer_type: 'retail'
      });
      const newCustId = res.data.customer_id;
      const custRes = await api.get('/customers');
      const latestCusts = custRes.data.data ?? custRes.data ?? [];
      setCustomers(latestCusts);
      
      setShowCustModal(false);
      handleCustomerChange(newCustId);
      setQuickCust({ name: '', phone: '', email: '', address: '', gstin: '', state: 'Delhi' });
    } catch {
      alert('Failed to quickly create customer.');
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

      const part = latestParts.find((p: any) => p.part_id === newPartId);
      if (part) {
        addItemToQuotation(part);
      }

      setShowPartModal(false);
      setQuickPart({ part_number: '', name: '', brand_id: '', selling_price: '', cost_price: '', hsn_code: '', stock_quantity: '0' });
    } catch {
      alert('Failed to quickly create part.');
    }
  };

  // Calculations
  const subtotal = lines.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const totalDiscount = lines.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * item.discount_percent / 100), 0);
  const taxableTotal = subtotal - totalDiscount;
  const totalTax = lines.reduce((sum, item) => {
    const lineSub = item.quantity * item.unit_price;
    const lineTaxable = lineSub - (lineSub * item.discount_percent / 100);
    return sum + (lineTaxable * item.tax_rate / 100);
  }, 0);
  const grandTotal = Number((taxableTotal + totalTax).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.customer_id === 0) {
      alert('Please select a customer.');
      return;
    }
    if (lines.length === 0) {
      alert('Please add at least one valid line item.');
      return;
    }

    setSaving(true);
    const metaBlock = `\n\n--- METADATA ---` + 
      `\nReference No: ${form.reference_no || ''}` + 
      `\nSales Executive: ${form.sales_executive || ''}` + 
      `\nContact Person: ${form.contact_person || ''}` + 
      `\nMobile Number: ${form.mobile_number || ''}` + 
      `\nGSTIN: ${form.gstin || ''}` + 
      `\nBilling Address: ${form.billing_address || ''}` + 
      `\nShipping Address: ${form.shipping_address || ''}`;

    const postNotes = (form.notes || '') + metaBlock;

    const postData = {
      customer_id: Number(form.customer_id),
      quote_date: form.quote_date,
      valid_until: form.valid_until,
      terms: form.terms,
      notes: postNotes,
      items: lines.map(l => ({
        part_id: l.part_id,
        quantity: l.quantity,
        unit_price: l.unit_price,
        discount_percent: l.discount_percent,
        tax_rate: l.tax_rate,
        total: l.total
      })),
      subtotal,
      total_discount: totalDiscount,
      total_tax: totalTax,
      total_amount: grandTotal
    };

    try {
      if (isEdit) {
        await api.put(`/quotations/${id}`, postData);
      } else {
        await api.post('/quotations', postData);
      }
      navigate('/quotations');
    } catch (err) {
      console.error(err);
      alert('Failed to save Quotation.');
    } finally {
      setSaving(false);
    }
  };

  const filteredParts = productSearchQuery
    ? parts.filter(p => {
        const name = p.name ? String(p.name).toLowerCase() : '';
        const partNumber = p.part_number ? String(p.part_number).toLowerCase() : '';
        const query = productSearchQuery.toLowerCase();
        return name.includes(query) || partNumber.includes(query);
      }).slice(0, 10)
    : [];

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
            {isEdit ? 'Modify Quotation' : 'New Quotation'}
          </h1>
          <p className="text-[13px] opacity-90 mt-1">
            {isEdit ? 'Configure and update price quote document' : 'Create and issue a new sales quotation'}
          </p>
        </div>
        <Link
          to={fromDashboard ? '/' : backPath}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[13px] transition-all hover:bg-white/30"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
        >
          <IconChevronLeft size={16} /> {fromDashboard ? 'Back to Dashboard' : 'Back to Quotations'}
        </Link>
      </div>

      {loading && <div className="text-center py-20 text-gray-400">Loading quotation details...</div>}

      {!loading && (
        <form onSubmit={handleSubmit} className="lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-[78fr_22fr] gap-6 lg:flex-1 lg:min-h-0">
            
            {/* LEFT COLUMN */}
            <div className="space-y-6 pb-6 lg:h-full lg:overflow-y-auto lg:overscroll-contain no-scrollbar pr-1">

              {/* CUSTOMER + QUOTATION META CARD */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-200">
                
                {/* Quotation Meta Strip (Date, Valid Until, Ref, Executive) */}
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    
                    {/* Quotation Date */}
                    <div className="space-y-0.5">
                      <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Quotation Date <span className="text-red-400">*</span></label>
                      <div className="relative flex items-center">
                        <input
                          type="date"
                          value={form.quote_date}
                          onChange={e => setForm(p => ({ ...p, quote_date: e.target.value }))}
                          required
                          className="custom-date-input border border-gray-200 rounded-md pl-2.5 pr-7 h-[30px] text-[11.5px] text-gray-700 outline-none bg-white hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.12)] transition-all w-full"
                        />
                        <IconCalendar size={12} className="absolute right-2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Valid Until Date */}
                    <div className="space-y-0.5">
                      <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Valid Until <span className="text-red-400">*</span></label>
                      <div className="relative flex items-center">
                        <input
                          type="date"
                          value={form.valid_until}
                          onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))}
                          required
                          className="custom-date-input border border-gray-200 rounded-md pl-2.5 pr-7 h-[30px] text-[11.5px] text-gray-700 outline-none bg-white hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.12)] transition-all w-full"
                        />
                        <IconCalendar size={12} className="absolute right-2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Reference No */}
                    <div className="space-y-0.5">
                      <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Reference No</label>
                      <input
                        type="text"
                        value={form.reference_no}
                        onChange={e => setForm(p => ({ ...p, reference_no: e.target.value }))}
                        placeholder="e.g. REF-10293"
                        className="border border-gray-200 rounded-md px-2.5 h-[30px] text-[11.5px] text-gray-700 outline-none bg-white hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.12)] transition-all w-full"
                      />
                    </div>

                    {/* Sales Executive */}
                    <div className="space-y-0.5">
                      <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Sales Executive</label>
                      <input
                        type="text"
                        value={form.sales_executive}
                        onChange={e => setForm(p => ({ ...p, sales_executive: e.target.value }))}
                        placeholder="e.g. Mr. Amit"
                        className="border border-gray-200 rounded-md px-2.5 h-[30px] text-[11.5px] text-gray-700 outline-none bg-white hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.12)] transition-all w-full"
                      />
                    </div>

                  </div>
                </div>

                {/* Customer Details Strip */}
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-12 gap-4 items-end">
                    
                    {/* Select Customer */}
                    <div className="space-y-1 col-span-12 md:col-span-4">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select Recipient <span className="text-red-400">*</span></label>
                      </div>
                      <div className="flex gap-1.5">
                        <select
                          value={form.customer_id}
                          onChange={e => {
                            if (e.target.value === '__new__') {
                              setShowCustModal(true);
                            } else {
                              handleCustomerChange(Number(e.target.value));
                            }
                          }}
                          required
                          className="flex-1 border border-gray-200 rounded-lg px-2.5 h-[36px] text-[11.5px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                        >
                          <option value="0">Select customer...</option>
                          {customers.map(c => (
                            <option key={c.customer_id} value={c.customer_id}>
                              {c.name} ({c.phone})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowCustModal(true)}
                          className="border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg w-[36px] h-[36px] flex items-center justify-center transition-all bg-blue-50/50 shrink-0 font-bold"
                        >
                          <IconSquarePlus size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Contact Person */}
                    <div className="space-y-1 col-span-12 md:col-span-4">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contact Person</label>
                      <input
                        type="text"
                        value={form.contact_person || ''}
                        onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))}
                        placeholder="e.g. Mr. John"
                        className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                      />
                    </div>

                    {/* Mobile */}
                    <div className="space-y-1 col-span-12 md:col-span-4">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mobile</label>
                      <input
                        type="text"
                        value={form.mobile_number || ''}
                        onChange={e => setForm(p => ({ ...p, mobile_number: e.target.value }))}
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                      />
                    </div>

                  </div>

                  <div className="grid grid-cols-12 gap-4 items-end">
                    {/* GSTIN */}
                    <div className="space-y-1 col-span-12 md:col-span-6">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">GSTIN</label>
                      <input
                        type="text"
                        value={form.gstin || ''}
                        onChange={e => handleGstinChange(e.target.value)}
                        placeholder="15-digit GSTIN"
                        maxLength={15}
                        className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white font-mono tracking-wide"
                      />
                      {form.gstin && form.gstin.length === 15 && (
                        <div className="flex gap-2 mt-0.5">
                          <button
                            type="button"
                            onClick={() => fetchGstCaptcha(form.gstin)}
                            className="inline-flex items-center gap-1 text-[9.5px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                            title="Open GST Portal captcha verification popup"
                          >
                            🛡️ Live Verify on GST Portal
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Place of Supply */}
                    <div className="space-y-1 col-span-12 md:col-span-6">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Place of Supply (State)</label>
                      <select
                        value={form.customer_state}
                        onChange={e => setForm(p => ({ ...p, customer_state: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-2.5 h-[36px] text-[11.5px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                      >
                        {INDIAN_STATES.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Addresses */}
                  <div className="grid grid-cols-2 gap-3 items-start">
                    {/* Billing Address */}
                    <div className="flex flex-col">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Billing Address</label>
                      </div>
                      <textarea
                        value={form.billing_address || ''}
                        onChange={e => setForm(p => ({ ...p, billing_address: e.target.value }))}
                        placeholder="Door No, Street, City, State — PIN"
                        rows={3}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white resize-none"
                      />
                    </div>

                    {/* Shipping Address */}
                    <div className="flex flex-col">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Shipping Address</label>
                        <button
                          type="button"
                          onClick={() => setForm(p => ({ ...p, shipping_address: p.billing_address }))}
                          className="text-[9px] text-blue-600 font-bold hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full transition-colors flex items-center gap-0.5"
                        >
                          ⇩ Copy Billing
                        </button>
                      </div>
                      <textarea
                        value={form.shipping_address || ''}
                        onChange={e => setForm(p => ({ ...p, shipping_address: e.target.value }))}
                        placeholder="Leave blank if same as billing"
                        rows={3}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[11.5px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white resize-none"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* SELECT / SCAN PRODUCTS */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-200">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-200 px-4 py-3 rounded-t-xl flex items-center gap-2">
                  <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <IconSearch size={15} className="text-white" />
                  </div>
                  <span className="font-bold text-gray-800 text-[13px]">Select / Scan Products</span>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Barcode Scan Ready
                  </span>
                </div>
                <div className="p-4">
                  <div className="relative">
                    <div className="flex gap-2 items-stretch">
                      <div className="relative flex-1">
                        <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input 
                          type="text" 
                          value={productSearchQuery}
                          onChange={e => {
                            setProductSearchQuery(e.target.value);
                            setShowSearchResults(true);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (filteredParts.length > 0) {
                                addItemToQuotation(filteredParts[0]);
                                setProductSearchQuery('');
                                setShowSearchResults(false);
                              }
                            }
                          }}
                          placeholder="Type product name / part number, or scan barcode..." 
                          autoComplete="off"
                          className="w-full border border-gray-200 rounded-lg pl-9 pr-10 h-[40px] text-[12.5px] outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                        />
                        <IconBarcode size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setShowPartModal(true)} 
                        title="Create new product"
                        className="border border-blue-200 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg w-[40px] h-[40px] flex items-center justify-center transition-all bg-blue-50 font-bold shrink-0"
                      >
                        <IconPlus size={17} />
                      </button>
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showSearchResults && productSearchQuery && (
                      <div className="absolute top-[44px] left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl max-h-[280px] overflow-y-auto z-[2000] divide-y divide-gray-50">
                        {filteredParts.length === 0 ? (
                          <div className="p-4 text-center text-gray-400 text-[12px]">
                            <div className="text-2xl mb-1">🔍</div>
                            No matching products found
                          </div>
                        ) : (
                          filteredParts.map(part => {
                            const brandObj = brands.find(b => b.brand_id === part.brand_id);
                            return (
                              <div 
                                key={part.part_id}
                                onClick={() => {
                                  addItemToQuotation(part);
                                  setProductSearchQuery('');
                                  setShowSearchResults(false);
                                }}
                                className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors text-[12px] group"
                              >
                                <div>
                                  <div className="font-bold text-gray-800 group-hover:text-blue-700">{part.part_number}</div>
                                  <div className="text-[11px] text-gray-400">{part.name} {brandObj ? `· ${brandObj.name}` : ''}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-emerald-600">₹{Number(part.selling_price || 0).toFixed(2)}</div>
                                  <div className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-0.5">Stock: {part.stock_quantity}</div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ITEMS & BILLING TABLE */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3 transition-all duration-300 hover:shadow-lg hover:border-blue-200">
                <div className="font-bold text-gray-800 border-b border-gray-100 pb-2.5 flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2">
                    <IconCalculator size={16} className="text-blue-600" />
                    <span>Items &amp; Billing Table</span>
                    <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full text-[10px]">{lines.length}</span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full border-collapse text-[12px]" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '40px' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-50 text-[10.5px] font-bold text-gray-500 uppercase border-b border-gray-200">
                        <th className="py-2 px-2 text-left">Product</th>
                        <th className="py-2 px-2 text-center">HSN/SAC</th>
                        <th className="py-2 px-2 text-center">Qty</th>
                        <th className="py-2 px-2 text-right">Rate (₹)</th>
                        <th className="py-2 px-2 text-center">Disc %</th>
                        <th className="py-2 px-2 text-right">Disc Amt</th>
                        <th className="py-2 px-2 text-center">GST %</th>
                        <th className="py-2 px-2 text-right">Line Total</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lines.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-gray-400 text-[12px]">
                            <div className="flex flex-col items-center justify-center p-3 space-y-1">
                              <span className="text-2xl opacity-30">🛒</span>
                              <p className="font-bold text-gray-600">No items added yet</p>
                              <small className="text-gray-400">Search for products above to start billing</small>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        lines.map((line, idx) => {
                          const part = parts.find(p => p.part_id === line.part_id);
                          const discountAmt = (line.quantity * line.unit_price) * (line.discount_percent / 100);
                          return (
                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors duration-100" style={{ verticalAlign: 'middle' }}>
                              
                              {/* Product Info */}
                              <td className="py-2 px-2 text-left">
                                <div className="font-bold text-gray-800 leading-tight truncate text-[11.5px]">{part?.part_number || '—'}</div>
                                <div className="text-[10.5px] text-gray-400 truncate" title={part?.name}>
                                  {part?.name || '—'}
                                </div>
                              </td>

                              {/* HSN/SAC */}
                              <td className="py-2 px-2 text-center font-semibold text-gray-650 text-[11px]">
                                {part?.hsn_code || '998729'}
                              </td>

                              {/* Qty */}
                              <td className="py-2 px-1 text-center">
                                <input
                                  type="number"
                                  id={`line-qty-${idx}`}
                                  value={line.quantity}
                                  onChange={e => updateLineItem(idx, 'quantity', e.target.value)}
                                  className="w-full text-center border border-gray-200 rounded px-1.5 py-0.5 text-[11px] font-bold text-gray-800 bg-gray-50 focus:bg-white outline-none focus:border-blue-400 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)]"
                                />
                              </td>

                              {/* Rate */}
                              <td className="py-2 px-1 text-right">
                                <input
                                  type="number"
                                  value={line.unit_price}
                                  onChange={e => updateLineItem(idx, 'unit_price', e.target.value)}
                                  className="w-[85%] text-right border border-gray-200 rounded px-1.5 py-0.5 text-[11px] font-bold text-gray-800 bg-gray-50 focus:bg-white outline-none focus:border-blue-400 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)] inline-block"
                                />
                              </td>

                              {/* Disc % */}
                              <td className="py-2 px-1 text-center">
                                <input
                                  type="number"
                                  value={line.discount_percent}
                                  onChange={e => updateLineItem(idx, 'discount_percent', e.target.value)}
                                  className="w-[70%] text-center border border-gray-200 rounded px-1 py-0.5 text-[11px] text-gray-700 bg-gray-50 focus:bg-white outline-none focus:border-blue-400 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)] inline-block"
                                />
                              </td>

                              {/* Disc Amt */}
                              <td className="py-2 px-2 text-right text-gray-500 font-mono text-[11px]">
                                ₹{discountAmt.toFixed(2)}
                              </td>

                              {/* GST % */}
                              <td className="py-2 px-1 text-center">
                                <select
                                  value={line.tax_rate}
                                  onChange={e => updateLineItem(idx, 'tax_rate', e.target.value)}
                                  className="w-[80%] text-center border border-gray-200 rounded px-1 py-0.5 text-[11px] text-gray-700 bg-gray-50 focus:bg-white outline-none focus:border-blue-400 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)] inline-block"
                                >
                                  <option value="0">0%</option>
                                  <option value="5">5%</option>
                                  <option value="12">12%</option>
                                  <option value="18">18%</option>
                                  <option value="28">28%</option>
                                </select>
                              </td>

                              {/* Line Total */}
                              <td className="py-2 px-2 text-right font-extrabold text-gray-800 text-[11.5px] font-mono">
                                ₹{line.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>

                              {/* Actions */}
                              <td className="py-2 text-center">
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

              {/* TERMS & CONDITIONS */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-200">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                  <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
                    <IconFileDescription size={15} className="text-white" />
                  </div>
                  <span className="font-bold text-gray-800 text-[13px]">Terms &amp; Conditions</span>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Internal Notes / Quotation details</label>
                    <textarea 
                      value={form.notes} 
                      onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} 
                      rows={4}
                      placeholder="Write specific customer instructions, notes not visible on print..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[11.5px] text-gray-850 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white resize-none" 
                    />
                    {grandTotal > 0 && (
                      <div className="text-[10px] text-indigo-650 font-medium italic bg-indigo-50 px-2 py-1 rounded-lg">
                        {toRupeesInWords(grandTotal)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Terms and Conditions</label>
                    <textarea 
                      value={form.terms} 
                      onChange={e => setForm(p => ({ ...p, terms: e.target.value }))} 
                      rows={4}
                      placeholder="Standard terms & conditions visible to recipient..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[11.5px] text-gray-855 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white resize-none" 
                    />
                  </div>
                </div>
              </div>

            </div>{/* END LEFT COLUMN */}

            {/* RIGHT COLUMN / SIDEBAR */}
            <div className="lg:h-full lg:overflow-y-auto no-scrollbar pb-6">
              
              {/* STICKY SUMMARY CARD */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 transition-all duration-300 hover:shadow-md hover:border-blue-200">
                <div className="font-bold text-gray-800 border-b border-gray-150 pb-2 flex items-center gap-2 text-[13px]">
                  <IconCalculator size={16} className="text-blue-600" />
                  Quotation Valuation
                </div>

                <div className="bg-gradient-to-b from-[#f8faff] to-[#f9fafb] border-2 border-gray-100 rounded-xl p-4 space-y-2.5">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold text-gray-800">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-[12px] text-red-650 font-medium">
                      <span>Discount Offered</span>
                      <span>-₹{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-[12px] border-b border-gray-150 pb-2">
                    <span className="text-gray-500">Taxable Value</span>
                    <span className="font-semibold text-gray-800">₹{taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between text-[12px] border-b border-gray-150 pb-2">
                    <span className="text-gray-500">Est. GST Tax Amount</span>
                    <span className="font-medium text-gray-700">₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between text-[16px] font-extrabold border-t border-gray-200 pt-3 text-emerald-600">
                    <span>Grand Total</span>
                    <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={saving || lines.length === 0}
                  className="w-full bg-[#1a3480] hover:bg-blue-800 text-white font-bold h-[44px] rounded-lg text-[13.5px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:translate-y-0 cursor-pointer shadow-sm hover:shadow"
                >
                  <IconDeviceFloppy size={16} />
                  {saving ? 'Saving...' : isEdit ? 'Update Quotation' : 'Create Quotation'}
                </button>
              </div>

            </div>{/* END RIGHT COLUMN */}

          </div>
        </form>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {showCustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-[14px] flex items-center gap-2">
                <IconUser size={18} /> Add New Customer
              </h3>
              <button type="button" onClick={() => setShowCustModal(false)} className="text-white hover:text-gray-200 text-lg">&times;</button>
            </div>
            <form onSubmit={handleQuickCustomerSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Customer Name *</label>
                <input type="text" value={quickCust.name} onChange={e => setQuickCust(p => ({ ...p, name: e.target.value }))} required className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[12px] outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Phone Number *</label>
                <input type="text" value={quickCust.phone} onChange={e => setQuickCust(p => ({ ...p, phone: e.target.value }))} required className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[12px] outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase">GSTIN (Optional)</label>
                <input type="text" value={quickCust.gstin} onChange={e => setQuickCust(p => ({ ...p, gstin: e.target.value.toUpperCase() }))} className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[12px] outline-none focus:border-blue-500 font-mono" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Address</label>
                <textarea value={quickCust.address} onChange={e => setQuickCust(p => ({ ...p, address: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-blue-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCustModal(false)} className="flex-1 border border-gray-200 rounded-lg h-[36px] text-[12.5px] font-bold text-gray-550 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-[36px] text-[12.5px] font-bold">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD PRODUCT MODAL */}
      {showPartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-[14px] flex items-center gap-2">
                <IconBarcode size={18} /> Create New Product
              </h3>
              <button type="button" onClick={() => setShowPartModal(false)} className="text-white hover:text-gray-200 text-lg">&times;</button>
            </div>
            <form onSubmit={handleQuickPartSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Part Number / SKU *</label>
                <input type="text" value={quickPart.part_number} onChange={e => setQuickPart(p => ({ ...p, part_number: e.target.value }))} required className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[12px] outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Product Name *</label>
                <input type="text" value={quickPart.name} onChange={e => setQuickPart(p => ({ ...p, name: e.target.value }))} required className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[12px] outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Selling Price (₹) *</label>
                  <input type="number" value={quickPart.selling_price} onChange={e => setQuickPart(p => ({ ...p, selling_price: e.target.value }))} required className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[12px] outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">HSN Code</label>
                  <input type="text" value={quickPart.hsn_code} onChange={e => setQuickPart(p => ({ ...p, hsn_code: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[12px] outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPartModal(false)} className="flex-1 border border-gray-200 rounded-lg h-[36px] text-[12.5px] font-bold text-gray-550 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-[36px] text-[12.5px] font-bold">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GST PORTAL CAPTCHA VERIFICATION MODAL */}
      {showCaptchaPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-250 max-w-sm w-full p-6 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-[15px] font-bold text-gray-800 flex items-center justify-center gap-1.5">
                🛡️ GST Portal Verification
              </h3>
              <p className="text-[11px] text-gray-500">
                Type the characters from the official GST portal to retrieve real-time registration details.
              </p>
            </div>

            <form onSubmit={handleVerifyGstCaptcha} className="space-y-4">
              {/* Captcha Image Container */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center relative min-h-[90px]">
                {captchaLoading ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 text-blue-600 font-semibold text-[11px]">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Connecting to GST Portal...
                  </div>
                ) : captchaImg ? (
                  <div className="flex flex-col items-center gap-2">
                    <img 
                      src={captchaImg.startsWith('data:') ? captchaImg : captchaImg.startsWith('http') ? captchaImg : `data:image/png;base64,${captchaImg}`} 
                      alt="GST Captcha" 
                      className="h-[45px] max-w-[200px] border border-gray-300 rounded shadow-inner object-contain bg-white block mx-auto"
                      onError={() => setCaptchaError('Could not load captcha image. Please try again.')}
                    />
                    <button
                      type="button"
                      onClick={() => fetchGstCaptcha(form.gstin)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline justify-center mt-1"
                    >
                      🔄 Get New Code
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-red-500 text-center">
                    Failed to fetch captcha.
                    <button type="button" onClick={() => fetchGstCaptcha(form.gstin)} className="block mx-auto text-blue-600 font-bold underline mt-1">Retry</button>
                  </div>
                )}
              </div>

              {/* Captcha Input */}
              <div className="space-y-1">
                <label className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">Captcha Code</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Enter 6-digit captcha"
                  value={captchaValue}
                  onChange={e => setCaptchaValue(e.target.value)}
                  className="w-full text-center border border-gray-300 rounded-lg h-[38px] text-[15px] font-bold tracking-[0.25em] text-gray-800 outline-none uppercase transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                />
              </div>

              {/* Error messages */}
              {captchaError && (
                <div className="text-[10.5px] text-red-600 bg-red-50 border border-red-150 p-2 rounded-lg text-center font-medium">
                  ⚠️ {captchaError}
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCaptchaPrompt(false)}
                  disabled={captchaLoading}
                  className="flex-1 h-[36px] rounded-lg border border-gray-300 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all duration-200 bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={captchaLoading || !captchaValue.trim()}
                  className="flex-1 h-[36px] rounded-lg text-white text-[12px] font-bold hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all duration-200"
                  style={{ background: '#1a3480' }}
                >
                  {captchaLoading ? 'Verifying...' : 'Verify Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
