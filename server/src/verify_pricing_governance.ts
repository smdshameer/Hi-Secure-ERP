import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from './index';
import { catalogReviewRouter } from './routes/catalogReview';
import { PricingGovernanceService } from './services/PricingGovernanceService';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_12345';
process.env.JWT_SECRET = JWT_SECRET;

const app = express();
app.use(express.json());

// Set up mock auth request injection for simple testing
app.use((req: any, _res: any, next: any) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as any;
      req.userId = decoded.user_id;
      req.userRole = decoded.role;
    } catch (e) {}
  }
  next();
});

app.use('/api/catalog-review', catalogReviewRouter);

const PORT = 3009;
let serverInstance: any;

async function setupDatabaseSeed() {
  console.log('Seeding database for test...');
  
  // Clean up any test records
  await prisma.supplierPriceChange.deleteMany({});
  await prisma.importApprovalHistory.deleteMany({});
  await prisma.catalogPreviewItem.deleteMany({});
  await prisma.catalogImportSession.deleteMany({});
  
  const existingTestParts = await prisma.parts.findMany({
    where: { part_number: { in: ['TEST-PART-1', 'TEST-PART-2'] } }
  });
  for (const part of existingTestParts) {
    await prisma.parts.delete({ where: { part_id: part.part_id } });
  }

  // Create test user and permissions
  const user = await prisma.user.upsert({
    where: { user_id: 1 },
    update: {},
    create: {
      user_id: 1,
      username: 'testadmin',
      password_hash: 'mocked',
      role: 'admin',
      email: 'testadmin@example.com',
      full_name: 'Test Admin'
    }
  });

  const permission = await prisma.permission.upsert({
    where: { name: 'purchase:create' },
    update: {},
    create: {
      name: 'purchase:create',
      description: 'Allows purchases'
    }
  });

  const role = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Admin'
    }
  });

  await prisma.rolePermission.upsert({
    where: {
      role_id_permission_id: {
        role_id: role.role_id,
        permission_id: permission.permission_id
      }
    },
    update: {},
    create: {
      role_id: role.role_id,
      permission_id: permission.permission_id
    }
  });

  await prisma.userRole.upsert({
    where: {
      user_id_role_id: {
        user_id: user.user_id,
        role_id: role.role_id
      }
    },
    update: {},
    create: {
      user_id: user.user_id,
      role_id: role.role_id
    }
  });

  // Create baseline parts
  const part1 = await prisma.parts.create({
    data: {
      part_number: 'TEST-PART-1',
      name: 'Test Part 1',
      cost_price: 100.00,
      selling_price: 200.00,
      tax_rate: 18.00
    }
  });

  const part2 = await prisma.parts.create({
    data: {
      part_number: 'TEST-PART-2',
      name: 'Test Part 2',
      cost_price: 100.00,
      selling_price: 200.00,
      tax_rate: 18.00
    }
  });

  // Ensure test supplier exists
  let supplier = await prisma.supplier.findFirst({
    where: { supplier_code: 'TEST-SUPPLIER-1' }
  });
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        supplier_code: 'TEST-SUPPLIER-1',
        name: 'Test Supplier'
      }
    });
  }

  // Reset threshold settings to default 15% and 30%
  await prisma.setting.upsert({
    where: { key: 'catalog_import_settings' },
    update: { value: { PRICE_RISK_NORMAL_MAX_PERCENT: 15, PRICE_RISK_MODERATE_MAX_PERCENT: 30 } },
    create: { key: 'catalog_import_settings', value: { PRICE_RISK_NORMAL_MAX_PERCENT: 15, PRICE_RISK_MODERATE_MAX_PERCENT: 30 } }
  });

  console.log('Database seeded successfully.');
  return { part1, part2, supplierId: supplier.supplier_id };
}

