const fs = require('fs');

let src = fs.readFileSync('models/customer-assets.js', 'utf8');

// Find and fix searchAssets by replacing the clauses array construction
// We need to replace:
//   const q = `%${query}%`;
//   params.push(q, q, q, q);
//   const start = params.length - 3;
//   clauses.push(`(ca.serial_number ILIKE $${start} OR ...)`);
// With safe string concatenation

const marker = "async function searchAssets";
const startIdx = src.indexOf(marker);
const endIdx = src.indexOf("module.exports", startIdx);

const fnStart = src.substring(0, startIdx);
const fnEnd = src.substring(endIdx);

const newFn = `async function searchAssets(query, filters = {}, limit = 20, offset = 0) {
  const params = [];
  const clauses = [];
  const q = '%' + query + '%';

  // build search clause with manual placeholder numbering
  const s1 = '$' + (params.length + 1), s2 = '$' + (params.length + 2);
  const s3 = '$' + (params.length + 3), s4 = '$' + (params.length + 4);
  clauses.push('(ca.serial_number ILIKE ' + s1 + ' OR ca.model ILIKE ' + s2 + ' OR ca.brand ILIKE ' + s3 + ' OR c.name ILIKE ' + s4 + ')');
  params.push(q, q, q, q);

  Object.entries(filters).forEach(([k, v]) => {
    if (!v || v === 'all') return;
    if (k === 'customer_id') { clauses.push('ca.customer_id = $' + (params.length + 1)); params.push(+v); return; }
    if (k === 'asset_type') { clauses.push('ca.asset_type = $' + (params.length + 1)); params.push(v); return; }
    if (k === 'status') { clauses.push('ca.status = $' + (params.length + 1)); params.push(v); return; }
  });

  const whereClause = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

  const countRow = await pool.query(
    'SELECT COUNT(*)::int FROM customer_assets ca LEFT JOIN customers c ON c.customer_id = ca.customer_id ' + whereClause,
    params
  );

  const rows = await pool.query(
    'SELECT ca.*, c.name AS customer_name FROM customer_assets ca LEFT JOIN customers c ON c.customer_id = ca.customer_id ' + whereClause + ' ORDER BY ca.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2),
    [...params, Math.min(limit, 100), offset]
  );

  return { items: rows.rows, total: countRow.rows[0]?.total ?? 0, limit, offset };
}
`;

const result = fnStart + newFn + fnEnd;
fs.writeFileSync('models/customer-assets.js', result);
console.log('Rewrote searchAssets with string concatenation');
