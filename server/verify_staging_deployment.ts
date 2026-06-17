/**
 * verify_staging_deployment.ts
 * Stage 1 — Staging Deployment Validation Suite
 */

process.env.STANDALONE_SCRIPT = 'true';
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';

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

async function runStagingValidation() {
  console.log('==================================================');
  console.log('STAGE 1: STAGING DEPLOYMENT VALIDATION');
  console.log('==================================================\n');

  const serverDir = process.cwd();

  // 1. Validate Dockerfile
  const dockerfilePath = path.join(serverDir, 'Dockerfile');
  assert(fs.existsSync(dockerfilePath), 'Dockerfile exists');
  if (fs.existsSync(dockerfilePath)) {
    const content = fs.readFileSync(dockerfilePath, 'utf8');
    assert(content.includes('FROM node'), 'Dockerfile uses NodeJS base image');
    assert(content.includes('npm ci') || content.includes('npm install'), 'Dockerfile installs dependencies');
    assert(content.includes('prisma generate'), 'Dockerfile generates Prisma Client');
    assert(content.includes('dist/index.js') || content.includes('build'), 'Dockerfile builds/executes compiled bundle');
  }

  // 2. Validate docker-compose.yml
  const composePath = path.join(serverDir, 'docker-compose.yml');
  assert(fs.existsSync(composePath), 'docker-compose.yml exists');
  if (fs.existsSync(composePath)) {
    const content = fs.readFileSync(composePath, 'utf8');
    assert(content.includes('postgres:'), 'docker-compose.yml configures PostgreSQL database service');
    assert(content.includes('redis:'), 'docker-compose.yml configures Redis caching service');
    assert(content.includes('api-server:') || content.includes('web:'), 'docker-compose.yml configures API backend service');
    assert(content.includes('nginx:'), 'docker-compose.yml configures Nginx proxy service');
    
    // Persistent Volumes check
    assert(content.includes('postgres_data'), 'docker-compose.yml maps postgres_data persistent volume');
    assert(content.includes('redis_data'), 'docker-compose.yml maps redis_data persistent volume');
    assert(content.includes('uploads_data'), 'docker-compose.yml maps uploads_data persistent volume');
    assert(content.includes('logs_data'), 'docker-compose.yml maps logs_data persistent volume');
  }

  // 3. Validate Nginx config
  const nginxPath = path.join(serverDir, 'nginx.conf');
  assert(fs.existsSync(nginxPath), 'nginx.conf exists');
  if (fs.existsSync(nginxPath)) {
    const content = fs.readFileSync(nginxPath, 'utf8');
    assert(content.includes('proxy_pass'), 'nginx.conf routes traffic as reverse proxy');
    assert(content.includes('upstream'), 'nginx.conf defines load balancing upstream cluster');
    assert(content.includes('attachments'), 'nginx.conf handles attachment routing rules securely');
  }

  // 4. Validate PM2 Ecosystem
  const pm2Path = path.join(serverDir, 'ecosystem.config.js');
  assert(fs.existsSync(pm2Path), 'ecosystem.config.js exists');
  if (fs.existsSync(pm2Path)) {
    const content = fs.readFileSync(pm2Path, 'utf8');
    assert(content.includes('cluster') || content.includes('exec_mode'), 'ecosystem.config.js configures PM2 cluster execution mode');
    assert(content.includes('instances'), 'ecosystem.config.js enables multi-instance scale settings');
  }

  // 5. Validate Backup & Restore Scripts
  const backupPath = path.join(serverDir, 'backup.sh');
  const restorePath = path.join(serverDir, 'restore.sh');
  assert(fs.existsSync(backupPath), 'backup.sh script exists');
  assert(fs.existsSync(restorePath), 'restore.sh script exists');
  
  if (fs.existsSync(backupPath)) {
    const content = fs.readFileSync(backupPath, 'utf8');
    assert(content.includes('pg_dump'), 'backup.sh uses pg_dump for backups');
    assert(content.includes('gzip') || content.includes('tar'), 'backup.sh compresses backup files');
  }
  
  if (fs.existsSync(restorePath)) {
    const content = fs.readFileSync(restorePath, 'utf8');
    assert(content.includes('psql') || content.includes('pg_restore'), 'restore.sh uses psql or pg_restore for data recovery');
    assert(content.includes('gunzip') || content.includes('tar'), 'restore.sh handles backup decompression');
  }

  // 6. Validate Environment Config
  assert(process.env.DATABASE_URL !== undefined, 'DATABASE_URL environment variable is configured');
  assert(process.env.JWT_SECRET !== undefined, 'JWT_SECRET environment variable is configured');

  console.log('\n==================================================');
  console.log('DEPLOYMENT SUMMARY');
  console.log('==================================================');
  console.log(`Total Audited Checkpoints:  ${totalTests}`);
  console.log(`Passed Checkpoints:         ${passed}`);
  console.log(`Failed Checkpoints:         ${failed}`);
  console.log('==================================================\n');

  if (failed > 0) {
    console.error('❌ Staging Deployment validation FAILED.');
    process.exit(1);
  } else {
    console.log('✅ Staging Deployment validation PASSED successfully!');
    process.exit(0);
  }
}

runStagingValidation().catch(err => {
  console.error('Staging validation runner error:', err);
  process.exit(1);
});
