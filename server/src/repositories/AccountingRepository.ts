import { prisma } from '../index';

export class AccountingRepository {
  async findLines(where: any, orderBy: any = [
    { entry: { entry_date: 'asc' } },
    { line_id: 'asc' }
  ], tx?: any) {
    const db = tx || prisma;
    return db.journalEntryLine.findMany({
      where,
      include: {
        entry: true,
        account: true
      },
      orderBy
    });
  }

  async findEntries(where: any, orderBy: any = [
    { entry_date: 'desc' },
    { entry_id: 'desc' }
  ], tx?: any) {
    const db = tx || prisma;
    return db.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: true
          }
        }
      },
      orderBy
    });
  }

  async createEntry(data: any, tx?: any) {
    const db = tx || prisma;
    return db.journalEntry.create({
      data
    });
  }

  async createLine(data: any, tx?: any) {
    const db = tx || prisma;
    return db.journalEntryLine.create({
      data
    });
  }

  async deleteEntry(entryId: number, tx?: any) {
    const db = tx || prisma;
    return db.journalEntry.delete({
      where: { entry_id: entryId }
    });
  }
}