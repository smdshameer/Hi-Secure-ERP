import { prisma } from '../index';

export class PurchaseRepository {
  async findMany(where: any, tx?: any) {
    const db = tx || prisma;
    return db.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { name: true, phone: true } },
        _count: { select: { items: true } }
      },
      orderBy: { order_date: 'desc' }
    });
  }

  async findById(poId: number, tx?: any) {
    const db = tx || prisma;
    return db.purchaseOrder.findUnique({
      where: { po_id: poId },
      include: {
        supplier: true,
        items: { include: { part: true } },
        createdBy: { select: { full_name: true } }
      }
    });
  }

  async create(data: any, tx?: any) {
    const db = tx || prisma;
    return db.purchaseOrder.create({
      data
    });
  }

  async update(poId: number, data: any, tx?: any) {
    const db = tx || prisma;
    return db.purchaseOrder.update({
      where: { po_id: poId },
      data
    });
  }

  async delete(poId: number, tx?: any) {
    const db = tx || prisma;
    return db.purchaseOrder.delete({
      where: { po_id: poId }
    });
  }
}