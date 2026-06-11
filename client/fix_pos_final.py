# fix_pos.py — fix the broken closing in POS.tsx checkout line
import os

target = r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx'
with open(target, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the exact broken snippet: )}` followed by stray markup
old_broken = ')}`\n</div>\n</div>\n</div>'
new_fixed = ')\n</div>\n</div>\n</div>'

if old_broken in content:
    content = content.replace(old_broken, new_fixed)
    print('Fixed stray )}` block in POS.tsx')
else:
    print('Pattern not found — checking for alternate breakage...')
    # Fallback: remove the isolated )}` artifact
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if ')}' in line and line.strip() == ')}' + '’' + '`':
            lines[i] = ')'
            print(f'Fixed stray item on line {i+1}')
            break
    content = '\n'.join(lines)

with open(target, 'w', encoding='utf-8') as f:
    f.write(content)
print('POS.tsx saved')

# Verify
with open(target, 'r', encoding='utf-8') as f:
    lines = f.readlines()
print('\n--- Lines 230–238 ---')
for i in range(229, 238):
    print(f'{i+1}: {lines[i].rstrip()}')
