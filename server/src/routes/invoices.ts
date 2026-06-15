import { Router } from 'express';
import { InvoiceService } from '../services/InvoiceService';
import { requirePermission } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';

export const invoicesRouter = Router();
const invoiceService = new InvoiceService();

invoicesRouter.get('/', requirePermission('invoice:view'), async (req, res) => {
  try {
    const invoices = await invoiceService.getInvoices(req.query);
    res.json(invoices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

invoicesRouter.get('/:id', requirePermission('invoice:view'), async (req, res) => {
  try {
    const invoice = await invoiceService.getInvoiceById(Number(req.params.id));
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

invoicesRouter.post('/', requirePermission('invoice:create'), async (req: AuthRequest, res) => {
  try {
    const invoice = await invoiceService.createInvoice(req.body, req.userId);
    res.status(201).json(invoice);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create invoice' });
  }
});

invoicesRouter.put('/:id', requirePermission('invoice:edit'), async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);
    const invoice = await invoiceService.updateInvoice(invoiceId, req.body);
    res.json(invoice);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to update invoice' });
  }
});

invoicesRouter.patch('/:id/status', requirePermission('invoice:edit'), async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);
    const status = String(req.body.status);
    const invoice = await invoiceService.updateStatus(invoiceId, status);
    res.json(invoice);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to update status' });
  }
});

invoicesRouter.delete('/:id', requirePermission('invoice:delete'), async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);
    await invoiceService.deleteInvoice(invoiceId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete invoice' });
  }
});