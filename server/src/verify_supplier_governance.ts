import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from './index';
import { catalogReviewRouter } from './routes/catalogReview';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_12345';
process.env.JWT_SECRET = JWT_SECRET;

const myExpressApp = express();
myExpressApp.use(express.json());

// Auth middleware mock injection for testing
myExpressApp.use((req: any, _res: any, next: any) => {
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

myExpressApp.use('/api/catalog-review', catalogReviewRouter);

const PORT = 3010;
let serverInstance: any;

async function setupDatabaseSeed() {
  console.log('Cleaning up & seeding DB for Supplier Governance testing...');
  
  await prisma.supplierPriceChange.deleteMany({});
  await prisma.importApprovalHistory.deleteMany({});
  await prisma.catalogPreviewItem.deleteMany({});
  await prisma.catalogImportSession.deleteMany({});
  await prisma.supplierGovernance.deleteMany({});
  await prisma.catalogVersionHistory.deleteMany({});

  // Ensure test parts are cleaned up
  const existingTestParts = await prisma.parts.findMany({
    where: { part_number: { in: ['TEST-GOV-PART-1', 'TEST-GOV-PART-2', 'TEST-GOV-PART-3', 'TEST-GOV-PART-4'] } }
  });
  for (const part of existingTestParts) {
    await prisma.parts.delete({ where: { part_id: part.part_id } });
  }

  // Create baseline parts
  const part1 = await prisma.parts.create({
    data: {
      part_number: 'TEST-GOV-PART-1',
      name: 'Test Gov Part 1',
      cost_price: 100.00,
      selling_price: 200.00,
      tax_rate: 18.00
    }
  });

  const part2 = await prisma.parts.create({
    data: {
      part_number: 'TEST-GOV-PART-2',
      name: 'Test Gov Part 2',
      cost_price: 100.00,
      selling_price: 200.00,
      tax_rate: 18.00
    }
  });

  // Ensure test supplier exists
  let supplier = await prisma.supplier.findFirst({
    where: { supplier_code: 'TEST-GOV-SUPPLIER' }
  });
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        supplier_code: 'TEST-GOV-SUPPLIER',
        name: 'Test Gov Supplier'
      }
    });
  }

  // Upsert user #1 (admin)
  const user1 = await prisma.user.upsert({
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

  // Upsert user #2 (manager)
  const user2 = await prisma.user.upsert({
    where: { user_id: 2 },
    update: {},
    create: {
      user_id: 2,
      username: 'testmanager',
      password_hash: 'mocked',
      role: 'manager',
      email: 'testmanager@example.com',
      full_name: 'Test Manager'
    }
  });

  // Ensure role permissions are correct
  const permission = await prisma.permission.upsert({
    where: { name: 'purchase:create' },
    update: {},
    create: {
      name: 'purchase:create',
      description: 'Allows purchases'
    }
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Admin'
    }
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'manager' },
    update: {},
    create: {
      name: 'manager',
      description: 'Manager'
    }
  });

  await prisma.rolePermission.upsert({
    where: { role_id_permission_id: { role_id: adminRole.role_id, permission_id: permission.permission_id } },
    update: {},
    create: { role_id: adminRole.role_id, permission_id: permission.permission_id }
  });

  await prisma.rolePermission.upsert({
    where: { role_id_permission_id: { role_id: managerRole.role_id, permission_id: permission.permission_id } },
    update: {},
    create: { role_id: managerRole.role_id, permission_id: permission.permission_id }
  });

  await prisma.userRole.upsert({
    where: { user_id_role_id: { user_id: 1, role_id: adminRole.role_id } },
    update: {},
    create: { user_id: 1, role_id: adminRole.role_id }
  });

  await prisma.userRole.upsert({
    where: { user_id_role_id: { user_id: 2, role_id: managerRole.role_id } },
    update: {},
    create: { user_id: 2, role_id: managerRole.role_id }
  });

  console.log('Database seeded successfully.');
  return { part1, part2, supplierId: supplier.supplier_id };
}

