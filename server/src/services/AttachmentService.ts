import { AttachmentRepository } from '../repositories/AttachmentRepository';

export class AttachmentService {
  private static attachmentRepo = new AttachmentRepository();

  static async createAttachment(data: any) {
    return this.attachmentRepo.create(data);
  }

  static async getAttachmentsByEntity(entityType: string, entityId: number) {
    return this.attachmentRepo.findMany(entityType, entityId);
  }

  static async getAttachmentById(attachmentId: number) {
    return this.attachmentRepo.findById(attachmentId);
  }

  static async deleteAttachment(attachmentId: number) {
    return this.attachmentRepo.delete(attachmentId);
  }
}
