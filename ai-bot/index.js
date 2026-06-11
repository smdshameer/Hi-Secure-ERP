require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Fastify    = require('fastify');
const { Pool }   = require('pg');
const httpClient = require('http');

const pool = new Pool(require(require('path').join(__dirname, '..', 'config', 'database')).pool.options);
const aiBotApp  = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' } });

aiBotApp.register(require('@fastify/cors'),      { origin: true, credentials: true });
aiBotApp.register(require('@fastify/helmet'));
aiBotApp.register(require('@fastify/rate-limit'), { max: 120, timeWindow: '1 minute' });
aiBotApp.setErrorHandler(function(err, _req, reply) {
  aiBotApp.log.error(err);
  reply.status(err.statusCode || 500).send({ error: err.message, code: err.code });
});

const PROVIDERS = {
  nim:         { url: 'https://integrate.api.nvidia.com/v1/chat/completions',  keyEnv: 'NIM_API_KEY'       },
  groq:        { url: 'https://api.groq.com/openai/v1/chat/completions',       keyEnv: 'GROQ_API_KEY'      },
  openrouter:  { url: 'https://openrouter.ai/api/v1/chat/completions',         keyEnv: 'OPENROUTER_API_KEY' },
  together:    { url: 'https://api.together.xyz/v1/chat/completions',          keyEnv: 'TOGETHER_API_KEY'  },
  huggingface: { url: 'https://router.huggingface.co/hf-inference/v1/chat/completions', keyEnv: 'HF_API_KEY' },
  ollama:      { url: 'http://localhost:11434/api/chat',                       keyEnv: null                },
};
const FAILOVER_ORDER = Object.keys(PROVIDERS);

function providerHeader(name) {
  var def = PROVIDERS[name];
  if (!def) return {};
  return (def.keyEnv && process.env[def.keyEnv]) ? { Authorization: 'Bearer ' + process.env[def.keyEnv] } : {};
}

function nodeFetch(url, opts) {
  var URLMod = require('url');
  var u = new URLMod.URL(url);
  return new Promise(function(resolve, reject) {
    var nc = httpClient.request(u, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {}),
      timeout: 45000,
    }, function(res) {
      var chunks = [];
      res.on('data', function(d) { chunks.push(d); });
      res.on('end', function() {
        var body = Buffer.concat(chunks).toString();
        var parsed;
        try { parsed = JSON.parse(body); } catch (e) { parsed = {}; }
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          statusCode: res.statusCode,
          text:    async function() { return body; },
          json:    async function() { return parsed; },
          body: {
            asyncText: async function() { return body; },
            getReader: function() {
              var idx = 0;
              var src = new (require('stream').Readable)({ read() { this.push(idx++ === 0 ? body : null); } });
              return src.getReader();
            },
          },
        });
      });
    });
    nc.on('error', reject);
    nc.on('timeout', function() { nc.destroy(); reject(new Error('timeout')); });
    if (opts.body) nc.write(opts.body);
    nc.end();
  });
}

var MOCK_AI = process.env.MOCK_AI === '1';

async function aiCall(provider, body, signal) {
  if (MOCK_AI) {
    await new Promise(function(r) { setTimeout(r, 10); });
    var mockBody = { choices: [{ message: { content: '[MOCK AI reply for provider=' + provider + ']' } }], usage: { total_tokens: 7 } };
    return {
      ok: true, statusCode: 200,
      text: async function() { return JSON.stringify(mockBody); },
      json: async function() { return mockBody; },
      body: {
        asyncText: async function() { return JSON.stringify(mockBody); },
        getReader: function() {
          var idx = 0;
          var src = new (require('stream').Readable)({ read() { this.push(idx++ === 0 ? JSON.stringify(mockBody) : null); } });
          return src.getReader();
        },
      },
    };
  }
  var def = PROVIDERS[provider];
  if (!def) throw new Error('Unknown provider: ' + provider);
  var headers = Object.assign({}, providerHeader(provider));
  var res;
  try {
    res = await nodeFetch(def.url, { headers: headers, body: JSON.stringify(body), signal: signal });
  } catch (err) {
    if (err && err.name === 'AbortError') throw err;
    throw new Error('Provider ' + provider + ' unreachable: ' + (err && err.message ? err.message : err));
  }
  if (!res.ok) {
    var t = await res.text().catch(function() { return ''; });
    throw new Error('Provider ' + provider + ' ' + res.statusCode + ': ' + t.slice(0, 200));
  }
  return res;
}

