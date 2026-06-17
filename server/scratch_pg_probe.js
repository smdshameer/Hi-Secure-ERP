const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    // 1. Check file_hash unique index (may be an index, not a constraint)
    const idx = await p.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname='public' AND tablename='catalog_import_sessions'
      AND indexdef ILIKE '%file_hash%'`;
    console.log('FILE_HASH_INDEX count=' + idx.length);
    idx.forEach(i => console.log('  INDEX: ' + i.indexname + ' -> ' + i.indexdef));

    // 2. Check for any unique on file_hash
    const uq = await p.$queryRaw`
      SELECT i.relname as index_name, ix.indisunique as is_unique
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = 'catalog_import_sessions'
        AND a.attname = 'file_hash'`;
    console.log('FILE_HASH_UNIQUE exists=' + (uq.some(r => r.is_unique)));
    uq.forEach(u => console.log('  ' + u.index_name + ' unique=' + u.is_unique));

    // 3. Check pending migrations
    const pending = await p.$queryRaw`
      SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL`;
    console.log('PENDING_MIGRATIONS=' + pending.length);

    // 4. Confirm latest applied migration
    const latest = await p.$queryRaw`
      SELECT migration_name, finished_at FROM _prisma_migrations
      WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 3`;
    latest.forEach(m => console.log('APPLIED: ' + m.migration_name));

  } catch(e) {
    console.log('ERROR ' + e.message);
  } finally {
    await p.$disconnect();
  }
})();
