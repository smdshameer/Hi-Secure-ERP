require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { Server } = require('socket.io');
const fastify = require('fastify')({ logger: false, json: true });
const helmet = require('@fastify/helmet');
const cors = require('@fastify/cors');
const rateLimit = require('@fastify/rate-limit');
const websocket = require('@fastify/websocket');
const cookie = require('@fastify/cookie');
const formbody = require('@fastify/formbody');
const staticPlugin = require('@fastify/static');
const viewPlugin = require('@fastify/view');
const compress = require('@fastify/compress');
const ejs = require('ejs');
const { pool } = require('./config/database');
const { requireAuth, sign, unsign } = require('./middleware/fastify-auth');

fastify.register(compress);
fastify.register(helmet, { contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com"], styleSrc: ["'self'", "https:", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com"], imgSrc: ["'self'", "data:", "https:"], connectSrc: ["'self'", "https://cdn.jsdelivr.net"], fontSrc: ["'self'", "https:", "data:"], objectSrc: ["'none'"] } } });
fastify.register(cors, { origin: true, credentials: true });
fastify.register(rateLimit, { max: 200, timeWindow: '1 minute' });
fastify.register(websocket);
fastify.register(cookie, { secret: process.env.COOKIE_SECRET, parseOptions: { sameSite: 'lax' } });
fastify.register(formbody, { contentTypes: ['application/x-www-form-urlencoded', 'multipart/form-data'] });
fastify.register(staticPlugin, { root: path.join(__dirname, 'client', 'dist', 'assets'), prefix: '/assets', decorateReply: false, maxAge: '7d', immutable: true });
fastify.register(viewPlugin, { engine: { ejs }, root: path.join(__dirname, 'views'), options: { async: true } });

// Cache index.html once at startup to avoid sync disk reads on every request
let cachedIndexHtml = null;
try {
  cachedIndexHtml = fs.readFileSync(path.join(__dirname, 'client', 'dist', 'index.html'), 'utf8');
} catch {
  console.warn('Warning: client/dist/index.html not found. SPA routes will return 404.');
}

function serveIndexHtml(_, reply) {
  if (!cachedIndexHtml) {
    return reply.code(404).send({ error: 'dist not built' });
  }
  return reply.type('text/html').send(cachedIndexHtml);
}
[
  '/', '/login', '/sales', '/products', '/customers', '/dashboard',
  '/amc', '/service', '/repairs', '/parts', '/quotations', '/purchases',
  '/delivery-challans', '/customer-assets', '/technicians', '/users',
  '/reports', '/settings', '/ai', '/ai/:id',
  '/pos', '/crm', '/suppliers', '/locations', '/payroll', '/accounting',
  '/banking', '/companies'
].forEach((p) => fastify.get(p, serveIndexHtml));

fastify.setNotFoundHandler((req, reply) => {
  if (req.raw.url.startsWith('/api')) {
    return reply.code(404).send({ error: `Route ${req.raw.method}:${req.raw.url} not found`, statusCode: 404 });
  }
  return serveIndexHtml(req, reply);
});

async function registerAuthRoutes() {
  fastify.post('/api/auth/login', async (req, reply) => {
    try {
      const raw = (req.body && typeof req.body === 'string') ? req.body : (typeof req.rawBody === 'string' ? req.rawBody : '');
      let body = {};
      if (raw) {
        try { body = JSON.parse(raw); } catch {}
      }
      const username = String(body.username || req.body?.username || '').trim();
      const password = String(body.password || req.body?.password || '');
      if (!username || !password) return { error: 'username and password required' };
      const r = await pool.query('SELECT user_id, username, password_hash, role FROM users WHERE username=$1', [username]);
      const user = r.rows[0];
      if (!user) return { error: 'Invalid username or password' };
      const ok = await bcrypt.compare(password, (user.password_hash || '')).catch(() => false);
      if (!ok) return { error: 'Invalid username or password' };
      const payload = sign({ user: { id: user.user_id, username: user.username, role: user.role }, ts: Date.now() });
      reply.setCookie('hisecure.sid', payload, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 86400000 });
      return { ok: true, user: { id: user.user_id, username: user.username, role: user.role } };
    } catch (e) {
      console.error('login error', e);
      return { error: 'login failed' };
    }
  });

  fastify.get('/api/auth/session', async (req) => {
    const sess = unsign(req.cookies['hisecure.sid']);
    return { user: (sess && sess.user) || null };
  });

  fastify.post('/api/auth/logout', async (req, reply) => {
    reply.clearCookie('hisecure.sid', { path: '/' });
    return { ok: true };
  });
}

