import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { prisma } from '../index';

export class BackupService {
  private static backupDir = path.join(process.cwd(), 'backups');

  static init() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Run database backup dynamically based on Settings module configurations
   */
  static async runBackup(type: 'daily' | 'weekly' = 'daily'): Promise<{ success: boolean; filePath: string; format: string }> {
    this.init();
    
    // Load backup configuration from database key-value store
    const backupSetting = await prisma.setting.findUnique({ where: { key: 'backup' } });
    const backupConfig = (backupSetting?.value as any) || {
      backup_enabled: false,
      backup_type: 'json',
      retention_days: 14,
      backup_time: '01:00'
    };

    const dateStr = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    const backupType = backupConfig.backup_type || 'json';

    if (backupType === 'sql') {
      const sqlFileName = `hisecure_erp_${type}_${dateStr}_${timestamp}.sql`;
      const sqlFilePath = path.join(this.backupDir, sqlFileName);
      console.log(`[BackupService] Starting SQL pg_dump backup...`);

      const dbUrl = process.env.DATABASE_URL || '';
      const matches = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

      if (matches) {
        const [, user, password, host, port, dbName] = matches;
        const cleanDbName = dbName.split('?')[0];
        const env = { ...process.env, PGPASSWORD: password };
        const command = `pg_dump -h ${host} -p ${port} -U ${user} -F p -b -v -f "${sqlFilePath}" ${cleanDbName}`;

        return new Promise((resolve) => {
          exec(command, { env }, async (error, _stdout, stderr) => {
            if (!error && fs.existsSync(sqlFilePath) && fs.statSync(sqlFilePath).size > 100) {
              console.log(`[BackupService] SQL dump complete: ${sqlFileName}`);
              await this.enforceRetention();
              await this.uploadToGoogleDrive(sqlFilePath, sqlFileName);
              return resolve({ success: true, filePath: sqlFilePath, format: 'sql' });
            }
            console.warn('[BackupService] pg_dump failed. Falling back to JSON backup...');
            console.warn('pg_dump error:', error?.message || stderr);
            const fallbackResult = await this.runJsonFallback(type, dateStr, timestamp);
            resolve(fallbackResult);
          });
        });
      }
    }

    // Default or Fallback: JSON backup
    return this.runJsonFallback(type, dateStr, timestamp);
  }

