# -*- coding: utf-8 -*-
target = r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx'
with open(target, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Print current line 235 content
print(f"Line 235: {repr(lines[234])}")

# Replace broken line (contains stray backtick and brace) with clean ')'
lines[234] = ')\n'

with open(target, 'w', encoding='utf-8') as f:
    f.writelines(lines)

# Verify
with open(target, 'r', encoding='utf-8') as f:
    check = f.readlines()
for i in range(229, 240):
    print(f"{i+1}: {check[i].rstrip()}")
