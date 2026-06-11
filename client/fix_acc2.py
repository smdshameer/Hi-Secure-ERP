import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8')

fpath = r"C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages\Accounting.tsx"
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

# The issue: line 326 ends with `}`` but there's no closing } for the JSX expression.
# After the template literal ends with }, there's no } to close the {ternary...} expression.
# We need to find the line that ends with the template literal and add } after it.

# Find line 326 (0-indexed: 325)
lines = content.split('\n')
for i in range(len(lines)):
    if i == 325:  # line 326 (0-indexed)
        # Line should end with `}  but need to add another } to close the outer expression
        # Actually: the template literal ends with } which closes toLocaleString
        # Then backtick closes the template literal
        # Then we need } to close the JSX expression.
        # Current line ends with "}`"
        # We need: "}`}"
        lines[i] = lines[i] + '}'
        print(f"Fixed line {i+1}")
        break

with open(fpath, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print("Done")
