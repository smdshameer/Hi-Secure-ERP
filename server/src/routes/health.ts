import { Router } from 'express';
import { SystemHealthService } from '../services/SystemHealthService';
import { authMiddleware, requireRole } from '../middleware/auth';

export const healthRouter = Router();

// Public Health Check Endpoint (useful for Load Balancers & Uptime monitors)
healthRouter.get('/health', async (_req, res) => {
  try {
    const health = await SystemHealthService.getFullHealth();
    if (health.services.database.status === 'unhealthy') {
      return res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
    }
    res.json({ status: 'healthy', timestamp: health.timestamp });
  } catch (err: any) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// Admin System Health Dashboard (detailed analytics, protected)
healthRouter.get('/admin/system-health', authMiddleware, requireRole('admin'), async (_req, res) => {
  try {
    const health = await SystemHealthService.getFullHealth();
    res.json(health);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});