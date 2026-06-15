import { prisma } from '../index';

export class CompanyRepository {
  async findMany(where: any = {}, orderBy: any = { name: 'asc' }) {
    return prisma.company.findMany({
      where,
      orderBy
    });
  }

  async findById(companyId: number) {
    return prisma.company.findUnique({
      where: { company_id: companyId }
    });
  }

  async create(data: any) {
    return prisma.company.create({
      data,
      select: { company_id: true, name: true }
    });
  }

  async update(companyId: number, data: any) {
    return prisma.company.update({
      where: { company_id: companyId },
      data
    });
  }

  async delete(companyId: number) {
    return prisma.company.delete({
      where: { company_id: companyId }
    });
  }
}
