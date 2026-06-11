with open('models/customer-assets.js','r') as f:
    text = f.read()

# Fix 1: Remove created_by_name select and LEFT JOIN users
text = text.replace(', u.username AS created_by_name\n', '\n')
text = text.replace('LEFT JOIN users u ON u.user_id = ca.created_by\n', '')

# Fix 2: searchAssets - fix 5 placeholder / 4 value mismatch
old_search = (
    "(ca.serial_number ILIKE ${params.length + 1} OR ca.model ILIKE ${params.length + 1} OR ca.brand ILIKE ${params.length + 1} OR c.name ILIKE ${params.length + 1} OR ca.location_at_site ILIKE ${params.length + 1})"
)
new_search = (
    "(ca.serial_number ILIKE ${params.length + 1} OR ca.model ILIKE ${params.length + 1} OR ca.brand ILIKE ${params.length + 1} OR c.name ILIKE ${params.length + 1})"
)

if old_search in text:
    text = text.replace(old_search, new_search, 1)
    print("OK: patched searchAssets")
else:
    idx = text.find('serial_number ILIKE')
    print("not found, got:", repr(text[idx:idx+300]))

with open('models/customer-assets.js','w') as f:
    f.write(text)
print("written")
