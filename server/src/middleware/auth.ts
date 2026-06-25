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
  requestId?: string; // Correlation ID placeholder
}

export async function authMiddleware(req: AuthRequest, res: Response, nextFn: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as unknown as { user_id: number; role: string; jti?: string };

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
    next();
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
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}
