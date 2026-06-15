import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export type JobType = 'EMAIL_SEND' | 'GST_VALIDATION' | 'PDF_GENERATION' | 'REPORT_EXPORT' | 'NOTIFICATION';

export interface JobPayload {
  type: JobType;
  data: any;
  retries?: number;
}

class JobQueueService {
  private bullQueue: Queue | null = null;
  private redisClient: IORedis | null = null;
  private inMemoryQueue: JobPayload[] = [];
  private onJobAddedCallbacks: (() => void)[] = [];

  constructor() {
    this.initializeQueue();
  }

  private async initializeQueue() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        console.log('[JobQueue] Attempting connection to Redis...');
        this.redisClient = new IORedis(redisUrl, { maxRetriesPerRequest: null });
        this.bullQueue = new Queue('default', { connection: this.redisClient as any });
        console.log('[JobQueue] BullMQ initialized successfully with Redis.');
      } catch (err: any) {
        console.warn(`[JobQueue] Redis connection failed: ${err.message}. Falling back to in-memory queue.`);
        this.bullQueue = null;
      }
    } else {
      console.log('[JobQueue] No REDIS_URL found. Running in-memory queue fallback.');
    }
  }

  async addJob(type: JobType, data: any) {
    if (this.bullQueue) {
      try {
        await this.bullQueue.add(type, data, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 }
        });
        console.log(`[JobQueue] Enqueued BullMQ job: ${type}`);
        return;
      } catch (err: any) {
        console.warn(`[JobQueue] Failed to add BullMQ job: ${err.message}. Falling back to in-memory queue.`);
      }
    }

    // In-memory queue logic
    this.inMemoryQueue.push({ type, data, retries: 0 });
    console.log(`[JobQueue] Enqueued in-memory job: ${type}`);
    this.triggerJobAdded();
  }

  registerJobAddedCallback(callback: () => void) {
    this.onJobAddedCallbacks.push(callback);
  }

  private triggerJobAdded() {
    for (const callback of this.onJobAddedCallbacks) {
      callback();
    }
  }

  popInMemoryJob(): JobPayload | undefined {
    return this.inMemoryQueue.shift();
  }

  pushInMemoryJob(job: JobPayload) {
    this.inMemoryQueue.push(job);
  }

  getInMemoryQueueLength(): number {
    return this.inMemoryQueue.length;
  }

  async getStats() {
    if (this.bullQueue) {
      try {
        const counts = await this.bullQueue.getJobCounts('active', 'failed');
        return {
          active: counts.active || 0,
          failed: counts.failed || 0
        };
      } catch {
        return { active: 0, failed: 0 };
      }
    }
    return {
      active: this.inMemoryQueue.length,
      failed: 0
    };
  }
}

export const jobQueue = new JobQueueService();