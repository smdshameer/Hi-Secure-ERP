# -*- coding: utf-8 -*-
backtick = chr(96)  # generate backtick dynamically to avoid quoting issues
target = r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx'

with open(target, 'rb') as f:
    raw = f.read()

# The broken pattern on line 235: )} + backtick + } then newline closing divs
# It should just be: ) then newline closing divs
broken = (')}' + backtick + '}\n</div>\n</div>\n</div>').encode('utf-8')
fixed  = (')\n</div>\n</div>\n</div>').encode('utf-8')

if broken in raw:
    raw = raw.replace(broken, fixed)
    print('Fixed stray backticks and braces on POS.tsx line 235')
else:
    # Show what we actually have around that area
    idx = raw.find(b'</button>\n')
    if idx != -1:
        print('Context around </button>:')
        print(repr(raw[idx:idx+40]))
    else:
        print('Could not find </button> marker')

with open(target, 'wb') as f:
    f.write(raw)

# Verify
with open(target, 'r', encoding='utf-8') as f:
    lines = f.readlines()
print('\nLines 230-238 after fix:')
for i in range(229, 238):
    print(f'{i+1}: {lines[i].rstrip()}')
