import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../index';
import { EmailService } from '../services/emailService';
import { authMiddleware } from '../middleware/auth';

export const saasRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'hisecure-jwt-secret-change-in-production';

// Helper to generate a clean enterprise-style product key
function generateProductKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = 'HISEC-';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 3) key += '-';
  }
  return key;
}

// Helper middleware to verify global super admin (admin on the root master tenant)
async function requireSuperAdmin(req: any, res: any, next: any) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { user_id: number; role: string };

    const user = await prisma.user.findUnique({ where: { user_id: decoded.user_id } });
    if (!user || user.role !== 'admin' || user.saasTenantId !== null) {
      return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// 1. GENERATE LICENSE KEY & PROVISION TENANT (Super Admin Only)
saasRouter.post('/generate-key', requireSuperAdmin, async (req, res) => {
  try {
    const { companyName, subdomain, plan, durationMonths, email } = req.body;

    if (!companyName || !subdomain || !plan || !durationMonths || !email) {
      return res.status(400).json({ error: 'All fields (companyName, subdomain, plan, durationMonths, email) are required' });
    }

    // Check if subdomain is already taken
    const existing = await prisma.tenant.findUnique({ where: { subdomain } });
    if (existing) {
      return res.status(409).json({ error: 'Subdomain is already registered' });
    }

    const key = generateProductKey();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + parseInt(durationMonths));

    const tenant = await prisma.tenant.create({
      data: {
        name: companyName,
        subdomain: subdomain.toLowerCase(),
        status: 'TRIAL',
        plan: plan.toUpperCase() as any,
        licenseKey: key,
        expiresAt
      }
    });

    // Send email with license activation details
    await EmailService.sendLicenseActivation(email, companyName, subdomain.toLowerCase(), key, expiresAt);

    res.status(201).json({
      message: 'License key generated and activation email sent.',
      tenant
    });
  } catch (err: any) {
    console.error('Generate key error:', err);
    res.status(500).json({ error: 'Failed to generate license key: ' + err.message });
  }
});

// 2. ACTIVATE TENANT & REGISTER ADMIN ACCOUNT (Public / Onboarding)
saasRouter.post('/activate', async (req, res) => {
  try {
    const { licenseKey, username, email, password, full_name } = req.body;

    if (!licenseKey || !username || !email || !password || !full_name) {
      return res.status(400).json({ error: 'All fields (licenseKey, username, email, password, full_name) are required' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { licenseKey } });
    if (!tenant) {
      return res.status(404).json({ error: 'Invalid product key' });
    }

    if (tenant.status === 'ACTIVE') {
      return res.status(400).json({ error: 'This product key has already been activated' });
    }

    if (tenant.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This product key has expired' });
    }

    // Check if username or email is already registered globally
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    });
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email is already taken' });
    }

    // Create the tenant admin user
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password_hash: passwordHash,
        full_name,
        role: 'admin',
        saasTenantId: tenant.id
      }
    });

    // Update tenant status to active
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: 'ACTIVE' }
    });

    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role, saasTenantId: tenant.id, jti },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Activation successful! Your tenant is now active.',
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        saasTenantId: tenant.id
      }
    });
  } catch (err: any) {
    console.error('Activation error:', err);
    res.status(500).json({ error: 'Failed to activate tenant: ' + err.message });
  }
});

// 3. GET ALL TENANTS (Super Admin Only)
saasRouter.get('/tenants', requireSuperAdmin, async (_req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tenants);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch tenants: ' + err.message });
  }
});

// 4. GET ACTIVE DEVICES/SESSIONS (Super Admin Only)
saasRouter.get('/active-devices', requireSuperAdmin, async (_req, res) => {
  try {
    const devices = await prisma.activeDevice.findMany({
      include: {
        user: {
          select: { username: true, full_name: true }
        },
        tenant: {
          select: { name: true, subdomain: true }
        }
      },
      orderBy: { lastActiveAt: 'desc' }
    });
    res.json(devices);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch active devices: ' + err.message });
  }
});
