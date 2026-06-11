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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount all module routers
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/repairs', repairsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/products', partsRouter);
app.use('/api/parts', partsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/sales', invoicesRouter);
app.use('/api/quotations', quotationsRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/delivery-challans', deliveryChallansRouter);
app.use('/api/technicians', techniciansRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/users', usersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/accounting', accountingRouter);
app.use('/api/banking', bankingRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/crm', crmRouter);
app.use('/api/pos', posRouter);
app.use('/api/search', searchRouter);

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