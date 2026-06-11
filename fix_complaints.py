with open('models/complaints.js', 'r') as f:
    text = f.read()

# Fix 1: updateComplaintStatus - replace COALESCE($4, resolution_rating) with dynamic UPDATE
old_status_fn = text[text.find('async function updateComplaintStatus'):text.find('\nasync function escalateComplaint')]
new_status_fn = '''async function updateComplaintStatus(id, status, user_id, resolution, rating) {
  const current = await getComplaintById(id);
  if (!current) return null;
  const valid = ['registered','under_review','escalated','resolved','closed','rejected'];
  if (!valid.includes(status)) throw new Error(`Invalid status '${status}'`);
  const fields = ['status = $1', 'updated_at = now()'];
  const params = [status];
  let idx = 2;
  if (resolution) { fields.push(`resolution = $${idx}`); params.push(resolution); idx++; }
  if (rating) { fields.push(`resolution_rating = $${idx}`); params.push(+rating); idx++; }
  if (status === 'resolved') fields.push(`resolved_at = COALESCE(resolved_at, now())`);
  if (status !== 'resolved' && status !== 'closed') fields.push(`resolved_at = NULL`);
  params.push(id);
  const r = await pool.query(`UPDATE complaints SET ${fields.join(', ')} WHERE complaint_id = $${idx} RETURNING *`, params);
  const updated = r.rows[0];
  await logComplaintActivity({ user_id, action: 'STATUS_CHANGE', complaint_id: id, old_values: { status: current.status }, new_values: { status, resolution: updated.resolution } });
  return updated;
}'''

text = text.replace(old_status_fn, new_status_fn)

# Fix 2: searchComplaints - same placeholder numbering bug as searchAssets
old_search = (
    "  clauses.push(`(c.complaint_number ILIKE $${params.length + 1} OR c.subject ILIKE $${params.length + 1} OR c.description ILIKE $${params.length + 1} OR cust.name ILIKE $${params.length + 1})`);\n"
    "  params.push(q, q, q, q);"
)
new_search = (
    "  const s1 = '$' + (params.length + 1), s2 = '$' + (params.length + 2);\n"
    "  const s3 = '$' + (params.length + 3), s4 = '$' + (params.length + 4);\n"
    "  clauses.push('(c.complaint_number ILIKE ' + s1 + ' OR c.subject ILIKE ' + s2 + ' OR c.description ILIKE ' + s3 + ' OR cust.name ILIKE ' + s4 + ')');\n"
    "  params.push(q, q, q, q);"
)

if old_search in text:
    text = text.replace(old_search, new_search)
    print("OK: patched searchComplaints")
else:
    print("WARN: searchComplaints pattern not found")

with open('models/complaints.js', 'w') as f:
    f.write(text)
print("written")
