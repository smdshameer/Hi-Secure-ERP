const { pool } = require('../config/database');

const toInt = v => (v === undefined || v === null || v === '' ? null : parseInt(v, 10));
const toFloat = v => (v === undefined || v === null || v === '' ? 0 : parseFloat(v));

async function listEmployees(filters = {}) {
  const params = [];
  const where = [];
  if (filters.department) {
    where.push(`department = $${params.length + 1}`);
    params.push(filters.department);
  }
  if (typeof filters.is_active !== 'undefined') {
    where.push(`is_active = $${params.length + 1}`);
    params.push(filters.is_active);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const res = await pool.query(
    `SELECT * FROM employees ${whereClause} ORDER BY full_name ASC`,
    params
  );
  return res.rows;
}

async function getEmployeeById(employeeId) {
  const res = await pool.query('SELECT * FROM employees WHERE employee_id = $1', [employeeId]);
  return res.rows[0] || null;
}

async function getEmployeeByCode(code) {
  const res = await pool.query('SELECT * FROM employees WHERE employee_code = $1', [code]);
  return res.rows[0] || null;
}

async function createEmployee(data) {
  const {
    employee_code, full_name, designation, department, date_of_joining, date_of_birth,
    pan, uan, bank_account_number, bank_name, ifsc_code, phone, email, address
  } = data;
  const res = await pool.query(
    `INSERT INTO employees
      (employee_code, full_name, designation, department, date_of_joining, date_of_birth,
       pan, uan, bank_account_number, bank_name, ifsc_code, phone, email, address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [employee_code, full_name, designation || null, department || null, date_of_joining || null,
     date_of_birth || null, pan || null, uan || null, bank_account_number || null,
     bank_name || null, ifsc_code || null, phone || null, email || null, address || null]
  );
  return res.rows[0];
}

async function updateEmployee(employeeId, data) {
  const allowed = [
    'employee_code', 'full_name', 'designation', 'department', 'date_of_joining', 'date_of_birth',
    'pan', 'uan', 'bank_account_number', 'bank_name', 'ifsc_code', 'phone', 'email', 'address', 'is_active'
  ];
  const sets = [];
  const vals = [];
  allowed.forEach(field => {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${vals.length + 1}`);
      vals.push(data[field]);
    }
  });
  if (!sets.length) return getEmployeeById(employeeId);
  vals.push(employeeId);
  const res = await pool.query(`UPDATE employees SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $${vals.length} RETURNING *`, vals);
  return res.rows[0];
}

async function deleteEmployee(employeeId) {
  await pool.query('DELETE FROM employees WHERE employee_id = $1', [employeeId]);
}

async function getSalaryStructure(employeeId) {
  const res = await pool.query('SELECT * FROM salary_structures WHERE employee_id = $1 AND is_active = true ORDER BY effective_from DESC LIMIT 1', [employeeId]);
  return res.rows[0] || null;
}

async function listSalaryStructures(employeeId) {
  const res = await pool.query('SELECT * FROM salary_structures WHERE employee_id = $1 ORDER BY effective_from DESC', [employeeId]);
  return res.rows;
}

async function upsertSalaryStructure(data) {
  const { employee_id, basic_salary, hra, da, special_allowance, other_allowance, pf_employee, pf_employer, esi_employee, esi_employer, tds, professional_tax, other_deductions, effective_from, is_active } = data;
  const gross = toFloat(basic_salary) + toFloat(hra) + toFloat(da) + toFloat(special_allowance) + toFloat(other_allowance);
  const totalDeductions = toFloat(pf_employee) + toFloat(esi_employee) + toFloat(tds) + toFloat(professional_tax) + toFloat(other_deductions);
  const net = gross - totalDeductions;
  const existing = await pool.query('SELECT structure_id FROM salary_structures WHERE employee_id = $1 AND is_active = true LIMIT 1', [employee_id]);
  if (existing.rows.length) {
    const res = await pool.query(
      `UPDATE salary_structures SET
        basic_salary=$1, hra=$2, da=$3, special_allowance=$4, other_allowance=$5, gross_salary=$6,
        pf_employee=$7, pf_employer=$8, esi_employee=$9, esi_employer=$10, tds=$11,
        professional_tax=$12, other_deductions=$13, total_deductions=$14, net_salary=$15,
        effective_from=COALESCE($16, CURRENT_DATE), is_active=COALESCE($17, true),
        updated_at=CURRENT_TIMESTAMP
       WHERE structure_id=$18 RETURNING *`,
      [toFloat(basic_salary), toFloat(hra), toFloat(da), toFloat(special_allowance), toFloat(other_allowance),
       gross, toFloat(pf_employee), toFloat(pf_employer), toFloat(esi_employee), toFloat(esi_employer),
       toFloat(tds), toFloat(professional_tax), toFloat(other_deductions), totalDeductions, net,
       effective_from, is_active !== false, existing.rows[0].structure_id]
    );
    return res.rows[0];
  }
  const res = await pool.query(
    `INSERT INTO salary_structures
      (employee_id, basic_salary, hra, da, special_allowance, other_allowance, gross_salary,
       pf_employee, pf_employer, esi_employee, esi_employer, tds, professional_tax,
       other_deductions, total_deductions, net_salary, effective_from, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,COALESCE($18, CURRENT_DATE), COALESCE($19, true))
     RETURNING *`,
    [employee_id, toFloat(basic_salary), toFloat(hra), toFloat(da), toFloat(special_allowance), toFloat(other_allowance),
     gross, toFloat(pf_employee), toFloat(pf_employer), toFloat(esi_employee), toFloat(esi_employer),
     toFloat(tds), toFloat(professional_tax), toFloat(other_deductions), totalDeductions, net,
     effective_from, is_active !== false]
  );
  return res.rows[0];
}

