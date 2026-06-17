import { prisma } from '../index';

export interface AlertDetail {
  id: string; // rule/entity combination ID
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  entity_type: string;
  entity_id: number;
  message: string;
  details?: any;
}

export class AlertService {
  /**
   * Block write operations to guarantee read-only analytics
   */
  static async attemptWrite(): Promise<never> {
    throw new Error('READ_ONLY_ANALYTICS_VIOLATION: Analytics services are strictly read-only.');
  }

  /**
   * Negative Margin: Invoiced items sold below cost price
   */
  static async getNegativeMarginAlerts(): Promise<AlertDetail[]> {
    const invoiceItems = await prisma.salesInvoiceItems.findMany({
      include: {
        part: true,
        invoice: {
          include: {
            customer: true
          }
        }
      }
    });

    const alerts: AlertDetail[] = [];
    for (const item of invoiceItems) {
      const unitPrice = Number(item.unit_price);
      const costPrice = Number(item.part.cost_price || 0);
      if (unitPrice < costPrice) {
        alerts.push({
          id: `NEG-MARGIN-ITEM-${item.item_id}`,
          type: 'NEGATIVE_MARGIN',
          severity: 'high',
          entity_type: 'SalesInvoiceItem',
          entity_id: item.item_id,
          message: `Part ${item.part.part_number} (${item.part.name}) sold in Invoice ${item.invoice.invoice_number || 'draft'} at ₹${unitPrice.toFixed(2)} (Cost: ₹${costPrice.toFixed(2)}). Margin is negative.`,
          details: {
            part_number: item.part.part_number,
            unit_price: unitPrice,
            cost_price: costPrice,
            loss_per_unit: costPrice - unitPrice,
            invoice_number: item.invoice.invoice_number || 'draft'
          }
        });
      }
    }
    return alerts;
  }

