import { Router } from 'express';
import { PosService } from '../services/PosService';
import { requirePermission } from '../middleware/auth';

export const posRouter = Router();
const posService = new PosService();

// Process POS Checkout
posRouter.post('/checkout', requirePermission('pos:checkout'), async (req, res) => {
  try {
    const result = await posService.checkout(req.body);
    return res.status(201).json({ success: true, invoice: result });
  } catch (err: any) {
    console.error('POS Checkout error:', err);
    const message = err?.message || 'Checkout transaction failed';
    // 409 Conflict for inventory/validation errors, 500 for unexpected failures
    const status = message.includes('Insufficient stock') || message.includes('not found') ? 409 : 500;
    return res.status(status).json({ error: message });
  }
});

posRouter.post('/sessions', requirePermission('pos:checkout'), async (req, res) => {
  try {
    const session = await posService.createSession(
      req.body.counter_id || 'COUNTER-1',
      Number(req.body.opening_cash || 0)
    );
    return res.status(201).json(session);
  } catch (err) {
    console.error('POS create session error:', err);
    return res.status(500).json({ error: 'Failed to start session' });
  }
});

posRouter.get('/sessions/current', requirePermission('pos:checkout'), async (_req, res) => {
  try {
    const session = await posService.getCurrentSession();
    return res.json(session ?? { session_id: null, message: 'No active session' });
  } catch (err: any) {
    if (err.code === 'P2021') return res.json({ session_id: null, message: 'POS not configured' });
    console.error('POS get session error:', err);
    return res.status(500).json({ error: 'Failed to get session' });
  }
});

posRouter.post('/transactions', requirePermission('pos:checkout'), async (req, res) => {
  try {
    const tx = await posService.createTransaction(req.body);
    return res.status(201).json(tx);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create transaction' });
  }
});

posRouter.get('/transactions', requirePermission('pos:checkout'), async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    const txs = await posService.getTransactions(sessionId ? Number(sessionId) : undefined);
    return res.json(txs);
  } catch (err: any) {
    if (err.code === 'P2021') return res.json([]);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});