async function runTests() {
  const { part1, part2, supplierId } = await setupDatabaseSeed();
  
  const token = jwt.sign({ user_id: 1, role: 'admin' }, JWT_SECRET);
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Start temporary Express server
  serverInstance = app.listen(PORT, () => {
    console.log(`Test Express server listening on port ${PORT}`);
  });

  const baseUrl = `http://localhost:${PORT}/api/catalog-review`;

  // Create session and items
  console.log('Creating catalog import session...');
  const session = await prisma.catalogImportSession.create({
    data: {
      supplier_id: supplierId,
      uploaded_by: 1,
      file_name: 'test_catalog.pdf',
      page_count: 1,
      total_products: 2,
      valid_products: 2,
      duplicate_products: 0,
      rejected_products: 0,
      status: 'APPROVED',
      validation_status: 'PASSED',
      version: 1
    }
  });
  const sessionId = session.session_id;

  // Add items matching part1 and part2
  // Item 1: 50% cost price increase (100 -> 150) -> HIGH_RISK
  const item1 = await prisma.catalogPreviewItem.create({
    data: {
      session_id: sessionId,
      temporary_item_id: 'temp-1',
      brand: 'Hikvision',
      model: 'Model-1',
      part_number: 'TEST-PART-1',
      name: 'Test Part 1 New Name',
      cost_price: 150.00,
      selling_price: 220.00,
      tax_rate: 18.00,
      status: 'MERGED',
      decision: 'MERGE',
      is_duplicate: true,
      matched_part_id: part1.part_id,
      confidence: 'HIGH'
    }
  });

  // Item 2: 10% cost price increase (100 -> 110) -> NORMAL risk
  const item2 = await prisma.catalogPreviewItem.create({
    data: {
      session_id: sessionId,
      temporary_item_id: 'temp-2',
      brand: 'Hikvision',
      model: 'Model-2',
      part_number: 'TEST-PART-2',
      name: 'Test Part 2 Name',
      cost_price: 110.00,
      selling_price: 210.00,
      tax_rate: 18.00,
      status: 'MERGED',
      decision: 'MERGE',
      is_duplicate: true,
      matched_part_id: part2.part_id,
      confidence: 'HIGH'
    }
  });

  // --- Test Case 1: Evaluate & Review ---
  console.log('\n--- Test Case 1: Fetching price review ---');
  let res = await fetch(`${baseUrl}/session/${sessionId}/price-review`, {
    method: 'POST',
    headers
  });
  let data: any = await res.json();
  if (res.status !== 200) {
    throw new Error(`Price review failed: ${JSON.stringify(data)}`);
  }
  console.log('Price Review Response:', JSON.stringify(data, null, 2));

  // Verify Risk Categorizations
  const item1Change = data.priceChanges.find((pc: any) => pc.preview_item_id === item1.id);
  const item2Change = data.priceChanges.find((pc: any) => pc.preview_item_id === item2.id);

  if (item1Change.risk_classification !== 'HIGH_RISK') {
    throw new Error(`Expected item 1 to be HIGH_RISK, got ${item1Change.risk_classification}`);
  }
  if (item2Change.risk_classification !== 'NORMAL') {
    throw new Error(`Expected item 2 to be NORMAL, got ${item2Change.risk_classification}`);
  }
  console.log('PASSED: Correct risk classifications.');

  // --- Test Case 2: Import rejection before approval ---
  console.log('\n--- Test Case 2: Trying to import session before price changes approval ---');
  res = await fetch(`${baseUrl}/session/${sessionId}/import`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      version: 1,
      approvedCount: 0,
      rejectedCount: 0,
      mergedCount: 2,
      pendingCount: 0
    })
  });
  data = await res.json();
  if (res.status !== 400 || data.code !== 'PRICE_APPROVAL_REQUIRED') {
    throw new Error(`Expected import to block with PRICE_APPROVAL_REQUIRED, got status ${res.status}: ${JSON.stringify(data)}`);
  }
  console.log('PASSED: Import blocked due to unapproved HIGH_RISK price changes.');

  // --- Test Case 3: Approve price changes (ALL mode) ---
  console.log('\n--- Test Case 3: Approving all price changes ---');
  res = await fetch(`${baseUrl}/session/${sessionId}/approve-price-changes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      version: 1,
      mode: 'ALL'
    })
  });
  data = await res.json();
  if (res.status !== 200 || !data.success) {
    throw new Error(`Approve price changes failed: ${JSON.stringify(data)}`);
  }
  console.log('Price change approval result:', JSON.stringify(data, null, 2));
  if (data.approvedCount !== 2) {
    throw new Error(`Expected 2 approved price changes, got ${data.approvedCount}`);
  }
  console.log('PASSED: Approved all price changes.');

  // Get current session version (should have incremented to 2)
  let dbSession = await prisma.catalogImportSession.findUnique({ where: { session_id: sessionId } });
  let currentVersion = dbSession!.version;
  console.log('Current session version:', currentVersion);

  // --- Test Case 4: Fingerprint tampering detection ---
  console.log('\n--- Test Case 4: Tampering with approved price change fingerprint ---');
  const approvedPC = await prisma.supplierPriceChange.findFirst({
    where: { session_id: sessionId, approval_status: 'APPROVED' }
  });
  
  // Modify the old_cost_price in database without recalculating fingerprint
  await prisma.supplierPriceChange.update({
    where: { id: approvedPC!.id },
    data: { old_cost_price: 90.00 }
  });

  res = await fetch(`${baseUrl}/session/${sessionId}/import`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      version: currentVersion,
      approvedCount: 0,
      rejectedCount: 0,
      mergedCount: 2,
      pendingCount: 0
    })
  });
  data = await res.json();
  if (res.status !== 400 || data.code !== 'PRICE_APPROVAL_INVALIDATED') {
    throw new Error(`Expected import to block with PRICE_APPROVAL_INVALIDATED, got status ${res.status}: ${JSON.stringify(data)}`);
  }
  console.log('PASSED: Tampered fingerprint detected and invalidated.');

  // Check that the tampered price change status reverted to PENDING
  const revertedPC = await prisma.supplierPriceChange.findUnique({
    where: { id: approvedPC!.id }
  });
  if (revertedPC!.approval_status !== 'PENDING') {
    throw new Error(`Expected status to revert to PENDING, got ${revertedPC!.approval_status}`);
  }
  console.log('PASSED: Price change status reverted to PENDING.');

  // Re-approve the price change
  dbSession = await prisma.catalogImportSession.findUnique({ where: { session_id: sessionId } });
  currentVersion = dbSession!.version;
  
  // Restore correct database state first
  await prisma.supplierPriceChange.update({
    where: { id: approvedPC!.id },
    data: { old_cost_price: 100.00 }
  });

  console.log('Re-approving price changes...');
  res = await fetch(`${baseUrl}/session/${sessionId}/approve-price-changes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      version: currentVersion,
      mode: 'ALL'
    })
  });
  data = await res.json();
  dbSession = await prisma.catalogImportSession.findUnique({ where: { session_id: sessionId } });
  currentVersion = dbSession!.version;

  // --- Test Case 5: Threshold Drift Detection ---
  console.log('\n--- Test Case 5: Changing thresholds to trigger threshold drift detection ---');
  // Lower normal threshold to 5.
  await prisma.setting.update({
    where: { key: 'catalog_import_settings' },
    data: { value: { PRICE_RISK_NORMAL_MAX_PERCENT: 5, PRICE_RISK_MODERATE_MAX_PERCENT: 30 } }
  });

  res = await fetch(`${baseUrl}/session/${sessionId}/import`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      version: currentVersion,
      approvedCount: 0,
      rejectedCount: 0,
      mergedCount: 2,
      pendingCount: 0
    })
  });
  data = await res.json();
  if (res.status !== 400 || data.code !== 'PRICE_APPROVAL_REVALIDATION_REQUIRED') {
    throw new Error(`Expected import to block with PRICE_APPROVAL_REVALIDATION_REQUIRED, got status ${res.status}: ${JSON.stringify(data)}`);
  }
  console.log('PASSED: Threshold drift successfully blocked import.');

  // Restore thresholds
  await prisma.setting.update({
    where: { key: 'catalog_import_settings' },
    data: { value: { PRICE_RISK_NORMAL_MAX_PERCENT: 15, PRICE_RISK_MODERATE_MAX_PERCENT: 30 } }
  });

  // No re-approval needed as only high-risk changes require approval to import, and normal changes can remain pending.

  // --- Test Case 6: Successful Import, Validation, and Rollback ---
  console.log('\n--- Test Case 6: Performing import ---');
  res = await fetch(`${baseUrl}/session/${sessionId}/import`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      version: currentVersion,
      approvedCount: 0,
      rejectedCount: 0,
      mergedCount: 2,
      pendingCount: 0
    })
  });
  data = await res.json();
  if (res.status !== 200 || data.status !== 'IMPORTED') {
    throw new Error(`Import failed: ${JSON.stringify(data)}`);
  }
  console.log('Import response:', JSON.stringify(data, null, 2));
  console.log('PASSED: Catalog import completed successfully.');

  dbSession = await prisma.catalogImportSession.findUnique({ where: { session_id: sessionId } });
  currentVersion = dbSession!.version;

  // Check database parts: part1 should be updated (cost_price from 100 -> 150), part2 should be updated (cost_price 100 -> 110)
  const dbPart1 = await prisma.parts.findUnique({ where: { part_id: part1.part_id } });
  const dbPart2 = await prisma.parts.findUnique({ where: { part_id: part2.part_id } });

  console.log(`Part 1 cost price in DB: ${dbPart1!.cost_price} (expected: 150)`);
  console.log(`Part 2 cost price in DB: ${dbPart2!.cost_price} (expected: 110)`);
  if (Number(dbPart1!.cost_price) !== 150 || Number(dbPart2!.cost_price) !== 110) {
    throw new Error('Database parts cost prices were not correctly imported/updated!');
  }
  console.log('PASSED: DB parts updated correctly during import.');

  // Verify ImportApprovalHistory contains 'IMPORT'
  const importHistory = await prisma.importApprovalHistory.findFirst({
    where: { session_id: sessionId, action: 'IMPORT' }
  });
  if (!importHistory) {
    throw new Error('Import approval history record was not created for IMPORT action!');
  }
  console.log('PASSED: Import approval history recorded:', JSON.stringify(importHistory));

  // --- Validate Rollback ---
  console.log('\n--- Test Case 7: Validating rollback ---');
  res = await fetch(`${baseUrl}/session/${sessionId}/validate-rollback`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      version: currentVersion
    })
  });
  data = await res.json();
  if (res.status !== 200 || !data.canRollback) {
    throw new Error(`Rollback validation failed: ${JSON.stringify(data)}`);
  }
  console.log('Rollback validation response:', JSON.stringify(data, null, 2));
  console.log('PASSED: Rollback validation succeeded.');

  // --- Execute Rollback ---
  console.log('\n--- Test Case 8: Executing rollback ---');
  res = await fetch(`${baseUrl}/session/${sessionId}/rollback`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      version: currentVersion
    })
  });
  data = await res.json();
  if (res.status !== 200 || data.status !== 'ROLLBACK_COMPLETED') {
    throw new Error(`Rollback failed: ${JSON.stringify(data)}`);
  }
  console.log('Rollback response:', JSON.stringify(data, null, 2));
  console.log('PASSED: Rollback execution completed.');

  // Verify parts are reverted back to 100.00
  const dbPart1PostRollback = await prisma.parts.findUnique({ where: { part_id: part1.part_id } });
  const dbPart2PostRollback = await prisma.parts.findUnique({ where: { part_id: part2.part_id } });
  console.log(`Part 1 cost price post-rollback: ${dbPart1PostRollback!.cost_price} (expected: 100)`);
  console.log(`Part 2 cost price post-rollback: ${dbPart2PostRollback!.cost_price} (expected: 100)`);
  if (Number(dbPart1PostRollback!.cost_price) !== 100 || Number(dbPart2PostRollback!.cost_price) !== 100) {
    throw new Error('Database parts were not reverted correctly on rollback!');
  }
  console.log('PASSED: DB parts reverted successfully.');

  // Verify final session status is ROLLBACK_COMPLETED
  const finalSession = await prisma.catalogImportSession.findUnique({ where: { session_id: sessionId } });
  if (finalSession!.status !== 'ROLLBACK_COMPLETED') {
    throw new Error(`Expected session status to be ROLLBACK_COMPLETED, got ${finalSession!.status}`);
  }
  console.log('PASSED: Session status updated to ROLLBACK_COMPLETED.');

  console.log('\n====================================');
  console.log('ALL PRICING GOVERNANCE TESTS PASSED!');
  console.log('====================================');
}

runTests()
  .catch((err) => {
    console.error('Test run failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    if (serverInstance) {
      serverInstance.close();
    }
    await prisma.$disconnect();
    process.exit(0);
  });