async function deactivateSalaryStructure(employeeId) {
  await pool.query('UPDATE salary_structures SET is_active = false WHERE employee_id = $1', [employeeId]);
}

async function listAttendance(filters = {}) {
  const params = [];
  const where = [];
  if (filters.employee_id) { where.push(`a.employee_id = $${params.length + 1}`); params.push(filters.employee_id); }
  if (filters.from_date && filters.to_date) {
    where.push(`a.attendance_date BETWEEN $${params.length + 1} AND $${params.length + 2}`);
    params.push(filters.from_date, filters.to_date);
  } else if (filters.date) {
    where.push(`a.attendance_date = $${params.length + 1}`);
    params.push(filters.date);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const res = await pool.query(
    `SELECT a.*, e.full_name, e.employee_code, e.designation, e.department
     FROM attendance a
     JOIN employees e ON e.employee_id = a.employee_id
     ${whereClause}
     ORDER BY a.attendance_date DESC, e.full_name ASC
     LIMIT 500`,
    params
  );
  return res.rows;
}

async function upsertAttendance(employeeId, attendance_date, status, hours_worked, remarks) {
  const res = await pool.query(
    `INSERT INTO attendance (employee_id, attendance_date, status, hours_worked, remarks)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (employee_id, attendance_date)
     DO UPDATE SET status = EXCLUDED.status, hours_worked = EXCLUDED.hours_worked, remarks = EXCLUDED.remarks
     RETURNING *`,
    [employeeId, attendance_date, status || 'present', hours_worked || 8, remarks || null]
  );
  return res.rows[0];
}

async function createPayrollRun(data) {
  const { pay_period_start, pay_period_end, notes, created_by } = data;
  const res = await pool.query(
    `INSERT INTO payroll_runs (pay_period_start, pay_period_end, notes, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [pay_period_start, pay_period_end, notes || null, created_by || null]
  );
  return res.rows[0];
}

async function getPayrollRunById(runId) {
  const res = await pool.query('SELECT * FROM payroll_runs WHERE payroll_run_id = $1', [runId]);
  return res.rows[0] || null;
}

async function listPayrollRuns() {
  const res = await pool.query('SELECT * FROM payroll_runs ORDER BY run_date DESC LIMIT 100');
  return res.rows;
}

async function updatePayrollRun(runId, data) {
  const allowed = ['status', 'notes', 'total_employees', 'total_gross', 'total_deductions', 'total_net'];
  const sets = [];
  const vals = [];
  allowed.forEach(field => {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${vals.length + 1}`);
      vals.push(data[field]);
    }
  });
  if (!sets.length) return getPayrollRunById(runId);
  vals.push(runId);
  const res = await pool.query(`UPDATE payroll_runs SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE payroll_run_id = $${vals.length} RETURNING *`, vals);
  return res.rows[0];
}

module.exports = {
  listEmployees, getEmployeeById, getEmployeeByCode, createEmployee, updateEmployee, deleteEmployee,
  getSalaryStructure, listSalaryStructures, upsertSalaryStructure, deactivateSalaryStructure,
  listAttendance, upsertAttendance,
  createPayrollRun, getPayrollRunById, listPayrollRuns, updatePayrollRun
};
