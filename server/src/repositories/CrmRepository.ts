import { prisma } from '../index';

export class CrmRepository {
  async findMany(where: any) {
    return prisma.crmContact.findMany({
      where,
      include: {
        customer: {
          select: {
            name: true,
            phone: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });
  }

  async create(data: any) {
    return prisma.crmContact.create({
      data
    });
  }

  async update(contactId: number, data: any) {
    return prisma.crmContact.update({
      where: { contact_id: contactId },
      data
    });
  }

  async delete(contactId: number) {
    return prisma.crmContact.delete({
      where: { contact_id: contactId }
    });
  }
}
