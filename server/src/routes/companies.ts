import { Router } from 'express';
import { CompanyService } from '../services/CompanyService';
import { requirePermission } from '../middleware/auth';

export const companiesRouter = Router();
const companyService = new CompanyService();

companiesRouter.get('/', async (_req, res) => {
  try {
    const companies = await companyService.getCompanies();
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

companiesRouter.post('/', requirePermission('settings:edit'), async (req, res) => {
  try {
    const company = await companyService.createCompany(req.body);
    res.status(201).json(company);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create company' });
  }
});

companiesRouter.put('/:id', requirePermission('settings:edit'), async (req, res) => {
  try {
    await companyService.updateCompany(Number(req.params.id), req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update company' });
  }
});

companiesRouter.delete('/:id', requirePermission('settings:edit'), async (req, res) => {
  try {
    await companyService.deleteCompany(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete company' });
  }
});