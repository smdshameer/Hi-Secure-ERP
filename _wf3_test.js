require('dotenv').config({ override: true, quiet: true });
const http = require('http');
const fs = require('fs');

function req(opts, body, jar) {
  return new Promise((resolve, reject) => {
    const b = body ? Buffer.from(JSON.stringify(body)) : null;
    const hdrs = { ...(opts.headers || {}), 'Content-Type': 'application/json' };
    if (jar && jar['hisecure.sid']) hdrs.Cookie = 'hisecure.sid=' + jar['hisecure.sid'];
    if (b) hdrs['Content-Length'] = b.length;
    const q = http.request({ ...opts, headers: hdrs }, (resp) => {
      const ch = [];
      resp.on('data', c => ch.push(c));
      resp.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(Buffer.concat(ch).toString()); } catch { parsed = ch.toString(); }
        const sc = resp.headers['set-cookie'];
        const jarOut = { ...(jar || {}) };
        if (sc) sc.forEach(s => { const m = s.match(/hisecure\.sid=([^;]+)/); if (m) jarOut['hisecure.sid'] = m[1]; });
        resolve({ status: resp.statusCode, body: parsed, jar: jarOut });
      });
    });
    q.on('error', reject);
    if (b) q.write(b);
    q.end();
  });
}

