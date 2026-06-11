# fix_pos.py — fix the broken closing in POS.tsx
import os

target = r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx'
with open(target, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the broken )}` followed by closing </div> tags
old_broken = ')}\x60\n</div>\n</div>\n</div>'
new_fixed = ')\n</div>\n</div>\n</div>'

if old_broken in content:
    content = content.replace(old_broken, new_fixed)
    with open(target, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed POS.tsx stray )}`')
else:
    print('Pattern not found - checking line by line')
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.strip() == ')}`':
            lines[i] = ')'
            print(f'Fixed line {i+1}')
            break
    content = '\n'.join(lines)
    with open(target, 'w', encoding='utf-8') as f:
        f.write(content)

print('Saved POS.tsx')
