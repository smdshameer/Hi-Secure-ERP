import sys; sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8')
with open(r"C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\Accounting.tsx", 'r', encoding='utf-8') as f:
    lines = f.readlines()
print(repr(lines[324]))  # 0-indexed line 324 is line 325 in the file
print(repr(lines[325]))
print(repr(lines[326]))
