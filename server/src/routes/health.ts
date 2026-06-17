import { Router } from 'express';
import { SystemHealthService } from '../services/SystemHealthService';
import { authMiddleware, requireRole } from '../middleware/auth';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  try {
    const health = await SystemHealthService.getFullHealth();
    const isDbHealthy = health.services.database.status === 'healthy';
    const overallStatus = isDbHealthy ? 'healthy' : 'unhealthy';
    const statusCode = isDbHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: overallStatus,
      timestamp: health.timestamp,
      database: health.services.database,
      telegram: health.services.telegram,
      queue: health.services.queue
    });
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