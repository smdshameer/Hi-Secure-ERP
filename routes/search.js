const { requireAuth } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');

module.exports = function(app) {
  app.get('/search', requireAuth, requireFeature('search'), async (req, res) => {
    try {
      const query = req.query.q || '';
      if (query.length < 2) {
        return res.render('search/results', { results: [], query, user: req.session.user || null });
      }
      const results = await models.search.globalSearch(query);
      res.render('search/results', { results, query, user: req.session.user || null });
    } catch (err) {
      console.error('Search error:', err);
      res.status(500).send('Search error');
    }
  });
};
