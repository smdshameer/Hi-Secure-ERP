import { prisma } from '../index';

export class GstService {
  /**
   * Calculate GST based on taxable value, total tax rate, and state rule (same state vs different state).
   */
  static calculateGst(taxableValue: number, totalRate: number, isSameState: boolean) {
    if (isSameState) {
      const halfRate = totalRate / 2;
      const cgstAmount = (taxableValue * halfRate) / 100;
      const sgstAmount = (taxableValue * halfRate) / 100;
      return {
        cgst_rate: halfRate,
        cgst_amount: Number(cgstAmount.toFixed(2)),
        sgst_rate: halfRate,
        sgst_amount: Number(sgstAmount.toFixed(2)),
        igst_rate: 0,
        igst_amount: 0,
        taxable_value: taxableValue
      };
    } else {
      const igstAmount = (taxableValue * totalRate) / 100;
      return {
        cgst_rate: 0,
        cgst_amount: 0,
        sgst_rate: 0,
        sgst_amount: 0,
        igst_rate: totalRate,
        igst_amount: Number(igstAmount.toFixed(2)),
        taxable_value: taxableValue
      };
    }
  }

  /**
   * Log a GST transaction record associated with a journal entry line.
   */
  static async recordGstTransaction(tx: any, data: {
    line_id: number;
    hsn_sac_code?: string;
    taxable_value: number;
    cgst_rate: number;
    cgst_amount: number;
    sgst_rate: number;
    sgst_amount: number;
    igst_rate: number;
    igst_amount: number;
    gstin?: string;
    transaction_type: 'INPUT' | 'OUTPUT';
  }) {
    return tx.gstTransaction.create({
      data: {
        line_id: data.line_id,
        hsn_sac_code: data.hsn_sac_code || null,
        taxable_value: data.taxable_value,
        cgst_rate: data.cgst_rate,
        cgst_amount: data.cgst_amount,
        sgst_rate: data.sgst_rate,
        sgst_amount: data.sgst_amount,
        igst_rate: data.igst_rate,
        igst_amount: data.igst_amount,
        gstin: data.gstin || null,
        transaction_type: data.transaction_type
      }
    });
  }

  /**
   * Retrieve GST Purchase Register (INPUT tax transactions)
   */
  static async getPurchaseRegister(query: { dateFrom?: string; dateTo?: string }) {
    const where: any = { transaction_type: 'INPUT' };

    if (query.dateFrom || query.dateTo) {
      where.line = { entry: { entry_date: {} } };
      if (query.dateFrom) where.line.entry.entry_date.gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const to = new Date(query.dateTo);
        to.setHours(23, 59, 59, 999);
        where.line.entry.entry_date.lte = to;
      }
    }

    const txs = await prisma.gstTransaction.findMany({
      where,
      include: {
        line: {
          include: {
            entry: true,
            account: true
          }
        }
      },
      orderBy: { line: { entry: { entry_date: 'desc' } } }
    });

