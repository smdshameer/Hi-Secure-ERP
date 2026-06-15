import { prisma } from '../index';

export class PosRepository {
  async createSession(data: any, tx?: any) {
    const db = tx || prisma;
    return db.posSession.create({
      data
    });
  }

  async findCurrentSession(tx?: any) {
    const db = tx || prisma;
    return db.posSession.findFirst({
      where: { closed: false },
      orderBy: { session_date: 'desc' }
    });
  }

  async findSessionById(sessionId: number, tx?: any) {
    const db = tx || prisma;
    return db.posSession.findUnique({
      where: { session_id: sessionId }
    });
  }

  async updateSession(sessionId: number, data: any, tx?: any) {
    const db = tx || prisma;
    return db.posSession.update({
      where: { session_id: sessionId },
      data
    });
  }

  async createTransaction(data: any, tx?: any) {
    const db = tx || prisma;
    return db.posTransaction.create({
      data
    });
  }

  async findTransactions(sessionId?: number, tx?: any) {
    const db = tx || prisma;
    const where = sessionId ? { session_id: sessionId } : {};
    return db.posTransaction.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });
  }
}
