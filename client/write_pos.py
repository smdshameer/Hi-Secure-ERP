# -*- coding: utf-8 -*-
target = r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx'

bt = chr(96)  # backtick

content_lines = [
'import { useEffect, useState } from ' + bt + 'react' + bt + ';\n',
'import {\n',
'IconDeviceDesktop, IconSearch, IconPlus, IconMinus,\n',
'IconTrash, IconCurrencyRupee, IconCheck, IconX,\n',
'} from ' + bt + '@tabler/icons-react' + bt + ';\n',
"import api from '../services/api';\n",
"import type { Product } from '../types';\n\n",
'interface CartItem {\n',
'productId: number;\n',
'name: string;\n',
'salePrice: number;\n',
'taxRate: number;\n',
'quantity: number;\n',
'total: number;\n',
'}\n\n',
]
content = ''.join(content_lines)

content += '''export default function POS() {
const [products, setProducts] = useState<Product[]>([]);
const [cart, setCart] = useState<CartItem[]>([]);
const [search, setSearch] = useState('');
const [customerName, setCustomerName] = useState('');
const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card'>('cash');
const [success, setSuccess] = useState(false);
const [loading, setLoading] = useState(false);

useEffect(() => {
api.get('/products', { params: { search, limit: 30 } })
.then(r => setProducts(r.data.data ?? r.data))
.catch(() => setProducts([]));
}, [search]);

const addToCart = (p: Product) => {
setCart(prev => {
const existing = prev.find(i => i.productId === p.id);
if (existing) {
return prev.map(i => i.productId === p.id
? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.salePrice }
: i);
}
return [...prev, {
productId: p.id, name: p.name,
salePrice: p.salePrice, taxRate: p.taxRate,
quantity: 1, total: p.salePrice,
}];
});
};

const updateQty = (productId: number, delta: number) => {
setCart(prev => prev
.map(i => i.productId === productId
? { ...i, quantity: i.quantity + delta, total: (i.quantity + delta) * i.salePrice }
: i)
.filter(i => i.quantity > 0));
};

const removeItem = (productId: number) =>
setCart(prev => prev.filter(i => i.productId !== productId));

const subtotal = cart.reduce((s, i) => s + i.total, 0);
const taxTotal = cart.reduce((s, i) => s + (i.total * i.taxRate / 100), 0);
const grandTotal = subtotal + taxTotal;

const handleCheckout = async () => {
if (cart.length === 0) return;
setLoading(true);
try {
const res = await api.post('/pos/checkout', { customerName, paymentMode, items: cart, grandTotal });
setSuccess(true);
setCart([]);
setCustomerName('');
if (res.data && res.data.invoice && res.data.invoice.invoice_id) {
window.open(` + bt + '/api/pos/receipt/${res.data.invoice.invoice_id}' + bt + `, '_blank');
}
setTimeout(() => setSuccess(false), 3000);
} catch { alert('Checkout failed. Please try again.'); }
finally { setLoading(false); }
};

return (
<div>
{/* Header */}
<div className="flex items-center gap-3 mb-5">
<div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#1a3480' }}>
<IconDeviceDesktop size={20} color="#fff" />
</div>
<div>
<h1 className="text-[20px] font-semibold text-gray-900">Point of Sale</h1>
<p className="text-[12px] text-gray-400">Quick checkout and billing</p>
</div>
</div>

<div className="flex gap-4 h-[calc(100vh-180px)]">
{/* LEFT */}
