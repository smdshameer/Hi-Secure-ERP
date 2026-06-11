import { Router } from 'express';
import { prisma } from '../index';

export const reportsRouter = Router();

function serializeRows(rows: any[]): any[] {
  return rows.map(row => {
    const out: any = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = typeof v === 'bigint' ? String(v) : v;
    }
    return out;
  });
}

// Get comprehensive reports analytics
reportsRouter.get('/', async (_req, res) => {
  try {
    // 1. Get Monthly Revenue (Sales vs Repairs) for the last 6 months
    const repairRevenueRaw: any[] = await prisma.$queryRaw`
      SELECT TO_CHAR(completion_date, 'YYYY-MM') as month_str, SUM(actual_cost)::numeric as repairs_sum
      FROM repairs 
      WHERE completion_date IS NOT NULL AND completion_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(completion_date, 'YYYY-MM')
    `;

    const salesRevenueRaw: any[] = await prisma.$queryRaw`
      SELECT TO_CHAR(invoice_date, 'YYYY-MM') as month_str, SUM(grand_total)::numeric as sales_sum
      FROM sales_invoices 
      WHERE status IN ('issued', 'paid') AND invoice_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(invoice_date, 'YYYY-MM')
    `;

    const revenue: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toISOString().slice(0, 7); // "YYYY-MM"
      const monthName = d.toLocaleDateString('en-US', { month: 'short' }); // "Jan"
      
      const repairVal = repairRevenueRaw.find(r => r.month_str === monthStr);
      const salesVal = salesRevenueRaw.find(s => s.month_str === monthStr);
      
      revenue.push({
        month: monthName,
        sales: salesVal ? Number(salesVal.sales_sum || 0) : 0,
        repairs: repairVal ? Number(repairVal.repairs_sum || 0) : 0
      });
    }

    // 2. Repair Status Breakdown
    const repairStatusRaw = await prisma.repair.groupBy({
      by: ['repair_status'],
      _count: {
        repair_id: true
      }
    });

    const repairStatus = repairStatusRaw.map(r => ({
      name: r.repair_status ? r.repair_status.charAt(0).toUpperCase() + r.repair_status.slice(1).replace(/_/g, ' ') : 'Received',
      value: r._count.repair_id
    }));

    // 3. Top Products / Parts by Sales
    const topProductsRaw: any[] = await prisma.$queryRaw`
      SELECT p.name, SUM(sii.quantity)::int as qty, SUM(sii.total_amount)::numeric as revenue
      FROM sales_invoice_items sii
      JOIN parts p ON sii.part_id = p.part_id
      GROUP BY p.name
      ORDER BY qty DESC
      LIMIT 5
    `;
    const topProducts = topProductsRaw.map(p => ({
      name: p.name,
      qty: p.qty || 0,
      revenue: Number(p.revenue || 0)
    }));

    // 4. Top Customers by Spend
    const topCustomersRaw: any[] = await prisma.$queryRaw`
      SELECT c.name, SUM(si.grand_total)::numeric as total
      FROM sales_invoices si
      JOIN customers c ON si.customer_id = c.customer_id
      WHERE si.status IN ('issued', 'paid')
      GROUP BY c.name
      ORDER BY total DESC
      LIMIT 5
    `;
    const topCustomers = topCustomersRaw.map(c => ({
      name: c.name,
      total: Number(c.total || 0)
    }));

    return res.json({
      revenue,
      repairStatus,
      topProducts,
      topCustomers
    });
  } catch (err) {
    console.error('Reports error:', err);
    return res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Original routes for backwards compatibility/other modules
reportsRouter.get('/sales', async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    let sql = `SELECT invoice_date::text, SUM(grand_total) as grand_total_sum, SUM(tax_amount) as tax_amount_sum, COUNT(*)::int as invoice_count FROM sales_invoices WHERE status != 'draft'`;
    const params: string[] = [];
    if (from_date) { sql += ` AND invoice_date >= $${params.length + 1}`; params.push(String(from_date)); }
    if (to_date) { sql += ` AND invoice_date <= $${params.length + 1}`; params.push(String(to_date)); }
    sql += ` GROUP BY invoice_date ORDER BY invoice_date DESC`;
    const data = await prisma.$queryRawUnsafe(sql, ...params);
    return res.json(serializeRows(data as any[]));
  } catch (err) { console.error('Reports/sales error:', err); return res.status(500).json({ error: 'Failed to generate report' }); }
});

reportsRouter.get('/repairs', async (_req, res) => {
  try {
    const data = await prisma.$queryRaw`
      SELECT repair_status as status, COUNT(*)::int as count,
        SUM(COALESCE(estimated_cost, 0))::text as total_estimated,
        SUM(COALESCE(actual_cost, 0))::text as total_actual
      FROM repairs GROUP BY repair_status ORDER BY count DESC
    `;
    return res.json(serializeRows(data as any[]));
  } catch (err) { console.error('Reports/repairs error:', err); return res.status(500).json({ error: 'Failed to generate report' }); }
});

reportsRouter.get('/inventory', async (_req, res) => {
  try {
    const data = await prisma.$queryRaw`
      SELECT p.part_id, p.part_number, p.name, p.stock_quantity::int, p.reorder_level::int,
        (COALESCE(p.selling_price, 0) * p.stock_quantity)::text as stock_value,
        b.name as brand_name,
        CASE WHEN p.stock_quantity = 0 THEN 'out' WHEN p.stock_quantity <= p.reorder_level THEN 'low' ELSE 'ok' END as status
      FROM parts p LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE p.is_active = true ORDER BY p.stock_quantity ASC
    `;
    return res.json(serializeRows(data as any[]));
  } catch (err) { console.error('Reports/inventory error:', err); return res.status(500).json({ error: 'Failed to generate report' }); }
});

reportsRouter.get('/summary', async (_req, res) => {
  try {
    const [customers, repairs, invoices, parts] = await Promise.all([
      prisma.customer.count(),
      prisma.repair.count(),
      prisma.salesInvoice.aggregate({ _sum: { grand_total: true }, where: { status: { not: 'draft' } } }),
      prisma.parts.aggregate({ _sum: { stock_quantity: true, selling_price: true } }),
    ]);
    return res.json({ customers, repairs, totalRevenue: Number(invoices._sum.grand_total || 0), totalParts: Number(parts._sum.stock_quantity || 0), inventoryValue: Number(parts._sum.selling_price || 0) });
  } catch (err) { return res.status(500).json({ error: 'Failed to fetch summary' }); }
});