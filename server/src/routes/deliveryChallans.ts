import { Router } from 'express';
import { prisma } from '../index';

export const deliveryChallansRouter = Router();

deliveryChallansRouter.get('/', async (req, res) => {
  try {
    const { status, customer_id, search } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (customer_id) where.customer_id = Number(customer_id);
    if (search) {
      where.OR = [
        { challan_number: { contains: String(search), mode: 'insensitive' } },
        { notes: { contains: String(search), mode: 'insensitive' } },
        { customer: { name: { contains: String(search), mode: 'insensitive' } } },
        { customer: { phone: { contains: String(search), mode: 'insensitive' } } },
        { supplier: { name: { contains: String(search), mode: 'insensitive' } } },
        { supplier: { phone: { contains: String(search), mode: 'insensitive' } } },
      ];
    }
    const challans = await prisma.deliveryChallan.findMany({
      where,
      include: { customer: { select: { name: true } }, supplier: { select: { name: true } }, _count: { select: { items: true } } },
      orderBy: { challan_date: 'desc' },
    });
    res.json(challans);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch challans' }); }
});

deliveryChallansRouter.get('/:id', async (req, res) => {
  try {
    const challan = await prisma.deliveryChallan.findUnique({
      where: { delivery_challan_id: Number(req.params.id) },
      include: { customer: true, supplier: true, fromLocation: true, toLocation: true, items: { include: { part: true } } },
    });
    if (!challan) return res.status(404).json({ error: 'Challan not found' });
    res.json(challan);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch challan' }); }
});

deliveryChallansRouter.post('/', async (req, res) => {
  try {
    const { customer_id, supplier_id, from_location_id, to_location_id, challan_date, expected_delivery_date, vehicle_number, driver_name, transporter_name, eway_bill_number, purposes, notes, items } = req.body;
    const challan = await prisma.deliveryChallan.create({
      data: {
        customer_id: customer_id ? Number(customer_id) : null,
        supplier_id: supplier_id ? Number(supplier_id) : null,
        from_location_id: from_location_id ? Number(from_location_id) : null,
        to_location_id: to_location_id ? Number(to_location_id) : null,
        challan_date: challan_date ? new Date(challan_date) : new Date(),
        expected_delivery_date: expected_delivery_date ? new Date(expected_delivery_date) : null,
        vehicle_number, driver_name, transporter_name, eway_bill_number, purposes,
        notes: notes || null,
        items: items?.length ? { create: items.map((i: any) => ({ part_id: Number(i.part_id), quantity: Number(i.quantity), unit_price: i.unit_price ? Number(i.unit_price) : null, batch_number: i.batch_number || null, expiry_date: i.expiry_date ? new Date(i.expiry_date) : null, remarks: i.remarks || null })) } : undefined,
      },
      select: { delivery_challan_id: true, challan_number: true },
    });
    res.status(201).json(challan);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create challan' }); }
});

deliveryChallansRouter.put('/:id', async (req, res) => {
  try {
    const { customer_id, supplier_id, from_location_id, to_location_id, challan_date, expected_delivery_date, vehicle_number, driver_name, transporter_name, eway_bill_number, purposes, status, notes, items } = req.body;
    const challanId = Number(req.params.id);
    
    await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.deliveryChallanItems.deleteMany({ where: { delivery_challan_id: challanId } });
      
      // Update challan header and recreate items
      await tx.deliveryChallan.update({
        where: { delivery_challan_id: challanId },
        data: {
          customer_id: customer_id ? Number(customer_id) : null,
          supplier_id: supplier_id ? Number(supplier_id) : null,
          from_location_id: from_location_id ? Number(from_location_id) : null,
          to_location_id: to_location_id ? Number(to_location_id) : null,
          challan_date: challan_date ? new Date(challan_date) : undefined,
          expected_delivery_date: expected_delivery_date ? new Date(expected_delivery_date) : null,
          vehicle_number, driver_name, transporter_name, eway_bill_number, purposes,
          status,
          notes: notes || null,
          items: items?.length ? {
            create: items.map((i: any) => ({
              part_id: Number(i.part_id),
              quantity: Number(i.quantity),
              unit_price: i.unit_price ? Number(i.unit_price) : null,
              batch_number: i.batch_number || null,
              expiry_date: i.expiry_date ? new Date(i.expiry_date) : null,
              remarks: i.remarks || null
            }))
          } : undefined
        }
      });
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update challan' });
  }
});

deliveryChallansRouter.patch('/:id/status', async (req, res) => {
  try {
    await prisma.deliveryChallan.update({ where: { delivery_challan_id: Number(req.params.id) }, data: { status: String(req.body.status) } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to update status' }); }
});

deliveryChallansRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.deliveryChallan.delete({ where: { delivery_challan_id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete challan' }); }
});