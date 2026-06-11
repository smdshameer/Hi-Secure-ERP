require('dotenv').config({ override: true, quiet: true });
const http = require('http');

function req(path) {
  return new Promise((resolve, reject) => {
    const u = new URL('http://localhost:3099' + path);
    const q = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: 'GET' }, (resp) => {
      const ch = [];
      resp.on('data', c => ch.push(c));
      resp.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(Buffer.concat(ch).toString()); } catch { parsed = ch.toString(); }
        resolve({ status: resp.statusCode, body: parsed });
      });
    });
    q.on('error', reject);
    q.setTimeout(8000, () => { q.destroy(); reject(new Error('timeout 8s')); });
    q.end();
  });
}

(async () => {
  const paths = ['/api/auth/login', '/api/auth/session', '/api/users?limit=1', '/api/settings', '/api/dashboard'];
  for (const p of paths) {
    try {
      const r = await req(p);
      if (p === '/api/auth/login') {
        // POST for login
        const u = new URL('http://localhost:3099/api/auth/login');
        const data = Buffer.from(JSON.stringify({ username: 'admin', password: 'admin@123' }));
        const q = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } }, (resp) => {
          const ch = [];
          resp.on('data', c => ch.push(c));
          resp.on('end', () => {
            let parsed;
            try { parsed = JSON.parse(Buffer.concat(ch).toString()); } catch { parsed = ch.toString(); }
            console.log('POST /api/auth/login ->', resp.statusCode, JSON.stringify(parsed).slice(0, 80));
            process.exit(0);
          });
        });
        q.on('error', (e) => { console.error('Login error:', e.message); process.exit(1); });
        q.setTimeout(8000, () => { q.destroy(); console.error('Login timeout'); process.exit(1); });
        q.write(data);
        q.end();
      } else {
        console.log('GET ' + p + ' ->', r.status, JSON.stringify(r.body).slice(0, 60));
      }
    } catch (e) {
      console.log('GET ' + p + ' -> ERROR:', e.message);
    }
  }
  process.exit(0);
})();
