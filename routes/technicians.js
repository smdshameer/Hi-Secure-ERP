const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');
const { body, validationResult } = require('express-validator');

module.exports = function(app) {
  app.get('/technicians', requireAuth, requireFeature('technicians'), async (req, res) => {
    try {
      const technicians = await models.technicians.getTechnicians();
      res.render('technicians/list', { technicians, user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Database error'); }
  });

  app.get('/technicians/new', requireAuth, requireFeature('technicians'), authorize('admin', 'inventory_manager'), (req, res) => {
    res.render('technicians/new', { user: req.session.user || null, errors: [] });
  });

  app.post('/technicians', requireAuth, requireFeature('technicians'), authorize('admin', 'inventory_manager'), [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('specialization').optional({ nullable: true }).trim().isLength({ max: 200 }).withMessage('Specialization is too long')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).render('technicians/new', { errors: errors.array(), user: req.session.user || null });

      const { name, phone, specialization, is_active } = req.body;
      await models.technicians.createTechnician({ name, phone, specialization, is_active });
      res.redirect('/technicians');
    } catch (err) { console.error(err); res.status(500).send('Error creating technician'); }
  });

  app.get('/technicians/:id', requireAuth, requireFeature('technicians'), async (req, res) => {
    try {
      const technician = await models.technicians.getTechnicianById(req.params.id);
      if (!technician) return res.status(404).render('errors/404', { message: 'Technician not found', user: req.session.user || null });
      const repairs = await models.technicians.getTechnicianRepairs(req.params.id);
      res.render('technicians/detail', { technician, repairs, user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Error loading technician'); }
  });

  app.get('/technicians/:id/edit', requireAuth, requireFeature('technicians'), authorize('admin', 'inventory_manager'), async (req, res) => {
    try {
      const technician = await models.technicians.getTechnicianById(req.params.id);
      if (!technician) return res.status(404).render('errors/404', { message: 'Technician not found', user: req.session.user || null });
      res.render('technicians/edit', { technician, user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Error loading technician'); }
  });

  app.post('/technicians/:id', requireAuth, requireFeature('technicians'), authorize('admin', 'inventory_manager'), [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('specialization').optional({ nullable: true }).trim().isLength({ max: 200 }).withMessage('Specialization is too long')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const technician = await models.technicians.getTechnicianById(req.params.id);
        return res.status(400).render('technicians/edit', { errors: errors.array(), technician, user: req.session.user || null });
      }

      const { name, phone, specialization, is_active } = req.body;
      await models.technicians.updateTechnician(req.params.id, { name, phone, specialization, is_active });
      res.redirect(`/technicians/${req.params.id}`);
    } catch (err) { console.error(err); res.status(500).send('Error updating technician'); }
  });

  app.post('/technicians/:id/delete', requireAuth, requireFeature('technicians'), authorize('admin', 'inventory_manager'), async (req, res) => {
    try { await models.technicians.deactivateTechnician(req.params.id); res.redirect('/technicians'); }
    catch (err) { console.error(err); res.status(500).send('Error deleting technician'); }
  });
};
