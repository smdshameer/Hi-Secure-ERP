# -*- coding: utf-8 -*-
with open(r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx', encoding='utf-8') as f:
    lines = f.readlines()

# Line 233 (index 232): has extra backtick before closing brace
# Found: ...minimumFractionDigits: 2 })}`}
# Need:  ...minimumFractionDigits: 2 })}
line233 = lines[232]
# Find the extra backtick pattern
idx = line233.rfind('}')  # last }
# The line should end with `} not `}`
if '`}\n' in line233:
    lines[232] = line233.replace('`}\n', '}\n')
    print("Fixed line 233")

# Line 235 (index 234): has stray characters after )
# Found: )}` then newline
# Need: ) then newline
line235 = lines[234]
if ')}' in line235 and line235.strip() != ')':
    lines[234] = ')\n'
    print("Fixed line 235")

with open(r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

# Verify
with open(r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx', encoding='utf-8') as f:
    check = f.readlines()
for i in range(230, 238):
    print(f"{i+1}: {check[i].rstrip()}")
