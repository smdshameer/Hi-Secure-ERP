import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from './generated/client';
import { authRouter } from './routes/auth';
import { dashboardRouter } from './routes/dashboard';
import { repairsRouter } from './routes/repairs';
import { customersRouter } from './routes/customers';
import { partsRouter } from './routes/parts';
import { invoicesRouter } from './routes/invoices';
import { quotationsRouter } from './routes/quotations';
import { purchasesRouter } from './routes/purchases';
import { suppliersRouter } from './routes/suppliers';
import { deliveryChallansRouter } from './routes/deliveryChallans';
import { techniciansRouter } from './routes/technicians';
import { locationsRouter } from './routes/locations';
import { usersRouter } from './routes/users';
import { reportsRouter } from './routes/reports';
import { settingsRouter } from './routes/settings';
import { payrollRouter } from './routes/payroll';
import { accountingRouter } from './routes/accounting';
import { bankingRouter } from './routes/banking';
import { gstRouter } from './routes/gst';
import { companiesRouter } from './routes/companies';
import { crmRouter } from './routes/crm';
import { posRouter } from './routes/pos';
import searchRouter from './routes/search';
import { aiRouter } from './routes/ai';
import { approvalsRouter } from './routes/approvals';
import { attachmentsRouter } from './routes/attachments';
import { healthRouter } from './routes/health';
import { notificationsRouter } from './routes/notifications';
import { returnsRouter } from './routes/returns';
import { pdfImportRouter } from './routes/pdfImport';
import { scanRouter } from './routes/scan';
import { telegramBotWorker } from './jobs/TelegramBotWorker';
import { jobWorker } from './jobs/JobWorker';
import { jobScheduler } from './jobs/JobScheduler';
import { jobQueue } from './jobs/JobQueue';
import { CacheService } from './services/CacheService';
import crypto from 'crypto';

import { authMiddleware } from './middleware/auth';
import { catalogReviewRouter } from './routes/catalogReview';
import { procurementRouter } from './routes/procurement';
import { warehouseRouter } from './routes/warehouse';
import { serviceRouter } from './routes/service';
import { amcRouter } from './routes/amc';
import { techRouter } from './routes/tech';
import { portalRouter } from './routes/portal';
import { auditRouter } from './routes/audit';

export const prisma = new PrismaClient().$extends({
  query: {
    catalogImportRollback: {
      async update() {
        throw new Error('IMMUTABILITY_VIOLATION: CatalogImportRollback snapshots are immutable and cannot be modified or deleted.');
      },
      async updateMany() {
        throw new Error('IMMUTABILITY_VIOLATION: CatalogImportRollback snapshots are immutable and cannot be modified or deleted.');
      },
      async delete() {
        throw new Error('IMMUTABILITY_VIOLATION: CatalogImportRollback snapshots are immutable and cannot be modified or deleted.');
      },
      async deleteMany() {
        throw new Error('IMMUTABILITY_VIOLATION: CatalogImportRollback snapshots are immutable and cannot be modified or deleted.');
      },
      async upsert() {
        throw new Error('IMMUTABILITY_VIOLATION: CatalogImportRollback snapshots are immutable and cannot be modified or deleted.');
      }
    },
    journalEntry: {
      async update() {
        throw new Error('IMMUTABLE_LEDGER_VIOLATION');
      },
      async updateMany() {
        throw new Error('IMMUTABLE_LEDGER_VIOLATION');
      },
      async delete() {
        throw new Error('IMMUTABLE_LEDGER_VIOLATION');
      },
      async deleteMany() {
        throw new Error('IMMUTABLE_LEDGER_VIOLATION');
      },
      async upsert() {
        throw new Error('IMMUTABLE_LEDGER_VIOLATION');
      }
    },
    journalEntryLine: {
      async update() {
        throw new Error('IMMUTABLE_LEDGER_VIOLATION');
      },
      async updateMany() {
        throw new Error('IMMUTABLE_LEDGER_VIOLATION');
      },
      async delete() {
        throw new Error('IMMUTABLE_LEDGER_VIOLATION');
      },
      async deleteMany() {
        throw new Error('IMMUTABLE_LEDGER_VIOLATION');
      },
      async upsert() {
        throw new Error('IMMUTABLE_LEDGER_VIOLATION');
      }
    }
  }
}) as unknown as PrismaClient;

const app = express();
const PORT = process.env.PORT || 3004;

// Global HTTP server reference for graceful shutdown
export let serverInstance: any;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'img-src': ["'self'", "data:", "blob:", "https://publicservices.gst.gov.in"],
    },
  },
}));

