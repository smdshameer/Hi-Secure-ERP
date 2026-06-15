import { prisma } from '../index';

export class InvoiceRepository {
  async findMany(where: any, take: number, tx?: any) {
    const db = tx || prisma;
    return db.salesInvoice.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true, gstin: true } },
        _count: { select: { items: true } }
      },
      orderBy: { invoice_date: 'desc' },
      take
    });
  }

  async findById(invoiceId: number, tx?: any) {
    const db = tx || prisma;
    return db.salesInvoice.findUnique({
      where: { invoice_id: invoiceId },
      include: {
        customer: true,
        items: {
          include: {
            part: {
              include: {
                brand: { select: { name: true } }
              }
            }
          }
        },
        createdBy: { select: { full_name: true } }
      }
    });
  }

  async create(data: any, tx?: any) {
    const db = tx || prisma;
    return db.salesInvoice.create({
      data
    });
  }

  async update(invoiceId: number, data: any, tx?: any) {
    const db = tx || prisma;
    return db.salesInvoice.update({
      where: { invoice_id: invoiceId },
      data
    });
  }

  async delete(invoiceId: number, tx?: any) {
    const db = tx || prisma;
    return db.salesInvoice.delete({
      where: { invoice_id: invoiceId }
    });
  }
}