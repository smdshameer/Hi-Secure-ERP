import { Router } from 'express';
import { prisma } from '../index';

export const partsRouter = Router();

partsRouter.get('/', async (req, res) => {
  try {
    const { search, brand_id } = req.query;
    const where: any = { is_active: true };
    if (search) where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { part_number: { contains: String(search), mode: 'insensitive' } },
      { hsn_code: { contains: String(search), mode: 'insensitive' } },
    ];
    if (brand_id) where.brand_id = Number(brand_id);
    const parts = await prisma.parts.findMany({
      where,
      include: { brand: { select: { brand_id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(parts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch parts' });
  }
});

partsRouter.get('/stats', async (_req, res) => {
  try {
    const allParts = await prisma.parts.findMany({
      where: { is_active: true },
      select: { stock_quantity: true, reorder_level: true },
    });
    const total = allParts.length;
    const outOfStock = allParts.filter(p => p.stock_quantity === 0).length;
    const lowStock = allParts.filter(p => p.stock_quantity > 0 && p.stock_quantity < p.reorder_level).length;
    res.json({ total, lowStock, outOfStock });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

partsRouter.get('/brands', async (_req, res) => {
  try {
    const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' }, select: { brand_id: true, name: true } });
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

partsRouter.get('/:id', async (req, res) => {
  try {
    const part = await prisma.parts.findUnique({
      where: { part_id: Number(req.params.id) },
      include: { brand: { select: { brand_id: true, name: true } } },
    });
    if (!part) return res.status(404).json({ error: 'Part not found' });
    res.json(part);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch part' });
  }
});

partsRouter.post('/', async (req, res) => {
  try {
    const { part_number, name, description, brand_id, hsn_code, cost_price, selling_price, tax_rate, stock_quantity, reorder_level, is_active } = req.body;
    const part = await prisma.parts.create({
      data: {
        part_number,
        name,
        description: description || null,
        brand_id: brand_id ? Number(brand_id) : null,
        hsn_code: hsn_code || null,
        cost_price: cost_price ? Number(cost_price) : 0,
        selling_price: selling_price ? Number(selling_price) : 0,
        tax_rate: tax_rate ? Number(tax_rate) : 0,
        stock_quantity: stock_quantity ? Number(stock_quantity) : 0,
        reorder_level: reorder_level ? Number(reorder_level) : 5,
        is_active: is_active !== false,
      },
      select: { part_id: true, part_number: true, name: true },
    });
    res.status(201).json(part);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create part' });
  }
});

partsRouter.put('/:id', async (req, res) => {
  try {
    const { part_number, name, description, brand_id, hsn_code, cost_price, selling_price, tax_rate, reorder_level, is_active } = req.body;
    await prisma.parts.update({
      where: { part_id: Number(req.params.id) },
      data: { part_number, name, description: description || null, brand_id: brand_id ? Number(brand_id) : null, hsn_code: hsn_code || null, cost_price: cost_price ? Number(cost_price) : 0, selling_price: selling_price ? Number(selling_price) : 0, tax_rate: tax_rate ? Number(tax_rate) : 0, reorder_level: reorder_level ? Number(reorder_level) : 5, is_active },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update part' });
  }
});

partsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.parts.delete({ where: { part_id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete part' });
  }
});

partsRouter.patch('/:id/stock', async (req, res) => {
  try {
    const { quantity_change } = req.body;
    await prisma.parts.update({
      where: { part_id: Number(req.params.id) },
      data: { stock_quantity: { increment: Number(quantity_change) } },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update stock' });
  }
});