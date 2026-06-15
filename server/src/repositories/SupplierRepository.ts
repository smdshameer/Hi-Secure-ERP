import { prisma } from '../index';

export class SupplierRepository {
  async findMany(where: any, orderBy: any = { name: 'asc' }, tx?: any) {
    const db = tx || prisma;
    return db.supplier.findMany({
      where,
      orderBy,
      include: {
        _count: { select: { purchaseOrders: true } }
      }
    });
  }

  async findById(supplierId: number, tx?: any) {
    const db = tx || prisma;
    return db.supplier.findUnique({
      where: { supplier_id: supplierId }
    });
  }

  async create(data: any, tx?: any) {
    const db = tx || prisma;
    return db.supplier.create({
      data
    });
  }

  async update(supplierId: number, data: any, tx?: any) {
    const db = tx || prisma;
    return db.supplier.update({
      where: { supplier_id: supplierId },
      data
    });
  }

  async delete(supplierId: number, tx?: any) {
    const db = tx || prisma;
    return db.supplier.delete({
      where: { supplier_id: supplierId }
    });
  }
}