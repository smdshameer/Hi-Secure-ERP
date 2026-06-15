import { prisma } from '../index';

export class RepairRepository {
  async queryRaw(sql: string, params: any[], tx?: any) {
    const db = tx || prisma;
    return db.$queryRawUnsafe(sql, ...params);
  }

  async findById(repairId: number, tx?: any) {
    const db = tx || prisma;
    return db.repair.findUnique({
      where: { repair_id: repairId }
    });
  }

  async create(data: any, tx?: any) {
    const db = tx || prisma;
    return db.repair.create({
      data
    });
  }

  async update(repairId: number, data: any, tx?: any) {
    const db = tx || prisma;
    return db.repair.update({
      where: { repair_id: repairId },
      data
    });
  }

  async delete(repairId: number, tx?: any) {
    const db = tx || prisma;
    return db.repair.delete({
      where: { repair_id: repairId }
    });
  }
}