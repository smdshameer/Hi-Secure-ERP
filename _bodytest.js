const fastify = require('fastify')({ logger: false });

fastify.addContentTypeParser('application/json', { parseAs: 'string' }, async function (req, body) {
  console.log('PARSER FIRED, body type:', typeof body, 'len:', body.length);
  return JSON.parse(body);
});

fastify.post('/test', async (req, reply) => {
  console.log('req.body type:', typeof req.body, 'keys:', req.body ? Object.keys(req.body) : 'N/A');
  return { ok: true, body: req.body };
});

fastify.listen({ port: 3098, host: '0.0.0.0' }).then(() => {
  console.log('listening 3098');
  const http = require('http');
  const data = JSON.stringify({ username: 'admin', password: 'test' });
  const req = http.request({ host: 'localhost', port: 3098, path: '/test', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, res => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => { console.log('RESPONSE:', res.statusCode, body); fastify.close(); process.exit(0); });
  });
  req.on('error', e => { console.log('REQ ERR:', e.message); fastify.close(); process.exit(1); });
  req.write(data);
  req.end();
});
