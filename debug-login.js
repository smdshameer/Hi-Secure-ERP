const http = require('http');

const opts = {
  host: 'localhost',
  port: 3099,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};
const body = { username: 'admin', password: 'admin@123' };
const b = Buffer.from(JSON.stringify(body));

// Copy of test-login.js logic EXACTLY
const hdrs = { ...(opts.headers || {}), 'Content-Type': 'application/json' };
if (b) hdrs['Content-Length'] = b.length;

console.log('hdrs:', JSON.stringify(hdrs));
console.log('body:', b.toString());

const q = http.request({ ...opts, headers: hdrs }, (resp) => {
  const ch = [];
  resp.on('data', c => ch.push(c));
  resp.on('end', () => {
    console.log('status:', resp.statusCode);
    console.log('body:', Buffer.concat(ch).toString());
  });
});
q.on('error', e => console.error('ERR:', e.message));
q.write(b);
q.end();
