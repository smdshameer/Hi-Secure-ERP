const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const workspaceDir = path.join(__dirname, '..');
const serverDir = __dirname;
const backupDir = path.join(workspaceDir, 'backups_safety');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log('--- STARTING SAFETY BACKUPS ---');

// 1. Copy Environment Variables
console.log('Copying environment files...');
const rootEnv = path.join(workspaceDir, '.env');
const serverEnv = path.join(serverDir, '.env');

if (fs.existsSync(rootEnv)) {
  fs.copyFileSync(rootEnv, path.join(backupDir, 'root.env'));
  console.log('Copied root .env');
}
if (fs.existsSync(serverEnv)) {
  fs.copyFileSync(serverEnv, path.join(backupDir, 'server.env'));
  console.log('Copied server .env');
}

// 2. Backup Uploads Folder
console.log('Backing up uploads folder...');
const uploadsDir = path.join(serverDir, 'uploads');
const destUploads = path.join(backupDir, 'uploads');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(uploadsDir)) {
  copyDirRecursive(uploadsDir, destUploads);
  console.log('Uploads folder backed up successfully');
} else {
  console.log('Uploads folder does not exist');
}

// 3. Backup PostgreSQL Database
console.log('Exporting database via fallback JSON...');
try {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  async function runFallback() {
    const tables = [
      'customer', 'supplier', 'parts', 'salesInvoice', 'repair', 'quotation',
      'deliveryChallan', 'purchaseOrder', 'setting', 'brand', 'technician',
      'location', 'partStock', 'stockMovement', 'account', 'journalEntry',
      'user', 'role', 'permission', 'rolePermission', 'userRole', 'attachment',
      'salesReturn', 'purchaseReturn', 'posSession', 'posTransaction',
      'approvalWorkflow', 'approvalHistory', 'repairEvent', 'company', 'payment',
      'deliveryChallanReturns'
    ];
    
    const dump = {};
    for (const table of tables) {
      try {
        dump[table] = await prisma[table].findMany();
      } catch (e) {
        console.warn(`Failed to export table ${table}:`, e.message);
      }
    }
    
    const jsonFile = path.join(backupDir, `hisecure_erp_pre_hardening_${Date.now()}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(dump, null, 2), 'utf-8');
    console.log(`JSON database backup saved: ${jsonFile}`);
    await prisma.$disconnect();
  }
  
  runFallback();
} catch (err) {
  console.error('Database fallback JSON backup failed:', err.message);
}

console.log('--- SAFETY BACKUPS COMPLETE ---');
