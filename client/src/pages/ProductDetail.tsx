import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  IconChevronLeft, IconPackage, IconHistory, IconTrendingUp, IconTrendingDown,
  IconArrowLeftRight, IconAlertTriangle, IconEdit, IconTrash, IconPlus, IconMinus
} from '@tabler/icons-react';
import api from '../services/api';
import PageBanner from '../components/PageBanner';

interface PurchaseOrderItemType {
  po_item_id: number;
  po_id: number;
  quantity: number;
  unit_price: number;
  purchaseOrder: {
    po_number?: string;
    order_date: string;
    supplier: {
      name: string;
    }
  }
}

interface PartType {
  part_id: number;
  part_number: string;
  name: string;
  description?: string;
  brand?: { name: string };
  hsn_code?: string;
  cost_price: number;
  selling_price: number;
  tax_rate: number;
  stock_quantity: number;
  reorder_level: number;
  is_active: boolean;
  purchaseOrderItems?: PurchaseOrderItemType[];
}

interface MovementType {
  id: number;
  partId: number;
  movementType: string;
  quantity: number;
  referenceType?: string;
  referenceId?: number;
  createdAt: string;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [part, setPart] = useState<PartType | null>(null);
  const [movements, setMovements] = useState<MovementType[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [detailTab, setDetailTab] = useState<'movements' | 'purchases'>('movements');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const [partRes, movementsRes] = await Promise.all([
          api.get(`/parts/${id}`),
          api.get(`/parts/${id}/movements`).catch(() => ({ data: [] }))
        ]);
        setPart(partRes.data);
        setMovements(movementsRes.data);
      } catch (err) {
        console.error('Failed to load part details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyChange = parseInt(adjustQty);
    if (isNaN(qtyChange) || qtyChange === 0 || !part) return;

    try {
      setAdjusting(true);
      await api.patch(`/parts/${part.part_id}/stock`, { quantity_change: qtyChange });
      
      // Refresh state
      const [partRes, movementsRes] = await Promise.all([
        api.get(`/parts/${id}`),
        api.get(`/parts/${id}/movements`)
      ]);
      setPart(partRes.data);
      setMovements(movementsRes.data);
      setAdjustQty('');
      alert('Stock adjusted successfully.');
    } catch (err) {
      alert('Failed to adjust stock.');
    } finally {
      setAdjusting(false);
    }
  };

  const handleDelete = async () => {
    if (!part) return;
    if (window.confirm(`Are you sure you want to delete product "${part.name}"? This action cannot be undone.`)) {
      try {
        await api.delete(`/parts/${part.part_id}`);
        navigate('/parts');
      } catch (err) {
        alert('Failed to delete product.');
      }
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading product details...</div>;
  }

  if (!part) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-xl font-bold">Product not found</p>
        <Link to="/parts" className="text-blue-600 hover:underline mt-2 inline-block">
          Return to Products
        </Link>
      </div>
    );
  }

  const cost = Number(part.cost_price || 0);
  const price = Number(part.selling_price || 0);
  const profitMargin = price > 0 ? ((price - cost) / price) * 100 : 0;

  const getMovementBadgeClass = (type: string, qty: number) => {
    if (qty > 0) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (qty < 0) return 'bg-rose-50 text-rose-700 border border-rose-200';
    return 'bg-amber-50 text-amber-700 border border-amber-200';
  };

