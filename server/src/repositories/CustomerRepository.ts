import { prisma } from '../index';

export class CustomerRepository {
  async findMany(where: any, take: number, tx?: any) {
    const db = tx || prisma;
    const finalWhere = { ...where };
    if (finalWhere.is_deleted === undefined) {
      finalWhere.is_deleted = false;
    }
    return db.customer.findMany({
      where: finalWhere,
      include: {
        _count: { select: { repairs: true, salesInvoices: true } }
      },
      orderBy: { created_at: 'desc' },
      take
    });
  }

  async findById(customerId: number, tx?: any) {
    const db = tx || prisma;
    return db.customer.findFirst({
      where: { customer_id: customerId, is_deleted: false }
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

  async delete(customerId: number, userId?: number, tx?: any) {
    const db = tx || prisma;
    // Overloaded to support optional userId as transaction context
    const actualTx = typeof userId === 'object' && userId !== null ? userId : tx;
    const actualUserId = typeof userId === 'number' ? userId : null;
    
    return (actualTx || prisma).customer.update({
      where: { customer_id: customerId },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: actualUserId
      }
    });
  }

  async findDetailById(customerId: number, tx?: any) {
    const db = tx || prisma;
    return db.customer.findFirst({
      where: { customer_id: customerId, is_deleted: false },
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
      where: { gstin: { equals: gstin, mode: 'insensitive' }, is_deleted: false }
    });
  }
}