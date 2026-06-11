with open(r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx', encoding='utf-8') as f:
    content = f.read()

# The exact broken pattern:  )}`  (closing paren, backtick-quote, backtick)
# It should be:  )  (just closing paren)
# This is a stray backtick after the ternary closing
content = content.replace(")}`\n</div>", ")\n</div>")

with open(r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
with open(r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(232, 238):
    print(f"{i+1}: {lines[i].rstrip()}")
