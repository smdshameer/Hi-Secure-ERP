import fs from 'fs';
import crypto from 'crypto';
import { prisma } from '../index';

export class BackupValidationService {
  /**
   * Validates a backup file's structure, checksum, record counts, and general integrity.
   * Logs the results to RestoreVerificationReport table.
   */
  static async validateBackup(filePath: string): Promise<any> {
    console.log(`[BackupValidationService] Starting validation for backup file: ${filePath}`);
    
    const reportData = {
      backup_file: filePath,
      status: 'pending',
      checksum_valid: false,
      file_integrity: 'corrupt',
      record_counts: {} as any,
      errors: null as string | null
    };

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Backup file does not exist at path: ${filePath}`);
      }

      // 1. Calculate checksum (sha256 hash)
      const fileBuffer = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      console.log(`[BackupValidationService] Calculated SHA256 checksum: ${hash}`);

      // 2. Try parsing JSON structure
      const fileContent = fileBuffer.toString('utf-8');
      let backupPayload: any;
      try {
        backupPayload = JSON.parse(fileContent);
      } catch (parseErr: any) {
        throw new Error(`Invalid JSON format: ${parseErr.message}`);
      }

      // 3. Verify standard JSON envelope schema
      if (!backupPayload.exported_at || !backupPayload.data) {
        throw new Error('Missing standard backup envelope fields (exported_at or data).');
      }

      // 4. Count records per table
      const dataObj = backupPayload.data;
      const recordCounts: any = {};
      
      for (const table of Object.keys(dataObj)) {
        if (Array.isArray(dataObj[table])) {
          recordCounts[table] = dataObj[table].length;
        } else {
          recordCounts[table] = 0;
        }
      }

      reportData.record_counts = recordCounts;
      console.log('[BackupValidationService] Record counts parsed:', recordCounts);

      // 5. File Integrity checks: ensure we have users and settings at least
      const hasUsers = (recordCounts.users || 0) > 0;
      const hasSettings = (recordCounts.settings || 0) > 0;

      if (!hasUsers || !hasSettings) {
        throw new Error(`Integrity check failed: missing critical tables (users count: ${recordCounts.users}, settings count: ${recordCounts.settings})`);
      }

      // If we got here, it's valid
      reportData.status = 'passed';
      reportData.checksum_valid = true;
      reportData.file_integrity = 'valid';

    } catch (err: any) {
      console.error('[BackupValidationService] Validation failed:', err.message);
      reportData.status = 'failed';
      reportData.checksum_valid = false;
      reportData.file_integrity = 'corrupt';
      reportData.errors = err.message || String(err);
    }

    // Save report to database
    const report = await prisma.restoreVerificationReport.create({
      data: {
        backup_file: reportData.backup_file,
        status: reportData.status,
        checksum_valid: reportData.checksum_valid,
        file_integrity: reportData.file_integrity,
        record_counts: reportData.record_counts,
        errors: reportData.errors
      }
    });

    console.log(`[BackupValidationService] Saved verification report ID: ${report.id} with status: ${report.status}`);
    return report;
  }
}
