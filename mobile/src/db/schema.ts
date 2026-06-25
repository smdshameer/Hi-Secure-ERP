import { appSchema, tableSchema } from '@nozbe/watermelondb';
import { Job, Visit, VisitAttachment, SyncQueueItem } from './models';

export const hisecureSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
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
    }),
    tableSchema({
      name: 'visits',
      columns: [
        { name: 'job_id', type: 'string', isIndexed: true },
        { name: 'visit_date', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'findings', type: 'string', isOptional: true },
        { name: 'signature_url', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'visit_attachments',
      columns: [
        { name: 'visit_id', type: 'string', isIndexed: true },
        { name: 'file_url', type: 'string' },
        { name: 'file_name', type: 'string' },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'entity_type', type: 'string' },
        { name: 'operation', type: 'string' },
        { name: 'payload', type: 'string' },
        { name: 'timestamp', type: 'number' },
        { name: 'status', type: 'string' },
      ],
    }),
  ],
});
