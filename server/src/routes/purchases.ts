import { Router } from 'express';
import { prisma } from '../index';

export const purchasesRouter = Router();

purchasesRouter.get('/', async (req, res) => {
  try {
    const { status, supplier_id, search } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (supplier_id) where.supplier_id = Number(supplier_id);
    if (search) {
      where.OR = [
        { po_number: { contains: String(search), mode: 'insensitive' } },
        { notes: { contains: String(search), mode: 'insensitive' } },
        { supplier: { name: { contains: String(search), mode: 'insensitive' } } },
        { supplier: { phone: { contains: String(search), mode: 'insensitive' } } },
      ];
    }
    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: { supplier: { select: { name: true, phone: true } }, _count: { select: { items: true } } },
      orderBy: { order_date: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

purchasesRouter.get('/:id', async (req, res) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { po_id: Number(req.params.id) },
      include: { supplier: true, items: { include: { part: true } }, createdBy: { select: { full_name: true } } },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
});

purchasesRouter.post('/', async (req, res) => {
  try {
    const { supplier_id, order_date, expected_delivery, notes, items } = req.body;
    const order = await prisma.purchaseOrder.create({
      data: {
        supplier_id: Number(supplier_id),
        order_date: order_date ? new Date(order_date) : new Date(),
        expected_delivery: expected_delivery ? new Date(expected_delivery) : null,
        notes: notes || null,
        items: items?.length ? { create: items.map((i: any) => ({ part_id: Number(i.part_id), quantity: Number(i.quantity), unit_price: Number(i.unit_price), total_amount: Number(i.quantity) * Number(i.unit_price), batch_number: i.batch_number || null, expiration_date: i.expiration_date ? new Date(i.expiration_date) : null })) } : undefined,
      },
      select: { po_id: true, po_number: true, total_amount: true },
    });
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
});

purchasesRouter.put('/:id', async (req, res) => {
  try {
    const { supplier_id, order_date, expected_delivery, status, notes, items } = req.body;
    const poId = Number(req.params.id);
    
    await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.purchaseOrderItems.deleteMany({ where: { po_id: poId } });
      
      // Update PO and recreate items
      await tx.purchaseOrder.update({
        where: { po_id: poId },
        data: {
          supplier_id: Number(supplier_id),
          order_date: order_date ? new Date(order_date) : undefined,
          expected_delivery: expected_delivery ? new Date(expected_delivery) : null,
          status,
          notes: notes || null,
          items: items?.length ? {
            create: items.map((i: any) => ({
              part_id: Number(i.part_id),
              quantity: Number(i.quantity),
              unit_price: Number(i.unit_price),
              total_amount: Number(i.quantity) * Number(i.unit_price),
              batch_number: i.batch_number || null,
              expiration_date: i.expiration_date ? new Date(i.expiration_date) : null
            }))
          } : undefined
        }
      });
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
});

purchasesRouter.patch('/:id/status', async (req, res) => {
  try {
    await prisma.purchaseOrder.update({ where: { po_id: Number(req.params.id) }, data: { status: String(req.body.status) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

purchasesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.purchaseOrder.delete({ where: { po_id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete purchase order' });
  }
});