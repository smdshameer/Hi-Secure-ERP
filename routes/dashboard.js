const { requireAuth } = require('../middleware/auth');
const models = require('../models');

module.exports = function(app) {
  app.get('/', requireAuth, async (req, res) => {
    try {
      const [
        stats,
        recentRepairs,
        pendingInvoices,
        salesRevenue,
        recentInvoices,
        completedThisMonth
      ] = await Promise.all([
        models.reports.getStats(),
        models.repairs.getRecentRepairs(10),
        models.reports.getPendingInvoices(),
        models.reports.getSalesRevenue(),
        models.reports.getRecentInvoices(5),
        models.reports.getCompletedRepairsThisMonth()
      ]);
      res.render('dashboard', {
        stats,
        recentRepairs,
        pendingInvoices,
        salesRevenue,
        recentInvoices,
        completedThisMonth,
        user: req.session.user || null
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Database error');
    }
  });
};
