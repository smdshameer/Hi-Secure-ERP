import { prisma } from '../index';

export class AuditService {
  /**
   * Log an action with old and new values to track diffs.
   */
  static async log(
    userId: number | null,
    username: string | null,
    action: string,
    entityType: string,
    entityId: number,
    oldValue: any | null,
    newValue: any | null,
    ipAddress?: string
  ) {
    try {
      // Clean up values (ensure they are serializeable JSON)
      const oldClean = oldValue ? JSON.parse(JSON.stringify(oldValue)) : null;
      const newClean = newValue ? JSON.parse(JSON.stringify(newValue)) : null;

      // Simple diff calculation
      const diff: any = {};
      if (oldClean && newClean) {
        for (const key of Object.keys(newClean)) {
          if (JSON.stringify(oldClean[key]) !== JSON.stringify(newClean[key])) {
            diff[key] = {
              from: oldClean[key],
              to: newClean[key]
            };
          }
        }
      }

      await prisma.auditLog.create({
        data: {
          user_id: userId,
          username: username || null,
          action,
          entity_type: entityType,
          entity_id: entityId,
          old_value: oldClean,
          new_value: newClean,
          details: Object.keys(diff).length > 0 ? diff : null,
          ip_address: ipAddress || null
        }
      });
    } catch (err) {
      console.error('AuditLog error:', err);
    }
  }
}