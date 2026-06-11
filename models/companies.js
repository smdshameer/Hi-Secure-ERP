const { pool } = require('../config/database');

async function listCompanies(filters = {}) {
  const params = [];
  const where = [];
  if (typeof filters.active !== 'undefined') {
    where.push(`active = $${params.length + 1}`);
    params.push(filters.active);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const res = await pool.query(
    `SELECT * FROM companies ${whereClause} ORDER BY name ASC`,
    params
  );
  return res.rows;
}

async function getCompanyById(companyId) {
  const res = await pool.query('SELECT * FROM companies WHERE company_id = $1', [companyId]);
  return res.rows[0] || null;
}

async function getActiveCompany() {
  const res = await pool.query('SELECT * FROM companies WHERE active = true ORDER BY company_id ASC LIMIT 1');
  return res.rows[0] || null;
}

async function createCompany(data) {
  const { name, gstin, pan, address, state, phone, email, website, bank_name, bank_account_number, bank_ifsc, bank_branch, logo_path, active } = data;
  const res = await pool.query(
    `INSERT INTO companies
      (name, gstin, pan, address, state, phone, email, website,
       bank_name, bank_account_number, bank_ifsc, bank_branch, logo_path, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,COALESCE($14, true))
     RETURNING *`,
    [name, gstin || null, pan || null, address || null, state || null, phone || null, email || null, website || null,
     bank_name || null, bank_account_number || null, bank_ifsc || null, bank_branch || null, logo_path || null, active]
  );
  return res.rows[0];
}

async function updateCompany(companyId, data) {
  const allowed = ['name', 'gstin', 'pan', 'address', 'state', 'phone', 'email', 'website',
                   'bank_name', 'bank_account_number', 'bank_ifsc', 'bank_branch', 'logo_path', 'active'];
  const sets = [];
  const vals = [];
  allowed.forEach(field => {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${vals.length + 1}`);
      vals.push(data[field]);
    }
  });
  if (!sets.length) return getCompanyById(companyId);
  vals.push(companyId);
  const res = await pool.query(
    `UPDATE companies SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE company_id = $${vals.length} RETURNING *`,
    vals
  );
  return res.rows[0];
}

async function deleteCompany(companyId) {
  await pool.query('DELETE FROM companies WHERE company_id = $1', [companyId]);
}

module.exports = {
  listCompanies, getCompanyById, getActiveCompany, createCompany, updateCompany, deleteCompany
};
