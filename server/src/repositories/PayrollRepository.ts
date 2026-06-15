import { prisma } from '../index';

export class PayrollRepository {
  async findMany() {
    return prisma.payrollEntry.findMany({
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });
  }

  async findById(entryId: number) {
    return prisma.payrollEntry.findUnique({
      where: { entry_id: entryId }
    });
  }

  async create(data: any) {
    return prisma.payrollEntry.create({
      data
    });
  }

  async update(entryId: number, data: any) {
    return prisma.payrollEntry.update({
      where: { entry_id: entryId },
      data
    });
  }

  async delete(entryId: number) {
    return prisma.payrollEntry.delete({
      where: { entry_id: entryId }
    });
  }
}
