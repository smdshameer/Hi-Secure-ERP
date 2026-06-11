with open('models/customer-assets.js','r') as f:
    lines = f.readlines()

# Replace line 224 (index 223): remove 5th OR clause
old_line = lines[223]
# The original had: OR ca.location_at_site ILIKE ${params.length + 1})
new_line = old_line.replace(
    " OR ca.location_at_site ILIKE ${params.length + 1})",
    ")"
)
lines[223] = new_line

# Fix line 240 (index 239): remove trailing comma
lines[239] = lines[239].rstrip(",\n") + "\n"

with open('models/customer-assets.js','w') as f:
    f.writelines(lines)

print("line 224:", lines[223].rstrip())
print("line 240:", lines[239].rstrip())
