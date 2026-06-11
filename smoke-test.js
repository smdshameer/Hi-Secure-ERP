const http = require('http');
const cookieJar = [];

function req(opts, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers);
    if (payload) headers['Content-Length'] = payload.length;
    const request = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(Buffer.concat(chunks).toString());
        } catch {
          parsed = Buffer.concat(chunks).toString();
        }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });
    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}

function withCookie(headers = {}) {
  const cookie = cookieJar[0];
  if (!cookie) return headers;
  return Object.assign({}, headers, { Cookie: cookie });
}

(async () => {
  try {
    const login = await req({ hostname: 'localhost', port: 3099, path: '/api/auth/login', method: 'POST' }, { username: 'admin', password: 'admin123' });
    console.log('LOGIN:', login.status, login.body.ok ? 'OK' : login.body.error || login.body);
    const rawCookie = login.headers['set-cookie'];
    const cookie = rawCookie ? 'hisecure.sid=' + rawCookie[0].split(';')[0].split('=')[1] : '';
    cookieJar.push(cookie);
    console.log('COOKIE:', cookie.substring(0, 40));

    const session = await req({ hostname: 'localhost', port: 3099, path: '/api/auth/session', headers: withCookie() });
    console.log('SESSION:', session.status, session.body.user ? 'user=' + session.body.user.username : session.body);

    const amcStats = await req({ hostname: 'localhost', port: 3099, path: '/api/amc/stats', headers: withCookie() });
    console.log('AMC STATS:', amcStats.status, JSON.stringify(amcStats.body));

    const tktStats = await req({ hostname: 'localhost', port: 3099, path: '/api/tickets/stats', headers: withCookie() });
    console.log('TKT STATS:', tktStats.status, JSON.stringify(tktStats.body));

    const tickets = await req({ hostname: 'localhost', port: 3099, path: '/api/tickets?limit=3', headers: withCookie() });
    console.log('TICKETS:', tickets.status, Array.isArray(tickets.body && tickets.body.rows) ? tickets.body.rows.length + ' rows' : JSON.stringify(tickets.body));
  } catch (error) {
    console.error('FATAL:', error.message);
    process.exitCode = 1;
  }
})();
