import { prisma } from '../index';

export class TechnicianRepository {
  async findMany(where: any = {}, orderBy: any = { name: 'asc' }) {
    const finalWhere = { ...where };
    if (finalWhere.is_deleted === undefined) {
      finalWhere.is_deleted = false;
    }
    return prisma.technician.findMany({
      where: finalWhere,
      orderBy
    });
  }

  async findById(techId: number) {
    return prisma.technician.findFirst({
      where: { technician_id: techId, is_deleted: false }
    });
  }

  async create(data: any) {
    return prisma.technician.create({
      data,
      select: { technician_id: true, name: true }
    });
  }

  async update(techId: number, data: any) {
    return prisma.technician.update({
      where: { technician_id: techId },
      data
    });
  }

  async delete(techId: number, userId?: number) {
    return prisma.technician.update({
      where: { technician_id: techId },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: userId || null
      }
    });
  }
}
