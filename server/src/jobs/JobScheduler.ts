import fs from 'fs';
import path from 'path';
import { prisma } from '../index';
import { jobQueue } from './JobQueue';

class JobSchedulerService {
  private intervals: NodeJS.Timeout[] = [];

  constructor() {
    this.startScheduler();
  }

  private startScheduler() {
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