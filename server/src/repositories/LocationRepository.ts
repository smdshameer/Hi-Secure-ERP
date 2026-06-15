import { prisma } from '../index';

export class LocationRepository {
  async findMany(where: any = {}, tx?: any) {
    const db = tx || prisma;
    return db.location.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  async findById(locationId: number, tx?: any) {
    const db = tx || prisma;
    return db.location.findUnique({
      where: { location_id: locationId }
    });
  }

  async create(data: any, tx?: any) {
    const db = tx || prisma;
    return db.location.create({
      data
    });
  }

  async update(locationId: number, data: any, tx?: any) {
    const db = tx || prisma;
    return db.location.update({
      where: { location_id: locationId },
      data
    });
  }

  async delete(locationId: number, tx?: any) {
    const db = tx || prisma;
    return db.location.delete({
      where: { location_id: locationId }
    });
  }
}