  /**
   * JSON Backup Fallback
   */
  private static async runJsonFallback(type: string, dateStr: string, timestamp: number): Promise<{ success: boolean; filePath: string; format: string }> {
    try {
      const jsonFileName = `hisecure_erp_${type}_${dateStr}_${timestamp}.json`;
      const jsonFilePath = path.join(this.backupDir, jsonFileName);
      console.log(`[BackupService] Starting JSON database export...`);

      const [
        customers, suppliers, parts, invoices, repairs, quotations, challans, purchaseOrders, dbSettings,
        brands, technicians, locations, partStocks, stockMovements, accounts, journalEntries, users,
        roles, permissions, rolePermissions, userRoles, attachments, salesReturns, purchaseReturns,
        posSessions, posTransactions, approvalWorkflows, approvalHistories, repairEvents, companies,
        payments, challanReturns
      ] = await Promise.all([
        prisma.customer.findMany(),
        prisma.supplier.findMany(),
        prisma.parts.findMany(),
        prisma.salesInvoice.findMany({ include: { items: true } }),
        prisma.repair.findMany({ include: { parts: true } }),
        prisma.quotation.findMany({ include: { items: true } }),
        prisma.deliveryChallan.findMany({ include: { items: true } }),
        prisma.purchaseOrder.findMany({ include: { items: true } }),
        prisma.setting.findMany(),
        prisma.brand.findMany(),
        prisma.technician.findMany(),
        prisma.location.findMany(),
        prisma.partStock.findMany(),
        prisma.stockMovement.findMany(),
        prisma.account.findMany(),
        prisma.journalEntry.findMany({ include: { lines: true } }),
        prisma.user.findMany(),
        prisma.role.findMany(),
        prisma.permission.findMany(),
        prisma.rolePermission.findMany(),
        prisma.userRole.findMany(),
        prisma.attachment.findMany(),
        prisma.salesReturn.findMany({ include: { items: true } }),
        prisma.purchaseReturn.findMany({ include: { items: true } }),
        prisma.posSession.findMany(),
        prisma.posTransaction.findMany(),
        prisma.approvalWorkflow.findMany({ include: { steps: true } }),
        prisma.approvalHistory.findMany(),
        prisma.repairEvent.findMany(),
        prisma.company.findMany(),
        prisma.payment.findMany(),
        prisma.deliveryChallanReturns.findMany()
      ]);

      const backupData = {
        exported_at: new Date().toISOString(),
        version: '2.0-configured',
        type,
        data: {
          customers,
          suppliers,
          parts,
          invoices,
          repairs,
          quotations,
          challans,
          purchaseOrders,
          settings: dbSettings,
          brands,
          technicians,
          locations,
          partStocks,
          stockMovements,
          accounts,
          journalEntries,
          users,
          roles,
          permissions,
          rolePermissions,
          userRoles,
          attachments,
          salesReturns,
          purchaseReturns,
          posSessions,
          posTransactions,
          approvalWorkflows,
          approvalHistories,
          repairEvents,
          companies,
          payments,
          challanReturns
        }
      };

      fs.writeFileSync(jsonFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
      console.log(`[BackupService] JSON backup complete: ${jsonFileName}`);
      await this.enforceRetention();
      await this.uploadToGoogleDrive(jsonFilePath, jsonFileName);
      return { success: true, filePath: jsonFilePath, format: 'json' };
    } catch (err: any) {
      console.error('[BackupService] JSON backup failed:', err);
      return { success: false, filePath: '', format: '' };
    }
  }

  private static async fetchWithRetry(url: string, options: any, retries = 3, delay = 1000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, options);
        if (res.status === 429 || res.status >= 500) {
          console.warn(`[BackupService] Fetch failed with status ${res.status}. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        return res;
      } catch (err: any) {
        if (i === retries - 1) throw err;
        console.warn(`[BackupService] Fetch network error: ${err.message}. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    throw new Error(`Failed to fetch after ${retries} retries`);
  }

  /**
   * Google Drive Uploader using JWT-Auth Service Account
   */
  private static async uploadToGoogleDrive(filePath: string, fileName: string): Promise<boolean> {
    try {
      // Load Google Drive configurations from Settings module
      const gdriveSetting = await prisma.setting.findUnique({ where: { key: 'gdrive' } });
      const config = (gdriveSetting?.value as any) || {};

      if (!config.gdrive_enabled) {
        console.log('[BackupService] Google Drive integration disabled.');
        return false;
      }

      let accessToken = '';

      if (config.use_oauth || config.refresh_token) {
        // OAuth 2.0 Flow (User accounts)
        if (!config.client_id || !config.client_secret || !config.refresh_token) {
          console.log('[BackupService] Google Drive OAuth configuration incomplete.');
          return false;
        }

        console.log('[BackupService] Initiating OAuth upload to Google Drive...');

        const authRes = await this.fetchWithRetry('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: config.client_id,
            client_secret: config.client_secret,
            refresh_token: config.refresh_token,
            grant_type: 'refresh_token'
          })
        });

        if (!authRes.ok) {
          const errText = await authRes.text();
          throw new Error(`Google Drive OAuth token refresh failed: ${errText}`);
        }

        const authData = await authRes.json() as any;
        accessToken = authData.access_token;
      } else {
        // Service Account Flow (Legacy / Shared Drives)
        if (!config.client_email || !config.private_key) {
          console.log('[BackupService] Google Drive Service Account parameters incomplete.');
          return false;
        }

        console.log('[BackupService] Initiating Service Account upload to Google Drive...');

        // 1. Generate Google OAuth JWT Token
        const jwt = require('jsonwebtoken');
        const tokenClaim = {
          iss: config.client_email,
          scope: 'https://www.googleapis.com/auth/drive',
          aud: 'https://oauth2.googleapis.com/token',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000)
        };

        // Format private key (replace escaped newlines from UI input)
        const formattedKey = config.private_key.replace(/\\n/g, '\n');
        const assertion = jwt.sign(tokenClaim, formattedKey, { algorithm: 'RS256' });

        // 2. Exchange JWT for access token
        const authRes = await this.fetchWithRetry('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion
          })
        });

        if (!authRes.ok) {
          const errText = await authRes.text();
          throw new Error(`Google Drive auth token exchange failed: ${errText}`);
        }

        const authData = await authRes.json() as any;
        accessToken = authData.access_token;
      }

      // 3. Upload File to Google Drive Folder
      const fileBuffer = fs.readFileSync(filePath);
      const metadata = {
        name: fileName,
        parents: config.folder_id ? [config.folder_id] : undefined
      };

      const boundary = 'foo_bar_boundary';
      const multipartBody = Buffer.concat([
        Buffer.from(`\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
        Buffer.from(`\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`),
        fileBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`)
      ]);

      const uploadRes = await this.fetchWithRetry('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': String(multipartBody.length)
        },
        body: multipartBody
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Google Drive file upload failed: ${errText}`);
      }

      console.log('[BackupService] Google Drive upload successful!');
      return true;
    } catch (err: any) {
      console.error('[BackupService] Google Drive upload error:', err.message);
      return false;
    }
  }

  /**
   * Dynamic retention policy enforcement based on Settings value
   */
  static async enforceRetention() {
    this.init();
    try {
      const backupSetting = await prisma.setting.findUnique({ where: { key: 'backup' } });
      const backupConfig = (backupSetting?.value as any) || {};
      const retentionDays = Number(backupConfig.retention_days || 14);

      const files = fs.readdirSync(this.backupDir);
      const now = Date.now();
      const cutoff = now - (retentionDays * 24 * 60 * 60 * 1000);

      files.forEach((file) => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
          console.log(`[BackupService] Purged old backup file: ${file}`);
        }
      });
    } catch (err: any) {
      console.error('[BackupService] Retention cleanup failed:', err);
    }
  }

  /**
   * Run verification checks on a backup file
   */
  static verifyBackup(filePath: string): { healthy: boolean; error?: string } {
    try {
      if (!fs.existsSync(filePath)) {
        return { healthy: false, error: 'File does not exist' };
      }
      const stats = fs.statSync(filePath);
      if (stats.size < 500) {
        return { healthy: false, error: 'File size is too small' };
      }
      return { healthy: true };
    } catch (err: any) {
      return { healthy: false, error: err.message };
    }
  }
}