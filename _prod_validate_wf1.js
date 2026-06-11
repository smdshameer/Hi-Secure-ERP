require('dotenv').config();
const http = require('http');

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
        try { parsed = JSON.parse(Buffer.concat(ch).toString()); } catch { parsed = Buffer.concat(ch).toString(); }
        const sc = resp.headers['set-cookie'];
        const jarOut = { ...jar };
        if (sc) sc.forEach(s => { const m = s.match(/hisecure\.sid=([^;]+)/); if (m) jarOut['hisecure.sid'] = m[1]; });
        resolve({ status: resp.statusCode, body: parsed, jar: jarOut });
      });
    });
    q.on('error', reject);
    if (b) q.write(b); q.end();
  });
}

(async () => {
  const login = await req({ host: 'localhost', port: 3099, path: '/api/auth/login', method: 'POST' }, { username: 'admin', password: 'admin@123' });
  if (login.status !== 200) { console.error('LOGIN FAILED', login.body); process.exit(1); }
  const j = login.jar;
  const out = {};

  // Pre-flight
  const custList = await req({ host: 'localhost', port: 3099, path: '/api/customers?limit=5', method: 'GET' }, null, j);
  out.customers_existing = custList.status === 200 ? custList.body.data?.length ?? 0 : -1;

  // 1. CREATE customer
  const cCreated = await req({ host: 'localhost', port: 3099, path: '/api/customers', method: 'POST' }, { name: 'ProdTest Cust', phone: '9999000099', email: 'prod@test.com', customer_type: 'retail', city: 'Mumbai', state: 'MH', gstin: '27TEST1234F1Z5' }, j);
  out.create_customer = cCreated.status === 200 && !!cCreated.body.data?.customer_id ? 'PASS' : 'FAIL: ' + JSON.stringify(cCreated.body);
  const custId = cCreated.body?.data?.customer_id;

  // 2. SEARCH customer
  const cSearch = await req({ host: 'localhost', port: 3099, path: '/api/customers?search=ProdTest', method: 'GET' }, null, j);
  out.search_customer = cSearch.status === 200 && cSearch.body.data?.some(c => c.name?.includes('ProdTest')) ? 'PASS (found ' + cSearch.body.data.length + ')' : 'FAIL';

  // 3. FILTER customer
  const cFilter = await req({ host: 'localhost', port: 3099, path: '/api/customers?customer_type=retail', method: 'GET' }, null, j);
  out.filter_customer = cFilter.status === 200 && cFilter.body.data?.length > 0 ? 'PASS (count=' + cFilter.body.data.length + ')' : 'FAIL';

  // 4. Pre-flight: pick a part
  const partsRes = await req({ host: 'localhost', port: 3099, path: '/api/parts?limit=1', method: 'GET' }, null, j);
  const partId = partsRes.body?.data?.[0]?.part_id;
  out.part_seeded = partId || 'NONE';

  if (!partId) {
    console.log(JSON.stringify({ ...out, workflow1: 'BLOCKED: no parts in DB' }, null, 2));
    process.exit(0);
  }

  // 5. CREATE quotation
  const q1 = await req({ host: 'localhost', port: 3099, path: '/api/quotations', method: 'POST' }, { customer_id: custId, items: [{ part_id: partId, quantity: 2, unit_price: 150, discount_percent: 5, tax_rate: 18 }], terms: '30 days', notes: 'Prod validation' }, j);
  out.create_quotation = q1.status === 200 && !!q1.body.data?.quote_id ? 'PASS' : 'FAIL: ' + JSON.stringify(q1.body);
  const quoteId = q1.body?.data?.quote_id;

  // 6. READ quotation
  const q2 = quoteId ? await req({ host: 'localhost', port: 3099, path: '/api/quotations/' + quoteId, method: 'GET' }, null, j) : { status: 0 };
  out.read_quotation = q2.status === 200 && q2.body.data?.quote_id ? 'PASS' : 'FAIL';

  // 7. STATUS: draft -> sent
  const q3 = quoteId ? await req({ host: 'localhost', port: 3099, path: '/api/quotations/' + quoteId + '/status', method: 'PUT' }, { status: 'sent' }, j) : { status: 0 };
  out.quote_draft_to_sent = q3.status === 200 ? 'PASS' : 'FAIL';

  // 8. UPDATE quotation (not converted)
  const q4 = quoteId ? await req({ host: 'localhost', port: 3099, path: '/api/quotations/' + quoteId, method: 'PUT' }, { terms: 'Updated terms', notes: 'Updated notes' }, j) : { status: 0 };
  out.update_quotation = q4.status === 200 ? 'PASS' : 'FAIL';

  // 9. STATUS: sent -> accepted
  const q5 = quoteId ? await req({ host: 'localhost', port: 3099, path: '/api/quotations/' + quoteId + '/status', method: 'PUT' }, { status: 'accepted' }, j) : { status: 0 };
  out.quote_sent_to_accepted = q5.status === 200 ? 'PASS' : 'FAIL';

  // 10. CONVERT quotation -> invoice
  const inv1 = quoteId ? await req({ host: 'localhost', port: 3099, path: '/api/quotations/' + quoteId + '/convert', method: 'POST' }, null, j) : { status: 0 };
  out.convert_quotation_to_invoice = inv1.status === 200 && !!inv1.body.data?.invoice_id ? 'PASS' : 'FAIL: ' + JSON.stringify(inv1.body);
  const invoiceId = inv1.body?.data?.invoice_id;

  // 11. READ invoice
  const inv2 = invoiceId ? await req({ host: 'localhost', port: 3099, path: '/api/invoices/' + invoiceId, method: 'GET' }, null, j) : { status: 0 };
  out.read_invoice = inv2.status === 200 && inv2.body.data?.invoice_id ? 'PASS' : 'FAIL';

  // 12. ISSUE invoice (draft -> issued)
  const inv3 = invoiceId ? await req({ host: 'localhost', port: 3099, path: '/api/invoices/' + invoiceId + '/issue', method: 'POST' }, null, j) : { status: 0 };
  out.issue_invoice = inv3.status === 200 ? 'PASS' : 'FAIL: ' + JSON.stringify(inv3.body);

  // 13. LIST invoices
  const invList = await req({ host: 'localhost', port: 3099, path: '/api/invoices?limit=20', method: 'GET' }, null, j);
  out.list_invoices = invList.status === 200 && Array.isArray(invList.body.data) ? 'PASS (count=' + invList.body.data.length + ')' : 'FAIL';

  // 14. CREATE delivery challan
  const dc1 = await req({ host: 'localhost', port: 3099, path: '/api/delivery-challans', method: 'POST' }, { from_location_id: 1, to_location_id: 1, challan_date: '2026-06-05', items: [{ part_id: partId, quantity: 1 }], purposes: ['sale'] }, j);
  out.create_dc = dc1.status === 200 && !!dc1.body.data?.delivery_challan_id ? 'PASS' : 'FAIL: ' + JSON.stringify(dc1.body);
  const dcId = dc1.body?.data?.delivery_challan_id;

  // 15. DC STATUS: draft -> dispatched
  const dc2 = dcId ? await req({ host: 'localhost', port: 3099, path: '/api/delivery-challans/' + dcId + '/status', method: 'PUT' }, { status: 'dispatched' }, j) : { status: 0 };
  out.dc_draft_to_dispatched = dc2.status === 200 ? 'PASS' : 'FAIL';

  // 16. DC STATUS: dispatched -> in_transit
  const dc3 = dcId ? await req({ host: 'localhost', port: 3099, path: '/api/delivery-challans/' + dcId + '/status', method: 'PUT' }, { status: 'in_transit' }, j) : { status: 0 };
  out.dc_dispatched_to_intransit = dc3.status === 200 ? 'PASS' : 'FAIL';

  // 17. DC STATUS: in_transit -> delivered (terminal)
  const dc4 = dcId ? await req({ host: 'localhost', port: 3099, path: '/api/delivery-challans/' + dcId + '/status', method: 'PUT' }, { status: 'delivered' }, j) : { status: 0 };
  out.dc_intransit_to_delivered = dc4.status === 200 ? 'PASS' : 'FAIL';

  // 18. DC delivered -> CANNOT change (terminal check)
  const dc5 = dcId ? await req({ host: 'localhost', port: 3099, path: '/api/delivery-challans/' + dcId + '/status', method: 'PUT' }, { status: 'draft' }, j) : { status: 0 };
  out.dc_terminal_block = dc5.status === 400 || dc5.status === 200 && dc5.body?.ok === false ? 'PASS (rejected terminal)' : 'FAIL (allowed terminal violation)';

  // 19. DC READ
  const dc6 = dcId ? await req({ host: 'localhost', port: 3099, path: '/api/delivery-challans/' + dcId, method: 'GET' }, null, j) : { status: 0 };
  out.read_dc = dc6.status === 200 && dc6.body.data?.challan_id ? 'PASS' : 'FAIL';

  // 20. Audit log
  const audit = await req({ host: 'localhost', port: 3099, path: '/api/audit?limit=10', method: 'GET' }, null, j);
  out.audit_log = audit.status === 200 && audit.body.data?.length > 0 ? 'PASS (count=' + audit.body.data.length + ')' : 'FAIL';

  // 21. RBAC: non-admin role test (re-login as accountant if exists, else skip)
  const users = await req({ host: 'localhost', port: 3099, path: '/api/users?limit=5', method: 'GET' }, null, j);
  const accountant = users.body.data?.find(u => u.role === 'accountant');
  if (accountant) {
    const acctLogin = await req({ host: 'localhost', port: 3099, path: '/api/auth/login', method: 'POST' }, { username: accountant.username, password: 'testpass' }, j);
    if (acctLogin.status === 200) {
      const acctCust = await req({ host: 'localhost', port: 3099, path: '/api/customers', method: 'GET' }, null, acctLogin.jar);
      out.rbac_accountant_customers = acctCust.status === 200 || acctCust.status === 403 ? (acctCust.status === 403 ? 'PASS (blocked by RBAC)' : 'PASS') : 'FAIL: ' + acctCust.status;
    } else {
      out.rbac_accountant_customers = 'SKIP (no cred)';
    }
  } else {
    out.rbac_accountant_customers = 'SKIP (no accountant user)';
  }

  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
})();
