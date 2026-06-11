require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const csurf = require('csurf');
const flash = require('connect-flash');
const { pool } = require('./config/database');

const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 3000;

// Logging
const logStream = fs.createWriteStream(path.join(__dirname, 'server.log'), { flags: 'a' });
['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
  const original = console[method];
  console[method] = (...args) => {
    logStream.write(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n');
    original.apply(console, args);
  };
});

// Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "https:", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"]
    }
  }
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV !== 'production') {
  console.warn('WARNING: SESSION_SECRET not set.');
  const crypto = require('crypto');
  const secretPath = path.join(__dirname, '.session-secret');
  let rawSecret;
  try { rawSecret = fs.readFileSync(secretPath, 'utf8').trim(); } catch (e) { rawSecret = null; }
  if (!rawSecret) {
    rawSecret = crypto.randomBytes(64).toString('hex');
    try { fs.writeFileSync(secretPath, rawSecret); } catch (e) { console.warn('Could not persist session secret:', e.message); }
  }
  app.locals.devSessionSecret = rawSecret;
}

app.use(session({
  secret: sessionSecret || app.locals.devSessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(flash());

// Flash messages helper
app.use((req, res, next) => {
  res.locals.messages = {
    error: (req.flash('error') || [])[0] || null,
    success: (req.flash('success') || [])[0] || null
  };
  next();
});

// CSRF
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();
  if (req.path.startsWith('/pos/') || req.path.startsWith('/api/')) return next();
  csurf({ cookie: false })(req, res, next);
});

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    res.locals.csrfToken = 'test';
    req.csrfToken = () => 'test';
  } else {
    if (!res.locals.csrfToken) res.locals.csrfToken = '';
    if (typeof req.csrfToken !== 'function') req.csrfToken = () => res.locals.csrfToken;
  }
  next();
});

// Error handlers
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).send('Invalid CSRF token');
  }
  console.error('SERVER ERROR:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Server error', message: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
});

process.on('unhandledRejection', err => {
  console.error('UNHANDLED REJECTION:', err);
  process.exit(1);
});

process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Request logging + locals
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  res.locals.user = req.session?.user || null;
  const pathParts = req.path.split('/').filter(p => p);
  res.locals.currentPage = pathParts.length > 0 ? pathParts[0] : 'dashboard';
  next();
});

// Settings + print defaults
app.use(async (req, res, next) => {
  try {
    const { getSettings } = require('./config/settings');
    const settings = await getSettings();
    res.locals.settings = settings;
    const size = req.query.size || settings.print?.default_size || 'a4';
    const theme = req.query.theme || settings.print?.default_theme || 'modern';
    res.locals.printSize = size;
    res.locals.printTheme = theme;
  } catch (err) {
    console.error('Failed to load settings:', err);
    res.locals.settings = {
      print: {
        default_size: 'a4',
        default_theme: 'hisecure',
        available_sizes: ['a4', 'a5', 'letter', 'legal', 'thermal-80mm', 'thermal-58mm', 'half-a4', 'barcode-80x150'],
        available_themes: ['hisecure', 'tally', 'classic', 'modern-blue', 'minimal', 'saffron']
      }
    };
    res.locals.printSize = 'a4';
    res.locals.printTheme = 'modern';
  }
  next();
});

// Modular routes
require('./routes/index')(app);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`\nSERVER RUNNING at http://localhost:${port}\n`);
  });
}

module.exports = { pool, app };
async function start() {
  return new Promise(resolve => app.listen(port, resolve));
}
module.exports.start = start;
