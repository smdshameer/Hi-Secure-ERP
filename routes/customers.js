const express = require('express');
const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');
const pool = require('../config/database').pool;
const { body, validationResult } = require('express-validator');
const { getPrintContext } = require('../models/print');

module.exports = function(app) {
  app.get('/customers', requireAuth, requireFeature('customers'), async (req, res) => {
    try {
      const customers = await models.customers.getAllCustomers();
      res.render('customers/list', { customers, user: req.session.user || null });
    } catch (err) {
      console.error(err);
      res.status(500).send('Database error');
    }
  });

  app.get('/customers/new', requireAuth, requireFeature('customers'), authorize('admin', 'sales'), (req, res) => {
    res.render('customers/new', { user: req.session.user || null, errors: [] });
  });

  app.post('/customers', requireAuth, requireFeature('customers'), authorize('admin', 'sales'), [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('email').optional({ nullable: true }).isEmail().withMessage('Invalid email'),
    body('gstin').optional({ nullable: true }).matches(/^[0-9A-Z]{15}$/).withMessage('GSTIN must be 15 alphanumeric characters'),
    body('customer_type').optional().isIn(['retail', 'wholesale', 'corporate']).withMessage('Invalid customer type'),
    body('credit_limit').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Credit limit must be a positive number')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).render('customers/new', {
          errors: errors.array(),
          user: req.session.user || null
        });
      }

      const { name, phone, email, address, city, state, pincode, gstin, customer_type, credit_limit, is_active } = req.body;
      await models.customers.createCustomer({ name, phone, email, address, city, state, pincode, gstin, customer_type, credit_limit, is_active });
      res.redirect('/customers');
    } catch (err) {
      console.error('Error creating customer:', err);
      if (err.code === '23505') return res.status(400).send('Phone number already exists');
      res.status(500).send('Error creating customer');
    }
  });

  app.get('/customers/export', requireAuth, requireFeature('customers'), async (req, res) => {
    try {
      const XLSX = require('xlsx');
      const customers = await models.customers.exportCustomersCSV();
      const data = customers.map(r => ({
        'Customer Code': r.customer_code || '',
        Name: r.name,
        Phone: r.phone,
        Email: r.email || '',
        GSTIN: r.gstin || '',
        City: r.city || '',
        State: r.state || '',
        Type: r.customer_type || 'retail',
        'Credit Limit': r.credit_limit || 0,
        'Total Repairs': r.total_repairs || 0,
        'Lifetime Value': r.lifetime_value || 0
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Customers');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Customers.xlsx"');
      res.send(buf);
    } catch (err) {
      console.error('Customer export failed:', err);
      res.status(500).send('Export failed: ' + err.message);
    }
  });

  app.get('/customers/:id', requireAuth, requireFeature('customers'), async (req, res) => {
    try {
      const customer = await models.customers.getCustomerById(req.params.id);
      if (!customer) return res.status(404).render('errors/404', { message: 'Customer not found', user: req.session.user || null });
      const [repairs, invoices, quotations] = await Promise.all([
        models.customers.getCustomerRepairs(req.params.id),
        models.customers.getCustomerInvoices(req.params.id),
        models.customers.getCustomerQuotations(req.params.id)
      ]);
      res.render('customers/detail', { customer, repairs, invoices, quotations, user: req.session.user || null });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading customer');
    }
  });

  app.get('/customers/:id/print', requireAuth, requireFeature('customers'), async (req, res) => {
    try {
      const customer = await models.customers.getCustomerById(req.params.id);
      if (!customer) return res.status(404).render('errors/404', { message: 'Customer not found', user: req.session.user || null });
      const repairs = await models.customers.getCustomerRepairs(req.params.id);
      const paymentsResult = await pool.query(`SELECT p.*, r.ticket_number FROM payments p JOIN repairs r ON p.repair_id = r.repair_id WHERE r.customer_id = $1 ORDER BY p.payment_date DESC`, [req.params.id]);
      const payments = paymentsResult.rows;
      const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const totalRepairValue = repairs.reduce((sum, r) => sum + parseFloat(r.actual_cost || 0), 0);
      const printCtx = await getPrintContext(req);
  res.render('customers/print', { customer, repairs, payments, totalPayments, totalRepairValue, user: req.session.user || null, printTheme: printCtx.theme, printSize: printCtx.size });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading customer for print');
    }
  });

  app.get('/customers/:id/edit', requireAuth, requireFeature('customers'), authorize('admin', 'sales'), async (req, res) => {
    try {
      const customer = await models.customers.getCustomerById(req.params.id);
      if (!customer) return res.status(404).render('errors/404', { message: 'Customer not found', user: req.session.user || null });
      res.render('customers/edit', { customer, user: req.session.user || null });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading customer');
    }
  });

  app.post('/customers/:id', requireAuth, requireFeature('customers'), authorize('admin', 'sales'), [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('email').optional({ nullable: true }).isEmail().withMessage('Invalid email'),
    body('gstin').optional({ nullable: true }).matches(/^[0-9A-Z]{15}$/).withMessage('GSTIN must be 15 alphanumeric characters'),
    body('customer_type').optional().isIn(['retail', 'wholesale', 'corporate']).withMessage('Invalid customer type'),
    body('credit_limit').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Credit limit must be a positive number')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const customer = await models.customers.getCustomerById(parseInt(req.params.id));
        return res.status(400).render('customers/edit', {
          errors: errors.array(),
          customer,
          user: req.session.user || null
        });
      }

      const customerId = parseInt(req.params.id);
      const customer = await models.customers.getCustomerById(customerId);
      if (!customer) return res.status(404).send('Customer not found');
      const { name, phone, email, address, city, state, pincode, gstin, customer_type, credit_limit, is_active } = req.body;
      await models.customers.updateCustomer(customerId, { name, phone, email, address, city, state, pincode, gstin, customer_type, credit_limit, is_active });
      res.redirect(`/customers/${customerId}`);
    } catch (err) {
      console.error('Error updating customer:', err);
      if (err.code === '23505') return res.status(400).send('Phone number already exists');
      res.status(500).send('Error updating customer');
    }
  });

  app.post('/customers/:id/delete', requireAuth, requireFeature('customers'), authorize('admin', 'sales'), async (req, res) => {
    try {
      await models.customers.deleteCustomer(req.params.id);
      res.redirect('/customers');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error deleting customer');
    }
  });

  app.post('/customers/bulk-delete', requireAuth, requireFeature('customers'), authorize('admin', 'sales'), async (req, res) => {
    try {
      const ids = req.body.selected_customers || [];
      if (ids.length > 0) await models.customers.bulkDeleteCustomers(ids);
      res.redirect('/customers');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error bulk deleting customers');
    }
  });

  app.post('/api/customers/quick', requireAuth, requireFeature('customers'), async (req, res) => {
    try {
      const { name, phone, email, address, city, state, pincode, gstin, customer_type, credit_limit } = req.body;
      if (!name || !phone) return res.status(400).json({ success: false, error: 'Name and phone are required' });
      const customer = await models.customers.quickCreateCustomer({ name, phone, email, address, city, state, pincode, gstin, customer_type, credit_limit });
      res.json({ success: true, customer });
    } catch (err) {
      console.error('Quick create customer error:', err);
      if (err.code === '23505') return res.status(400).json({ success: false, error: 'Phone number already exists' });
      res.status(500).json({ success: false, error: err.message });
    }
  });
};
