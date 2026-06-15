import { Router } from 'express';
import { CrmService } from '../services/CrmService';
import { requirePermission } from '../middleware/auth';

export const crmRouter = Router();
const crmService = new CrmService();

crmRouter.get('/', async (req, res) => {
  try {
    const contacts = await crmService.getContacts(req.query);
    res.json(contacts);
  } catch (err: any) {
    if (err.code === 'P2021') return res.json([]);
    res.status(500).json({ error: 'Failed to fetch CRM contacts' });
  }
});

crmRouter.post('/', requirePermission('invoice:create'), async (req, res) => {
  try {
    const contact = await crmService.createContact(req.body);
    res.status(201).json(contact);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

crmRouter.patch('/:id/status', requirePermission('invoice:create'), async (req, res) => {
  try {
    await crmService.updateContactStatus(Number(req.params.id), String(req.body.status));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

crmRouter.put('/:id', requirePermission('invoice:create'), async (req, res) => {
  try {
    await crmService.updateContact(Number(req.params.id), req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

crmRouter.delete('/:id', requirePermission('invoice:create'), async (req, res) => {
  try {
    await crmService.deleteContact(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});