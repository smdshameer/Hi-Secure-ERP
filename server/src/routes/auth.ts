import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/UserService';
import { body, validationResult } from 'express-validator';

export const authRouter = Router();
const userService = new UserService();

const JWT_SECRET = process.env.JWT_SECRET || 'hisecure-jwt-secret-change-in-production';

authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await userService.getUserByUsername(username);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await userService.updateLastLogin(user.user_id);
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
      const existing = await userService.checkUserExists(username, email);
      if (existing) return res.status(409).json({ error: 'Username or email already exists' });
      
      const user = await userService.createUser({ username, email, password, full_name, role: role || 'sales' });

      res.status(201).json({
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      });
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
    const user = await userService.getUserById(decoded.user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      last_login: user.last_login
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});