import { prisma } from './src/index';
import { CustomerRepository } from './src/repositories/CustomerRepository';
import { SupplierRepository } from './src/repositories/SupplierRepository';
import { TechnicianRepository } from './src/repositories/TechnicianRepository';
import { IntegrityAuditService } from './src/services/IntegrityAuditService';
import { AiUsageService } from './src/services/AiUsageService';
import { NotificationService } from './src/services/NotificationService';
import { HealthHistoryService } from './src/services/HealthHistoryService';
import { BackupValidationService } from './src/services/BackupValidationService';
import { RecoveryValidationService } from './src/services/RecoveryValidationService';
import { AttachmentService } from './src/services/AttachmentService';
import { BusinessEventService } from './src/services/BusinessEventService';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('========================================================');
  console.log('       HISECURE ERP PRODUCTION READINESS TESTING        ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      console.log(`  🟢 [PASS] ${message}`);
      passed++;
    } else {
      console.log(`  🔴 [FAIL] ${message}`);
      failed++;
    }
  };

  try {
    // ════════════════════════════════════════════════════════════
    // Test 1: Soft Delete Validation
    // ════════════════════════════════════════════════════════════
    console.log('1. Testing Soft Delete Framework...');
    const customerRepo = new CustomerRepository();
    const supplierRepo = new SupplierRepository();
    const technicianRepo = new TechnicianRepository();

    // Create a dummy customer
    const testCust = await customerRepo.create({
      customer_code: `CUST-TEST-${Date.now()}`,
      name: 'Readiness Test Customer',
      phone: `99999000-${Date.now()}`
    });

    // Delete it
    await customerRepo.delete(testCust.customer_id, 1); // delete by operator 1

    // Verify it is excluded
    const foundCust = await customerRepo.findById(testCust.customer_id);
    const listedCusts = await customerRepo.findMany({}, 10);
    const inList = (listedCusts as any[]).some((c: any) => c.customer_id === testCust.customer_id);

    // Read raw db to confirm it still exists but has is_deleted=true
    const rawCust = await prisma.customer.findUnique({ where: { customer_id: testCust.customer_id } });

    assert(foundCust === null, 'Soft-deleted customer should not be fetchable by findById');
    assert(!inList, 'Soft-deleted customer should not appear in findMany list');
    assert(rawCust !== null && rawCust.is_deleted === true, 'Soft-deleted customer record must still exist in DB with is_deleted=true');

    // Clean up raw database record
    await prisma.customer.delete({ where: { customer_id: testCust.customer_id } });


    // ════════════════════════════════════════════════════════════
    // Test 2: AI Usage & Limits Tracking
    // ════════════════════════════════════════════════════════════
    console.log('\n2. Testing AI Usage Tracking & Role limits...');
    // Log usage
    const initialLogsCount = await prisma.aiUsageLog.count();
    await AiUsageService.logUsage(1, 1500); // User 1, 1500 tokens
    const finalLogsCount = await prisma.aiUsageLog.count();
    
    // Check limits
    const limitCheck = await AiUsageService.checkLimits(1); // Admin user
    assert(finalLogsCount === initialLogsCount + 1, 'AI token usage should log successfully in database');
    assert(limitCheck.allowed === true, 'Admin user should have unlimited limits allowed');


    // ════════════════════════════════════════════════════════════
    // Test 3: User-isolated Notifications
    // ════════════════════════════════════════════════════════════
    console.log('\n3. Testing Notification Reads Isolation...');
    // Create a general notification
    const note = await NotificationService.createNotification({
      role_id: 9999,
      type: 'TEST_ALERT',
      message: 'Readiness validation general test message',
      priority: 'high'
    });

    if (note) {
      // Mark as read for user 1
      await NotificationService.markAsRead(note.notification_id, 1);

      // Fetch notifications for user 1 and user 2 with role_id 9999
      const user1Notes = await NotificationService.getUserNotifications(1, 9999);
      const user2Notes = await NotificationService.getUserNotifications(2, 9999);

      const noteForUser1 = user1Notes.find(n => n.notification_id === note.notification_id);
      const noteForUser2 = user2Notes.find(n => n.notification_id === note.notification_id);

      assert(noteForUser1?.read_status === true, 'Notification should be marked read for User 1');
      // For general notification (not assigned to specific user), user 2 should still see it as unread
      assert(noteForUser2?.read_status === false, 'Notification should remain unread for User 2 (isolation check)');

      // Clean up
      await prisma.notification.delete({ where: { notification_id: note.notification_id } });
    } else {
      assert(false, 'Failed to create test notification');
    }


    // ════════════════════════════════════════════════════════════
    // Test 4: Integrity Audit Service
    // ════════════════════════════════════════════════════════════
    console.log('\n4. Testing Integrity Audit Service...');
    const auditRes = await IntegrityAuditService.runAudit('INCREMENTAL');
    assert(auditRes !== null, 'Integrity reconciliation service audit runs successfully');
    assert(fs.existsSync(auditRes.report_path), 'Integrity audit JSON report should be generated on disk');


    // ════════════════════════════════════════════════════════════
    // Test 5: Hourly System Health Snapshot Logging
    // ════════════════════════════════════════════════════════════
    console.log('\n5. Testing Hourly System Health Snapshot Logging...');
    const healthLog = await HealthHistoryService.logHealthSnapshot();
    assert(healthLog !== null && healthLog.id !== undefined, 'Hourly health snapshot should be logged successfully in the database');


    // ════════════════════════════════════════════════════════════
    // Test 6: Backup Validation
    // ════════════════════════════════════════════════════════════
    console.log('\n6. Testing Backup Validation Service...');
    // Create a dummy JSON file to simulate backup
    const testBackupPath = path.join(process.cwd(), 'backups', `readiness_test_backup.json`);
    const backupContent = {
      exported_at: new Date().toISOString(),
      data: {
        users: [{ id: 1 }],
        settings: [{ key: 'test' }]
      }
    };
    fs.mkdirSync(path.dirname(testBackupPath), { recursive: true });
    fs.writeFileSync(testBackupPath, JSON.stringify(backupContent), 'utf-8');

    const validationReport = await BackupValidationService.validateBackup(testBackupPath);
    assert(validationReport.status === 'passed', 'BackupValidationService should validate a correct backup format as passed');
    assert(validationReport.checksum_valid === true, 'Backup validation should mark checksum as valid');

    // Clean up
    if (fs.existsSync(testBackupPath)) fs.unlinkSync(testBackupPath);


    // ════════════════════════════════════════════════════════════
    // Test 7: Attachment Versioning
    // ════════════════════════════════════════════════════════════
    console.log('\n7. Testing Attachment Versioning...');
    // Create first upload
    const att1 = await AttachmentService.createAttachment({
      entity_type: 'Invoice',
      entity_id: 9999,
      file_name: 'test_doc.pdf',
      file_path: 'test_doc_v1.pdf',
      mime_type: 'application/pdf',
      uploaded_by: 1
    });

    // Create second upload of the same filename (should trigger archiving of v1 and updating attachment to v2)
    const att2 = await AttachmentService.createAttachment({
      entity_type: 'Invoice',
      entity_id: 9999,
      file_name: 'test_doc.pdf',
      file_path: 'test_doc_v2.pdf',
      mime_type: 'application/pdf',
      uploaded_by: 1
    });

    const refreshedAtt = await AttachmentService.getAttachmentById(att1.attachment_id);
    assert(refreshedAtt !== null, 'Should retrieve attachment by ID');
    assert(refreshedAtt?.file_path === 'test_doc_v2.pdf', 'Attachment record should hold the latest file path (v2)');
    assert(refreshedAtt?.versions?.length === 1, 'Versions history must contain exactly 1 archived version (v1)');
    assert(refreshedAtt?.versions?.[0]?.file_path === 'test_doc_v1.pdf', 'Archived version history must reflect the old version file path (v1)');

    // Clean up
    await prisma.attachment.delete({ where: { attachment_id: att1.attachment_id } });


    // ════════════════════════════════════════════════════════════
    // Test 8: Business Event Monitoring Hooks
    // ════════════════════════════════════════════════════════════
    console.log('\n8. Testing Business Event Logging...');
    const testEvent = await BusinessEventService.logEvent({
      event_type: 'TEST_READINESS',
      entity_type: 'SystemTest',
      entity_id: 1010,
      description: 'System readiness verification event hook execution'
    });
    assert(testEvent !== null && testEvent!.id !== undefined, 'Business events logger writes records correctly');

  } catch (err: any) {
    console.error('CRITICAL ERROR DURING READINESS TESTS:', err);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');
  
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
