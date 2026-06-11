import { Router } from 'express';
import { prisma } from '../index';

export const repairsRouter = Router();

repairsRouter.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = `
      SELECT r.repair_id, r.ticket_number, r.product_type, r.serial_number,
             r.model_number, r.problem_description, r.repair_status,
             r.estimated_cost, r.actual_cost, r.received_date, r.warranty_status, r.notes,
             c.customer_id, c.name as customer_name, c.phone as customer_phone,
             b.brand_id, b.name as brand_name,
             t.technician_id, t.name as technician_name
      FROM repairs r
      LEFT JOIN customers c ON r.customer_id = c.customer_id
      LEFT JOIN brands b ON r.brand_id = b.brand_id
      LEFT JOIN technicians t ON r.assigned_technician_id = t.technician_id
    `;
    
    const params: any[] = [];
    const conditions: string[] = [];

    if (!status || status === 'all') {
      conditions.push(`r.repair_status::text NOT IN ('completed', 'cancelled')`);
    } else {
      params.push(status);
      conditions.push(`r.repair_status::text = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const sIndex = `$${params.length}`;
      conditions.push(`(
        r.ticket_number ILIKE ${sIndex} OR
        r.product_type ILIKE ${sIndex} OR
        r.serial_number ILIKE ${sIndex} OR
        r.model_number ILIKE ${sIndex} OR
        r.problem_description ILIKE ${sIndex} OR
        r.notes ILIKE ${sIndex} OR
        c.name ILIKE ${sIndex} OR
        c.phone ILIKE ${sIndex}
      )`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY r.received_date DESC`;
    const repairs = await prisma.$queryRawUnsafe(sql, ...params);
    const mapped = (repairs as any[]).map(r => ({
      repair_id: r.repair_id, ticket_number: r.ticket_number, product_type: r.product_type,
      serial_number: r.serial_number, model_number: r.model_number,
      problem_description: r.problem_description, repair_status: r.repair_status,
      estimated_cost: r.estimated_cost, actual_cost: r.actual_cost,
      received_date: r.received_date, warranty_status: r.warranty_status, notes: r.notes,
      customer: r.customer_id ? { customer_id: r.customer_id, name: r.customer_name, phone: r.customer_phone } : null,
      brand: r.brand_id ? { brand_id: r.brand_id, name: r.brand_name } : null,
      assigned_technician: r.technician_id ? { technician_id: r.technician_id, name: r.technician_name } : null,
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Get repairs error:', err);
    res.status(500).json({ error: 'Failed to fetch repairs' });
  }
});

repairsRouter.get('/:id', async (req, res) => {
  try {
    const repair = await prisma.repair.findUnique({ where: { repair_id: Number(req.params.id) } });
    if (!repair) return res.status(404).json({ error: 'Repair not found' });
    res.json(repair);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch repair' });
  }
});

repairsRouter.post('/', async (req, res) => {
  try {
    const { customer_id, product_type, brand_id, serial_number, model_number, problem_description, estimated_cost, warranty_status, notes, assigned_technician_id } = req.body;
    const repair = await prisma.repair.create({
      data: {
        customer_id: Number(customer_id),
        product_type,
        brand_id: brand_id ? Number(brand_id) : null,
        serial_number: serial_number || null,
        model_number: model_number || null,
        problem_description,
        estimated_cost: estimated_cost ? Number(estimated_cost) : null,
        warranty_status: warranty_status === 'on',
        notes: notes || null,
        assigned_technician_id: assigned_technician_id ? Number(assigned_technician_id) : null,
      },
      select: { repair_id: true, ticket_number: true },
    });
    res.status(201).json(repair);
  } catch (err) {
    console.error('Create repair error:', err);
    res.status(500).json({ error: 'Failed to create repair' });
  }
});

repairsRouter.put('/:id', async (req, res) => {
  try {
    const { customer_id, product_type, brand_id, serial_number, model_number, problem_description, estimated_cost, warranty_status, notes, assigned_technician_id, actual_cost } = req.body;
    await prisma.repair.update({
      where: { repair_id: Number(req.params.id) },
      data: {
        customer_id: Number(customer_id),
        product_type,
        brand_id: brand_id ? Number(brand_id) : null,
        serial_number: serial_number || null,
        model_number: model_number || null,
        problem_description,
        estimated_cost: estimated_cost ? Number(estimated_cost) : null,
        warranty_status: warranty_status === 'on',
        notes: notes || null,
        assigned_technician_id: assigned_technician_id ? Number(assigned_technician_id) : null,
        actual_cost: actual_cost ? Number(actual_cost) : undefined,
      },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update repair' });
  }
});

repairsRouter.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const data: any = { repair_status: status };
    if (status === 'diagnosed') data.diagnosed_date = new Date();
    if (status === 'in_repair') data.repair_start_date = new Date();
    if (status === 'completed') data.completion_date = new Date();
    if (status === 'ready_for_pickup') data.pickup_date = new Date();
    await prisma.repair.update({ where: { repair_id: Number(req.params.id) }, data });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

repairsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.repair.delete({ where: { repair_id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete repair' });
  }
});

repairsRouter.get('/meta/brands', async (_req, res) => {
  try {
    const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' }, select: { brand_id: true, name: true } });
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

repairsRouter.get('/meta/technicians', async (_req, res) => {
  try {
    const technicians = await prisma.technician.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: { technician_id: true, name: true, specialization: true },
    });
    res.json(technicians);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch technicians' });
  }
});