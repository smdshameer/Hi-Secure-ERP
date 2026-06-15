import { prisma } from '../index';

export class SettingRepository {
  async findMany(tx?: any) {
    const db = tx || prisma;
    return db.setting.findMany();
  }

  async findByKey(key: string, tx?: any) {
    const db = tx || prisma;
    return db.setting.findUnique({
      where: { key }
    });
  }

  async upsert(key: string, value: any, tx?: any) {
    const db = tx || prisma;
    return db.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value }
    });
  }
}
