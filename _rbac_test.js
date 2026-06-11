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
  if (login.status !== 200) { console.error('LOGIN FAIL', login.body); process.exit(1); }
  const j = (login.jar || {});
  const hdr = j['hisecure.sid'] ? { Cookie: 'hisecure.sid=' + j['hisecure.sid'] } : {};
  const modules = [
    ['/api/users?limit=1', 'users'],
    ['/api/technicians', 'technicians'],
    ['/api/complaints?limit=1', 'complaints'],
    ['/api/amc/contracts?limit=1', 'amc'],
    ['/api/repairs?limit=1', 'repairs'],
    ['/api/tickets?limit=1', 'service_tickets'],
    ['/api/settings', 'settings'],
    ['/api/dashboard', 'dashboard'],
    ['/api/reports/stats', 'reports'],
    ['/api/products?limit=1', 'products'],
    ['/api/customers?limit=1', 'customers'],
    ['/api/payments?limit=1', 'payments'],
    ['/api/parts?limit=1', 'parts'],
    ['/api/suppliers?limit=1', 'suppliers'],
    ['/api/stores?limit=1', 'stores'],
    ['/api/invoices?limit=1', 'invoices'],
    ['/api/accounting?limit=1', 'accounting'],
  ];
  const results = {};
  for (const [path, mod] of modules) {
    const out = await req({ host: 'localhost', port: 3099, path, method: 'GET', headers: hdr });
    results[mod] = out.status === 200 ? (out.body.ok === false ? 'FAIL(ok=false)' : 'PASS') : ('status=' + out.status + ' ' + JSON.stringify(out.body).slice(0, 80));
  }
  const rbacReport = {
  suite: 'RBAC',
  timestamp: new Date().toISOString(),
  login: login.status,
  results,
  passCount: Object.values(results).filter(v => v === 'PASS').length,
  failCount: Object.values(results).filter(v => v.startsWith('FAIL') || v.startsWith('status=')).length,
  total: modules.length,
  verdict: (() => { const fails = Object.values(results).filter(v => v.startsWith('FAIL') || v.startsWith('status=')).length; return fails === 0 ? 'PASS' : 'FAIL'; })()
};
fs.writeFileSync('C:/Users/Admin/Desktop/Calude Test/erp-app/_results_rbac.json', JSON.stringify(rbacReport, null, 2));
console.log(JSON.stringify(rbacReport, null, 2));
  process.exit(0);
})();
