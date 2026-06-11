const { pool } = require('../config/database');

async function getCOA() {
  const result = await pool.query('SELECT * FROM accounts WHERE is_active = true ORDER BY account_code');
  return result.rows;
}

async function getAccountById(accountId) {
  const result = await pool.query('SELECT * FROM accounts WHERE account_id = $1', [accountId]);
  return result.rows[0] || null;
}

async function getAccountByCode(code) {
  const result = await pool.query('SELECT * FROM accounts WHERE account_code = $1', [code]);
  return result.rows[0] || null;
}

async function createAccount(data) {
  const { account_code, account_name, account_type, parent_account_id, opening_balance, opening_balance_type, is_active } = data;
  const result = await pool.query(
    `INSERT INTO accounts (account_code, account_name, account_type, parent_account_id, opening_balance, opening_balance_type, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [account_code, account_name, account_type, parent_account_id || null, parseFloat(opening_balance || 0), opening_balance_type || 'Dr', is_active !== false]
  );
  return result.rows[0];
}

async function updateAccount(accountId, data) {
  const { account_name, account_type, parent_account_id, opening_balance, opening_balance_type, is_active } = data;
  const result = await pool.query(
    `UPDATE accounts SET account_name = $1, account_type = $2, parent_account_id = $3, opening_balance = $4, opening_balance_type = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP WHERE account_id = $7 RETURNING *`,
    [account_name, account_type, parent_account_id || null, parseFloat(opening_balance || 0), opening_balance_type || 'Dr', is_active !== false, accountId]
  );
  return result.rows[0];
}

async function deleteAccount(accountId) {
  await pool.query('UPDATE accounts SET is_active = false WHERE account_id = $1', [accountId]);
}

async function getVouchers(filters = {}) {
  const params = [];
  const conditions = [];
  if (filters.voucher_type) {
    conditions.push(`v.voucher_type = $${params.length + 1}`);
    params.push(filters.voucher_type);
  }
  if (filters.status) {
    conditions.push(`v.status = $${params.length + 1}`);
    params.push(filters.status);
  }
  if (filters.from_date && filters.to_date) {
    conditions.push(`v.voucher_date BETWEEN $${params.length + 1} AND $${params.length + 2}`);
    params.push(filters.from_date, filters.to_date);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT v.*, u.username as created_by_name FROM vouchers v LEFT JOIN users u ON v.created_by = u.user_id ${whereClause} ORDER BY v.voucher_date DESC, v.voucher_id DESC`,
    params
  );
  return result.rows;
}

async function getVoucherById(voucherId) {
  const result = await pool.query('SELECT * FROM vouchers WHERE voucher_id = $1', [voucherId]);
  const header = result.rows[0] || null;
  if (!header) return null;
  const entries = await pool.query('SELECT * FROM voucher_entries WHERE voucher_id = $1 ORDER BY entry_id', [voucherId]);
  return { ...header, entries: entries.rows };
}

