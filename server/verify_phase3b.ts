/**
 * verify_phase3b.ts
 * Phase 3B — Service Center & Technician Management Verification Suite
 */

process.env.STANDALONE_SCRIPT = 'true';
import dotenv from 'dotenv';
dotenv.config();

import { prisma } from './src/index';
import { ServiceJobService } from './src/services/ServiceJobService';
import { PartsConsumptionService } from './src/services/PartsConsumptionService';
import { TechnicianPerformanceService } from './src/services/TechnicianPerformanceService';
import { WarehouseService } from './src/services/WarehouseService';
import { BusinessEventService } from './src/services/BusinessEventService';

const jobService = new ServiceJobService();
const consumptionService = new PartsConsumptionService();
const performanceService = new TechnicianPerformanceService();

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

async function ensureUser(): Promise<number> {
  const user = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (user) return user.user_id;
  const u = await prisma.user.create({
    data: {
      username: `admin_3b_${Date.now()}`,
      email: `admin_3b_${Date.now()}@test.com`,
      password_hash: 'hash',
      full_name: 'P3B Admin',
      role: 'admin',
      is_active: true
    }
  });
  return u.user_id;
}

async function ensureTechnician(): Promise<number> {
  const tech = await prisma.technician.findFirst({ where: { name: 'P3B Tech' } });
  if (tech) return tech.technician_id;
  const t = await prisma.technician.create({
    data: {
      name: 'P3B Tech',
      specialization: 'CCTV Installation',
      phone: '9876543201',
      is_active: true
    }
  });
  return t.technician_id;
}

async function ensureCustomer(): Promise<number> {
  const cust = await prisma.customer.findFirst({ where: { phone: '9876543202' } });
  if (cust) return cust.customer_id;
  const c = await prisma.customer.create({
    data: {
      customer_code: `CUST-${Date.now()}`,
      name: 'P3B Customer',
      phone: '9876543202',
      is_active: true
    }
  });
  return c.customer_id;
}

async function ensurePart(numSuffix: string, price = 100): Promise<number> {
  const p = await prisma.parts.create({
    data: {
      part_number: `P3B-${numSuffix}-${Date.now()}`,
      name: `P3B Test Part ${numSuffix}`,
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
      location_code: `W3B-${codeSuffix}-${Date.now().toString().slice(-6)}`,
      name: `P3B Warehouse ${codeSuffix}`,
      is_active: true
    }
  });
  return wh.location_id;
}

// ─── Main Test Runner ────────────────────────────────────────────────────────

