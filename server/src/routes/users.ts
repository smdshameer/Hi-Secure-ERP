import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../index';

export const usersRouter = Router();
usersRouter.get('/', async (_req, res) => {
  try { res.json(await prisma.user.findMany({ where: { is_active: true }, select: { user_id: true, username: true, email: true, full_name: true, role: true, is_active: true, last_login: true, created_at: true } })); }
  catch (err) { res.status(500).json({ error: 'Failed to fetch users' }); }
});
usersRouter.post('/', async (req, res) => {
  try {
    const { username, email, password, full_name, role, phone } = req.body;
    const password_hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { username, email, password_hash, full_name, role, phone }, select: { user_id: true, username: true, email: true } });
    res.status(201).json(user);
  } catch (err) { res.status(500).json({ error: 'Failed to create user' }); }
});
usersRouter.put('/:id', async (req, res) => {
  try {
    const data: any = { full_name: req.body.full_name, email: req.body.email, role: req.body.role, phone: req.body.phone, is_active: req.body.is_active };
    if (req.body.password) data.password_hash = await bcrypt.hash(req.body.password, 12);
    await prisma.user.update({ where: { user_id: Number(req.params.id) }, data });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to update user' }); }
});
usersRouter.delete('/:id', async (req, res) => {
  try { await prisma.user.update({ where: { user_id: Number(req.params.id) }, data: { is_active: false } }); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Failed to delete user' }); }
});