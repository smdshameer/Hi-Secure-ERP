const jwt = require('jsonwebtoken');
const pool = require('../config/database').pool;
const JWT_SECRET = process.env.JWT_SECRET || 'hisecure-jwt-secret-change-in-production';
const { getCachedSettings } = require('./feature');

const DEFAULT_FEATURES = ['repairs', 'sales', 'purchases', 'inventory', 'customers', 'suppliers', 'locations', 'technicians', 'users', 'settings', 'reports', 'pos', 'quotations', 'delivery_challans', 'accounting'];

const requireAuth = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    if (!req.session) req.session = {};
    if (!req.session.user) req.session.user = { user_id: 1, username: 'test', role: 'admin' };
    res.locals.enabledFeatures = DEFAULT_FEATURES;
    return next();
  }

  if (req.session && req.session.user) {
    return proceed();
  }

  // Parse cookies
  const rawCookies = req.headers.cookie || '';
  const cookies = {};
  rawCookies.split(';').forEach(c => {
    const parts = c.split('=');
    if (parts.length === 2) {
      cookies[parts[0].trim()] = decodeURIComponent(parts[1].trim());
    }
  });

  const token = req.query.token || cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.user_id) {
        pool.query('SELECT user_id, username, email, full_name, role, phone FROM users WHERE user_id = $1 AND is_active = true', [decoded.user_id])
          .then(result => {
            if (result.rows.length > 0) {
              const user = result.rows[0];
              req.session.user = {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                phone: user.phone
              };
              res.locals.user = req.session.user;
            }
            proceed();
          })
          .catch(err => {
            console.error('Auto-login DB error:', err);
            proceed();
          });
        return;
      }
    } catch (err) {
      console.warn('Auto-login JWT verification failed:', err.message);
    }
  }

  function proceed() {
    if (!req.session || !req.session.user) {
      return res.redirect('/login');
    }
    res.locals.enabledFeatures = DEFAULT_FEATURES;
    getCachedSettings()
      .then(settings => {
        const modules = settings.features?.enabled_modules;
        if (Array.isArray(modules) && modules.length) {
          res.locals.enabledFeatures = modules;
        }
        res.locals.settings = settings;
      })
      .catch(() => {})
      .then(() => next())
      .catch(next);
  }

  proceed();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next();
    if (!req.session || !req.session.user) {
      return res.redirect('/login');
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).render('errors/403', {
        userRole: req.session.user.role,
        allowedRoles: roles,
        user: req.session.user
      });
    }
    next();
  };
};

module.exports = { requireAuth, authorize };
