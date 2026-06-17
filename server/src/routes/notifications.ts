import { Router } from 'express';
import { NotificationService } from '../services/NotificationService';
import { prisma } from '../index';

export const notificationsRouter = Router();

// GET /api/notifications
notificationsRouter.get('/', async (req, res) => {
  try {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch user's role ID if any
    const userRole = await prisma.userRole.findFirst({
      where: { user_id: userId }
    });
    const roleId = userRole?.role_id;

    const list = await NotificationService.getUserNotifications(userId, roleId);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:id/read
notificationsRouter.put('/:id/read', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await NotificationService.markAsRead(id, userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/notifications/read-all
notificationsRouter.put('/read-all', async (req, res) => {
  try {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const userRole = await prisma.userRole.findFirst({
      where: { user_id: userId }
    });
    const roleId = userRole?.role_id;

    await NotificationService.markAllAsRead(userId, roleId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});