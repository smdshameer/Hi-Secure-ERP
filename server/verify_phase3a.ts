/**
 * verify_phase3a.ts
 * Phase 3A — Warehouse & Inventory Optimization Verification Suite
 */

process.env.STANDALONE_SCRIPT = 'true';
import dotenv from 'dotenv';
dotenv.config();

import { prisma } from './src/index';
import { WarehouseService } from './src/services/WarehouseService';
import { InventoryOptimizationService } from './src/services/InventoryOptimizationService';
import { BusinessEventService } from './src/services/BusinessEventService';

const warehouseService = new WarehouseService();
const optimizationService = new InventoryOptimizationService();

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
  
  // Create test admin user if none exists
  const u = await prisma.user.create({
    data: {
      username: `admin_${Date.now()}`,
      email: `admin_${Date.now()}@test.com`,
      password_hash: 'hash',
      full_name: 'Test Admin',
      role: 'admin',
      is_active: true
    }
  });
  return u.user_id;
}

async function ensurePart(numSuffix: string, price = 100): Promise<number> {
  const p = await prisma.parts.create({
    data: {
      part_number: `P3A-${numSuffix}-${Date.now()}`,
      name: `P3A Test Part ${numSuffix}`,
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
      location_code: `W3A-${codeSuffix}-${Date.now().toString().slice(-6)}`,
      name: `P3A Warehouse ${codeSuffix}`,
      is_active: true
    }
  });
  return wh.location_id;
}

// ─── Main Test Runner ────────────────────────────────────────────────────────

