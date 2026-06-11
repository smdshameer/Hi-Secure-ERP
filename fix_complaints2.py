with open('models/complaints.js', 'r') as f:
    lines = f.readlines()

# Fix line 133 and 134 (0-indexed: lines[132] and lines[133])
for i, line in enumerate(lines):
    if 'clauses.push' in line and 'complaint_number ILIKE' in line:
        # Replace this line and next line (params.push)
        lines[i] = "  const s1 = '$' + (params.length + 1), s2 = '$' + (params.length + 2);\n"
        lines.insert(i+1, "  const s3 = '$' + (params.length + 3), s4 = '$' + (params.length + 4);\n")
        lines.insert(i+2, "  clauses.push('(c.complaint_number ILIKE ' + s1 + ' OR c.subject ILIKE ' + s2 + ' OR c.description ILIKE ' + s3 + ' OR cust.name ILIKE ' + s4 + ')');\n")
        # Update the now-shifted params.push line
        for j in range(i+3, min(i+6, len(lines))):
            if 'params.push(q, q, q, q)' in lines[j]:
                lines[j] = "  params.push(q, q, q, q);\n"
                break
        break

with open('models/complaints.js', 'w') as f:
    f.writelines(lines)
print("patched lines 133-134")
print("133:", lines[132].rstrip())
print("134:", lines[133].rstrip())
print("135:", lines[134].rstrip())
print("136:", lines[135].rstrip())
