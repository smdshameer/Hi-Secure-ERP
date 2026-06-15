import { Router } from 'express';
import { QuotationService } from '../services/QuotationService';
import { requirePermission, AuthRequest } from '../middleware/auth';

export const quotationsRouter = Router();
const quotationService = new QuotationService();

quotationsRouter.get('/', requirePermission('invoice:view'), async (req, res) => {
  try {
    const quotations = await quotationService.getQuotations(req.query);
    res.json(quotations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch quotations' });
  }
});

quotationsRouter.get('/:id', requirePermission('invoice:view'), async (req, res) => {
  try {
    const quotation = await quotationService.getQuotationById(Number(req.params.id));
    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    res.json(quotation);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quotation' });
  }
});

quotationsRouter.post('/', requirePermission('invoice:create'), async (req: AuthRequest, res) => {
  try {
    const quotation = await quotationService.createQuotation(req.body, req.userId);
    res.status(201).json(quotation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create quotation' });
  }
});

quotationsRouter.put('/:id', requirePermission('invoice:create'), async (req, res) => {
  try {
    await quotationService.updateQuotation(Number(req.params.id), req.body);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update quotation' });
  }
});

quotationsRouter.patch('/:id/status', requirePermission('invoice:create'), async (req, res) => {
  try {
    await quotationService.updateQuotationStatus(Number(req.params.id), String(req.body.status));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

quotationsRouter.post('/:id/convert', requirePermission('invoice:create'), async (req: AuthRequest, res) => {
  try {
    const invoiceId = await quotationService.convertQuotationToInvoice(Number(req.params.id), req.userId);
    res.json({ success: true, invoiceId });
  } catch (err: any) {
    console.error('Convert quote error:', err);
    res.status(err.message.includes('already been converted') ? 400 : 500).json({ error: err.message || 'Failed to convert quotation to invoice' });
  }
});

quotationsRouter.delete('/:id', requirePermission('invoice:create'), async (req, res) => {
  try {
    await quotationService.deleteQuotation(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete quotation' });
  }
});