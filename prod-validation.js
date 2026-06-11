require("dotenv").config({ override: true });
const http = require("http");
const { pool } = require("./config/database");
const bcrypt = require("bcrypt");
const url = require("url");

const PORT = parseInt(process.env.PORT || "3099", 10);
const BASE_URL = `http://localhost:${PORT}`;
const ADMIN = { username: "admin", password: "admin@123" };
const SESSION_COOKIE = process.env.COOKIE_NAME || "hisecure.sid";

let cookieHeader = "";
const results = [];
let pass = 0;
let fail = 0;

function writeResult(label, ok, detail) {
  pass += ok ? 1 : 0;
  fail += !ok ? 1 : 0;
  results.push({ label, ok, detail });
}

function getData(resp) {
  if (resp && typeof resp === "object" && "data" in resp) {
    return resp.data;
  }
  return [];
}

function log(label, ok, detail) {
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} ${label}${detail ? " — " + detail : ""}`);
  writeResult(label, ok, detail);
}

function requestJSON(path, opts, body) {
  return new Promise((resolve, reject) => {
    const reqOpts = url.parse(path);
    const method = (opts ? opts.method : "GET").toUpperCase() || "GET";
    const headers = Object.assign({}, opts ? opts.headers : {});
    headers["Content-Type"] = "application/json";
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }
    const payload = body !== undefined ? Buffer.from(JSON.stringify(body)) : null;
    if (payload) {
      headers["Content-Length"] = payload.length;
    }
    const requestOptions = {
      hostname: reqOpts.hostname || "localhost",
      port: reqOpts.port || PORT,
      path: reqOpts.path || path,
      method,
      headers
    };
    const req = http.request(requestOptions, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString();
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        const setCookie = res.headers["set-cookie"];
        if (Array.isArray(setCookie)) {
          for (const cookie of setCookie) {
            const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
            if (match) {
              cookieHeader = `${SESSION_COOKIE}=${match[1]}`;
              break;
            }
          }
        }
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: parsed });
      });
    });
    req.on("error", (err) => {
      reject(err);
    });
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function login() {
  const resp = await requestJSON("/api/auth/login", { method: "POST" }, ADMIN);
  log("Login as admin", resp.ok && (resp.body && resp.body.ok), resp.body && resp.body.error);
  return resp.ok && (resp.body && resp.body.ok) === true;
}

async function workflowSales() {
  console.log("\n=== WORKFLOW 1: CUSTOMER → QUOTATION → INVOICE → DC ===");
  let customerId;
  let partId;
  let quotationId;
  let invoiceId;
  let challanId;

  try {
    const customerRes = await requestJSON("/api/customers", { method: "POST" }, {
      name: "E2E Customer",
      phone: "9999999999",
      email: "e2e@test.com",
      city: "Chennai",
      state: "Tamil Nadu",
      customer_type: "retail"
    });
    customerId = (customerRes.body && customerRes.body.data && customerRes.body.data.customer_id) || null;
    log("Create customer", !!customerId, customerId || customerRes.body.error);
  } catch (err) {
    log("Create customer", false, err.message);
  }

  try {
    const partsRes = await requestJSON("/api/parts", { method: "GET" });
    const parts = getData(partsRes.body);
    partId = (parts.length && parts[0].part_id) || null;
    log("Fetch parts list", !!partId, partId ? parts[0].part_number : "none");
  } catch (err) {
    log("Fetch parts list", false, err.message);
  }

  if (!customerId || !partId) {
    log("Skip remaining workflow", false, "missing customer or part");
    return;
  }

  try {
    const quoteRes = await requestJSON("/api/quotations", { method: "POST" }, {
      customer_id: customerId,
      valid_until: "2026-12-31",
      items: [
        {
          part_id: partId,
          quantity: 2,
          unit_price: 1000,
          discount_percent: 0,
          tax_rate: 18
        }
      ]
    });
    quotationId = (quoteRes.body && quoteRes.body.data && quoteRes.body.data.quote_id) || null;
    log("Create quotation", !!quotationId, quoteRes.body.error);
  } catch (err) {
    log("Create quotation", false, err.message);
  }
  if (!quotationId) {
    return;
  }

  try {
    const markSent = await requestJSON(`/api/quotations/${quotationId}/status`, { method: "PUT" }, { status: "sent" });
    log("Mark quotation sent", markSent.ok && (markSent.body && markSent.body.ok), markSent.body.error);
  } catch (err) {
    log("Mark quotation sent", false, err.message);
  }

  try {
    const acceptQuote = await requestJSON(`/api/quotations/${quotationId}/status`, { method: "PUT" }, { status: "accepted" });
    log("Accept quotation", acceptQuote.ok && (acceptQuote.body && acceptQuote.body.ok), acceptQuote.body.error);
  } catch (err) {
    log("Accept quotation", false, err.message);
  }

  try {
    const convertRes = await requestJSON(`/api/quotations/${quotationId}/convert`, { method: "POST" });
    invoiceId = (convertRes.body && convertRes.body.data && convertRes.body.data.invoice_id) || null;
    log("Convert to invoice", !!invoiceId, convertRes.body.error);
  } catch (err) {
    log("Convert to invoice", false, err.message);
  }
  if (!invoiceId) {
    return;
  }

  try {
    const issueRes = await requestJSON(`/api/invoices/${invoiceId}/issue`, { method: "POST" });
    log("Issue invoice", issueRes.ok && (issueRes.body && issueRes.body.ok), issueRes.body.error);
  } catch (err) {
    log("Issue invoice", false, err.message);
  }

  try {
    const challanRes = await requestJSON("/api/delivery-challans", { method: "POST" }, {
      customer_id: customerId,
      from_location_id: 1,
      to_location_id: 2,
      challan_date: "2026-06-05",
      purposes: "sales",
      items: [
        {
          part_id: partId,
          quantity: 2
        }
      ]
    });
    challanId = (challanRes.body && challanRes.body.data && challanRes.body.data.delivery_challan_id) || null;
    log("Create delivery challan", !!challanId, challanRes.body.error);
  } catch (err) {
    log("Create delivery challan", false, err.message);
  }

  if (challanId) {
    try {
      const dispatched = await requestJSON(`/api/delivery-challans/${challanId}/status`, { method: "PUT" }, { status: "dispatched" });
      log("DC dispatched", dispatched.ok && (dispatched.body && dispatched.body.ok), dispatched.body.error);
      const inTransit = await requestJSON(`/api/delivery-challans/${challanId}/status`, { method: "PUT" }, { status: "in_transit" });
      log("DC in_transit", inTransit.ok && (inTransit.body && inTransit.body.ok), inTransit.body.error);
      const delivered = await requestJSON(`/api/delivery-challans/${challanId}/status`, { method: "PUT" }, { status: "delivered" });
      log("DC delivered", delivered.ok && (delivered.body && delivered.body.ok), delivered.body.error);
      try {
        const link = await pool.query("SELECT invoice_id FROM delivery_challans WHERE delivery_challan_id=$1", [challanId]);
        log("Delivery challan linked to invoice", !!link.rows[0] && !!link.rows[0].invoice_id, link.rows[0] ? link.rows[0].invoice_id : "null");
      } catch (sqlErr) {
        log("Delivery challan linked to invoice", false, sqlErr.message);
      }
    } catch (err) {
      log("DC status flow", false, err.message);
    }
  }
}

async function workflowService() {
  console.log("\n=== WORKFLOW 2: ASSET → COMPLAINT → TICKET → TECHNICIAN → REPAIR ===");
  let assetId;
  let complaintId;
  let ticketId;
  let repairId;

  try {
    const assetRes = await requestJSON("/api/customer-assets", { method: "POST" }, {
      customer_id: 1,
      asset_type: "CCTV",
      brand: "Hikvision",
      serial_number: "E2E-SN-001",
      location_at_site: "Main Gate"
    });
    assetId = (assetRes.body && assetRes.body.data && assetRes.body.data.cust_asset_id) || null;
    log("Create customer asset", !!assetId, assetRes.body.error);
  } catch (err) {
    log("Create customer asset", false, err.message);
  }

  try {
    const complaintRes = await requestJSON("/api/complaints", { method: "POST" }, {
      customer_id: 1,
      category: "service",
      subject: "E2E Service Request",
      assigned_to: 1
    });
    complaintId = (complaintRes.body && complaintRes.body.data && complaintRes.body.data.complaint_id) || null;
    log("Create complaint", !!complaintId, complaintRes.body.error);
  } catch (err) {
    log("Create complaint", false, err.message);
  }

  if (complaintId) {
    try {
      const escalation = await requestJSON(`/api/complaints/${complaintId}/escalate`, { method: "POST" }, { escalated_to: 1 });
      log("Escalate complaint", escalation.ok && (escalation.body && escalation.body.ok), escalation.body.error);
    } catch (err) {
      log("Escalate complaint", false, err.message);
    }
  }

  try {
    const ticketRes = await requestJSON("/api/tickets", { method: "POST" }, {
      customer_id: 1,
      subject: "E2E Service Ticket",
      product_type: "CCTV Camera",
      priority: "high",
      description: "Testing workflow"
    });
    ticketId = (ticketRes.body && ticketRes.body.data && ticketRes.body.data.ticket_id) || null;
    log("Create service ticket", !!ticketId, ticketRes.body.error);
  } catch (err) {
    log("Create service ticket", false, err.message);
  }

  if (ticketId) {
    try {
      const technicians = await requestJSON("/api/technicians", { method: "GET" });
      const technician = ((technicians.body && technicians.body.data && technicians.body.data.length) ? technicians.body.data[0] : null) || ((technicians.body && technicians.body.items && technicians.body.items.length) ? technicians.body.items[0] : null);
      log("Fetch technicians", !!technician, technician ? technician.name : "none");
      if (technician) {
        try {
          const assign = await requestJSON(`/api/technicians/${technician.technician_id}/assign-ticket`, { method: "POST" }, { ticket_id: ticketId });
          log("Assign technician to ticket", assign.ok && (assign.body && assign.body.ok), assign.body.error);
        } catch (err) {
          log("Assign technician to ticket", false, err.message);
        }
      }
    } catch (err) {
      log("Fetch technicians", false, err.message);
    }
  }

  try {
    const repairRes = await requestJSON("/api/repairs", { method: "POST" }, {
      customer_id: 1,
      product_type: "CCTV Camera",
      problem_description: "E2E repair test",
      estimated_cost: 5000
    });
    repairId = (repairRes.body && repairRes.body.data && repairRes.body.data.repair_id) || null;
    log("Create repair", !!repairId, repairRes.body.error);
  } catch (err) {
    log("Create repair", false, err.message);
  }

  if (repairId) {
    try {
      const completed = await requestJSON(`/api/repairs/${repairId}/status`, { method: "PUT" }, { status: "completed" });
      log("Repair completed", completed.ok && (completed.body && completed.body.ok), completed.body.error);
      const delivered = await requestJSON(`/api/repairs/${repairId}/status`, { method: "PUT" }, { status: "delivered" });
      log("Repair delivered", delivered.ok && (delivered.body && delivered.body.ok), delivered.body.error);
    } catch (err) {
      log("Repair status flow", false, err.message);
    }
  }
}

async function workflowAMC() {
  console.log("\n=== WORKFLOW 3: AMC CONTRACT → VISIT → TECHNICIAN ===");
  let contractId;
  let visitId;

  try {
    const contractRes = await requestJSON("/api/amc/contracts", { method: "POST" }, {
      customer_id: 1,
      contract_type: "annual",
      start_date: "2025-01-01",
      end_date: "2026-01-01",
      visit_frequency: "quarterly",
      visits_per_year: 4,
      amount: 50000,
      tax_amount: 9000,
      grand_total: 59000
    });
    contractId = (contractRes.body && contractRes.body.data && contractRes.body.data.amc_id) || null;
    log("Create AMC contract", !!contractId, contractRes.body.error);
  } catch (err) {
    log("Create AMC contract", false, err.message);
  }

  if (contractId) {
    try {
      const activation = await requestJSON(`/api/amc/contracts/${contractId}/activate`, { method: "POST" });
      log("Activate AMC contract", activation.ok && (activation.body && activation.body.ok), activation.body.error);
    } catch (err) {
      log("Activate AMC contract", false, err.message);
    }
  }

  try {
    const contractList = await requestJSON("/api/amc/contracts", { method: "GET" });
    log("Fetch AMC contracts", contractList.ok && (contractList.body && contractList.body.ok), `count=${((contractList.body && contractList.body.data) || []).length}`);
    const stats = await requestJSON("/api/amc/stats", { method: "GET" });
    log("Fetch AMC stats", stats.ok, `status=${stats.status}`);
    const assets = await requestJSON("/api/amc/assets", { method: "GET" });
    log("Fetch AMC assets", assets.ok, `status=${assets.status}`);
    const visits = await requestJSON("/api/amc/visits", { method: "GET" });
    log("Fetch AMC visits", visits.ok, `status=${visits.status}`);
  } catch (err) {
    log("AMC list endpoints", false, err.message);
  }

  if (contractId) {
    try {
      const visitRes = await requestJSON("/api/amc/visits", { method: "POST" }, {
        amc_id: contractId,
        scheduled_date: "2026-06-15",
        visit_type: "routine",
        status: "scheduled"
      });
      visitId = (visitRes.body && visitRes.body.data && visitRes.body.data.visit_id) || null;
      log("Create AMC visit", !!visitId, visitRes.body.error);
    } catch (err) {
      log("Create AMC visit", false, err.message);
    }

    if (visitId) {
      try {
        const technicianList = await requestJSON("/api/technicians", { method: "GET" });
        const technician = ((technicianList.body && technicianList.body.data && technicianList.body.data.length) ? technicianList.body.data[0] : null) || ((technicianList.body && technicianList.body.items && technicianList.body.items.length) ? technicianList.body.items[0] : null);
        log("Fetch technicians for visit", !!technician, technician ? technician.name : "none");
        if (technician) {
          const updatedVisit = await requestJSON(`/api/amc/visits/${visitId}`, { method: "PUT" }, {
            technician_id: technician.technician_id,
            status: "in_progress",
            notes: "E2E visit"
          });
          log("Assign technician to visit", updatedVisit.ok && (updatedVisit.body && updatedVisit.body.ok), updatedVisit.body.error);
          const completedVisit = await requestJSON(`/api/amc/visits/${visitId}`, { method: "PUT" }, {
            status: "completed",
            notes: "Visit completed"
          });
          log("Complete AMC visit", completedVisit.ok && (completedVisit.body && completedVisit.body.ok), completedVisit.body.error);
        }
      } catch (err) {
        log("AMC visit flow", false, err.message);
      }
    }
  }
}

async function rbacChecks() {
  console.log("\n=== RBAC VALIDATION ===");
  const paths = ["/api/customers", "/api/invoices", "/api/amc/contracts", "/api/tickets", "/api/stores"];
  Object.keys(results).forEach(() => {
    // ensure fresh request
  });
  for (const path of paths) {
    cookieHeader = "";
    const resp = await requestJSON(path, { method: "GET" });
    log(`Unauthenticated ${path}`, resp.status === 401 || resp.status === 403, `status=${resp.status}`);
  }
}

async function auditChecks() {
  console.log("\n=== AUDIT LOG VALIDATION ===");
  try {
    const auditRes = await pool.query("SELECT module, action, record_id FROM audit_logs ORDER BY audit_log_id DESC LIMIT 10");
    const modules = new Set();
    auditRes.rows.forEach((row) => modules.add(row.module));
    log("Audit log entries", auditRes.rows.length > 0, `${auditRes.rows.length} rows`);
    log("Multiple audit modules", modules.size >= 3, Array.from(modules).join(", "));
  } catch (err) {
    log("Audit log checks", false, err.message);
  }
}

async function inventoryChecks() {
  console.log("\n=== INVENTORY PAGE CONNECTIVITY ===");
  const endpoints = ["/api/stores", "/api/stores/active", "/api/stores/transfers"];
  for (const endpoint of endpoints) {
    const resp = await requestJSON(endpoint, { method: "GET" });
    log(endpoint, resp.ok && (resp.body && resp.body.ok), `status=${resp.status}`);
  }
}

async function amcChecks() {
  console.log("\n=== AMC PAGE API VALIDATION ===");
  const res = await requestJSON("/api/amc/contracts", { method: "GET" });
  log("GET /api/amc/contracts", res.ok && (res.body && res.body.ok), `count=${((res.body && res.body.data) || []).length}`);
  const stats = await requestJSON("/api/amc/stats", { method: "GET" });
  log("GET /api/amc/stats", stats.ok, `status=${stats.status}`);
  const assets = await requestJSON("/api/amc/assets", { method: "GET" });
  log("GET /api/amc/assets", assets.status === 200, `status=${assets.status}`);
  const visits = await requestJSON("/api/amc/visits", { method: "GET" });
  log("GET /api/amc/visits", visits.status === 200, `status=${visits.status}`);
}

async function crossModuleChecks() {
  console.log("\n=== CROSS-MODULE LINK VALIDATION ===");
  const endpoints = ["/api/customers/1/repairs", "/api/customers/1/invoices", "/api/customers/1/quotations", "/api/customers/1/assets"];
  for (const endpoint of endpoints) {
    const resp = await requestJSON(endpoint, { method: "GET" });
    log(endpoint, resp.ok, `status=${resp.status}`);
  }
}

async function errorHandlingChecks() {
  console.log("\n=== ERROR HANDLING ===");
  const missingCustomer = await requestJSON("/api/customers/999999", { method: "GET" });
  log("Missing customer returns error", missingCustomer.status === 404 || (missingCustomer.body && missingCustomer.body.ok === false), `status=${missingCustomer.status}`);
  const missingQuote = await requestJSON("/api/quotations/999999/convert", { method: "POST" });
  log("Missing quote conversion fails", missingQuote.status === 404 || (missingQuote.body && missingQuote.body.ok === false), `status=${missingQuote.status}`);
  const badCustomer = await requestJSON("/api/customers", { method: "POST" }, {});
  log("Empty customer body rejected", badCustomer.status === 400 || (badCustomer.body && badCustomer.body.ok === false), `status=${badCustomer.status}`);
}

(async () => {
  console.log("Starting Production Validation...\n");
  const authed = await login();
  if (!authed) {
    console.log("Authentication failed; aborting.");
    process.exit(1);
  }

  await workflowSales();
  await workflowService();
  await workflowAMC();
  await rbacChecks();
  await auditChecks();
  await inventoryChecks();
  await amcChecks();
  await crossModuleChecks();
  await errorHandlingChecks();

  await pool.end();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`RESULTS: ${pass} passed, ${fail} failed out of ${pass + fail}`);
  failures = results.filter((r) => !r.ok);
  if (failures.length) {
    console.log("\nFAILURES:");
    failures.forEach((f) => {
      console.log(` ❌ ${f.label}: ${f.detail}`);
    });
  }
  console.log(`${"=".repeat(60)}`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
