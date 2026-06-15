import os from 'os';
import fs from 'fs';
import path from 'path';
import { prisma } from '../index';
import { jobQueue } from '../jobs/JobQueue';
import { CacheService } from './CacheService';
import nodemailer from 'nodemailer';

export class SystemHealthService {
  static async getFullHealth() {
    const health: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      memory: {
        free_gb: (os.freemem() / 1024 / 1024 / 1024).toFixed(2),
        total_gb: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
        process_rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024)
      },
      services: {
        database: { status: 'unknown', latency_ms: 0 },
        redis: { status: 'unknown' },
        queue: { status: 'healthy', active_jobs: 0, failed_jobs: 0 },
        storage: { status: 'healthy', uploads_dir_exists: false, uploads_count: 0 },
        smtp: { status: 'unknown' },
        gst_service: { status: 'healthy', endpoint: 'https://publicservices.gst.gov.in' }
      }
    };

    // 1. Database Check
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      health.services.database.status = 'healthy';
      health.services.database.latency_ms = Date.now() - start;
    } catch (err: any) {
      health.status = 'degraded';
      health.services.database.status = 'unhealthy';
      health.services.database.error = err.message;
    }

    // 2. Redis Caching Check
    try {
      const redisHealth = await CacheService.checkHealth();
      health.services.redis.status = redisHealth ? 'healthy' : 'inactive_memory_fallback';
    } catch {
      health.services.redis.status = 'inactive_memory_fallback';
    }

    // 3. Queue Check (BullMQ vs Memory fallback stats)
    try {
      if (jobQueue && typeof jobQueue.getStats === 'function') {
        const stats = await jobQueue.getStats();
        health.services.queue.active_jobs = stats.active;
        health.services.queue.failed_jobs = stats.failed;
      }
    } catch {}

    // 4. Storage Check
    try {
      const uploadDir = path.join(process.cwd(), 'uploads');
      const exists = fs.existsSync(uploadDir);
      health.services.storage.uploads_dir_exists = exists;
      if (exists) {
        const files = fs.readdirSync(uploadDir);
        health.services.storage.uploads_count = files.length;
      }
    } catch {}

    // 5. SMTP Relay Check
    try {
      let host = '';
      let port = 587;
      let user = '';
      let pass = '';
      let secure = false;
      let isConfigured = false;

      // Try database settings first
      const row = await prisma.setting.findUnique({ where: { key: 'email' } });
      if (row && row.value) {
        const v = row.value as any;
        host = v.host || '';
        port = Number(v.port) || 587;
        user = v.user || '';
        pass = v.pass || '';
        secure = v.secure === true || v.secure === 'true' || port === 465;
        if (host && user) {
          isConfigured = true;
        }
      }

      // Try env variables if database setting is missing
      if (!isConfigured && process.env.SMTP_HOST) {
        host = process.env.SMTP_HOST;
        port = Number(process.env.SMTP_PORT) || 587;
        user = process.env.SMTP_USER || '';
        pass = process.env.SMTP_PASS || '';
        secure = port === 465;
        isConfigured = true;
      }

      if (!isConfigured) {
        health.services.smtp.status = 'inactive';
        health.services.smtp.error = 'SMTP not configured';
      } else {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: user ? { user, pass } : undefined,
          timeout: 5000 // 5 seconds timeout
        } as any);
        
        let timeoutId: any;
        const verifyPromise = transporter.verify();
        const timeoutPromise = new Promise<boolean>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('SMTP connection timed out')), 5000);
        });
        const verify = await Promise.race([verifyPromise, timeoutPromise]);
        clearTimeout(timeoutId);
        health.services.smtp.status = verify ? 'healthy' : 'failed';
      }
    } catch (err: any) {
      health.services.smtp.status = 'unhealthy';
      health.services.smtp.error = err.message;
    }

    return health;
  }

  static async checkHealth() {
    let dbStatus = 'connected';
    let dbLatencyMs = 0;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
    } catch {
      dbStatus = 'error';
    }
    const uptimeSeconds = process.uptime();
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return {
      status: 'ok',
      server: {
        uptime_seconds: Math.floor(uptimeSeconds),
        node_version: process.version,
        platform: process.platform,
        memory_used_mb: Math.round(mem.rss / 1024 / 1024),
        memory_heap_mb: Math.round(mem.heapUsed / 1024 / 1024),
        memory_heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      },
      system: {
        total_memory_gb: (totalMem / 1024 / 1024 / 1024).toFixed(1),
        free_memory_gb: (freeMem / 1024 / 1024 / 1024).toFixed(1),
        cpu_cores: os.cpus().length,
        os_type: os.type(),
        hostname: os.hostname(),
      },
      database: {
        status: dbStatus,
        latency_ms: dbLatencyMs,
        provider: 'PostgreSQL',
      },
      timestamp: new Date().toISOString(),
    };
  }
}