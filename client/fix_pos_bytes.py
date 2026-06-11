# -*- coding: utf-8 -*-
with open(r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx', 'rb') as f:
    raw = f.read()

# Line 233 issue: has extra backtick and brace before closing paren of button content
# Pattern: localeString('en-IN', { minimumFractionDigits: 2 })}`
#                                  closing backtick is extra
# Also line 235 issue: has )}` instead of )

# Fix line 233: remove the extra backtick between the closing brace and paren
# Current: ...2 })`}\n</button>
# Target:  ...2 })}\n</button>
raw = raw.replace(b')' + b'\xe2\x80\x98\xe2\x80\x98}\n</button>', b')}\n</button>')

# Fix line 235: remove the closing brace and stray backtick
# Current: )' + b'\xe2\x80\x98\xe2\x80\x98}\n</div>
# Target:  )\n</div>
raw = raw.replace(b')' + b'\xe2\x80\x98\xe2\x80\x98}\n</div>', b')\n</div>')

with open(r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx', 'wb') as f:
    f.write(raw)

print("POS.tsx fixed with byte-level replacements")
