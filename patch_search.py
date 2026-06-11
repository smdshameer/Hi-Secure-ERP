with open('models/customer-assets.js', 'r') as f:
    lines = f.readlines()

# Find and replace lines 220-223
for i, line in enumerate(lines):
    old = "const s1 = '$' + (params.length + 1), s2 = '$' + (params.length + 2);"
    if old in line:
        lines[i] = "const s1 = '$' + (params.length + 1), s2 = '$' + (params.length + 2);\n"
        lines[i+1] = "const s3 = '$' + (params.length + 3), s4 = '$' + (params.length + 4), s5 = '$' + (params.length + 5);\n"
        # Update the clauses.push line (now at i+2 after insertion)
        for j in range(i+2, min(i+5, len(lines))):
            if 'clauses.push' in lines[j] and 'serial_number ILIKE' in lines[j]:
                lines[j] = "clauses.push('(ca.serial_number ILIKE ' + s1 + ' OR ca.model ILIKE ' + s2 + ' OR ca.brand ILIKE ' + s3 + ' OR c.name ILIKE ' + s4 + \" OR ca.location_at_site ILIKE \" + s5 + ')');\n"
                break
        # Update params.push line
        for j in range(i+2, min(i+5, len(lines))):
            if 'params.push(q, q, q, q)' in lines[j]:
                lines[j] = "params.push(q, q, q, q, q);\n"
                break
        break

with open('models/customer-assets.js', 'w') as f:
    f.writelines(lines)
print("Done")
print("Line 220:", lines[219].rstrip())
print("Line 221:", lines[220].rstrip())
print("Line 222:", lines[221].rstrip())
print("Line 223:", lines[222].rstrip())
