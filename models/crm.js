const { pool } = require('../config/database');

async function getLeads(filters = {}) {
  const conditions = [];
  const params = [];
  let query = 'SELECT l.*, c.name as customer_name, c.phone as customer_phone, u.full_name as assigned_to_name FROM crm_leads l LEFT JOIN customers c ON l.customer_id = c.customer_id LEFT JOIN users u ON l.assigned_to = u.user_id ';
  if (filters.status && filters.status !== 'all') {
    conditions.push('l.status = $' + params.length + 1);
    params.push(filters.status);
  }
  if (filters.source) {
    conditions.push('l.source = $' + params.length + 1);
    params.push(filters.source);
  }
  if (filters.search) {
    conditions.push('(l.full_name ILIKE $' + params.length + 1 + ' OR l.company ILIKE $' + params.length + 1 + ' OR l.phone ILIKE $' + params.length + 1 + ')');
    params.push('%' + filters.search + '%');
  }
  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY l.created_at DESC';
  const result = await pool.query(query, params);
  return result.rows;
}

async function getLeadById(leadId) {
  const result = await pool.query('SELECT l.*, c.name as customer_name, c.phone as customer_phone, u.full_name as assigned_to_name FROM crm_leads l LEFT JOIN customers c ON l.customer_id = c.customer_id LEFT JOIN users u ON l.assigned_to = u.user_id WHERE l.lead_id = $1', [leadId]);
  return result.rows[0] || null;
}

async function createLead(data) {
  const { customer_id, full_name, email, phone, company, source, interest_level, estimated_value, notes, assigned_to, created_by } = data;
  const result = await pool.query('INSERT INTO crm_leads (customer_id, full_name, email, phone, company, source, interest_level, estimated_value, notes, assigned_to, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING lead_id', [customer_id || null, full_name, email || null, phone || null, company || null, source || 'website', interest_level || 'medium', estimated_value || 0, notes || null, assigned_to || null, created_by || null]);
  return result.rows[0].lead_id;
}

async function updateLead(leadId, data) {
  const { customer_id, full_name, email, phone, company, source, interest_level, status, estimated_value, notes, assigned_to } = data;
  await pool.query('UPDATE crm_leads SET customer_id = $1, full_name = $2, email = $3, phone = $4, company = $5, source = $6, interest_level = $7, status = $8, estimated_value = $9, notes = $10, assigned_to = $11 WHERE lead_id = $12', [customer_id || null, full_name, email || null, phone || null, company || null, source, interest_level, status, estimated_value || 0, notes || null, assigned_to || null, leadId]);
}

async function convertLeadToCustomer(leadId, customerData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lead = await client.query('SELECT * FROM crm_leads WHERE lead_id = $1', [leadId]);
    if (!lead.rows[0]) throw new Error('Lead not found');
    const custResult = await client.query("INSERT INTO customers (customer_code, name, phone, email, gstin, customer_type, credit_limit, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING customer_id", ['CUS-' + Date.now(), lead.rows[0].full_name, lead.rows[0].phone, lead.rows[0].email, null, 'retail', 0]);
    const customerId = custResult.rows[0].customer_id;
    await client.query('UPDATE crm_leads SET status = $1, converted_to_customer_id = $2, customer_id = $3 WHERE lead_id = $4', ['converted', customerId, customerId, leadId]);
    await client.query('COMMIT');
    return customerId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getInteractions(leadId = null, customerId = null) {
  let query = 'SELECT i.*, u.full_name as created_by_name FROM crm_interactions i LEFT JOIN users u ON i.created_by = u.user_id WHERE 1=1 ';
  const params = [];
  if (leadId) {
    query += ' AND i.lead_id = $' + params.length + 1;
    params.push(leadId);
  }
  if (customerId) {
    query += ' AND i.customer_id = $' + params.length + 1;
    params.push(customerId);
  }
  query += ' ORDER BY i.interaction_date DESC';
  const result = await pool.query(query, params);
  return result.rows;
}

async function addInteraction(data) {
  const { lead_id, customer_id, interaction_type, subject, notes, created_by } = data;
  const result = await pool.query('INSERT INTO crm_interactions (lead_id, customer_id, interaction_type, subject, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING interaction_id', [lead_id || null, customer_id || null, interaction_type, subject || null, notes || null, created_by || null]);
  return result.rows[0].interaction_id;
}

async function getFollowUps(filters = {}) {
  const conditions = [];
  const params = [];
  let query = 'SELECT f.*, l.full_name as lead_name, c.name as customer_name, u.full_name as assigned_to_name FROM crm_follow_ups f LEFT JOIN crm_leads l ON f.lead_id = l.lead_id LEFT JOIN customers c ON f.customer_id = c.customer_id LEFT JOIN users u ON f.assigned_to = u.user_id WHERE 1=1 ';
  if (filters.lead_id) {
    conditions.push('f.lead_id = $' + params.length + 1);
    params.push(filters.lead_id);
  }
  if (filters.overdue === 'true') {
    conditions.push('f.due_date < CURRENT_DATE AND f.is_completed = FALSE');
  }
  if (filters.assigned_to) {
    conditions.push('f.assigned_to = $' + params.length + 1);
    params.push(filters.assigned_to);
  }
  if (conditions.length > 0) query += ' AND ' + conditions.join(' AND ');
  query += ' ORDER BY f.due_date ASC';
  const result = await pool.query(query, params);
  return result.rows;
}

async function createFollowUp(data) {
  const { lead_id, customer_id, subject, due_date, priority, notes, assigned_to, created_by } = data;
  const result = await pool.query('INSERT INTO crm_follow_ups (lead_id, customer_id, subject, due_date, priority, notes, assigned_to, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING follow_up_id', [lead_id || null, customer_id || null, subject, due_date, priority || 'medium', notes || null, assigned_to || null, created_by || null]);
  return result.rows[0].follow_up_id;
}

async function completeFollowUp(followUpId) {
  await pool.query('UPDATE crm_follow_ups SET is_completed = TRUE, completed_at = CURRENT_TIMESTAMP WHERE follow_up_id = $1', [followUpId]);
}

async function getCRMStats() {
  const result = await pool.query(`SELECT (SELECT COUNT(*) FROM crm_leads WHERE status = 'new') as new_leads, (SELECT COUNT(*) FROM crm_leads WHERE status IN ('contacted', 'qualified', 'quoted')) as active_leads, (SELECT COUNT(*) FROM crm_leads WHERE status = 'won') as won_leads, (SELECT COUNT(*) FROM crm_follow_ups WHERE is_completed = FALSE AND due_date < CURRENT_DATE) as overdue_followups, (SELECT COUNT(*) FROM crm_leads) as total_leads`);
  return result.rows[0];
}

async function getPipelineData() {
  const result = await pool.query('SELECT status, COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as value FROM crm_leads GROUP BY status ORDER BY count DESC');
  return result.rows;
}

async function getActiveUsers() {
  const result = await pool.query('SELECT user_id, full_name, role FROM users WHERE is_active = true ORDER BY full_name');
  return result.rows;
}

async function getActiveCustomers() {
  const result = await pool.query('SELECT customer_id, name, phone FROM customers WHERE is_active = true ORDER BY name');
  return result.rows;
}

module.exports = {
  getLeads, getLeadById, createLead, updateLead, convertLeadToCustomer,
  getInteractions, addInteraction,
  getFollowUps, createFollowUp, completeFollowUp,
  getCRMStats, getPipelineData, getActiveUsers, getActiveCustomers
};
