# -*- coding: utf-8 -*-
bt = chr(96)  # backtick
target = r'C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\POS.tsx'

with open(target, 'rb') as f:
    raw = f.read()

# Locate the broken )} + backtick pattern
marker = (')}' + bt).encode('utf-8')
idx = raw.find(marker)
print(f"Found marker at byte {idx}")
if idx != -1:
    print("Context:", repr(raw[idx:idx+30]))
    # Replace: )}` + anything non-newline, then newline + closing divs
    # with just ) + newline + closing divs
    start = idx
    end = raw.find(b'\n</div>', start)
    if end != -1:
        replacement = b')' + raw[end:]
        raw = raw[:start] + replacement
        print("Replaced broken block")

with open(target, 'wb') as f:
    f.write(raw)

with open(target, 'r', encoding='utf-8') as f:
    lines = f.readlines()
print('\nLines 230-240:')
for i in range(229, 240):
    print(f'{i+1}: {lines[i].rstrip()}')
