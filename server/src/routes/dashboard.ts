import { Router } from 'express';
import { prisma } from '../index';
import { KPIService } from '../services/KPIService';
import { AlertService } from '../services/AlertService';
import { BusinessEventService } from '../services/BusinessEventService';
import { performance } from 'perf_hooks';

export const dashboardRouter = Router();

// Helper to measure performance and dispatch warnings if threshold exceeded
async function measurePerformance<T>(name: string, limitMs: number, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const res = await fn();
  const duration = performance.now() - start;
  if (duration > limitMs) {
    console.warn(`[Performance Warning] ${name} execution time: ${duration.toFixed(2)}ms (Limit: ${limitMs}ms)`);
    await BusinessEventService.logEvent({
      event_type: 'PERFORMANCE_WARNING',
      entity_type: 'SystemPerformance',
      entity_id: 0,
      description: `Performance Target Exceeded for ${name}: ${duration.toFixed(2)}ms (Threshold: ${limitMs}ms)`
    }).catch(err => console.error('Failed to log performance warning:', err.message));
  }
  return res;
}

// Original GET /api/dashboard for backward compatibility
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

// GET /api/dashboard/executive
dashboardRouter.get('/executive', async (_req, res) => {
  try {
    const data = await measurePerformance('ExecutiveDashboard', 500, async () => {
      // 1. Daily Sales
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const dailySalesRes = await prisma.salesInvoice.aggregate({
        where: {
          invoice_date: { gte: todayStart },
          status: { in: ['issued', 'paid', 'partially_paid'] }
        },
        _sum: { grand_total: true }
      });
      const dailySales = Number(dailySalesRes._sum.grand_total || 0);

      // 2. Monthly Sales
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthlySalesRes = await prisma.salesInvoice.aggregate({
        where: {
          invoice_date: { gte: monthStart },
          status: { in: ['issued', 'paid', 'partially_paid'] }
        },
        _sum: { grand_total: true }
      });
      const monthlySales = Number(monthlySalesRes._sum.grand_total || 0);

      // 3. Purchase Trends (6 months)
      const purchaseTrends: any[] = await prisma.$queryRaw`
        SELECT TO_CHAR(created_at, 'YYYY-MM') as month_str, SUM(total_amount)::numeric as total
        FROM purchase_orders 
        WHERE status = 'approved' AND created_at >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month_str ASC
      `;

      // 4. Inventory Value
      const partStocks = await prisma.partStock.findMany({ include: { part: true } });
      const inventoryValue = partStocks.reduce((sum, ps) => sum + Number(ps.quantity) * Number(ps.part.cost_price || 0), 0);

      // 5. Outstanding Receivables (issued or partial invoices)
      const receivablesRes = await prisma.salesInvoice.aggregate({
        where: { status: { in: ['issued', 'partially_paid'] } },
        _sum: { grand_total: true }
      });
      const outstandingReceivables = Number(receivablesRes._sum.grand_total || 0);

      // 6. Outstanding Payables (approved POs total)
      const payablesRes = await prisma.purchaseOrder.aggregate({
        where: { status: 'approved' },
        _sum: { total_amount: true }
      });
      const outstandingPayables = Number(payablesRes._sum.total_amount || 0);

      // 7. Service Performance (Completion Rate)
      const totalJobs = await prisma.serviceJob.count();
      const resolvedJobs = await prisma.serviceJob.count({
        where: { status: { in: ['RESOLVED', 'CLOSED'] } }
      });
      const servicePerformance = totalJobs > 0 ? (resolvedJobs / totalJobs) * 100 : 100;

      // 8. AMC Performance (Completion Rate of AMC visits)
      const amcVisits = await prisma.serviceVisit.count({
        where: { job: { job_type: 'AMC' } }
      });
      const completedAmcVisits = await prisma.serviceVisit.count({
        where: {
          job: { job_type: 'AMC' },
          status: 'EXECUTED'
        }
      });
      const amcPerformance = amcVisits > 0 ? (completedAmcVisits / amcVisits) * 100 : 100;

      // 9. Technician Productivity (Average Completed Jobs per tech)
      const totalTechs = await prisma.technician.count({ where: { is_active: true } });
      const totalCompletedJobs = await prisma.technicianAssignment.count({
        where: { status: 'COMPLETED' }
      });
      const technicianProductivity = totalTechs > 0 ? (totalCompletedJobs / totalTechs) : 0;

      return {
        dailySales,
        monthlySales,
        purchaseTrends: purchaseTrends.map(p => ({
          month: p.month_str,
          total: Number(p.total)
        })),
        inventoryValue,
        outstandingReceivables,
        outstandingPayables,
        servicePerformance: Number(servicePerformance.toFixed(1)),
        amcPerformance: Number(amcPerformance.toFixed(1)),
        technicianProductivity: Number(technicianProductivity.toFixed(2))
      };
    });

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/kpis
dashboardRouter.get('/kpis', async (_req, res) => {
  try {
    const data = await measurePerformance('KpiDashboard', 500, async () => {
      const [
        revenue,
        grossProfit,
        inventoryTurnover,
        supplierPerformance,
        techPerformance,
        amcRenewalRate,
        collectionEfficiency
      ] = await Promise.all([
        KPIService.getRevenue(),
        KPIService.getGrossProfit(),
        KPIService.getInventoryTurnover(),
        KPIService.getSupplierPerformance(),
        KPIService.getTechnicianPerformance(),
        KPIService.getAmcRenewalRate(),
        KPIService.getCollectionEfficiency()
      ]);

      return {
        revenue,
        grossProfit,
        inventoryTurnover,
        supplierPerformance,
        technicianPerformance: techPerformance,
        amcRenewalRate,
        collectionEfficiency
      };
    });

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/alerts
dashboardRouter.get('/alerts', async (_req, res) => {
  try {
    const data = await measurePerformance('AlertDashboard', 300, async () => {
      return AlertService.getAllAlerts();
    });

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});