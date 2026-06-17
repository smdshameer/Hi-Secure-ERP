import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';
import { CustomerPortalService } from '../services/CustomerPortalService';

export const portalRouter = Router();
const portalService = new CustomerPortalService();

// Middleware to resolve customer_id from req.userId and enforce isolation
async function resolveCustomer(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: req.userId }
    });
    if (!user || !user.customer_id) {
      return res.status(403).json({ error: 'Forbidden: Current user is not linked to a Customer account.' });
    }
    (req as any).customerId = user.customer_id;
    next();
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to resolve customer context: ' + err.message });
  }
}

portalRouter.use(resolveCustomer);

// 1. POST /api/v1/portal/complaints
portalRouter.post('/complaints', async (req: AuthRequest, res) => {
  try {
    const customerId = (req as any).customerId;
    const complaint = await portalService.createComplaint(customerId, req.body, req.userId);
    res.status(201).json(complaint);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 2. GET /api/v1/portal/complaints
portalRouter.get('/complaints', async (req: AuthRequest, res) => {
  try {
    const customerId = (req as any).customerId;
    const list = await portalService.getCustomerJobs(customerId);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /api/v1/portal/amc
portalRouter.get('/amc', async (req: AuthRequest, res) => {
  try {
    const customerId = (req as any).customerId;
    const list = await portalService.getCustomerContracts(customerId);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GET /api/v1/portal/invoices
portalRouter.get('/invoices', async (req: AuthRequest, res) => {
  try {
    const customerId = (req as any).customerId;
    const list = await portalService.getCustomerInvoices(customerId);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET /api/v1/portal/payments
portalRouter.get('/payments', async (req: AuthRequest, res) => {
  try {
    const customerId = (req as any).customerId;
    const list = await portalService.getCustomerPayments(customerId);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
