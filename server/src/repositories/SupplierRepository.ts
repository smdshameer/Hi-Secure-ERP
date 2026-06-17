import { prisma } from '../index';

export class SupplierRepository {
  async findMany(where: any, orderBy: any = { name: 'asc' }, tx?: any) {
    const db = tx || prisma;
    const finalWhere = { ...where };
    if (finalWhere.is_deleted === undefined) {
      finalWhere.is_deleted = false;
    }
    return db.supplier.findMany({
      where: finalWhere,
      orderBy,
      include: {
        _count: { select: { purchaseOrders: true } }
      }
    });
  }

  async findById(supplierId: number, tx?: any) {
    const db = tx || prisma;
    return db.supplier.findFirst({
      where: { supplier_id: supplierId, is_deleted: false }
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

  async delete(supplierId: number, userId?: number, tx?: any) {
    const db = tx || prisma;
    const actualTx = typeof userId === 'object' && userId !== null ? userId : tx;
    const actualUserId = typeof userId === 'number' ? userId : null;
    
    return (actualTx || prisma).supplier.update({
      where: { supplier_id: supplierId },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: actualUserId
      }
    });
  }
}