  /**
   * Inventory Aging: Stock lines with no movement > 90 days
   */
  static async getInventoryAgingAlerts(): Promise<AlertDetail[]> {
    const partStocks = await prisma.partStock.findMany({
      where: { quantity: { gt: 0 } },
      include: { part: true, location: true }
    });

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const alerts: AlertDetail[] = [];
    for (const ps of partStocks) {
      // Find the last stock movement for this part and location
      const lastMovement = await prisma.stockMovement.findFirst({
        where: { partId: ps.part_id, locationId: ps.location_id },
        orderBy: { createdAt: 'desc' }
      });

      const lastDate = lastMovement ? lastMovement.createdAt : ps.part.created_at;
      if (lastDate < ninetyDaysAgo) {
        const ageDays = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          id: `INV-AGING-PART-${ps.part_id}-LOC-${ps.location_id}`,
          type: 'INVENTORY_AGING',
          severity: ageDays > 180 ? 'high' : 'medium',
          entity_type: 'PartStock',
          entity_id: ps.part_id,
          message: `Part ${ps.part.part_number} has been sitting in ${ps.location.name} for ${ageDays} days with quantity ${ps.quantity}.`,
          details: {
            part_number: ps.part.part_number,
            location_name: ps.location.name,
            quantity: ps.quantity,
            age_days: ageDays,
            last_activity_date: lastDate.toISOString()
          }
        });
      }
    }
    return alerts;
  }

  /**
   * Dead Stock: Stock with zero movement in the last 180 days
   */
  static async getDeadStockAlerts(): Promise<AlertDetail[]> {
    const partStocks = await prisma.partStock.findMany({
      where: { quantity: { gt: 0 } },
      include: { part: true, location: true }
    });

    const oneEightyDaysAgo = new Date();
    oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);

    const alerts: AlertDetail[] = [];
    for (const ps of partStocks) {
      const movementCount = await prisma.stockMovement.count({
        where: {
          partId: ps.part_id,
          locationId: ps.location_id,
          createdAt: { gte: oneEightyDaysAgo }
        }
      });

      if (movementCount === 0) {
        alerts.push({
          id: `DEAD-STOCK-PART-${ps.part_id}-LOC-${ps.location_id}`,
          type: 'DEAD_STOCK',
          severity: 'high',
          entity_type: 'PartStock',
          entity_id: ps.part_id,
          message: `Dead stock detected: Part ${ps.part.part_number} in ${ps.location.name} has had zero movements in the last 180 days.`,
          details: {
            part_number: ps.part.part_number,
            location_name: ps.location.name,
            quantity: ps.quantity
          }
        });
      }
    }
    return alerts;
  }

  /**
   * Overdue Receivables: Sales invoices past due date that are unpaid
   */
  static async getOverdueReceivables(): Promise<AlertDetail[]> {
    const overdueInvoices = await prisma.salesInvoice.findMany({
      where: {
        status: { in: ['issued', 'partially_paid'] },
        invoice_date: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // past 30 days
      },
      include: { customer: true }
    });

    return overdueInvoices.map(inv => {
      const ageDays = Math.floor((Date.now() - inv.invoice_date.getTime()) / (1000 * 60 * 60 * 24));
      const customerName = inv.customer?.name || 'Unknown Customer';
      return {
        id: `OVERDUE-REC-INV-${inv.invoice_id}`,
        type: 'OVERDUE_RECEIVABLE',
        severity: ageDays > 60 ? 'critical' : 'high',
        entity_type: 'SalesInvoice',
        entity_id: inv.invoice_id,
        message: `Invoice ${inv.invoice_number || 'draft'} for customer ${customerName} is overdue by ${ageDays} days (Amount: ₹${Number(inv.grand_total).toFixed(2)}).`,
        details: {
          invoice_number: inv.invoice_number || 'draft',
          customer_name: customerName,
          amount: Number(inv.grand_total),
          age_days: ageDays
        }
      };
    });
  }

  /**
   * Overdue Payables: Approved purchase orders/bills that are unpaid past 30 days
   */
  static async getOverduePayables(): Promise<AlertDetail[]> {
    const overduePos = await prisma.purchaseOrder.findMany({
      where: {
        status: 'approved',
        created_at: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      include: { supplier: true }
    });

    return overduePos.map(po => {
      const ageDays = Math.floor((Date.now() - po.created_at.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: `OVERDUE-PAY-PO-${po.po_id}`,
        type: 'OVERDUE_PAYABLE',
        severity: ageDays > 60 ? 'high' : 'medium',
        entity_type: 'PurchaseOrder',
        entity_id: po.po_id,
        message: `Purchase Order ${po.po_number} to supplier ${po.supplier.name} is pending payment for ${ageDays} days (Amount: ₹${Number(po.total_amount).toFixed(2)}).`,
        details: {
          po_number: po.po_number,
          supplier_name: po.supplier.name,
          amount: Number(po.total_amount),
          age_days: ageDays
        }
      };
    });
  }

  /**
   * SLA Breach: Service jobs exceeding SLA threshold limits
   */
  static async getSlaBreachAlerts(): Promise<AlertDetail[]> {
    // SLA thresholds in hours based on priority
    const SLA_THRESHOLDS: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 24,
      NORMAL: 48,
      LOW: 72
    };

    const activeJobs = await prisma.serviceJob.findMany({
      where: { NOT: { status: { in: ['RESOLVED', 'CLOSED'] } } },
      include: { customer: true }
    });

    const alerts: AlertDetail[] = [];
    for (const job of activeJobs) {
      const limitHours = SLA_THRESHOLDS[job.priority.toUpperCase()] || 48;
      const ageHours = (Date.now() - job.created_at.getTime()) / (1000 * 60 * 60);

      if (ageHours > limitHours) {
        alerts.push({
          id: `SLA-BREACH-JOB-${job.job_id}`,
          type: 'SLA_BREACH',
          severity: job.priority.toUpperCase() === 'CRITICAL' ? 'critical' : 'high',
          entity_type: 'ServiceJob',
          entity_id: job.job_id,
          message: `Service Job ${job.job_number} (Priority: ${job.priority}) has breached SLA limit of ${limitHours} hours. Currently open for ${ageHours.toFixed(1)} hours.`,
          details: {
            job_number: job.job_number,
            customer_name: job.customer.name,
            priority: job.priority,
            limit_hours: limitHours,
            age_hours: Number(ageHours.toFixed(1))
          }
        });
      }
    }
    return alerts;
  }

  /**
   * Get combined list of all business risk alerts
   */
  static async getAllAlerts(): Promise<AlertDetail[]> {
    const [negMargins, invAgings, deadStocks, overdueRecs, overduePays, slaBreaches] = await Promise.all([
      this.getNegativeMarginAlerts(),
      this.getInventoryAgingAlerts(),
      this.getDeadStockAlerts(),
      this.getOverdueReceivables(),
      this.getOverduePayables(),
      this.getSlaBreachAlerts()
    ]);

    return [
      ...negMargins,
      ...invAgings,
      ...deadStocks,
      ...overdueRecs,
      ...overduePays,
      ...slaBreaches
    ];
  }
}
