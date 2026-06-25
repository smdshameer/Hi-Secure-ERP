import { Model, Q } from '@nozbe/watermelondb';
import { tableSchema } from '@nozbe/watermelondb/adapters/sqlite';

// Import schema columns from schema.ts
export const jobsTable = tableSchema({
  name: 'jobs',
  columns: [
    { name: 'job_number', type: 'string' },
    { name: 'status', type: 'string' },
    { name: 'priority', type: 'string' },
    { name: 'problem_description', type: 'string' },
    { name: 'customer_name', type: 'string' },
    { name: 'customer_phone', type: 'string' },
    { name: 'customer_address', type: 'string' },
    { name: 'created_at', type: 'number' },
  ],
});

export const visitsTable = tableSchema({
  name: 'visits',
  columns: [
    { name: 'job_id', type: 'string', isIndexed: true },
    { name: 'visit_date', type: 'number' },
    { name: 'status', type: 'string' },
    { name: 'findings', type: 'string', isOptional: true },
    { name: 'signature_url', type: 'string', isOptional: true },
  ],
});

export const visitAttachmentsTable = tableSchema({
  name: 'visit_attachments',
  columns: [
    { name: 'visit_id', type: 'string', isIndexed: true },
    { name: 'file_url', type: 'string' },
    { name: 'file_name', type: 'string' },
    { name: 'latitude', type: 'number', isOptional: true },
    { name: 'longitude', type: 'number', isOptional: true },
  ],
});

export const syncQueueTable = tableSchema({
  name: 'sync_queue',
  columns: [
    { name: 'entity_type', type: 'string' },
    { name: 'operation', type: 'string' },
    { name: 'payload', type: 'string' },
    { name: 'timestamp', type: 'number' },
    { name: 'status', type: 'string' },
  ],
});

// Model classes for WatermelonDB
export class Job extends Model {
  static table = 'jobs';
  static associations = {
    visits: { type: 'has_many', foreignKey: 'job_id' },
  };
}

export class Visit extends Model {
  static table = 'visits';
  static associations = {
    jobs: { type: 'belongs_to', key: 'job_id' },
    visit_attachments: { type: 'has_many', foreignKey: 'visit_id' },
  };
}

export class VisitAttachment extends Model {
  static table = 'visit_attachments';
  static associations = {
    visits: { type: 'belongs_to', key: 'visit_id' },
  };
}

export class SyncQueueItem extends Model {
  static table = 'sync_queue';
}
