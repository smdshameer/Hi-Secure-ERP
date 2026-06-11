const express = require('express');
const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');

module.exports = function(app) {
  app.get('/stores', requireAuth, requireFeature('multi_store'), async (req, res) => {
    try {
      const stores = await models.stores.listStores();
      res.render('stores/list', { user: req.session.user || null, stores });
    } catch (err) { console.error(err); res.status(500).send('Error loading stores'); }
  });

  app.get('/stores/new', requireAuth, requireFeature('multi_store'), authorize('admin'), async (req, res) => {
    res.render('stores/form', { user: req.session.user || null, store: null, errors: [] });
  });

  app.get('/stores/:id/edit', requireAuth, requireFeature('multi_store'), authorize('admin'), async (req, res) => {
    try {
      const store = await models.stores.getStoreById(req.params.id);
      if (!store) return res.status(404).render('errors/404', { message: 'Store not found', user: req.session.user || null });
      res.render('stores/form', { user: req.session.user || null, store, errors: [] });
    } catch (err) { console.error(err); res.status(500).send('Error loading store'); }
  });

  app.post('/stores', requireAuth, requireFeature('multi_store'), authorize('admin'), async (req, res) => {
    try {
      const store = await models.stores.createStore(req.body);
      res.redirect('/stores');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error creating store');
    }
  });

  app.post('/stores/:id', requireAuth, requireFeature('multi_store'), authorize('admin'), async (req, res) => {
    try {
      const store = await models.stores.updateStore(req.params.id, req.body);
      res.redirect('/stores');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error updating store');
    }
  });

  app.post('/stores/:id/delete', requireAuth, requireFeature('multi_store'), authorize('admin'), async (req, res) => {
    try {
      await models.stores.deleteStore(req.params.id);
      res.redirect('/stores');
    } catch (err) {
      res.status(500).send('Error deleting store');
    }
  });

  app.get('/stores/:id', requireAuth, requireFeature('multi_store'), async (req, res) => {
    try {
      const store = await models.stores.getStoreById(req.params.id);
      if (!store) return res.status(404).render('errors/404', { message: 'Store not found', user: req.session.user || null });
      res.render('stores/detail', { user: req.session.user || null, store });
    } catch (err) { console.error(err); res.status(500).send('Error loading store'); }
  });
};
