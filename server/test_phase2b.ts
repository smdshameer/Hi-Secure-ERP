// Standalone test script for Phase 2B & 2B.1 Verification
process.env.STANDALONE_SCRIPT = 'true';
process.env.NODE_ENV = 'test';

import path from 'path';
import dotenv from 'dotenv';
// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

import app, { prisma } from './src/index';
import jwt from 'jsonwebtoken';
import { generateCanonicalChecksum, verifyCanonicalChecksum } from './src/utils/canonicalChecksum';

const PORT = 3005;
const BASE_URL = `http://localhost:${PORT}/api/catalog-review`;

async function runTests() {
  console.log('==================================================');
  console.log('=== STARTING PHASE 2B.1 WORKFLOW VERIFICATION ===');
  console.log('==================================================\n');

  // Start test HTTP server
  const server = app.listen(PORT, async () => {
    console.log(`[Test Server] Listening on port ${PORT}`);
    try {
      await executeTestSuite();
    } catch (err: any) {
      console.error('❌ Test suite failed with error:', err.message);
      process.exit(1);
    } finally {
      server.close(() => {
        console.log('[Test Server] Server stopped.');
        process.exit(0);
      });
    }
  });
}

async function executeTestSuite() {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is missing from environmental variables.');
  }

  // Pre-test cleanup to guarantee atomicity and reproducibility
  await prisma.parts.deleteMany({
    where: {
      part_number: { in: ['DS-2CD101-TEST', 'DH-IPC-102-EXISTING'] }
    }
  });

  // Generate Admin JWT token
  const token = jwt.sign({ user_id: 1, role: 'admin' }, JWT_SECRET);
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Seed test supplier if none exists
  let supplier = await prisma.supplier.findFirst();
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        supplier_code: 'SUP-TEST-99',
        name: 'Test Supplier 99'
      }
    });
  }

  // Seed user roles/permissions to ensure user 1 has 'purchase:create'
  const user = await prisma.user.findUnique({ where: { user_id: 1 } });
  if (!user) {
    await prisma.user.create({
      data: {
        user_id: 1,
        username: 'admin_test',
        email: 'admin_test@example.com',
        password_hash: 'hash',
        full_name: 'Admin Test',
        role: 'admin'
      }
    });
  }

  // Ensure role 'admin' has permission 'purchase:create'
  let role = await prisma.role.findUnique({ where: { name: 'admin' } });
  if (!role) {
    role = await prisma.role.create({
      data: {
        name: 'admin',
        description: 'Admin role'
      }
    });
  }

  let permission = await prisma.permission.findUnique({ where: { name: 'purchase:create' } });
  if (!permission) {
    permission = await prisma.permission.create({
      data: {
        name: 'purchase:create',
        description: 'Create purchases'
      }
    });
  }

  const rolePerm = await prisma.rolePermission.findFirst({
    where: { role_id: role.role_id, permission_id: permission.permission_id }
  });
  if (!rolePerm) {
    await prisma.rolePermission.create({
      data: {
        role_id: role.role_id,
        permission_id: permission.permission_id
      }
    });
  }

  const userRole = await prisma.userRole.findFirst({
    where: { user_id: 1, role_id: role.role_id }
  });
  if (!userRole) {
    await prisma.userRole.create({
      data: {
        user_id: 1,
        role_id: role.role_id
      }
    });
  }

  // Ensure default parts are available for duplicate/merge check
  let existingPart = await prisma.parts.findUnique({ where: { part_number: 'DH-IPC-102-EXISTING' } });
  if (!existingPart) {
    existingPart = await prisma.parts.create({
      data: {
        part_number: 'DH-IPC-102-EXISTING',
        name: 'Existing Dome Camera',
        cost_price: 2400,
        selling_price: 3000,
        tax_rate: 18,
        is_active: true
      }
    });
  }

  console.log('--- Seeding Import Session & Preview Items ---');
  const session = await prisma.catalogImportSession.create({
    data: {
      supplier_id: supplier.supplier_id,
      uploaded_by: 1,
      file_name: 'test_catalog_2b.pdf',
      page_count: 2,
      total_products: 3,
      valid_products: 1,
      duplicate_products: 1,
      rejected_products: 1,
      status: 'REVIEW_PENDING',
      version: 1
    }
  });

  const previewItem1 = await prisma.catalogPreviewItem.create({
    data: {
      session_id: session.session_id,
      temporary_item_id: 'TMP-000001',
      brand: 'Hikvision',
      model: 'DS-2CD101-TEST',
      part_number: 'DS-2CD101-TEST',
      name: 'Bullet Test Camera',
      cost_price: 1500,
      selling_price: 2000,
      tax_rate: 18,
      confidence: 'HIGH',
      status: 'REVIEW_PENDING',
      is_duplicate: false,
      warnings: [],
      raw_source_text: 'Hikvision DS-2CD101-TEST dealer 1500 MRP 2000',
      version: 1
    }
  });

  const previewItem2 = await prisma.catalogPreviewItem.create({
    data: {
      session_id: session.session_id,
      temporary_item_id: 'TMP-000002',
      brand: 'Dahua',
      model: 'DH-IPC-102-EXISTING',
      part_number: 'DH-IPC-102-EXISTING',
      name: 'Dome Test Camera',
      cost_price: 2500,
      selling_price: 3200,
      tax_rate: 18,
      confidence: 'HIGH',
      status: 'REVIEW_PENDING',
      is_duplicate: true,
      matched_part_id: existingPart.part_id,
      duplicate_confidence: 1.0,
      warnings: ['Model duplicate match'],
      raw_source_text: 'Dahua DH-IPC-102-EXISTING dealer 2500 MRP 3200',
      version: 1
    }
  });

  const previewItem3 = await prisma.catalogPreviewItem.create({
    data: {
      session_id: session.session_id,
      temporary_item_id: 'TMP-000003',
      brand: 'Unknown',
      model: 'GEN-001',
      part_number: 'GEN-001',
      name: 'Unusable Product',
      cost_price: 0,
      selling_price: 0,
      tax_rate: 0,
      confidence: 'LOW',
      status: 'REJECTED',
      is_duplicate: false,
      warnings: ['Rejected fields missing'],
      raw_source_text: 'Empty product details',
      version: 1
    }
  });

  console.log(`Seeded Session ID: ${session.session_id}, version: 1`);
  console.log(`Seeded Preview Item 1 ID: ${previewItem1.id} (Valid), version: 1`);
  console.log(`Seeded Preview Item 2 ID: ${previewItem2.id} (Duplicate), version: 1`);
  console.log(`Seeded Preview Item 3 ID: ${previewItem3.id} (Rejected), version: 1\n`);

  // =========================================================================
  // 1. Session Import Guard Test
  // =========================================================================
  console.log('=== Test 1: Session Import Guard (Items remaining PENDING) ===');
  const importGuardRes = await fetch(`${BASE_URL}/session/${session.session_id}/import`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ version: 1 })
  });

  const importGuardBody = await importGuardRes.json() as any;
  if (importGuardRes.status === 400 && importGuardBody.code === 'SESSION_REVIEW_INCOMPLETE') {
    console.log('✅ PASS: Import blocked when items are REVIEW_PENDING.');
  } else {
    throw new Error(`FAIL: Import was not blocked correctly. Status: ${importGuardRes.status}, Body: ${JSON.stringify(importGuardBody)}`);
  }
  console.log();

  // =========================================================================
  // 2. Permission Enforcement Test
  // =========================================================================
  console.log('=== Test 2: Permission Enforcement ===');
  const forbiddenRes = await fetch(`${BASE_URL}/session/${session.session_id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ version: 1, reviewPendingCount: 2 })
  });
  if (forbiddenRes.status === 401) {
    console.log('✅ PASS: Unauthenticated request rejected (401).');
  } else {
    throw new Error(`FAIL: Unauthenticated request returned status: ${forbiddenRes.status}`);
  }
  console.log();

  // =========================================================================
  // 3. Dry Run Validation Guard Test
  // =========================================================================
  console.log('=== Test 3: Dry-run Validation Guard (Pending items exist) ===');
  const dryRunGuardRes = await fetch(`${BASE_URL}/session/${session.session_id}/validate-import`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ version: 1 })
  });
  const dryRunGuardBody = await dryRunGuardRes.json() as any;
  if (dryRunGuardRes.status === 400 && dryRunGuardBody.code === 'SESSION_REVIEW_INCOMPLETE') {
    console.log('✅ PASS: Dry-run blocked when items are REVIEW_PENDING.');
  } else {
    throw new Error(`FAIL: Dry-run validation guard failed. Status: ${dryRunGuardRes.status}`);
  }
  console.log();

  // =========================================================================
  // 4. Duplicate Decision Requirement Test
  // =========================================================================
  console.log('=== Test 4: Duplicate Approval Decision Guard ===');
  const dupApproveRes = await fetch(`${BASE_URL}/item/${previewItem2.id}/approve`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ version: 1 }) // No decision
  });
  const dupApproveBody = await dupApproveRes.json() as any;
  if (dupApproveRes.status === 400 && dupApproveBody.code === 'DECISION_REQUIRED') {
    console.log('✅ PASS: Approving duplicate without a decision was rejected.');
  } else {
    throw new Error(`FAIL: Approving duplicate without decision returned: ${dupApproveRes.status}`);
  }
  console.log();

  // =========================================================================
  // 11. Concurrent Item Approval Test
  // =========================================================================
  console.log('=== Test 11: Concurrent Item Approval (Optimistic Lock) ===');
  const [resA, resB] = await Promise.all([
    fetch(`${BASE_URL}/item/${previewItem1.id}/approve`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ version: 1 })
    }),
    fetch(`${BASE_URL}/item/${previewItem1.id}/approve`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ version: 1 })
    })
  ]);

  const bodyA = await resA.json() as any;
  const bodyB = await resB.json() as any;

  if (resA.status === 200 && resB.status === 409 && bodyB.code === 'ITEM_CONFLICT') {
    console.log('✅ PASS: User A succeeded, User B received ITEM_CONFLICT.');
  } else if (resB.status === 200 && resA.status === 409 && bodyA.code === 'ITEM_CONFLICT') {
    console.log('✅ PASS: User B succeeded, User A received ITEM_CONFLICT.');
  } else {
    throw new Error(`FAIL: Concurrency protection failed. A: ${resA.status} (${JSON.stringify(bodyA)}), B: ${resB.status} (${JSON.stringify(bodyB)})`);
  }
  console.log();

  // Merge item 2 to complete all item reviews
  const mergeItem2Res = await fetch(`${BASE_URL}/item/${previewItem2.id}/merge`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      version: 1,
      matchedPartId: existingPart.part_id,
      reason: 'Merge with existing Dahua dome camera'
    })
  });
  if (mergeItem2Res.status !== 200) throw new Error(`Merge item 2 failed: ${mergeItem2Res.status}`);
  console.log('--- Approved and merged items successfully. Session version remains 1. ---');

  // =========================================================================
  // 12. Concurrent Session Approval Test
  // =========================================================================
  console.log('=== Test 12: Concurrent Session Approval ===');
  // Two users approve session concurrently using version 1 and reviewPendingCount = 0 (since items are approved/merged)
  const [resSessionA, resSessionB] = await Promise.all([
    fetch(`${BASE_URL}/session/${session.session_id}/approve`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ version: 1, reviewPendingCount: 0 })
    }),
    fetch(`${BASE_URL}/session/${session.session_id}/approve`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ version: 1, reviewPendingCount: 0 })
    })
  ]);

  const bodySessionA = await resSessionA.json() as any;
  const bodySessionB = await resSessionB.json() as any;

  if (resSessionA.status === 200 && resSessionB.status === 409 && bodySessionB.code === 'SESSION_CONFLICT') {
    console.log('✅ PASS: Session A approved, Session B rejected with SESSION_CONFLICT.');
  } else if (resSessionB.status === 200 && resSessionA.status === 409 && bodySessionA.code === 'SESSION_CONFLICT') {
    console.log('✅ PASS: Session B approved, Session A rejected with SESSION_CONFLICT.');
  } else {
    throw new Error(`FAIL: Concurrent session approval failed. A: ${resSessionA.status}, B: ${resSessionB.status}`);
  }
  console.log('Session is now APPROVED. Session version is now 2.\n');

  // =========================================================================
  // 5. Dry Run Validation Test
  // =========================================================================
  console.log('=== Test 5: Dry Run Import Validation Counts ===');
  const dryRunRes = await fetch(`${BASE_URL}/session/${session.session_id}/validate-import`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ version: 2 })
  });
  const dryRunBody = await dryRunRes.json() as any;
  if (
    dryRunRes.status === 200 &&
    dryRunBody.canImport === true &&
    dryRunBody.newProducts === 1 &&
    dryRunBody.updatedProducts === 1 &&
    dryRunBody.rejectedProducts === 1
  ) {
    console.log('✅ PASS: Dry-run validation counts matched preview state precisely.');
    console.log('Counts:', dryRunBody);
  } else {
    throw new Error(`FAIL: Dry-run validation mismatch. Counts: ${JSON.stringify(dryRunBody)}`);
  }
  console.log();

  // =========================================================================
  // 18. Session Approval State Drift Test
  // =========================================================================
  console.log('=== Test 18: Session Approval State Drift ===');
  // Re-seed a dummy session 2 for drift testing
  const session2 = await prisma.catalogImportSession.create({
    data: {
      supplier_id: supplier.supplier_id,
      uploaded_by: 1,
      file_name: 'drift_test.pdf',
      page_count: 1,
      total_products: 1,
      valid_products: 1,
      duplicate_products: 0,
      rejected_products: 0,
      status: 'REVIEW_PENDING',
      version: 1
    }
  });

  const previewItemDrift = await prisma.catalogPreviewItem.create({
    data: {
      session_id: session2.session_id,
      temporary_item_id: 'TMP-DRIFT-1',
      brand: 'Hikvision',
      model: 'DRIFT-MODEL',
      part_number: 'DRIFT-PN',
      name: 'Drift Product',
      cost_price: 100,
      selling_price: 150,
      tax_rate: 18,
      confidence: 'HIGH',
      status: 'REVIEW_PENDING',
      is_duplicate: false,
      warnings: [],
      raw_source_text: 'drift'
    }
  });

  // User loads screen (expects reviewPendingCount = 1).
  // Another user approves item concurrently
  await fetch(`${BASE_URL}/item/${previewItemDrift.id}/approve`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ version: 1 })
  });

  // Original user attempts session approval using stale pending count = 1 (but db pending count is now 0)
  const driftApproveRes = await fetch(`${BASE_URL}/session/${session2.session_id}/approve`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ version: 1, reviewPendingCount: 1 }) // version is 1 since item approval does not increment session version.
  });

  const driftApproveBody = await driftApproveRes.json() as any;
  if (driftApproveRes.status === 400 && driftApproveBody.code === 'SESSION_STATE_CHANGED') {
    console.log('✅ PASS: Session approval rejected due to state drift (SESSION_STATE_CHANGED).');
  } else {
    throw new Error(`FAIL: Session state changed guard failed. Status: ${driftApproveRes.status}, Body: ${JSON.stringify(driftApproveBody)}`);
  }

  // Cleanup session 2
  await prisma.catalogPreviewItem.deleteMany({ where: { session_id: session2.session_id } });
  await prisma.catalogImportSession.delete({ where: { session_id: session2.session_id } });
  console.log();

  // =========================================================================
  // 15. Stale Import Request Test
  // =========================================================================
  console.log('=== Test 15: Stale Import Request (Version Mismatch) ===');
  // Current session version is 2. We request import with stale version 1.
  const staleImportRes = await fetch(`${BASE_URL}/session/${session.session_id}/import`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      version: 1, // Stale version
      approvedCount: 1,
      rejectedCount: 1,
      mergedCount: 1,
      pendingCount: 0
    })
  });
  const staleImportBody = await staleImportRes.json() as any;
  if (staleImportRes.status === 409 && staleImportBody.code === 'SESSION_CONFLICT') {
    console.log('✅ PASS: Stale import request rejected (SESSION_CONFLICT).');
  } else {
    throw new Error(`FAIL: Stale import check failed. Status: ${staleImportRes.status}, Body: ${JSON.stringify(staleImportBody)}`);
  }
  console.log();

  // =========================================================================
  // 19. Import State Drift Test
  // =========================================================================
  console.log('=== Test 19: Import State Drift ===');
  // Attempt import with mismatched counts (e.g. approvedCount: 99)
  const driftImportRes = await fetch(`${BASE_URL}/session/${session.session_id}/import`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      version: 2,
      approvedCount: 99, // Mismatched
      rejectedCount: 1,
      mergedCount: 1,
      pendingCount: 0
    })
  });
  const driftImportBody = await driftImportRes.json() as any;
  if (driftImportRes.status === 400 && driftImportBody.code === 'SESSION_STATE_CHANGED') {
    console.log('✅ PASS: Import request rejected due to state drift (SESSION_STATE_CHANGED).');
  } else {
    throw new Error(`FAIL: Import state drift check failed. Status: ${driftImportRes.status}, Body: ${JSON.stringify(driftImportBody)}`);
  }
  console.log();

  // =========================================================================
  // 6. Transaction Failure / Atomicity Test
  // =========================================================================
  console.log('=== Test 6: Transaction Failure & Atomicity (Fail item 1 creation) ===');
  const blockerPart = await prisma.parts.create({
    data: {
      part_number: 'DS-2CD101-TEST', // Same part_number
      name: 'Existing Blocker Part',
      cost_price: 1500,
      selling_price: 2000,
      tax_rate: 18,
      is_active: true
    }
  });

  const txFailureRes = await fetch(`${BASE_URL}/session/${session.session_id}/import`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      version: 2,
      approvedCount: 1,
      rejectedCount: 1,
      mergedCount: 1,
      pendingCount: 0
    })
  });

  const txFailureBody = await txFailureRes.json() as any;
  if (txFailureRes.status === 500 && txFailureBody.code === 'IMPORT_FAILED') {
    console.log('✅ PASS: Transaction import failed due to unique key constraint.');
    const partAfterFailedImport = await prisma.parts.findUnique({
      where: { part_id: existingPart.part_id }
    });
    if (partAfterFailedImport && Number(partAfterFailedImport.cost_price) === 2400) {
      console.log('✅ PASS: DB state preserved correctly. No partial modifications applied.');
    } else {
      throw new Error(`FAIL: Partial update applied to database! Existing cost: ${partAfterFailedImport?.cost_price}`);
    }
  } else {
    throw new Error(`FAIL: Import did not throw error. Status: ${txFailureRes.status}, Body: ${JSON.stringify(txFailureBody)}`);
  }

  await prisma.parts.delete({ where: { part_id: blockerPart.part_id } });
  console.log();

  // =========================================================================
  // 13. Concurrent Import Test
  // =========================================================================
  console.log('=== Test 13: Concurrent Import Lock Contention ===');
  const sessionVerForImport = (await prisma.catalogImportSession.findUnique({
    where: { session_id: session.session_id }
  }))?.version || 2;

  const [resImportA, resImportB] = await Promise.all([
    fetch(`${BASE_URL}/session/${session.session_id}/import`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        version: sessionVerForImport,
        approvedCount: 1,
        rejectedCount: 1,
        mergedCount: 1,
        pendingCount: 0
      })
    }),
    fetch(`${BASE_URL}/session/${session.session_id}/import`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        version: sessionVerForImport,
        approvedCount: 1,
        rejectedCount: 1,
        mergedCount: 1,
        pendingCount: 0
      })
    })
  ]);

  const bodyImportA = await resImportA.json() as any;
  const bodyImportB = await resImportB.json() as any;

  const allowedErrorCodes = ['IMPORT_ALREADY_IN_PROGRESS', 'IMPORT_ALREADY_PROCESSED', 'SESSION_CONFLICT'];
  const isAOk = resImportA.status === 200 && (resImportB.status === 409 || resImportB.status === 400) && allowedErrorCodes.includes(bodyImportB.code);
  const isBOk = resImportB.status === 200 && (resImportA.status === 409 || resImportA.status === 400) && allowedErrorCodes.includes(bodyImportA.code);

  if (isAOk || isBOk) {
    console.log('✅ PASS: Concurrent import protection verified successfully.');
  } else {
    throw new Error(`FAIL: Import lock failed. A: ${resImportA.status} (${JSON.stringify(bodyImportA)}), B: ${resImportB.status} (${JSON.stringify(bodyImportB)})`);
  }

  console.log();

  // =========================================================================
  // 7. Duplicate Import Test
  // =========================================================================
  console.log('=== Test 7: Duplicate Import (Idempotency check) ===');
  const sessionVerAfterImport = (await prisma.catalogImportSession.findUnique({
    where: { session_id: session.session_id }
  }))?.version || 4;

  const repeatImportRes = await fetch(`${BASE_URL}/session/${session.session_id}/import`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      version: sessionVerAfterImport,
      approvedCount: 1,
      rejectedCount: 1,
      mergedCount: 1,
      pendingCount: 0
    })
  });
  const repeatImportBody = await repeatImportRes.json() as any;
  if (repeatImportRes.status === 400 && repeatImportBody.code === 'IMPORT_ALREADY_PROCESSED') {
    console.log('✅ PASS: Double import blocked by Idempotency Lock.');
  } else {
    throw new Error(`FAIL: Repeat import was not blocked. Status: ${repeatImportRes.status}, Body: ${JSON.stringify(repeatImportBody)}`);
  }
  console.log();

  // =========================================================================
  // 8. Rollback Snapshot Immutability Test
  // =========================================================================
  console.log('=== Test 8: Rollback Snapshot Immutability ===');
  const rollbackRecord = await prisma.catalogImportRollback.findUnique({
    where: { session_id: session.session_id }
  });
  if (!rollbackRecord) {
    throw new Error('FAIL: Rollback record was not created during import.');
  }

  try {
    await prisma.catalogImportRollback.update({
      where: { id: rollbackRecord.id },
      data: { imported_by: 999 }
    });
    throw new Error('FAIL: Updating CatalogImportRollback did not fail!');
  } catch (err: any) {
    if (err.message.includes('IMMUTABILITY_VIOLATION')) {
      console.log('✅ PASS: Update operation blocked by Immutability Middleware.');
    } else {
      throw err;
    }
  }

  try {
    await prisma.catalogImportRollback.delete({
      where: { id: rollbackRecord.id }
    });
    throw new Error('FAIL: Deleting CatalogImportRollback did not fail!');
  } catch (err: any) {
    if (err.message.includes('IMMUTABILITY_VIOLATION')) {
      console.log('✅ PASS: Delete operation blocked by Immutability Middleware.');
    } else {
      throw err;
    }
  }
  console.log();

  // =========================================================================
  // 14. Rollback Validation Test
  // =========================================================================
  console.log('=== Test 14: Rollback Validation ===');
  const sessionVerForRollbackVal = (await prisma.catalogImportSession.findUnique({
    where: { session_id: session.session_id }
  }))?.version || 4;

  const rollbackValRes = await fetch(`${BASE_URL}/session/${session.session_id}/validate-rollback`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ version: sessionVerForRollbackVal })
  });
  const rollbackValBody = await rollbackValRes.json() as any;
  if (
    rollbackValRes.status === 200 &&
    rollbackValBody.canRollback === true &&
    rollbackValBody.createdParts === 1 &&
    rollbackValBody.updatedParts === 1
  ) {
    console.log('✅ PASS: validate-rollback returned correct counts and integrity status.');
  } else {
    throw new Error(`FAIL: Rollback validation failed. Status: ${rollbackValRes.status}, Body: ${JSON.stringify(rollbackValBody)}`);
  }
  console.log();

  // =========================================================================
  // 16. Stale Rollback Validation Test
  // =========================================================================
  console.log('=== Test 16: Stale Rollback Validation ===');
  const staleRollbackValRes = await fetch(`${BASE_URL}/session/${session.session_id}/validate-rollback`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ version: sessionVerForRollbackVal - 1 }) // Stale version
  });
  const staleRollbackValBody = await staleRollbackValRes.json() as any;
  if (staleRollbackValRes.status === 409 && staleRollbackValBody.code === 'SESSION_CONFLICT') {
    console.log('✅ PASS: Stale rollback validation rejected (SESSION_CONFLICT).');
  } else {
    throw new Error(`FAIL: Stale rollback validation test failed. Status: ${staleRollbackValRes.status}`);
  }
  console.log();

  // =========================================================================
  // 20. Rollback Snapshot Checksum Validation Test
  // =========================================================================
  console.log('=== Test 20: Rollback Snapshot Checksum Corrupt Validation ===');
  const sessionCorrupt = await prisma.catalogImportSession.create({
    data: {
      supplier_id: supplier.supplier_id,
      uploaded_by: 1,
      file_name: 'corrupt_test.pdf',
      page_count: 1,
      total_products: 1,
      valid_products: 1,
      duplicate_products: 0,
      rejected_products: 0,
      status: 'IMPORTED',
      version: 1
    }
  });

  await prisma.catalogImportRollback.create({
    data: {
      session_id: sessionCorrupt.session_id,
      created_parts: [],
      updated_parts: [],
      old_values: {},
      new_values: {},
      imported_by: 1,
      checksum: 'WRONG-CHECKSUM-VALUE',
      checksum_version: 1
    }
  });

  const corruptValRes = await fetch(`${BASE_URL}/session/${sessionCorrupt.session_id}/validate-rollback`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ version: 1 })
  });
  const corruptValBody = await corruptValRes.json() as any;
  if (corruptValRes.status === 400 && corruptValBody.code === 'ROLLBACK_VALIDATION_FAILED') {
    console.log('✅ PASS: Corrupt snapshot validation rejected (ROLLBACK_VALIDATION_FAILED).');
  } else {
    throw new Error(`FAIL: Corrupt snapshot validation check failed. Status: ${corruptValRes.status}`);
  }

  // Cleanup sessionCorrupt (Rollbacks and associated sessions are immutable, so we leave them in DB)
  console.log();

  // =========================================================================
  // 17. Stale Rollback Execution Test
  // =========================================================================
  console.log('=== Test 17: Stale Rollback Execution ===');
  const staleRollbackRes = await fetch(`${BASE_URL}/session/${session.session_id}/rollback`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ version: sessionVerForRollbackVal - 1 }) // Stale version
  });
  const staleRollbackBody = await staleRollbackRes.json() as any;
  if (staleRollbackRes.status === 409 && staleRollbackBody.code === 'SESSION_CONFLICT') {
    console.log('✅ PASS: Stale rollback execution rejected (SESSION_CONFLICT).');
  } else {
    throw new Error(`FAIL: Stale rollback execution test failed. Status: ${staleRollbackRes.status}`);
  }
  console.log();

  // =========================================================================
  // 9. Rollback Execution Test
  // =========================================================================
  console.log('=== Test 9: Successful Rollback & Re-execution Guard ===');
  const rollbackRes = await fetch(`${BASE_URL}/session/${session.session_id}/rollback`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ version: sessionVerForRollbackVal })
  });
  const rollbackBody = await rollbackRes.json() as any;
  if (rollbackRes.status === 200 && rollbackBody.status === 'ROLLBACK_COMPLETED') {
    console.log('✅ PASS: Rollback executed successfully.');

    // Verify created product is deleted
    const deletedProduct = await prisma.parts.findUnique({ where: { part_number: 'DS-2CD101-TEST' } });
    if (!deletedProduct) {
      console.log('✅ PASS: Newly created product deleted during rollback.');
    } else {
      throw new Error('FAIL: Created product still exists in DB after rollback!');
    }

    // Verify merged product is restored
    const restoredProduct = await prisma.parts.findUnique({ where: { part_id: existingPart.part_id } });
    if (restoredProduct && Number(restoredProduct.cost_price) === 2400) {
      console.log('✅ PASS: Merged product details restored to pre-import state (Cost: 2400).');
    } else {
      throw new Error(`FAIL: Merged product details not restored! Cost: ${restoredProduct?.cost_price}`);
    }
  } else {
    throw new Error(`FAIL: Rollback request failed. Status: ${rollbackRes.status}, Body: ${JSON.stringify(rollbackBody)}`);
  }

  // Rollback Re-execution Guard
  const sessionVerAfterRollback = (await prisma.catalogImportSession.findUnique({
    where: { session_id: session.session_id }
  }))?.version || 5;

  const repeatRollbackRes = await fetch(`${BASE_URL}/session/${session.session_id}/rollback`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ version: sessionVerAfterRollback })
  });
  const repeatRollbackBody = await repeatRollbackRes.json() as any;
  if (repeatRollbackRes.status === 400 && repeatRollbackBody.code === 'ROLLBACK_ALREADY_EXECUTED') {
    console.log('✅ PASS: Double rollback blocked by Safety Lock.');
  } else {
    throw new Error(`FAIL: Repeat rollback was not blocked. Status: ${repeatRollbackRes.status}, Body: ${JSON.stringify(repeatRollbackBody)}`);
  }
  console.log();

  // =========================================================================
  // 21. Canonical Checksum Verification Test
  // =========================================================================
  console.log('=== Test 21: Canonical Checksum Stability & Version Checks ===');
  // Case A: Different key ordering
  const objA = {
    session_id: 1,
    created_parts: ['a', 'b'],
    updated_parts: [101, 102],
    old_values: { a: 1, b: 2 },
    new_values: { a: 11, b: 22 },
    import_timestamp: '2026-06-16T12:00:00.000Z',
    imported_by: 1
  };
  const objB = {
    imported_by: 1,
    import_timestamp: '2026-06-16T12:00:00.000Z',
    new_values: { b: 22, a: 11 }, // reversed order in nested object too
    old_values: { b: 2, a: 1 },
    updated_parts: [101, 102],
    created_parts: ['a', 'b'],
    session_id: 1
  };

  const hashA = generateCanonicalChecksum(objA);
  const hashB = generateCanonicalChecksum(objB);
  if (hashA === hashB) {
    console.log('✅ PASS: Case A: Different key ordering produces identical hash.');
  } else {
    throw new Error(`FAIL: Case A mismatch. hashA: ${hashA}, hashB: ${hashB}`);
  }

  // Case B: Undefined property removed
  const objC = {
    ...objA,
    extraField: undefined
  };
  const hashC = generateCanonicalChecksum(objC);
  if (hashA === hashC) {
    console.log('✅ PASS: Case B: Undefined property removal produces identical hash.');
  } else {
    throw new Error(`FAIL: Case B mismatch.`);
  }

  // Case C: Different actual value
  const objD = {
    ...objA,
    imported_by: 2 // Value changed
  };
  const hashD = generateCanonicalChecksum(objD);
  if (hashA !== hashD) {
    console.log('✅ PASS: Case C: Different actual value produces different hash.');
  } else {
    throw new Error(`FAIL: Case C same hash generated!`);
  }

  // Case D: Unsupported checksum version
  try {
    verifyCanonicalChecksum(objA, hashA, 2);
    throw new Error('FAIL: Unsupported checksum version did not throw!');
  } catch (err: any) {
    if (err.message === 'UNSUPPORTED_CHECKSUM_VERSION') {
      console.log('✅ PASS: Case D: Unsupported version throws UNSUPPORTED_CHECKSUM_VERSION.');
    } else {
      throw err;
    }
  }

  // Case E: Metadata fields excluded from checksum scope
  const objE = {
    ...objA,
    id: 123456,
    created_at: new Date(),
    updated_at: new Date(),
    version: 8,
    checksum: 'mock-checksum',
    checksum_version: 1
  };
  const hashE = generateCanonicalChecksum(objE);
  if (hashA === hashE) {
    console.log('✅ PASS: Case E: Metadata fields outside canonical schema are excluded from hashing.');
  } else {
    throw new Error('FAIL: Case E mismatch.');
  }
  console.log();

  // =========================================================================
  // 10. Audit Logging Verification
  // =========================================================================
  console.log('=== Test 10: Audit Log / Business Events Verification ===');
  const events = await prisma.businessEvent.findMany({
    where: {
      entity_type: { in: ['CatalogPreviewItem', 'CatalogImportSession'] },
      entity_id: { in: [session.session_id, previewItem1.id, previewItem2.id] }
    }
  });

  const eventTypes = events.map(e => e.event_type);
  console.log('Generated Event Types:', eventTypes);

  const requiredTypes = [
    'CATALOG_ITEM_APPROVED',
    'CATALOG_ITEM_MERGED',
    'CATALOG_IMPORT_APPROVED',
    'CATALOG_SESSION_VERSION_INCREMENTED',
    'CATALOG_IMPORT_COMPLETED',
    'CATALOG_IMPORT_LOCK_ACQUIRED',
    'CATALOG_ROLLBACK_VALIDATED',
    'CATALOG_IMPORT_ROLLBACKED'
  ];

  for (const t of requiredTypes) {
    if (eventTypes.includes(t)) {
      console.log(`✅ PASS: BusinessEvent "${t}" generated successfully.`);
    } else {
      throw new Error(`FAIL: BusinessEvent "${t}" was not generated.`);
    }
  }
  console.log();

  // Cleanup test preview items & parts (sessions are left intact due to immutable link with rollbacks)
  await prisma.catalogPreviewItem.deleteMany({ where: { session_id: session.session_id } });
  await prisma.parts.delete({ where: { part_id: existingPart.part_id } });

  console.log('==================================================');
  console.log('✅✅ ALL PHASE 2B.1 WORKFLOW TESTS PASSED ✅✅');
  console.log('==================================================\n');
}

runTests().catch(err => {
  console.error('Fatal error in test runner:', err);
  process.exit(1);
});
