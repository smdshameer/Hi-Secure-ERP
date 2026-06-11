const { pool } = require('../config/database');

async function getBankAccounts() {
  const result = await pool.query('SELECT * FROM bank_accounts WHERE is_active = true ORDER BY bank_name, account_number');
  return result.rows;
}

async function getBankAccountById(accountId) {
  const result = await pool.query('SELECT * FROM bank_accounts WHERE account_id = $1', [accountId]);
  return result.rows[0] || null;
}

async function createBankAccount(data) {
  const { bank_name, account_number, account_name, ifsc_code, branch, account_type, opening_balance, opening_date } = data;
  const result = await pool.query(
    `INSERT INTO bank_accounts (bank_name, account_number, account_name, ifsc_code, branch, account_type, opening_balance, opening_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [bank_name, account_number, account_name, ifsc_code || null, branch || null, account_type || 'current', parseFloat(opening_balance || 0), opening_date || new Date().toISOString().slice(0, 10)]
  );
  return result.rows[0];
}

async function updateBankAccount(accountId, data) {
  const { bank_name, account_number, account_name, ifsc_code, branch, account_type, is_active } = data;
  const result = await pool.query(
    `UPDATE bank_accounts SET bank_name = $1, account_number = $2, account_name = $3, ifsc_code = $4, branch = $5, account_type = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP WHERE account_id = $8 RETURNING *`,
    [bank_name, account_number, account_name, ifsc_code || null, branch || null, account_type, is_active !== false, accountId]
  );
  return result.rows[0];
}

async function getTransactions(filters = {}) {
  const params = [];
  const conditions = [];
  if (filters.account_id) {
    conditions.push(`bt.account_id = $${params.length + 1}`);
    params.push(filters.account_id);
  }
  if (filters.type) {
    conditions.push(`bt.type = $${params.length + 1}`);
    params.push(filters.type);
  }
  if (filters.from_date && filters.to_date) {
    conditions.push(`bt.transaction_date BETWEEN $${params.length + 1} AND $${params.length + 2}`);
    params.push(filters.from_date, filters.to_date);
  }
  if (filters.reconciled !== undefined) {
    conditions.push(`bt.reconciled = $${params.length + 1}`);
    params.push(filters.reconciled);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT bt.*, ba.bank_name, ba.account_number FROM bank_transactions bt JOIN bank_accounts ba ON bt.account_id = ba.account_id ${whereClause} ORDER BY bt.transaction_date DESC, bt.transaction_id DESC LIMIT 500`,
    params
  );
  return result.rows;
}

async function getTransactionById(transactionId) {
  const result = await pool.query('SELECT * FROM bank_transactions WHERE transaction_id = $1', [transactionId]);
  return result.rows[0] || null;
}

async function createTransaction(data) {
  const { account_id, transaction_date, type, amount, reference_type, reference_id, description, reconciled } = data;
  const result = await pool.query(
    `INSERT INTO bank_transactions (account_id, transaction_date, type, amount, reference_type, reference_id, description, reconciled)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [account_id, transaction_date || new Date().toISOString().slice(0, 10), type, parseFloat(amount || 0), reference_type || null, reference_id || null, description || null, reconciled || false]
  );
  return result.rows[0];
}

async function updateTransaction(transactionId, data) {
  const { reconciled, description } = data;
  const result = await pool.query(
    `UPDATE bank_transactions SET reconciled = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE transaction_id = $3 RETURNING *`,
    [reconciled, description, transactionId]
  );
  return result.rows[0];
}

async function getReconciliationStats(accountId, fromDate, toDate) {
  const params = [accountId];
  const where = ['account_id = $1'];
  if (fromDate && toDate) {
    where.push(`transaction_date BETWEEN $${params.length + 1} AND $${params.length + 2}`);
    params.push(fromDate, toDate);
  }
  const result = await pool.query(
    `SELECT COUNT(*) as total, SUM(CASE WHEN reconciled THEN 1 ELSE 0 END) as reconciled, SUM(CASE WHEN NOT reconciled THEN 1 ELSE 0 END) as unreconciled, SUM(amount) as total_amount FROM bank_transactions WHERE ${where.join(' AND ')}`,
    params
  );
  return result.rows[0];
}

async function importBankStatement(accountId, rows) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO bank_transactions (account_id, transaction_date, type, amount, description, reconciled)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING transaction_id`,
      [accountId, rows[0].date, rows[0].type || 'deposit', parseFloat(rows[0].amount), rows[0].description || 'Imported', true]
    );
    await client.query('COMMIT');
    return { imported: rows.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getBankAccounts,
  getBankAccountById,
  createBankAccount,
  updateBankAccount,
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  getReconciliationStats,
  importBankStatement,
};
