import { Router } from 'express';
import { SupplierService } from '../services/SupplierService';
import { requirePermission } from '../middleware/auth';

export const suppliersRouter = Router();
const supplierService = new SupplierService();

suppliersRouter.get('/', async (req, res) => {
  try {
    const suppliers = await supplierService.getSuppliers(req.query);
    res.json(suppliers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

suppliersRouter.get('/:id', async (req, res) => {
  try {
    const supplier = await supplierService.getSupplierById(Number(req.params.id));
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

suppliersRouter.post('/', requirePermission('purchase:create'), async (req, res) => {
  try {
    const supplier = await supplierService.createSupplier(req.body);
    res.status(201).json(supplier);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

suppliersRouter.put('/:id', requirePermission('purchase:create'), async (req, res) => {
  try {
    await supplierService.updateSupplier(Number(req.params.id), req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

suppliersRouter.delete('/:id', requirePermission('purchase:create'), async (req: any, res) => {
  try {
    await supplierService.deleteSupplier(Number(req.params.id), req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});