async function runTests() {
  const { part1, part2, supplierId } = await setupDatabaseSeed();

  const adminToken = jwt.sign({ user_id: 1, role: 'admin' }, JWT_SECRET);
  const managerToken = jwt.sign({ user_id: 2, role: 'manager' }, JWT_SECRET);

  const adminHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  };

  const managerHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${managerToken}`
  };

  serverInstance = myExpressApp.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  const baseUrl = `http://localhost:${PORT}/api/catalog-review`;

  // --- Test Case 1: Supplier is BLOCKED ---
  console.log('\n--- Test Case 1: Supplier is BLOCKED ---');
  await prisma.supplierGovernance.create({
    data: {
      supplier_id: supplierId,
      trust_level: 'BLOCKED',
      total_catalogs: 0,
      failed_imports: 0
    }
  });

  const session1 = await prisma.catalogImportSession.create({
    data: {
      supplier_id: supplierId,
      uploaded_by: 1,
      file_name: 'catalog_blocked.pdf',
      page_count: 1,
      total_products: 1,
      valid_products: 1,
      duplicate_products: 0,
      rejected_products: 0,
      status: 'APPROVED',
      validation_status: 'PASSED',
      version: 1,
      file_hash: 'hash_blocked_123'
    }
  });

  let res = await fetch(`${baseUrl}/session/${session1.session_id}/import`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ version: 1 })
  });
  let data = (await res.json()) as any;
  console.log('Blocked response:', res.status, JSON.stringify(data));
  if (res.status !== 403 || data.error !== 'SUPPLIER_BLOCKED') {
    throw new Error('Expected 403 SUPPLIER_BLOCKED');
  }
  console.log('PASSED: Blocked supplier check succeeded.');

  // --- Test Case 2: Supplier is RESTRICTED (Requires dual approval) ---
  console.log('\n--- Test Case 2: Supplier is RESTRICTED (no manager approval) ---');
  await prisma.supplierGovernance.update({
    where: { supplier_id: supplierId },
    data: { trust_level: 'RESTRICTED' }
  });

  const session2 = await prisma.catalogImportSession.create({
    data: {
      supplier_id: supplierId,
      uploaded_by: 1,
      file_name: 'catalog_restricted.pdf',
      page_count: 1,
      total_products: 1,
      valid_products: 1,
      duplicate_products: 0,
      rejected_products: 0,
      status: 'REVIEW_PENDING', // Start in REVIEW_PENDING for approval flow
      validation_status: 'PASSED',
      version: 1,
      file_hash: 'hash_restricted_123'
    }
  });

  // Inject preview item for session2 (start in REVIEW_PENDING)
  await prisma.catalogPreviewItem.create({
    data: {
      session_id: session2.session_id,
      temporary_item_id: 'temp-gov-1',
      brand: 'TestBrand',
      model: 'TestModel',
      part_number: 'TEST-GOV-PART-3', // Unique new part number
      name: 'Test Gov Part 3',
      cost_price: 120.00,
      selling_price: 240.00,
      tax_rate: 18.00,
      status: 'REVIEW_PENDING',
      decision: 'KEEP_NEW',
      confidence: 'HIGH'
    }
  });

  // Trying to import a RESTRICTED session without manager approval should fail with DUAL_APPROVAL_REQUIRED
  res = await fetch(`${baseUrl}/session/${session2.session_id}/import`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ version: 1 })
  });
  data = (await res.json()) as any;
  console.log('Restricted no-manager response:', res.status, JSON.stringify(data));
  if (res.status !== 400 || data.code !== 'DUAL_APPROVAL_REQUIRED') {
    throw new Error('Expected 400 DUAL_APPROVAL_REQUIRED');
  }
  console.log('PASSED: Restricted supplier block (no manager approval) check succeeded.');

  // Now, user 2 (manager) approves the session
  console.log('\n--- Test Case 2.1: Supplier is RESTRICTED (with manager approval) ---');
  res = await fetch(`${baseUrl}/session/${session2.session_id}/approve`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({
      version: 1,
      reviewPendingCount: 1
    })
  });
  data = (await res.json()) as any;
  console.log('Manager approve response:', res.status, JSON.stringify(data));
  if (res.status !== 200 || !data.success) {
    throw new Error('Manager approval failed');
  }

  // Now user 1 (admin) tries to import, but since the version has been incremented to 2 by the approve action, we pass version 2.
  res = await fetch(`${baseUrl}/session/${session2.session_id}/import`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ version: 2 })
  });
  data = (await res.json()) as any;
  console.log('Restricted import with manager approval response:', res.status, JSON.stringify(data));
  if (res.status !== 200 || data.status !== 'IMPORTED') {
    throw new Error('Import failed even with dual approval');
  }
  console.log('PASSED: Restricted supplier dual approval import succeeded.');

  // --- Test Case 3: Supplier is STANDARD, registers version and evaluates metrics ---
  console.log('\n--- Test Case 3: Supplier is STANDARD (Import and verify evaluation) ---');
  await prisma.supplierGovernance.update({
    where: { supplier_id: supplierId },
    data: { trust_level: 'STANDARD' }
  });

  const session3 = await prisma.catalogImportSession.create({
    data: {
      supplier_id: supplierId,
      uploaded_by: 1,
      file_name: 'catalog_standard.pdf',
      page_count: 1,
      total_products: 1,
      valid_products: 1,
      duplicate_products: 0,
      rejected_products: 0,
      status: 'APPROVED',
      validation_status: 'PASSED',
      version: 1,
      file_hash: 'hash_standard_123'
    }
  });

  await prisma.catalogPreviewItem.create({
    data: {
      session_id: session3.session_id,
      temporary_item_id: 'temp-gov-2',
      brand: 'TestBrand',
      model: 'TestModel',
      part_number: 'TEST-GOV-PART-4', // Unique new part number
      name: 'Test Gov Part 4',
      cost_price: 130.00,
      selling_price: 260.00,
      tax_rate: 18.00,
      status: 'APPROVED',
      decision: 'KEEP_NEW',
      confidence: 'HIGH'
    }
  });

  res = await fetch(`${baseUrl}/session/${session3.session_id}/import`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ version: 1 })
  });
  data = (await res.json()) as any;
  console.log('Standard supplier import response:', res.status, JSON.stringify(data));
  if (res.status !== 200 || data.status !== 'IMPORTED') {
    throw new Error('Standard import failed');
  }

  // Verify catalog version is registered
  const versions = await prisma.catalogVersionHistory.findMany({
    where: { supplier_id: supplierId }
  });
  console.log('Registered versions in DB:', JSON.stringify(versions));
  const hasVersion3 = versions.some(v => v.session_id === session3.session_id && v.file_hash === 'hash_standard_123');
  if (!hasVersion3) {
    throw new Error('Expected standard catalog version registration in CatalogVersionHistory');
  }
  console.log('PASSED: Catalog version registered successfully.');

  // Verify SupplierGovernance evaluation metrics
  const updatedGov = await prisma.supplierGovernance.findUnique({
    where: { supplier_id: supplierId }
  });
  console.log('Updated Supplier Governance metrics in DB:', JSON.stringify(updatedGov));
  if (!updatedGov || updatedGov.total_catalogs === 0) {
    throw new Error('Supplier governance metrics were not updated!');
  }
  console.log('PASSED: Supplier governance evaluated and updated successfully.');

  // --- Test Case 4: Duplicate Catalog Version ---
  console.log('\n--- Test Case 4: Duplicate Catalog Version detection ---');
  
  // Inject standard version duplicate hash in catalog_version_histories
  await prisma.catalogVersionHistory.create({
    data: {
      supplier_id: supplierId,
      session_id: session3.session_id,
      catalog_version: 9,
      file_hash: 'hash_duplicate_test'
    }
  });

  // Create another session with the same file_hash
  const session4 = await prisma.catalogImportSession.create({
    data: {
      supplier_id: supplierId,
      uploaded_by: 1,
      file_name: 'catalog_standard_dup.pdf',
      page_count: 1,
      total_products: 1,
      valid_products: 1,
      duplicate_products: 0,
      rejected_products: 0,
      status: 'APPROVED',
      validation_status: 'PASSED',
      version: 1,
      file_hash: 'hash_duplicate_test'
    }
  });

  await prisma.catalogPreviewItem.create({
    data: {
      session_id: session4.session_id,
      temporary_item_id: 'temp-gov-4',
      brand: 'TestBrand',
      model: 'TestModel',
      part_number: 'TEST-GOV-PART-4', // Same as session3
      name: 'Test Gov Part 4 Updated',
      cost_price: 130.00,
      selling_price: 260.00,
      tax_rate: 18.00,
      status: 'APPROVED',
      decision: 'KEEP_NEW',
      confidence: 'HIGH'
    }
  });

  res = await fetch(`${baseUrl}/session/${session4.session_id}/import`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ version: 1 })
  });
  data = (await res.json()) as any;
  console.log('Duplicate import response:', res.status, JSON.stringify(data));
  if (res.status !== 400 || data.error !== 'DUPLICATE_CATALOG_VERSION') {
    throw new Error('Expected 400 DUPLICATE_CATALOG_VERSION');
  }
  console.log('PASSED: Duplicate catalog version check block succeeded.');

  console.log('\n=====================================');
  console.log('ALL SUPPLIER GOVERNANCE TESTS PASSED!');
  console.log('=====================================');
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
