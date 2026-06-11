const express = require('express');
const { requireAuth, authorize } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature');
const models = require('../models');
const { body, validationResult } = require('express-validator');

module.exports = function(app) {
  // Employees
  app.get('/payroll', requireAuth, requireFeature('payroll'), authorize('admin'), async (req, res) => {
    try {
      const employees = await models.payroll.listEmployees({ is_active: true });
      res.render('payroll/dashboard', { user: req.session.user || null, employees, stats: {} });
    } catch (err) { console.error(err); res.status(500).send('Error loading payroll'); }
  });

  app.get('/payroll/employees', requireAuth, requireFeature('payroll'), async (req, res) => {
    try {
      const employees = await models.payroll.listEmployees(req.query);
      const enriched = await Promise.all(employees.map(async emp => {
        const structure = await models.payroll.getSalaryStructure(emp.employee_id);
        const attendance = await models.payroll.listAttendance({ employee_id: emp.employee_id, date: req.query.date });
        return { ...emp, salary_structure: structure, today_attendance: attendance[0] || null };
      }));
      res.render('payroll/employees', { user: req.session.user || null, employees: enriched, filters: req.query });
    } catch (err) { console.error(err); res.status(500).send('Error loading employees'); }
  });

  app.get('/payroll/employees/new', requireAuth, requireFeature('payroll'), authorize('admin'), async (req, res) => {
    res.render('payroll/employee-form', { user: req.session.user || null, employee: null, errors: [] });
  });

  app.post('/payroll/employees', requireAuth, requireFeature('payroll'), authorize('admin'), [
    body('employee_code').trim().notEmpty().withMessage('Employee code is required'),
    body('full_name').trim().notEmpty().withMessage('Full name is required')
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).render('payroll/employee-form', { user: req.session.user || null, employee: null, errors: errors.array() });
      const emp = await models.payroll.createEmployee(req.body);
      res.redirect(`/payroll/employees/${emp.employee_id}`);
    } catch (err) { console.error(err); res.status(500).send('Error creating employee'); }
  });

  app.get('/payroll/employees/:id', requireAuth, requireFeature('payroll'), async (req, res) => {
    try {
      const employee = await models.payroll.getEmployeeById(req.params.id);
      if (!employee) return res.status(404).render('errors/404', { message: 'Employee not found', user: req.session.user || null });
      const structure = await models.payroll.getSalaryStructure(employee.employee_id);
      const attendance = await models.payroll.listAttendance({ employee_id: employee.employee_id });
      res.render('payroll/employee-detail', { user: req.session.user || null, employee, structure, attendance });
    } catch (err) { console.error(err); res.status(500).send('Error loading employee'); }
  });

  app.get('/payroll/employees/:id/edit', requireAuth, requireFeature('payroll'), authorize('admin'), async (req, res) => {
    try {
      const employee = await models.payroll.getEmployeeById(req.params.id);
      if (!employee) return res.status(404).render('errors/404', { message: 'Employee not found', user: req.session.user || null });
      res.render('payroll/employee-form', { user: req.session.user || null, employee, errors: [] });
    } catch (err) { console.error(err); res.status(500).send('Error loading employee'); }
  });

  app.post('/payroll/employees/:id', requireAuth, requireFeature('payroll'), authorize('admin'), async (req, res) => {
    try {
      const employee = await models.payroll.updateEmployee(req.params.id, req.body);
      res.redirect(`/payroll/employees/${employee.employee_id}`);
    } catch (err) { console.error(err); res.status(500).send('Error updating employee'); }
  });

  app.post('/payroll/employees/:id/delete', requireAuth, requireFeature('payroll'), authorize('admin'), async (req, res) => {
    try { await models.payroll.deleteEmployee(req.params.id); res.redirect('/payroll/employees'); } catch (err) { res.status(500).send('Error deleting employee'); }
  });

  // Salary Structure
  app.get('/payroll/employees/:id/salary', requireAuth, requireFeature('payroll'), authorize('admin'), async (req, res) => {
    try {
      const employee = await models.payroll.getEmployeeById(req.params.id);
      if (!employee) return res.status(404).render('errors/404', { message: 'Employee not found', user: req.session.user || null });
      const structure = await models.payroll.getSalaryStructure(req.params.id);
      res.render('payroll/salary-form', { user: req.session.user || null, employee, structure });
    } catch (err) { console.error(err); res.status(500).send('Error loading salary structure'); }
  });

  app.post('/payroll/employees/:id/salary', requireAuth, requireFeature('payroll'), authorize('admin'), async (req, res) => {
    try {
      const structure = await models.payroll.upsertSalaryStructure({ ...req.body, employee_id: req.params.id });
      res.redirect(`/payroll/employees/${req.params.id}`);
    } catch (err) { console.error(err); res.status(500).send('Error saving salary structure'); }
  });

  // Attendance
  app.get('/payroll/attendance', requireAuth, requireFeature('payroll'), async (req, res) => {
    try {
      const employees = await models.payroll.listEmployees({ is_active: true });
      const attendance = await models.payroll.listAttendance(req.query);
      res.render('payroll/attendance', { user: req.session.user || null, employees, attendance, filters: req.query });
    } catch (err) { console.error(err); res.status(500).send('Error loading attendance'); }
  });

  // Payroll Runs
  app.get('/payroll/runs', requireAuth, requireFeature('payroll'), async (req, res) => {
    try {
      const runs = await models.payroll.listPayrollRuns();
      res.render('payroll/runs', { user: req.session.user || null, runs });
    } catch (err) { console.error(err); res.status(500).send('Error loading payroll runs'); }
  });

  app.post('/payroll/runs', requireAuth, requireFeature('payroll'), authorize('admin'), async (req, res) => {
    try {
      const { pay_period_start, pay_period_end, notes } = req.body;
      const employees = await models.payroll.listEmployees({ is_active: true });
      let totalGross = 0, totalDeductions = 0, totalNet = 0;
      const enriched = [];
      for (const emp of employees) {
        const structure = await models.payroll.getSalaryStructure(emp.employee_id);
        if (!structure) continue;
        totalGross += parseFloat(structure.gross_salary || 0);
        totalDeductions += parseFloat(structure.total_deductions || 0);
        totalNet += parseFloat(structure.net_salary || 0);
        enriched.push({ employee: emp, structure });
      }
      const run = await models.payroll.createPayrollRun({ pay_period_start, pay_period_end, notes, created_by: req.session.user?.user_id });
      await models.payroll.updatePayrollRun(run.payroll_run_id, { total_employees: enriched.length, total_gross: totalGross, total_deductions: totalDeductions, total_net: totalNet });
      res.redirect('/payroll/runs');
    } catch (err) { console.error(err); res.status(500).send('Error creating payroll run'); }
  });

  app.post('/payroll/runs/:id/finalize', requireAuth, requireFeature('payroll'), authorize('admin'), async (req, res) => {
    try { await models.payroll.updatePayrollRun(req.params.id, { status: 'finalized' }); res.redirect('/payroll/runs'); } catch (err) { res.status(500).send('Error finalizing payroll'); }
  });
};
