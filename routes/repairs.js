const express = require('express');
const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const pool = require('../config/database').pool;
const models = require('../models');
const { body, validationResult } = require('express-validator');
const { getPrintContext } = require('../models/print');

module.exports = function(app) {
  app.get('/repairs', requireAuth, requireFeature('repairs'), async (req, res) => {
    try {
      const status = req.query.status || 'all';
      const repairs = await models.repairs.getRepairsByStatus(status);
      res.render('repairs/list', { repairs, currentStatus: status, user: req.session.user || null });
    } catch (err) {
      console.error(err);
      res.status(500).send('Database error');
    }
  });

  app.get('/repairs/export', requireAuth, requireFeature('repairs'), async (req, res) => {
    try {
      const XLSX = require('xlsx');
      const status = req.query.status || 'all';
      const repairs = await models.repairs.getRepairsByStatus(status);
      const data = repairs.map(r => ({
        'Ticket #': r.ticket_number,
        Customer: r.customer_name,
        Contact: r.customer_phone,
        Product: r.product_type,
        Brand: r.brand_name || '',
        'Serial Number': r.serial_number || '',
        Status: r.repair_status,
        'Received Date': r.received_date,
        'Estimated Cost': r.estimated_cost,
        'Actual Cost': r.actual_cost,
        Technician: r.technician_name || '',
        'Days In Shop': r.days_in_shop
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Repairs');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Repairs.xlsx"');
      res.send(buf);
    } catch (err) {
      console.error('Repairs export failed:', err);
      res.status(500).send('Export failed');
    }
  });

  app.get('/repairs/new', requireAuth, requireFeature('repairs'), async (req, res) => {
    try {
      const [customers, brands, technicians] = await Promise.all([
        models.customers.getAllCustomers(),
        models.repairs.getBrands(),
        models.repairs.getActiveTechnicians()
      ]);
      res.render('repairs/new', { customers, brands, technicians, user: req.session.user || null, errors: [] });
    } catch (err) {
      console.error(err);
      res.status(500).send('Database error');
    }
  });

  app.post('/repairs', requireAuth, requireFeature('repairs'), [
    body('customer_id').isInt({ min: 1 }).withMessage('Valid customer is required'),
    body('product_type').trim().notEmpty().withMessage('Product type is required'),
    body('problem_description').trim().notEmpty().withMessage('Problem description is required'),
    body('brand_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid brand selected'),
    body('estimated_cost').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Estimated cost must be a positive number')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const [customers, brands, technicians] = await Promise.all([
          models.customers.getAllCustomers(),
          models.repairs.getBrands(),
          models.repairs.getActiveTechnicians()
        ]);
        return res.status(400).render('repairs/new', {
          errors: errors.array(),
          customers, brands, technicians,
          user: req.session.user || null
        });
      }

      const { customer_id, product_type, brand_id, serial_number, model_number, problem_description, estimated_cost, warranty_status, notes } = req.body;
      const customerCheck = await pool.query('SELECT customer_id FROM customers WHERE customer_id = $1 AND is_active = true', [parseInt(customer_id)]);
      if (customerCheck.rows.length === 0) return res.status(400).send('Customer not found or inactive');

      let brandId = null;
      if (brand_id) {
        const brandCheck = await pool.query('SELECT brand_id FROM brands WHERE brand_id = $1', [parseInt(brand_id)]);
        if (brandCheck.rows.length === 0) return res.status(400).send('Invalid brand selected');
        brandId = parseInt(brand_id);
      }

      const result = await models.repairs.createRepair({ customer_id, product_type, brand_id: brandId, serial_number, model_number, problem_description, estimated_cost, warranty_status, notes });
      res.redirect(`/repairs/${result.repair_id}`);
    } catch (err) {
      console.error('Error creating repair:', err);
      if (err.code === '23503') return res.status(400).send('Invalid customer or brand reference');
      res.status(500).send('Error creating repair');
    }
  });

  app.get('/repairs/:id', requireAuth, requireFeature('repairs'), async (req, res) => {
    try {
      const [repair, customers, partsUsed, payments] = await Promise.all([
        models.repairs.getRepairById(req.params.id),
        models.customers.getAllCustomers(),
        models.repairs.getRepairParts(req.params.id),
        models.repairs.getRepairPayments(req.params.id)
      ]);
      if (!repair) return res.status(404).send('Repair not found');
      res.render('repairs/detail', { repair, customers, partsUsed, payments, user: req.session.user || null, errors: [] });
    } catch (err) {
      console.error(err);
      res.status(500).send('Database error');
    }
  });

  app.get('/repairs/:id/print', requireAuth, requireFeature('repairs'), async (req, res) => {
    try {
      const repair = await models.repairs.getRepairById(req.params.id);
      if (!repair) return res.status(404).render('errors/404', { message: 'Repair not found', user: req.session.user || null });
      const [partsUsed, payments] = await Promise.all([
        models.repairs.getRepairParts(req.params.id),
        models.repairs.getRepairPayments(req.params.id)
      ]);
      const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const settings = await models.settings.getSettings();
const printCtx = await getPrintContext(req);
      res.render('repairs/print', { repair, partsUsed, payments, totalPayments, settings, user: req.session.user || null, printTheme: printCtx.theme, printSize: printCtx.size });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading repair for print');
    }
  });

  app.post('/repairs/:id/status', requireAuth, requireFeature('repairs'), authorize('admin', 'sales', 'technician', 'accountant'), [
    body('status').notEmpty().withMessage('Status is required')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const repair = await models.repairs.getRepairById(req.params.id);
        if (!repair) return res.status(404).send('Repair not found');
        const [customers, partsUsed, payments] = await Promise.all([
          models.customers.getAllCustomers(),
          models.repairs.getRepairParts(req.params.id),
          models.repairs.getRepairPayments(req.params.id)
        ]);
        return res.status(400).render('repairs/detail', {
          repair,
          customers,
          partsUsed,
          payments,
          errors: errors.array(),
          user: req.session.user || null
        });
      }
      const { status } = req.body;
      await models.repairs.updateRepairStatus(req.params.id, status);
      res.redirect(`/repairs/${req.params.id}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error updating status');
    }
  });

  app.post('/repairs/:id/assign', requireAuth, requireFeature('repairs'), authorize('admin', 'sales'), [
    body('technician_id').isInt({ min: 1 }).withMessage('Valid technician is required')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const repair = await models.repairs.getRepairById(req.params.id);
        if (!repair) return res.status(404).send('Repair not found');
        const [customers, partsUsed, payments] = await Promise.all([
          models.customers.getAllCustomers(),
          models.repairs.getRepairParts(req.params.id),
          models.repairs.getRepairPayments(req.params.id)
        ]);
        return res.status(400).render('repairs/detail', {
          repair,
          customers,
          partsUsed,
          payments,
          errors: errors.array(),
          user: req.session.user || null
        });
      }

      const { technician_id } = req.body;
      await pool.query('UPDATE repairs SET assigned_technician_id = $1 WHERE repair_id = $2', [technician_id, req.params.id]);
      res.redirect(`/repairs/${req.params.id}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error assigning technician');
    }
  });

  app.post('/repairs/:id/payments', requireAuth, requireFeature('repairs'), authorize('admin', 'sales', 'technician', 'accountant'), [
    body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be positive'),
    body('payment_method').trim().notEmpty().withMessage('Payment method is required')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const repair = await models.repairs.getRepairById(req.params.id);
        if (!repair) return res.status(404).send('Repair not found');
        const [customers, partsUsed, payments] = await Promise.all([
          models.customers.getAllCustomers(),
          models.repairs.getRepairParts(req.params.id),
          models.repairs.getRepairPayments(req.params.id)
        ]);
        return res.status(400).render('repairs/detail', {
          repair,
          customers,
          partsUsed,
          payments,
          errors: errors.array(),
          user: req.session.user || null
        });
      }

      const repairId = parseInt(req.params.id);
      const amount = parseFloat(req.body.amount);
      const payment_method = req.body.payment_method;
      const notes = req.body.notes || null;
      const repairCheck = await pool.query('SELECT repair_id FROM repairs WHERE repair_id = $1', [repairId]);
      if (repairCheck.rows.length === 0) return res.status(404).send('Repair not found');
      await models.repairs.addPaymentToRepair(repairId, amount, payment_method, notes);
      res.redirect(`/repairs/${repairId}`);
    } catch (err) {
      console.error('Error adding payment:', err);
      res.status(500).send('Error adding payment');
    }
  });

  app.post('/repairs/:id/parts', requireAuth, requireFeature('repairs'), authorize('admin', 'sales', 'technician'), [
    body('part_id').isInt({ min: 1 }).withMessage('Valid part is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const repair = await models.repairs.getRepairById(req.params.id);
        if (!repair) return res.status(404).send('Repair not found');
        const [customers, partsUsed, payments] = await Promise.all([
          models.customers.getAllCustomers(),
          models.repairs.getRepairParts(req.params.id),
          models.repairs.getRepairPayments(req.params.id)
        ]);
        return res.status(400).render('repairs/detail', {
          repair,
          customers,
          partsUsed,
          payments,
          errors: errors.array(),
          user: req.session.user || null
        });
      }

      const repairId = parseInt(req.params.id);
      const partId = parseInt(req.body.part_id);
      const quantity = parseInt(req.body.quantity) || 1;
      await models.repairs.addPartToRepair(repairId, partId, quantity);
      res.redirect(`/repairs/${repairId}`);
    } catch (err) {
      console.error('Error adding part:', err);
      res.status(err.message.includes('not found') || err.message.includes('Insufficient stock') ? 400 : 500).send(err.message);
    }
  });

  app.get('/repairs/:id/edit', requireAuth, requireFeature('repairs'), authorize('admin', 'sales'), async (req, res) => {
    try {
      const repair = await models.repairs.getRepairById(req.params.id);
      if (!repair) return res.status(404).render('errors/404', { message: 'Repair not found', user: req.session.user || null });
      const [customers, brands, technicians] = await Promise.all([
        models.customers.getAllCustomers(),
        models.repairs.getBrands(),
        models.repairs.getActiveTechnicians()
      ]);
      res.render('repairs/edit', { repair, customers, brands, technicians, user: req.session.user || null });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading repair');
    }
  });

  app.post('/repairs/:id', requireAuth, requireFeature('repairs'), authorize('admin', 'sales'), [
    body('customer_id').isInt({ min: 1 }).withMessage('Valid customer is required'),
    body('product_type').trim().notEmpty().withMessage('Product type is required'),
    body('problem_description').trim().notEmpty().withMessage('Problem description is required'),
    body('brand_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid brand selected'),
    body('estimated_cost').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Estimated cost must be a positive number')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const repair = await models.repairs.getRepairById(parseInt(req.params.id));
        const [customers, brands, technicians] = await Promise.all([
          models.customers.getAllCustomers(),
          models.repairs.getBrands(),
          models.repairs.getActiveTechnicians()
        ]);
        return res.status(400).render('repairs/edit', {
          errors: errors.array(),
          repair,
          customers, brands, technicians,
          user: req.session.user || null
        });
      }

      const repairId = parseInt(req.params.id);
      const repair = await models.repairs.getRepairById(repairId);
      if (!repair) return res.status(404).send('Repair not found');
      const { customer_id, product_type, brand_id, serial_number, model_number, problem_description, estimated_cost, warranty_status, notes } = req.body;
      let brandId = null;
      if (brand_id) brandId = parseInt(brand_id);
      await models.repairs.updateRepair(repairId, { customer_id: parseInt(customer_id), product_type, brand_id: brandId, serial_number, model_number, problem_description, estimated_cost, warranty_status, notes });
      res.redirect(`/repairs/${repairId}`);
    } catch (err) {
      console.error('Error updating repair:', err);
      res.status(500).send('Error updating repair');
    }
  });

  app.post('/repairs/:id/delete', requireAuth, requireFeature('repairs'), authorize('admin', 'sales'), async (req, res) => {
    try {
      await models.repairs.deleteRepair(req.params.id);
      res.redirect('/repairs');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error deleting repair');
    }
  });
};
