import { Router } from 'express';
import { prisma } from '../index';

export const dashboardRouter = Router();

dashboardRouter.get('/', async (_req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      activeRepairs,
      newRepairs,
      totalCustomers,
      monthRevenue,
      repairsByStatus,
      recentSales,
      lowStockCount,
      completedMonth,
      completedRevenueRes,
      pendingInvoices,
      pendingAmountRes,
      invoice30DaySum,
      repair30DaySum,
      activeLeads,
    ] = await Promise.all([
      prisma.repair.count({
        where: { NOT: { repair_status: { in: ['completed', 'cancelled'] } } },
      }),
      prisma.repair.count({
        where: { repair_status: 'received' },
      }),
      prisma.customer.count({
        where: { is_active: true },
      }),
      prisma.$queryRaw<{ total: number | null }[]>`SELECT COALESCE(SUM(grand_total), 0)::float as total FROM sales_invoices WHERE invoice_date >= ${startOfMonth}`,
      prisma.$queryRaw<{ status: string; count: bigint }[]>`SELECT repair_status as status, COUNT(*)::int as count FROM repairs WHERE repair_status IS NOT NULL GROUP BY repair_status`,
      prisma.salesInvoice.findMany({
        take: 5,
        orderBy: { invoice_date: 'desc' },
        select: {
          invoice_id: true,
          invoice_number: true,
          grand_total: true,
          created_at: true,
          customer: { select: { name: true, phone: true } },
        },
      }),
      prisma.$queryRaw<{ cnt: bigint }[]>`SELECT COUNT(*)::int as cnt FROM parts WHERE is_active = true AND stock_quantity < reorder_level`,
      prisma.repair.count({
        where: { repair_status: 'completed', completion_date: { gte: startOfMonth } },
      }),
      prisma.repair.aggregate({
        where: { repair_status: 'completed', completion_date: { gte: startOfMonth } },
        _sum: { actual_cost: true },
      }),
      prisma.salesInvoice.count({
        where: { status: { in: ['draft', 'issued', 'partial'] } },
      }),
      prisma.salesInvoice.aggregate({
        where: { status: { in: ['draft', 'issued', 'partial'] } },
        _sum: { grand_total: true },
      }),
      prisma.salesInvoice.aggregate({
        where: { invoice_date: { gte: thirtyDaysAgo } },
        _sum: { grand_total: true },
      }),
      prisma.repair.aggregate({
        where: { repair_status: 'completed', completion_date: { gte: thirtyDaysAgo } },
        _sum: { actual_cost: true },
      }),
      prisma.crmContact.count({
        where: { NOT: { status: { in: ['won', 'lost'] } } },
      }).catch(() => 0),
    ]);

    const completedRev = Number(completedRevenueRes._sum.actual_cost ?? 0);
    const pendAmount = Number(pendingAmountRes._sum.grand_total ?? 0);
    const inv30 = Number(invoice30DaySum._sum.grand_total ?? 0);
    const rep30 = Number(repair30DaySum._sum.actual_cost ?? 0);

    res.json({
      stats: {
        activeRepairs,
        newRepairs,
        lowStockParts: Number(lowStockCount[0]?.cnt ?? 0),
        customers: totalCustomers,
        completedMonth,
        completedRevenue: completedRev,
        pendingInvoices,
        pendingAmount: pendAmount,
        revenue30Day: inv30 + rep30,
        lowStockItems: Number(lowStockCount[0]?.cnt ?? 0),
        activeLeads,
      },
      repairsByStatus: repairsByStatus.map(r => ({
        status: r.status,
        count: Number(r.count),
      })),
      recentSales: recentSales.map(s => ({
        invoice_id: s.invoice_id,
        invoice_number: s.invoice_number,
        grand_total: Number(s.grand_total),
        created_at: s.created_at,
        customer: s.customer,
      })),
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});