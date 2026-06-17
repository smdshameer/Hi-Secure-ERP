import { Router } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { ServiceJobService } from '../services/ServiceJobService';
import { PartsConsumptionService } from '../services/PartsConsumptionService';
import { TechnicianPerformanceService } from '../services/TechnicianPerformanceService';

export const serviceRouter = Router();
const jobService = new ServiceJobService();
const consumptionService = new PartsConsumptionService();
const performanceService = new TechnicianPerformanceService();

// ── SERVICE JOBS CRUD ──────────────────────────────────────────────────
serviceRouter.post('/jobs', requirePermission('service:manage'), async (req: AuthRequest, res) => {
  try {
    const job = await jobService.createServiceJob(req.body, req.userId);
    res.status(201).json(job);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

serviceRouter.get('/jobs', requirePermission('service:read'), async (req: AuthRequest, res) => {
  try {
    const list = await jobService.getServiceJobs(req.query as any);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

serviceRouter.get('/jobs/:id', requirePermission('service:read'), async (req: AuthRequest, res) => {
  try {
    const job = await jobService.getServiceJobById(Number(req.params.id));
    if (!job) return res.status(404).json({ error: 'Service Job not found' });
    res.json(job);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── TECHNICIAN ASSIGNMENT ──────────────────────────────────────────────
serviceRouter.post('/jobs/:id/assign', requirePermission('service:manage'), async (req: AuthRequest, res) => {
  try {
    const assignment = await jobService.assignTechnician({
      job_id: Number(req.params.id),
      technician_id: Number(req.body.technician_id),
      scheduled_date: new Date(req.body.scheduled_date)
    }, req.userId);
    res.status(201).json(assignment);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

serviceRouter.post('/assignments/:id/accept', requirePermission('service:manage'), async (req: AuthRequest, res) => {
  try {
    const assignment = await jobService.acceptAssignment(Number(req.params.id), req.userId);
    res.json(assignment);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── SERVICE VISITS ──────────────────────────────────────────────────────
serviceRouter.post('/jobs/:id/visit', requirePermission('service:manage'), async (req: AuthRequest, res) => {
  try {
    const visit = await jobService.scheduleVisit({
      job_id: Number(req.params.id),
      technician_id: Number(req.body.technician_id),
      visit_date: new Date(req.body.visit_date)
    }, req.userId);
    res.status(201).json(visit);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

serviceRouter.post('/visits/:id/execute', requirePermission('service:manage'), async (req: AuthRequest, res) => {
  try {
    const visit = await jobService.executeVisit(
      Number(req.params.id),
      req.body.findings,
      req.body.signature_url,
      req.userId
    );
    res.json(visit);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── PARTS CONSUMPTION ──────────────────────────────────────────────────
serviceRouter.post('/jobs/:id/consume-parts', requirePermission('warehouse:transfer'), async (req: AuthRequest, res) => {
  try {
    const consumption = await consumptionService.consumeParts({
      job_id: Number(req.params.id),
      part_id: Number(req.body.part_id),
      location_id: Number(req.body.location_id),
      quantity: Number(req.body.quantity)
    }, req.userId);
    res.status(201).json(consumption);
  } catch (err: any) {
    if (err.message === 'NEGATIVE_STOCK_PREVENTED' || err.message === 'STOCK_CONFLICT_DETECTED') {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// ── RESOLUTIONS & CLOSURE ──────────────────────────────────────────────
serviceRouter.post('/jobs/:id/resolve', requirePermission('service:manage'), async (req: AuthRequest, res) => {
  try {
    const result = await jobService.resolveJob({
      job_id: Number(req.params.id),
      resolved_by: Number(req.body.resolved_by),
      notes: req.body.notes,
      rating: req.body.rating ? Number(req.body.rating) : undefined,
      first_visit_resolved: req.body.first_visit_resolved
    }, req.userId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── WARRANTY CLAIMS ────────────────────────────────────────────────────
serviceRouter.post('/warranty-claims', requirePermission('service:manage'), async (req: AuthRequest, res) => {
  try {
    const claim = await jobService.createWarrantyClaim(req.body, req.userId);
    res.status(201).json(claim);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── PERFORMANCE METRICS ────────────────────────────────────────────────
serviceRouter.get('/technicians/performance', requirePermission('service:read'), async (_req: AuthRequest, res) => {
  try {
    const report = await performanceService.getTechnicianPerformanceReport();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
