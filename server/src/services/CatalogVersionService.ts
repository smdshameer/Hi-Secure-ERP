import { prisma } from '../index';
import { BusinessEventService } from './BusinessEventService';

export class CatalogVersionService {
  static async detectDuplicateCatalog(fileHash: string, userId: number = 1): Promise<void> {
    if (!fileHash) return;

    const existing = await prisma.catalogVersionHistory.findUnique({
      where: { file_hash: fileHash }
    });

    if (existing) {
      await BusinessEventService.logEvent({
        event_type: 'DUPLICATE_CATALOG_VERSION_DETECTED',
        entity_type: 'CatalogImportSession',
        entity_id: existing.session_id,
        user_id: userId,
        description: `Duplicate catalog upload detected. Hash: ${fileHash}. Existing Session: #${existing.session_id}`
      });

      const error: any = new Error('DUPLICATE_CATALOG_VERSION');
      error.code = 'DUPLICATE_CATALOG_VERSION';
      throw error;
    }
  }

  static async registerCatalogVersion(
    supplierId: number,
    sessionId: number,
    fileHash: string,
    effectiveDate: Date = new Date(),
    userId: number = 1
  ): Promise<number> {
    // 1. Get highest version for the supplier
    const latestVersionRecord = await prisma.catalogVersionHistory.findFirst({
      where: { supplier_id: supplierId },
      orderBy: { catalog_version: 'desc' }
    });

    const newVersion = latestVersionRecord ? latestVersionRecord.catalog_version + 1 : 1;

    // 2. Create the version record (handle unique file_hash constraint)
    let newRecord;
    try {
      newRecord = await prisma.catalogVersionHistory.create({
        data: {
          supplier_id: supplierId,
          session_id: sessionId,
          catalog_version: newVersion,
          effective_date: effectiveDate,
          file_hash: fileHash
        }
      });
    } catch (err: any) {
      // Catch P2002 Unique Constraint violation
      if (err.code === 'P2002') {
        await BusinessEventService.logEvent({
          event_type: 'DUPLICATE_CATALOG_VERSION_DETECTED',
          entity_type: 'CatalogImportSession',
          entity_id: sessionId,
          user_id: userId,
          description: `Duplicate catalog upload blocked at DB unique constraint. Hash: ${fileHash}`
        });
        const error: any = new Error('DUPLICATE_CATALOG_VERSION');
        error.code = 'DUPLICATE_CATALOG_VERSION';
        throw error;
      }
      throw err;
    }

    // 3. Supersede old versions (update superseded_by field on previous versions)
    await prisma.catalogVersionHistory.updateMany({
      where: {
        supplier_id: supplierId,
        id: { not: newRecord.id },
        superseded_by: null
      },
      data: {
        superseded_by: newRecord.id
      }
    });

    // 4. Log business event
    await BusinessEventService.logEvent({
      event_type: 'CATALOG_VERSION_REGISTERED',
      entity_type: 'CatalogImportSession',
      entity_id: sessionId,
      user_id: userId,
      description: `Catalog version ${newVersion} registered for supplier #${supplierId}. Hash: ${fileHash}`
    });

    return newVersion;
  }
}
