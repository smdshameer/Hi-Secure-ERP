with open('models/complaints.js', 'r') as f:
    lines = f.readlines()

# Target specifically the searchComplaints function, not buildWhere
# Search from line 129 (searchComplaints) to find the right clauses.push
in_search_fn = False
for i, line in enumerate(lines):
    if 'async function searchComplaints' in line:
        in_search_fn = True
        start_i = i
    if in_search_fn and 'clauses.push' in line and 'complaint_number ILIKE' in line:
        # Replace this line and the params.push line
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
print("patched searchComplaints")
# Show around line 134
for j in range(130, 142):
    print(f"{j+1}: {lines[j].rstrip()}")
