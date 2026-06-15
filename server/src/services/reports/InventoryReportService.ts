import { prisma } from '../../index';

export class InventoryReportService {
  static async getInventoryValuation() {
    // 1. Fetch parts with their location stock quantities and cost/selling prices
    const parts = await prisma.parts.findMany({
      where: { is_active: true },
      include: {
        stocks: true,
        brand: true
      }
    });

    let totalCostValuation = 0;
    let totalSellingValuation = 0;
    let totalItemsCount = 0;
    const items = [];

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    for (const part of parts) {
      const stockQty = part.stocks.reduce((sum, s) => sum + s.quantity, 0);
      const cost = Number(part.cost_price || 0);
      const selling = Number(part.selling_price || 0);

      const itemCostVal = stockQty * cost;
      const itemSellingVal = stockQty * selling;

      totalCostValuation += itemCostVal;
      totalSellingValuation += itemSellingVal;
      totalItemsCount += stockQty;

      // 2. Fetch last movement date to determine aging
      const lastMovement = await prisma.stockMovement.findFirst({
        where: { partId: part.part_id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      });

      const lastMovementDate = lastMovement ? new Date(lastMovement.createdAt) : new Date(part.created_at);
      let agingCategory = 'Dead Stock'; // Default if older than 90 days
      if (lastMovementDate > thirtyDaysAgo) {
        agingCategory = 'Fast Moving';
      } else if (lastMovementDate > ninetyDaysAgo) {
        agingCategory = 'Slow Moving';
      }

      items.push({
        part_id: part.part_id,
        part_number: part.part_number,
        name: part.name,
        brand: part.brand?.name || '—',
        stock_quantity: stockQty,
        reorder_level: part.reorder_level,
        cost_price: cost,
        selling_price: selling,
        cost_valuation: itemCostVal,
        selling_valuation: itemSellingVal,
        last_movement_date: lastMovementDate,
        aging_category: agingCategory,
        status: stockQty <= 0 ? 'Out of Stock' : stockQty <= part.reorder_level ? 'Low Stock' : 'Healthy'
      });
    }

    const agingSummary = {
      fast_moving_count: items.filter(i => i.aging_category === 'Fast Moving').length,
      slow_moving_count: items.filter(i => i.aging_category === 'Slow Moving').length,
      dead_stock_count: items.filter(i => i.aging_category === 'Dead Stock').length
    };

    return {
      totals: {
        total_parts_catalogued: parts.length,
        total_stock_quantity: totalItemsCount,
        cost_valuation: totalCostValuation,
        selling_valuation: totalSellingValuation,
        potential_profit: totalSellingValuation - totalCostValuation
      },
      aging_summary: agingSummary,
      items
    };
  }
}