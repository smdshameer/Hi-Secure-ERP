import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8')

fpath = r"C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\Accounting.tsx"
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: template literal followed by stray " that broke JSX expression closing
# Pattern: backtick + double-quote at end of line → backtick + } (close JSX expression)
# Find lines ending with ")}" that have a stray ending

# Split into lines, fix line by line
lines = content.split('\n')
fixed_lines = []
for i, line in enumerate(lines):
    # Fix the specific broken pattern: `}"
    if line.rstrip().endswith('`"'):
        # Replace the ending ` with `}
        line = line[:-1] + '}'  # replace trailing " with }
    fixed_lines.append(line)

content = '\n'.join(fixed_lines)

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed Accounting.tsx")