async function registerApiRoutes() {
  const mod = require('./routes/api');
  // Replaced by fastify-amc.js below
  
  fastify.get('/api/health', async () => ({ status: 'ok', time: new Date().toISOString() }));
  const { getSettings, updateSetting } = require('./config/settings');
  fastify.get('/api/settings', { preHandler: requireAuth }, async () => {
    return { ok: true, data: await getSettings() };
  });
  fastify.post('/api/settings', { preHandler: requireAuth }, async (req, reply) => {
    try {
      const body = req.body || {};
      const { section, ...updates } = body;
      if (!section) return reply.code(400).send({ error: 'Section parameter is required' });
      const currentSettings = await getSettings();
      const currentSection = currentSettings[section] || {};
      const mergedSection = { ...currentSection, ...updates };
      await updateSetting(section, mergedSection);
      return { success: true, message: `${section} settings saved successfully` };
    } catch (e) {
      return reply.code(500).send({ error: e.message || 'Failed to save settings' });
    }
  });
  fastify.get('/api/dashboard', { preHandler: requireAuth }, async () => mod.dashboard());
  fastify.get('/api/products', { preHandler: requireAuth }, async () => mod.products());
  fastify.get('/api/charts/sales', { preHandler: requireAuth }, async () => mod.salesChart());
  fastify.get('/api/charts/inventory', { preHandler: requireAuth }, async () => mod.inventoryChart());

  require('./routes/fastify-repairs')(fastify);
  require('./routes/fastify-parts')(fastify);
  require('./routes/fastify-quotations')(fastify);
  require('./routes/fastify-purchases')(fastify);
  require('./routes/fastify-deliveryChallans')(fastify);
  require('./routes/fastify-users')(fastify);
  require('./routes/fastify-reports')(fastify);
  require('./routes/fastify-customers')(fastify);
  require('./routes/fastify-sales')(fastify);
  require('./routes/fastify-stores')(fastify);
  require('./routes/fastify-service-tickets')(fastify);
  require('./routes/fastify-customer-assets')(fastify);
  require('./routes/fastify-amc')(fastify);
  require('./routes/fastify-complaints')(fastify);
  require('./routes/fastify-technicians')(fastify);
  require('./routes/fastify-pos')(fastify);
  require('./routes/fastify-crm')(fastify);
  require('./routes/fastify-suppliers')(fastify);
  require('./routes/fastify-locations')(fastify);
  require('./routes/fastify-payroll')(fastify);
  require('./routes/fastify-accounting')(fastify);
  require('./routes/fastify-banking')(fastify);
  require('./routes/fastify-companies')(fastify);
}

const start = async () => {
  await registerAuthRoutes();
  await registerApiRoutes();
  const PORT = parseInt(process.env.PORT || '3099', 10);
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
  } catch (e) {
    console.error('Failed:', e.message);
    process.exit(1);
  }
  console.log('\n HISECURE ERP v2.0');
  console.log(' HTTP http://localhost:' + PORT);
  console.log(' API http://localhost:' + PORT + '/api/health');
  console.log(' Login http://localhost:' + PORT + '/api/auth/login\n');
};

start().catch((e) => { console.error('Bootstrap failed:', e); process.exit(1); });