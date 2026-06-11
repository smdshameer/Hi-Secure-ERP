require('dotenv').config({ override: true, quiet: true });
const http = require('http');
const fs = require('fs');

function req(path, method, body, cookieHeader) {
  return new Promise((resolve, reject) => {
    const url = new URL('http://localhost:3099' + path);
    const b = body ? Buffer.from(JSON.stringify(body)) : null;
    const hdrs = { 'Content-Type': 'application/json' };
    if (cookieHeader) hdrs.Cookie = cookieHeader;
    if (b) hdrs['Content-Length'] = b.length;
    const q = http.request({ hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: hdrs }, (resp) => {
      const ch = [];
      resp.on('data', c => ch.push(c));
      resp.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(Buffer.concat(ch).toString()); } catch { parsed = ch.toString(); }
        const raw = resp.headers['set-cookie'];
        const sc = Array.isArray(raw) ? raw.join('; ') : (raw || '');
        const m = sc.match(/hisecure\.sid=([^;]+)/);
        const newCookie = m ? 'hisecure.sid=' + m[1] : null;
        resolve({ status: resp.statusCode, body: parsed, cookie: newCookie });
      });
    });
    q.on('error', reject);
    if (b) q.write(b);
    q.end();
    setTimeout(() => { q.destroy(); reject(new Error('timeout 15s')); }, 15000);
  });
}

(async () => {
  const login = await req('/api/auth/login', 'POST', { username: 'admin', password: 'admin@123' });
  if (login.status !== 200) { console.error('LOGIN FAIL'); process.exit(1); }
  const cookie = login.cookie;
  console.log('LOGIN: 200');
  const results = {};
  const mods = [
    '/api/users?limit=1', '/api/technicians', '/api/complaints?limit=1',
    '/api/amc/contracts?limit=1', '/api/repairs?limit=1', '/api/tickets?limit=1',
    '/api/settings', '/api/dashboard', '/api/reports/stats', '/api/products?limit=1',
    '/api/customers?limit=1', '/api/payments?limit=1', '/api/parts?limit=1',
    '/api/suppliers?limit=1', '/api/stores?limit=1', '/api/invoices?limit=1', '/api/accounting?limit=1'
  ];
  for (const p of mods) {
    try {
      const r = await req(p, 'GET', null, cookie);
      results[p.split('?')[0].split('/').pop()] = r.status === 200 ? 'PASS' : 'FAIL(' + r.status + ')';
      console.log(p.split('?')[0], results[p.split('?')[0].split('/').pop()]);
    } catch (e) {
      results[p.split('?')[0].split('/').pop()] = 'ERROR: ' + e.message;
      console.log(p.split('?')[0], 'ERROR:', e.message);
    }
  }
  const rbacPass = Object.values(results).filter(v => v === 'PASS').length;
  const rbacFail = Object.values(results).filter(v => v !== 'PASS').length;
  const report = { suite: 'RBAC', timestamp: new Date().toISOString(), login: 200, results, passCount: rbacPass, failCount: rbacFail, total: mods.length, verdict: rbacFail === 0 ? 'PASS' : 'FAIL' };
  fs.writeFileSync('C:/Users/Admin/Desktop/Calude Test/erp-app/_results_rbac.json', JSON.stringify(report, null, 2));
  console.log('\nRBAC:', rbacPass + '/' + mods.length, 'PASS,', rbacFail, 'FAIL, verdict:', report.verdict);
})();
