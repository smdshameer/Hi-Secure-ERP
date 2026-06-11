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
        try { parsed = JSON.parse(Buffer.concat(ch).toString()); } catch { parsed = ch.toString(); }
        const sc = resp.headers['set-cookie'];
        const jarOut = { ...(jar || {}), 'hisecure.sid': undefined };
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
  {
    const login = await req({ host: 'localhost', port: 3099, path: '/api/auth/login', method: 'POST' }, { username: 'admin', password: 'admin@123' });
    console.log('login', login.status, 'body_keys=' + Object.keys(login.body || {}).join(','));
  }

  const login = await req({ host: 'localhost', port: 3099, path: '/api/auth/login', method: 'POST' }, { username: 'admin', password: 'admin@123' });
  const j = (login.jar || {})['hisecure.sid'] || '';
  const headers = j ? { Cookie: 'hisecure.sid=' + j } : {};
  const calls = [
    ['/api/customers?limit=2', 'customers list'],
    ['/api/parts?limit=2', 'parts list'],
    ['/api/quotations?limit=2', 'quotations list'],
    ['/api/audit?limit=2', 'audit list'],
    ['/api/invoices?limit=2', 'invoices list'],
    ['/api/health', 'health'],
  ];
  for (const [path, label] of calls) {
    const out = await req({ host: 'localhost', port: 3099, path, method: 'GET', headers });
    const body = out.body || {};
    console.log(label, 'status=' + out.status, 'body_keys=' + Object.keys(body).join(','));
  }
  process.exit(0);
})();
