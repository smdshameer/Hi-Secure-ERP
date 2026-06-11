# -*- coding: utf-8 -*-
path = r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx'
with open(path, 'rb') as f:
    raw = f.read()

# Target: line 235 — the stray )}`
idx = raw.find(b')}')
# Check what follows
after = raw[idx:idx+20]
print("Context around )}:")
print(repr(after))

# Replace the broken sequence: )}`\n</div>  ->  )\n</div>
broken = b')}\x60\n</div>'
fixed  = b')\n</div>'
if broken in raw:
    raw = raw.replace(broken, fixed)
    print("Fixed!")
else:
    print("Pattern not found, trying alternate...")
    # Try with different encoding
    broken2 = raw[idx:idx+15]
    print("Actual bytes:", repr(broken2))

with open(path, 'wb') as f:
    f.write(raw)