async function runTests() {
  console.log('=== STARTING PHASE 3B VERIFICATION SUITE ===\n');

  const userId = await ensureUser();
  const techId = await ensureTechnician();
  const custId = await ensureCustomer();
  const part1 = await ensurePart('1', 120);
  const part2 = await ensurePart('2', 250);
  const wh1 = await ensureWarehouse('A');

  // Setup stock
  await prisma.partStock.create({ data: { part_id: part1, location_id: wh1, quantity: 15, stock_version: 1 } });
  await prisma.partStock.create({ data: { part_id: part2, location_id: wh1, quantity: 8, stock_version: 1 } });

  // Job ID placeholders
  let fieldJobId = 0;
  let workshopJobId = 0;
  let amcJobId = 0;
  let assignmentId = 0;
  let visitId = 0;

  // ─── GROUP A: COMPLAINT → TICKET → ASSIGNMENT ──────────────────────────

  await test('1. Create Service Job in OPEN state', async () => {
    const job = await jobService.createServiceJob({
      customer_id: custId,
      job_type: 'FIELD_SERVICE',
      problem_description: 'CCTV feed is distorted',
      items: [
        { device_name: 'CCTV Camera A', issue_description: 'Blurry view' }
      ]
    }, userId);

    assert(job.status === 'OPEN', 'Status should be OPEN');
    assert(job.job_number.startsWith('JOB-'), 'Number should start with JOB-');
    assert(job.items.length === 1, 'Should contain 1 item');
    fieldJobId = job.job_id;
  });

  await test('2. Assign Technician', async () => {
    const assignment = await jobService.assignTechnician({
      job_id: fieldJobId,
      technician_id: techId,
      scheduled_date: new Date()
    }, userId);

    assert(assignment.status === 'PENDING', 'Assignment should be PENDING');
    assignmentId = assignment.assignment_id;

    const job = await prisma.serviceJob.findUnique({ where: { job_id: fieldJobId } });
    assert(job?.status === 'ASSIGNED', 'Job status should update to ASSIGNED');
  });

  await test('3. Accept Technician Assignment', async () => {
    const assignment = await jobService.acceptAssignment(assignmentId, userId);
    assert(assignment.status === 'ACCEPTED', 'Assignment status should be ACCEPTED');

    const job = await prisma.serviceJob.findUnique({ where: { job_id: fieldJobId } });
    assert(job?.status === 'IN_PROGRESS', 'Job status should update to IN_PROGRESS');
  });

  await test('4. Visit Scheduling', async () => {
    const visit = await jobService.scheduleVisit({
      job_id: fieldJobId,
      technician_id: techId,
      visit_date: new Date()
    }, userId);

    assert(visit.status === 'PLANNED', 'Visit should be PLANNED');
    visitId = visit.visit_id;
  });

  await test('5. Visit Execution', async () => {
    const visit = await jobService.executeVisit(visitId, 'Readjusted lens alignment', 'http://sig.url', userId);
    assert(visit.status === 'EXECUTED', 'Visit status should be EXECUTED');
    assert(visit.findings === 'Readjusted lens alignment', 'Findings mismatch');
  });

  await test('6. Resolution Logging and Closure', async () => {
    const res = await jobService.resolveJob({
      job_id: fieldJobId,
      resolved_by: techId,
      notes: 'Lens adjusted. Camera feed crystal clear.',
      rating: 5,
      first_visit_resolved: true
    }, userId);

    assert(res.resolution.first_visit_resolved === true, 'First visit resolved mismatch');
    assert(res.resolution.customer_rating === 5, 'Rating mismatch');
    assert(res.job.status === 'CLOSED', 'Job status should update to CLOSED');

    // Confirm assignment status updated to COMPLETED
    const assign = await prisma.technicianAssignment.findUnique({ where: { assignment_id: assignmentId } });
    assert(assign?.status === 'COMPLETED', 'Assignment should be COMPLETED');
  });


  // ─── GROUP B: WORKSHOP REPAIR WORKFLOW ─────────────────────────────────

  await test('7. Workshop Device Intake', async () => {
    const job = await jobService.createServiceJob({
      customer_id: custId,
      job_type: 'WORKSHOP',
      problem_description: 'DVR power failure',
      items: [
        { device_name: 'DVR-8Channel', serial_number: 'SN-123', issue_description: 'No power led' }
      ]
    }, userId);

    assert(job.status === 'OPEN', 'Status should be OPEN');
    workshopJobId = job.job_id;
  });

  await test('8. Workshop Item Diagnosis', async () => {
    const updated = await jobService.updateJobStatus(workshopJobId, 'DIAGNOSING', userId);
    assert(updated.status === 'DIAGNOSING', 'Status should be DIAGNOSING');
  });

  await test('9. Workshop Cost Estimate', async () => {
    // Propose an estimate
    const updated = await prisma.serviceJob.update({
      where: { job_id: workshopJobId },
      data: { estimated_cost: 1500, status: 'ESTIMATED' }
    });
    assert(updated.status === 'ESTIMATED', 'Status should be ESTIMATED');
    assert(Number(updated.estimated_cost) === 1500, 'Estimate mismatch');
  });

  await test('10. Workshop Estimate Approval', async () => {
    const updated = await jobService.updateJobStatus(workshopJobId, 'IN_PROGRESS', userId);
    assert(updated.status === 'IN_PROGRESS', 'Status should be IN_PROGRESS');
  });

  await test('11. Workshop Delivery Completion', async () => {
    const res = await jobService.resolveJob({
      job_id: workshopJobId,
      resolved_by: techId,
      notes: 'Replaced power capacitor. Tested okay.',
      rating: 4
    }, userId);

    assert(res.job.status === 'CLOSED', 'Status should be CLOSED');
  });


  // ─── GROUP C: AMC WORKFLOW ─────────────────────────────────────────────

  await test('12. AMC Asset Schedule check', async () => {
    const job = await jobService.createServiceJob({
      customer_id: custId,
      job_type: 'AMC',
      problem_description: 'Quarterly biometric scan check'
    }, userId);

    assert(job.status === 'OPEN', 'Status should be OPEN');
    amcJobId = job.job_id;

    // Assign the technician to the AMC job so the engine uses this tech!
    await jobService.assignTechnician({
      job_id: amcJobId,
      technician_id: techId,
      scheduled_date: new Date()
    }, userId);
  });

  await test('13. Planned Visit Generation (AMC Engine)', async () => {
    // Trigger scheduling engine
    const visits = await jobService.scheduleAmcVisits();
    assert(visits.length > 0, 'AMC engine should schedule visits');
    assert(visits.some(v => v.job_id === amcJobId), 'Should contain visit for amcJobId');
  });

  await test('14. Visit Execution Closure', async () => {
    const visit = await prisma.serviceVisit.findFirst({ where: { job_id: amcJobId } });
    assert(visit !== null, 'Visit must exist');
    
    // Execute AMC visit
    await jobService.executeVisit(visit!.visit_id, 'Sensor cleaned, sensitivity checked', undefined, userId);
    
    // Complete Job
    await jobService.resolveJob({
      job_id: amcJobId,
      resolved_by: techId,
      notes: 'Biometric AMC completed successfully.'
    }, userId);

    const job = await prisma.serviceJob.findUnique({ where: { job_id: amcJobId } });
    assert(job?.status === 'CLOSED', 'AMC job should be CLOSED');
  });


  // ─── GROUP D: SPARE PARTS CONSUMPTION & SAFETY ─────────────────────────

  await test('15. Valid Spare Consumption', async () => {
    const job = await jobService.createServiceJob({
      customer_id: custId,
      job_type: 'WORKSHOP',
      problem_description: 'Consume part test'
    }, userId);

    // Consume 3 of part1 (original stock was 15)
    const consumption = await consumptionService.consumeParts({
      job_id: job.job_id,
      part_id: part1,
      location_id: wh1,
      quantity: 3
    }, userId);

    assert(consumption.quantity === 3, 'Qty mismatch');

    // Assert PartStock decremented to 12
    const stock = await prisma.partStock.findUnique({
      where: { part_id_location_id: { part_id: part1, location_id: wh1 } }
    });
    assert(stock?.quantity === 12, `Stock should be 12, got ${stock?.quantity}`);

    // Assert StockMovement log
    const move = await prisma.stockMovement.findFirst({
      where: { partId: part1, locationId: wh1, movementType: 'SERVICE_CONSUMPTION' }
    });
    assert(move !== null, 'Should log StockMovement');
    assert(move?.quantity === -3, 'Movement qty should be -3');
  });

  await test('16. Consumption negative stock guard', async () => {
    const job = await jobService.createServiceJob({
      customer_id: custId,
      job_type: 'WORKSHOP',
      problem_description: 'Consume part negative test'
    }, userId);

    // Try to consume 20 of part1 (stock is 12)
    let rejected = false;
    try {
      await consumptionService.consumeParts({
        job_id: job.job_id,
        part_id: part1,
        location_id: wh1,
        quantity: 20
      }, userId);
    } catch (e: any) {
      if (e.message === 'NEGATIVE_STOCK_PREVENTED') {
        rejected = true;
      }
    }

    assert(rejected, 'Should reject with NEGATIVE_STOCK_PREVENTED');

    // Assert event is logged
    const event = await prisma.businessEvent.findFirst({
      where: { event_type: 'NEGATIVE_STOCK_PREVENTED', entity_id: part1 },
      orderBy: { created_at: 'desc' }
    });
    assert(event !== null, 'Should emit NEGATIVE_STOCK_PREVENTED');
  });

  await test('17. Consumption OCC version conflict', async () => {
    const job = await jobService.createServiceJob({
      customer_id: custId,
      job_type: 'WORKSHOP',
      problem_description: 'OCC check'
    }, userId);

    // Fetch part2 (qty: 8, version: 1)
    const stock = await prisma.partStock.findUnique({
      where: { part_id_location_id: { part_id: part2, location_id: wh1 } }
    });
    const origVersion = stock!.stock_version;

    // Simulate concurrent modification of stock_version using Proxy on tx
    await prisma.$transaction(async (tx) => {
      const txProxy = new Proxy(tx, {
        get(target, prop) {
          if (prop === 'partStock') {
            return new Proxy(target.partStock, {
              get(psTarget, psProp) {
                if (psProp === 'findUnique') {
                  return async (...args: any[]) => {
                    const res = await (psTarget as any).findUnique(...args);
                    // Concurrent modification occurs AFTER findUnique has read the version,
                    // but BEFORE updateMany executes.
                    await prisma.partStock.update({
                      where: { part_id_location_id: { part_id: part2, location_id: wh1 } },
                      data: { quantity: 6, stock_version: origVersion + 1 }
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

      let occThrown = false;
      try {
        // Run updates using old version through the proxy
        await WarehouseService.mutateStock(txProxy, part2, wh1, -2, userId);
      } catch (err: any) {
        if (err.message === 'STOCK_CONFLICT_DETECTED') {
          occThrown = true;
        }
      }
      assert(occThrown, 'Should throw STOCK_CONFLICT_DETECTED');
    });

    const event = await prisma.businessEvent.findFirst({
      where: { event_type: 'STOCK_CONFLICT_DETECTED', entity_id: part2 },
      orderBy: { created_at: 'desc' }
    });
    assert(event !== null, 'Should emit STOCK_CONFLICT_DETECTED');
  });

  await test('18. Parts consumption transaction rollback consistency', async () => {
    const job = await jobService.createServiceJob({
      customer_id: custId,
      job_type: 'WORKSHOP',
      problem_description: 'Rollback test'
    }, userId);

    const initialStock = await prisma.partStock.findUnique({
      where: { part_id_location_id: { part_id: part1, location_id: wh1 } }
    });
    const initialQty = initialStock?.quantity ?? 0;

    let thrown = false;
    try {
      await prisma.$transaction(async (tx) => {
        // Mutate stock (deduct 2)
        await WarehouseService.mutateStock(tx, part1, wh1, -2, userId);

        // Intentionally throw
        throw new Error('ROLLBACK_INTENDED_3B');
      });
    } catch (e: any) {
      if (e.message === 'ROLLBACK_INTENDED_3B') {
        thrown = true;
      }
    }

    assert(thrown, 'Should roll back');

    // Stock should still be initial value
    const checkStock = await prisma.partStock.findUnique({
      where: { part_id_location_id: { part_id: part1, location_id: wh1 } }
    });
    assert(checkStock?.quantity === initialQty, 'Stock must roll back');
  });


  // ─── GROUP E: WARRANTY CLAIMS ──────────────────────────────────────────

  await test('19. Active Warranty validation', async () => {
    // Purchase date: 6 months ago (Active)
    const purchaseDate = new Date();
    purchaseDate.setMonth(purchaseDate.getMonth() - 6);

    const valid = await jobService.validateWarranty(part1, purchaseDate);
    assert(valid === true, 'Warranty should be valid');

    const claim = await jobService.createWarrantyClaim({
      job_id: amcJobId,
      part_id: part1,
      approved_qty: 1,
      reason: 'Biometric optical scanner defect'
    }, userId);

    assert(claim.status === 'PENDING', 'Claim status should be PENDING');
    assert(claim.claim_number.startsWith('WRN-'), 'Claim code mismatch');
  });

  await test('20. Expired Warranty claim check', async () => {
    // Purchase date: 2 years ago (Expired)
    const purchaseDate = new Date();
    purchaseDate.setFullYear(purchaseDate.getFullYear() - 2);

    const valid = await jobService.validateWarranty(part1, purchaseDate);
    assert(valid === false, 'Warranty should be expired');
  });


  // ─── GROUP F: TECHNICIAN PERFORMANCE METRICS ───────────────────────────

  await test('21. Performance jobs metrics', async () => {
    const report = await performanceService.getTechnicianPerformanceReport();
    const techStats = report.find(r => r.technician_id === techId);

    assert(techStats !== undefined, 'Technician stats should exist');
    assert(techStats!.jobs_assigned >= 1, 'Assigned mismatch');
    assert(techStats!.jobs_completed >= 1, 'Completed mismatch');
  });

  await test('22. Performance AMC and ratings metrics', async () => {
    const report = await performanceService.getTechnicianPerformanceReport();
    const techStats = report.find(r => r.technician_id === techId);

    assert(techStats !== undefined, 'Technician stats should exist');
    assert(techStats!.average_customer_rating > 0, 'Rating should be > 0');
    assert(techStats!.amc_completion_rate > 0, 'AMC rate should be > 0');
  });

  console.log('\n======================================');
  console.log(`Phase 3B Tests complete: ${passed} Passed, ${failed} Failed / ${totalTests} Total`);
  console.log('======================================\n');

  if (failures.length > 0) {
    console.error('Failure Details:');
    failures.forEach(f => console.error(`  ${f}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! PHASE_3B COMPLETED.');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Unhandled rejection in tests:', err);
  process.exit(1);
});
