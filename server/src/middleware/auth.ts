import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { CacheService } from '../services/CacheService';

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is missing.');
}

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
  saasTenantId?: string | null;
  requestId?: string; // Correlation ID placeholder
}

export async function authMiddleware(req: AuthRequest, res: Response, nextFn: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as unknown as { user_id: number; role: string; saasTenantId?: string | null; jti?: string };

    // Revocation Blacklist Check
    if (decoded.jti) {
      const isBlacklisted = await prisma.tokenBlacklist.findUnique({
        where: { token_jti: decoded.jti }
      });
      if (isBlacklisted) {
        return res.status(401).json({ error: 'Token has been revoked' });
      }
    }

    // Periodically clean up expired blacklist records (non-blocking)
    if (Math.random() < 0.05) { // 5% chance on requests to run cleanup
      prisma.tokenBlacklist.deleteMany({
        where: { expires_at: { lt: new Date() } }
      }).catch(err => console.error('Blacklist cleanup error:', err));
    }

    // ─── SaaS Subscription & Grace Period Check ───
    if (decoded.saasTenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: decoded.saasTenantId }
      });

      if (!tenant) {
        return res.status(403).json({ error: 'TENANT_NOT_FOUND', message: 'Tenant company not found.' });
      }

      if (tenant.status === 'SUSPENDED') {
        return res.status(403).json({ error: 'TENANT_SUSPENDED', message: 'Your company account has been suspended by the administrator.' });
      }

      const now = new Date();
      const expiresAt = new Date(tenant.expiresAt);
      const graceExpiresAt = new Date(expiresAt.getTime() + 5 * 24 * 60 * 60 * 1000); // 5-day grace period

      if (now > graceExpiresAt) {
        if (tenant.status !== 'EXPIRED') {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { status: 'EXPIRED' }
          }).catch(() => {});
        }
        return res.status(403).json({
          error: 'SUBSCRIPTION_EXPIRED',
          message: 'Your subscription and the 5-day grace period have expired. Please renew your subscription to regain access. Your data is safe with us.',
          expired: true
        });
      }

      req.saasTenantId = tenant.id;
      (req as any).saasTenant = {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        expiresAt: tenant.expiresAt,
        inGracePeriod: now > expiresAt,
        graceDaysRemaining: Math.max(0, Math.ceil((graceExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
      };

      // Keep active device session alive (non-blocking)
      prisma.activeDevice.updateMany({
        where: { userId: decoded.user_id, tenantId: tenant.id, ipAddress: req.ip || 'Unknown' },
        data: { lastActiveAt: new Date() }
      }).catch(() => {});
    }

    req.userId = decoded.user_id;
    req.userRole = decoded.role;
    nextFn();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

export function requirePermission(permission: string) {
  return async (req: AuthRequest, res: Response, nextFn: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const cacheKey = `user:permissions:${req.userId}`;
      let cachedPermissions = await CacheService.get<string[]>(cacheKey);

      if (!cachedPermissions) {
        const userRoles = await prisma.userRole.findMany({
          where: { user_id: req.userId },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        });

        cachedPermissions = [];
        for (const ur of userRoles) {
          for (const rp of ur.role.permissions) {
            if (rp.permission?.name) {
              cachedPermissions.push(rp.permission.name);
            }
          }
        }

        // Cache user permissions for 5 minutes (300 seconds)
        await CacheService.set(cacheKey, cachedPermissions, 300);
      }

      const hasPermission = cachedPermissions.includes(permission);

      if (!hasPermission) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }

      nextFn();
    } catch (err) {
      console.error('RBAC authorization error:', err);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}
