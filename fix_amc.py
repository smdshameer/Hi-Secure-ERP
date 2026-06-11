with open('models/amc.js', 'r') as f:
    lines = f.readlines()

# Replace lines 54-57 (0-indexed 53-56): createContract insert + return
for i, line in enumerate(lines):
    if 'return r.rows[0];' in line and i > 50 and i < 60:
        # Replace the return line with computed total + audit
        lines[i] = "const computedGrandTotal = (grand_total ?? amount ?? 0) + (tax_amount || 0);\nconst grandTotalValue = computedGrandTotal;\nconst row = r.rows[0];\nawait logAmcActivity({ user_id, action: 'CREATE', amc_id: row.amc_id, new_values: row });\nreturn row;\n"
        # Fix the INSERT params line (2 lines above)
        for j in range(i-3, i):
            if 'amount, tax_amount || 0, grand_total' in lines[j]:
                lines[j] = lines[j].replace('grand_total,', 'grandTotalValue,')
                lines[j] = lines[j].replace('amount, tax_amount || 0, grandTotalValue', 'amount || 0, tax_amount || 0, grandTotalValue')
                print(f"patched params line {j+1}")
                break
        print(f"patched return line {i+1}")
        break

with open('models/amc.js', 'w') as f:
    f.writelines(lines)
