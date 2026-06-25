import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { hisecureSchema, Job, Visit, VisitAttachment, SyncQueueItem } from './schema';
import { api } from '../services/api';

// Initialize WatermelonDB for offline-first storage
const adapter = new SQLiteAdapter({
  schema: hisecureSchema,
  jsi: false, // Use old bridge for broader React Native compatibility
});

export const database = new Database({
  adapter,
  modelClasses: [Job, Visit, VisitAttachment, SyncQueueItem],
});

// Sync jobs from server to local DB
export async function syncJobs(jobs: any[]): Promise<void> {
  await database.write(async () => {
    const jobsCollection = database.get('jobs');
    // Clear old data and insert fresh
    await jobsCollection.query().destroyAllPermanently();
    for (const job of jobs) {
      await jobsCollection.create((j: any) => {
        j._raw = job; // Store full JSON
      });
    }
  });
}

// Load cached jobs instantly from local DB (used while fetching from server)
export async function getCachedJobs(): Promise<any[]> {
  const jobsCollection = database.get('jobs');
  const records = await jobsCollection.query().fetch();
  return records.map((r: any) => (r as any)._raw).filter(Boolean);
}

// Fetch jobs from server and cache them
export async function fetchAndCacheJobs(token: string): Promise<any[]> {
  api.setToken(token);
  const jobs = await api.getJobs();
  await syncJobs(jobs);
  return jobs;
}
