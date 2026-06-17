import { AttachmentRepository } from '../repositories/AttachmentRepository';
import { prisma } from '../index';
import fs from 'fs';
import path from 'path';

export class AttachmentService {
  private static attachmentRepo = new AttachmentRepository();
  private static uploadDir = path.join(process.cwd(), 'uploads');

  static async createAttachment(data: any) {
    const entityType = data.entity_type || '';
    const entityId = Number(data.entity_id);
    const fileName = data.file_name || '';

    const versionedEntities = ['invoice', 'salesinvoice', 'purchaseorder', 'quotation', 'contract'];

    if (versionedEntities.includes(entityType.toLowerCase())) {
      // Check if attachment with same name already exists for this entity
      const existing = await prisma.attachment.findFirst({
        where: {
          entity_type: entityType,
          entity_id: entityId,
          file_name: fileName
        },
        include: {
          versions: {
            orderBy: { version_number: 'desc' },
            take: 1
          }
        }
      });

      if (existing) {
        console.log(`[AttachmentService] Existing attachment found for ${entityType} ID ${entityId}. Archiving current version...`);

        // Determine next version number
        const lastVersionNum = existing.versions[0]?.version_number || 0;
        const nextVersionNum = lastVersionNum + 1;

        // Get file size from disk if possible
        let oldFileSize = 0;
        try {
          const oldFilePath = path.join(this.uploadDir, existing.file_path);
          if (fs.existsSync(oldFilePath)) {
            oldFileSize = fs.statSync(oldFilePath).size;
          }
        } catch (err: any) {
          console.warn('[AttachmentService] Could not read file size for old version:', err.message);
        }

        // 1. Create AttachmentVersion record for the old version
        await prisma.attachmentVersion.create({
          data: {
            attachment_id: existing.attachment_id,
            version_number: nextVersionNum,
            file_name: existing.file_name,
            file_path: existing.file_path,
            file_size: oldFileSize,
            mime_type: existing.mime_type,
            uploaded_by: existing.uploaded_by,
            uploaded_at: existing.uploaded_at,
            change_notes: `Archived version ${nextVersionNum} due to update.`
          }
        });

        // 2. Update the existing attachment to the new file details
        const updated = await prisma.attachment.update({
          where: { attachment_id: existing.attachment_id },
          data: {
            file_path: data.file_path,
            mime_type: data.mime_type,
            uploaded_by: data.uploaded_by,
            uploaded_at: new Date()
          }
        });

        console.log(`[AttachmentService] Updated attachment ID ${existing.attachment_id} to new version ${nextVersionNum + 1}.`);
        return updated;
      }
    }

    // Default: create a new attachment record
    return this.attachmentRepo.create(data);
  }

  static async getAttachmentsByEntity(entityType: string, entityId: number) {
    return prisma.attachment.findMany({
      where: {
        entity_type: entityType,
        entity_id: entityId
      },
      include: {
        versions: {
          orderBy: { version_number: 'desc' }
        }
      },
      orderBy: { uploaded_at: 'desc' }
    });
  }

  static async getAttachmentById(attachmentId: number) {
    return prisma.attachment.findUnique({
      where: { attachment_id: attachmentId },
      include: {
        versions: {
          orderBy: { version_number: 'desc' }
        }
      }
    });
  }

  static async deleteAttachment(attachmentId: number) {
    return this.attachmentRepo.delete(attachmentId);
  }
}
