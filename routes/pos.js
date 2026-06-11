const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');
const { pool } = require('../config/database');
const { body, validationResult } = require('express-validator');

module.exports = function(app) {
  app.get('/pos', requireAuth, requireFeature('pos'), async (req, res) => {
    try {
      const cart = req.session.cart || [];
      const [parts, customers] = await Promise.all([
        models.pos.getActiveParts(),
        models.pos.getActiveCustomers()
      ]);
      const settings = await models.settings.getSettings();
      res.render('pos/index', { cart, parts, customers, settings, user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Error loading POS: ' + err.message); }
  });

  app.post('/pos/add-item', requireAuth, requireFeature('pos'), [
    body('part_id').isInt({ min: 1 }).withMessage('Valid part is required'),
    body('quantity').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Quantity must be at least 1')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, error: errors.array()[0].msg });

      const { part_id, quantity = 1 } = req.body;
      if (!req.session.cart) req.session.cart = [];
      const part = await models.pos.getPartStock(parseInt(part_id));
      if (!part) return res.json({ success: false, error: 'Part not found or not available' });
      if (part.stock_quantity < quantity) return res.json({ success: false, error: `Insufficient stock. Available: ${part.stock_quantity}` });
      const existingItem = req.session.cart.find(item => item.part_id == part_id);
      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        if (newQty > part.stock_quantity) return res.json({ success: false, error: `Insufficient stock. Available: ${part.stock_quantity}` });
        existingItem.quantity = newQty;
      } else {
        req.session.cart.push({ item_id: Date.now() + Math.random(), part_id: part.part_id, part_number: part.part_number, part_name: part.name, unit_price: parseFloat(part.selling_price), quantity, tax_rate: parseFloat(part.tax_rate || 0) });
      }
      req.session.save();
      res.json({ success: true, cartCount: req.session.cart.reduce((sum, i) => sum + i.quantity, 0) });
    } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Error adding item to cart' }); }
  });

  app.post('/pos/remove-item', requireAuth, requireFeature('pos'), [
    body('item_id').notEmpty().withMessage('Item ID is required')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, error: errors.array()[0].msg });

      if (!req.session.cart) req.session.cart = [];
      req.session.cart = req.session.cart.filter(item => item.item_id != req.body.item_id);
      req.session.save();
      res.json({ success: true, cartCount: req.session.cart.reduce((sum, i) => sum + i.quantity, 0) });
    } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Error removing item' }); }
  });

  app.post('/pos/update-quantity', requireAuth, requireFeature('pos'), [
    body('item_id').notEmpty().withMessage('Item ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, error: errors.array()[0].msg });

      const { item_id, quantity } = req.body;
      if (!req.session.cart) req.session.cart = [];
      const item = req.session.cart.find(i => i.item_id == item_id);
      if (!item) return res.status(400).json({ success: false, error: 'Item not found in cart' });
      const part = await models.pos.getPartStock(item.part_id);
      if (part && quantity > part.stock_quantity) return res.status(400).json({ success: false, error: `Insufficient stock. Available: ${part.stock_quantity}` });
      item.quantity = quantity;
      req.session.save();
      res.json({ success: true, cartCount: req.session.cart.reduce((sum, i) => sum + i.quantity, 0) });
    } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Error updating quantity' }); }
  });

  app.post('/pos/clear-cart', requireAuth, requireFeature('pos'), async (req, res) => {
    req.session.cart = [];
    req.session.save();
    res.json({ success: true });
  });

  app.post('/pos/checkout', requireAuth, requireFeature('pos'), [
    body('customer_id').optional({ nullable: true }).customSanitizer(v => v === '' ? null : v).isInt({ min: 1 }).withMessage('Invalid customer'),
    body('payment_method').optional({ nullable: true }).trim().notEmpty().withMessage('Payment method is required'),
    body('payment_notes').optional({ nullable: true }).trim().isLength({ max: 500 }).withMessage('Payment notes are too long')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).send(errors.array()[0].msg);

      const cart = req.session.cart || [];
      const { customer_id, payment_method, payment_notes } = req.body;
      if (cart.length === 0) return res.status(400).send('Cart is empty');
      let subtotal = 0, totalTax = 0;
      const invoiceItems = [];
      const validItems = cart.filter(item => item.part_id);
      for (const item of validItems) {
        const lineTotal = item.quantity * item.unit_price;
        const taxAmount = lineTotal * (item.tax_rate / 100);
        subtotal += lineTotal;
        totalTax += taxAmount;
        invoiceItems.push({ part_id: item.part_id, quantity: item.quantity, unit_price: item.unit_price, tax_rate: item.tax_rate, tax_amount: taxAmount, total_amount: lineTotal + taxAmount });
      }
      const grandTotal = subtotal + totalTax;
      let taxType = 'CGST_SGST', placeOfSupply = null;
      if (customer_id) {
        const customerGstin = await models.customers.getCustomerById(parseInt(customer_id)).then(c => c?.gstin || '');
        const companyGstin = '';
        if (companyGstin && customerGstin && companyGstin.substring(0, 2) !== customerGstin.substring(0, 2)) taxType = 'IGST';
        if (customerGstin && customerGstin.length >= 2) placeOfSupply = customerGstin.substring(0, 2);
      }
      const client = pool;
      const conn = await client.connect();
      try {
        await conn.query('BEGIN');
        const invoiceResult = await conn.query(`INSERT INTO sales_invoices (customer_id, invoice_date, due_date, place_of_supply, created_by, tax_type, grand_total, total_amount, tax_amount, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'issued') RETURNING invoice_id, invoice_number`, [customer_id ? parseInt(customer_id) : null, new Date(), null, placeOfSupply, req.session.user.user_id, taxType, grandTotal, subtotal, totalTax]);
        const invoice = invoiceResult.rows[0];
        for (const item of invoiceItems) {
          await conn.query(`INSERT INTO sales_invoice_items (invoice_id, part_id, quantity, unit_price, tax_rate, tax_amount, total_amount) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [invoice.invoice_id, item.part_id, item.quantity, item.unit_price, item.tax_rate, item.tax_amount, item.total_amount]);
          await models.parts.updateStock(item.part_id, -item.quantity);
        }
        await conn.query('COMMIT');
        req.session.cart = [];
        req.session.save();
        res.redirect(`/pos/receipt/${invoice.invoice_id}`);
      } catch (txErr) {
        try { await conn.query('ROLLBACK'); } catch (rbErr) { /* ignore rollback errors */ }
        throw txErr;
      } finally {
        conn.release();
      }
    } catch (err) { console.error(err); res.status(500).send('Checkout failed: ' + err.message); }
  });

  app.get('/pos/receipt/:invoiceId', requireAuth, requireFeature('pos'), async (req, res) => {
    try {
      const invoice = await models.pos.getInvoiceById(parseInt(req.params.invoiceId));
      if (!invoice) return res.status(404).render('errors/404', { message: 'Invoice not found', user: req.session.user || null });
      res.render('pos/receipt', { invoice, settings: await models.settings.getSettings(), user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Error generating receipt'); }
  });
};
