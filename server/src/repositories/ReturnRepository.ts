import { prisma } from '../index';

export class ReturnRepository {
  async createSalesReturn(data: any, tx?: any) {
    const db = tx || prisma;
    return db.salesReturn.create({
      data,
      include: { items: true }
    });
  }

  async findSalesReturns(tx?: any) {
    const db = tx || prisma;
    return db.salesReturn.findMany({
      include: {
        invoice: { select: { invoice_number: true } },
        items: { include: { part: { select: { name: true, part_number: true } } } }
      },
      orderBy: { return_date: 'desc' }
    });
  }

  async findSalesReturnsByInvoice(invoiceId: number, tx?: any) {
    const db = tx || prisma;
    return db.salesReturn.findMany({
      where: { invoice_id: invoiceId },
      include: { items: true }
    });
  }

  async createPurchaseReturn(data: any, tx?: any) {
    const db = tx || prisma;
    return db.purchaseReturn.create({
      data,
      include: { items: true }
    });
  }

  async findPurchaseReturns(tx?: any) {
    const db = tx || prisma;
    return db.purchaseReturn.findMany({
      include: {
        purchaseOrder: { select: { po_number: true } },
        items: { include: { part: { select: { name: true, part_number: true } } } }
      },
      orderBy: { return_date: 'desc' }
    });
  }

  async findPurchaseReturnsByPo(poId: number, tx?: any) {
    const db = tx || prisma;
    return db.purchaseReturn.findMany({
      where: { po_id: poId },
      include: { items: true }
    });
  }
}
