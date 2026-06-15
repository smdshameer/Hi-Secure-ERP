import { prisma } from '../index';

export class UserRepository {
  async findMany(where: any = {}, tx?: any) {
    const db = tx || prisma;
    return db.user.findMany({
      where,
      select: {
        user_id: true,
        username: true,
        email: true,
        full_name: true,
        role: true,
        is_active: true,
        last_login: true,
        created_at: true,
        phone: true
      }
    });
  }

  async findById(userId: number, tx?: any) {
    const db = tx || prisma;
    return db.user.findUnique({
      where: { user_id: userId }
    });
  }

  async findByUsername(username: string, tx?: any) {
    const db = tx || prisma;
    return db.user.findUnique({
      where: { username }
    });
  }

  async create(data: any, tx?: any) {
    const db = tx || prisma;
    return db.user.create({
      data
    });
  }

  async update(userId: number, data: any, tx?: any) {
    const db = tx || prisma;
    return db.user.update({
      where: { user_id: userId },
      data
    });
  }

  async delete(userId: number, tx?: any) {
    const db = tx || prisma;
    return db.user.delete({
      where: { user_id: userId }
    });
  }

  async linkRole(userId: number, roleId: number, tx?: any) {
    const db = tx || prisma;
    return db.userRole.upsert({
      where: {
        user_id_role_id: { user_id: userId, role_id: roleId }
      },
      create: { user_id: userId, role_id: roleId },
      update: {}
    });
  }

  async clearRoles(userId: number, tx?: any) {
    const db = tx || prisma;
    return db.userRole.deleteMany({
      where: { user_id: userId }
    });
  }

  async findFirst(where: any) {
    return prisma.user.findFirst({
      where
    });
  }
}
