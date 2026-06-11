var http = require('http');

function req(opts, body) {
  return new Promise(function (resolve, reject) {
    var b = body ? Buffer.from(JSON.stringify(body)) : null;
    var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers);
    if (b) headers['Content-Length'] = b.length;
    var r = http.request(opts, function (res) {
      var chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () {
        var parsed;
        try { parsed = JSON.parse(Buffer.concat(chunks).toString()); }
        catch (err) { parsed = Buffer.concat(chunks).toString(); }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });
    r.on('error', reject);
    if (b) r.write(b);
    r.end();
  });
}

Promise.resolve()
  .then(function () {
    return req({ hostname: 'localhost', port: 3099, path: '/api/auth/login', method: 'POST' },
      { username: 'admin', password: 'admin123' });
  })
  .then(function (login) {
    console.log('LOGIN:', login.status, login.body.ok ? 'OK' : (login.body.error || JSON.stringify(login.body)));
    var raw = login.headers['set-cookie'];
    var cookie = raw ? 'hisecure.sid=' + raw[0].split(';')[0].split('=')[1] : '';
    console.log('COOKIE:', cookie.substring(0, 40) + '...');
    return { cookie: cookie };
  })
  .then(function (ct) {
    return req({ hostname: 'localhost', port: 3099, path: '/api/auth/session', headers: { Cookie: ct.cookie } });
  })
  .then(function (s) {
    console.log('SESSION:', s.status, s.body.user ? ('user=' + s.body.user.username) : JSON.stringify(s.body));
  })
  .catch(function (e) { console.error('FATAL:', e.message); });
