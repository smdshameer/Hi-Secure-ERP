const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const csurf = require('csurf');
const { requireAuth } = require('../middleware/auth');
const pool = require('../config/database').pool;
const csrfProtection = (req, res, next) => {
if (process.env.NODE_ENV === 'test') return next();
csurf({ cookie: false })(req, res, next);
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
});

module.exports = function(app) {
  app.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('auth/login', { layout: false, user: null, error: null, csrfToken: req.csrfToken() });
  });

  app.post('/login', loginLimiter, csrfProtection, async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).render('auth/login', { layout: false, user: null, error: 'Username and password are required', csrfToken: req.csrfToken() });
      }
      const result = await pool.query('SELECT * FROM users WHERE username = $1 AND is_active = true', [username]);
      if (result.rows.length === 0) {
        return res.status(401).render('auth/login', { layout: false, user: null, error: 'Invalid username or password', csrfToken: req.csrfToken() });
      }
      const user = result.rows[0];
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).render('auth/login', { layout: false, user: null, error: 'Invalid username or password', csrfToken: req.csrfToken() });
      }
      await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1', [user.user_id]);
      req.session.user = {
        user_id: user.user_id, username: user.username, email: user.email,
        full_name: user.full_name, role: user.role, phone: user.phone
      };
      res.redirect('/');
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).render('auth/login', { layout: false, user: null, error: 'An error occurred. Please try again.', csrfToken: req.csrfToken() });
    }
  });

  app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) console.error('Logout error:', err);
      res.redirect('/login');
    });
  });
};
