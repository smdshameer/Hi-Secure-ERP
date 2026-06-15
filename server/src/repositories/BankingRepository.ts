import { prisma } from '../index';

export class BankingRepository {
  async findMany(where: any = {}, orderBy: any = { transaction_date: 'desc' }) {
    return prisma.bankTransaction.findMany({
      where,
      orderBy
    });
  }

  async findById(transactionId: number) {
    return prisma.bankTransaction.findUnique({
      where: { transaction_id: transactionId }
    });
  }

  async create(data: any) {
    return prisma.bankTransaction.create({
      data
    });
  }

  async update(transactionId: number, data: any) {
    return prisma.bankTransaction.update({
      where: { transaction_id: transactionId },
      data
    });
  }

  async delete(transactionId: number) {
    return prisma.bankTransaction.delete({
      where: { transaction_id: transactionId }
    });
  }
}
