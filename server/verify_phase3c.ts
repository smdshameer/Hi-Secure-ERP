/**
 * verify_phase3c.ts
 * Phase 3C — CRM, AMC Automation & Customer Portal Verification Suite
 */

process.env.STANDALONE_SCRIPT = 'true';
import dotenv from 'dotenv';
dotenv.config();

import { prisma } from './src/index';
import { CrmService } from './src/services/CrmService';
import { AmcAutomationService } from './src/services/AmcAutomationService';
import { TechnicianMobileService } from './src/services/TechnicianMobileService';
import { CustomerPortalService } from './src/services/CustomerPortalService';
import { ServiceJobService } from './src/services/ServiceJobService';
import { PartsConsumptionService } from './src/services/PartsConsumptionService';

const crmService = new CrmService();
const amcService = new AmcAutomationService();
const mobileService = new TechnicianMobileService();
const portalService = new CustomerPortalService();
const jobService = new ServiceJobService();

let totalTests = 0;
let passed = 0;
let failed = 0;
const failures: string[] = [];

function pass(name: string) {
  totalTests++;
  passed++;
  console.log(`  ✅ PASS: ${name}`);
}

function fail(name: string, reason: any) {
  totalTests++;
  failed++;
  const msg = reason instanceof Error ? reason.message : String(reason);
  failures.push(`[${name}] ${msg}`);
  console.error(`  ❌ FAIL: ${name}\n       → ${msg}`);
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    pass(name);
  } catch (err) {
    fail(name, err);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

async function ensureUser(role = 'admin', emailSuffix = 'admin'): Promise<number> {
  const email = `user_3c_${emailSuffix}_${Date.now()}@test.com`;
  const u = await prisma.user.create({
    data: {
      username: `user_3c_${emailSuffix}_${Date.now()}`,
      email,
      password_hash: 'hash',
      full_name: `P3C ${role}`,
      role,
      is_active: true
    }
  });
  return u.user_id;
}

async function ensureTechnician(): Promise<number> {
  const t = await prisma.technician.create({
    data: {
      name: 'P3C Mobile Tech',
      specialization: 'Access Control',
      phone: '9876543209',
      is_active: true
    }
  });
  return t.technician_id;
}

async function ensureCustomer(): Promise<number> {
  const c = await prisma.customer.create({
    data: {
      customer_code: `CUST-3C-${Date.now()}`,
      name: 'P3C Customer',
      phone: `98765432${Math.floor(10 + Math.random() * 90)}`,
      is_active: true
    }
  });
  return c.customer_id;
}

async function ensurePart(numSuffix: string, price = 100): Promise<number> {
  const p = await prisma.parts.create({
    data: {
      part_number: `P3C-${numSuffix}-${Date.now()}`,
      name: `P3C Test Part ${numSuffix}`,
      cost_price: price,
      selling_price: price * 1.5,
      tax_rate: 18,
      is_active: true,
      reorder_level: 5
    }
  });
  return p.part_id;
}

async function ensureWarehouse(codeSuffix: string): Promise<number> {
  const wh = await prisma.location.create({
    data: {
      location_code: `W3C-${codeSuffix}-${Date.now().toString().slice(-6)}`,
      name: `P3C Warehouse ${codeSuffix}`,
      is_active: true
    }
  });
  return wh.location_id;
}

// ─── Main Test Runner ────────────────────────────────────────────────────────

async function runTests() {
  console.log('=== STARTING PHASE 3C VERIFICATION SUITE ===\n');

  const userId = await ensureUser('admin', 'admin');
  const salesRepId = await ensureUser('sales', 'sales');
  const techId = await ensureTechnician();
  const custId = await ensureCustomer();
  const custId2 = await ensureCustomer(); // For tenant isolation test
  const part1 = await ensurePart('1', 150);
  const part2 = await ensurePart('2', 300);
  const wh1 = await ensureWarehouse('A');

  // Setup user link to customer for portal auth simulation
  const portalUserId = await ensureUser('customer', 'portal');
  await prisma.user.update({
    where: { user_id: portalUserId },
    data: { customer_id: custId }
  });

  // Setup stocks (OCC stock_version initialized to 1)
  await prisma.partStock.create({ data: { part_id: part1, location_id: wh1, quantity: 20, stock_version: 1 } });
  await prisma.partStock.create({ data: { part_id: part2, location_id: wh1, quantity: 10, stock_version: 1 } });

  // Placeholders
  let leadId = 0;
  let oppId = 0;
  let followupId = 0;
  let quoteId = 0;
  let contractId = 0;
  let amcJobId = 0;
  let amcVisitId = 0;
  let amcVisitScheduleId = 0;
  let partsRequestId = 0;

  // ─── GROUP A: CRM PIPELINE & QUOTATION TRACKING ──────────────────────────
  
  await test('1. Lead Creation', async () => {
    const lead = await crmService.createLead({
      first_name: 'John',
      last_name: 'Doe',
      company_name: 'Doe CCTV Corp',
      email: 'john@doecctv.com',
      phone: '9876543210',
      assigned_to: salesRepId,
      source: 'Website',
      notes: 'Interested in biometric upgrades.'
    }, userId);

    assert(lead.status === 'NEW', 'Initial lead status must be NEW');
    assert(lead.lead_number.startsWith('LD-'), 'Lead number must start with LD-');
    leadId = lead.lead_id;
  });

  await test('2. Activity Logging', async () => {
    const act = await crmService.logLeadActivity({
      lead_id: leadId,
      activity_type: 'CALL',
      notes: 'Initial intro call completed. Lead interested.'
    }, salesRepId);

    assert(act.activity_type === 'CALL', 'Activity type mismatch');
    const lead = await prisma.lead.findUnique({ where: { lead_id: leadId } });
    assert(lead?.status === 'CONTACTED', 'Lead status should transition to CONTACTED');
  });

  await test('3. FollowUp Schedule', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const fup = await crmService.scheduleFollowUp({
      lead_id: leadId,
      scheduled_at: tomorrow,
      notes: 'Follow up call on proposal details',
      assigned_to: salesRepId
    }, userId);

    assert(fup.status === 'SCHEDULED', 'Followup should be SCHEDULED');
    followupId = fup.followup_id;
  });

  await test('4. Opportunity Stages', async () => {
    const opp = await crmService.createOpportunity({
      lead_id: leadId,
      customer_id: custId,
      name: 'Biometric Access Control Upgrade',
      estimated_revenue: 15000,
      close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      assigned_to: salesRepId
    }, userId);

    assert(opp.stage === 'PROSPECTING', 'Stage should be PROSPECTING');
    assert(opp.opportunity_number.startsWith('OPP-'), 'Prefix mismatch');
    oppId = opp.opportunity_id;

    // Transition stage to WON
    const updated = await crmService.updateOpportunityStage(oppId, 'WON', userId);
    assert(updated.stage === 'WON', 'Stage should be WON');
    assert(updated.probability === 100, 'Probability should be 100%');
  });

  await test('5. Quotation Tracking', async () => {
    // Generate a quotation mock
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 15);
    const quote = await prisma.quotation.create({
      data: {
        quote_number: `Q3C-${Date.now()}`,
        customer_id: custId,
        quote_date: new Date(),
        valid_until: validUntil,
        status: 'draft',
        total_amount: 500,
        subtotal: 500,
        created_by: userId
      }
    });
    quoteId = quote.quote_id;

    // Track it
    const tracking = await crmService.trackQuotation({
      quote_id: quoteId,
      status: 'ACCEPTED',
      feedback: 'Pricing was approved by board.'
    }, userId);

    assert(tracking.status === 'ACCEPTED', 'Tracking status mismatch');
    const q = await prisma.quotation.findUnique({ where: { quote_id: quoteId } });
    assert(q?.status === 'accepted', 'Quotation status should update to accepted');
  });


  // ─── GROUP B: AMC AUTOMATION & ENGINES ─────────────────────────────────

  await test('6. AMC Contract Activation', async () => {
    const start = new Date();
    const end = new Date();
    end.setFullYear(end.getFullYear() + 1);

    const contract = await amcService.createContract({
      customer_id: custId,
      start_date: start,
      end_date: end,
      billing_frequency: 'QUARTERLY',
      annual_value: 12000
    }, userId);

    assert(contract.status === 'ACTIVE', 'Contract status must be ACTIVE');
    assert(contract.contract_number.startsWith('AMC-'), 'Prefix mismatch');
    contractId = contract.contract_id;
  });

  await test('7. AMC Asset setup & visits generation', async () => {
    // Add biometric device under contract
    const asset = await amcService.addAsset({
      contract_id: contractId,
      part_id: part1,
      device_name: 'FaceID Biometric Scanner V1',
      serial_number: 'SN-BIOMETRIC-1',
      service_interval_days: 90
    }, userId);

    assert(asset.device_name === 'FaceID Biometric Scanner V1', 'Name mismatch');

    // Confirm that 4 visit schedules (quarterly for 1 year) were auto-generated
    const schedules = await prisma.amcVisitSchedule.findMany({
      where: { contract_id: contractId, asset_id: asset.asset_id }
    });
    assert(schedules.length === 4, `Should auto-schedule 4 quarterly visits, got ${schedules.length}`);
    amcVisitScheduleId = schedules[0].schedule_id;
  });

  await test('8. Auto-Visit Generation', async () => {
    // Mock the planned_date to today so it falls within the 30-day window
    await prisma.amcVisitSchedule.update({
      where: { schedule_id: amcVisitScheduleId },
      data: { planned_date: new Date() }
    });

    // Run engine
    const jobs = await amcService.autoGenerateDueVisits(userId);
    assert(jobs.length > 0, 'Auto generator should spawn service job');

    const updatedSchedule = await prisma.amcVisitSchedule.findUnique({
      where: { schedule_id: amcVisitScheduleId }
    });
    assert(updatedSchedule?.service_job_id !== null, 'Should link to service_job_id');
    amcJobId = updatedSchedule!.service_job_id!;

    const visit = await prisma.serviceVisit.findFirst({
      where: { job_id: amcJobId }
    });
    assert(visit !== null, 'Should auto-schedule planned visit');
    amcVisitId = visit!.visit_id;
  });

  await test('9. AMC Expiry Monitor', async () => {
    // Mock contract end date to 15 days from now
    const expiringSoon = new Date();
    expiringSoon.setDate(expiringSoon.getDate() + 15);
    await prisma.amcContract.update({
      where: { contract_id: contractId },
      data: { end_date: expiringSoon }
    });

    const report = await amcService.checkContractExpiries(userId);
    assert(report.warningCount >= 1, 'Should trigger expiry warning');

    // Mock contract end date to past
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1);
    await prisma.amcContract.update({
      where: { contract_id: contractId },
      data: { end_date: expiredDate }
    });

    const report2 = await amcService.checkContractExpiries(userId);
    assert(report2.expiredCount >= 1, 'Should mark expired contract');

    const check = await prisma.amcContract.findUnique({ where: { contract_id: contractId } });
    assert(check?.status === 'EXPIRED', 'Contract status should be EXPIRED');
  });

  await test('10. Auto-Renewal Quote', async () => {
    const quote = await amcService.generateRenewalQuotation(contractId, userId);
    assert(quote.status === 'draft', 'Quote should start as draft');
    assert(Number(quote.subtotal) === 12000, 'Quote amount should match contract annual value');

    const check = await prisma.amcContract.findUnique({ where: { contract_id: contractId } });
    assert(check?.status === 'PENDING_RENEWAL', 'Contract should be in PENDING_RENEWAL');
  });

  await test('11. Missed Visit Escalation', async () => {
    // Create contract and asset
    const contract = await amcService.createContract({
      customer_id: custId,
      start_date: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
      end_date: new Date(),
      billing_frequency: 'ANNUAL',
      annual_value: 5000
    }, userId);

    const asset = await amcService.addAsset({
      contract_id: contract.contract_id,
      part_id: part1,
      device_name: 'Overdue CCTV Camera',
      service_interval_days: 30
    }, userId);

    // Get a schedule and backdate it to 5 days ago
    const sched = await prisma.amcVisitSchedule.findFirst({
      where: { contract_id: contract.contract_id, asset_id: asset.asset_id }
    });
    
    const overdue = new Date();
    overdue.setDate(overdue.getDate() - 5);
    await prisma.amcVisitSchedule.update({
      where: { schedule_id: sched!.schedule_id },
      data: { planned_date: overdue, status: 'PLANNED' }
    });

    // Run missed visits scanner
    const result = await amcService.scanMissedVisits(userId);
    assert(result.missedCount >= 1, 'Should detect missed visit');

    const check = await prisma.amcVisitSchedule.findUnique({ where: { schedule_id: sched!.schedule_id } });
    assert(check?.status === 'MISSED', 'Status should be updated to MISSED');

    // Confirm business event logged
    const event = await prisma.businessEvent.findFirst({
      where: { event_type: 'AMC_VISIT_MISSED', entity_id: sched!.schedule_id },
      orderBy: { created_at: 'desc' }
    });
    assert(event !== null, 'Escalation business event should be logged');
  });


  // ─── GROUP C: SECURE CUSTOMER PORTAL ───────────────────────────────────

  await test('12. Complaint Submission', async () => {
    const job = await portalService.createComplaint(custId, {
      problem_description: 'Fingerprint scanner is not reading properly',
      items: [{ device_name: 'Scanner A', issue_description: 'Red LED error' }]
    }, userId);

    assert(job.status === 'OPEN', 'Portal ticket should start in OPEN state');
    assert(job.customer_id === custId, 'Should belong to custId');
  });

  await test('13. Service Job Visibility', async () => {
    const list = await portalService.getCustomerJobs(custId);
    assert(list.length >= 1, 'Should return jobs');
    assert(list.every(j => j.customer_id === custId), 'Isolation breach: returned jobs from other customer');
  });

  await test('14. Tenant Data Isolation', async () => {
    // Attempt to retrieve a job for custId2 using custId context
    const jobs2 = await portalService.getCustomerJobs(custId2);
    // If we query specific job details of custId (job ID from Test 12) under custId2 context, it should fail
    const job = await portalService.createComplaint(custId, { problem_description: 'Secure test' });
    
    let accessBlocked = false;
    try {
      await portalService.getCustomerJobById(custId2, job.job_id);
    } catch (e: any) {
      if (e.message === 'SERVICE_JOB_NOT_FOUND') {
        accessBlocked = true;
      }
    }
    assert(accessBlocked, 'Should prevent customer from fetching another customer job');
  });

  await test('15. Contract & Warranty Status', async () => {
    const contracts = await portalService.getCustomerContracts(custId);
    assert(contracts.length > 0, 'Should return customer contract');

    // Create a mock invoice for part1 to check warranty status
    const invoice = await prisma.salesInvoice.create({
      data: {
        invoice_number: `INV3C-${Date.now()}`,
        customer_id: custId,
        grand_total: 1500,
        status: 'paid',
        items: {
          create: [{
            part_id: part1,
            quantity: 1,
            unit_price: 150,
            total_amount: 150
          }]
        }
      }
    });

    const status = await portalService.getWarrantyStatus(custId, part1);
    assert(status.active === true, 'Warranty should be active');
    assert(status.invoice_number === invoice.invoice_number, 'Invoice link mismatch');
  });

  await test('16. Invoice List & Detail', async () => {
    const invoices = await portalService.getCustomerInvoices(custId);
    assert(invoices.length >= 1, 'Should return customer invoice');

    const detail = await portalService.getInvoiceDetail(custId, invoices[0].invoice_id);
    assert(detail.customer_id === custId, 'Invoice detail isolation check failed');
  });


  // ─── GROUP D: TECHNICIAN MOBILE WORKFLOWS ──────────────────────────────

  await test('17. Job Check-In', async () => {
    const log = await mobileService.logCheckIn({
      visit_id: amcVisitId,
      technician_id: techId,
      latitude: 12.9716,
      longitude: 77.5946
    }, userId);

    assert(log.activity_type === 'CHECK_IN', 'Log type must be CHECK_IN');
    assert(Number(log.latitude) === 12.9716, 'Lat mismatch');
  });

  await test('18. Photo Metadata Upload', async () => {
    const att = await mobileService.uploadAttachment({
      visit_id: amcVisitId,
      file_url: 'http://cdn/ins1.jpg',
      file_name: 'inspection1.jpg',
      latitude: 12.9716,
      longitude: 77.5946
    }, userId);

    assert(att.file_name === 'inspection1.jpg', 'Name mismatch');
    assert(Number(att.latitude) === 12.9716, 'Coordinate link mismatch');
  });

  await test('19. Signature Capture & Execution', async () => {
    // Complete the visit with signature
    const visit = await mobileService.captureSignature({
      visit_id: amcVisitId,
      findings: 'Sensor cleared, test passed.',
      signature_url: 'http://cdn/sig3c.png'
    }, userId);

    assert(visit.status === 'EXECUTED', 'Visit should update to EXECUTED');
    assert(visit.signature_url === 'http://cdn/sig3c.png', 'Signature missing');
  });

  await test('20. Parts Request Creation', async () => {
    const req = await mobileService.createPartsRequest({
      job_id: amcJobId,
      part_id: part2, // stock starts at 10
      location_id: wh1,
      quantity: 3,
      requested_by: techId
    }, userId);

    assert(req.status === 'PENDING', 'Request should be PENDING');
    assert(req.quantity === 3, 'Qty mismatch');
    partsRequestId = req.request_id;
  });

  await test('21. Parts Request Fulfillment', async () => {
    // Approve it (deducts 3 from part2 stock: 10 -> 7)
    const fulfilled = await mobileService.approvePartsRequest(partsRequestId, userId);
    assert(fulfilled.status === 'FULFILLED', 'Status should be FULFILLED');

    const stock = await prisma.partStock.findUnique({
      where: { part_id_location_id: { part_id: part2, location_id: wh1 } }
    });
    assert(stock?.quantity === 7, `Stock should be 7, got ${stock?.quantity}`);
  });


  // ─── GROUP E: CONCURRENCY & INVARIANTS PROTECTION ─────────────────────

  await test('22. Over-fulfillment Prevention', async () => {
    // Create request for more than available (stock of part2 is 7)
    const request = await mobileService.createPartsRequest({
      job_id: amcJobId,
      part_id: part2,
      location_id: wh1,
      quantity: 15, // available is 7
      requested_by: techId
    }, userId);

    let rejected = false;
    try {
      await mobileService.approvePartsRequest(request.request_id, userId);
    } catch (e: any) {
      if (e.message === 'NEGATIVE_STOCK_PREVENTED') {
        rejected = true;
      }
    }
    assert(rejected, 'Should reject with NEGATIVE_STOCK_PREVENTED');

    const check = await prisma.partsRequest.findUnique({ where: { request_id: request.request_id } });
    assert(check?.status === 'PENDING', 'Request status should remain PENDING');
  });

  await test('23. OCC Request Collision', async () => {
    const request = await mobileService.createPartsRequest({
      job_id: amcJobId,
      part_id: part2,
      location_id: wh1,
      quantity: 1,
      requested_by: techId
    }, userId);

    const stock = await prisma.partStock.findUnique({
      where: { part_id_location_id: { part_id: part2, location_id: wh1 } }
    });
    const origVersion = stock!.stock_version;

    // Temporary override global prisma.$transaction to inject Proxy
    const originalTransaction = prisma.$transaction;
    (prisma as any).$transaction = async (callback: any, options: any) => {
      const wrappedCallback = async (tx: any) => {
        const txProxy = new Proxy(tx, {
          get(target, prop) {
            if (prop === 'partStock') {
              return new Proxy(target.partStock, {
                get(psTarget, psProp) {
                  if (psProp === 'findUnique') {
                    return async (...args: any[]) => {
                      const res = await (psTarget as any).findUnique(...args);
                      // Concurrent modification occurs AFTER findUnique but BEFORE updateMany
                      await prisma.partStock.update({
                        where: { part_id_location_id: { part_id: part2, location_id: wh1 } },
                        data: { quantity: 5, stock_version: origVersion + 1 }
                      });
                      return res;
                    };
                  }
                  return Reflect.get(psTarget, psProp);
                }
              });
            }
            return Reflect.get(target, prop);
          }
        });
        return callback(txProxy);
      };
      return originalTransaction.call(prisma, wrappedCallback, options);
    };

    let occThrown = false;
    try {
      await mobileService.approvePartsRequest(request.request_id, userId);
    } catch (e: any) {
      if (e.message === 'STOCK_CONFLICT_DETECTED') {
        occThrown = true;
      }
    } finally {
      // Restore original transaction method
      (prisma as any).$transaction = originalTransaction;
    }

    assert(occThrown, 'Should throw STOCK_CONFLICT_DETECTED on concurrency mismatch');
  });

  await test('24. Atomic Request Rollback', async () => {
    // Create request for 2 parts (current stock of part2 is 5)
    const request = await mobileService.createPartsRequest({
      job_id: amcJobId,
      part_id: part2,
      location_id: wh1,
      quantity: 2,
      requested_by: techId
    }, userId);

    // Temporarily mock partsConsumptionService.consumeParts to throw error midway
    const originalConsume = PartsConsumptionService.prototype.consumeParts;
    PartsConsumptionService.prototype.consumeParts = async () => {
      throw new Error('MOCK_TRANSACTION_FAILURE');
    };

    let failed = false;
    try {
      await mobileService.approvePartsRequest(request.request_id, userId);
    } catch (e: any) {
      if (e.message === 'MOCK_TRANSACTION_FAILURE') {
        failed = true;
      }
    } finally {
      // Restore original implementation
      PartsConsumptionService.prototype.consumeParts = originalConsume;
    }

    assert(failed, 'Approval should fail');

    // Confirm stock count did not change (remains 5)
    const checkStock = await prisma.partStock.findUnique({
      where: { part_id_location_id: { part_id: part2, location_id: wh1 } }
    });
    assert(checkStock?.quantity === 5, `Stock should roll back to 5, got ${checkStock?.quantity}`);

    // Request should remain PENDING
    const checkReq = await prisma.partsRequest.findUnique({ where: { request_id: request.request_id } });
    assert(checkReq?.status === 'PENDING', 'Request status must roll back to PENDING');
  });

  await test('25. Legacy Regression Check', async () => {
    // Verify legacy repairs still queries correctly without schema failures
    const count = await prisma.repair.count();
    assert(typeof count === 'number', 'Legacy query failed');
  });

  console.log('\n======================================');
  console.log(`Phase 3C Tests complete: ${passed} Passed, ${failed} Failed / ${totalTests} Total`);
  console.log('======================================\n');

  if (failures.length > 0) {
    console.error('Failure Details:');
    failures.forEach(f => console.error(`  ${f}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL 25 TESTS PASSED SUCCESSFULLY! PHASE_3C COMPLETED.');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Unhandled rejection in verification suite:', err);
  process.exit(1);
});
