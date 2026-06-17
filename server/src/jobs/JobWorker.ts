import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { jobQueue, JobPayload } from './JobQueue';
import { sendEmail } from '../services/emailService';
import { prisma } from '../index';
import { AuditService } from '../services/AuditService';
import { NotificationService } from '../services/NotificationService';
import { CatalogParserService } from '../services/CatalogParserService';

class JobWorkerService {
  private bullWorker: Worker | null = null;
  private isProcessingInMemory = false;
  private maxRetries = 3;

  constructor() {
    this.initializeWorker();
  }

  private async initializeWorker() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
        this.bullWorker = new Worker('default', async (job) => {
          console.log(`[JobWorker] Processing BullMQ job: ${job.name}`);
          await this.executeJob(job.name as any, job.data);
        }, { connection: connection as any });

        this.bullWorker.on('failed', async (job, err) => {
          console.error(`[JobWorker] BullMQ job failed: ${job?.name}. Error: ${err.message}`);
          if (job) {
            await this.logToDLQ({ type: job.name as any, data: job.data }, err.message);
          }
        });

        console.log('[JobWorker] BullMQ worker initialized.');
      } catch (err: any) {
        console.warn(`[JobWorker] Redis worker connection failed: ${err.message}. Running in-memory worker.`);
        this.startInMemoryWorker();
      }
    } else {
      this.startInMemoryWorker();
    }
  }

  private startInMemoryWorker() {
    console.log('[JobWorker] Starting in-memory worker polling loop...');
    jobQueue.registerJobAddedCallback(() => {
      this.processInMemoryQueue();
    });
    // Run once at start in case jobs were queued before initialization
    this.processInMemoryQueue();
  }

  private async processInMemoryQueue() {
    if (this.isProcessingInMemory) return;
    this.isProcessingInMemory = true;

    while (jobQueue.getInMemoryQueueLength() > 0) {
      const job = jobQueue.popInMemoryJob();
      if (!job) continue;

      try {
        console.log(`[JobWorker] Processing in-memory job: ${job.type}`);
        await this.executeJob(job.type, job.data);
        console.log(`[JobWorker] Completed in-memory job: ${job.type}`);
      } catch (err: any) {
        console.error(`[JobWorker] In-memory job failed: ${job.type}. Error: ${err.message}`);
        job.retries = (job.retries || 0) + 1;
        if (job.retries <= this.maxRetries) {
          console.log(`[JobWorker] Retrying in-memory job: ${job.type} (${job.retries}/${this.maxRetries})`);
          jobQueue.pushInMemoryJob(job);
        } else {
          console.error(`[JobWorker] In-memory job DLQ limit reached: ${job.type}`);
          await this.logToDLQ(job, err.message);
        }
      }

      // 100ms pause between jobs
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessingInMemory = false;
  }

  private async executeJob(type: string, data: any) {
    switch (type) {
      case 'EMAIL_SEND': {
        const { to, subject, html } = data;
        const result = await sendEmail(to, subject, html);
        if (!result.success) {
          throw new Error(result.error || 'SMTP send failure');
        }
        break;
      }
      case 'GST_VALIDATION': {
        console.log(`[JobWorker] Background GST Validation for: ${data.gstin}`);
        break;
      }
      case 'PDF_GENERATION': {
        console.log(`[JobWorker] Background PDF Generation for: ${data.invoiceId}`);
        break;
      }
      case 'REPORT_EXPORT': {
        console.log(`[JobWorker] Background Report Export: ${data.reportName}`);
        break;
      }
      case 'NOTIFICATION': {
        console.log(`[JobWorker] Background Notification low stock check starting...`);
        try {
          const parts = await prisma.parts.findMany({
            where: { is_active: true },
            include: { stocks: true }
          });
          
          let alertCount = 0;
          for (const part of parts) {
            const totalQty = part.stocks.reduce((acc, curr) => acc + curr.quantity, 0);
            if (totalQty <= part.reorder_level) {
              const message = `Low stock alert: Part "${part.name}" (SKU: ${part.part_number}) is below reorder level. Current: ${totalQty}, Reorder level: ${part.reorder_level}.`;
              
              // Prevent duplicate notification spamming if an unread one already exists with the same message
              const existing = await prisma.notification.findFirst({
                where: {
                  message,
                  read_status: false
                }
              });
              
              if (!existing) {
                // Send alert to admin (role_id: 1)
                await NotificationService.createNotification({
                  role_id: 1,
                  type: 'LOW_STOCK',
                  message,
                  priority: 'medium'
                });
                // Send alert to inventory manager (role_id: 5)
                await NotificationService.createNotification({
                  role_id: 5,
                  type: 'LOW_STOCK',
                  message,
                  priority: 'medium'
                });
                alertCount++;
              }
            }
          }
          console.log(`[JobWorker] Low stock notification check finished. Generated ${alertCount} new alert messages.`);
        } catch (err: any) {
          console.error('[JobWorker] Error in NOTIFICATION worker job:', err);
          throw err;
        }
        break;
      }
      case 'CATALOG_IMPORT': {
        const { filePath, supplierId, uploadedBy, fileName } = data;
        const fs = require('fs');
        
        console.log(`[JobWorker] Starting background catalog parse (Safe Validation Mode) for supplier ${supplierId}: ${filePath}`);
        
        try {
          if (!fs.existsSync(filePath)) {
            throw new Error(`Catalog file not found: ${filePath}`);
          }
          const fileBuffer = fs.readFileSync(filePath);
          
          // Call the CatalogParserService to run the preview parsing pipeline
          const result = await CatalogParserService.parseCatalog(
            fileBuffer,
            fileName || 'catalog.pdf',
            supplierId,
            uploadedBy || 1
          );
          
          console.log(`[JobWorker] Completed background catalog parsing (Safe Validation Mode). Session ID: ${result.sessionId}. Found ${result.totalProducts} products.`);
          
          try {
            const { BusinessEventService } = require('../services/BusinessEventService');
            await BusinessEventService.logEvent({
              event_type: 'Large Catalog Parsed Background',
              entity_type: 'Supplier',
              entity_id: supplierId,
              description: `Successfully parsed ${result.performance.ocrTimeMs}ms OCR, ${result.totalProducts} products. Session ID: ${result.sessionId}. Preview generated (Safe Validation Mode).`
            });
          } catch (e) {
            console.error('Failed to log catalog parse event:', e);
          }
          
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.warn('Failed to delete catalog temp file:', e);
          }
        } catch (err: any) {
          console.error('[JobWorker] Catalog parsing background task failed:', err);
          throw err;
        }
        break;
      }
      default:
        throw new Error(`Job type executor not implemented: ${type}`);
    }
  }

  private async logToDLQ(job: JobPayload, errorMessage: string) {
    try {
      await AuditService.log(
        null,
        'SYSTEM_WORKER',
        'JOB_FAILURE',
        'BackgroundJob',
        0,
        { jobType: job.type, data: job.data },
        { error: errorMessage, status: 'FAILED_DLQ', timestamp: new Date().toISOString() }
      );
      console.log(`[JobWorker] Job failure logged to Audit trail (DLQ).`);
    } catch (e) {
      console.error('[JobWorker] Failed to write to DLQ:', e);
    }
  }

  async shutdown() {
    console.log('[JobWorker] Shutting down job worker...');
    if (this.bullWorker) {
      await this.bullWorker.close();
    }
    this.isProcessingInMemory = false;
  }
}

export const jobWorker = new JobWorkerService();