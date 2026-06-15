import { prisma } from '../index';

export class TechnicianRepository {
  async findMany(where: any = {}, orderBy: any = { name: 'asc' }) {
    return prisma.technician.findMany({
      where,
      orderBy
    });
  }

  async findById(techId: number) {
    return prisma.technician.findUnique({
      where: { technician_id: techId }
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
}
