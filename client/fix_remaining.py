import os

BASE = r"C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages"

# ====== Fix 1: Dashboard.tsx ======
dashboard_path = os.path.join(BASE, 'Dashboard.tsx')
with open(dashboard_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken className template literals that have an extra `"` after the closing `}`
# The broad script replaced `}` with `"` on all template literals
content = content.replace('}\`"', '}\`}')  # `}"` → `` `} ``, i.e. template lit closing then JSX expr closing

with open(dashboard_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed Dashboard.tsx")

# ====== Fix 2: Invoices.tsx ======
inv_path = os.path.join(BASE, 'Invoices.tsx')
with open(inv_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The broken Link: to={\`/sales/${inv.id}\"
# Should be: to={\`/sales/${inv.id}\`}
# But simpler: use JS string concatenation: to={\"/sales/\" + inv.id}
content = content.replace(
    'to={\\`/sales/${inv.id}\\"',
    'to={"/sales/" + inv.id}'
)

with open(inv_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed Invoices.tsx")

# ====== Fix 3: POS.tsx ======
pos_path = os.path.join(BASE, 'POS.tsx')
with open(pos_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The broken line: `Checkout — ₹${...}"  (extra " at end of template literal)
# Should be: `Checkout — ₹${...}`
content = content.replace(
    ")}",
    ")}`"
)

with open(pos_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed POS.tsx")

print("\nAll targeted fixes applied!")
