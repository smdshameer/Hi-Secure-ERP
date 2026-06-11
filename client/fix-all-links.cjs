const fs = require("fs");
const path = require("path");
const dir = "C:/Users/Admin/Desktop/Calude Test/erp-app/client/src/pages";
const files = fs.readdirSync(dir).filter(f => f.endsWith(".tsx"));
const fixMap = {
  "Repairs.tsx": [
    ["<Link o={`/repairs/new`}", "<Link to=\"/repairs/new\""],
    ["<Link o={`/repairs/${r.id}`}", "<Link to={`/repairs/${r.id}`}"],
    ["<Link o={`/repairs/${r.id}/edit`}", "<Link to={`/repairs/${r.id}/edit`}"],
  ],
  "Customers.tsx": [
    ["<Link o={`/customers/new`}", "<Link to=\"/customers/new\""],
    ["<Link o={`/customers/${c.id}`}", "<Link to={`/customers/${c.id}`}"],
    ["<Link o={`/customers/${c.id}/edit`}", "<Link to={`/customers/${c.id}/edit`}"],
  ],
  "Products.tsx": [
    ["<Link o={`/parts/new`}", "<Link to=\"/parts/new\""],
    ["<Link o={`/parts/${p.id}`}", "<Link to={`/parts/${p.id}`}"],
    ["<Link o={`/parts/${p.id}/edit`}", "<Link to={`/parts/${p.id}/edit`}"],
  ],
  "Quotations.tsx": [
    ["<Link o={`/quotations/new`}", "<Link to=\"/quotations/new\""],
    ["<Link o={`/quotations/${q.id}`}", "<Link to={`/quotations/${q.id}`}"],
    ["<Link o={`/quotations/${q.id}/edit`}", "<Link to={`/quotations/${q.id}/edit`}"],
  ],
  "PurchaseOrders.tsx": [
    ["<Link o={`/purchases/new`}", "<Link to=\"/purchases/new\""],
    ["<Link o={`/purchases/${o.id}`}", "<Link to={`/purchases/${o.id}`}"],
    ["<Link o={`purchases/${o.id}/edit`}", "purchases/${o.id}/edit`}"],
  ],
  "DeliveryChallan.tsx": [
    ["<Link o={`/delivery-challans/new`}", "<Link to=\"/delivery-challans/new\""],
    ["<Link o={`/delivery-challans/${c.id}`}", "<Link to={`/delivery-challans/${c.id}`}"],
    ["<Link o={`/delivery-challans/${c.id}/edit`}", "<Link to={`/delivery-challans/${c.id}/edit`}"],
  ],
  "Suppliers.tsx": [
    ["<Link o={`/suppliers/new`}", "<Link to=\"/suppliers/new\""],
    ["<Link o={`/suppliers/${s.id}`}", "<Link to={`/suppliers/${s.id}`}"],
    ["<Link o={`/suppliers/${s.id}/edit`}", "<Link to={`/suppliers/${s.id}/edit`}"],
  ],
  "Technicians.tsx": [
    ["<Link o={`/technicians/new`}", "<Link to=\"/technicians/new\""],
    ["<Link o={`/technicians/${t.id}`}", "<Link to={`/technicians/${t.id}`}"],
    ["<Link o={`/technicians/${t.id}/edit`}", "<Link to={`/technicians/${t.id}/edit`}"],
  ],
  "Locations.tsx": [
    ["<Link o={`/locations/new`}", "<Link to=\"/locations/new\""],
    ["<Link o={`/locations/${loc.id}`}", "<Link to={`/locations/${loc.id}`}"],
    ["<Link o={`/locations/${loc.id}/edit`}", "<Link to={`/locations/${loc.id}/edit`}"],
  ],
  "Users.tsx": [
    ["<Link o={`/users/new`}", "<Link to=\"/users/new\""],
    ["<Link o={`/users/${u.id}/edit`}", "<Link to={`/users/${u.id}/edit`}"],
  ],
  "Companies.tsx": [
    ["<Link o={`/companies/new`}", "<Link to=\"/companies/new\""],
    ["<Link o={`/companies/${c.id}`}", "<Link to={`/companies${c.id}`}"],
    ["<Link o={`/companies/${c.id}/edit`}", "<Link to={`/companies${c.id}/edit`}"],
  ],
  "CRM.tsx": [
    ["<Link o={`/crm/new`}", "<Link to=\"/crm/new\""],
    ["<Link o={`/crm/${l.id}`}", "<Link to={`/crm/${l.id}`}"],
    ["<Link o={`/mailto:${l.email}`}", "<Link to={`mailto:${l.email}`}"],
  ],
  "Payroll.tsx": [
    ["<Link o={`/payroll/runs`}", "<Link to=\"/payroll/runs\""],
  ],
  "Dashboard.tsx": [
    ["<Link o={`/repairs/new`}", "<Link to=\"/repairs/new\""],
    ["<Link o={`/sales/new`}", "<Link to=\"/sales/new\""],
    ["<Link o={`/quotations/new`}", "<Link to=\"/quotations/new\""],
    ["<Link o={`/purchases/new`}", "<Link to=\"/purchases/new\""],
    ["<Link o={`/repairs/${r.id}`}", "<Link to={`/repairs/${r.id}`}"],
    ["<Link o={`/sales/${inv.id}`}", "<Link to={`/sales/${inv.id}`}"],
  ],
};

for (const fname of files) {
  if (!fixMap[fname]) continue;
  let content = fs.readFileSync(path.join(dir, fname), "utf8");
  let changed = false;
  for (const [oldStr, newStr] of fixMap[fname]) {
    if (content.includes(oldStr)) {
      content = content.replace(oldStr, newStr);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(path.join(dir, fname), content, "utf8");
    console.log("Fixed: " + fname);
  } else {
    console.log("No changes needed: " + fname);
  }
}
