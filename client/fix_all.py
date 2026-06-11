import os, re

BASE = r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages'

for root, dirs, files in os.walk(BASE):
    for fname in files:
        if not fname.endswith('.tsx'):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        original = content

        # Fix 1: backtick-closing-brace then stray quote: `}\" should be `}
        # This means template literal closed, but JSX expr not closed, instead got stray quote
        content = content.replace('`}"', '`}')

        # Fix 2: to={`/path/${var}\"  ->  to={`/path/${var}`}
        # Pattern: to={ backtick path ${var} quote (missing backtick and closing brace)
        content = re.sub(
            r'to=\{`([^`]*?)\$\{([^}]+)\}"\b',
            r'to={`\1${\2}`}',
            content
        )

        if content != original:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'FIXED: {fname}')
        else:
            print(f'OK:    {fname}')

print("Scan complete!")
