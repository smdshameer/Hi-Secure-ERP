const http = require('http');

function httpReq(opts, data) {
  return new Promise((resolve, reject) => {
    const body = data ? Buffer.from(JSON.stringify(data)) : null;
    const o = { ...opts, headers: { ...opts.headers, 'Content-Type': 'application/json' } };
    if (body) o.headers['Content-Length'] = body.length;
    const r = http.request(o, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(Buffer.concat(chunks).toString()) }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}
function httpGet(path, cookie) {
  return httpReq({ hostname: 'localhost', port: 3017, path, headers: cookie ? { Cookie: cookie } : {} });
}
function httpPost(path, body) { return httpReq({ hostname: 'localhost', port: 3017, path, method: 'POST' }, body); }

(async () => {
  try {
    const login = await httpPost('/api/auth/login', { username: 'admin', password: 'admin123' });
    console.log('LOGIN:', login.status, login.body.ok ? 'OK' : login.body.error || login.body);

    // Extract cookie from raw headers
    const rawCookie = login.headers['set-cookie'];
    const cookie = rawCookie ? 'hisecure.sid=' + rawCookie[0].split(';')[0].split('=')[1] : '';
    console.log('COOKIE:', cookie.substring(0, 30) + '...');

    const session = await httpGet('/api/auth/session', cookie);
    console.log('SESSION:', session.status, session.body.user ? ('user=' + session.body.user.username) : session.body);

    const amc = await httpGet('/api/amc/stats', cookie);
    console.log('AMC STATS:', amc.status, amc.body.error || amc.body);

    const tk = await httpGet('/api/tickets/stats', cookie);
    console.log('TICKET STATS:', tk.status, tk.body.error || tk.body);

    const tl = await httpGet('/api/tickets?limit=3', cookie);
    console.log('TICKETS:', tl.status, Array.isArray(tl.body?.rows) ? tl.body.rows.length + ' rows' : tl.body);
  } catch (e) {
    console.error('FATAL:', e.message);
  }
  process.exit(0);
})();
