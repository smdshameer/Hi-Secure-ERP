import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
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
import './jobs/TelegramBotWorker';
import './jobs/JobWorker';
import './jobs/JobScheduler';

import { authMiddleware } from './middleware/auth';

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'img-src': ["'self'", "data:", "blob:", "https://publicservices.gst.gov.in"],
    },
  },
}));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
// Default JSON limit — 10mb for normal API calls
app.use((req, res, next) => {
  // Large limit for backup import, normal limit for everything else
  if (req.path === '/api/settings/import') {
    express.json({ limit: '50mb' })(req, res, next);
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

app.use('/api', healthRouter);

// Mount all module routers
app.use('/api/auth', authRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/repairs', authMiddleware, repairsRouter);
app.use('/api/customers', authMiddleware, customersRouter);
app.use('/api/products', authMiddleware, partsRouter);
app.use('/api/parts', authMiddleware, partsRouter);
app.use('/api/parts', authMiddleware, pdfImportRouter);
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
app.use('/api/companies', authMiddleware, companiesRouter);
app.use('/api/crm', authMiddleware, crmRouter);
app.use('/api/pos', authMiddleware, posRouter);
app.use('/api/search', authMiddleware, searchRouter);
app.use('/api/ai', authMiddleware, aiRouter);
app.use('/api/approvals', authMiddleware, approvalsRouter);
app.use('/api/attachments', authMiddleware, attachmentsRouter);
app.use('/api/notifications', authMiddleware, notificationsRouter);
app.use('/api/returns', authMiddleware, returnsRouter);
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
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Server error', message: err.message });
});

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Prisma connected to PostgreSQL');
    app.listen(PORT, () => {
      console.log(`🚀 HiSecure ERP API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  }
}

main();

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

export default app;