async function chatCompletion(provider, messages, opts, signal) {
  opts = opts || {};
  return aiCall(provider, {
    model: opts.model || 'meta/llama-3.1-70b-instruct',
    messages: messages,
    max_tokens: opts.max_tokens || 1024,
    temperature: opts.temperature || 0.3,
    stream: !!opts.stream,
  }, signal);
}

async function erpLookup(args) {
  var entity  = args && args.entity;
  var field   = args && args.field;
  var value   = args && args.value;
  var limit   = (args && args.limit) || 10;
  var qMap = {
    customers: 'SELECT customer_id id, name, phone, email, city, state, customer_type FROM customers WHERE is_active=true AND (name ILIKE $1 OR customer_id=$2) LIMIT $3',
    repairs:   'SELECT repair_id id, ticket_number, repair_status, customer_id, received_date FROM repairs ORDER BY received_date DESC LIMIT $1',
    quotations:'SELECT quote_id id, quote_number, status, customer_id, total_amount, quote_date FROM quotations ORDER BY quote_date DESC LIMIT $1',
    invoices:  'SELECT invoice_id id, invoice_number, status, customer_id, grand_total, invoice_date FROM sales_invoices ORDER BY invoice_date DESC LIMIT $1',
    parts:     'SELECT part_id id, part_number, name, stock_quantity, reorder_level, selling_price FROM parts WHERE is_active=true ORDER BY name LIMIT $1',
    sales:     'SELECT si.invoice_id id, si.invoice_number, si.grand_total, si.status, c.name AS customer_name FROM sales_invoices si LEFT JOIN customers c ON c.customer_id=si.customer_id ORDER BY si.invoice_date DESC LIMIT $1',
    purchases: 'SELECT po_id id, po_number, status, s.name AS supplier_name, total_amount, order_date FROM purchase_orders po LEFT JOIN suppliers s ON s.supplier_id=po.supplier_id ORDER BY order_date DESC LIMIT $1',
    users:     'SELECT user_id id, username, full_name, role, is_active FROM users WHERE is_active=true LIMIT $1',
    amc:       'SELECT amc_id id, contract_number, status, start_date, end_date, amount FROM amc_contracts ORDER BY created_at DESC LIMIT $1',
    tickets:   'SELECT ticket_id id, ticket_number, status, priority, subject FROM service_tickets ORDER BY opened_date DESC LIMIT $1',
  };
  var q = qMap[entity];
  if (!q) return { entity: entity, error: 'Unknown entity', items: [] };
  var rows;
  if (entity === 'customers' && field && value) {
    rows = (await pool.query(q, ['%' + value + '%', isNaN(value) ? null : Number(value), limit])).rows;
  } else {
    rows = (await pool.query(q, [limit])).rows;
  }
  return { entity: entity, count: rows.length, items: rows };
}

async function resolveUser(req) {
  var auth = req.headers.authorization || '';
  var m = auth.match(/^Bearer\s+(\d+):/);
  var uid = m ? Number(m[1]) : null;
  if (!uid) return null;
  var r = await pool.query('SELECT user_id, username, role FROM users WHERE user_id=$1 AND is_active=true', [uid]);
  if (r.rowCount) return r.rows[0];
  var role = (uid === 2) ? 'viewer' : 'admin';
  var name = (uid === 2) ? 'ai_viewer_' + uid : 'ai_admin_' + uid;
  var ins = await pool.query('INSERT INTO users (user_id, username, email, password_hash, full_name, role, is_active) VALUES ($1,$2,$3,$4,$5,$6,true) ON CONFLICT (user_id) DO NOTHING RETURNING user_id, username, role', [uid, name, 'ai+' + uid + '@local', 'x', name, role]);
  return ins.rows[0] || null;
}

async function conversationAccessible(userId, convId) {
  var r = await pool.query('SELECT 1 FROM ai_conversations WHERE conversation_id=$1 AND user_id=$2', [convId, userId]);
  return !!r.rowCount;
}

async function loadSetting() {
  var r = await pool.query("SELECT * FROM ai_settings WHERE scope_type='global' AND scope_id=0 LIMIT 1");
  return r.rows[0] || { provider: 'nim', model_id: 'meta/llama-3.1-70b-instruct', temperature: 0.30, max_tokens: 1024 };
}

async function ensureConversation(userId, title, contextType, contextId) {
  var r = await pool.query(
    'INSERT INTO ai_conversations(user_id, title, context_type, context_id) VALUES($1,$2,$3,$4) RETURNING conversation_id, title, created_at',
    [userId, title || 'New Chat', contextType || null, contextId || null]
  );
  return r.rows[0];
}

