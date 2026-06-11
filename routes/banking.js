const express = require('express');
const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');

module.exports = function(app) {
  app.get('/banking', requireAuth, requireFeature('banking'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const [accounts, transactions] = await Promise.all([
        models.banking.getBankAccounts(),
        models.banking.getTransactions(),
      ]);
      const stats = accounts.map(acc => {
        const cleaned = transactions.filter(t => String(t.account_id) === String(acc.account_id));
        const balance = cleaned.reduce((sum, t) => sum + (t.type === 'deposit' || t.type === 'transfer_in' ? parseFloat(t.amount) : -parseFloat(t.amount)), 0);
        return { ...acc, current_balance: balance };
      });
      res.render('banking/dashboard', {
        user: req.session.user || null,
        accounts: stats,
        transactions,
        reconciliationStatus: { matched: transactions.filter(t => t.reconciled).length, unmatched: transactions.filter(t => !t.reconciled).length },
      });
    } catch (err) {
      console.error('Banking dashboard error:', err);
      res.status(500).send('Error loading banking dashboard');
    }
  });

  app.get('/banking/accounts', requireAuth, requireFeature('banking'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const accounts = await models.banking.getBankAccounts();
      res.render('banking/accounts', { user: req.session.user || null, accounts });
    } catch (err) {
      res.status(500).send('Error loading accounts');
    }
  });

  app.get('/banking/accounts/new', requireAuth, requireFeature('banking'), authorize('admin', 'accountant'), async (req, res) => {
    res.render('banking/account-form', { user: req.session.user || null, account: null, errors: [] });
  });

  app.post('/banking/accounts', requireAuth, requireFeature('banking'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const result = await models.banking.createBankAccount(req.body);
      res.redirect('/banking/accounts');
    } catch (err) {
      console.error('Create bank account error:', err);
      res.status(500).send('Error creating account');
    }
  });

  app.get('/banking/transactions', requireAuth, requireFeature('banking'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const transactions = await models.banking.getTransactions(req.query);
      const accounts = await models.banking.getBankAccounts();
      res.render('banking/transactions', { user: req.session.user || null, transactions, accounts });
    } catch (err) {
      res.status(500).send('Error loading transactions');
    }
  });

  app.get('/banking/transactions/new', requireAuth, requireFeature('banking'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const accounts = await models.banking.getBankAccounts();
      res.render('banking/transaction-form', { user: req.session.user || null, accounts, errors: [], transaction: null });
    } catch (err) {
      res.status(500).send('Error loading form');
    }
  });

  app.post('/banking/transactions', requireAuth, requireFeature('banking'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const { account_id, transaction_date, type, amount, description } = req.body;
      await models.banking.createTransaction({ account_id, transaction_date, type, amount, description });
      res.redirect('/banking/transactions');
    } catch (err) {
      console.error('Create transaction error:', err);
      res.status(500).send('Error creating transaction');
    }
  });

  app.post('/banking/transactions/:id/reconcile', requireAuth, requireFeature('banking'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      await models.banking.updateTransaction(req.params.id, { reconciled: true });
      res.redirect(req.query.returnTo || '/banking/transactions');
    } catch (err) {
      res.status(500).send('Error reconciling transaction');
    }
  });

  app.post('/banking/import', requireAuth, requireFeature('banking'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const accountId = req.body.account_id;
      const raw = req.body.rows;
      if (!accountId || !raw) {
        return res.status(400).json({ success: false, message: 'account_id and rows are required' });
      }
      const rows = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const result = await models.banking.importBankStatement(accountId, rows);
      res.json({ success: true, imported: result.imported });
    } catch (err) {
      console.error('Bank import error:', err);
      res.status(500).json({ success: false, message: 'Import failed' });
    }
  });

  app.get('/banking/reconcile', requireAuth, requireFeature('banking'), authorize('admin', 'accountant'), async (req, res) => {
    try {
      const [accounts, transactions] = await Promise.all([
        models.banking.getBankAccounts(),
        models.banking.getTransactions({ reconciled: false }),
      ]);
      res.render('banking/reconcile', { user: req.session.user || null, accounts, transactions: transactions });
    } catch (err) {
      res.status(500).send('Error loading reconciliation dashboard');
    }
  });
};
