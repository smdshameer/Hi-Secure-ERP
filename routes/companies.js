const express = require('express');
const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');

module.exports = function(app) {
  // Companies list
  app.get('/companies', requireAuth, requireFeature('multi_company'), async (req, res) => {
    const companies = await models.companies.listCompanies();
    res.render('companies/list', { user: req.session.user || null, companies });
  });

  // New company
  app.get('/companies/new', requireAuth, requireFeature('multi_company'), authorize('admin'), async (req, res) => {
    res.render('companies/form', { user: req.session.user || null, company: null, errors: [] });
  });

  // Create
  app.post('/companies', requireAuth, requireFeature('multi_company'), authorize('admin'), async (req, res) => {
    const company = await models.companies.createCompany(req.body);
    res.redirect('/companies');
  });

  // View
  app.get('/companies/:id', requireAuth, requireFeature('multi_company'), async (req, res) => {
    const company = await models.companies.getCompanyById(req.params.id);
    if (!company) return res.status(404).render('errors/404', { message: 'Company not found', user: req.session.user || null });
    res.render('companies/detail', { user: req.session.user || null, company });
  });

  // Edit form
  app.get('/companies/:id/edit', requireAuth, requireFeature('multi_company'), authorize('admin'), async (req, res) => {
    const company = await models.companies.getCompanyById(req.params.id);
    if (!company) return res.status(404).render('errors/404', { message: 'Company not found', user: req.session.user || null });
    res.render('companies/form', { company, user: req.session.user || null, errors: [] });
  });

  // Update
  app.post('/companies/:id', requireAuth, requireFeature('multi_company'), authorize('admin'), async (req, res) => {
    const company = await models.companies.updateCompany(req.params.id, req.body);
    if (req.body.submit === 'save_and_stay') {
      return res.redirect(`/companies/${company.company_id}`);
    }
    res.redirect('/companies');
  });

  // Delete
  app.post('/companies/:id/delete', requireAuth, requireFeature('multi_company'), authorize('admin'), async (req, res) => {
    await models.companies.deleteCompany(req.params.id);
    res.redirect('/companies');
  });
};