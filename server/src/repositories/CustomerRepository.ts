import { prisma } from '../index';

export class CustomerRepository {
  async findMany(where: any, take: number, tx?: any) {
    const db = tx || prisma;
    return db.customer.findMany({
      where,
      include: {
        _count: { select: { repairs: true, salesInvoices: true } }
      },
      orderBy: { created_at: 'desc' },
      take
    });
  }

  async findById(customerId: number, tx?: any) {
    const db = tx || prisma;
    return db.customer.findUnique({
      where: { customer_id: customerId }
    });
  }

  async create(data: any, tx?: any) {
    const db = tx || prisma;
    return db.customer.create({
      data
    });
  }

  async update(customerId: number, data: any, tx?: any) {
    const db = tx || prisma;
    return db.customer.update({
      where: { customer_id: customerId },
      data
    });
  }

  async delete(customerId: number, tx?: any) {
    const db = tx || prisma;
    return db.customer.delete({
      where: { customer_id: customerId }
    });
  }

  async findDetailById(customerId: number, tx?: any) {
    const db = tx || prisma;
    return db.customer.findUnique({
      where: { customer_id: customerId },
      include: { 
        repairs: { orderBy: { received_date: 'desc' } },
        salesInvoices: { orderBy: { invoice_date: 'desc' } },
        quotations: { orderBy: { quote_date: 'desc' } },
        deliveryChallans: { orderBy: { challan_date: 'desc' } }
      }
    });
  }

  async findByGstin(gstin: string, tx?: any) {
    const db = tx || prisma;
    return db.customer.findFirst({
      where: { gstin: { equals: gstin, mode: 'insensitive' } }
    });
  }
}