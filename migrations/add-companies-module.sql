-- Companies / Multi-Company Module
-- Run: node -e "const fs=require('fs');const{pool}=require('./config/database');fs.readFileSync('migrations/add-companies-module.sql','utf8').then(sql=>pool.query(sql)).then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);})"

CREATE TABLE IF NOT EXISTS companies (
  company_id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  gstin VARCHAR(15),
  pan VARCHAR(10),
  address TEXT,
  state VARCHAR(100),
  phone VARCHAR(30),
  email VARCHAR(200),
  website VARCHAR(300),
  bank_name VARCHAR(200),
  bank_account_number VARCHAR(30),
  bank_ifsc VARCHAR(15),
  bank_branch VARCHAR(200),
  logo_path TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(active);