    return txs.map(tx => ({
      gst_transaction_id: tx.gst_transaction_id,
      line_id: tx.line_id,
      entry_id: tx.line.entry_id,
      entry_date: tx.line.entry.entry_date,
      reference: tx.line.entry.reference_type && tx.line.entry.reference_id 
        ? `${tx.line.entry.reference_type}-${tx.line.entry.reference_id}` 
        : `JE-${tx.line.entry_id}`,
      description: tx.line.entry.description,
      hsn_sac_code: tx.hsn_sac_code,
      taxable_value: Number(tx.taxable_value),
      cgst_rate: Number(tx.cgst_rate),
      cgst_amount: Number(tx.cgst_amount),
      sgst_rate: Number(tx.sgst_rate),
      sgst_amount: Number(tx.sgst_amount),
      igst_rate: Number(tx.igst_rate),
      igst_amount: Number(tx.igst_amount),
      total_tax: Number(tx.cgst_amount) + Number(tx.sgst_amount) + Number(tx.igst_amount),
      gstin: tx.gstin,
      account_name: tx.line.account.name
    }));
  }

  /**
   * Retrieve GST Sales Register (OUTPUT tax transactions)
   */
  static async getSalesRegister(query: { dateFrom?: string; dateTo?: string }) {
    const where: any = { transaction_type: 'OUTPUT' };

    if (query.dateFrom || query.dateTo) {
      where.line = { entry: { entry_date: {} } };
      if (query.dateFrom) where.line.entry.entry_date.gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const to = new Date(query.dateTo);
        to.setHours(23, 59, 59, 999);
        where.line.entry.entry_date.lte = to;
      }
    }

    const txs = await prisma.gstTransaction.findMany({
      where,
      include: {
        line: {
          include: {
            entry: true,
            account: true
          }
        }
      },
      orderBy: { line: { entry: { entry_date: 'desc' } } }
    });

    return txs.map(tx => ({
      gst_transaction_id: tx.gst_transaction_id,
      line_id: tx.line_id,
      entry_id: tx.line.entry_id,
      entry_date: tx.line.entry.entry_date,
      reference: tx.line.entry.reference_type && tx.line.entry.reference_id 
        ? `${tx.line.entry.reference_type}-${tx.line.entry.reference_id}` 
        : `JE-${tx.line.entry_id}`,
      description: tx.line.entry.description,
      hsn_sac_code: tx.hsn_sac_code,
      taxable_value: Number(tx.taxable_value),
      cgst_rate: Number(tx.cgst_rate),
      cgst_amount: Number(tx.cgst_amount),
      sgst_rate: Number(tx.sgst_rate),
      sgst_amount: Number(tx.sgst_amount),
      igst_rate: Number(tx.igst_rate),
      igst_amount: Number(tx.igst_amount),
      total_tax: Number(tx.cgst_amount) + Number(tx.sgst_amount) + Number(tx.igst_amount),
      gstin: tx.gstin,
      account_name: tx.line.account.name
    }));
  }

  /**
   * Retrieve HSN summary dataset
   */
  static async getHsnSummary(query: { dateFrom?: string; dateTo?: string }) {
    const where: any = {};

    if (query.dateFrom || query.dateTo) {
      where.line = { entry: { entry_date: {} } };
      if (query.dateFrom) where.line.entry.entry_date.gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const to = new Date(query.dateTo);
        to.setHours(23, 59, 59, 999);
        where.line.entry.entry_date.lte = to;
      }
    }

    const txs = await prisma.gstTransaction.findMany({
      where,
      include: {
        line: {
          include: {
            entry: true
          }
        }
      }
    });

    const summary: Record<string, {
      hsn_sac_code: string;
      description: string;
      total_taxable_value: number;
      total_cgst: number;
      total_sgst: number;
      total_igst: number;
      total_tax: number;
      count: number;
    }> = {};

    for (const tx of txs) {
      const code = tx.hsn_sac_code || 'N/A';
      if (!summary[code]) {
        summary[code] = {
          hsn_sac_code: code,
          description: code.startsWith('99') ? 'Services (SAC)' : 'Goods (HSN)',
          total_taxable_value: 0,
          total_cgst: 0,
          total_sgst: 0,
          total_igst: 0,
          total_tax: 0,
          count: 0
        };
      }
      const s = summary[code];
      const taxable = Number(tx.taxable_value);
      const cgst = Number(tx.cgst_amount);
      const sgst = Number(tx.sgst_amount);
      const igst = Number(tx.igst_amount);

      s.total_taxable_value += taxable;
      s.total_cgst += cgst;
      s.total_sgst += sgst;
      s.total_igst += igst;
      s.total_tax += cgst + sgst + igst;
      s.count += 1;
    }

    return Object.values(summary);
  }

  /**
   * Retrieve GSTR-1 Dataset (B2B sales and B2C sales summary)
   */
  static async getGstr1(query: { dateFrom?: string; dateTo?: string }) {
    const sales = await this.getSalesRegister(query);

    const b2b: any[] = [];
    const b2c: any[] = [];

    for (const sale of sales) {
      if (sale.gstin && sale.gstin.trim().length === 15) {
        b2b.push({
          gstin: sale.gstin,
          invoice_no: sale.reference,
          invoice_date: sale.entry_date,
          taxable_value: sale.taxable_value,
          cgst: sale.cgst_amount,
          sgst: sale.sgst_amount,
          igst: sale.igst_amount,
          total_tax: sale.total_tax,
          total_invoice_value: sale.taxable_value + sale.total_tax
        });
      } else {
        b2c.push({
          invoice_no: sale.reference,
          invoice_date: sale.entry_date,
          taxable_value: sale.taxable_value,
          cgst: sale.cgst_amount,
          sgst: sale.sgst_amount,
          igst: sale.igst_amount,
          total_tax: sale.total_tax
        });
      }
    }

    return {
      b2b,
      b2c,
      summary: {
        total_b2b_taxable: b2b.reduce((acc, x) => acc + x.taxable_value, 0),
        total_b2b_tax: b2b.reduce((acc, x) => acc + x.total_tax, 0),
        total_b2c_taxable: b2c.reduce((acc, x) => acc + x.taxable_value, 0),
        total_b2c_tax: b2c.reduce((acc, x) => acc + x.total_tax, 0),
      }
    };
  }

  /**
   * Retrieve GSTR-3B Dataset (aggregated output tax and eligible input tax credit)
   */
  static async getGstr3b(query: { dateFrom?: string; dateTo?: string }) {
    const sales = await this.getSalesRegister(query);
    const purchases = await this.getPurchaseRegister(query);

    // Outward taxable supplies
    const outward = {
      taxable_value: sales.reduce((acc, s) => acc + s.taxable_value, 0),
      cgst: sales.reduce((acc, s) => acc + s.cgst_amount, 0),
      sgst: sales.reduce((acc, s) => acc + s.sgst_amount, 0),
      igst: sales.reduce((acc, s) => acc + s.igst_amount, 0),
    };

    // Inward supplies (eligible ITC)
    const itc = {
      taxable_value: purchases.reduce((acc, p) => acc + p.taxable_value, 0),
      cgst: purchases.reduce((acc, p) => acc + p.cgst_amount, 0),
      sgst: purchases.reduce((acc, p) => acc + p.sgst_amount, 0),
      igst: purchases.reduce((acc, p) => acc + p.igst_amount, 0),
    };

    return {
      outward_supplies: outward,
      eligible_itc: itc,
      net_gst_payable: {
        cgst: Math.max(0, outward.cgst - itc.cgst),
        sgst: Math.max(0, outward.sgst - itc.sgst),
        igst: Math.max(0, outward.igst - itc.igst),
      }
    };
  }
}
