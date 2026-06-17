import fs from 'fs';
import path from 'path';
import { prisma } from '../index';
import { jobQueue } from './JobQueue';

class JobSchedulerService {
  private intervals: NodeJS.Timeout[] = [];

  constructor() {
    // startScheduler is explicitly called after database connection is established
  }

  public startScheduler() {
    console.log('[JobScheduler] Initializing background task scheduler...');

    // 1. Periodic Low Stock check every 15 minutes
    const lowStockInterval = setInterval(() => {
      console.log('[JobScheduler] Running periodic low stock alert check...');
      jobQueue.addJob('NOTIFICATION', { type: 'CHECK_LOW_STOCK', timestamp: Date.now() });
    }, 15 * 60 * 1000);

    this.intervals.push(lowStockInterval);

    // 2. Periodic Database Auto-Backup check every 30 minutes
    const backupInterval = setInterval(async () => {
      try {
        const backupSetting = await prisma.setting.findUnique({ where: { key: 'backup' } });
        const config = (backupSetting?.value as any) || {};

        if (config.backup_enabled) {
          const currentTime = new Date();
          const [configHour, configMin] = (config.backup_time || '01:00').split(':');
          
          const targetTime = new Date();
          targetTime.setHours(Number(configHour) || 1, Number(configMin) || 0, 0, 0);

          // Execute backup if current time is within a 30-minute window of target time
          const timeDifferenceMinutes = Math.abs(currentTime.getTime() - targetTime.getTime()) / (60 * 1000);

          if (timeDifferenceMinutes <= 30) {
            const dateStr = currentTime.toISOString().split('T')[0];
            const backupDir = path.join(process.cwd(), 'backups');
            let alreadyRun = false;

            if (fs.existsSync(backupDir)) {
              const files = fs.readdirSync(backupDir);
              alreadyRun = files.some(file => file.startsWith(`hisecure_erp_daily_${dateStr}`));
            }

            if (!alreadyRun) {
              console.log(`[JobScheduler] Time matches configured backup_time (${config.backup_time}). Executing auto daily backup...`);
              const { BackupService } = require('../services/BackupService');
              await BackupService.runBackup('daily');
            }
          }
        }
      } catch (err: any) {
        console.error('[JobScheduler] Auto backup check error:', err.message);
      }
    }, 30 * 60 * 1000);

    this.intervals.push(backupInterval);

    // 3. Periodic Integrity Audit check every 30 minutes
    const integrityAuditInterval = setInterval(async () => {
      try {
        const currentTime = new Date();
        const targetHour = 2; // 02:00 AM
        const targetMin = 0;
        
        const targetTime = new Date();
        targetTime.setHours(targetHour, targetMin, 0, 0);

        const timeDifferenceMinutes = Math.abs(currentTime.getTime() - targetTime.getTime()) / (60 * 1000);

        if (timeDifferenceMinutes <= 30) {
          const dateStr = currentTime.toISOString().split('T')[0];
          const reportsDir = path.join(process.cwd(), '..', 'reports', 'integrity');
          let alreadyRun = false;

          if (fs.existsSync(reportsDir)) {
            const files = fs.readdirSync(reportsDir);
            alreadyRun = files.some(file => file.includes(dateStr));
          }

          if (!alreadyRun) {
            const isSunday = currentTime.getDay() === 0;
            const scope = isSunday ? 'FULL' : 'INCREMENTAL';
            console.log(`[JobScheduler] Time matches 02:00 AM. Executing integrity audit (${scope})...`);
            const { IntegrityAuditService } = require('../services/IntegrityAuditService');
            await IntegrityAuditService.runAudit(scope);
          }
        }
      } catch (err: any) {
        console.error('[JobScheduler] Integrity audit check error:', err.message);
      }
    }, 30 * 60 * 1000);

    this.intervals.push(integrityAuditInterval);

    // 4. Hourly System Health snapshot logging
    const runHealthSnapshot = async () => {
      try {
        console.log('[JobScheduler] Executing system health snapshot logging...');
        const { HealthHistoryService } = require('../services/HealthHistoryService');
        await HealthHistoryService.logHealthSnapshot();
      } catch (err: any) {
        console.error('[JobScheduler] System health logging error:', err.message);
      }
    };

    // Run once on startup
    runHealthSnapshot();

    // Schedule hourly
    const systemHealthInterval = setInterval(runHealthSnapshot, 60 * 60 * 1000);
    this.intervals.push(systemHealthInterval);

    // 5. Periodic Catalog data cleanup every 24 hours
    const runCatalogCleanup = async () => {
      try {
        console.log('[JobScheduler] Running periodic catalog session and reports cleanup...');
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 180);

        const oldSessions = await prisma.catalogImportSession.findMany({
          where: {
            created_at: {
              lt: cutoffDate
            }
          },
          select: {
            session_id: true,
            report_path: true
          }
        });

        if (oldSessions.length > 0) {
          console.log(`[JobScheduler] Found ${oldSessions.length} catalog sessions older than 180 days to purge.`);
          
          for (const session of oldSessions) {
            if (session.report_path && fs.existsSync(session.report_path)) {
              try {
                fs.unlinkSync(session.report_path);
                console.log(`[JobScheduler] Deleted validation report at ${session.report_path}`);
                
                const jsonPath = session.report_path.replace(/\.md$/, '.json');
                if (fs.existsSync(jsonPath)) {
                  fs.unlinkSync(jsonPath);
                  console.log(`[JobScheduler] Deleted validation json report at ${jsonPath}`);
                }
              } catch (fileErr: any) {
                console.error(`[JobScheduler] Failed to delete report file:`, fileErr.message);
              }
            }
          }

          const deleteResult = await prisma.catalogImportSession.deleteMany({
            where: {
              created_at: {
                lt: cutoffDate
              }
            }
          });
          console.log(`[JobScheduler] Purged ${deleteResult.count} database session records older than 180 days.`);
        }
      } catch (err: any) {
        console.error('[JobScheduler] Catalog cleanup error:', err.message);
      }
    };

    // Run once on startup
    runCatalogCleanup();

    const catalogCleanupInterval = setInterval(runCatalogCleanup, 24 * 60 * 60 * 1000);
    this.intervals.push(catalogCleanupInterval);
  }

  stopScheduler() {
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];
    console.log('[JobScheduler] Stopped background task scheduler.');
  }
}

export const jobScheduler = new JobSchedulerService();