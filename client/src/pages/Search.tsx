import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  IconSearch, IconUser, IconBox, IconTool, IconFileInvoice, IconTruck, IconFileDescription,
} from '@tabler/icons-react';
import api from '../services/api';

interface SearchResults {
  customers: any[];
  parts: any[];
  repairs: any[];
  invoices: any[];
  suppliers: any[];
  quotations: any[];
  deliveryChallans: any[];
}

const statusColor: Record<string, string> = {
  received: 'pill pill-amber',
  diagnosed: 'pill pill-gray',
  in_repair: 'pill pill-blue',
  waiting_parts: 'pill pill-purple',
  completed: 'pill pill-green',
  delivered: 'pill pill-teal',
  cancelled: 'pill pill-red',
  draft: 'pill pill-gray',
  issued: 'pill pill-blue',
  paid: 'pill pill-green',
  partial: 'pill pill-amber',
};

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    api.get(`/search?q=${encodeURIComponent(q)}`)
      .then(r => setResults(r.data))
      .catch(() => setResults({ customers: [], parts: [], repairs: [], invoices: [], suppliers: [], quotations: [], deliveryChallans: [] }))
      .finally(() => setLoading(false));
  }, [q]);

  const totalResults = results
    ? (results.customers?.length || 0) + 
      (results.parts?.length || 0) + 
      (results.repairs?.length || 0) + 
      (results.invoices?.length || 0) + 
      (results.suppliers?.length || 0) + 
      (results.quotations?.length || 0) + 
      (results.deliveryChallans?.length || 0)
    : 0;

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto p-1">
      {/* Page header */}
      <div className="page-header flex-shrink-0">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <IconSearch size={22} className="text-blue-500" />
            Search Results
          </h1>
          <p className="page-sub">
            {q ? (
              <>Showing results for "<strong>{q}</strong>" — {loading ? 'searching...' : `${totalResults} found`}</>
            ) : (
              'Enter a search term in the search bar above'
            )}
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-400 border-t-transparent mr-3"></div>
          Searching...
        </div>
      )}

      {results && !loading && (
        <div className="flex flex-col gap-5">

          {/* Customers */}
          {results.customers.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title"><IconUser size={16} className="text-blue-500" /> Customers ({results.customers.length})</div>
              </div>
              <table className="mini-table">
                <thead>
                  <tr><th>Name</th><th>Phone</th><th>Email</th><th>GSTIN</th></tr>
                </thead>
                <tbody>
                  {results.customers.map((c: any) => (
                    <tr key={c.customer_id}>
                      <td><Link to={`/customers/${c.customer_id}`} className="text-blue-600 font-semibold text-[12px]">{c.name}</Link></td>
                      <td className="text-[12px]">{c.phone || '—'}</td>
                      <td className="text-[12px]">{c.email || '—'}</td>
                      <td className="text-[12px] font-mono">{c.gstin || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Products / Parts */}
          {results.parts.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title"><IconBox size={16} className="text-indigo-500" /> Products ({results.parts.length})</div>
              </div>
              <table className="mini-table">
                <thead>
                  <tr><th>Name</th><th>SKU</th><th>HSN</th><th>Price</th><th>Stock</th></tr>
                </thead>
                <tbody>
                  {results.parts.map((p: any) => (
                    <tr key={p.part_id}>
                      <td><Link to={`/parts/${p.part_id}/edit`} className="text-blue-600 font-semibold text-[12px]">{p.name}</Link></td>
                      <td className="text-[12px]">{p.part_number || '—'}</td>
                      <td className="text-[12px]">{p.hsn_code || '—'}</td>
                      <td className="text-[12px]">₹{Number(p.selling_price || 0).toLocaleString('en-IN')}</td>
                      <td className="text-[12px]">{p.stock_quantity ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Repairs */}
          {results.repairs.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title"><IconTool size={16} className="text-amber-500" /> Repairs ({results.repairs.length})</div>
              </div>
              <table className="mini-table">
                <thead>
                  <tr><th>Ticket</th><th>Customer</th><th>Product</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {results.repairs.map((r: any) => (
                    <tr key={r.repair_id}>
                      <td><Link to={`/repairs/${r.repair_id}/edit`} className="text-blue-600 font-semibold text-[12px]">{r.ticket_number}</Link></td>
                      <td className="text-[12px] font-semibold">{r.customer?.name || '—'}</td>
                      <td className="text-[12px]">{r.product_type || '—'}</td>
                      <td><span className={statusColor[r.repair_status] || 'pill pill-gray'}>{r.repair_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Invoices */}
          {results.invoices.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title"><IconFileInvoice size={16} className="text-green-500" /> Invoices ({results.invoices.length})</div>
              </div>
              <table className="mini-table">
                <thead>
                  <tr><th>Invoice #</th><th>Customer</th><th>Total</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {results.invoices.map((inv: any) => (
                    <tr key={inv.invoice_id}>
                      <td><Link to={`/sales/${inv.invoice_id}`} className="text-blue-600 font-semibold text-[12px]">{inv.invoice_number}</Link></td>
                      <td className="text-[12px] font-semibold">{inv.customer?.name || '—'}</td>
                      <td className="text-[12px] font-bold">₹{Number(inv.total_amount || 0).toLocaleString('en-IN')}</td>
                      <td><span className={statusColor[inv.status] || 'pill pill-gray'}>{inv.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Quotations */}
          {results.quotations && results.quotations.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title"><IconFileDescription size={16} className="text-blue-500" /> Quotations ({results.quotations.length})</div>
              </div>
              <table className="mini-table">
                <thead>
                  <tr><th>Quote #</th><th>Customer</th><th>Total</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {results.quotations.map((q: any) => (
                    <tr key={q.quote_id}>
                      <td><Link to={`/quotations/${q.quote_id}`} className="text-blue-600 font-semibold text-[12px]">{q.quote_number}</Link></td>
                      <td className="text-[12px] font-semibold">{q.customer?.name || '—'}</td>
                      <td className="text-[12px] font-bold">₹{Number(q.total_amount || 0).toLocaleString('en-IN')}</td>
                      <td><span className={statusColor[q.status] || 'pill pill-gray'}>{q.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Delivery Challans */}
          {results.deliveryChallans && results.deliveryChallans.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title"><IconTruck size={16} className="text-purple-500" /> Delivery Challans ({results.deliveryChallans.length})</div>
              </div>
              <table className="mini-table">
                <thead>
                  <tr><th>Challan #</th><th>Customer</th><th>Vehicle Number</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {results.deliveryChallans.map((dc: any) => (
                    <tr key={dc.delivery_challan_id}>
                      <td><Link to={`/delivery-challans/${dc.delivery_challan_id}`} className="text-blue-600 font-semibold text-[12px]">{dc.challan_number}</Link></td>
                      <td className="text-[12px] font-semibold">{dc.customer?.name || '—'}</td>
                      <td className="text-[12px] font-mono">{dc.vehicle_number || '—'}</td>
                      <td><span className={statusColor[dc.status] || 'pill pill-gray'}>{dc.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Suppliers */}
          {results.suppliers.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title"><IconTruck size={16} className="text-purple-500" /> Suppliers ({results.suppliers.length})</div>
              </div>
              <table className="mini-table">
                <thead>
                  <tr><th>Name</th><th>Phone</th><th>Email</th><th>GSTIN</th></tr>
                </thead>
                <tbody>
                  {results.suppliers.map((s: any) => (
                    <tr key={s.supplier_id}>
                      <td><Link to={`/suppliers/${s.supplier_id}/edit`} className="text-blue-600 font-semibold text-[12px]">{s.name}</Link></td>
                      <td className="text-[12px]">{s.phone || '—'}</td>
                      <td className="text-[12px]">{s.email || '—'}</td>
                      <td className="text-[12px] font-mono">{s.gstin || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* No results */}
          {totalResults === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <IconSearch size={40} className="text-gray-200" />
              <p className="text-[15px] font-medium">No results found for "{q}"</p>
              <p className="text-[12px]">Try different keywords or check the spelling</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
