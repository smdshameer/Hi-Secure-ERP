import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconPackage, IconPlus, IconSearch, IconEye, IconEdit, IconAlertTriangle } from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';
import type { Product } from '../types';

export default function Products() {
  const fromDashboard = typeof window !== 'undefined' && window.location.search.includes('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<'all' | 'low'>('all');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/products', { params: { search, lowStock: filter === 'low' ? true : undefined } })
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
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [search, filter]);

  return (
    <div className="max-w-[1600px] w-full mx-auto px-4 relative flex-1 min-h-0 flex flex-col gap-4 pb-4 lg:pb-0">
      <style>{`

        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        thead th {
          position: sticky;
          top: 0;
          z-index: 10;
          background-color: #fcfdfe !important;
          box-shadow: inset 0 -1px 0 #e2e8f0;
        }
        .page-banner {
          margin-bottom: 0px !important;
        }
      `}</style>

      <PageBanner
        icon={<IconPackage size={28} />}
        title="Products & Parts"
        subtitle="Manage inventory, stock levels and pricing"
        backLabel={fromDashboard ? "Back to Dashboard" : "Back"}
        backPath="/"
        action={
          <Link to="/parts/new"
            className="flex items-center gap-1.5 bg-white text-[#1a3480] text-[13px] font-semibold px-3 py-1.5 rounded-lg">
            <IconPlus size={15} /> Add Product
          </Link>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 gap-4">
          <div className="flex gap-2">
            {[
              { label: 'All Products', value: 'all' },
              { label: '⚠ Low Stock',  value: 'low' },
            ].map(f => (
              <button key={f.value} onClick={() => setFilter(f.value as 'all' | 'low')}
                className={[
                  'px-3 py-1 rounded-full text-[12px] font-medium border transition-all',
                  filter === f.value
                    ? 'bg-[#1a3480] text-white border-[#1a3480]'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300',
                ].join(' ')}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-[34px] w-[240px]">
            <IconSearch size={14} className="text-gray-400 flex-shrink-0" />
            <input type="text" placeholder="Search product, SKU..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="outline-none border-none text-[13px] text-gray-700 placeholder:text-gray-400 w-full" />
          </div>
        </div>

        <div className="overflow-x-auto flex-1 overflow-y-auto no-scrollbar">
          <table className="erp-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Brand</th>
                <th className="text-right">Purchase ₹</th>
                <th className="text-right">Sale ₹</th>
                <th className="text-center">Stock</th>
                <th className="text-center">Min</th>
                <th>GST %</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">No products found</td></tr>
              ) : (
                products.map(p => (
                  <tr key={p.id}>
                    <td className="font-mono text-[11px] text-gray-500">{p.sku}</td>
                    <td className="font-medium text-[13px]">{p.name}</td>
                    <td className="text-[12px]"><span className="pill pill-blue">{p.category}</span></td>
                    <td className="text-[12px] text-gray-500">{p.brand ?? '—'}</td>
                    <td className="text-right text-[13px]">₹{p.purchasePrice.toLocaleString('en-IN')}</td>
                    <td className="text-right text-[13px] font-medium">₹{p.salePrice.toLocaleString('en-IN')}</td>
                    <td className="text-center">
                      <span className={[
                        'font-semibold text-[13px]',
                        p.stock <= p.minStock ? 'text-red-600' : 'text-gray-800',
                      ].join(' ')}>
                        {p.stock <= p.minStock && <IconAlertTriangle size={12} className="inline mr-0.5 text-red-500" />}
                        {p.stock}
                      </span>
                    </td>
                    <td className="text-center text-[12px] text-gray-400">{p.minStock}</td>
                    <td className="text-[12px]">{p.taxRate}%</td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <Link to={"/parts/" + p.id}
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors">
                          <IconEye size={14} />
                        </Link>
                        <Link to={"/parts/" + p.id + "/edit"}
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors">
                          <IconEdit size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