(async () => {
  const login = await req({ host: 'localhost', port: 3099, path: '/api/auth/login', method: 'POST' }, { username: 'admin', password: 'admin@123' });
  if (login.status !== 200) { console.error('LOGIN FAIL'); process.exit(1); }
  const j = (login.jar || {});
  const hdr = j['hisecure.sid'] ? { Cookie: 'hisecure.sid=' + j['hisecure.sid'] } : {};
  const out = {};

  // Pre-flight customer
  const custList = await req({ host: 'localhost', port: 3099, path: '/api/customers?limit=1', method: 'GET', headers: hdr });
  const cid = custList.body?.data?.[0]?.customer_id;
  out.customer_seeded = cid || 'MISSING';

  if (cid) {
    // PRE-FLIGHT: technician exists
    const techList = await req({ host: 'localhost', port: 3099, path: '/api/technicians?limit=5', method: 'GET', headers: hdr });
    const techId = techList.body?.data?.[0]?.technician_id;
    out.technician_seeded = techId || 'NONE';

    // 1. CREATE AMC contract
    const amc1 = await req({ host: 'localhost', port: 3099, path: '/api/amc/contracts', method: 'POST' }, { customer_id: cid, contract_type: 'annual', start_date: '2026-06-05', end_date: '2027-06-05', terms: 'Prod validation AMC' }, hdr);
    out.create_amc = amc1.status === 200 ? 'PASS' : 'FAIL: ' + JSON.stringify(amc1.body).slice(0, 120);
    const amcId = amc1.body?.data?.amc_id;

    // 2. READ AMC contract
    const amc2 = amcId ? await req({ host: 'localhost', port: 3099, path: '/api/amc/contracts/' + amcId, method: 'GET', headers: hdr }) : { status: 0 };
    out.read_amc = amc2.status === 200 ? 'PASS' : 'FAIL';

    // 3. STATUS: draft -> active
    const amc3 = amcId ? await req({ host: 'localhost', port: 3099, path: '/api/amc/contracts/' + amcId + '/activate', method: 'POST' }, null, hdr) : { status: 0 };
    out.amc_activate = amc3.status === 200 ? 'PASS' : 'FAIL';

    // 4. READ post-activate
    const amc4 = amcId ? await req({ host: 'localhost', port: 3099, path: '/api/amc/contracts/' + amcId, method: 'GET', headers: hdr }) : { status: 0 };
    out.amc_post_activate_read = amc4.status === 200 && amc4.body?.data?.status === 'active' ? 'PASS' : 'FAIL';

    // 5. LIST AMC contracts
    const amcList = await req({ host: 'localhost', port: 3099, path: '/api/amc/contracts?limit=10', method: 'GET', headers: hdr });
    out.list_amc = amcList.status === 200 ? 'PASS (n=' + (amcList.body.data || []).length + ')' : 'FAIL';

    // 6. AMC STATS
    const amcStats = await req({ host: 'localhost', port: 3099, path: '/api/amc/stats', method: 'GET', headers: hdr });
    out.amc_stats = amcStats.status === 200 ? 'PASS' : 'FAIL';

    // 7. CREATE AMC asset
    const asset1 = await req({ host: 'localhost', port: 3099, path: '/api/amc/assets', method: 'POST' }, { amc_id: amcId, asset_type: 'equipment', serial_number: 'SN-PROD-' + Date.now(), is_active: true }, hdr);
    out.create_amc_asset = asset1.status === 200 ? 'PASS' : 'FAIL: ' + JSON.stringify(asset1.body).slice(0, 100);
    const assetId = asset1.body?.data?.asset_id;

    // 8. READ AMC asset
    const asset2 = assetId ? await req({ host: 'localhost', port: 3099, path: '/api/amc/assets/' + assetId, method: 'GET', headers: hdr }) : { status: 0 };
    out.read_amc_asset = asset2.status === 200 ? 'PASS' : 'FAIL';

    // 9. CREATE AMC visit
    const visit1 = await req({ host: 'localhost', port: 3099, path: '/api/amc/visits', method: 'POST' }, { amc_id: amcId, scheduled_date: '2026-06-05', technician_id: techId, notes: 'Prod validation visit' }, hdr);
    out.create_amc_visit = visit1.status === 200 ? 'PASS' : 'FAIL: ' + JSON.stringify(visit1.body).slice(0, 100);
    const visitId = visit1.body?.data?.visit_id;

    // 10. READ AMC visit
    const visit2 = visitId ? await req({ host: 'localhost', port: 3099, path: '/api/amc/visits/' + visitId, method: 'GET', headers: hdr }) : { status: 0 };
    out.read_amc_visit = visit2.status === 200 ? 'PASS' : 'FAIL';

    // 11. LIST AMC visits
    const visitList = await req({ host: 'localhost', port: 3099, path: '/api/amc/visits?amc_id=' + amcId, method: 'GET', headers: hdr });
    out.list_amc_visits = visitList.status === 200 ? 'PASS (n=' + (visitList.body.data || []).length + ')' : 'FAIL';

    // 12. LIST AMC assets
    const assetList = await req({ host: 'localhost', port: 3099, path: '/api/amc/assets?amc_id=' + amcId, method: 'GET', headers: hdr });
    out.list_amc_assets = assetList.status === 200 ? 'PASS (n=' + (assetList.body.data || []).length + ')' : 'FAIL';

    // 13. CREATE repair linked to customer (repair flow completion)
    const rep1 = await req({ host: 'localhost', port: 3099, path: '/api/repairs', method: 'POST' }, { customer_id: cid, product_type: 'AC', problem_description: 'ProdWF3 Cooling issue', brand_id: 1, warranty_status: 'out_of_warranty' }, hdr);
    out.create_repair = rep1.status === 200 ? 'PASS' : 'FAIL: ' + JSON.stringify(rep1.body).slice(0, 100);
    const repId = rep1.body?.data?.repair_id;

    if (repId) {
      // STATUS: received -> in_progress
      const repS1 = await req({ host: 'localhost', port: 3099, path: '/api/repairs/' + repId + '/status', method: 'PUT' }, { status: 'in_progress' }, hdr);
      out.repair_received_to_progress = repS1.status === 200 ? 'PASS' : 'FAIL';

      // STATUS: in_progress -> completed
      const repS2 = await req({ host: 'localhost', port: 3099, path: '/api/repairs/' + repId + '/status', method: 'PUT' }, { status: 'completed' }, hdr);
      out.repair_progress_to_completed = repS2.status === 200 ? 'PASS' : 'FAIL';

      // STATUS: completed -> delivered (terminal)
      const repS3 = await req({ host: 'localhost', port: 3099, path: '/api/repairs/' + repId + '/status', method: 'PUT' }, { status: 'delivered' }, hdr);
      out.repair_completed_to_delivered = repS3.status === 200 ? 'PASS' : 'FAIL';

      // READ repair after terminal
      const repR = await req({ host: 'localhost', port: 3099, path: '/api/repairs/' + repId, method: 'GET', headers: hdr });
      out.repair_post_terminal_read = repR.status === 200 ? 'PASS' : 'FAIL';

      // REPAIR STATS
      const repStats = await req({ host: 'localhost', port: 3099, path: '/api/repairs/recent?limit=5', method: 'GET', headers: hdr });
      out.repair_recent = repStats.status === 200 ? 'PASS' : 'FAIL';

      // CANNOT re-open delivered repair (terminal block)
      const repBlock = await req({ host: 'localhost', port: 3099, path: '/api/repairs/' + repId + '/status', method: 'PUT' }, { status: 'in_progress' }, hdr);
      out.repair_terminal_block = repBlock.status === 400 || (repBlock.status === 200 && repBlock.body?.ok === false) ? 'PASS (blocked)' : 'FAIL (allowed reopen)';
    }

    // 14. FILTER AMC by customer
    const amcCustFilter = await req({ host: 'localhost', port: 3099, path: '/api/amc/contracts?customer_id=' + cid, method: 'GET', headers: hdr });
    out.amc_filter_by_customer = amcCustFilter.status === 200 ? 'PASS' : 'FAIL';

    // 15. AMC contract UPDATE
    const amcUpd = amcId ? await req({ host: 'localhost', port: 3099, path: '/api/amc/contracts/' + amcId, method: 'PUT' }, { terms: 'Updated via prod validation' }, hdr) : { status: 0 };
    out.amc_update = amcUpd.status === 200 ? 'PASS' : 'FAIL';
  }

  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
})();
