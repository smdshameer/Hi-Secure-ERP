import { prisma } from '../index';

export class NotificationRepository {
  async create(data: any, tx?: any) {
    const db = tx || prisma;
    return db.notification.create({
      data
    });
  }

  async findMany(where: any, take: number = 50, tx?: any) {
    const db = tx || prisma;
    return db.notification.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take
    });
  }

  async update(notificationId: number, data: any, tx?: any) {
    const db = tx || prisma;
    return db.notification.update({
      where: { notification_id: notificationId },
      data
    });
  }

  async updateMany(where: any, data: any, tx?: any) {
    const db = tx || prisma;
    return db.notification.updateMany({
      where,
      data
    });
  }
}