  return (
    <div className="max-w-[1600px] w-full mx-auto px-4 relative flex-1 min-h-0 flex flex-col gap-4 pb-6">
      <PageBanner
        icon={<IconPackage size={28} />}
        title={`${part.name}`}
        subtitle={`Part Number: ${part.part_number} | Brand: ${part.brand?.name || '—'}`}
        backLabel="Back to Products"
        backPath="/parts"
        action={
          <div className="flex gap-2">
            <Link 
              to={`/parts/${part.part_id}/edit`}
              className="flex items-center gap-1 bg-white text-[#1a3480] text-[13px] font-bold px-3.5 py-1.5 rounded-lg border border-transparent shadow-sm hover:bg-blue-50 transition-colors"
            >
              <IconEdit size={15} /> Edit
            </Link>
            <button 
              onClick={handleDelete}
              className="flex items-center gap-1 bg-red-650 hover:bg-red-700 text-white text-[13px] font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition-colors"
            >
              <IconTrash size={15} /> Delete
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* METRICS & ADJUSTMENT PANEL */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* INFO CARD */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-gray-800 text-[14px] border-b border-gray-100 pb-2 flex items-center gap-2">
              <IconPackage size={17} className="text-blue-600" /> General Specifications
            </h3>
            
            <div className="space-y-3 text-[12.5px]">
              <div className="flex justify-between">
                <span className="text-gray-400">Part Number / SKU</span>
                <span className="font-mono font-bold text-gray-800">{part.part_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">HSN Code</span>
                <span className="font-bold text-gray-800">{part.hsn_code || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tax Rate (GST)</span>
                <span className="font-bold text-gray-800">{part.tax_rate}%</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <span className="text-gray-400">Purchase Price</span>
                <span className="font-bold text-gray-800">₹{cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Selling Price</span>
                <span className="font-bold text-gray-800">₹{price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Markup Margin</span>
                <span className={`font-bold ${profitMargin >= 20 ? 'text-emerald-600' : 'text-gray-700'}`}>
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* STOCK STATUS CARD */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-gray-800 text-[14px] border-b border-gray-100 pb-2">
              Stock Status
            </h3>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Current Quantity</div>
                <div className="text-3xl font-extrabold text-gray-800 mt-1">{part.stock_quantity}</div>
              </div>
              <div>
                <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Reorder Trigger</div>
                <div className="text-xl font-bold text-gray-650 mt-1">{part.reorder_level}</div>
              </div>
            </div>

            {part.stock_quantity <= part.reorder_level ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 flex gap-2 text-red-800 text-[12px] font-medium leading-relaxed">
                <IconAlertTriangle className="text-red-500 shrink-0" size={18} />
                <div>
                  <span className="font-bold">Attention Needed!</span> Current inventory level is below the configured reorder limit. Restock needed immediately.
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 text-emerald-800 text-[12px] font-semibold text-center">
                ✅ Stock Level Healthy
              </div>
            )}
          </div>

          {/* QUICK RECONCILIATION */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-gray-800 text-[14px] border-b border-gray-100 pb-2">
              Inventory Reconciliation
            </h3>
            <p className="text-[11.5px] text-gray-400 leading-relaxed">
              Manually increment or decrement stock level directly for corrections, audits, or damage write-offs.
            </p>
            <form onSubmit={handleAdjustStock} className="flex gap-2">
              <input
                type="number"
                required
                placeholder="e.g. +5 or -2"
                value={adjustQty}
                onChange={e => setAdjustQty(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 text-[13px] outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-white text-center font-bold"
              />
              <button
                type="submit"
                disabled={adjusting || !adjustQty}
                className="bg-[#1a3480] hover:brightness-110 text-white font-bold text-[12.5px] px-4 py-2 rounded-lg disabled:opacity-50 transition-all"
              >
                {adjusting ? 'Updating...' : 'Adjust Stock'}
              </button>
            </form>
          </div>

        </div>

        {/* HISTORICAL LEDGER / TIMELINE */}
        <div className="lg:col-span-2">
          
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col min-h-[500px]">
            {/* Tabbed Header */}
            <div className="border-b border-gray-100 px-5 py-2 flex items-center gap-4 bg-gray-50/50 rounded-t-xl">
              <button
                onClick={() => setDetailTab('movements')}
                className={`py-3 text-[13px] font-extrabold border-b-2 transition-all flex items-center gap-1.5 ${detailTab === 'movements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-650'}`}
              >
                <IconHistory size={16} /> Stock Movement History ({movements.length})
              </button>
              <button
                onClick={() => setDetailTab('purchases')}
                className={`py-3 text-[13px] font-extrabold border-b-2 transition-all flex items-center gap-1.5 ${detailTab === 'purchases' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-650'}`}
              >
                <IconArrowLeftRight size={16} /> Supplier Cost History ({part.purchaseOrderItems?.length || 0})
              </button>
            </div>

            <div className="overflow-x-auto flex-1 p-4">
              {detailTab === 'movements' ? (
                movements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                    <span className="text-4xl opacity-30">🔍</span>
                    <p className="font-bold text-gray-500">No movements recorded yet</p>
                    <p className="text-[11.5px] text-gray-400">Stock updates will automatically build the log.</p>
                  </div>
                ) : (
                  <table className="w-full border-collapse text-[12.5px]">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-semibold text-[11px] uppercase tracking-wider text-left bg-gray-50">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Transaction</th>
                        <th className="py-2.5 px-3 text-center">Type</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {movements.map(m => {
                        const dateStr = new Date(m.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        });
                        
                        let refLink: React.ReactNode = '—';
                        if (m.referenceType === 'SalesInvoice' && m.referenceId) {
                          refLink = <Link to={`/sales/${m.referenceId}`} className="text-blue-600 hover:underline">Invoice #{m.referenceId}</Link>;
                        } else if (m.referenceType === 'PurchaseOrder' && m.referenceId) {
                          refLink = <Link to={`/purchases/${m.referenceId}`} className="text-blue-600 hover:underline">PO #{m.referenceId}</Link>;
                        } else if (m.referenceType === 'InitialStock') {
                          refLink = 'Initial Stocking';
                        } else if (m.referenceType === 'ManualAdjustment') {
                          refLink = 'Manual Correction';
                        }

                        return (
                          <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-3 text-gray-500 font-mono text-[11.5px]">{dateStr}</td>
                            <td className="py-3 px-3 font-semibold text-gray-800">
                              {m.movementType === 'SALE' ? 'Customer Sale' : m.movementType === 'PURCHASE' ? 'Supplier Purchase' : 'Inventory Adjust'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getMovementBadgeClass(m.movementType, m.quantity)}`}>
                                {m.movementType}
                              </span>
                            </td>
                            <td className={`py-3 px-3 text-right font-extrabold text-[13px] ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                            </td>
                            <td className="py-3 px-3 text-gray-600">{refLink}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              ) : (
                !part.purchaseOrderItems || part.purchaseOrderItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                    <span className="text-4xl opacity-30">📦</span>
                    <p className="font-bold text-gray-500">No purchase history found</p>
                    <p className="text-[11.5px] text-gray-400">Purchasing this product through Purchase Orders will build this price log.</p>
                  </div>
                ) : (
                  <table className="w-full border-collapse text-[12.5px]">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-semibold text-[11px] uppercase tracking-wider text-left bg-gray-50">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Supplier Name</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {part.purchaseOrderItems.map(item => {
                        const dateStr = new Date(item.purchaseOrder.order_date).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        });

                        return (
                          <tr key={item.po_item_id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-3 text-gray-500 font-mono text-[11.5px]">{dateStr}</td>
                            <td className="py-3 px-3 font-semibold text-gray-800">
                              {item.purchaseOrder.supplier.name}
                            </td>
                            <td className="py-3 px-3 text-right font-extrabold text-[12.5px] text-emerald-600">
                              ₹{Number(item.unit_price).toFixed(2)}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-gray-700">
                              {item.quantity}
                            </td>
                            <td className="py-3 px-3">
                              <Link to={`/purchases/${item.po_id}`} className="text-blue-600 hover:underline font-semibold">
                                {item.purchaseOrder.po_number || `PO #${item.po_id}`}
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}