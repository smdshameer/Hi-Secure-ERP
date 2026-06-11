const fastify = require('fastify')({ logger: false, json: true });
const formbody = require('@fastify/formbody');

fastify.register(formbody, { contentTypes: ['application/x-www-form-urlencoded', 'multipart/form-data'] });

fastify.post('/test', async (req) => {
  console.log('BODY TYPE:', typeof req.body, JSON.stringify(req.body));
  return { ok: true, body: req.body };
});

fastify.get('/test-form', async (req) => {
  return { query: req.query };
});

fastify.listen({ port: 3098 }).then(() => console.log('MINIMAL on 3098'));