// Restrict CORS methods and headers to only required values
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Generate request correlation IDs (X-Request-ID) for every request
app.use((req, res, next) => {
  const reqId = (req.headers['x-request-id'] || crypto.randomUUID()) as string;
  req.headers['x-request-id'] = reqId;
  res.setHeader('X-Request-ID', reqId);
  (req as any).requestId = reqId;
  next();
});

// JSON Parser Config
app.use((req, res, next) => {
  if (req.path === '/api/settings/import') {
    express.json({ limit: '50mb' })(req, res, next);
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Endpoint-specific Rate Limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', globalLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many login attempts, please try again after 15 minutes.' }
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many AI inquiries, please try again after 15 minutes.' }
});

const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many search requests, please try again after 15 minutes.' }
});

const reportsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many report generation requests, please try again after 15 minutes.' }
});

// Mount endpoint specific rate limits before routers
app.use('/api/auth/login', loginLimiter);
app.use('/api/ai', aiLimiter);
app.use('/api/search', searchLimiter);
app.use('/api/reports', reportsLimiter);

// Explicit health check endpoint mounting
app.use('/api/health', healthRouter);

// Mount all module routers
app.use('/api/auth', authRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/repairs', authMiddleware, repairsRouter);
app.use('/api/customers', authMiddleware, customersRouter);
app.use('/api/products', authMiddleware, partsRouter);
app.use('/api/parts', authMiddleware, partsRouter);
app.use('/api/parts', authMiddleware, pdfImportRouter);
app.use('/api/catalog-review', authMiddleware, catalogReviewRouter);
app.use('/api/invoices', authMiddleware, invoicesRouter);
app.use('/api/sales', authMiddleware, invoicesRouter);
app.use('/api/quotations', authMiddleware, quotationsRouter);
app.use('/api/purchases', authMiddleware, purchasesRouter);
app.use('/api/suppliers', authMiddleware, suppliersRouter);
app.use('/api/delivery-challans', authMiddleware, deliveryChallansRouter);
app.use('/api/technicians', authMiddleware, techniciansRouter);
app.use('/api/locations', authMiddleware, locationsRouter);
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/reports', authMiddleware, reportsRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/payroll', authMiddleware, payrollRouter);
app.use('/api/accounting', authMiddleware, accountingRouter);
app.use('/api/banking', authMiddleware, bankingRouter);
app.use('/api/gst', authMiddleware, gstRouter);
app.use('/api/companies', authMiddleware, companiesRouter);
app.use('/api/crm', authMiddleware, crmRouter);
app.use('/api/pos', authMiddleware, posRouter);
app.use('/api/search', authMiddleware, searchRouter);
app.use('/api/ai', authMiddleware, aiRouter);
app.use('/api/approvals', authMiddleware, approvalsRouter);
app.use('/api/attachments', authMiddleware, attachmentsRouter);
app.use('/api/notifications', authMiddleware, notificationsRouter);
app.use('/api/returns', authMiddleware, returnsRouter);
app.use('/api/scan', authMiddleware, scanRouter);
app.use('/api/audit', authMiddleware, auditRouter);
app.use('/api/procurement', authMiddleware, procurementRouter);
app.use('/api/warehouse', authMiddleware, warehouseRouter);
app.use('/api/service', authMiddleware, serviceRouter);
app.use('/api/amc', authMiddleware, amcRouter);
app.use('/api/v1/tech', authMiddleware, techRouter);
app.use('/api/v1/portal', authMiddleware, portalRouter);
app.use('/temp', express.static(path.join(process.cwd(), 'temp')));


// Redirect non-API routes to frontend dev server in development
if (process.env.NODE_ENV !== 'production') {
  app.get('/sales/:id/print', (req, res) => {
    const reactUrl = process.env.REACT_URL || process.env.CLIENT_URL || 'http://localhost:5174';
    res.redirect(`${reactUrl}/sales/${req.params.id}/print`);
  });
  app.get('/sales/:id', (req, res) => {
    const reactUrl = process.env.REACT_URL || process.env.CLIENT_URL || 'http://localhost:5174';
    res.redirect(`${reactUrl}/sales/${req.params.id}`);
  });
}

// Serve React static files in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const reqId = (req as any).requestId || 'N/A';
  console.error(`[Request ID: ${reqId}] Server error:`, err);
  res.status(500).json({ error: 'Server error', message: err.message, requestId: reqId });
});

