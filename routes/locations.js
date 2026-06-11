const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');
const { body, validationResult } = require('express-validator');

module.exports = function(app) {
  app.get('/locations', requireAuth, requireFeature('locations'), async (req, res) => {
    try {
      const locations = await models.locations.getLocations();
      res.render('locations/list', { locations, user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Database error'); }
  });

  app.get('/locations/new', requireAuth, requireFeature('locations'), authorize('admin', 'inventory_manager'), (req, res) => {
    res.render('locations/new', { user: req.session.user || null, errors: [] });
  });

  app.post('/locations', requireAuth, requireFeature('locations'), authorize('admin', 'inventory_manager'), [
    body('location_code').trim().notEmpty().withMessage('Location code is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').optional({ nullable: true }).isEmail().withMessage('Invalid email')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).render('locations/new', { errors: errors.array(), user: req.session.user || null });

      const { location_code, name, address, phone, email, gstin, is_main, is_active } = req.body;
      await models.locations.createLocation({ location_code, name, address, phone, email, gstin, is_main, is_active });
      res.redirect('/locations');
    } catch (err) { console.error(err); res.status(500).send('Error creating location'); }
  });

  app.get('/locations/:id', requireAuth, requireFeature('locations'), async (req, res) => {
    try {
      const location = await models.locations.getLocationById(req.params.id);
      if (!location) return res.status(404).render('errors/404', { message: 'Location not found', user: req.session.user || null });
      const stats = await models.locations.getLocationStats(req.params.id);
      res.render('locations/detail', { location, stats, user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Error loading location'); }
  });

  app.get('/locations/:id/edit', requireAuth, requireFeature('locations'), authorize('admin', 'inventory_manager'), async (req, res) => {
    try {
      const location = await models.locations.getLocationById(req.params.id);
      if (!location) return res.status(404).render('errors/404', { message: 'Location not found', user: req.session.user || null });
      res.render('locations/edit', { location, user: req.session.user || null });
    } catch (err) { console.error(err); res.status(500).send('Error loading location'); }
  });

  app.post('/locations/:id', requireAuth, requireFeature('locations'), authorize('admin', 'inventory_manager'), [
    body('location_code').trim().notEmpty().withMessage('Location code is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').optional({ nullable: true }).isEmail().withMessage('Invalid email')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const location = await models.locations.getLocationById(req.params.id);
        return res.status(400).render('locations/edit', { errors: errors.array(), location, user: req.session.user || null });
      }

      const { location_code, name, address, phone, email, gstin, is_main, is_active } = req.body;
      await models.locations.updateLocation(req.params.id, { location_code, name, address, phone, email, gstin, is_main, is_active });
      res.redirect(`/locations/${req.params.id}`);
    } catch (err) { console.error(err); res.status(500).send('Error updating location'); }
  });

  app.post('/locations/:id/delete', requireAuth, requireFeature('locations'), authorize('admin', 'inventory_manager'), async (req, res) => {
    try { await models.locations.deactivateLocation(req.params.id); res.redirect('/locations'); }
    catch (err) { console.error(err); res.status(500).send('Error deleting location'); }
  });
};
