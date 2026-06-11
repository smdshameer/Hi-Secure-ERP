const express = require('express');
const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');
const { getPrintContext } = require('../models/print');
const { pool } = require('../config/database');
const { body, validationResult } = require('express-validator');

module.exports = function(app) {
  app.get('/parts', requireAuth, requireFeature('inventory'), async (req, res) => {
    try {
      const parts = await models.parts.getAllParts();
      const stats = await models.parts.getPartsStats();
      res.render('parts/list', { parts, stats, user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Database error parts: ' + err.message); }
  });

  app.get('/parts/new', requireAuth, requireFeature('inventory'), async (req, res) => {
    try {
      const brands = await models.parts.getBrands();
      res.render('parts/new', { brands, user: req.session.user || null, errors: [] });
    } catch (err) { console.error(err); res.status(500).send('Database error'); }
  });

  app.post('/parts', requireAuth, requireFeature('inventory'), authorize('admin', 'inventory_manager'), [
    body('part_number').trim().notEmpty().withMessage('Part number is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('brand_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid brand'),
    body('cost_price').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
    body('selling_price').isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
    body('tax_rate').optional({ nullable: true }).isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
    body('stock_quantity').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
    body('reorder_level').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Reorder level must be a non-negative integer')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const brands = await models.parts.getBrands();
        return res.status(400).render('parts/new', { errors: errors.array(), brands, user: req.session.user || null });
      }

      const { part_number, name, description, brand_id, hsn_code, cost_price, selling_price, tax_rate, stock_quantity, reorder_level, is_active } = req.body;
      await models.parts.createPart({ part_number, name, description, brand_id, hsn_code, cost_price, selling_price, tax_rate, stock_quantity, reorder_level, is_active });
      res.redirect('/parts');
    } catch (err) {
      console.error('Error creating part:', err);
      if (err.code === '23505') return res.status(400).send('Part number already exists');
      res.status(500).send('Error creating part');
    }
  });

  app.post('/parts/bulk-delete', requireAuth, requireFeature('inventory'), authorize('admin', 'inventory_manager'), async (req, res) => {
    try {
      const ids = req.body.selected_parts || [];
      if (ids.length > 0) await models.parts.bulkDeleteParts(ids);
      res.redirect('/parts');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error bulk deleting parts');
    }
  });

  app.get('/parts/:id', requireAuth, requireFeature('inventory'), async (req, res) => {
    try {
      const part = await models.parts.getPartById(req.params.id);
      if (!part) return res.status(404).render('errors/404', { message: 'Part not found', user: req.session.user || null });
      const [repairs, deliveryChallans] = await Promise.all([
        models.parts.getPartRepairs(req.params.id),
        models.parts.getPartDeliveryChallans(req.params.id)
      ]);
      res.render('parts/detail', { part, repairs, deliveryChallans, user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Error loading part'); }
  });

  app.get('/parts/:id/print', requireAuth, requireFeature('inventory'), async (req, res) => {
    try {
      const part = await models.parts.getPartById(req.params.id);
      if (!part) return res.status(404).render('errors/404', { message: 'Part not found', user: req.session.user || null });
      const settings = await models.settings.getSettings();
const printCtx = await getPrintContext(req);
res.render('parts/print', { part, settings, user: req.session.user || null, printTheme: printCtx.theme, printSize: printCtx.size });
    } catch (err) { console.error(err); res.status(500).send('Error loading part for print'); }
  });

  app.get('/parts/:id/edit', requireAuth, requireFeature('inventory'), authorize('admin', 'inventory_manager'), async (req, res) => {
    try {
      const part = await models.parts.getPartById(req.params.id);
      if (!part) return res.status(404).render('errors/404', { message: 'Part not found', user: req.session.user || null });
      const brands = await models.parts.getBrands();
      res.render('parts/edit', { part, brands, user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Error loading part'); }
  });

  app.post('/parts/:id', requireAuth, requireFeature('inventory'), authorize('admin', 'inventory_manager'), [
    body('part_number').trim().notEmpty().withMessage('Part number is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('brand_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid brand'),
    body('cost_price').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
    body('selling_price').isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
    body('tax_rate').optional({ nullable: true }).isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
    body('stock_quantity').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
    body('reorder_level').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Reorder level must be a non-negative integer')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const part = await models.parts.getPartById(parseInt(req.params.id));
        const brands = await models.parts.getBrands();
        return res.status(400).render('parts/edit', { errors: errors.array(), part, brands, user: req.session.user || null });
      }

      const partId = parseInt(req.params.id);
      const part = await models.parts.getPartById(partId);
      if (!part) return res.status(404).send('Part not found');
      const { part_number, name, description, brand_id, hsn_code, cost_price, selling_price, tax_rate, reorder_level, is_active } = req.body;
      await models.parts.updatePart(partId, { part_number, name, description, brand_id, hsn_code, cost_price, selling_price, tax_rate, reorder_level, is_active });
      res.redirect(`/parts/${partId}`);
    } catch (err) {
      console.error('Error updating part:', err);
      if (err.code === '23505') return res.status(400).send('Part number already exists');
      res.status(500).send('Error updating part');
    }
  });

  app.post('/parts/:id/delete', requireAuth, requireFeature('inventory'), authorize('admin', 'inventory_manager'), async (req, res) => {
    try {
      await models.parts.deletePart(req.params.id);
      res.redirect('/parts');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error deleting part');
    }
  });

  app.post('/api/parts/quick', requireAuth, async (req, res) => {
    try {
      const { part_number, name, brand_name, selling_price, cost_price, hsn_code, stock_quantity } = req.body;
      if (!part_number || !name || !selling_price) return res.status(400).json({ success: false, error: 'Part number, name, and selling price are required' });
      const existing = await pool.query('SELECT part_id FROM parts WHERE part_number = $1', [part_number.trim()]);
      if (existing.rows.length > 0) return res.status(400).json({ success: false, error: 'Part number already exists' });
      const part = await models.parts.quickCreatePart({ part_number, name, brand_name, selling_price, cost_price, hsn_code, stock_quantity });
      res.json({ success: true, part });
    } catch (err) {
      console.error('Quick create part error:', err);
      if (err.code === '23505') return res.status(400).json({ success: false, error: 'Part number already exists' });
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/parts/export', requireAuth, requireFeature('inventory'), async (req, res) => {
    try {
      const parts = await models.parts.exportPartsCSV();
      const headers = ['Part Number', 'Name', 'Description', 'Brand', 'HSN Code', 'Cost Price', 'Selling Price', 'Tax Rate', 'Stock', 'Reorder Level', 'Status'];
      const rows = parts.map(r => [r.part_number, r.name, r.description || '', r.brand || '', r.hsn_code || '', r.cost_price || 0, r.selling_price || 0, r.tax_rate || 0, r.stock_quantity, r.reorder_level, r.status]);
      const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename=parts_inventory.csv');
      res.send(csv);
    } catch (err) { console.error(err); res.status(500).send('Export error'); }
  });
};