async function performSecurityHardeningChecks() {
  const isProd = process.env.NODE_ENV === 'production';

  // 1. Production Secret Validation & 2. Redis Enforcement
  if (isProd) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret === 'hisecure-jwt-secret-change-in-production') {
      console.error('❌ FATAL: JWT_SECRET environment variable is missing or default in production. Startup failed.');
      process.exit(1);
    }

    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.includes('changeme')) {
      console.error('❌ FATAL: DATABASE_URL environment variable uses default credentials ("changeme") in production. Startup failed.');
      process.exit(1);
    }

    if (!process.env.REDIS_URL) {
      console.error('❌ CRITICAL: REDIS_URL is missing in production mode! Queue-based modules are prevented from running.');
      process.exit(1);
    }
  } else {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret === 'hisecure-jwt-secret-change-in-production') {
      console.warn('⚠️ WARNING: JWT_SECRET is using insecure default. Change in production.');
    }
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.includes('changeme')) {
      console.warn('⚠️ WARNING: DATABASE_URL is using default credentials ("changeme"). Change in production.');
    }
    if (!process.env.REDIS_URL) {
      console.log('ℹ️ No REDIS_URL configured. Running with in-memory fallbacks for development.');
    }
  }

  // 3. Backup Hardening Checks
  const backupsDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    console.warn('⚠️ WARNING: Backups directory does not exist at ' + backupsDir);
  } else {
    try {
      const files = fs.readdirSync(backupsDir)
        .filter(f => f.endsWith('.json') || f.endsWith('.dump') || f.endsWith('.sql'))
        .map(f => ({ name: f, mtime: fs.statSync(path.join(backupsDir, f)).mtime }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      
      if (files.length === 0) {
        console.warn('⚠️ WARNING: No database backup files found in ' + backupsDir);
      } else {
        const latest = files[0];
        const ageHours = (Date.now() - latest.mtime.getTime()) / 3600000;
        if (ageHours > 24) {
          console.warn(`⚠️ WARNING: Latest backup file (${latest.name}) is ${ageHours.toFixed(1)} hours old (older than 24 hours!).`);
        } else {
          console.log(`[Backup Check] Latest backup (${latest.name}) is ${ageHours.toFixed(1)} hours old.`);
        }
      }
    } catch (err: any) {
      console.warn('⚠️ WARNING: Failed to check backup directory:', err.message);
    }
  }

  // 4. Attachment Storage Validation
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.warn('⚠️ WARNING: Uploads directory does not exist at ' + uploadsDir);
  } else {
    try {
      // Test write permissions
      const testFile = path.join(uploadsDir, '.write_test.tmp');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);

      // Calculate count and size
      const files = fs.readdirSync(uploadsDir).filter(f => !f.startsWith('.'));
      let totalSize = 0;
      for (const f of files) {
        try {
          totalSize += fs.statSync(path.join(uploadsDir, f)).size;
        } catch {}
      }
      console.log(`[Attachment Check] Uploads write permission verified. Found ${files.length} uploads, total size: ${(totalSize / 1048576).toFixed(2)} MB.`);
    } catch (err: any) {
      console.error('❌ ERROR: Uploads directory has no write permissions:', err.message);
      if (isProd) {
        console.error('❌ FATAL: Uploads write permissions validation failed in production. Startup failed.');
        process.exit(1);
      }
    }
  }
}

async function main() {
  await performSecurityHardeningChecks();

  try {
    await prisma.$connect();
    console.log('✅ Prisma connected to PostgreSQL');

    // Initialize App Metadata
    try {
      const { AppMetadataService } = require('./services/AppMetadataService');
      AppMetadataService.initialize();
    } catch (metaErr: any) {
      console.error('Failed to initialize AppMetadataService:', metaErr.message);
    }

    // Startup catalog import sessions recovery
    try {
      const { CatalogParserService } = require('./services/CatalogParserService');
      await CatalogParserService.recoverStalledSessions();
    } catch (recoveryErr: any) {
      console.error('[Startup Recovery] Failed to run catalog import session recovery:', recoveryErr.message);
    }

    jobScheduler.startScheduler();
    serverInstance = app.listen(PORT, () => {
      console.log(`🚀 HiSecure ERP API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  }
}

if (process.env.STANDALONE_SCRIPT !== 'true') {
  main();
}

// Graceful Shutdown Implementation
const gracefulShutdown = async (signal: string) => {
  console.log(`\n[Server] Received ${signal}. Initializing graceful shutdown sequence...`);

  if (serverInstance) {
    serverInstance.close(() => {
      console.log('[Server] HTTP server closed.');
    });
  }

  try {
    jobScheduler.stopScheduler();
    telegramBotWorker.stop();
    await jobWorker.shutdown();
    await jobQueue.shutdown();
    await CacheService.shutdown();
    console.log('[Server] Cleaned up workers and cached services.');
  } catch (err: any) {
    console.error('[Server] Error during background worker shutdown:', err.message);
  }

  try {
    await prisma.$disconnect();
    console.log('[Server] Database connection disconnected.');
  } catch (err: any) {
    console.error('[Server] Error disconnecting database:', err.message);
  }

  console.log('[Server] Graceful shutdown completed. Exiting process.');
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

export default app;