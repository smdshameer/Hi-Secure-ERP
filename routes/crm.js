const express = require('express');
const { requireAuth } = require('../middleware/auth');
const models = require('../models');
const { body, validationResult } = require('express-validator');

module.exports = function(app) {
  app.get('/crm', requireAuth, async (req, res) => {
    try {
      const [stats, pipeline, leads] = await Promise.all([
        models.crm.getCRMStats(),
        models.crm.getPipelineData(),
        models.crm.getLeads()
      ]);
      res.render('crm/dashboard', { stats, pipeline, leads, user: req.session.user || null });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading CRM dashboard');
    }
  });

  app.get('/crm/leads', requireAuth, async (req, res) => {
    try {
      const filters = { status: req.query.status || 'all', source: req.query.source || '', search: req.query.search || '' };
      const leads = await models.crm.getLeads(filters);
      res.render('crm/leads', { leads, filters, user: req.session.user || null });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading leads');
    }
  });

  app.get('/crm/leads/new', requireAuth, async (req, res) => {
    try {
      const [customers, users] = await Promise.all([
        models.crm.getActiveCustomers(),
        models.crm.getActiveUsers()
      ]);
      res.render('crm/lead-form', { customers, users, lead: null, user: req.session.user || null, errors: [] });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading form');
    }
  });

  app.post('/crm/leads', requireAuth, [
    body('full_name').trim().notEmpty().withMessage('Lead name is required'),
    body('email').optional({ nullable: true }).isEmail().withMessage('Invalid email'),
    body('source').optional().isIn(['website', 'referral', 'walk-in', 'call', 'social']).withMessage('Invalid source'),
    body('interest_level').optional().isIn(['low', 'medium', 'high', 'hot']).withMessage('Invalid interest level'),
    body('estimated_value').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Estimated value must be a positive number')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const [customers, users] = await Promise.all([
          models.crm.getActiveCustomers(),
          models.crm.getActiveUsers()
        ]);
        return res.status(400).render('crm/lead-form', {
          errors: errors.array(),
          customers, users,
          lead: null,
          user: req.session.user || null
        });
      }

      const { full_name, email, phone, company, source, interest_level, estimated_value, notes } = req.body;
      const customer_id = req.body.customer_id ? parseInt(req.body.customer_id, 10) : null;
      const assigned_to = req.body.assigned_to ? parseInt(req.body.assigned_to, 10) : null;
      await models.crm.createLead({
        customer_id,
        full_name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        source: source || 'website',
        interest_level: interest_level || 'medium',
        estimated_value: estimated_value ? parseFloat(estimated_value) : 0,
        notes: notes || null,
        assigned_to,
        created_by: req.session.user.user_id
      });
      res.redirect('/crm/leads');
    } catch (err) {
      console.error('Error creating lead:', err);
      res.status(500).send('Error creating lead: ' + err.message);
    }
  });

  app.get('/crm/leads/:id', requireAuth, async (req, res) => {
    try {
      const lead = await models.crm.getLeadById(req.params.id);
      if (!lead) return res.status(404).send('Lead not found');
      const [interactions, followUps] = await Promise.all([
        models.crm.getInteractions(req.params.id),
        models.crm.getFollowUps({ lead_id: req.params.id })
      ]);
      res.render('crm/lead-detail', { lead, interactions, followUps, user: req.session.user || null });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading lead');
    }
  });

  app.get('/crm/leads/:id/edit', requireAuth, async (req, res) => {
    try {
      const lead = await models.crm.getLeadById(req.params.id);
      if (!lead) return res.status(404).send('Lead not found');
      const [customers, users] = await Promise.all([
        models.crm.getActiveCustomers(),
        models.crm.getActiveUsers()
      ]);
      res.render('crm/lead-form', { customers, users, lead, user: req.session.user || null, errors: [] });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading lead');
    }
  });

  app.post('/crm/leads/:id', requireAuth, [
    body('full_name').trim().notEmpty().withMessage('Lead name is required'),
    body('email').optional({ nullable: true }).isEmail().withMessage('Invalid email'),
    body('source').optional().isIn(['website', 'referral', 'walk-in', 'call', 'social']).withMessage('Invalid source'),
    body('interest_level').optional().isIn(['low', 'medium', 'high', 'hot']).withMessage('Invalid interest level'),
    body('estimated_value').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Estimated value must be a positive number')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const [customers, users] = await Promise.all([
          models.crm.getActiveCustomers(),
          models.crm.getActiveUsers()
        ]);
        const lead = await models.crm.getLeadById(req.params.id);
        return res.status(400).render('crm/lead-form', {
          errors: errors.array(),
          customers, users,
          lead,
          user: req.session.user || null
        });
      }

      const { full_name, email, phone, company, source, interest_level, status, estimated_value, notes } = req.body;
      const customer_id = req.body.customer_id ? parseInt(req.body.customer_id, 10) : null;
      const assigned_to = req.body.assigned_to ? parseInt(req.body.assigned_to, 10) : null;
      await models.crm.updateLead(req.params.id, {
        customer_id,
        full_name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        source: source || 'website',
        interest_level: interest_level || 'medium',
        status: status || 'new',
        estimated_value: estimated_value ? parseFloat(estimated_value) : 0,
        notes: notes || null,
        assigned_to
      });
      res.redirect('/crm/leads/' + req.params.id);
    } catch (err) {
      console.error('Error updating lead:', err);
      res.status(500).send('Error updating lead');
    }
  });

  app.post('/crm/leads/:id/convert', requireAuth, async (req, res) => {
    try {
      await models.crm.convertLeadToCustomer(req.params.id);
      res.redirect('/crm/leads');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error converting lead');
    }
  });

  app.post('/crm/leads/:id/interactions', requireAuth, [
    body('interaction_type').trim().notEmpty().withMessage('Interaction type is required'),
    body('subject').trim().notEmpty().withMessage('Subject is required')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const lead = await models.crm.getLeadById(req.params.id);
        const [interactions, followUps] = await Promise.all([
          models.crm.getInteractions(req.params.id),
          models.crm.getFollowUps({ lead_id: req.params.id })
        ]);
        return res.status(400).render('crm/lead-detail', {
          lead,
          interactions,
          followUps,
          errors: errors.array(),
          user: req.session.user || null
        });
      }

      const { interaction_type, subject, notes } = req.body;
      await models.crm.addInteraction({ lead_id: req.params.id, interaction_type, subject, notes, created_by: req.session.user.user_id });
      res.redirect('/crm/leads/' + req.params.id);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error adding interaction');
    }
  });

  app.get('/crm/follow-ups', requireAuth, async (req, res) => {
    try {
      const filters = { overdue: req.query.overdue || 'false', assigned_to: req.query.assigned_to || '' };
      const followUps = await models.crm.getFollowUps(filters);
      const users = await models.crm.getActiveUsers();
      res.render('crm/follow-ups', { followUps, filters, users, user: req.session.user || null, errors: [] });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading follow-ups');
    }
  });

  app.post('/crm/follow-ups', requireAuth, [
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('due_date').isISO8601().withMessage('Invalid due date'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
    body('lead_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid lead'),
    body('customer_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid customer'),
    body('assigned_to').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid assignee')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const filters = { overdue: req.query.overdue || 'false', assigned_to: req.query.assigned_to || '' };
        const followUps = await models.crm.getFollowUps(filters);
        const users = await models.crm.getActiveUsers();
        return res.status(400).render('crm/follow-ups', {
          followUps, filters, users,
          errors: errors.array(),
          user: req.session.user || null
        });
      }

      const { subject, due_date, priority, notes } = req.body;
      const lead_id = req.body.lead_id ? parseInt(req.body.lead_id, 10) : null;
      const customer_id = req.body.customer_id ? parseInt(req.body.customer_id, 10) : null;
      const assigned_to = req.body.assigned_to ? parseInt(req.body.assigned_to, 10) : null;
      await models.crm.createFollowUp({ lead_id, customer_id, subject, due_date, priority: priority || 'medium', notes: notes || null, assigned_to, created_by: req.session.user.user_id });
      res.redirect('/crm/follow-ups');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error creating follow-up');
    }
  });

  app.post('/crm/follow-ups/:id/complete', requireAuth, async (req, res) => {
    try {
      await models.crm.completeFollowUp(req.params.id);
      res.redirect('/crm/follow-ups');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error completing follow-up');
    }
  });
};
