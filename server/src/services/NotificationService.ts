import { NotificationRepository } from '../repositories/NotificationRepository';
import { prisma } from '../index';

export class NotificationService {
  private static noticeRepo = new NotificationRepository();

  /**
   * Mock channel adapters
   */
  static async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    console.log(`[Email Channel] Dispatching to ${to} | Subject: ${subject} | Body: ${body.slice(0, 40)}...`);
    return true;
  }

  static async sendWhatsApp(to: string, message: string): Promise<boolean> {
    console.log(`[WhatsApp Channel] Dispatching to ${to} | Msg: ${message.slice(0, 40)}...`);
    return true;
  }

  static async sendSms(to: string, message: string): Promise<boolean> {
    console.log(`[SMS Channel] Dispatching to ${to} | Msg: ${message.slice(0, 40)}...`);
    return true;
  }

  /**
   * Dispatches a notification with Control 4 Alert Deduplication.
   */
  static async createNotification(data: {
    user_id?: number | null;
    role_id?: number | null;
    type: string;
    message: string;
    priority?: string;
  }) {
    try {
      // Control 4 — Alert Deduplication Check
      const existing = await prisma.notification.findFirst({
        where: {
          user_id: data.user_id || null,
          role_id: data.role_id || null,
          type: data.type,
          message: data.message,
          read_status: false
        }
      });

      if (existing) {
        console.log(`[Notification] Alert Deduplicated (Skipping duplicate): ${data.type}`);
        return existing;
      }

      // Dispatch to mock channels if high priority
      if (data.priority === 'high' || data.priority === 'critical') {
        await this.sendEmail('admin@hisecure.com', `ALERT: ${data.type}`, data.message);
        await this.sendWhatsApp('9876543210', `ALERT: ${data.type} - ${data.message}`);
        await this.sendSms('9876543210', `ALERT: ${data.type} - ${data.message}`);
      }

      const notice = await this.noticeRepo.create({
        user_id: data.user_id || null,
        role_id: data.role_id || null,
        type: data.type,
        message: data.message,
        priority: data.priority || 'medium'
      });
      
      console.log(`[Notification] Created alert type: ${data.type}`);
      return notice;
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  }

  /**
   * Fetches unread or recent notifications belonging to a specific user and their role.
   */
  static async getUserNotifications(userId: number, roleId?: number) {
    const where: any = {
      OR: [
        { user_id: userId }
      ]
    };
    if (roleId) {
      where.OR.push({ role_id: roleId });
    }
    
    const notifications = await prisma.notification.findMany({
      where,
      include: {
        reads: {
          where: { user_id: userId }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 50
    });

    return notifications.map(n => ({
      notification_id: n.notification_id,
      user_id: n.user_id,
      role_id: n.role_id,
      type: n.type,
      message: n.message,
      priority: n.priority,
      read_status: n.reads.length > 0,
      created_at: n.created_at
    }));
  }

  /**
   * Marks a specific notification as read by a specific user.
   */
  static async markAsRead(notificationId: number, userId: number) {
    return prisma.notificationRead.upsert({
      where: {
        notification_id_user_id: {
          notification_id: notificationId,
          user_id: userId
        }
      },
      create: {
        notification_id: notificationId,
        user_id: userId
      },
      update: {}
    });
  }

  /**
   * Marks all notifications for a specific user as read.
   */
  static async markAllAsRead(userId: number, roleId?: number) {
    const where: any = {
      OR: [
        { user_id: userId }
      ],
      reads: {
        none: {
          user_id: userId
        }
      }
    };
    if (roleId) {
      where.OR.push({ role_id: roleId });
    }

    const unreadNotifications = await prisma.notification.findMany({
      where,
      select: { notification_id: true }
    });

    if (unreadNotifications.length === 0) return [];

    const readData = unreadNotifications.map(n => ({
      notification_id: n.notification_id,
      user_id: userId
    }));

    return prisma.notificationRead.createMany({
      data: readData,
      skipDuplicates: true
    });
  }

  /**
   * Trigger Event: Low Stock
   */
  static async triggerLowStock(partId: number, currentQty: number, reorderLevel: number): Promise<void> {
    const part = await prisma.parts.findUnique({ where: { part_id: partId } });
    if (!part) return;

    await this.createNotification({
      role_id: 1, // Management/Admin Role
      type: 'LOW_STOCK',
      message: `Low Stock: Part ${part.part_number} (${part.name}) is at ${currentQty} units (Reorder Level: ${reorderLevel}).`,
      priority: 'high'
    });
  }

  /**
   * Trigger Event: AMC Expiry
   */
  static async triggerAmcExpiry(contractId: number, expiryDate: Date): Promise<void> {
    const contract = await prisma.amcContract.findUnique({
      where: { contract_id: contractId },
      include: { customer: true }
    });
    if (!contract) return;

    await this.createNotification({
      role_id: 1,
      type: 'AMC_EXPIRY',
      message: `AMC Expiry Warning: Contract ${contract.contract_number} for customer ${contract.customer.name} expires on ${expiryDate.toLocaleDateString()}.`,
      priority: 'medium'
    });
  }

  /**
   * Trigger Event: Payment Due
   */
  static async triggerPaymentDue(invoiceId: number, dueDate: Date): Promise<void> {
    const invoice = await prisma.salesInvoice.findUnique({
      where: { invoice_id: invoiceId },
      include: { customer: true }
    });
    if (!invoice) return;

    await this.createNotification({
      role_id: 1,
      type: 'PAYMENT_DUE',
      message: `Payment Due Alert: Invoice ${invoice.invoice_number || 'draft'} for ₹${Number(invoice.grand_total).toFixed(2)} is past due date (${dueDate.toLocaleDateString()}).`,
      priority: 'high'
    });
  }

  /**
   * Trigger Event: Purchase Approval Required
   */
  static async triggerPurchaseApprovalRequired(poId: number, stepNumber: number, roleId: number): Promise<void> {
    const po = await prisma.purchaseOrder.findUnique({ where: { po_id: poId } });
    if (!po) return;

    await this.createNotification({
      role_id: roleId,
      type: 'PURCHASE_APPROVAL_REQUIRED',
      message: `Purchase Approval Required: Purchase Order ${po.po_number} requires Level ${stepNumber} approval.`,
      priority: 'high'
    });
  }

  /**
   * Trigger Event: High Risk Price Change
   */
  static async triggerHighRiskPriceChange(priceChangeId: number, percentage: number): Promise<void> {
    await this.createNotification({
      role_id: 1,
      type: 'HIGH_RISK_PRICE_CHANGE',
      message: `High Risk Price Change: Supplier price change #${priceChangeId} exceeds safety threshold (Change: ${percentage.toFixed(1)}%).`,
      priority: 'high'
    });
  }

  /**
   * Trigger Event: Service SLA Breach
   */
  static async triggerServiceSlaBreach(jobId: number, durationHours: number): Promise<void> {
    const job = await prisma.serviceJob.findUnique({ where: { job_id: jobId } });
    if (!job) return;

    await this.createNotification({
      role_id: 1,
      type: 'SERVICE_SLA_BREACH',
      message: `Service SLA Breach: Job ${job.job_number} (Priority: ${job.priority}) has remained open for ${durationHours.toFixed(1)} hours, breaching limits.`,
      priority: 'high'
    });
  }

  /**
   * Generic template-driven WhatsApp dispatch with database audit logging.
   */
  static async sendWhatsAppTemplate(
    to: string,
    messageType: 'AMC_REMINDER' | 'TICKET_UPDATE' | 'PAYMENT_REMINDER' | 'SERVICE_COMPLETION',
    payload: any
  ): Promise<boolean> {
    let message = '';
    switch (messageType) {
      case 'AMC_REMINDER':
        message = `Dear customer, your AMC contract ${payload.contract_number} is expiring on ${payload.expiry_date}. Please renew it.`;
        break;
      case 'TICKET_UPDATE':
        message = `Dear customer, your ticket ${payload.job_number} status has been updated to ${payload.status}.`;
        break;
      case 'PAYMENT_REMINDER':
        message = `Dear customer, payment of ₹${Number(payload.amount).toFixed(2)} for invoice ${payload.invoice_number} is outstanding. Due date: ${payload.due_date}.`;
        break;
      case 'SERVICE_COMPLETION':
        message = `Dear customer, your service job ${payload.job_number} was completed successfully. Findings: ${payload.findings}.`;
        break;
      default:
        message = `Alert: Notification of type ${messageType} triggered.`;
    }

    try {
      const success = await this.sendWhatsApp(to, message);
      await prisma.whatsAppLog.create({
        data: {
          recipient_phone: to,
          message_type: messageType,
          payload: payload || {},
          status: success ? 'SENT' : 'FAILED',
          error_message: success ? null : 'Failed to send WhatsApp message via adapter'
        }
      });
      return success;
    } catch (err: any) {
      await prisma.whatsAppLog.create({
        data: {
          recipient_phone: to,
          message_type: messageType,
          payload: payload || {},
          status: 'FAILED',
          error_message: err.message
        }
      });
      return false;
    }
  }
}