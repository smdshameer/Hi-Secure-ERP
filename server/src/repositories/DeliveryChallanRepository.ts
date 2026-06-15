import { prisma } from '../index';

export class DeliveryChallanRepository {
  async findMany(where: any) {
    return prisma.deliveryChallan.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        supplier: { select: { name: true } },
        _count: { select: { items: true } }
      },
      orderBy: { challan_date: 'desc' }
    });
  }

  async findById(challanId: number) {
    return prisma.deliveryChallan.findUnique({
      where: { delivery_challan_id: challanId },
      include: {
        customer: true,
        supplier: true,
        fromLocation: true,
        toLocation: true,
        items: { include: { part: true } }
      }
    });
  }

  async create(data: any) {
    return prisma.deliveryChallan.create({
      data,
      select: { delivery_challan_id: true, challan_number: true }
    });
  }

  async update(challanId: number, data: any) {
    return prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.deliveryChallanItems.deleteMany({ where: { delivery_challan_id: challanId } });
      
      // Update challan header and recreate items
      return tx.deliveryChallan.update({
        where: { delivery_challan_id: challanId },
        data
      });
    });
  }

  async updateStatus(challanId: number, status: string) {
    return prisma.deliveryChallan.update({
      where: { delivery_challan_id: challanId },
      data: { status }
    });
  }

  async delete(challanId: number) {
    return prisma.deliveryChallan.delete({
      where: { delivery_challan_id: challanId }
    });
  }
}
