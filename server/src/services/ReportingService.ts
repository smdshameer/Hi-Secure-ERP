import { prisma } from '../index';
import { KPIService } from './KPIService';
import { AlertService } from './AlertService';
import PDFDocument from 'pdfkit';
import XLSX from 'xlsx';

export class ReportingService {
  /**
   * Block write operations to guarantee read-only analytics
   */
  static async attemptWrite(): Promise<never> {
    throw new Error('READ_ONLY_ANALYTICS_VIOLATION: Analytics services are strictly read-only.');
  }

  /**
   * Helper to retrieve report data — only loads metrics required for the requested type
   */
  private static async getReportData(type: 'executive' | 'operational' | 'financial' | 'service') {
    if (type === 'executive') {
      // Executive: all revenue/profit/renewal/collection KPIs
      const [revenue, gp, turnover, renewalRate, colEfficiency, alerts] = await Promise.all([
        KPIService.getRevenue(),
        KPIService.getGrossProfit(),
        KPIService.getInventoryTurnover(),
        KPIService.getAmcRenewalRate(),
        KPIService.getCollectionEfficiency(),
        AlertService.getAllAlerts(),
      ]);
      return [
        { Metric: 'Total Revenue',         Value: `₹${revenue.toFixed(2)}` },
        { Metric: 'Gross Profit',          Value: `₹${gp.toFixed(2)}` },
        { Metric: 'Inventory Turnover',    Value: String(turnover) },
        { Metric: 'AMC Renewal Rate',      Value: `${renewalRate.toFixed(1)}%` },
        { Metric: 'Collection Efficiency', Value: `${colEfficiency.toFixed(1)}%` },
        { Metric: 'Active Alerts',         Value: String(alerts.length) },
      ];

    } else if (type === 'operational') {
      // Operational: warehouse counts and service job counts only
      const [totalQty, activeJobs, resolvedJobs, activeAmc, totalParts] = await Promise.all([
        prisma.partStock.aggregate({ _sum: { quantity: true } }),
        prisma.serviceJob.count({ where: { status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
        prisma.serviceJob.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
        prisma.amcContract.count({ where: { status: 'ACTIVE' } }),
        prisma.parts.count({ where: { is_active: true } }),
      ]);
      const totalJobs = activeJobs + resolvedJobs;
      return [
        { Metric: 'Total Warehoused Quantity', Value: `${Number(totalQty._sum.quantity ?? 0)} units` },
        { Metric: 'Active Service Jobs',        Value: String(activeJobs) },
        { Metric: 'Total Service Requests',     Value: String(totalJobs) },
        { Metric: 'Total Active AMC Contracts', Value: String(activeAmc) },
        { Metric: 'Total Part Types',           Value: String(totalParts) },
      ];

    } else if (type === 'financial') {
      // Financial: revenue, COGS, margin, receivables
      const [revenue, gp, overdueReceivables] = await Promise.all([
        KPIService.getRevenue(),
        KPIService.getGrossProfit(),
        AlertService.getOverdueReceivables(),
      ]);
      const cogs = revenue - gp;
      const margin = revenue > 0 ? ((gp / revenue) * 100).toFixed(1) : '100.0';
      const outstandingTotal = overdueReceivables.reduce((sum, a) => sum + a.details.amount, 0);
      return [
        { Metric: 'Sales Revenue',            Value: `₹${revenue.toFixed(2)}` },
        { Metric: 'Cost of Goods Sold',       Value: `₹${cogs.toFixed(2)}` },
        { Metric: 'Gross Profit Margin',      Value: `${margin}%` },
        { Metric: 'Outstanding Receivables',  Value: `₹${outstandingTotal.toFixed(2)}` },
      ];

    } else {
      // Service: service job counts and warranty claims
      const [totalJobs, resolvedJobs, warrantyClaims] = await Promise.all([
        prisma.serviceJob.count(),
        prisma.serviceJob.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
        prisma.warrantyClaim.count(),
      ]);
      const completionRate = totalJobs > 0 ? (resolvedJobs / totalJobs) * 100 : 100;
      return [
        { Metric: 'Total Service Requests', Value: String(totalJobs) },
        { Metric: 'Resolved Requests',      Value: String(resolvedJobs) },
        { Metric: 'SLA Compliance Rate',    Value: `${completionRate.toFixed(1)}%` },
        { Metric: 'Total Warranty Claims',  Value: String(warrantyClaims) },
      ];
    }
  }

  /**
   * Generates a PDF Report Buffer
   */
  static async generatePDFReport(type: 'executive' | 'operational' | 'financial' | 'service'): Promise<Buffer> {
    const rows = await this.getReportData(type);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Title Header
        doc.fontSize(20).text(`HiSecure ERP — ${type.toUpperCase()} REPORT`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Generated Date: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown(2);

        // Draw Table
        doc.fontSize(12).text('Report Details:', { underline: true });
        doc.moveDown();

        for (const row of rows) {
          doc.fontSize(10).text(`${row.Metric}:`, { stroke: false, continued: true });
          doc.text(` ${row.Value}`, { stroke: false });
          doc.moveDown(0.5);
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates an Excel Report Buffer
   */
  static async generateExcelReport(type: 'executive' | 'operational' | 'financial' | 'service'): Promise<Buffer> {
    const rows = await this.getReportData(type);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
