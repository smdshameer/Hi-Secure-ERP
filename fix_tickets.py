with open('models/service-tickets.js', 'r') as f:
    text = f.read()

# Add audit logging to createTicket: replace "return r.rows[0]" after createTicket INSERT
old = """const r = await pool.query(`INSERT INTO service_tickets (ticket_number, customer_id, ticket_type, priority, subject, description, product_type, brand_id, model_number, serial_number, location_at_site, status, opened_date, created_by)
  VALUES ('TKT-' || LPAD(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT,4,'0') || '-' || LPAD(nextval('ticket_seq')::TEXT, 6, '0'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open', CURRENT_DATE, $11) RETURNING *`,
  [customer_id, ticket_type || 'repair', priority || 'medium', subject, description, product_type, brand_id, model_number, serial_number, location_at_site, user_id]);
return r.rows[0];"""

new = """const r = await pool.query(`INSERT INTO service_tickets (ticket_number, customer_id, ticket_type, priority, subject, description, product_type, brand_id, model_number, serial_number, location_at_site, status, opened_date, created_by)
  VALUES ('TKT-' || LPAD(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT,4,'0') || '-' || LPAD(nextval('ticket_seq')::TEXT, 6, '0'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open', CURRENT_DATE, $11) RETURNING *`,
  [customer_id, ticket_type || 'repair', priority || 'medium', subject, description, product_type, brand_id, model_number, serial_number, location_at_site, user_id]);
const row = r.rows[0];
await logTicketActivity({ user_id, action: 'CREATE', ticket_id: row.ticket_id, new_values: row });
return row;"""

if old in text:
    text = text.replace(old, new)
    print("OK: patched createTicket audit logging")
else:
    print("NOT FOUND")
    # Try simpler search
    idx = text.find('nextval')
    print(repr(text[idx-200:idx+100]))

with open('models/service-tickets.js', 'w') as f:
    f.write(text)
