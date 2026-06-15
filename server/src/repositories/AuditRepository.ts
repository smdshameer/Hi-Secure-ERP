import { prisma } from '../index';

export class AuditRepository {
  async create(data: any, tx?: any) {
    const db = tx || prisma;
    return db.auditLog.create({
      data
    });
  }

  async findMany(where: any = {}, take: number = 100, tx?: any) {
    const db = tx || prisma;
    return db.auditLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take
    });
  }
}
