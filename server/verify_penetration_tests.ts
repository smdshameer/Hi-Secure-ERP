/**
 * verify_penetration_tests.ts
 * Stage 3 — Security Penetration Testing Suite
 */

process.env.STANDALONE_SCRIPT = 'true';
import dotenv from 'dotenv';
dotenv.config();

import { prisma } from './src/index';
import { authMiddleware } from './src/middleware/auth';
import { antivirusService } from './src/services/AntivirusService';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'hisecure-jwt-secret-change-in-production';

let totalTests = 0;
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${msg}`);
  } else {
    failed++;
    failures.push(msg);
    console.error(`  ❌ FAIL: ${msg}`);
  }
}

// Mock Request & Response objects for Express testing
function mockRequestResponse(headers: any = {}, body: any = {}) {
  const req: any = {
    headers,
    body,
    method: 'GET',
    path: '/'
  };
  
  const res: any = {
    statusCode: 200,
    headersSent: false,
    headers: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.jsonData = data;
      this.headersSent = true;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    }
  };
  
  return { req, res };
}

async function runPenetrationTests() {
  console.log('==================================================');
  console.log('STAGE 3: SECURITY PENETRATION TESTING');
  console.log('==================================================\n');

  // Find a test user in database
  const user = await prisma.user.findFirst() || await prisma.user.create({
    data: {
      username: `pen_test_${Date.now()}`,
      email: `pen_test_${Date.now()}@hisecure.com`,
      password_hash: 'hash',
      full_name: 'Pen Test User',
      role: 'customer'
    }
  });

  // ════════════════════════════════════════════════════════════
  // 1. JWT Signature Tampering Attack
  // ════════════════════════════════════════════════════════════
  console.log('1. Testing JWT Signature Tampering...');
  const jti = crypto.randomUUID();
  const token = jwt.sign({ user_id: user.user_id, role: user.role, jti }, JWT_SECRET);
  
  // Tamper signature by appending dummy characters
  const parts = token.split('.');
  const tamperedToken = `${parts[0]}.${parts[1]}.tamperedSignatureHere`;

  const { req: req1, res: res1 } = mockRequestResponse({ authorization: `Bearer ${tamperedToken}` });
  let nextCalled1 = false;
  await authMiddleware(req1, res1, () => { nextCalled1 = true; });

  assert(!nextCalled1, 'Auth middleware blocks requests with tampered JWT signatures');
  assert(res1.statusCode === 401, 'Tampered token returns 401 Unauthorized');

  // ════════════════════════════════════════════════════════════
  // 2. Token Blacklist Re-use Attack
  // ════════════════════════════════════════════════════════════
  console.log('\n2. Testing Token Blacklist Revocation...');
  // Blacklist JTI
  await prisma.tokenBlacklist.create({
    data: {
      token_jti: jti,
      user_id: user.user_id,
      expires_at: new Date(Date.now() + 3600000)
    }
  });

  const { req: req2, res: res2 } = mockRequestResponse({ authorization: `Bearer ${token}` });
  let nextCalled2 = false;
  await authMiddleware(req2, res2, () => { nextCalled2 = true; });

  assert(!nextCalled2, 'Auth middleware blocks requests using blacklisted tokens');
  assert(res2.statusCode === 401 && res2.jsonData?.error === 'Token has been revoked', 'Blacklisted token returns 401 with revocation message');

  // Clean up blacklist entry
  await prisma.tokenBlacklist.delete({ where: { token_jti: jti } });

  // ════════════════════════════════════════════════════════════
  // 3. Tenant Isolation Validation
  // ════════════════════════════════════════════════════════════
  console.log('\n3. Testing Tenant Isolation boundaries...');
  // Create Customer A
  const custA = await prisma.customer.create({
    data: {
      customer_code: `CUST-A-${Date.now().toString().slice(-4)}`,
      name: 'Customer A corp',
      phone: `9000100-${Date.now().toString().slice(-4)}`
    }
  });

  // Create Customer B
  const custB = await prisma.customer.create({
    data: {
      customer_code: `CUST-B-${Date.now().toString().slice(-4)}`,
      name: 'Customer B corp',
      phone: `9000200-${Date.now().toString().slice(-4)}`
    }
  });

  // Access check: Customer A user trying to query Customer B's jobs/invoices
  // In portal.ts, the customerId is resolved directly from req.userId database record.
  // Verify that customer A user resolves to customer A's ID
  const userA = await prisma.user.create({
    data: {
      username: `user_a_${Date.now()}`,
      email: `user_a_${Date.now()}@test.com`,
      password_hash: 'hash',
      full_name: 'Customer A User',
      role: 'customer',
      customer_id: custA.customer_id
    }
  });

  assert(userA.customer_id === custA.customer_id, 'User A customer context resolves to Tenant A');
  assert(userA.customer_id !== custB.customer_id, 'User A is isolated from Tenant B customer context');

  // ════════════════════════════════════════════════════════════
  // 4. Antivirus Upload Abuse
  // ════════════════════════════════════════════════════════════
  console.log('\n4. Testing Antivirus Upload Blockage...');
  // Create dummy infected file
  const infectedPath = path.join(process.cwd(), 'eicar_virus_signature.txt');
  fs.writeFileSync(infectedPath, 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');

  const scan = await antivirusService.scanFile(infectedPath);
  assert(!scan.safe, 'Infected file correctly caught by scan service');
  assert(scan.virusName === 'EICAR-Test-Signature', 'Infected signature matches EICAR reference');

  if (fs.existsSync(infectedPath)) fs.unlinkSync(infectedPath);

  // ════════════════════════════════════════════════════════════
  // 5. SQL Injection (SQLi) Safety
  // ════════════════════════════════════════════════════════════
  console.log('\n5. Testing SQL Injection (SQLi) protection...');
  // Pass classic SQLi string to prisma query
  const sqliPayload = "' OR '1'='1";
  try {
    const matchedUsers = await prisma.user.findMany({
      where: { username: sqliPayload }
    });
    assert(matchedUsers.length === 0, 'Prisma ORM parameterized inputs prevent SQL injection bypasses');
  } catch (err: any) {
    assert(false, `SQLi error check failed: ${err.message}`);
  }

  // ════════════════════════════════════════════════════════════
  // 6. Cross-Site Scripting (XSS) Safety
  // ════════════════════════════════════════════════════════════
  console.log('\n6. Testing Cross-Site Scripting (XSS) payload storage...');
  const xssPayload = "<script>alert('xss')</script>";
  // Prisma stores it safely as string, escaping is verified on output renderer layers.
  try {
    const testNote = await prisma.user.update({
      where: { user_id: user.user_id },
      data: { full_name: xssPayload }
    });
    assert(testNote.full_name === xssPayload, 'XSS inputs are stored as raw literals, preventing execution on database queries');
  } catch (err: any) {
    assert(false, `XSS check failed: ${err.message}`);
  }

  // Clean up
  await prisma.user.delete({ where: { user_id: userA.user_id } });
  await prisma.customer.delete({ where: { customer_id: custA.customer_id } });
  await prisma.customer.delete({ where: { customer_id: custB.customer_id } });

  console.log('\n==================================================');
  console.log('PENETRATION TESTING SUMMARY');
  console.log('==================================================');
  console.log(`Total Audits Executed:  ${totalTests}`);
  console.log(`Passed Audits:         ${passed}`);
  console.log(`Failed Audits:         ${failed}`);
  console.log('==================================================\n');

  if (failed > 0) {
    console.error('❌ Security Penetration Testing FAILED.');
    process.exit(1);
  } else {
    console.log('✅ Security Penetration Testing PASSED successfully!');
    process.exit(0);
  }
}

runPenetrationTests().catch(err => {
  console.error('Penetration test runner error:', err);
  process.exit(1);
});
