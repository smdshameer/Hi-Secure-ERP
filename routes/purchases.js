const express = require('express');
const { getPrintContext } = require('../models/print');
const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');
const { body, validationResult } = require('express-validator');

module.exports = function(app) {
  app.get('/purchases', requireAuth, requireFeature('purchases'), async (req, res) => {
    try {
      const orders = await models.purchases.getPurchaseOrders();
      res.render('purchases/list', { orders, user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Database error'); }
  });

  app.get('/purchases/new', requireAuth, requireFeature('purchases'), authorize('admin', 'inventory_manager'), async (req, res) => {
    try {
      const [suppliers, parts] = await Promise.all([
        models.purchases.getActiveSuppliers(),
        models.purchases.getActivePartsForPurchase()
      ]);
      res.render('purchases/new', { suppliers, parts, user: req.session.user || null, errors: [] });
    } catch (err) { console.error(err); res.status(500).send('Database error'); }
  });

  app.post('/purchases', requireAuth, requireFeature('purchases'), authorize('admin', 'inventory_manager'), [
    body('supplier_id').isInt({ min: 1 }).withMessage('Valid supplier is required'),
    body('order_date').optional({ nullable: true }).isISO8601().withMessage('Invalid order date'),
    body('expected_delivery').optional({ nullable: true }).isISO8601().withMessage('Invalid expected delivery date'),
    body('action').optional().isIn(['save', 'order']).withMessage('Invalid action'),
    body('items').custom((value) => {
      let items;
      try { items = typeof value === 'string' ? JSON.parse(value) : value; } catch (e) { throw new Error('Invalid items JSON'); }
      if (!Array.isArray(items) || items.length === 0) throw new Error('At least one item is required');
      return true;
    })
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const [suppliers, parts] = await Promise.all([
          models.purchases.getActiveSuppliers(),
          models.purchases.getActivePartsForPurchase()
        ]);
        return res.status(400).render('purchases/new', {
          errors: errors.array(),
          suppliers, parts,
          user: req.session.user || null
        });
      }

      const { supplier_id, order_date, expected_delivery, notes, items, action } = req.body;
      const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
      const po = await models.purchases.createPurchaseOrder({ supplier_id, order_date, expected_delivery, notes, items: parsedItems, action });
      res.redirect(`/purchases/${po.po_id}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error creating purchase order: ' + err.message);
    }
  });

  app.get('/purchases/:id', requireAuth, requireFeature('purchases'), async (req, res) => {
    try {
      const order = await models.purchases.getPurchaseOrderById(req.params.id);
      if (!order) return res.status(404).render('errors/404', { message: 'Purchase order not found', user: req.session.user || null });
      res.render('purchases/detail', { order, items: order.items || [], user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Error loading purchase order'); }
  });

  app.get('/purchases/:id/print', requireAuth, requireFeature('purchases'), async (req, res) => {
    try {
      const order = await models.purchases.getPurchaseOrderById(req.params.id);
      if (!order) return res.status(404).render('errors/404', { message: 'Purchase order not found', user: req.session.user || null });
      const printCtx = await getPrintContext(req);
  res.render('purchases/print', { order, user: req.session.user || null, printTheme: printCtx.theme, printSize: printCtx.size });
    } catch (err) { console.error(err); res.status(500).send('Error loading purchase order for print'); }
  });

  app.post('/purchases/:id/order', requireAuth, requireFeature('purchases'), authorize('admin', 'inventory_manager'), async (req, res) => {
    try {
      await models.purchases.markPOAsOrdered(req.params.id);
      res.redirect('/purchases');
    } catch (err) { console.error(err); res.status(500).send('Error updating PO status'); }
  });
};