async function createVoucher(data) {
  const { voucher_number, voucher_type, voucher_date, reference_type, reference_id, narration, status, created_by, entries } = data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const headerResult = await client.query(
      `INSERT INTO vouchers (voucher_number, voucher_type, voucher_date, reference_type, reference_id, narration, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [voucher_number, voucher_type, voucher_date, reference_type || null, reference_id || null, narration || null, status || 'draft', created_by]
    );
    const voucher = headerResult.rows[0];
    for (const entry of entries) {
      await client.query(
        `INSERT INTO voucher_entries (voucher_id, account_id, description, debit_amount, credit_amount) VALUES ($1, $2, $3, $4, $5)`,
        [voucher.voucher_id, entry.account_id, entry.description || null, parseFloat(entry.debit_amount || 0), parseFloat(entry.credit_amount || 0)]
      );
    }
    await client.query('COMMIT');
    return voucher;
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  } finally {
    client.release();
  }
}

async function getLedger(accountId, fromDate, toDate) {
  const account = await getAccountById(accountId);
  if (!account) return null;
  const params = [accountId];
  const where = ['ve.account_id = $1'];
  if (fromDate && toDate) {
    where.push(`v.voucher_date BETWEEN $${params.length + 1} AND $${params.length + 2}`);
    params.push(fromDate, toDate);
  }
  const result = await pool.query(
    `SELECT ve.*, v.voucher_number, v.voucher_date, v.voucher_type, v.narration FROM voucher_entries ve JOIN vouchers v ON ve.voucher_id = v.voucher_id WHERE ${where.join(' AND ')} ORDER BY v.voucher_date, ve.entry_id`,
    params
  );
  const opening = account.opening_balance || 0;
  const entries = result.rows.map(r => ({
    ...r,
    debit_amount: parseFloat(r.debit_amount || 0),
    credit_amount: parseFloat(r.credit_amount || 0),
  }));
  let balance = opening;
  const isDr = account.opening_balance_type === 'Dr';
  entries.forEach(e => {
    balance += isDr ? e.debit_amount - e.credit_amount : e.credit_amount - e.debit_amount;
  });
  return {
    account,
    opening_balance: opening,
    opening_type: account.opening_balance_type,
    entries,
    closing_balance: Math.abs(balance),
    closing_type: balance >= 0 ? 'Dr' : 'Cr',
  };
}

async function getTrialBalance() {
  const result = await pool.query(
    `SELECT a.account_code, a.account_name, a.account_type, a.opening_balance, a.opening_balance_type,
       COALESCE(SUM(ve.debit_amount), 0) as period_debit,
       COALESCE(SUM(ve.credit_amount), 0) as period_credit
     FROM accounts a
     LEFT JOIN voucher_entries ve ON ve.account_id = a.account_id
     LEFT JOIN vouchers v ON v.voucher_id = ve.voucher_id
     WHERE a.is_active = true
     GROUP BY a.account_code, a.account_name, a.account_type, a.opening_balance, a.opening_balance_type
     ORDER BY a.account_code`
  );
  return result.rows.map(r => ({
    ...r,
    closing_debit: parseFloat(r.opening_balance || 0) + parseFloat(r.period_debit),
    closing_credit: parseFloat(r.opening_balance || 0) + parseFloat(r.period_credit),
  }));
}

async function getPnL() {
  const result = await pool.query(
    `SELECT a.account_type, a.account_name, a.opening_balance, a.opening_balance_type,
       COALESCE(SUM(ve.debit_amount), 0) as period_debit,
       COALESCE(SUM(ve.credit_amount), 0) as period_credit
     FROM accounts a
     LEFT JOIN voucher_entries ve ON ve.account_id = a.account_id
     LEFT JOIN vouchers v ON v.voucher_id = ve.voucher_id
     WHERE a.is_active = true AND a.account_type IN ('income', 'expense')
     GROUP BY a.account_code, a.account_name, a.account_type, a.opening_balance, a.opening_balance_type
     ORDER BY a.account_type, a.account_code`
  );
  return result.rows;
}

async function getBalanceSheet() {
  const result = await pool.query(
    `SELECT a.account_type, a.account_name, a.opening_balance, a.opening_balance_type,
       COALESCE(SUM(ve.debit_amount), 0) as period_debit,
       COALESCE(SUM(ve.credit_amount), 0) as period_credit
     FROM accounts a
     LEFT JOIN voucher_entries ve ON ve.account_id = a.account_id
     LEFT JOIN vouchers v ON v.voucher_id = ve.voucher_id
     WHERE a.is_active = true AND a.account_type IN ('asset', 'liability')
     GROUP BY a.account_code, a.account_name, a.account_type, a.opening_balance, a.opening_balance_type
     ORDER BY a.account_type, a.account_code`
  );
  return result.rows;
}

module.exports = {
  getCOA,
  getAccountById,
  getAccountByCode,
  createAccount,
  updateAccount,
  deleteAccount,
  getVouchers,
  getVoucherById,
  createVoucher,
  getLedger,
  getTrialBalance,
  getPnL,
  getBalanceSheet,
};