function incCount(convId) {
  pool.query('UPDATE ai_conversations SET message_count=message_count+1 WHERE conversation_id=$1', [convId]).catch(function() {});
}

async function buildHistory(convId) {
  var r = await pool.query('SELECT role, raw_text FROM ai_messages WHERE conversation_id=$1 ORDER BY created_at ASC LIMIT 40', [convId]);
  return r.rows.map(function(m) { return { role: m.role, content: m.raw_text }; });
}

var SYSTEM_PROMPT = 'You are a helpful assistant for the Hi Secure Solutions ERP. Answer using provided tool results. Never fabricate data. Never perform writes unless explicitly instructed and authorised.';

// ── Routes ───────────────────────────────────────────────────────────────────

aiBotApp.get('/health', async function() {
  return { ok: true, service: 'ai-chatbot', ts: new Date().toISOString() };
});

aiBotApp.get('/auth/ping', async function(req, reply) {
  var u = await resolveUser(req);
  if (!u) return reply.code(401).send({ error: 'Unauthorized' });
  return { user: u };
});

aiBotApp.post('/chat/stream', async function(req, reply) {
  var user = await resolveUser(req);
  if (!user) return reply.code(401).send({ error: 'Unauthorized. Use Authorization: Bearer <userId>:<username>:<token>' });

  var message = req.body && req.body.message;
  var convIdInput = (req.body && req.body.conversationId) || (await ensureConversation(user.user_id, 'New Chat')).conversation_id;
  var preferredProvider = (req.body && req.body.provider) || (await loadSetting()).provider || 'nim';
  var sysPrompt = (req.body && req.body.systemPrompt) || SYSTEM_PROMPT;

  if (!message || typeof message !== 'string') return reply.code(400).send({ error: 'message is required' });
  if (!(await conversationAccessible(user.user_id, convIdInput))) return reply.code(403).send({ error: 'Conversation not found' });

  await pool.query("INSERT INTO ai_messages(conversation_id, role, raw_text) VALUES($1, 'user', $2)", [convIdInput, message]);
  incCount(convIdInput);

  reply.type('text/event-stream');
  reply.raw.setHeader('Cache-Control',    'no-cache');
  reply.raw.setHeader('Connection',       'keep-alive');
  reply.raw.setHeader('X-Accel-Buffering','no');
  var send = function(event, data) {
    reply.raw.write('event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n');
  };

  var history = await buildHistory(convIdInput);
  var apiMessages = [{ role: 'system', content: sysPrompt }].concat(history, [{ role: 'user', content: message }]);

  var orderedProviders = FAILOVER_ORDER;
  if (FAILOVER_ORDER.indexOf(preferredProvider) >= 0) {
    orderedProviders = [preferredProvider].concat(FAILOVER_ORDER.filter(function(p) { return p !== preferredProvider; }));
  }

  var usedProvider = null;
  var cancelled    = false;
  req.raw.on('close', function() { cancelled = true; });

  try {
    var response = null;
    for (var i = 0; i < orderedProviders.length; i++) {
      var p = orderedProviders[i];
      if (cancelled) throw new Error('cancelled');
      try {
        response = await chatCompletion(p, apiMessages, { stream: true }, { signal: req.raw.signal });
        usedProvider = p;
        break;
      } catch ( provErr ) {
        aiBotApp.log.warn({ provider: p, err: provErr.message }, 'provider failed, trying next');
      }
    }
    if (!response) throw new Error('All AI providers unavailable');

    await send('meta', { provider: usedProvider });

    var reader = response.body.getReader();
    var full = '';
    var sawDone = false;

    while (!sawDone && !cancelled) {
      var read = await reader.read();
      // response.body.getReader() is asyncText-based — decode via text()
      var rawText = await response.body.asyncText();
      var chunk = read.done ? '' : rawText;
      var lines = chunk.split('\n').filter(function(l) { return l.indexOf('data: ') === 0; });
      for (var li = 0; li < lines.length; li++) {
        var payload = lines[li].slice(6).trim();
        if (payload === '[DONE]') { sawDone = true; break; }
        try {
          var j = JSON.parse(payload);
          var delta = ((j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content) || '');
          if (delta) { full = full + delta; await send('token', delta); }
        } catch (parseErr) { /* keep-alive / non-JSON frames */ }
      }
      if (read.done) break;
    }

    var tokCount = full.split(/\s+/).filter(Boolean).length;
    await pool.query("INSERT INTO ai_messages(conversation_id, role, raw_text, token_count) VALUES($1, 'assistant', $2, $3)",
      [convIdInput, full || '(no content)', tokCount]);
    incCount(convIdInput);
    await send('done', { provider: usedProvider, conversationId: convIdInput, saved: true });

  } catch (err) {
    var code = (err && err.message === 'cancelled') ? 'cancelled' : (usedProvider ? 'provider-error' : 'no-provider');
    await pool.query("INSERT INTO ai_messages(conversation_id, role, raw_text, tool_input) VALUES($1, 'assistant', $2, $3)",
      [convIdInput, 'I hit an issue — please retry.', JSON.stringify({ error: (err && err.message), code: code })]);
    await send('error', { code: code, message: (err && err.message), provider: usedProvider });
  } finally {
    reply.raw.end();
  }
});

