with open(r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx', encoding='utf-8') as f:
    content = f.read()

broken = ")}`\n</div>"
fixed = ")\n</div>"
content = content.replace(broken, fixed)

with open(r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed POS.tsx stray backtick")
