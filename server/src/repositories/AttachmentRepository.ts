import { prisma } from '../index';

export class AttachmentRepository {
  async create(data: any, tx?: any) {
    const db = tx || prisma;
    return db.attachment.create({
      data
    });
  }

  async findMany(entityType: string, entityId: number, tx?: any) {
    const db = tx || prisma;
    return db.attachment.findMany({
      where: {
        entity_type: entityType,
        entity_id: entityId
      },
      orderBy: { uploaded_at: 'desc' }
    });
  }

  async findById(attachmentId: number, tx?: any) {
    const db = tx || prisma;
    return db.attachment.findUnique({
      where: { attachment_id: attachmentId }
    });
  }

  async delete(attachmentId: number, tx?: any) {
    const db = tx || prisma;
    return db.attachment.delete({
      where: { attachment_id: attachmentId }
    });
  }
}
