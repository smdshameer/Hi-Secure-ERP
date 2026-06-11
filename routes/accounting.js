const express = require('express');
const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');
const { getSettings } = require('../config/settings');

module.exports = function(app) {
  app.get('/accounting', requireAuth, requireFeature('accounting'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const settings = await getSettings();
      res.render('accounting/index', { user: req.session.user || null, settings });
    } catch (err) {
      res.status(500).send('Error loading accounting');
    }
  });

  app.get('/accounting/coa', requireAuth, requireFeature('accounting'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const accounts = await models.accounting.getCOA();
      res.render('accounting/coa', { user: req.session.user || null, accounts });
    } catch (err) {
      res.status(500).send('Error loading chart of accounts');
    }
  });

  app.get('/accounting/vouchers', requireAuth, requireFeature('accounting'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const vouchers = await models.accounting.getVouchers(req.query);
      res.render('accounting/vouchers', { user: req.session.user || null, vouchers });
    } catch (err) {
      res.status(500).send('Error loading vouchers');
    }
  });

  app.get('/accounting/vouchers/new', requireAuth, requireFeature('accounting'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const accounts = await models.accounting.getCOA();
      res.render('accounting/voucher-new', { user: req.session.user || null, accounts, errors: [], voucher: null });
    } catch (err) {
      res.status(500).send('Error loading voucher form');
    }
  });

  app.post('/accounting/vouchers', requireAuth, requireFeature('accounting'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const { voucher_number, voucher_type, voucher_date, narration, entries } = req.body;
      if (!voucher_type || !voucher_date || !entries || !entries.length) {
        return res.status(400).render('accounting/voucher-new', {
          user: req.session.user || null,
          accounts: await models.accounting.getCOA(),
          errors: [{ msg: 'Voucher type, date, and at least one entry are required' }],
          voucher: req.body,
        });
      }
      const totalDebit = (entries || []).reduce((sum, e) => sum + parseFloat(e.debit_amount || 0), 0);
      const totalCredit = (entries || []).reduce((sum, e) => sum + parseFloat(e.credit_amount || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).render('accounting/voucher-new', {
          user: req.session.user || null,
          accounts: await models.accounting.getCOA(),
          errors: [{ msg: `Debit (${totalDebit.toFixed(2)}) and Credit (${totalCredit.toFixed(2)}) must match` }],
          voucher: req.body,
        });
      }
      const voucher = await models.accounting.createVoucher({
        voucher_number: voucher_number || `VO-${Date.now().toString(36).toUpperCase()}`,
        voucher_type,
        voucher_date,
        narration,
        entries,
        created_by: req.session.user.user_id,
      });
      res.redirect(`/accounting/vouchers/${voucher.voucher_id}`);
    } catch (err) {
      console.error('Voucher creation error:', err);
      res.status(500).send('Error creating voucher');
    }
  });

  app.get('/accounting/vouchers/:id', requireAuth, requireFeature('accounting'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const voucher = await models.accounting.getVoucherById(req.params.id);
      if (!voucher) return res.status(404).send('Voucher not found');
      res.render('accounting/voucher-detail', { user: req.session.user || null, voucher });
    } catch (err) {
      res.status(500).send('Error loading voucher');
    }
  });

  app.get('/accounting/ledger/:id', requireAuth, requireFeature('accounting'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const ledger = await models.accounting.getLedger(req.params.id, req.query.from, req.query.to);
      if (!ledger) return res.status(404).send('Account not found');
      res.render('accounting/ledger', { user: req.session.user || null, ledger });
    } catch (err) {
      res.status(500).send('Error loading ledger');
    }
  });

  app.get('/accounting/trial-balance', requireAuth, requireFeature('accounting'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const tb = await models.accounting.getTrialBalance();
      const totals = tb.reduce((acc, r) => ({
        total_opening: acc.total_opening + parseFloat(r.opening_balance || 0),
        total_debit: acc.total_debit + parseFloat(r.period_debit),
        total_credit: acc.total_credit + parseFloat(r.period_credit),
        total_closing: acc.total_closing + parseFloat(r.closing_debit),
      }), { total_opening: 0, total_debit: 0, total_credit: 0, total_closing: 0 });
      res.render('accounting/trial-balance', { user: req.session.user || null, tb, totals });
    } catch (err) {
      res.status(500).send('Error loading trial balance');
    }
  });

  app.get('/accounting/pnl', requireAuth, requireFeature('accounting'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const rows = await models.accounting.getPnL();
      const totals = { income: { debit: 0, credit: 0 }, expense: { debit: 0, credit: 0 } };
      rows.forEach(r => {
        totals[r.account_type].debit += parseFloat(r.period_debit);
        totals[r.account_type].credit += parseFloat(r.period_credit);
      });
      res.render('accounting/pnl', { user: req.session.user || null, rows, totals });
    } catch (err) {
      res.status(500).send('Error loading P&L');
    }
  });

  app.get('/accounting/balance-sheet', requireAuth, requireFeature('accounting'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const rows = await models.accounting.getBalanceSheet();
      res.render('accounting/balance-sheet', { user: req.session.user || null, rows });
    } catch (err) {
      res.status(500).send('Error loading balance sheet');
    }
  });
};
