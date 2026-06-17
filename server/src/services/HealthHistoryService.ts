import os from 'os';
import { prisma } from '../index';
import { SystemHealthService } from './SystemHealthService';
import { getTelegramConfig } from './telegramService';
import { AiService } from './AiService';
import { telegramBotWorker } from '../jobs/TelegramBotWorker';

export class HealthHistoryService {
  /**
   * Generates a health log entry and saves it to the database.
   */
  static async logHealthSnapshot(): Promise<any> {
    console.log('[HealthHistoryService] Generating system health snapshot...');

    // 1. Gather baseline server health
    const health = await SystemHealthService.checkHealth();
    const fullHealth = await SystemHealthService.getFullHealth();

    const database_status = health.database.status === 'connected' ? 'healthy' : 'unhealthy';
    const database_latency = health.database.latency_ms;
    const redis_status = fullHealth.services.redis.status;
    const smtp_status = fullHealth.services.smtp.status;

    // 2. Google Drive Health Check
    let gdrive_status = 'disabled';
    try {
      const gdriveSetting = await prisma.setting.findUnique({ where: { key: 'gdrive' } });
      const config = (gdriveSetting?.value as any) || {};
      if (config.gdrive_enabled) {
        if (config.use_oauth || config.refresh_token) {
          const authRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: config.client_id || '',
              client_secret: config.client_secret || '',
              refresh_token: config.refresh_token || '',
              grant_type: 'refresh_token'
            })
          });
          gdrive_status = authRes.ok ? 'healthy' : 'unhealthy';
        } else if (config.client_email && config.private_key) {
          const jwt = require('jsonwebtoken');
          const tokenClaim = {
            iss: config.client_email,
            scope: 'https://www.googleapis.com/auth/drive',
            aud: 'https://oauth2.googleapis.com/token',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000)
          };
          const formattedKey = config.private_key.replace(/\\n/g, '\n');
          const assertion = jwt.sign(tokenClaim, formattedKey, { algorithm: 'RS256' });
          const authRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
              assertion
            })
          });
          gdrive_status = authRes.ok ? 'healthy' : 'unhealthy';
        } else {
          gdrive_status = 'misconfigured';
        }
      }
    } catch (err) {
      console.error('[HealthHistoryService] GDrive check failed:', err);
      gdrive_status = 'unhealthy';
    }

    // 3. Telegram Health Check
    const telegram_status = telegramBotWorker.status;

    // 4. AI Service Health Check
    let ai_status = 'disabled';
    let ocr_watchdog_status = 'healthy';
    let ocr_degraded_reason = '';
    try {
      const aiSetting = await prisma.setting.findUnique({ where: { key: 'ai' } });
      const aiConfig = (aiSetting?.value as any) || {};
      if (aiConfig.ai_enabled && aiConfig.nvidia_api_key) {
        const aiOk = await AiService.testNvidiaConnection(aiConfig.nvidia_api_key, aiConfig.model_id);
        ai_status = aiOk ? 'healthy' : 'unhealthy';
      }
    } catch (err) {
      console.error('[HealthHistoryService] AI check failed:', err);
      ai_status = 'unhealthy';
    }

    try {
      const { OCRService } = require('./OCRService');
      const watchdog = await OCRService.runWatchdog();
      if (watchdog.degraded) {
        ocr_watchdog_status = 'warning';
        ocr_degraded_reason = watchdog.reason || '';
        ai_status = 'WARNING';
      }
    } catch (err: any) {
      ocr_watchdog_status = 'error';
      ocr_degraded_reason = err.message;
    }

    // 5. Disk Usage
    let disk_usage = 'unknown';
    try {
      const fs = require('fs');
      if (typeof fs.statfsSync === 'function') {
        const stats = fs.statfsSync(process.cwd());
        const freeSpace = stats.bfree * stats.bsize;
        const totalSpace = stats.blocks * stats.bsize;
        const freeGB = (freeSpace / 1024 / 1024 / 1024).toFixed(2);
        const totalGB = (totalSpace / 1024 / 1024 / 1024).toFixed(2);
        const usedPercent = (((totalSpace - freeSpace) / totalSpace) * 100).toFixed(1);
        disk_usage = `Used: ${usedPercent}% (Free: ${freeGB} GB / Total: ${totalGB} GB)`;
      } else {
        // Fallback for older node versions
        const { execSync } = require('child_process');
        if (process.platform === 'win32') {
          const stdout = execSync('wmic logicaldisk get size,freespace,caption').toString();
          const lines = stdout.trim().split('\n').filter(Boolean);
          const cDrive = lines.find((line: string) => line.includes('C:'));
          if (cDrive) {
            const [, free, size] = cDrive.trim().split(/\s+/);
            const freeGB = (Number(free) / 1024 / 1024 / 1024).toFixed(2);
            const sizeGB = (Number(size) / 1024 / 1024 / 1024).toFixed(2);
            const used = (((Number(size) - Number(free)) / Number(size)) * 100).toFixed(1);
            disk_usage = `Used: ${used}% (Free: ${freeGB} GB / Total: ${sizeGB} GB)`;
          }
        } else {
          const stdout = execSync("df -h / | tail -1 | awk '{print $5}'").toString();
          disk_usage = `Used: ${stdout.trim()}`;
        }
      }
    } catch (err) {
      console.error('[HealthHistoryService] Disk usage check failed:', err);
      disk_usage = 'unknown';
    }

    // 6. Backup Status
    let backup_status = 'unknown';
    try {
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: {
            in: ['RUN_BACKUP', 'BACKUP_COMPLETED', 'BACKUP_FAILED']
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });
      if (auditLog) {
        if (auditLog.action === 'BACKUP_FAILED') {
          backup_status = 'failed';
        } else {
          backup_status = 'success';
        }
      } else {
        backup_status = 'no_backups_found';
      }
    } catch (err) {
      console.error('[HealthHistoryService] Backup status check failed:', err);
    }

    // 7. Save SystemHealthLog
    const log = await prisma.systemHealthLog.create({
      data: {
        database_status,
        database_latency,
        redis_status,
        smtp_status,
        gdrive_status,
        telegram_status,
        ai_status,
        disk_usage,
        backup_status,
        details: {
          uptime_seconds: health.server.uptime_seconds,
          memory_used_mb: health.server.memory_used_mb,
          cpu_cores: health.system.cpu_cores,
          free_memory_gb: health.system.free_memory_gb,
          total_memory_gb: health.system.total_memory_gb,
          os_type: health.system.os_type,
          hostname: health.system.hostname,
          queue_active_jobs: fullHealth.services.queue.active_jobs,
          queue_failed_jobs: fullHealth.services.queue.failed_jobs,
          storage_uploads_count: fullHealth.services.storage.uploads_count,
          ocr_watchdog: {
            status: ocr_watchdog_status,
            reason: ocr_degraded_reason
          }
        }
      }
    });

    console.log(`[HealthHistoryService] Logged hourly health snapshot. Database status: ${database_status}`);
    return log;
  }
}
