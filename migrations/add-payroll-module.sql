-- Payroll Module Schema
-- Run: node run-migration.cjs

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  employee_id SERIAL PRIMARY KEY,
  employee_code VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  designation VARCHAR(100),
  department VARCHAR(100),
  date_of_joining DATE,
  date_of_birth DATE,
  pan VARCHAR(10),
  uan VARCHAR(20),
  bank_account_number VARCHAR(30),
  bank_name VARCHAR(200),
  ifsc_code VARCHAR(15),
  phone VARCHAR(20),
  email VARCHAR(200),
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Salary Structures
CREATE TABLE IF NOT EXISTS salary_structures (
  structure_id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(employee_id) ON DELETE CASCADE,
  basic_salary DECIMAL(12,2) DEFAULT 0,
  hra DECIMAL(12,2) DEFAULT 0,
  da DECIMAL(12,2) DEFAULT 0,
  special_allowance DECIMAL(12,2) DEFAULT 0,
  other_allowance DECIMAL(12,2) DEFAULT 0,
  gross_salary DECIMAL(12,2) DEFAULT 0,
  pf_employee DECIMAL(12,2) DEFAULT 0,
  pf_employer DECIMAL(12,2) DEFAULT 0,
  esi_employee DECIMAL(12,2) DEFAULT 0,
  esi_employer DECIMAL(12,2) DEFAULT 0,
  tds DECIMAL(12,2) DEFAULT 0,
  professional_tax DECIMAL(12,2) DEFAULT 0,
  other_deductions DECIMAL(12,2) DEFAULT 0,
  total_deductions DECIMAL(12,2) DEFAULT 0,
  net_salary DECIMAL(12,2) DEFAULT 0,
  effective_from DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  attendance_id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(employee_id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'present',
  hours_worked DECIMAL(4,2) DEFAULT 8,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, attendance_date)
);

-- Payroll Runs
CREATE TABLE IF NOT EXISTS payroll_runs (
  payroll_run_id SERIAL PRIMARY KEY,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  total_employees INT DEFAULT 0,
  total_gross DECIMAL(14,2) DEFAULT 0,
  total_deductions DECIMAL(14,2) DEFAULT 0,
  total_net DECIMAL(14,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common filters
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_salary_employee ON salary_structures(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(pay_period_start, pay_period_end);
