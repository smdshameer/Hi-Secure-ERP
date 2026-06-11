import { Router } from 'express';
import { prisma } from '../index';

export const suppliersRouter = Router();

suppliersRouter.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const where: any = {};
    if (search) where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { phone: { contains: String(search), mode: 'insensitive' } },
      { gstin: { contains: String(search), mode: 'insensitive' } },
    ];
    const suppliers = await prisma.supplier.findMany({ where, orderBy: { name: 'asc' } });
    res.json(suppliers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

suppliersRouter.get('/:id', async (req, res) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { supplier_id: Number(req.params.id) },
      include: {
        purchaseOrders: { take: 10, orderBy: { order_date: 'desc' } },
        deliveryChallansSupplier: { take: 10, orderBy: { challan_date: 'desc' } }
      },
    });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

suppliersRouter.post('/', async (req, res) => {
  try {
    const { name, contact_person, phone, email, gstin, pan, address, city, state, pincode } = req.body;
    const supplier = await prisma.supplier.create({
      data: {
        supplier_code: `SUP-${Date.now()}`,
        name,
        contact_person: contact_person || null,
        phone: phone || null,
        email: email || null,
        gstin: gstin || null,
        pan: pan || null,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
      },
      select: { supplier_id: true, supplier_code: true },
    });
    res.status(201).json(supplier);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

suppliersRouter.put('/:id', async (req, res) => {
  try {
    const { name, contact_person, phone, email, gstin, pan, address, city, state, pincode, is_active } = req.body;
    await prisma.supplier.update({
      where: { supplier_id: Number(req.params.id) },
      data: { name, contact_person: contact_person || null, phone: phone || null, email: email || null, gstin: gstin || null, pan: pan || null, address: address || null, city: city || null, state: state || null, pincode: pincode || null, is_active },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

suppliersRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.supplier.delete({ where: { supplier_id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});