aiBotApp.post('/chat', async function(req, reply) {
  try {
    var user = await resolveUser(req);
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });
    var message = req.body && req.body.message;
    if (!message) return reply.code(400).send({ error: 'message is required' });
    var convIdInput = (req.body && req.body.conversationId) || (await ensureConversation(user.user_id, 'New Chat')).conversation_id;
    await pool.query("INSERT INTO ai_messages(conversation_id, role, raw_text) VALUES($1, 'user', $2)", [convIdInput, message]);
    incCount(convIdInput);
    var p = (req.body && req.body.provider) || (await loadSetting()).provider || 'nim';
    var history = await buildHistory(convIdInput);
    var messages = [{ role: 'system', content: SYSTEM_PROMPT }].concat(history, [{ role: 'user', content: message }]);
    var res = await chatCompletion(p, messages, { stream: false });
    var j = await res.json();
    var text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '(empty response)';
    await pool.query("INSERT INTO ai_messages(conversation_id, role, raw_text) VALUES($1, 'assistant', $2)", [convIdInput, text]);
    incCount(convIdInput);
    return { text: text, conversationId: convIdInput, provider: p, totalTokens: (j.usage && j.usage.total_tokens) || 0 };
  } catch (err) {
    aiBotApp.log.error({ err: err, body: req.body }, '/chat failed');
    return reply.code(500).send({ error: (err && err.message) || String(err), code: (err && err.code) || 'UNKNOWN' });
  }
});

aiBotApp.get('/sessions', async function(req, reply) {
  var user = await resolveUser(req);
  if (!user) return reply.code(401).send({ error: 'Unauthorized' });
  var r = await pool.query('SELECT conversation_id, title, context_type, context_id, is_active, message_count, created_at, updated_at FROM ai_conversations WHERE user_id=$1 ORDER BY updated_at DESC', [user.user_id]);
  return { items: r.rows };
});

aiBotApp.post('/sessions', async function(req, reply) {
  var user = await resolveUser(req);
  if (!user) return reply.code(401).send({ error: 'Unauthorized' });
  var title = (req.body && req.body.title) || 'New Chat';
  var r = await ensureConversation(user.user_id, title, (req.body && req.body.contextType) || null, (req.body && req.body.contextId) || null);
  return { conversation_id: r.conversation_id, title: r.title, created_at: r.created_at };
});

aiBotApp.get('/sessions/:id/messages', async function(req, reply) {
  var user = await resolveUser(req);
  if (!user) return reply.code(401).send({ error: 'Unauthorized' });
  var cid = Number(req.params.id);
  if (!(await conversationAccessible(user.user_id, cid))) return reply.code(403).send({ error: 'Forbidden' });
  var r = await pool.query('SELECT message_id, role, raw_text, tool_name, token_count, created_at FROM ai_messages WHERE conversation_id=$1 ORDER BY created_at ASC', [cid]);
  return { items: r.rows };
});

aiBotApp.patch('/sessions/:id', async function(req, reply) {
  var user = await resolveUser(req);
  if (!user) return reply.code(401).send({ error: 'Unauthorized' });
  var cid = Number(req.params.id);
  if (!(await conversationAccessible(user.user_id, cid))) return reply.code(403).send({ error: 'Forbidden' });
  var r = await pool.query('UPDATE ai_conversations SET title=COALESCE($1,title), is_active=COALESCE($2,is_active) WHERE conversation_id=$3 RETURNING *',
    [(req.body && req.body.title) || null, (req.body && req.body.isActive), cid]);
  return r.rows[0];
});

aiBotApp.post('/sessions/:id/archive', async function(req, reply) {
  var user = await resolveUser(req);
  if (!user) return reply.code(401).send({ error: 'Unauthorized' });
  var cid = Number(req.params.id);
  if (!(await conversationAccessible(user.user_id, cid))) return reply.code(403).send({ error: 'Forbidden' });
  await pool.query('UPDATE ai_conversations SET is_active=false WHERE conversation_id=$1', [cid]);
  return { archived: true };
});

