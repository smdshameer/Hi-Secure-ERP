with open('models/service-tickets.js', 'r') as f:
    lines = f.readlines()

# Find the "return r.rows[0];" after createTicket's INSERT query
for i, line in enumerate(lines):
    if 'return r.rows[0];' in line and i > 50 and i < 60:
        lines[i] = "const row = r.rows[0];\nawait logTicketActivity({ user_id, action: 'CREATE', ticket_id: row.ticket_id, new_values: row });\nreturn row;\n"
        print(f"patched line {i+1}")
        break

with open('models/service-tickets.js', 'w') as f:
    f.writelines(lines)
