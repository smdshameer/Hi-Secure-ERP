import { Router } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { TechnicianMobileService } from '../services/TechnicianMobileService';

export const mobileRouter = Router();
const mobileService = new TechnicianMobileService();

// ─── CHECK IN / OUT ────────────────────────────────────────────────────────
mobileRouter.post('/visits/:id/check-in', requirePermission('service:manage'), async (req: AuthRequest, res) => {
  try {
    const log = await mobileService.logCheckIn({
      visit_id: Number(req.params.id),
      technician_id: Number(req.body.technician_id),
      latitude: Number(req.body.latitude),
      longitude: Number(req.body.longitude)
    }, req.userId);
    res.status(201).json(log);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

mobileRouter.post('/visits/:id/check-out', requirePermission('service:manage'), async (req: AuthRequest, res) => {
  try {
    const log = await mobileService.logCheckOut({
      visit_id: Number(req.params.id),
      technician_id: Number(req.body.technician_id),
      latitude: Number(req.body.latitude),
      longitude: Number(req.body.longitude)
    }, req.userId);
    res.status(201).json(log);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── PHOTOS & SIGNATURES ───────────────────────────────────────────────────
mobileRouter.post('/visits/:id/photos', requirePermission('service:manage'), async (req: AuthRequest, res) => {
  try {
    const attachment = await mobileService.uploadAttachment({
      visit_id: Number(req.params.id),
      file_url: req.body.file_url,
      file_name: req.body.file_name,
      latitude: req.body.latitude ? Number(req.body.latitude) : undefined,
      longitude: req.body.longitude ? Number(req.body.longitude) : undefined
    }, req.userId);
    res.status(201).json(attachment);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

mobileRouter.post('/visits/:id/signature', requirePermission('service:manage'), async (req: AuthRequest, res) => {
  try {
    const visit = await mobileService.captureSignature({
      visit_id: Number(req.params.id),
      findings: req.body.findings,
      signature_url: req.body.signature_url
    }, req.userId);
    res.json(visit);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── PARTS REQUESTS ────────────────────────────────────────────────────────
mobileRouter.post('/jobs/:id/parts-request', requirePermission('service:manage'), async (req: AuthRequest, res) => {
  try {
    const request = await mobileService.createPartsRequest({
      job_id: Number(req.params.id),
      part_id: Number(req.body.part_id),
      location_id: Number(req.body.location_id),
      quantity: Number(req.body.quantity),
      requested_by: Number(req.body.requested_by)
    }, req.userId);
    res.status(201).json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

mobileRouter.post('/parts-requests/:id/approve', requirePermission('service:manage'), async (req: AuthRequest, res) => {
  try {
    const updated = await mobileService.approvePartsRequest(Number(req.params.id), req.userId!);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

mobileRouter.post('/parts-requests/:id/reject', requirePermission('service:manage'), async (req: AuthRequest, res) => {
  try {
    const updated = await mobileService.rejectPartsRequest(Number(req.params.id), req.userId!);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
