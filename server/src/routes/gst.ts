import { Router } from 'express';
import { GstService } from '../services/GstService';
import { requirePermission } from '../middleware/auth';
import { prisma } from '../index';

export const gstRouter = Router();

// GET /purchase-register
gstRouter.get('/purchase-register', requirePermission('accounting:view'), async (req, res) => {
  try {
    const data = await GstService.getPurchaseRegister(req.query);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch purchase register' });
  }
});

// GET /sales-register
gstRouter.get('/sales-register', requirePermission('accounting:view'), async (req, res) => {
  try {
    const data = await GstService.getSalesRegister(req.query);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch sales register' });
  }
});

// GET /hsn-summary
gstRouter.get('/hsn-summary', requirePermission('accounting:view'), async (req, res) => {
  try {
    const data = await GstService.getHsnSummary(req.query);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch HSN summary' });
  }
});

// GET /gstr1
gstRouter.get('/gstr1', requirePermission('accounting:view'), async (req, res) => {
  try {
    const data = await GstService.getGstr1(req.query);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch GSTR-1 data' });
  }
});

// GET /gstr3b
gstRouter.get('/gstr3b', requirePermission('accounting:view'), async (req, res) => {
  try {
    const data = await GstService.getGstr3b(req.query);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch GSTR-3B data' });
  }
});

// GET /gstr1/export
gstRouter.get('/gstr1/export', requirePermission('accounting:view'), async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and Year parameters are required.' });
    }

    const m = parseInt(String(month), 10);
    const y = parseInt(String(year), 10);
    const dateFrom = new Date(y, m - 1, 1).toISOString().split('T')[0];
    const dateTo = new Date(y, m, 0).toISOString().split('T')[0];

    const rawGstr1 = await GstService.getGstr1({ dateFrom, dateTo });

    // Fetch company settings for company GSTIN
    const companySetting = await prisma.setting.findUnique({ where: { key: 'company' } });
    const companyObj = companySetting ? (companySetting.value as any) : {};
    const companyGstin = companyObj.gstin || '07AABCH1234R1ZX';

    const fp = `${String(m).padStart(2, '0')}${y}`;

    // Group B2B invoices by customer GSTIN
    const b2bMap: Record<string, any> = {};
    for (const sale of rawGstr1.b2b) {
      const ctin = sale.gstin.toUpperCase().trim();
      if (!b2bMap[ctin]) {
        b2bMap[ctin] = {
          ctin,
          inv: []
        };
      }

      const invVal = sale.total_invoice_value;
      const idt = new Date(sale.invoice_date);
      const formattedDate = `${String(idt.getDate()).padStart(2, '0')}-${String(idt.getMonth() + 1).padStart(2, '0')}-${idt.getFullYear()}`;

      const totalTax = sale.total_tax;
      const rate = sale.taxable_value > 0 ? Math.round((totalTax / sale.taxable_value) * 100) : 18;

      b2bMap[ctin].inv.push({
        inum: sale.invoice_no,
        idt: formattedDate,
        val: Number(invVal.toFixed(2)),
        pos: ctin.substring(0, 2),
        rchrg: 'N',
        inv_ty: 'R',
        itms: [
          {
            num: 1,
            itm_det: {
              rt: Number(rate.toFixed(1)),
              txval: Number(sale.taxable_value.toFixed(2)),
              iamt: Number(sale.igst.toFixed(2)),
              camt: Number(sale.cgst.toFixed(2)),
              samt: Number(sale.sgst.toFixed(2))
            }
          }
        ]
      });
    }

    // Group B2C small invoices
    const b2csMap: Record<string, any> = {};
    for (const sale of rawGstr1.b2c) {
      const stateCode = companyGstin.substring(0, 2) || '33';
      const totalTax = sale.total_tax;
      const rate = sale.taxable_value > 0 ? Math.round((totalTax / sale.taxable_value) * 100) : 18;
      const key = `${stateCode}_${rate}`;

      if (!b2csMap[key]) {
        b2csMap[key] = {
          sply_ty: 'INTRA',
          pos: stateCode,
          rt: rate,
          txval: 0,
          iamt: 0,
          camt: 0,
          samt: 0
        };
      }

      b2csMap[key].txval += sale.taxable_value;
      b2csMap[key].iamt += sale.igst;
      b2csMap[key].camt += sale.cgst;
      b2csMap[key].samt += sale.sgst;
    }

    // HSN summary
    const hsnData = await GstService.getHsnSummary({ dateFrom, dateTo });
    const hsnList = hsnData.map((h, index) => ({
      num: index + 1,
      hsn_sc: h.hsn_sac_code,
      desc: h.description,
      uqc: 'OTH',
      qty: h.count,
      val: Number((h.total_taxable_value + h.total_tax).toFixed(2)),
      txval: Number(h.total_taxable_value.toFixed(2)),
      iamt: Number(h.total_igst.toFixed(2)),
      camt: Number(h.total_cgst.toFixed(2)),
      samt: Number(h.total_sgst.toFixed(2))
    }));

    const finalPayload = {
      gstin: companyGstin,
      fp,
      cur_gt: 0.00,
      gt: 0.00,
      b2b: Object.values(b2bMap),
      b2cs: Object.values(b2csMap).map((item: any) => ({
        ...item,
        txval: Number(item.txval.toFixed(2)),
        iamt: Number(item.iamt.toFixed(2)),
        camt: Number(item.camt.toFixed(2)),
        samt: Number(item.samt.toFixed(2))
      })),
      hsn: {
        data: hsnList
      }
    };

    res.json(finalPayload);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to export GSTR-1 JSON' });
  }
});

