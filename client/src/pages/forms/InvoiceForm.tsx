import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { IconChevronLeft, IconPlus, IconTrash, IconCalculator, IconFileDescription, IconUser, IconTruck, IconAlertCircle, IconSquarePlus, IconSearch, IconSend, IconCalendar, IconBarcode, IconDeviceFloppy, IconFileCheck } from '@tabler/icons-react';
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
  tax_amount: number;
  total_amount: number;
  batch_number?: string;
  description?: string;
  serial_number?: string;
  hsn_code?: string;
  unit?: string;
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

interface ChallanType {
  delivery_challan_id: number;
  challan_number: string;
  status: string;
}

interface BrandType {
  brand_id: number;
  name: string;
}

export default function InvoiceForm({ backPath }: { backPath: string }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [parts, setParts] = useState<PartType[]>([]);
  const [challans, setChallans] = useState<ChallanType[]>([]);
  const [brands, setBrands] = useState<BrandType[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modals Visibility
  const [showCustModal, setShowCustModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  // Serial number inline popover — stores the row index that is open (-1 = none)
  const [activeSerialRow, setActiveSerialRow] = useState<number>(-1);

  // Quick Add forms state
  const [quickCust, setQuickCust] = useState({ name: '', phone: '', email: '', address: '', gstin: '', state: 'Delhi' });
  const [quickPart, setQuickPart] = useState({ part_number: '', name: '', brand_id: '', selling_price: '', cost_price: '', hsn_code: '', stock_quantity: '0' });

  // Add Item state
  const [newItem, setNewItem] = useState({
    part_id: 0,
    quantity: 1,
    unit_price: 0,
    discount_percent: 0,
    tax_rate: 18,
    batch_number: ''
  });

  const [form, setForm] = useState({
    customer_id: 0,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    place_of_supply: '07', // Delhi by default
    tax_type: 'gst',
    status: 'draft',
    notes: '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged for delayed payment.',
    linked_delivery_challan_id: 0,
    invoice_number: '',
    reference_no: '',
    po_number: '',
    sales_executive: '',
    contact_person: '',
    mobile_number: '',
    gstin: '',
    billing_address: '',
    shipping_address: '',
    payment_method: 'Cash',
    payment_terms: 'Net 15',
    customer_state: 'Delhi',
    dispatch_mode: '',
    eway_bill_no: '',
  });

  const [lines, setLines] = useState<LineItem[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [freightCharges, setFreightCharges] = useState<number>(0);

  // GST Captcha states
  const [captchaImg, setCaptchaImg] = useState<string>('');
  const [captchaSessionId, setCaptchaSessionId] = useState<string>('');
  const [captchaValue, setCaptchaValue] = useState<string>('');
  const [showCaptchaPrompt, setShowCaptchaPrompt] = useState<boolean>(false);
  const [captchaLoading, setCaptchaLoading] = useState<boolean>(false);
  const [captchaError, setCaptchaError] = useState<string>('');

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

  // Automatically calculate payment due date (15 days from invoice date)
  useEffect(() => {
    if (form.invoice_date) {
      const d = new Date(form.invoice_date);
      d.setDate(d.getDate() + 15);
      setForm(prev => ({
        ...prev,
        due_date: d.toISOString().split('T')[0]
      }));
    }
  }, [form.invoice_date]);

  // Helper to add item to invoice from search results
  const addItemToInvoice = (part: PartType, customQty?: number) => {
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
      const afterDiscount = lineTotal - discountAmount;
      const taxAmount = afterDiscount * (Number(updated[existingLineIdx].tax_rate || 0) / 100);
      
      updated[existingLineIdx].tax_amount = Number(taxAmount.toFixed(2));
      updated[existingLineIdx].total_amount = Number((afterDiscount + taxAmount).toFixed(2));
      
      setLines(updated);
      setFocusIndex(existingLineIdx);
    } else {
      const lineTotal = qtyToAdd * sellingPrice;
      const taxAmount = lineTotal * (taxRate / 100);
      
      const newLine: LineItem = {
        part_id: part.part_id,
        quantity: qtyToAdd,
        unit_price: sellingPrice,
        discount_percent: 0,
        tax_rate: taxRate,
        tax_amount: Number(taxAmount.toFixed(2)),
        total_amount: Number((lineTotal + taxAmount).toFixed(2)),
        batch_number: '',
        description: '',
        serial_number: '',
        hsn_code: part.hsn_code || '',
        unit: 'Pcs'
      };
      setLines(prev => [...prev, newLine]);
      setFocusIndex(lines.length);
    }
  };

  // Helper to update line item fields inline
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
    } else if (field === 'batch_number') {
      item.batch_number = val;
    } else if (field === 'description') {
      item.description = val;
    } else if (field === 'serial_number') {
      item.serial_number = val;
    } else if (field === 'hsn_code') {
      item.hsn_code = val;
    } else if (field === 'unit') {
      item.unit = val;
    }
    
    const lineTotal = item.quantity * item.unit_price;
    const discountAmount = lineTotal * (item.discount_percent / 100);
    const afterDiscount = lineTotal - discountAmount;
    const taxAmount = afterDiscount * (item.tax_rate / 100);
    
    item.tax_amount = Number(taxAmount.toFixed(2));
    item.total_amount = Number((afterDiscount + taxAmount).toFixed(2));
    
    updated[idx] = item;
    setLines(updated);
  };

  useEffect(() => {
    setLoading(true);
    const fetchDeps = async () => {
      try {
        const [custRes, partRes, dcRes, brandRes] = await Promise.all([
          api.get('/customers'),
          api.get('/parts'),
          api.get('/delivery-challans'),
          api.get('/parts/brands').catch(() => ({ data: [] }))
        ]);
        setCustomers(custRes.data.data ?? custRes.data ?? []);
        setParts(partRes.data.data ?? partRes.data ?? []);
        setChallans((dcRes.data.data ?? dcRes.data ?? []).filter((dc: any) => dc.status === 'delivered' || dc.status === 'draft'));
        setBrands(brandRes.data ?? []);

        if (isEdit) {
          const invRes = await api.get(`/invoices/${id}`);
          const inv = invRes.data;
          if (inv) {
            let notesCleaned = inv.notes || '';
            let reference_no = '';
            let po_number = '';
            let sales_executive = '';
            let contact_person = '';
            let mobile_number = inv.customer?.phone || '';
            let gstin = inv.customer?.gstin || '';
            let billing_address = inv.customer?.address || '';
            let shipping_address = inv.customer?.address || '';
            let loadedFreight = 0;

            const metaIndex = notesCleaned.indexOf('\n\n--- METADATA ---');
            if (metaIndex !== -1) {
              const metaText = notesCleaned.substring(metaIndex);
              notesCleaned = notesCleaned.substring(0, metaIndex);

              const refMatch = metaText.match(/Reference No: (.*)/);
              if (refMatch) reference_no = refMatch[1];

              const poMatch = metaText.match(/PO Number: (.*)/);
              if (poMatch) po_number = poMatch[1];

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

              const freightMatch = metaText.match(/Freight Charges: (.*)/);
              if (freightMatch) loadedFreight = parseFloat(freightMatch[1]) || 0;
            }
            setFreightCharges(loadedFreight);

            setForm({
              customer_id: inv.customer_id ?? 0,
              invoice_date: inv.invoice_date ? new Date(inv.invoice_date).toISOString().split('T')[0] : '',
              due_date: inv.due_date ? new Date(inv.due_date).toISOString().split('T')[0] : '',
              place_of_supply: inv.place_of_supply || '07',
              tax_type: inv.tax_type || 'gst',
              status: inv.status || 'draft',
              notes: notesCleaned,
              linked_delivery_challan_id: inv.linked_delivery_challan_id ?? 0,
              invoice_number: inv.invoice_number || '',
              reference_no,
              po_number,
              sales_executive,
              contact_person,
              mobile_number,
              gstin,
              billing_address,
              shipping_address,
              payment_method: inv.payment_method || 'Cash',
              payment_terms: inv.payment_terms || 'Net 15',
              customer_state: inv.customer_state || 'Delhi',
              dispatch_mode: inv.dispatch_mode || '',
              eway_bill_no: inv.eway_bill_no || '',
            });
            if (inv.items) {
              setLines(inv.items.map((i: any) => {
                let description = '';
                let serial_number = '';
                let hsn_code = i.part?.hsn_code || '';
                let unit = 'Pcs';

                const serials = i.serial_numbers || [];
                if (serials.length > 0) {
                  serial_number = serials.join(', ');
                }

                return {
                  part_id: i.part_id,
                  quantity: Number(i.quantity || 0),
                  unit_price: Number(i.unit_price || 0),
                  discount_percent: Number(i.discount_percent || 0),
                  tax_rate: Number(i.tax_rate || 0),
                  tax_amount: Number(i.tax_amount || 0),
                  total_amount: Number(i.total_amount || 0),
                  batch_number: i.batch_number || '',
                  description,
                  serial_number,
                  hsn_code,
                  unit
                };
              }));
            }
          }
        }
      } catch (err) {
        console.error('Failed to load invoice form dependencies', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeps();
  }, [id, isEdit]);

  // Extract GST state code on customer selection
  const handleCustomerChange = (customerId: number) => {
    const cust = customers.find(c => c.customer_id === customerId);
    let stateCode = '07'; // Default to Delhi (07)
    let stateName = 'Delhi (07)'; // Default state name
    
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
      place_of_supply: stateCode,
      customer_state: stateName,
      mobile_number: cust?.phone || '',
      gstin: cust?.gstin || '',
      billing_address: cust?.address || '',
      shipping_address: cust?.address || ''
    }));
  };

  // Fetch a new captcha image and session cookie from the backend
  const fetchGstCaptcha = async (gstinVal?: string | React.MouseEvent) => {
    const DEMO_CAPTCHA = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMjAnIGhlaWdodD0nNDAnIHZpZXdCb3g9JzAgMCAxMjAgNDAnPjxyZWN0IHdpZHRoPScxMDAlJyBoZWlnaHQ9JzEwMCUnIGZpbGw9JyNmM2Y0ZjYnLz48dGV4dCB4PSc1MCUnIHk9JzU1JScgZG9taW5hbnQtYmFzZWxpbmU9J21pZGRsZScgdGV4dC1hbmNob3I9J21pZGRsZScgZm9udC1mYW1pbHk9J21vbm9zcGFjZScgZm9udC1zaXplPScyMCcgZm9udC13ZWlnaHQ9J2JvbGQnIGZpbGw9JyMxZTNhOGEnIGxldHRlci1zcGFjaW5nPSc0Jz41NzU3NTc8L3RleHQ+PC9zdmc+';
    
    // Instantly set mock captcha as default so we never show a broken image frame
    setCaptchaImg(DEMO_CAPTCHA);
    setCaptchaSessionId('DEMO_SESSION');
    setShowCaptchaPrompt(true);
    setCaptchaError('');
    setCaptchaValue('');

    let targetGstin = '';
    if (gstinVal && typeof gstinVal === 'string') {
      targetGstin = gstinVal;
    } else {
      targetGstin = form.gstin;
    }
    targetGstin = (targetGstin || '').toUpperCase().trim();

    if (targetGstin.length !== 15) {
      setCaptchaError('A valid 15-digit GSTIN is required to fetch the captcha.');
      return;
    }

    try {
      setCaptchaLoading(true);
      const res = await api.get('/customers/captcha', { params: { gstin: targetGstin } });
      if (res.data && res.data.success) {
        setCaptchaImg(res.data.image);
        setCaptchaSessionId(res.data.sessionId);
      } else {
        const errorMsg = res.data?.error || 'Failed to fetch captcha from official portal';
        setCaptchaError(`${errorMsg}. Using offline mock captcha.`);
      }
    } catch (err: any) {
      console.warn('Backend captcha load failed, using mock:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch captcha from official portal';
      setCaptchaError(`${errorMsg}. Using offline mock captcha.`);
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
          place_of_supply: stateCode,
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
          place_of_supply: prev.place_of_supply,
          customer_state: prev.customer_state,
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
        updates.place_of_supply = matchedState.code;
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
            // Always reload fresh customers from server to avoid stale local state
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
              place_of_supply: updates.place_of_supply || prev.place_of_supply,
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

  // Auto-fill modal state when GSTIN is typed in the Quick Add Customer modal
  const handleQuickGstinChange = async (val: string) => {
    const uppercaseVal = val.toUpperCase();
    let updates: Partial<typeof quickCust> = { gstin: uppercaseVal };

    if (uppercaseVal.length >= 2) {
      const code = uppercaseVal.substring(0, 2);
      const matchedState = INDIAN_STATES.find(s => s.code === code);
      if (matchedState) {
        updates.state = matchedState.name.replace(/\s\(\d+\)/, '');
      }
    }
    
    setQuickCust(prev => ({ ...prev, ...updates }));

    if (uppercaseVal.length === 15) {
      try {
        setLoading(true);
        const response = await api.get(`/customers/gstin/${uppercaseVal}`);
        if (response.data && response.data.success) {
          const gstData = response.data.data;
          
          let cleanState = gstData.state || '';
          const matchedState = INDIAN_STATES.find(s => s.name.toLowerCase().includes(cleanState.toLowerCase()));
          if (matchedState) {
            cleanState = matchedState.name.replace(/\s\(\d+\)/, '');
          }

          setQuickCust(prev => ({
            ...prev,
            name: gstData.name || prev.name,
            phone: gstData.phone || prev.phone,
            email: gstData.email || prev.email,
            address: gstData.address || prev.address,
            state: cleanState || prev.state
          }));
        }
      } catch (err) {
        console.error('Failed to look up GSTIN from portal/db', err);
      } finally {
        setLoading(false);
      }
    }
  };


  // Handle Delivery Challan linking and auto-populating line items
  const handleChallanChange = async (dcId: number) => {
    setForm(prev => ({ ...prev, linked_delivery_challan_id: dcId }));
    if (dcId === 0) return;

    try {
      setLoading(true);
      const res = await api.get(`/delivery-challans/${dcId}`);
      const dc = res.data;
      if (dc && dc.items) {
        const loadedLines = dc.items.map((i: any) => {
          const partPrice = Number(i.unit_price || i.part?.selling_price || 0);
          const partTax = Number(i.part?.tax_rate || 18);
          const base = Number(i.quantity) * partPrice;
          const taxAmt = base * (partTax / 100);

          return {
            part_id: i.part_id,
            quantity: Number(i.quantity || 1),
            unit_price: partPrice,
            discount_percent: 0,
            tax_rate: partTax,
            tax_amount: Number(taxAmt.toFixed(2)),
            total_amount: Number((base + taxAmt).toFixed(2)),
            batch_number: i.batch_number || ''
          };
        });
        setLines(loadedLines);
        if (dc.customer_id) {
          handleCustomerChange(dc.customer_id);
        }
      }
    } catch (err) {
      console.error('Failed to load linked challan details', err);
    } finally {
      setLoading(false);
    }
  };

  // Live total calculations
  const isIntrastate = form.place_of_supply === '07'; 
  
  const subtotalBeforeDiscount = lines.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const totalDiscount = lines.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * (item.discount_percent / 100)), 0);
  
  const taxableSubtotal = subtotalBeforeDiscount - totalDiscount;
  
  const totalTax = lines.reduce((sum, item) => {
    const lineBase = item.quantity * item.unit_price;
    const lineTaxable = lineBase - (lineBase * (item.discount_percent / 100));
    return sum + (lineTaxable * (item.tax_rate / 100));
  }, 0);

  const grandTotal = Number((taxableSubtotal + totalTax).toFixed(2));

  const cgstAmount = isIntrastate ? Number((totalTax / 2).toFixed(2)) : 0;
  const sgstAmount = isIntrastate ? Number((totalTax / 2).toFixed(2)) : 0;
  const igstAmount = !isIntrastate ? Number(totalTax.toFixed(2)) : 0;

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
      // Reload customers list
      const custRes = await api.get('/customers');
      const latestCusts = custRes.data.data ?? custRes.data ?? [];
      setCustomers(latestCusts);
      
      // Select new customer
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
      // Reload parts list
      const partRes = await api.get('/parts');
      const latestParts = partRes.data.data ?? partRes.data ?? [];
      setParts(latestParts);

      // Add newly created part directly to lines
      const createdPart = latestParts.find((p: any) => p.part_id === newPartId);
      if (createdPart) {
        addItemToInvoice(createdPart);
      }

      setShowPartModal(false);
      setQuickPart({ part_number: '', name: '', brand_id: '', selling_price: '', cost_price: '', hsn_code: '', stock_quantity: '0' });
    } catch {
      alert('Failed to quickly create part.');
    }
  };

  // Modal Part Change handler
  const handleNewItemPartChange = (partId: number) => {
    const part = parts.find(p => p.part_id === partId);
    if (part) {
      setNewItem(prev => ({
        ...prev,
        part_id: partId,
        unit_price: Number(part.selling_price || 0),
        tax_rate: Number(part.tax_rate || 18)
      }));
    } else {
      setNewItem(prev => ({ ...prev, part_id: 0, unit_price: 0 }));
    }
  };

  // Adding Item to lines
  const handleAddItem = () => {
    if (newItem.part_id === 0) {
      alert('Please select a product.');
      return;
    }
    if (newItem.quantity <= 0) {
      alert('Quantity must be greater than 0.');
      return;
    }

    const part = parts.find(p => p.part_id === newItem.part_id);
    if (part && newItem.quantity > part.stock_quantity) {
      alert(`Insufficient stock. Max available: ${part.stock_quantity}`);
      return;
    }

    const lineTotal = newItem.quantity * newItem.unit_price;
    const discountAmount = lineTotal * (newItem.discount_percent / 100);
    const afterDiscount = lineTotal - discountAmount;
    const taxAmount = afterDiscount * (newItem.tax_rate / 100);

    const added: LineItem = {
      part_id: newItem.part_id,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      discount_percent: newItem.discount_percent,
      tax_rate: newItem.tax_rate,
      tax_amount: Number(taxAmount.toFixed(2)),
      total_amount: Number((afterDiscount + taxAmount).toFixed(2)),
      batch_number: newItem.batch_number
    };

    setLines(prev => [...prev, added]);
    setShowAddItemModal(false);
    setNewItem({
      part_id: 0,
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      tax_rate: 18,
      batch_number: ''
    });
  };

  const saveInvoice = async (status: string) => {
    if (form.customer_id === 0) {
      alert('Please select a customer.');
      return;
    }
    if (lines.length === 0) {
      alert('Please add at least one line item.');
      return;
    }

    setSaving(true);
    const metaBlock = `\n\n--- METADATA ---` + 
      `\nReference No: ${form.reference_no || ''}` + 
      `\nPO Number: ${form.po_number || ''}` + 
      `\nSales Executive: ${form.sales_executive || ''}` + 
      `\nContact Person: ${form.contact_person || ''}` + 
      `\nMobile Number: ${form.mobile_number || ''}` + 
      `\nGSTIN: ${form.gstin || ''}` + 
      `\nBilling Address: ${form.billing_address || ''}` + 
      `\nShipping Address: ${form.shipping_address || ''}` + 
      `\nFreight Charges: ${freightCharges || 0}`;

    const postNotes = (form.notes || '') + metaBlock;

    const postData = {
      ...form,
      status: status,
      customer_id: Number(form.customer_id),
      tax_amount: totalTax,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      notes: postNotes,
      items: lines,
      linked_delivery_challan_id: form.linked_delivery_challan_id ? Number(form.linked_delivery_challan_id) : null
    };

    try {
      let targetId = id;
      if (isEdit) {
        await api.put(`/invoices/${id}`, postData);
      } else {
        const res = await api.post('/invoices', postData);
        targetId = res.data.invoice_id;
      }
      navigate(`/sales/${targetId}`);
    } catch (err) {
      console.error(err);
      alert('Failed to save invoice.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    saveInvoice(form.status || 'draft');
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
            {isEdit ? 'Modify Sales Invoice' : 'New Invoice'}
          </h1>
          <p className="text-[13px] opacity-90 mt-1">
            {isEdit ? 'Configure and update Indian GST compliant billing document' : 'Create and issue a new sales invoice'}
          </p>
        </div>
        <Link
          to={backPath}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[13px] transition-all hover:bg-white/30"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
        >
          <IconChevronLeft size={16} /> Back to Invoices
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-[78fr_22fr] gap-6 lg:flex-1 lg:min-h-0">
          
          {/* LEFT COLUMN */}
          <div className="space-y-6 pb-6 lg:h-full lg:overflow-y-auto lg:overscroll-contain no-scrollbar pr-1">


            {/* CUSTOMER + INVOICE META CARD */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-200">

              {/* ── Invoice Meta Strip (Date, Ref, PO, Executive) ── */}
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">

                  {/* Invoice Date */}
                  <div className="space-y-0.5">
                    <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Invoice Date <span className="text-red-400">*</span></label>
                    <div className="relative flex items-center">
                      <input
                        type="date"
                        value={form.invoice_date}
                        onChange={e => setForm(p => ({ ...p, invoice_date: e.target.value }))}
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
                      value={form.reference_no || ''}
                      onChange={e => setForm(p => ({ ...p, reference_no: e.target.value }))}
                      placeholder="Ref / Challan"
                      className="border border-gray-200 rounded-md px-2.5 h-[30px] text-[11.5px] text-gray-700 placeholder-gray-300 outline-none bg-white hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.12)] transition-all w-full"
                    />
                  </div>

                  {/* PO Number */}
                  <div className="space-y-0.5">
                    <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">PO Number</label>
                    <input
                      type="text"
                      value={form.po_number || ''}
                      onChange={e => setForm(p => ({ ...p, po_number: e.target.value }))}
                      placeholder="PO / Order No"
                      className="border border-gray-200 rounded-md px-2.5 h-[30px] text-[11.5px] text-gray-700 placeholder-gray-300 outline-none bg-white hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.12)] transition-all w-full"
                    />
                  </div>

                  {/* Sales Executive */}
                  <div className="space-y-0.5">
                    <label className="block text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Sales Executive</label>
                    <input
                      type="text"
                      value={form.sales_executive || ''}
                      onChange={e => setForm(p => ({ ...p, sales_executive: e.target.value }))}
                      placeholder="Executive Name"
                      className="border border-gray-200 rounded-md px-2.5 h-[30px] text-[11.5px] text-gray-700 placeholder-gray-300 outline-none bg-white hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.12)] transition-all w-full"
                    />
                  </div>
                </div>
              </div>

              {/* ── Customer Info Header ── */}
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
                <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
                  <IconUser size={13} className="text-white" />
                </div>
                <span className="font-bold text-gray-800 text-[12.5px]">Customer Information</span>
                {form.customer_id > 0 && <span className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Selected</span>}
              </div>

              <div className="p-4 space-y-3">
                {/* Unified Customer Info Grid — 12 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Customer Name */}
                  <div className="space-y-1 col-span-12 md:col-span-7">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Customer <span className="text-red-500">*</span></label>
                    <div className="flex gap-1">
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
                        className="w-full border border-gray-200 rounded-lg px-2 h-[36px] text-[11.5px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                      >
                        <option value="0">Select customer...</option>
                        {customers.map(c => (
                          <option key={c.customer_id} value={c.customer_id}>
                            {c.name}
                          </option>
                        ))}
                        <option value="__new__">+ Add New Customer</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowCustModal(true)}
                        title="Create new customer"
                        className="border border-blue-300 hover:border-blue-500 hover:bg-blue-600 hover:text-white text-blue-600 rounded-lg w-[36px] h-[36px] flex items-center justify-center transition-all duration-200 shrink-0 bg-blue-50"
                      >
                        <IconSquarePlus size={15} />
                      </button>
                    </div>
                  </div>
                  {/* Contact Person */}
                  <div className="space-y-1 col-span-12 md:col-span-5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contact Person</label>
                    <input
                      type="text"
                      value={form.contact_person || ''}
                      onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))}
                      placeholder="Name"
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
                  {/* GSTIN */}
                  <div className="space-y-1 col-span-12 md:col-span-4">
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
                  {/* State */}
                  <div className="space-y-1 col-span-12 md:col-span-4">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Place of Supply</label>
                    <select
                      value={form.customer_state}
                      onChange={e => {
                        const stateName = e.target.value;
                        const matchedState = INDIAN_STATES.find(s => s.name === stateName);
                        setForm(p => ({
                          ...p,
                          customer_state: stateName,
                          place_of_supply: matchedState ? matchedState.code : p.place_of_supply
                        }));
                      }}
                      className="w-full border border-gray-200 rounded-lg px-2.5 h-[36px] text-[11.5px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                    >
                      {INDIAN_STATES.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Row 2: Addresses */}
                <div className="grid grid-cols-2 gap-3 items-start">
                  {/* Billing Address */}
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center h-[22px] mb-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Billing Address</label>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!form.gstin || form.customer_id <= 0 || !form.billing_address) return;
                          try {
                            await api.put(`/customers/${form.customer_id}`, {
                              address: form.billing_address,
                              name: form.contact_person || undefined,
                              phone: form.mobile_number || undefined,
                              gstin: form.gstin,
                              city: form.customer_state?.split(' (')[0] || '',
                              state: form.customer_state?.split(' (')[0] || '',
                            });
                            alert('✅ Address saved! It will auto-fill next time for this GSTIN from any PC.');
                          } catch { alert('Failed to save address.'); }
                        }}
                        className={`text-[9px] font-bold border px-2 py-0.5 rounded-full transition-colors flex items-center gap-0.5 ${form.gstin && form.gstin.length === 15 && form.customer_id > 0 && form.billing_address ? 'text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200' : 'invisible'}`}
                      >
                        💾 Save to customer
                      </button>
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
                    <div className="flex justify-between items-center h-[22px] mb-1">
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

            {/* ADD PRODUCTS SEARCH ROW */}
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
                <span className="ml-auto text-[10px] text-gray-500">Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1 py-0.5 text-[9px] font-mono">Enter</kbd> to add first result</span>
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
                              addItemToInvoice(filteredParts[0]);
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
                      className="border border-blue-300 hover:border-blue-500 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg w-[40px] h-[40px] flex items-center justify-center transition-all duration-200 shrink-0 bg-blue-50 font-bold"
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
                                addItemToInvoice(part);
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

            {/* PRODUCT ENTRY TABLE */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-200">
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
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '30px' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-50 text-[10.5px] font-bold text-gray-500 uppercase border-b border-gray-200">
                      <th className="py-2 px-2 text-left">Product</th>
                      <th className="py-2 px-2 text-left">Description</th>
                      <th className="py-2 px-2 text-center">HSN/SAC</th>
                      <th className="py-2 px-2 text-center">Qty</th>
                      <th className="py-2 px-2 text-center">Unit</th>
                      <th className="py-2 px-2 text-right">Rate (₹)</th>
                      <th className="py-2 px-2 text-center">Disc %</th>
                      <th className="py-2 px-2 text-right">Disc Amt</th>
                      <th className="py-2 px-2 text-center">GST %</th>
                      <th className="py-2 px-2 text-right">Tax Amt</th>
                      <th className="py-2 px-2 text-right">Line Total</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-gray-400 text-[12px]">
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
                            {/* Product — serial number popover lives here */}
                            <td className="py-2 px-2 text-left relative">
                              <div className="flex items-start gap-1">
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-gray-800 leading-tight truncate text-[11.5px]">{part?.part_number || '—'}</div>
                                  <div className="text-[10px] text-gray-400 truncate" title={part?.name}>
                                    {part?.name || '—'}
                                  </div>
                                  {line.serial_number && (
                                    <div className="text-[9px] text-blue-600 font-bold mt-0.5 leading-none flex items-center gap-0.5">
                                      <span>#</span>{line.serial_number}
                                    </div>
                                  )}
                                </div>
                                {/* S/N icon button */}
                                <button
                                  type="button"
                                  title="Add / Edit Serial Number"
                                  onClick={() => setActiveSerialRow(activeSerialRow === idx ? -1 : idx)}
                                  className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-all duration-150
                                    ${line.serial_number
                                      ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                                    }`}
                                >
                                  #
                                </button>
                              </div>
                              {/* Inline serial number popover */}
                              {activeSerialRow === idx && (
                                <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-blue-200 rounded-lg shadow-lg p-2 w-[200px]">
                                  <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Serial Number</div>
                                  <input
                                    autoFocus
                                    type="text"
                                    value={line.serial_number || ''}
                                    placeholder="e.g. SN-XXXX-0001"
                                    onChange={e => updateLineItem(idx, 'serial_number', e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setActiveSerialRow(-1); }}
                                    onBlur={() => setTimeout(() => setActiveSerialRow(-1), 150)}
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-[11.5px] outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                                  />
                                  <div className="text-[9px] text-gray-400 mt-1">Press Enter or Escape to close</div>
                                </div>
                              )}
                            </td>
                            {/* Description */}
                            <td className="py-2 px-2">
                              <input 
                                type="text" 
                                value={line.description || ''}
                                placeholder="Details/Warranty"
                                onChange={e => updateLineItem(idx, 'description', e.target.value)}
                                className="w-full bg-transparent border border-transparent hover:border-blue-400 focus:border-blue-500 focus:bg-white rounded px-1.5 py-1 text-[11.5px] outline-none transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                              />
                            </td>
                            {/* HSN/SAC */}
                            <td className="py-2 px-2 text-center">
                              <input 
                                type="text" 
                                value={line.hsn_code || ''}
                                placeholder="HSN"
                                onChange={e => updateLineItem(idx, 'hsn_code', e.target.value)}
                                className="w-full bg-transparent border border-transparent hover:border-blue-400 focus:border-blue-500 focus:bg-white rounded px-1 py-1 text-[11.5px] text-center outline-none transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                              />
                            </td>
                            {/* Qty */}
                            <td className="py-2 px-2 text-center">
                              <input 
                                id={`line-qty-${idx}`}
                                type="number" 
                                value={line.quantity}
                                min="1"
                                onChange={e => updateLineItem(idx, 'quantity', e.target.value)}
                                className="w-full text-center bg-transparent border border-transparent hover:border-blue-400 focus:border-blue-500 focus:bg-white rounded px-1 py-1 text-[12px] font-bold outline-none transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                              />
                            </td>
                            {/* Unit */}
                            <td className="py-2 px-2 text-center">
                              <select 
                                value={line.unit || 'Pcs'}
                                onChange={e => updateLineItem(idx, 'unit', e.target.value)}
                                className="w-full appearance-none bg-transparent border border-transparent hover:border-blue-400 focus:border-blue-500 focus:bg-white rounded px-1 py-1 text-[11.5px] text-center outline-none transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] cursor-pointer"
                              >
                                <option value="Pcs">Pcs</option>
                                <option value="Nos">Nos</option>
                                <option value="Sets">Sets</option>
                                <option value="Mtrs">Mtrs</option>
                                <option value="Box">Box</option>
                              </select>
                            </td>
                            {/* Rate */}
                            <td className="py-2 px-2 text-right">
                              <input 
                                type="number" 
                                value={line.unit_price}
                                step="0.01"
                                min="0"
                                onChange={e => updateLineItem(idx, 'unit_price', e.target.value)}
                                className="w-full text-right bg-transparent border border-transparent hover:border-blue-400 focus:border-blue-500 focus:bg-white rounded px-1 py-1 text-[11.5px] outline-none transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                              />
                            </td>
                            {/* Discount % */}
                            <td className="py-2 px-2 text-center">
                              <input 
                                type="number" 
                                value={line.discount_percent}
                                min="0"
                                max="100"
                                onChange={e => updateLineItem(idx, 'discount_percent', e.target.value)}
                                className="w-full text-center bg-transparent border border-transparent hover:border-blue-400 focus:border-blue-500 focus:bg-white rounded px-1 py-1 text-[11.5px] outline-none transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                              />
                            </td>
                            {/* Discount Amount */}
                            <td className="py-2 px-2 text-right text-gray-600 font-medium select-none text-[11.5px]">
                              ₹{discountAmt.toFixed(2)}
                            </td>
                            {/* GST % */}
                            <td className="py-2 px-2 text-center">
                              <select
                                value={line.tax_rate}
                                onChange={e => updateLineItem(idx, 'tax_rate', Number(e.target.value))}
                                className="w-full appearance-none bg-transparent border border-transparent hover:border-blue-400 focus:border-blue-500 focus:bg-white rounded px-1 py-1 text-[11.5px] font-bold outline-none transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] text-center text-gray-800 cursor-pointer"
                              >
                                <option value="18">18%</option>
                                <option value="12">12%</option>
                                <option value="5">5%</option>
                                <option value="28">28%</option>
                                <option value="0">0%</option>
                              </select>
                            </td>
                            {/* Tax Amount */}
                            <td className="py-2 px-2 text-right text-gray-600 font-medium select-none text-[11.5px]">
                              ₹{line.tax_amount.toFixed(2)}
                            </td>
                            {/* Line Total */}
                            <td className="py-2 px-2 text-right font-extrabold text-gray-800 text-[11.5px]">
                              ₹{line.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            {/* Delete */}
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

            {/* NOTES & TERMS */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-200">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
                  <IconFileDescription size={15} className="text-white" />
                </div>
                <span className="font-bold text-gray-800 text-[13px]">Notes &amp; Terms</span>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Customer Notes</label>
                  <textarea 
                    value={form.notes} 
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} 
                    rows={4}
                    placeholder="Notes visible to the customer on the invoice..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white resize-none" 
                  />
                  {grandTotal > 0 && (
                    <div className="text-[10.5px] text-indigo-600 font-medium italic bg-indigo-50 px-2 py-1 rounded-lg">
                      {toRupeesInWords(grandTotal)}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Terms &amp; Conditions</label>
                  <textarea 
                    defaultValue={`1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged for delayed payments.\n3. Subject to local jurisdiction.`}
                    rows={4}
                    placeholder="Standard terms & conditions..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white resize-none" 
                  />
                  <div className="flex items-center gap-2 text-[10.5px] text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                    Payment: <span className="font-bold text-gray-700">{form.payment_method}</span>
                    <span className="mx-1">·</span>
                    Terms: <span className="font-bold text-gray-700">{form.payment_terms}</span>
                  </div>
                </div>
              </div>
            </div>
            {/* PAYMENT INFORMATION — after billing table, before notes */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-green-200">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <IconTruck size={15} className="text-white" />
                </div>
                <span className="font-bold text-gray-800 text-[13px]">Payment &amp; Dispatch</span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Payment Method */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payment Method</label>
                    <select 
                      value={form.payment_method}
                      onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[12px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                    >
                      <option value="Cash">💵 Cash</option>
                      <option value="UPI">📱 UPI</option>
                      <option value="Card">💳 Card</option>
                      <option value="Bank Transfer">🏦 Bank Transfer</option>
                      <option value="Cheque">📝 Cheque</option>
                      <option value="Credit">⏳ Credit</option>
                    </select>
                  </div>
                  {/* Payment Terms */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payment Terms</label>
                    <select 
                      value={form.payment_terms}
                      onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[12px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                    >
                      <option value="Immediate">Immediate / Due on Receipt</option>
                      <option value="Net 7">Net 7 days</option>
                      <option value="Net 15">Net 15 days</option>
                      <option value="Net 30">Net 30 days</option>
                      <option value="Net 45">Net 45 days</option>
                      <option value="Net 60">Net 60 days</option>
                    </select>
                  </div>
                  {/* Dispatch Mode */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Dispatch Mode</label>
                    <select 
                      value={form.dispatch_mode || ''}
                      onChange={e => setForm(p => ({ ...p, dispatch_mode: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[12px] text-gray-700 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white"
                    >
                      <option value="">Select mode...</option>
                      <option value="By Hand">By Hand</option>
                      <option value="Courier">Courier</option>
                      <option value="Road Transport">Road Transport</option>
                      <option value="Air Freight">Air Freight</option>
                      <option value="Rail">Rail</option>
                    </select>
                  </div>
                  {/* E-Way Bill No */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">E-Way Bill No</label>
                    <input 
                      type="text" 
                      value={form.eway_bill_no || ''} 
                      onChange={e => setForm(p => ({ ...p, eway_bill_no: e.target.value }))}
                      placeholder="EWB-XXXXXXXXXXXX"
                      className="w-full border border-gray-200 rounded-lg px-3 h-[36px] text-[12px] text-gray-800 outline-none transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] bg-gray-50 focus:bg-white" 
                    />
                  </div>
                </div>
              </div>
            </div>


          </div>{/* END LEFT COLUMN */}

          {/* RIGHT COLUMN / SIDEBAR */}
          <div className="lg:h-full lg:overflow-y-auto no-scrollbar pb-6">
            
            {/* STICKY SUMMARY CARD */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 transition-all duration-300 hover:shadow-md hover:border-blue-200">
              <div className="font-bold text-gray-800 border-b-2 border-gray-100 pb-2.5 flex items-center gap-2 text-[14px]">
                <IconCalculator size={18} className="text-blue-600" />
                Summary
              </div>

              <div className="bg-gradient-to-b from-[#f8faff] to-[#f9fafb] border-2 border-gray-100 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold text-gray-800">₹{subtotalBeforeDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {totalDiscount > 0 && (
                  <div className="flex justify-between text-[13px] text-red-600 font-medium">
                    <span>Discount</span>
                    <span>-₹{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between text-[13px] border-b border-gray-150 pb-2">
                  <span className="text-gray-500">Taxable Value</span>
                  <span className="font-semibold text-gray-800">₹{taxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {isIntrastate ? (
                  <>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-gray-500">CGST (Central Tax)</span>
                      <span className="text-gray-700 font-medium">₹{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-[13px] border-b border-gray-150 pb-2">
                      <span className="text-gray-500">SGST (State Tax)</span>
                      <span className="text-gray-700 font-medium">₹{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-[13px] border-b border-gray-150 pb-2">
                    <span className="text-gray-500">IGST (Integrated Tax)</span>
                    <span className="text-gray-700 font-medium">₹{igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">Total Tax Liability</span>
                  <span className="font-bold text-blue-700">₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between text-[17px] font-extrabold border-t-2 border-gray-200 pt-3.5 mt-2.5 text-emerald-600">
                  <span>Total</span>
                  <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="border-t border-gray-200 pt-2.5 mt-2 text-[12px] text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span className="font-bold text-gray-700">{lines.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quantity:</span>
                    <span className="font-bold text-gray-700">{lines.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {/* Save Draft / Save Changes */}
                <button 
                  type="button"
                  onClick={() => saveInvoice(isEdit ? form.status : 'draft')}
                  disabled={saving || lines.length === 0}
                  className="w-full h-[40px] border border-gray-300 rounded-lg text-gray-700 font-semibold text-[13px] flex items-center justify-center gap-1.5 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 bg-white cursor-pointer"
                >
                  <IconDeviceFloppy size={15} />
                  {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Save Draft')}
                </button>

                {/* Issue Invoice */}
                <button 
                  type="button" 
                  onClick={() => saveInvoice('issued')}
                  disabled={saving || lines.length === 0}
                  className="w-full h-[44px] rounded-lg text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all hover:translate-y-[-1px] hover:shadow-md disabled:opacity-50 disabled:translate-y-0 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
                >
                  <IconFileCheck size={16} />
                  {saving ? 'Processing...' : 'Issue Invoice'}
                </button>

                <Link 
                  to={backPath}
                  className="w-full h-[40px] border border-gray-300 rounded-lg text-gray-600 font-semibold text-[13px] flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 bg-white"
                >
                  Cancel
                </Link>
              </div>

              {/* Quick Tips */}
              <div className="tips-box bg-amber-50 border-l-4 border-amber-500 rounded-lg p-3.5 mt-4 text-[12px] text-amber-900">
                <h6 className="font-bold text-[12px] text-amber-800 flex items-center gap-1.5 mb-1.5">
                  💡 Quick Tips
                </h6>
                <ul className="list-disc list-inside space-y-1.5 text-amber-800/80">
                  <li>Type product name or scan barcode</li>
                  <li>Press Add or Enter to select first match</li>
                  <li>Click + to create product on the fly</li>
                  <li>Click table cells to edit inline</li>
                </ul>
              </div>

            </div>

          </div>

        </div>
      </form>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showCustModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[3000] p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-250 max-w-md w-full p-6 space-y-4">
            <h3 className="text-[16px] font-bold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <IconSquarePlus className="text-blue-600" size={20} /> Add New Customer
            </h3>
            <form onSubmit={handleQuickCustomerSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Full Name *</label>
                <input 
                  type="text" 
                  value={quickCust.name} 
                  onChange={e => setQuickCust(p => ({ ...p, name: e.target.value }))}
                  required 
                  className="w-full border border-gray-300 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Phone Number *</label>
                <input 
                  type="text" 
                  value={quickCust.phone} 
                  onChange={e => setQuickCust(p => ({ ...p, phone: e.target.value }))}
                  required 
                  className="w-full border border-gray-300 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Email</label>
                <input 
                  type="email" 
                  value={quickCust.email} 
                  onChange={e => setQuickCust(p => ({ ...p, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">GSTIN</label>
                <input 
                  type="text" 
                  value={quickCust.gstin} 
                  onChange={e => handleQuickGstinChange(e.target.value)}
                  placeholder="15-digit GSTIN code"
                  maxLength={15}
                  className="w-full border border-gray-300 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">State / UT *</label>
                <select 
                  value={quickCust.state} 
                  onChange={e => setQuickCust(p => ({ ...p, state: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 h-[36px] text-[13px] text-gray-700 outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white"
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

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Address</label>
                <textarea 
                  value={quickCust.address} 
                  onChange={e => setQuickCust(p => ({ ...p, address: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white resize-y" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowCustModal(false)}
                  className="px-4 h-[34px] rounded-lg border border-gray-300 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 bg-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 h-[34px] rounded-lg text-white text-[12px] font-bold hover:brightness-110 active:scale-[0.98] transition-all duration-200"
                  style={{ background: '#1a3480' }}
                >
                  Add Customer
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
                    className="w-full border border-gray-300 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Part Name *</label>
                  <input 
                    type="text" 
                    value={quickPart.name} 
                    onChange={e => setQuickPart(p => ({ ...p, name: e.target.value }))}
                    required 
                    className="w-full border border-gray-300 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Brand</label>
                  <select 
                    value={quickPart.brand_id} 
                    onChange={e => setQuickPart(p => ({ ...p, brand_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 h-[36px] text-[13px] text-gray-700 outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white"
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
                    className="w-full border border-gray-300 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white" 
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
                    className="w-full border border-gray-300 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] text-right bg-white" 
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
                    className="w-full border border-gray-300 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] text-right bg-white" 
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
                    className="w-full border border-gray-300 rounded-lg px-3 h-[36px] text-[13px] outline-none transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] text-center bg-white" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowPartModal(false)}
                  className="px-4 h-[34px] rounded-lg border border-gray-300 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 bg-white"
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

      {/* GST PORTAL CAPTCHA VERIFICATION MODAL */}
      {showCaptchaPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-250 max-w-sm w-full p-6 space-y-4 transform transition-all duration-300 scale-100">
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
                      src={captchaImg.startsWith('data:') ? captchaImg : `data:image/png;base64,${captchaImg}`} 
                      alt="GST Captcha" 
                      className="h-[45px] max-w-[200px] border border-gray-300 rounded shadow-inner object-contain bg-white block mx-auto"
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

