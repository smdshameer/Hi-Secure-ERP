const express = require('express');
const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');
const { body, validationResult } = require('express-validator');

module.exports = function(app) {
  app.get('/users', requireAuth, requireFeature('users'), authorize('admin'), async (req, res) => {
    try {
      const users = await models.users.getUsers();
      res.render('users/list', { users, user: req.session.user || null });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading users');
    }
  });

  app.get('/users/new', requireAuth, requireFeature('users'), authorize('admin'), async (req, res) => {
    try {
      res.render('users/new', { user: req.session.user || null, errors: [] });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading form');
    }
  });

  app.post('/users', requireAuth, requireFeature('users'), authorize('admin'), [
    body('username').trim().notEmpty().isLength({ max: 50 }).withMessage('Username is required (max 50 chars)'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('phone').optional({ nullable: true }).trim().isMobilePhone('en-IN').withMessage('Invalid phone number'),
    body('role').isIn(['admin', 'sales', 'inventory_manager', 'technician', 'accountant']).withMessage('Invalid role'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('is_active').optional().isBoolean().withMessage('Invalid active status')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).render('users/new', {
          errors: errors.array(),
          user: req.session.user || null
        });
      }

      const { username, email, full_name, phone, role, password, is_active } = req.body;
      await models.users.createUser({ username, email, full_name, phone, role, password, is_active });
      res.redirect('/users');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error creating user');
    }
  });

  app.get('/users/:id/edit', requireAuth, requireFeature('users'), authorize('admin'), async (req, res) => {
    try {
      const user = await models.users.getUserById(req.params.id);
      if (!user) return res.status(404).send('User not found');
      res.render('users/edit', { user, currentUser: req.session.user || null, errors: [] });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading user');
    }
  });

  app.post('/users/:id', requireAuth, requireFeature('users'), authorize('admin'), [
    body('username').trim().notEmpty().isLength({ max: 50 }).withMessage('Username is required (max 50 chars)'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('phone').optional({ nullable: true }).trim().isMobilePhone('en-IN').withMessage('Invalid phone number'),
    body('role').isIn(['admin', 'sales', 'inventory_manager', 'technician', 'accountant']).withMessage('Invalid role'),
    body('password').optional({ nullable: true }).isLength({ min: 6 }).withMessage('Password must be at least 6 characters if provided'),
    body('is_active').optional().isBoolean().withMessage('Invalid active status')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const user = await models.users.getUserById(req.params.id);
        return res.status(400).render('users/edit', {
          errors: errors.array(),
          user,
          currentUser: req.session.user || null
        });
      }

      const { username, email, full_name, phone, role, password, is_active } = req.body;
      await models.users.updateUser(req.params.id, { username, email, full_name, phone, role, password, is_active });
      res.redirect('/users');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error updating user');
    }
  });

  app.post('/users/:id/delete', requireAuth, requireFeature('users'), authorize('admin'), async (req, res) => {
    try {
      await models.users.deactivateUser(req.params.id);
      res.redirect('/users');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error deleting user');
    }
  });
};
