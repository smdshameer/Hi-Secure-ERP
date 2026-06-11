var http = require('http');
function req(o, body) {
  return new Promise(function (rs, rj) {
    var b = body ? Buffer.from(JSON.stringify(body)) : null;
    var hdrs = { ...(o.headers || {}), 'Content-Type': 'application/json' };
    if (b) hdrs['Content-Length'] = b.length;
    var q = http.request(o, function (resp) {
      var ch = [];
      resp.on('data', function (c) { ch.push(c); });
      resp.on('end', function () {
        try { rs({ status: resp.statusCode, body: JSON.parse(Buffer.concat(ch).toString()), headers: resp.headers }); }
        catch (e) { rs({ status: resp.statusCode, body: Buffer.concat(ch).toString(), headers: resp.headers }); }
      });
    });
    q.on('error', rj);
    if (b) q.write(b);
    q.end();
  });
}

Promise.resolve()
  .then(function () { return req({ host: 'localhost', port: 3099, path: '/api/auth/login', method: 'POST' }, { username: 'admin', password: 'admin123' }); })
  .then(function (login) {
    console.log('LOGIN:', login.status);
    console.log('  body:', JSON.stringify(login.body));
    var ck = login.headers['set-cookie'];
    if (ck) console.log('  set-cookie:', ck[0].substring(0, 60));
    var cookie = ck ? 'hisecure.sid=' + ck[0].split(';')[0].split('=')[1] : '';
    return { cookie: cookie };
  })
  .then(function (ct) {
    return req({ host: 'localhost', port: 3099, path: '/api/auth/session', headers: { Cookie: ct.cookie } });
  })
  .then(function (s) {
    console.log('SESSION:', s.status, JSON.stringify(s.body));
  })
  .then(function () {
    var cookie = '';
    return req({ host: 'localhost', port: 3099, path: '/api/amc/stats', headers: { Cookie: cookie } });
  })
  .then(function (s) {
    console.log('AMC STATS:', s.status, JSON.stringify(s.body));
  })
  .then(function () {
    return req({ host: 'localhost', port: 3099, path: '/api/tickets/stats', headers: { Cookie: '' } });
  })
  .then(function (s) {
    console.log('TKT STATS:', s.status, JSON.stringify(s.body));
  })
  .catch(function (e) { console.error('FATAL:', e.message); });
