import { prisma } from '../index';

export class PartsRepository {
  async findMany(where: any, orderBy: any = { name: 'asc' }, tx?: any) {
    const db = tx || prisma;
    return db.parts.findMany({
      where,
      orderBy,
      include: {
        brand: { select: { name: true } },
        stocks: true
      }
    });
  }

  async findById(partId: number, tx?: any) {
    const db = tx || prisma;
    return db.parts.findUnique({
      where: { part_id: partId },
      include: {
        brand: true,
        stocks: true,
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        purchaseOrderItems: {
          include: {
            purchaseOrder: {
              include: {
                supplier: true
              }
            }
          },
          orderBy: {
            purchaseOrder: {
              order_date: 'desc'
            }
          },
          take: 10
        }
      }
    });
  }

  async create(data: any, tx?: any) {
    const db = tx || prisma;
    return db.parts.create({
      data
    });
  }

  async update(partId: number, data: any, tx?: any) {
    const db = tx || prisma;
    return db.parts.update({
      where: { part_id: partId },
      data
    });
  }

  async delete(partId: number, tx?: any) {
    const db = tx || prisma;
    return db.parts.delete({
      where: { part_id: partId }
    });
  }

  async decrementStock(partId: number, quantity: number, locationId: number = 1, tx?: any) {
    const db = tx || prisma;
    return db.partStock.update({
      where: {
        part_id_location_id: {
          part_id: partId,
          location_id: locationId
        }
      },
      data: { quantity: { decrement: quantity } }
    });
  }

  async incrementStock(partId: number, quantity: number, locationId: number = 1, tx?: any) {
    const db = tx || prisma;
    return db.partStock.upsert({
      where: {
        part_id_location_id: {
          part_id: partId,
          location_id: locationId
        }
      },
      update: { quantity: { increment: quantity } },
      create: {
        part_id: partId,
        location_id: locationId,
        quantity: quantity
      }
    });
  }
}