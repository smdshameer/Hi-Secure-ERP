# -*- coding: utf-8 -*-
import sys

with open(r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The broken patterns (using actual characters):
# 1. Line 233: template literal closes with backtick, then an extra backtick, then closing brace
#    )}`}  should be  `}
# 2. Line 235:  )}`  should be  )

# Strategy: replace specific broken sequences
# Pattern 1: )}`}  ->  `}
content = content.replace(')}’‘}', ')}‘}')

# Pattern 2: )}` on its own line should be )
# This is the stray backtick on line 235
content = content.replace('`}\n</div>\n</div>\n</div>', '\n</div>\n</div>\n</div>')

with open(r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("POS.tsx rewritten")