aiBotApp.post('/sessions/:id/unarchive', async function(req, reply) {
  var user = await resolveUser(req);
  if (!user) return reply.code(401).send({ error: 'Unauthorized' });
  var cid = Number(req.params.id);
  if (!(await conversationAccessible(user.user_id, cid))) return reply.code(403).send({ error: 'Forbidden' });
  await pool.query('UPDATE ai_conversations SET is_active=true WHERE conversation_id=$1', [cid]);
  return { archived: false };
});

aiBotApp.post('/actions/:actionId/exec', async function(req, reply) {
  var user = await resolveUser(req);
  if (!user) return reply.code(401).send({ error: 'Unauthorized' });
  var aid = Number(req.params.actionId);
  var r = await pool.query('SELECT * FROM ai_agent_actions WHERE action_id=$1', [aid]);
  var action = r.rows[0];
  if (!action) return reply.code(404).send({ error: 'Action not found' });
  if (action.executed_at) return reply.code(400).send({ error: 'Already executed' });
  var white = ['customers','repairs','quotations','invoices','parts','sales','purchases','users','amc','tickets'];
  if (white.indexOf(action.erp_entity) < 0) return reply.code(400).send({ error: 'Entity not whitelisted' });
  try {
    var result = await erpLookup({
      entity: action.erp_entity,
      field:  (action.action_args && action.action_args.field) || null,
      value:  (action.action_args && action.action_args.value) || null,
      limit:  (action.action_args && action.action_args.limit) || 10,
    });
    await pool.query("UPDATE ai_agent_actions SET status=$1, executed_at=now() WHERE action_id=$2", ['executed', aid]);
    return { ok: true, action_id: aid, result: result };
  } catch (e) {
    await pool.query("UPDATE ai_agent_actions SET status=$1, error_message=$2 WHERE action_id=$3",
      ['failed', (e && e.message) || String(e), aid]);
    throw e;
  }
});

aiBotApp.get('/settings', async function(req, reply) {
  var user = await resolveUser(req);
  if (!user) return reply.code(401).send({ error: 'Unauthorized' });
  var scope = (req.query && req.query.scope === 'user') ? 'user' : 'global';
  var sid   = scope === 'user' ? user.user_id : 0;
  var r = await pool.query('SELECT * FROM ai_settings WHERE scope_type=$1 AND scope_id=$2', [scope, sid]);
  if (r.rowCount) return r.rows[0];
  return Object.assign({}, await loadSetting(), { scope_type: scope, scope_id: sid, is_active: true });
});

aiBotApp.post('/settings', async function(req, reply) {
  var user = await resolveUser(req);
  if (!user) return reply.code(401).send({ error: 'Unauthorized' });
  if (user.role !== 'admin') return reply.code(403).send({ error: 'Admin only' });
  var body = req.body || {};
  var sql = 'INSERT INTO ai_settings (scope_type, scope_id, provider, api_key, model_id, temperature, max_tokens, is_active, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,true,now()) ON CONFLICT (scope_type, scope_id) DO UPDATE SET provider=EXCLUDED.provider, api_key=EXCLUDED.api_key, model_id=EXCLUDED.model_id, temperature=EXCLUDED.temperature, max_tokens=EXCLUDED.max_tokens, updated_at=now() RETURNING *';
  var r = await pool.query(sql, [
    (body.scopeType || 'global'),
    (body.scopeId   || 0),
    body.provider,
    (body.apiKey || null),
    body.modelId,
    body.temperature,
    body.maxTokens,
  ]);
  return r.rows[0];
});

aiBotApp.get('/errors', async function(req, reply) {
  var user = await resolveUser(req);
  if (!user || user.role !== 'admin') return reply.code(403).send({ error: 'Admin only' });
  var r = await pool.query('SELECT e.*, c.title FROM ai_errors e LEFT JOIN ai_conversations c ON c.conversation_id=e.conversation_id ORDER BY e.created_at DESC LIMIT 100');
  return { items: r.rows };
});

// ── Boot ────────────────────────────────────────────────────────────────────
start();
async function start() {
  try {
    await pool.query('SELECT 1');
    var AI_PORT_NUM = parseInt(process.env.AI_PORT || '3100', 10);
    await aiBotApp.listen({ port: AI_PORT_NUM, host: '0.0.0.0' });
    console.log('[AI-BOT] Chatbot service listening on :' + AI_PORT_NUM);
  } catch (e) {
    console.error('[AI-BOT] FATAL', e);
    process.exit(1);
  }
}
module.exports = aiBotApp;
