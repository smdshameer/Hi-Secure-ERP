import { useEffect, useState } from 'react';
import {
  IconDeviceDesktop, IconSearch, IconPlus, IconMinus,
  IconTrash, IconCurrencyRupee, IconCheck, IconX,
} from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';
import type { Product } from '../types';

interface CartItem {
  productId: number;
  name: string;
  salePrice: number;
  taxRate: number;
  quantity: number;
  total: number;
  stock: number; // Available stock ceiling
}

export default function POS() {
  const fromDashboard = typeof window !== 'undefined' && window.location.search.includes('dashboard');
  const [products, setProducts]     = useState<Product[]>([]);
  const [cart, setCart]             = useState<CartItem[]>([]);
  const [search, setSearch]         = useState('');
  const [customers, setCustomers]   = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('0');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [paymentMode, setPaymentMode]   = useState<'cash' | 'upi' | 'card'>('cash');
  const [success, setSuccess]           = useState(false);
  const [loading, setLoading]           = useState(false);
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  useEffect(() => {
    api.get('/products', { params: { search, limit: 30 } })
      .then(r => {
        const raw = r.data.data ?? r.data ?? [];
        const mapped = (raw as any[]).map(p => ({
          id: p.part_id ?? p.id,
          sku: p.part_number ?? p.sku ?? '—',
          name: p.name,
          category: p.category ?? 'Parts',
          brand: p.brand?.name ?? p.brand ?? '—',
          purchasePrice: Number(p.cost_price ?? p.purchasePrice ?? 0),
          salePrice: Number(p.selling_price ?? p.salePrice ?? 0),
          stock: p.stock_quantity ?? p.stock ?? 0,
          minStock: p.reorder_level ?? p.minStock ?? 0,
          taxRate: Number(p.tax_rate ?? p.taxRate ?? 18),
          unit: p.unit ?? 'pcs',
        }));
        setProducts(mapped);
      })
      .catch(() => setProducts([]));
  }, [search]);

  useEffect(() => {
    api.get('/customers')
      .then(r => setCustomers(r.data ?? []))
      .catch(() => setCustomers([]));
  }, []);

  const addToCart = (p: Product) => {
    setStockWarning(null);
    setCart(prev => {
      const existing = prev.find(i => i.productId === p.id);
      if (existing) {
        if (existing.quantity >= p.stock) {
          setStockWarning(`Only ${p.stock} unit(s) of "${p.name}" are available in stock.`);
          return prev; // Do not exceed stock
        }
        return prev.map(i => i.productId === p.id
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.salePrice }
          : i);
      }
      return [...prev, {
        productId: p.id, name: p.name,
        salePrice: p.salePrice, taxRate: p.taxRate,
        quantity: 1, total: p.salePrice,
        stock: p.stock,
      }];
    });
  };

  const updateQty = (productId: number, delta: number) => {
    setStockWarning(null);
    setCart(prev => {
      return prev
        .map(i => {
          if (i.productId !== productId) return i;
          const newQty = i.quantity + delta;
          if (newQty > i.stock) {
            setStockWarning(`Only ${i.stock} unit(s) of "${i.name}" are available in stock.`);
            return i; // Clamp — do not exceed stock
          }
          return { ...i, quantity: newQty, total: newQty * i.salePrice };
        })
        .filter(i => i.quantity > 0);
    });
  };

  const removeItem = (productId: number) =>
    setCart(prev => prev.filter(i => i.productId !== productId));

  const subtotal  = cart.reduce((s, i) => s + i.total, 0);
  const taxTotal  = cart.reduce((s, i) => s + (i.total * i.taxRate / 100), 0);
  const grandTotal = subtotal + taxTotal;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (selectedCustomerId === 'new' && !customerName.trim()) {
      alert('Please enter a Customer Name.');
      return;
    }
    setLoading(true);
    try {
      const checkoutItems = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.salePrice,
        taxRate: item.taxRate
      }));
      await api.post('/pos/checkout', {
        customerId: selectedCustomerId !== 'new' ? Number(selectedCustomerId) : 0,
        customerName,
        customerPhone,
        customerGstin,
        paymentMode,
        items: checkoutItems,
        grandTotal
      });
      setSuccess(true);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerGstin('');
      setSelectedCustomerId('0');
      
      api.get('/customers')
        .then(r => setCustomers(r.data ?? []))
        .catch(() => {});

      setTimeout(() => setSuccess(false), 3000);
    } catch { alert('Checkout failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <style>{`
        .page-banner {
          margin-bottom: 12px !important;
          padding: 12px 16px !important;
        }
      `}</style>

      <PageBanner
        icon={<IconDeviceDesktop size={28} />}
        title="Point of Sale"
        subtitle="Quick checkout and billing"
        backLabel={fromDashboard ? "Back to Dashboard" : "Back"}
        backPath="/"
      />

      <div className="flex gap-4 h-[calc(100vh-180px)]">

        {/* LEFT — Product grid */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 h-[40px]">
            <IconSearch size={15} className="text-gray-400 flex-shrink-0" />
            <input type="text" placeholder="Search products or scan barcode..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="outline-none border-none text-[13px] text-gray-700 placeholder:text-gray-400 w-full" />
          </div>

          {/* Product cards */}
          <div className="overflow-y-auto flex-1">
            <div className="grid grid-cols-3 gap-2">
              {products.map(p => (
                <button key={p.id} onClick={() => addToCart(p)}
                  className={[
                    'bg-white border rounded-xl p-3 text-left transition-all hover:border-blue-300 hover:shadow-sm',
                    p.stock === 0 ? 'opacity-40 cursor-not-allowed' : '',
                    cart.find(i => i.productId === p.id) ? 'border-blue-400 bg-blue-50' : 'border-gray-100',
                  ].join(' ')}
                  disabled={p.stock === 0}>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-2">
                    <IconCurrencyRupee size={16} color="#1a3480" />
                  </div>
                  <p className="text-[12px] font-medium text-gray-800 leading-tight line-clamp-2">{p.name}</p>
                  <p className="text-[13px] font-semibold text-[#1a3480] mt-1">₹{p.salePrice.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {p.stock > 0 ? `Stock: ${p.stock}` : 'Out of stock'}
                  </p>
                </button>
              ))}
              {products.length === 0 && (
                <div className="col-span-3 text-center py-12 text-gray-400 text-[13px]">
                  No products found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Cart + Checkout */}
        <div className="w-[320px] flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex-shrink-0">

          {/* Cart header */}
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-gray-800">
              Cart <span className="text-[#1a3480]">({cart.length})</span>
            </h2>
            {cart.length > 0 && (
              <button onClick={() => setCart([])}
                className="text-[11px] text-red-500 hover:underline flex items-center gap-1">
                <IconX size={12} /> Clear
              </button>
            )}
          </div>

          {/* Stock warning banner */}
          {stockWarning && (
            <div className="mx-3 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <span className="text-amber-500 text-[13px] leading-none mt-0.5">⚠</span>
              <p className="text-[11px] text-amber-700 leading-snug">{stockWarning}</p>
            </div>
          )}

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
                <IconDeviceDesktop size={36} />
                <p className="text-[12px]">Add products to cart</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.productId}
                  className="bg-gray-50 rounded-lg px-3 py-2.5 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-[11px] text-gray-400">₹{item.salePrice.toLocaleString('en-IN')} each</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => updateQty(item.productId, -1)}
                      className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors">
                      <IconMinus size={10} />
                    </button>
                    <span className="w-6 text-center text-[12px] font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.productId, 1)}
                      className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors">
                      <IconPlus size={10} />
                    </button>
                    <button onClick={() => removeItem(item.productId)}
                      className="w-6 h-6 rounded border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-50 ml-1 transition-colors">
                      <IconTrash size={10} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary + Checkout */}
          <div className="border-t border-gray-100 px-4 py-3 flex flex-col gap-3">
            {/* Customer */}
            <div className="flex flex-col gap-2">
              <select
                value={selectedCustomerId}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedCustomerId(val);
                  if (val !== 'new' && val !== '0') {
                    const found = customers.find(c => String(c.customer_id) === val);
                    if (found) {
                      setCustomerName(found.name);
                      setCustomerPhone(found.phone || '');
                      setCustomerGstin(found.gstin || '');
                    }
                  } else {
                    setCustomerName('');
                    setCustomerPhone('');
                    setCustomerGstin('');
                  }
                }}
                className="w-full border border-gray-200 rounded-lg px-2.5 h-[34px] text-[12px] outline-none focus:border-blue-300 bg-white text-gray-700"
              >
                <option value="0">Walk-in Customer</option>
                <option value="new">+ Add New Customer</option>
                {customers.map(c => (
                  <option key={c.customer_id} value={String(c.customer_id)}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>

              {selectedCustomerId === '0' && (
                <input type="text" placeholder="Customer name (optional)"
                  value={customerName} onChange={e => setCustomerName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 h-[34px] text-[12px] outline-none focus:border-blue-300" />
              )}

              {selectedCustomerId === 'new' && (
                <div className="flex flex-col gap-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <input type="text" placeholder="Customer Name"
                    value={customerName} onChange={e => setCustomerName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 h-[34px] text-[12px] outline-none focus:border-blue-300 bg-white" />
                  <input type="text" placeholder="Mobile Phone"
                    value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 h-[34px] text-[12px] outline-none focus:border-blue-300 bg-white" />
                  <input type="text" placeholder="GSTIN (optional)"
                    value={customerGstin} onChange={e => setCustomerGstin(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 h-[34px] text-[12px] outline-none focus:border-blue-300 bg-white" />
                </div>
              )}

              {selectedCustomerId !== '0' && selectedCustomerId !== 'new' && (
                <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100 flex flex-col gap-0.5 text-[11px] text-gray-600">
                  <div><span className="font-semibold text-gray-700">Phone:</span> {customerPhone || '—'}</div>
                  {customerGstin && <div><span className="font-semibold text-gray-700">GSTIN:</span> {customerGstin}</div>}
                </div>
              )}
            </div>

            {/* Payment mode */}
            <div className="flex gap-2">
              {(['cash','upi','card'] as const).map(mode => (
                <button key={mode} onClick={() => setPaymentMode(mode)}
                  className={[
                    'flex-1 py-1.5 rounded-lg text-[12px] font-medium border transition-all capitalize',
                    paymentMode === mode
                      ? 'bg-[#1a3480] text-white border-[#1a3480]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300',
                  ].join(' ')}>
                  {mode === 'upi' ? 'UPI' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-lg px-3 py-2.5 flex flex-col gap-1.5">
              <div className="flex justify-between text-[12px] text-gray-500">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[12px] text-green-600">
                <span>Tax (GST)</span>
                <span>+₹{taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[14px] font-bold text-gray-900 pt-1 border-t border-gray-200 mt-1">
                <span>Total</span>
                <span className="text-[#1a3480]">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Checkout button */}
            {success ? (
              <div className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-500 text-white text-[13px] font-semibold">
                <IconCheck size={16} /> Sale Complete!
              </div>
            ) : (
              <button onClick={handleCheckout} disabled={cart.length === 0 || loading}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-[13px] font-semibold transition-colors disabled:opacity-40"
                style={{ background: '#1a3480' }}>
                {loading ? 'Processing...' : `Checkout — ₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
