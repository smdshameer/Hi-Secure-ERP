const express = require('express');
const { getPrintContext } = require('../models/print');
const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');
const pool = require('../config/database').pool;
const { body, validationResult } = require('express-validator');

module.exports = function(app) {
  app.get('/quotations', requireAuth, requireFeature('quotations'), async (req, res) => {
    try {
      const status = req.query.status || 'all';
      const customerId = req.query.customer_id ? parseInt(req.query.customer_id) : null;
      const quotations = await models.quotations.getQuotations(status, customerId);
      const customers = await models.quotations.getActiveCustomersForQuotation();
      const settings = await models.settings.getSettings();
      res.render('quotations/list', { quotations, customers, filters: { status, customer_id: customerId }, settings, user: req.session.user || null });
    } catch (err) { console.error('Quotations list error:', err); res.status(500).send('Error loading quotations: ' + err.message); }
  });

  app.get('/quotations/new', requireAuth, requireFeature('quotations'), authorize('admin', 'sales'), async (req, res) => {
    try {
      const [customers, parts] = await Promise.all([
        models.quotations.getActiveCustomersForQuotation(),
        models.quotations.getPartsForQuotation()
      ]);
      const settings = await models.settings.getSettings();
      res.render('quotations/new', { customers, parts, settings, user: req.session.user || null, errors: [] });
    } catch (err) { console.error(err); res.status(500).send('Error loading quotation form: ' + err.message); }
  });

  app.post('/quotations', requireAuth, requireFeature('quotations'), authorize('admin', 'sales'), [
    body('customer_id').isInt({ min: 1 }).withMessage('Valid customer is required'),
    body('valid_until').isISO8601().withMessage('Invalid valid until date'),
    body('items_json').custom((value) => {
      let items;
      try { items = JSON.parse(value || '[]'); } catch (e) { throw new Error('Invalid items JSON'); }
      if (!Array.isArray(items) || items.length === 0) throw new Error('At least one item is required');
      return true;
    })
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const [customers, parts] = await Promise.all([
          models.quotations.getActiveCustomersForQuotation(),
          models.quotations.getPartsForQuotation()
        ]);
        const settings = await models.settings.getSettings();
        return res.status(400).render('quotations/new', {
          errors: errors.array(),
          customers, parts, settings,
          user: req.session.user || null
        });
      }

      const { customer_id, valid_until, items_json, terms, notes } = req.body;
      const items = JSON.parse(items_json);
      const quote = await models.quotations.createQuotation({ customer_id, valid_until, items, terms, notes });
      res.redirect(`/quotations/${quote.quote_id}`);
    } catch (err) { console.error('Create quotation error:', err); res.status(500).send('Error creating quotation: ' + err.message); }
  });

  app.get('/quotations/:id', requireAuth, requireFeature('quotations'), async (req, res) => {
    try {
      const quotation = await models.quotations.getQuotationById(parseInt(req.params.id));
      if (!quotation) return res.status(404).render('errors/404', { message: 'Quotation not found', user: req.session.user || null });
      const settings = await models.settings.getSettings();
      res.render('quotations/detail', { quotation, salesInvoices: [], settings, user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Error loading quotation: ' + err.message); }
  });

  app.get('/quotations/:id/edit', requireAuth, requireFeature('quotations'), authorize('admin', 'sales'), async (req, res) => {
    try {
      const quotation = await models.quotations.getQuotationById(parseInt(req.params.id));
      if (!quotation) return res.status(404).render('errors/404', { message: 'Quotation not found', user: req.session.user || null });
      if (quotation.status !== 'draft') return res.status(400).send('Only draft quotations can be edited');
      const [customers, parts] = await Promise.all([
        models.quotations.getActiveCustomersForQuotation(),
        models.quotations.getPartsForQuotation()
      ]);
      const settings = await models.settings.getSettings();
      res.render('quotations/edit', { quotation, customers, parts, settings, user: req.session.user || null, errors: [] });
    } catch (err) { console.error(err); res.status(500).send('Error loading quotation for editing'); }
  });

  app.post('/quotations/:id', requireAuth, requireFeature('quotations'), authorize('admin', 'sales'), [
    body('customer_id').isInt({ min: 1 }).withMessage('Valid customer is required'),
    body('valid_until').isISO8601().withMessage('Invalid valid until date'),
    body('items_json').custom((value) => {
      let items;
      try { items = JSON.parse(value || '[]'); } catch (e) { throw new Error('Invalid items JSON'); }
      if (!Array.isArray(items) || items.length === 0) throw new Error('At least one item is required');
      return true;
    })
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const quotation = await models.quotations.getQuotationById(parseInt(req.params.id));
        const [customers, parts] = await Promise.all([
          models.quotations.getActiveCustomersForQuotation(),
          models.quotations.getPartsForQuotation()
        ]);
        const settings = await models.settings.getSettings();
        return res.status(400).render('quotations/edit', {
          errors: errors.array(),
          quotation, customers, parts, settings,
          user: req.session.user || null
        });
      }

      const quoteId = parseInt(req.params.id);
      const { customer_id, valid_until, items_json, terms, notes } = req.body;
      const items = JSON.parse(items_json);
      const checkResult = await pool.query('SELECT status FROM quotations WHERE quote_id = $1', [quoteId]);
      if (checkResult.rows.length === 0) return res.status(404).send('Quotation not found');
      if (checkResult.rows[0].status !== 'draft') return res.status(400).send('Only draft quotations can be updated');
      await models.quotations.updateQuotation(quoteId, { customer_id, valid_until, items, terms, notes });
      res.redirect(`/quotations/${quoteId}`);
    } catch (err) { console.error('Update quotation error:', err); res.status(500).send('Error updating quotation: ' + err.message); }
  });

  app.post('/quotations/:id/status', requireAuth, requireFeature('quotations'), authorize('admin', 'sales'), [
    body('action').isIn(['sent', 'accept', 'reject', 'expire', 'draft']).withMessage('Invalid action')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).send(errors.array()[0].msg);
      const { action } = req.body;
      const validActions = { sent: 'sent', accept: 'accepted', reject: 'rejected', expire: 'expired', draft: 'draft' };
      const status = validActions[action];
      await models.quotations.updateQuotationStatus(parseInt(req.params.id), status);
      res.redirect(`/quotations/${req.params.id}`);
    } catch (err) { console.error(err); res.status(500).send('Error updating status'); }
  });

  app.get('/quotations/:id/print', requireAuth, requireFeature('quotations'), async (req, res) => {
    try {
      const quotation = await models.quotations.getQuotationById(parseInt(req.params.id));
      if (!quotation) return res.status(404).render('errors/404', { message: 'Quotation not found', user: req.session.user || null });
      const settings = await models.settings.getSettings();
      const size = req.query.size || settings.print.default_size;
      const getPrintSizeCSS = (s) => {
        switch(s) {
          case 'a4': return '@page { size: A4; margin: 10mm; }';
          case 'a5': return '@page { size: A5; margin: 8mm; }';
          case 'thermal-80mm': return '@page { size: 80mm auto; margin: 5mm; }';
          default: return '@page { size: A4; margin: 10mm; }';
        }
      };
      const printCtx = await getPrintContext(req);
  res.render('quotations/print', { quotation, settings, size, getPrintSizeCSS, user: req.session.user || null, printTheme: printCtx.theme, printSize: printCtx.size });
    } catch (err) { console.error(err); res.status(500).send('Error printing quotation'); }
  });

  app.post('/quotations/:id/convert', requireAuth, requireFeature('quotations'), authorize('admin', 'sales'), async (req, res) => {
    try {
      const invoice = await models.quotations.convertQuotationToInvoice(parseInt(req.params.id), req.session.user.user_id);
      res.redirect(`/sales/${invoice.invoice_id}`);
    } catch (err) { console.error(err); res.status(500).send('Error converting quotation to invoice: ' + err.message); }
  });
};