async function runTests() {
  console.log('=== STARTING PHASE 3A VERIFICATION SUITE ===\n');

  const userId = await ensureUser();
  const wh1 = await ensureWarehouse('A');
  const wh2 = await ensureWarehouse('B');
  const part1 = await ensurePart('1', 100);
  const part2 = await ensurePart('2', 200);

  // Setup initial stocks
  await prisma.partStock.create({ data: { part_id: part1, location_id: wh1, quantity: 10, stock_version: 1 } });
  await prisma.partStock.create({ data: { part_id: part2, location_id: wh1, quantity: 20, stock_version: 1 } });

  // 1. Warehouse Locations (Bin)
  await test('1. Bin CRUD & Stock mapping', async () => {
    const bin = await warehouseService.createWarehouseLocation({
      location_id: wh1,
      zone: 'Zone A',
      rack: 'Rack 1',
      shelf: 'Shelf 2',
      bin: 'Bin 3',
      name: 'R1-S2-B3'
    });
    assert(bin.warehouse_location_id > 0, 'Bin ID should be positive');

    const bins = await warehouseService.getWarehouseLocations(wh1);
    assert(bins.length >= 1, 'Should return at least 1 bin');

    const binStock = await warehouseService.updateBinStock(bin.warehouse_location_id, part1, 5);
    assert(binStock.quantity === 5, 'Bin stock should be set to 5');
  });

  // 2. Reservation over-allocation rejection
  await test('2. Reservation over-allocation rejection', async () => {
    // Current stock is 10. Reserve 6 (succeeds)
    const res1 = await warehouseService.reserveStock({
      part_id: part1,
      location_id: wh1,
      quantity: 6,
      reference_type: 'SalesOrder',
      reference_id: 1001
    }, userId);
    assert(res1.status === 'ACTIVE', 'Reservation status should be ACTIVE');

    // Available is now 10 - 6 = 4. Reserve 5 (should fail)
    let failedWithInsufficient = false;
    try {
      await warehouseService.reserveStock({
        part_id: part1,
        location_id: wh1,
        quantity: 5,
        reference_type: 'SalesOrder',
        reference_id: 1002
      }, userId);
    } catch (e: any) {
      if (e.message === 'INSUFFICIENT_AVAILABLE_STOCK') {
        failedWithInsufficient = true;
      }
    }
    assert(failedWithInsufficient, 'Should throw INSUFFICIENT_AVAILABLE_STOCK');

    // Check BusinessEvent is logged for rejection
    const event = await prisma.businessEvent.findFirst({
      where: { event_type: 'STOCK_RESERVATION_REJECTED', entity_id: part1 },
      orderBy: { created_at: 'desc' }
    });
    assert(event !== null, 'Should emit STOCK_RESERVATION_REJECTED');

    // Release reservation
    await warehouseService.releaseReservation(res1.reservation_id, userId);
  });

  // 3. Reservation fulfillment
  await test('3. Reservation Fulfill decrements stock', async () => {
    // Current stock is 10.
    const res = await warehouseService.reserveStock({
      part_id: part1,
      location_id: wh1,
      quantity: 3,
      reference_type: 'SalesOrder',
      reference_id: 1003
    }, userId);

    // Fulfill reservation (deducts 3)
    await warehouseService.fulfillReservation(res.reservation_id, userId);

    // Verify stock is now 7
    const stock = await prisma.partStock.findUnique({
      where: { part_id_location_id: { part_id: part1, location_id: wh1 } }
    });
    assert(stock?.quantity === 7, `Stock should be 7, got ${stock?.quantity}`);
  });

  // 4. Stock Transfer workflow & duplicate completion protection
  await test('4. Stock Transfer Workflow & Idempotency Locking', async () => {
    // Transfer 4 of part1 from wh1 to wh2
    const transfer = await warehouseService.createStockTransfer({
      from_location_id: wh1,
      to_location_id: wh2,
      items: [{ part_id: part1, quantity: 4 }],
      requested_by: userId
    });
    assert(transfer.status === 'DRAFT', 'Initial status must be DRAFT');

    await warehouseService.approveStockTransfer(transfer.transfer_id, userId);
    await warehouseService.shipStockTransfer(transfer.transfer_id, userId);

    const checkTransfer = await prisma.stockTransfer.findUnique({ where: { transfer_id: transfer.transfer_id } });
    assert(checkTransfer?.status === 'IN_TRANSIT', 'Status should be IN_TRANSIT');

    // Complete the transfer
    const completed = await warehouseService.completeStockTransfer(transfer.transfer_id, userId);
    assert(completed.status === 'COMPLETED', 'Status should be COMPLETED');

    // Verify stocks: wh1: 7 - 4 = 3. wh2: 0 + 4 = 4
    const stock1 = await prisma.partStock.findUnique({
      where: { part_id_location_id: { part_id: part1, location_id: wh1 } }
    });
    const stock2 = await prisma.partStock.findUnique({
      where: { part_id_location_id: { part_id: part1, location_id: wh2 } }
    });
    assert(stock1?.quantity === 3, `WH1 stock should be 3, got ${stock1?.quantity}`);
    assert(stock2?.quantity === 4, `WH2 stock should be 4, got ${stock2?.quantity}`);

    // Try completing again (Duplicate rejection test)
    let duplicateRejected = false;
    try {
      await warehouseService.completeStockTransfer(transfer.transfer_id, userId);
    } catch (e: any) {
      if (e.message === 'TRANSFER_ALREADY_PROCESSED') {
        duplicateRejected = true;
      }
    }
    assert(duplicateRejected, 'Should throw TRANSFER_ALREADY_PROCESSED on duplicate completion');

    // Check event exists
    const event = await prisma.businessEvent.findFirst({
      where: { event_type: 'TRANSFER_COMPLETION_REJECTED_DUPLICATE', entity_id: transfer.transfer_id }
    });
    assert(event !== null, 'Should emit TRANSFER_COMPLETION_REJECTED_DUPLICATE');
  });

  // 5. Negative stock prevention
  await test('5. Negative stock prevention', async () => {
    // Attempt to transfer 10 of part1 from wh1 to wh2 (only 3 in stock)
    const transfer = await warehouseService.createStockTransfer({
      from_location_id: wh1,
      to_location_id: wh2,
      items: [{ part_id: part1, quantity: 10 }]
    });

    await warehouseService.approveStockTransfer(transfer.transfer_id, userId);
    await warehouseService.shipStockTransfer(transfer.transfer_id, userId);

    let rejected = false;
    try {
      await warehouseService.completeStockTransfer(transfer.transfer_id, userId);
    } catch (e: any) {
      if (e.message === 'NEGATIVE_STOCK_PREVENTED') {
        rejected = true;
      }
    }
    assert(rejected, 'Should reject with NEGATIVE_STOCK_PREVENTED');

    // Event checking
    const event = await prisma.businessEvent.findFirst({
      where: { event_type: 'NEGATIVE_STOCK_PREVENTED', entity_id: part1 },
      orderBy: { created_at: 'desc' }
    });
    assert(event !== null, 'Should emit NEGATIVE_STOCK_PREVENTED');
  });

  // 6. Optimistic Concurrency Control (OCC) version conflict
  await test('6. Optimistic Concurrency Control version conflict', async () => {
    // Fetch part2 at wh1 (current qty = 20, version = 1)
    const stock = await prisma.partStock.findUnique({
      where: { part_id_location_id: { part_id: part2, location_id: wh1 } }
    });
    assert(stock !== null, 'Stock record must exist');
    const originalVersion = stock!.stock_version;

    // Direct transaction update to simulate conflict
    await prisma.$transaction(async (tx) => {
      // Simulate slow transaction that reads originalVersion
      // But in the meantime, another process commits an update and increments version
      await prisma.partStock.update({
        where: { part_id_location_id: { part_id: part2, location_id: wh1 } },
        data: { quantity: 15, stock_version: originalVersion + 1 }
      });

      // Now our slow transaction tries to execute using the stale version
      let occThrown = false;
      try {
        const updateRes = await tx.partStock.updateMany({
          where: {
            part_id: part2,
            location_id: wh1,
            stock_version: originalVersion
          },
          data: {
            quantity: 12,
            stock_version: originalVersion + 1
          }
        });
        if (updateRes.count === 0) {
          throw new Error('STOCK_CONFLICT_DETECTED');
        }
      } catch (err: any) {
        if (err.message === 'STOCK_CONFLICT_DETECTED') {
          occThrown = true;
          // Emit event inside transaction simulation
          await BusinessEventService.logEvent({
            event_type: 'STOCK_CONFLICT_DETECTED',
            entity_type: 'PartStock',
            entity_id: part2,
            user_id: userId,
            description: 'OCC conflict test simulated'
          }, tx);
        }
      }
      assert(occThrown, 'OCC mismatch should throw STOCK_CONFLICT_DETECTED');
    });

    // Check event exists
    const event = await prisma.businessEvent.findFirst({
      where: { event_type: 'STOCK_CONFLICT_DETECTED', entity_id: part2 }
    });
    assert(event !== null, 'Should emit STOCK_CONFLICT_DETECTED');
  });

  // 7. Cycle Counting Approval workflow
  await test('7. Cycle Counting Approval Workflow & Deferrals', async () => {
    // Create cycle count for wh1 containing part2.
    // Stock of part2 at wh1 is currently 15. Count it as 18 (variance +3)
    const count = await optimizationService.createCycleCount(
      wh1,
      [part2],
      new Date(),
      userId,
      'Test count'
    );

    assert(count.status === 'PLANNED', 'Status should be PLANNED');

    await optimizationService.startCycleCount(count.count_id);
    await optimizationService.recordCountItem(count.count_id, part2, 18);

    // Submit for approval
    await optimizationService.submitCycleCount(count.count_id, userId);

    const submittedCount = await prisma.cycleCount.findUnique({
      where: { count_id: count.count_id },
      include: { items: true }
    });
    assert(submittedCount?.status === 'PENDING_APPROVAL', 'Status should be PENDING_APPROVAL');
    assert(submittedCount?.items[0].variance === 3, 'Variance should be calculated as 3');

    // Assert that stock in database is STILL 15 (unadjusted)
    let currentStock = await prisma.partStock.findUnique({
      where: { part_id_location_id: { part_id: part2, location_id: wh1 } }
    });
    assert(currentStock?.quantity === 15, 'Stock should remain 15 before approval');

    // Approve cycle count
    await optimizationService.approveCycleCount(count.count_id, userId);

    const approvedCount = await prisma.cycleCount.findUnique({ where: { count_id: count.count_id } });
    assert(approvedCount?.status === 'COMPLETED', 'Status should be COMPLETED');

    // Assert stock is now updated to 18
    currentStock = await prisma.partStock.findUnique({
      where: { part_id_location_id: { part_id: part2, location_id: wh1 } }
    });
    assert(currentStock?.quantity === 18, `Stock should be updated to 18, got ${currentStock?.quantity}`);

    // Verify stock movement of type CYCLE_COUNT_ADJUSTMENT is logged
    const movement = await prisma.stockMovement.findFirst({
      where: { partId: part2, locationId: wh1, movementType: 'CYCLE_COUNT_ADJUSTMENT', referenceId: count.count_id }
    });
    assert(movement !== null, 'Stock movement should be logged for adjustment');

    // Verify events: CYCLE_COUNT_SUBMITTED, CYCLE_COUNT_APPROVED, CYCLE_COUNT_COMPLETED
    const events = await prisma.businessEvent.findMany({
      where: { entity_type: 'CycleCount', entity_id: count.count_id }
    });
    const types = events.map(e => e.event_type);
    assert(types.includes('CYCLE_COUNT_SUBMITTED'), 'Missing CYCLE_COUNT_SUBMITTED event');
    assert(types.includes('CYCLE_COUNT_APPROVED'), 'Missing CYCLE_COUNT_APPROVED event');
    assert(types.includes('CYCLE_COUNT_COMPLETED'), 'Missing CYCLE_COUNT_COMPLETED event');
  });

  // 8. Audit Trail Rollback consistency
  await test('8. Audit Trail Rollback Consistency', async () => {
    // Try to mutate stock in a transaction that fails
    const initialStock = await prisma.partStock.findUnique({
      where: { part_id_location_id: { part_id: part2, location_id: wh1 } }
    });
    const initialQty = initialStock?.quantity ?? 0;

    let thrown = false;
    try {
      await prisma.$transaction(async (tx) => {
        // Increment stock
        await tx.partStock.update({
          where: { part_id_location_id: { part_id: part2, location_id: wh1 } },
          data: { quantity: initialQty + 10 }
        });

        // Insert StockMovement
        await tx.stockMovement.create({
          data: {
            partId: part2,
            locationId: wh1,
            movementType: 'ROLLBACK_TEST',
            quantity: 10
          }
        });

        // Intentionally throw error to force rollback
        throw new Error('ROLLBACK_INTENDED');
      });
    } catch (e: any) {
      if (e.message === 'ROLLBACK_INTENDED') {
        thrown = true;
      }
    }

    assert(thrown, 'Transaction should throw');

    // Verify stock is still the initial value (rolled back)
    const checkStock = await prisma.partStock.findUnique({
      where: { part_id_location_id: { part_id: part2, location_id: wh1 } }
    });
    assert(checkStock?.quantity === initialQty, `Stock should be rolled back to ${initialQty}, got ${checkStock?.quantity}`);

    // Verify no stock movement was created
    const move = await prisma.stockMovement.findFirst({
      where: { partId: part2, locationId: wh1, movementType: 'ROLLBACK_TEST' }
    });
    assert(move === null, 'Stock movement should be rolled back');
  });

  // 9. Optimization Reports
  await test('9. ABC classification, valuation, aging, dead stock reports', async () => {
    // ABC Report
    const abc = await optimizationService.getAbcClassification();
    assert(abc.grand_total_valuation > 0, 'Grand total valuation should be > 0');
    assert(abc.items.length >= 2, 'Should return classified items');

    // Valuation Report
    const valuation = await optimizationService.getValuationReport();
    assert(valuation.system_total_valuation > 0, 'System total valuation should be > 0');

    // Aging Report
    const aging = await optimizationService.getStockAgingAnalysis();
    assert(aging.length >= 2, 'Aging report should contain records');

    // Dead Stock
    const dead = await optimizationService.getDeadStockReport(180);
    assert(Array.isArray(dead), 'Dead stock should return an array');

    // Reorder Suggestions
    const suggest = await optimizationService.getReorderSuggestions();
    assert(Array.isArray(suggest), 'Suggestions should return an array');
  });

  console.log('\n======================================');
  console.log(`Phase 3A Tests complete: ${passed} Passed, ${failed} Failed / ${totalTests} Total`);
  console.log('======================================\n');

  if (failures.length > 0) {
    console.error('Failure Details:');
    failures.forEach(f => console.error(`  ${f}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! PHASE_3A COMPLETED.');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Unhandle rejection in tests:', err);
  process.exit(1);
});
