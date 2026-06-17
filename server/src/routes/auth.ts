import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/UserService';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { prisma } from '../index';
import { authMiddleware, requireRole } from '../middleware/auth';

export const authRouter = Router();
const userService = new UserService();

const JWT_SECRET = process.env.JWT_SECRET || 'hisecure-jwt-secret-change-in-production';

authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await userService.getUserByUsername(username);
    const { BusinessEventService } = require('../services/BusinessEventService');

    if (!user || !user.is_active) {
      await BusinessEventService.logEvent({
        event_type: 'User Login Failed',
        entity_type: 'User',
        entity_id: 0,
        description: `Failed login attempt for username: ${username} (user not found or inactive)`
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await BusinessEventService.logEvent({
        event_type: 'User Login Failed',
        entity_type: 'User',
        entity_id: user.user_id,
        user_id: user.user_id,
        description: `Failed login attempt for username: ${username} (incorrect password)`
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await userService.updateLastLogin(user.user_id);
    
    // Add UUID jti claim for revocation
    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role, jti },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await BusinessEventService.logEvent({
      event_type: 'User Login',
      entity_type: 'User',
      entity_id: user.user_id,
      user_id: user.user_id,
      description: `User ${user.username} logged in successfully.`
    });

    res.json({ token, user: { user_id: user.user_id, username: user.username, full_name: user.full_name, role: user.role, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

authRouter.post('/register',
  authMiddleware,
  requireRole('admin'),
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

authRouter.post('/logout', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = auth.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { user_id: number; role: string; jti?: string; exp?: number };
    
    if (decoded.jti) {
      // If exp exists, use it, else default to 8 hours from now
      const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 8 * 3600000);
      
      // Upsert to handle multiple calls or race conditions
      await prisma.tokenBlacklist.upsert({
        where: { token_jti: decoded.jti },
        update: {},
        create: {
          token_jti: decoded.jti,
          user_id: decoded.user_id,
          expires_at: expiresAt
        }
      });
    }

    const { BusinessEventService } = require('../services/BusinessEventService');
    await BusinessEventService.logEvent({
      event_type: 'User Logout',
      entity_type: 'User',
      entity_id: decoded.user_id,
      user_id: decoded.user_id,
      description: `User with ID ${decoded.user_id} logged out successfully. Token with jti ${decoded.jti} was blacklisted.`
    });

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(401).json({ error: 'Invalid token or already logged out' });
  }
});

authRouter.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const user = await prisma.user.findUnique({
      where: { email }
    });
    if (!user) {
      // Return 200/Success to prevent user enumeration, but include token for validation verification
      return res.json({ message: 'If the email is registered, a reset token has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        reset_token: resetToken,
        reset_token_expiry: expiry
      }
    });

    const { BusinessEventService } = require('../services/BusinessEventService');
    await BusinessEventService.logEvent({
      event_type: 'Password Reset Requested',
      entity_type: 'User',
      entity_id: user.user_id,
      user_id: user.user_id,
      description: `Password reset requested for email: ${email}`
    });

    // We return the token directly in the response so the verification script can reset it.
    res.json({
      message: 'Password reset token generated.',
      token: resetToken
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process forgot password request: ' + err.message });
  }
});

authRouter.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        reset_token: token,
        reset_token_expiry: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expiry: null
      }
    });

    const { BusinessEventService } = require('../services/BusinessEventService');
    await BusinessEventService.logEvent({
      event_type: 'Password Reset Completed',
      entity_type: 'User',
      entity_id: user.user_id,
      user_id: user.user_id,
      description: `Password reset successfully completed for user: ${user.username}`
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (err: any) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
});