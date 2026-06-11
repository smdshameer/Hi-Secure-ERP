const http = require('http');

function req(opts, body) {
  return new Promise((resolve, reject) => {
    const b = body ? Buffer.from(JSON.stringify(body)) : null;
    console.log('=== REQUEST OPTS ===');
    console.log('host:', opts.host);
    console.log('port:', opts.port);
    console.log('path:', opts.path);
    console.log('method:', opts.method);
    console.log('headers:', JSON.stringify(opts.headers, null, 2));
    if (b) console.log('body:', b.toString());

    const q = http.request(opts, (resp) => {
      const ch = [];
      resp.on('data', c => ch.push(c));
      resp.on('end', () => {
        console.log('=== RESPONSE ===');
        console.log('status:', resp.statusCode);
        console.log('headers:', JSON.stringify(resp.headers, null, 2));
        console.log('body:', Buffer.concat(ch).toString());
        resolve({ status: resp.statusCode, headers: resp.headers });
      });
    });
    q.on('error', reject);
    if (b) q.write(b);
    q.end();
  });
}

(async () => {
  await req({
    host: 'localhost',
    port: 3099,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }, {
    username: 'admin',
    password: 'admin@123'
  });
})().catch(e => console.error(e));


