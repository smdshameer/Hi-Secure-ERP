import re

# Fix 1: customer-assets.js model - remove created_by from INSERT
with open('models/customer-assets.js', 'r') as f:
    text = f.read()

old_block = (
    "  (customer_id, asset_type, brand, model, serial_number, purchase_date,\n"
    "  warranty_until, location_at_site, notes, status, created_by)\n"
    "  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10)\n"
    "  RETURNING *`,\n"
    "  [customer_id, asset_type, brand || null, model || null, serial_number || null,\n"
    "  purchase_date || null, warranty_until || null, location_at_site || null,\n"
    "  notes || null, user_id]\n"
    "  );\n"
)
new_block = (
    "  (customer_id, asset_type, brand, model, serial_number, purchase_date,\n"
    "  warranty_until, location_at_site, notes, status)\n"
    "  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active')\n"
    "  RETURNING *`,\n"
    "  [customer_id, asset_type, brand || null, model || null, serial_number || null,\n"
    "  purchase_date || null, warranty_until || null, location_at_site || null,\n"
    "  notes || null]\n"
    "  );\n"
)

if old_block in text:
    text = text.replace(old_block, new_block, 1)
    print("OK: patched customer-assets.js INSERT")
else:
    print("WARN: INSERT block not found in customer-assets.js")

with open('models/customer-assets.js', 'w') as f:
    f.write(text)

# Fix 2: test file - audit_log -> audit_logs
with open('tests/customer-assets.test.js', 'r') as f:
    text = f.read()

text = text.replace('audit_log', 'audit_logs')

# Fix 3: test file - add customer_code to customer inserts
text = text.replace(
    "INSERT INTO customers (customer_id, name, phone, city, state) VALUES (999,'Asset Test Customer','9999999999','Test City','TS')",
    "INSERT INTO customers (customer_id, customer_code, name, phone, city, state) VALUES (999,'CUST999','Asset Test Customer','9999999999','Test City','TS')"
)
text = text.replace(
    "INSERT INTO customers (customer_id, name, phone) VALUES ($1,$2,$3)",
    "INSERT INTO customers (customer_id, customer_code, name, phone) VALUES ($1,$2,$3,$4)"
)
text = text.replace(
    "[998, 'Fresh Customer', '111']",
    "[998, 'CUST998', 'Fresh Customer', '111']"
)

with open('tests/customer-assets.test.js', 'w') as f:
    f.write(text)

print("OK: patched test file")
print("Done")
