const http = require('http');

function req(opts, body) {
  return new Promise((resolve, reject) => {
    const b = body ? Buffer.from(JSON.stringify(body)) : null;
    const hdrs = { ...(opts.headers || {}), 'Content-Type': 'application/json' };
    if (b) hdrs['Content-Length'] = b.length;
    const q = http.request({ ...opts, headers: hdrs }, (resp) => {
      const ch = [];
      resp.on('data', c => ch.push(c));
      resp.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(Buffer.concat(ch).toString()); } catch { parsed = Buffer.concat(ch).toString(); }
        resolve({ status: resp.statusCode, body: parsed });
      });
    });
    q.on('error', reject);
    if (b) q.write(b);
    q.end();
  });
}

(async () => {
  const r = await req({ host: 'localhost', port: 3099, path: '/api/auth/login', method: 'POST' },
    { username: 'admin', password: 'admin@123' });
  console.log('Status:', r.status);
  console.log('Body:', JSON.stringify(r.body));
  process.exit(r.status === 200 && r.body.ok ? 0 : 1);
})();
