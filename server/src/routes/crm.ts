import { Router } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { CrmService } from '../services/CrmService';

export const crmRouter = Router();
const crmService = new CrmService();

// ─── LEADS ─────────────────────────────────────────────────────────────────
crmRouter.post('/leads', requirePermission('crm:manage'), async (req: AuthRequest, res) => {
  try {
    const lead = await crmService.createLead(req.body, req.userId);
    res.status(201).json(lead);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

crmRouter.get('/leads', requirePermission('crm:read'), async (req: AuthRequest, res) => {
  try {
    const list = await crmService.getLeads(req.query as any);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

crmRouter.get('/leads/:id', requirePermission('crm:read'), async (req: AuthRequest, res) => {
  try {
    const lead = await crmService.getLeadById(Number(req.params.id));
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

crmRouter.post('/leads/:id/activity', requirePermission('crm:manage'), async (req: AuthRequest, res) => {
  try {
    const activity = await crmService.logLeadActivity({
      lead_id: Number(req.params.id),
      activity_type: req.body.activity_type,
      notes: req.body.notes
    }, req.userId!);
    res.status(201).json(activity);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

crmRouter.post('/leads/:id/convert', requirePermission('crm:manage'), async (req: AuthRequest, res) => {
  try {
    const customer = await crmService.convertLeadToCustomer(Number(req.params.id), req.body, req.userId);
    res.json(customer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── FOLLOW UPS ────────────────────────────────────────────────────────────
crmRouter.post('/follow-ups', requirePermission('crm:manage'), async (req: AuthRequest, res) => {
  try {
    const followup = await crmService.scheduleFollowUp({
      lead_id: req.body.lead_id ? Number(req.body.lead_id) : undefined,
      opportunity_id: req.body.opportunity_id ? Number(req.body.opportunity_id) : undefined,
      scheduled_at: new Date(req.body.scheduled_at),
      notes: req.body.notes,
      assigned_to: Number(req.body.assigned_to)
    }, req.userId);
    res.status(201).json(followup);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

crmRouter.post('/follow-ups/:id/complete', requirePermission('crm:manage'), async (req: AuthRequest, res) => {
  try {
    const updated = await crmService.completeFollowUp(Number(req.params.id), req.body.notes, req.userId);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── OPPORTUNITIES ─────────────────────────────────────────────────────────
crmRouter.post('/opportunities', requirePermission('crm:manage'), async (req: AuthRequest, res) => {
  try {
    const opp = await crmService.createOpportunity({
      lead_id: req.body.lead_id ? Number(req.body.lead_id) : undefined,
      customer_id: req.body.customer_id ? Number(req.body.customer_id) : undefined,
      name: req.body.name,
      estimated_revenue: Number(req.body.estimated_revenue),
      close_date: new Date(req.body.close_date),
      assigned_to: req.body.assigned_to ? Number(req.body.assigned_to) : undefined
    }, req.userId);
    res.status(201).json(opp);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

crmRouter.get('/opportunities', requirePermission('crm:read'), async (req: AuthRequest, res) => {
  try {
    const list = await crmService.getOpportunities(req.query as any);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

crmRouter.post('/opportunities/:id/stage', requirePermission('crm:manage'), async (req: AuthRequest, res) => {
  try {
    const updated = await crmService.updateOpportunityStage(Number(req.params.id), req.body.stage, req.userId);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

crmRouter.post('/opportunities/:id/convert-quote', requirePermission('crm:manage'), async (req: AuthRequest, res) => {
  try {
    const quote = await crmService.convertOpportunityToQuotation(Number(req.params.id), req.body, req.userId!);
    res.status(201).json(quote);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── QUOTATION TRACKING ────────────────────────────────────────────────────
crmRouter.post('/quotations/:quoteId/track', requirePermission('crm:manage'), async (req: AuthRequest, res) => {
  try {
    const tracking = await crmService.trackQuotation({
      quote_id: Number(req.params.quoteId),
      status: req.body.status,
      feedback: req.body.feedback
    }, req.userId);
    res.json(tracking);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});