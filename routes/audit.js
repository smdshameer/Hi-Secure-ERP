const express = require('express');
const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');

module.exports = function(app) {
  app.get('/audit', requireAuth, requireFeature('audit'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const logs = await models.audit.getLogs(req.query);
      const stats = await models.audit.getStats();
      res.render('audit/index', { user: req.session.user || null, logs, stats, filters: req.query });
    } catch (err) { console.error(err); res.status(500).send('Error loading audit log'); }
  });
};
