const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');
const { body, validationResult } = require('express-validator');

module.exports = function(app) {
  app.get('/suppliers', requireAuth, requireFeature('suppliers'), async (req, res) => {
    try {
      const suppliers = await models.suppliers.getSuppliers();
      res.render('suppliers/list', { suppliers, user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Database error'); }
  });

  app.get('/suppliers/new', requireAuth, requireFeature('suppliers'), authorize('admin', 'inventory_manager'), (req, res) => {
    res.render('suppliers/new', { user: req.session.user || null, errors: [] });
  });

  app.post('/suppliers', requireAuth, requireFeature('suppliers'), authorize('admin', 'inventory_manager'), [
    body('name').trim().notEmpty().withMessage('Supplier name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('email').optional({ nullable: true }).isEmail().withMessage('Invalid email'),
    body('gstin').optional({ nullable: true }).matches(/^[0-9A-Z]{15}$/).withMessage('GSTIN must be 15 alphanumeric characters'),
    body('supplier_code').optional({ nullable: true }).trim().notEmpty().withMessage('Supplier code is required if provided')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).render('suppliers/new', { errors: errors.array(), user: req.session.user || null });

      const { supplier_code, name, contact_person, phone, email, gstin, pan, address, city, state, pincode, is_active } = req.body;
      await models.suppliers.createSupplier({ supplier_code, name, contact_person, phone, email, gstin, pan, address, city, state, pincode, is_active });
      res.redirect('/suppliers');
    } catch (err) {
      console.error('Error creating supplier:', err);
      res.status(500).send('Error creating supplier: ' + (err.message || ''));
    }
  });

  app.get('/suppliers/:id', requireAuth, requireFeature('suppliers'), async (req, res) => {
    try {
      const supplier = await models.suppliers.getSupplierById(req.params.id);
      if (!supplier) return res.status(404).render('errors/404', { message: 'Supplier not found', user: req.session.user || null });
      const deliveryChallans = await models.suppliers.getSupplierDeliveryChallans(req.params.id);
      res.render('suppliers/detail', { supplier, deliveryChallans, user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Error loading supplier'); }
  });

  app.get('/suppliers/:id/edit', requireAuth, requireFeature('suppliers'), authorize('admin', 'inventory_manager'), async (req, res) => {
    try {
      const supplier = await models.suppliers.getSupplierById(req.params.id);
      if (!supplier) return res.status(404).render('errors/404', { message: 'Supplier not found', user: req.session.user || null });
      res.render('suppliers/edit', { supplier, user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Error loading supplier'); }
  });

  app.post('/suppliers/:id', requireAuth, requireFeature('suppliers'), authorize('admin', 'inventory_manager'), [
    body('name').trim().notEmpty().withMessage('Supplier name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('email').optional({ nullable: true }).isEmail().withMessage('Invalid email'),
    body('gstin').optional({ nullable: true }).matches(/^[0-9A-Z]{15}$/).withMessage('GSTIN must be 15 alphanumeric characters')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const supplier = await models.suppliers.getSupplierById(req.params.id);
        return res.status(400).render('suppliers/edit', { errors: errors.array(), supplier, user: req.session.user || null });
      }

      const { supplier_code, name, contact_person, phone, email, gstin, pan, address, city, state, pincode, is_active } = req.body;
      await models.suppliers.updateSupplier(req.params.id, { supplier_code, name, contact_person, phone, email, gstin, pan, address, city, state, pincode, is_active });
      res.redirect(`/suppliers/${req.params.id}`);
    } catch (err) {
      console.error('Error updating supplier:', err);
      res.status(500).send('Error updating supplier: ' + (err.message || ''));
    }
  });

  app.post('/suppliers/:id/delete', requireAuth, requireFeature('suppliers'), authorize('admin', 'inventory_manager'), async (req, res) => {
    try { await models.suppliers.deactivateSupplier(req.params.id); res.redirect('/suppliers'); }
    catch (err) { console.error(err); res.status(500).send('Error deleting supplier'); }
  });
};
