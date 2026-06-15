import { prisma } from '../../index';

export class SalesReportService {
  static async getGstSummary(fromDate?: string, toDate?: string) {
    const whereClause: any = {
      status: { not: 'draft' }
    };

    if (fromDate || toDate) {
      whereClause.invoice_date = {};
      if (fromDate) whereClause.invoice_date.gte = new Date(fromDate);
      if (toDate) whereClause.invoice_date.lte = new Date(toDate);
    }

    const invoices = await prisma.salesInvoice.findMany({
      where: whereClause,
      select: {
        invoice_id: true,
        invoice_number: true,
        invoice_date: true,
        total_amount: true,
        tax_amount: true,
        cgst_amount: true,
        sgst_amount: true,
        igst_amount: true,
        grand_total: true,
        place_of_supply: true,
        tax_type: true
      }
    });

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalGrand = 0;

    const placeOfSupplySummary: Record<string, { taxable: number; tax: number; count: number }> = {};

    invoices.forEach(inv => {
      const taxable = Number(inv.total_amount || 0);
      const cgst = Number(inv.cgst_amount || 0);
      const sgst = Number(inv.sgst_amount || 0);
      const igst = Number(inv.igst_amount || 0);
      const grand = Number(inv.grand_total || 0);

      totalTaxable += taxable;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;
      totalGrand += grand;

      const pos = inv.place_of_supply || 'Unspecified';
      if (!placeOfSupplySummary[pos]) {
        placeOfSupplySummary[pos] = { taxable: 0, tax: 0, count: 0 };
      }
      placeOfSupplySummary[pos].taxable += taxable;
      placeOfSupplySummary[pos].tax += (cgst + sgst + igst);
      placeOfSupplySummary[pos].count += 1;
    });

    return {
      totals: {
        taxable_amount: totalTaxable,
        cgst_amount: totalCgst,
        sgst_amount: totalSgst,
        igst_amount: totalIgst,
        tax_amount: totalCgst + totalSgst + totalIgst,
        grand_total: totalGrand,
        count: invoices.length
      },
      place_of_supply_breakdown: Object.keys(placeOfSupplySummary).map(pos => ({
        place_of_supply: pos,
        taxable_amount: placeOfSupplySummary[pos].taxable,
        tax_amount: placeOfSupplySummary[pos].tax,
        count: placeOfSupplySummary[pos].count
      })),
      invoices: invoices.map(inv => ({
        invoice_id: inv.invoice_id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        taxable_amount: Number(inv.total_amount || 0),
        cgst: Number(inv.cgst_amount || 0),
        sgst: Number(inv.sgst_amount || 0),
        igst: Number(inv.igst_amount || 0),
        grand_total: Number(inv.grand_total || 0),
        place_of_supply: inv.place_of_supply,
        tax_type: inv.tax_type
      }))
    };
  }
}