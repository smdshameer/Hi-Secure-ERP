with open(r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx', 'rb') as f:
    raw = f.read()

# Find and replace the broken closing pattern
# Line 233: has trailing backtick after template literal: )}`}`
# Should be: `}
# The pattern is: )}`}  -> )}

broken = ')}’`}'
fixed = ')}'}'
raw = raw.replace(broken.encode('utf-8'), fixed.encode('utf-8'))

# Also fix line 235: )}` should be )
broken2 = ')`}\n</div>\n</div>\n</div>'
fixed2 = ')\n</div>\n</div>\n</div>'
raw = raw.replace(broken2.encode('utf-8'), fixed2.encode('utf-8'))

with open(r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx', 'wb') as f:
    f.write(raw)

print("Written")
