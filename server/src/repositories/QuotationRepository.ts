import { prisma } from '../index';

export class QuotationRepository {
  async findMany(where: any) {
    return prisma.quotation.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } },
        _count: { select: { items: true } }
      },
      orderBy: { quote_date: 'desc' }
    });
  }

  async findById(quoteId: number) {
    return prisma.quotation.findUnique({
      where: { quote_id: quoteId },
      include: {
        customer: true,
        items: { include: { part: true } },
        createdBy: { select: { full_name: true } }
      }
    });
  }

  async create(data: any) {
    return prisma.quotation.create({
      data,
      select: { quote_id: true, quote_number: true, total_amount: true }
    });
  }

  async update(quoteId: number, data: any) {
    return prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.quotationItems.deleteMany({ where: { quote_id: quoteId } });
      // Update header and recreate items
      return tx.quotation.update({
        where: { quote_id: quoteId },
        data
      });
    });
  }

  async updateStatus(quoteId: number, data: any) {
    return prisma.quotation.update({
      where: { quote_id: quoteId },
      data
    });
  }

  async delete(quoteId: number) {
    return prisma.quotation.delete({
      where: { quote_id: quoteId }
    });
  }
}
