import { prisma } from '../index';
import { TechnicianPerformanceService } from './TechnicianPerformanceService';

export class KPIService {
  private static techPerformanceService = new TechnicianPerformanceService();

  /**
   * Block write operations to guarantee read-only analytics
   */
  static async attemptWrite(): Promise<never> {
    throw new Error('READ_ONLY_ANALYTICS_VIOLATION: Analytics services are strictly read-only.');
  }

  /**
   * Revenue KPI: SalesInvoice grand totals using DB-level aggregate (no full-table load)
   */
  static async getRevenue(from?: Date, to?: Date): Promise<number> {
    const where: any = {
      status: { in: ['issued', 'paid', 'partially_paid'] }
    };
    if (from || to) {
      where.invoice_date = {};
      if (from) where.invoice_date.gte = from;
      if (to) where.invoice_date.lte = to;
    }

    const result = await prisma.salesInvoice.aggregate({
      _sum: { grand_total: true },
      where,
    });
    return Number(result._sum.grand_total ?? 0);
  }

  /**
   * Gross Profit KPI: Revenue minus COGS — both computed at DB level
   */
  static async getGrossProfit(from?: Date, to?: Date): Promise<number> {
    const revenue = await this.getRevenue(from, to);

    // Fetch COGS account (code '5001') ledger debit entries
    const cogsAccount = await prisma.account.findFirst({
      where: { OR: [{ code: '5001' }, { name: 'Cost of Goods Sold' }] },
      select: { account_id: true }
    });
    if (!cogsAccount) return revenue; // Fallback if no COGS account exists

    const where: any = {
      account_id: cogsAccount.account_id,
      entry_type: 'debit'
    };
    if (from || to) {
      where.entry = { entry_date: {} };
      if (from) where.entry.entry_date.gte = from;
      if (to) where.entry.entry_date.lte = to;
    }

    const cogsResult = await prisma.journalEntryLine.aggregate({
      _sum: { amount: true },
      where,
    });
    const cogs = Number(cogsResult._sum.amount ?? 0);

    return revenue - cogs;
  }

  /**
   * Inventory Turnover KPI: COGS / Average Inventory Value — uses DB aggregates
   */
  static async getInventoryTurnover(from?: Date, to?: Date): Promise<number> {
    const cogsAccount = await prisma.account.findFirst({
      where: { OR: [{ code: '5001' }, { name: 'Cost of Goods Sold' }] },
      select: { account_id: true }
    });
    if (!cogsAccount) return 0;

    const where: any = {
      account_id: cogsAccount.account_id,
      entry_type: 'debit'
    };
    if (from || to) {
      where.entry = { entry_date: {} };
      if (from) where.entry.entry_date.gte = from;
      if (to) where.entry.entry_date.lte = to;
    }

    const cogsResult = await prisma.journalEntryLine.aggregate({
      _sum: { amount: true },
      where,
    });
    const cogs = Number(cogsResult._sum.amount ?? 0);

    // Calculate current inventory value using only needed fields (no full-object hydration)
    const partStocks = await prisma.partStock.findMany({
      select: {
        quantity: true,
        part: { select: { cost_price: true } }
      }
    });
    let currentInventoryValue = 0;
    for (const ps of partStocks) {
      currentInventoryValue += Number(ps.quantity) * Number(ps.part.cost_price || 0);
    }

    // Assume opening inventory was 90% of current inventory value to simulate an average
    const averageInventoryValue = currentInventoryValue > 0 ? (currentInventoryValue + currentInventoryValue * 0.9) / 2 : 1;
    return Number((cogs / averageInventoryValue).toFixed(2));
  }

  /**
   * Supplier Performance KPI: DB-level average score from SupplierGovernance
   */
  static async getSupplierPerformance(): Promise<number> {
    const result = await prisma.supplierGovernance.aggregate({
      _avg: { governance_score: true },
      _count: { governance_score: true }
    });
    if (!result._count.governance_score) return 100.0; // Default perfect score
    return Number(Number(result._avg.governance_score ?? 100).toFixed(2));
  }

  /**
   * Technician Performance KPI: Completion rate & Customer ratings
   */
  static async getTechnicianPerformance() {
    const report = await this.techPerformanceService.getTechnicianPerformanceReport();
    if (report.length === 0) {
      return {
        average_completion_rate: 100.0,
        average_customer_rating: 5.0
      };
    }

    const totalCompleted = report.reduce((sum, tech) => sum + tech.jobs_completed, 0);
    const totalAssigned = report.reduce((sum, tech) => sum + tech.jobs_assigned, 0);
    const totalRatingSum = report.reduce((sum, tech) => sum + tech.average_customer_rating, 0);

    const completionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 100;
    const avgRating = totalRatingSum / report.length;

    return {
      average_completion_rate: Number(completionRate.toFixed(2)),
      average_customer_rating: Number(avgRating.toFixed(2))
    };
  }

  /**
   * AMC Renewal Rate KPI: DB-level count queries
   */
  static async getAmcRenewalRate(): Promise<number> {
    const totalContracts = await prisma.amcContract.count();
    if (totalContracts === 0) return 100.0;

    const renewedOrActive = await prisma.amcContract.count({
      where: { status: { in: ['ACTIVE', 'RENEWED'] } }
    });

    return Number(((renewedOrActive / totalContracts) * 100).toFixed(2));
  }

  /**
   * Collection Efficiency KPI: DB groupBy status to avoid loading all invoice rows into memory
   */
  static async getCollectionEfficiency(): Promise<number> {
    const groups = await prisma.salesInvoice.groupBy({
      by: ['status'],
      where: { status: { in: ['issued', 'paid', 'partially_paid'] } },
      _sum: { grand_total: true }
    });

    if (groups.length === 0) return 100.0;

    let totalInvoiced = 0;
    let totalCollected = 0;
    for (const g of groups) {
      const amount = Number(g._sum.grand_total ?? 0);
      totalInvoiced += amount;
      if (g.status === 'paid') {
        totalCollected += amount;
      }
    }

    return totalInvoiced > 0 ? Number(((totalCollected / totalInvoiced) * 100).toFixed(2)) : 100.0;
  }
}
