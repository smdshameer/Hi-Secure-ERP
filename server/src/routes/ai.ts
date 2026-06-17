import { Router } from 'express';
import { AiService } from '../services/AiService';
import { AiUsageService } from '../services/AiUsageService';
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

    // Check limits
    const limitCheck = await AiUsageService.checkLimits(userId);
    if (!limitCheck.allowed) {
      return res.status(429).json({ error: limitCheck.reason || 'AI request limit reached.' });
    }

    console.log(`[AiRouter] Received chat query from user ${userId}:`, message);
    const tokenRef = { tokens: 0 };
    const response = await AiService.processChatMessage(message, userId, tokenRef);
    
    // Log AI token usage
    await AiUsageService.logUsage(userId, tokenRef.tokens);

    res.json({ response });
  } catch (err: any) {
    console.error('[AiRouter] Error processing message:', err);
    res.status(500).json({ error: err.message || 'Failed to process chat message' });
  }
});