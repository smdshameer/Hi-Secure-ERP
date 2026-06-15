import { prisma } from '../index';

export class RepairEventRepository {
  async create(data: any, tx?: any) {
    const db = tx || prisma;
    return db.repairEvent.create({
      data
    });
  }

  async findMany(repairId: number, tx?: any) {
    const db = tx || prisma;
    return db.repairEvent.findMany({
      where: { repair_id: repairId },
      orderBy: { created_at: 'asc' }
    });
  }
}
