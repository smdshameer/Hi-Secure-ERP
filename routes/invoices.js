const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');

module.exports = function(app) {
  app.get('/invoices', requireAuth, requireFeature('sales'), async (req, res) => {
    res.redirect('/sales');
  });

  app.get('/invoices/:id', requireAuth, requireFeature('sales'), async (req, res) => {
    res.redirect(`/sales/${req.params.id}`);
  });

  app.get('/invoices/:id/print', requireAuth, requireFeature('sales'), async (req, res) => {
    res.redirect(`/sales/${req.params.id}/print`);
  });
};
