import { prisma } from '../index';
import { ServiceJobService } from './ServiceJobService';

const jobService = new ServiceJobService();

export class CustomerPortalService {
  // ─── COMPLAINT SUBMISSION ────────────────────────────────────────────────
  async createComplaint(customerId: number, data: {
    problem_description: string;
    items?: Array<{ device_name: string; issue_description: string }>;
  }, userId?: number) {
    // Force customer_id from arguments, ensuring isolation
    return jobService.createServiceJob({
      customer_id: customerId,
      job_type: 'FIELD_SERVICE',
      problem_description: data.problem_description,
      items: data.items
    }, userId);
  }

  // ─── SERVICE JOBS TRACKING ───────────────────────────────────────────────
  async getCustomerJobs(customerId: number) {
    return prisma.serviceJob.findMany({
      where: { customer_id: customerId },
      include: {
        items: true,
        visits: { include: { technician: true } },
        resolutions: { include: { technician: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getCustomerJobById(customerId: number, jobId: number) {
    const job = await prisma.serviceJob.findFirst({
      where: { job_id: jobId, customer_id: customerId },
      include: {
        items: true,
        visits: { include: { technician: true } },
        resolutions: { include: { technician: true } },
        partsConsumed: { include: { part: true } }
      }
    });
    if (!job) throw new Error('SERVICE_JOB_NOT_FOUND');
    return job;
  }

  // ─── AMC CONTRACTS VIEW ──────────────────────────────────────────────────
  async getCustomerContracts(customerId: number) {
    return prisma.amcContract.findMany({
      where: { customer_id: customerId },
      include: {
        assets: { include: { part: true } },
        schedules: true
      },
      orderBy: { created_at: 'desc' }
    });
  }

  // ─── WARRANTY STATUS check ───────────────────────────────────────────────
  async getWarrantyStatus(customerId: number, partId: number) {
    // Find the latest invoice item for this part purchased by the customer
    const invoiceItem = await prisma.salesInvoiceItems.findFirst({
      where: {
        part_id: partId,
        invoice: { customer_id: customerId }
      },
      include: { invoice: true },
      orderBy: { invoice: { invoice_date: 'desc' } }
    });

    if (!invoiceItem) {
      return { active: false, reason: 'No purchase record found for this part.' };
    }

    const purchaseDate = invoiceItem.invoice.invoice_date;
    const isUnderWarranty = await jobService.validateWarranty(partId, purchaseDate);

    return {
      active: isUnderWarranty,
      purchase_date: purchaseDate,
      invoice_number: invoiceItem.invoice.invoice_number,
      warranty_expiry: new Date(new Date(purchaseDate).setFullYear(purchaseDate.getFullYear() + 1))
    };
  }

  // ─── INVOICE LIST & DETAIL ───────────────────────────────────────────────
  async getCustomerInvoices(customerId: number) {
    return prisma.salesInvoice.findMany({
      where: { customer_id: customerId },
      orderBy: { invoice_date: 'desc' }
    });
  }

  async getInvoiceDetail(customerId: number, invoiceId: number) {
    const invoice = await prisma.salesInvoice.findFirst({
      where: { invoice_id: invoiceId, customer_id: customerId },
      include: {
        items: { include: { part: true } },
        customer: true
      }
    });
    if (!invoice) throw new Error('INVOICE_NOT_FOUND');
    return invoice;
  }

  // ─── PAYMENTS VIEW ───────────────────────────────────────────────────────
  async getCustomerPayments(customerId: number) {
    return prisma.payment.findMany({
      where: { repair: { customer_id: customerId } },
      include: { repair: true },
      orderBy: { payment_date: 'desc' }
    });
  }
}
