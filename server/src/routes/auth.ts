import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { body, validationResult } from 'express-validator';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'hisecure-jwt-secret-change-in-production';

authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await prisma.user.update({ where: { user_id: user.user_id }, data: { last_login: new Date() } });
    const token = jwt.sign({ user_id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { user_id: user.user_id, username: user.username, full_name: user.full_name, role: user.role, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

authRouter.post('/register',
  body('username').isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  body('email').isEmail(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { username, email, password, full_name, role } = req.body;
      const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
      if (existing) return res.status(409).json({ error: 'Username or email already exists' });
      const password_hash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { username, email, password_hash, full_name, role: role || 'sales' },
        select: { user_id: true, username: true, email: true, full_name: true, role: true }
      });
      res.status(201).json(user);
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

authRouter.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { user_id: number; role: string };
    const user = await prisma.user.findUnique({
      where: { user_id: decoded.user_id },
      select: { user_id: true, username: true, email: true, full_name: true, role: true, is_active: true, last_login: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});