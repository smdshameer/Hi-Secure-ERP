with open('models/amc.js', 'r') as f:
    text = f.read()

# Replace the broken createContract function
old_func = '''async function createContract(data, user_id) {
  const { customer_id, contract_type, start_date, end_date, visit_frequency, visits_per_year, amount, tax_amount, grand_total, payment_terms, notes, auto_renew, renewal_notice_days } = data;

  const r = await pool.query(`INSERT INTO amc_contracts (contract_number, customer_id, contract_type, start_date, end_date, visit_frequency, visits_per_year, amount, tax_amount, grand_total, payment_terms, notes, auto_renew, renewal_notice_days, created_by, status)
  VALUES ('AMC-' || LPAD(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT,4,'0') || '-' || LPAD(nextval('amc_seq')::TEXT, 6, '0'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'draft') RETURNING *`,
  [customer_id, contract_type || 'annual', start_date, end_date, visit_frequency || 'quarterly', visits_per_year ?? 4, amount || 0, tax_amount || 0, grandTotalValue, payment_terms, notes, auto_renew ?? false, renewal_notice_days ?? 30, user_id]);

  const computedGrandTotal = (grand_total ?? amount ?? 0) + (tax_amount || 0);
  const grandTotalValue = computedGrandTotal;
  const row = r.rows[0];
  await logAmcActivity({ user_id, action: 'CREATE', amc_id: row.amc_id, new_values: row });
  return row;
}'''

new_func = '''async function createContract(data, user_id) {
  const { customer_id, contract_type, start_date, end_date, visit_frequency, visits_per_year, amount, tax_amount, grand_total, payment_terms, notes, auto_renew, renewal_notice_days } = data;
  const grandTotalValue = (grand_total ?? amount ?? 0) + (tax_amount || 0);

  const r = await pool.query(`INSERT INTO amc_contracts (contract_number, customer_id, contract_type, start_date, end_date, visit_frequency, visits_per_year, amount, tax_amount, grand_total, payment_terms, notes, auto_renew, renewal_notice_days, created_by, status)
  VALUES ('AMC-' || LPAD(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT,4,'0') || '-' || LPAD(nextval('amc_seq')::TEXT, 6, '0'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'draft') RETURNING *`,
  [customer_id, contract_type || 'annual', start_date, end_date, visit_frequency || 'quarterly', visits_per_year ?? 4, amount || 0, tax_amount || 0, grandTotalValue, payment_terms, notes, auto_renew ?? false, renewal_notice_days ?? 30, user_id]);

  const row = r.rows[0];
  await logAmcActivity({ user_id, action: 'CREATE', amc_id: row.amc_id, new_values: row });
  return row;
}'''

if old_func in text:
    text = text.replace(old_func, new_func)
    print("OK: fixed TDZ in createContract")
else:
    print("NOT FOUND - checking actual content around createContract")
    idx = text.find('async function createContract')
    if idx >= 0:
        print(repr(text[idx:idx+800]))
    else:
        print("function not found at all")

with open('models/amc.js', 'w') as f:
    f.write(text)
