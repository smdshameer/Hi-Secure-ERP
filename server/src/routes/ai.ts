import { Router } from 'express';
import { AiService } from '../services/AiService';
import { AuthRequest } from '../middleware/auth';

export const aiRouter = Router();

aiRouter.post('/chat', async (req: AuthRequest, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user context' });
    }
    console.log(`[AiRouter] Received chat query from user ${userId}:`, message);
    const response = await AiService.processChatMessage(message, userId);
    res.json({ response });
  } catch (err: any) {
    console.error('[AiRouter] Error processing message:', err);
    res.status(500).json({ error: err.message || 'Failed to process chat message' });
  }
});