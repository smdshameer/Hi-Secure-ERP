import { Router } from 'express';
import { ApprovalService } from '../services/ApprovalService';
import { AuthRequest, requirePermission } from '../middleware/auth';

export const approvalsRouter = Router();

approvalsRouter.use((req, res, next) => {
  if (req.method === 'GET') {
    return requirePermission('approvals:view')(req, res, next);
  } else if (req.method === 'POST') {
    return requirePermission('approvals:approve')(req, res, next);
  } else {
    next();
  }
});
const approvalService = new ApprovalService();

// Get all pending approvals for the currently logged in user (based on their roles)
approvalsRouter.get('/pending', async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
    const pending = await approvalService.getPendingApprovals(req.userId);
    return res.json(pending);
  } catch (err: any) {
    console.error('Fetch pending approvals error:', err);
    return res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

// Submit approval/rejection decision for a workflow step
approvalsRouter.post('/submit', async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
    const { recordId, stepId, status, notes } = req.body;
    
    if (!recordId || !stepId || !status) {
      return res.status(400).json({ error: 'recordId, stepId, and status are required' });
    }

    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'Status must be either approved or rejected' });
    }

    const fullyApproved = await approvalService.submitApproval(
      req.userId,
      Number(recordId),
      Number(stepId),
      status,
      notes
    );

    return res.json({ success: true, fullyApproved });
  } catch (err: any) {
    console.error('Submit approval error:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit approval decision' });
  }
});

// Get approval timeline history for a specific document ID
approvalsRouter.get('/history/:id', async (req, res) => {
  try {
    const history = await approvalService.getWorkflowHistory(Number(req.params.id));
    return res.json(history);
  } catch (err: any) {
    console.error('Fetch approval history error:', err);
    return res.status(500).json({ error: 'Failed to fetch workflow history' });
  }
});