import { prisma } from '../index';

export class ApprovalRepository {
  async findWorkflow(entityType: string, tx?: any) {
    const db = tx || prisma;
    return db.approvalWorkflow.findUnique({
      where: { entity_type: entityType },
      include: { steps: { orderBy: { step_number: 'asc' } } }
    });
  }

  async findHistory(where: any, tx?: any) {
    const db = tx || prisma;
    return db.approvalHistory.findFirst({
      where
    });
  }

  async findManyHistory(where: any, tx?: any) {
    const db = tx || prisma;
    return db.approvalHistory.findMany({
      where,
      include: {
        step: { include: { role: true } },
        user: { select: { full_name: true, username: true } }
      },
      orderBy: { created_at: 'asc' }
    });
  }

  async createHistory(data: any, tx?: any) {
    const db = tx || prisma;
    return db.approvalHistory.create({
      data
    });
  }

  async findSteps(where: any, tx?: any) {
    const db = tx || prisma;
    return db.approvalStep.findMany({
      where,
      include: { workflow: true }
    });
  }
}
