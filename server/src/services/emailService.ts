import nodemailer from 'nodemailer';
import { prisma } from '../index';

export async function getEmailConfig() {
  const row = await prisma.setting.findUnique({ where: { key: 'email' } });
  if (!row || !row.value) return null;
  const v = row.value as any;
  return {
    host: v.host || '',
    port: Number(v.port) || 587,
    secure: v.secure === true || v.secure === 'true',
    user: v.user || '',
    pass: v.pass || '',
    from_name: v.from_name || 'HiSecure ERP',
    from_email: v.from_email || v.user || '',
  };
}

export async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cfg = await getEmailConfig();
    if (!cfg || !cfg.host || !cfg.user || !cfg.pass) {
      return { success: false, error: 'Email not configured. Go to Settings → Email to set up.' };
    }
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
      tls: { rejectUnauthorized: false },
    });
    await transporter.sendMail({
      from: `"${cfg.from_name}" <${cfg.from_email}>`,
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send email' };
  }
}

// SaaS Specific Email Service using Environment Variables or falling back to database settings
export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static async getTransporter(): Promise<nodemailer.Transporter | null> {
    if (this.transporter) return this.transporter;

    // First try environment variables
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
      return this.transporter;
    }

    // Fallback to database configurations
    const cfg = await getEmailConfig();
    if (cfg && cfg.host && cfg.user && cfg.pass) {
      this.transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: { user: cfg.user, pass: cfg.pass },
        tls: { rejectUnauthorized: false }
      });
      return this.transporter;
    }

    console.warn('⚠️ SMTP settings not fully configured in environment or database. Running in local console-fallback mode.');
    return null;
  }

  public static async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();

      if (!transporter) {
        console.log(`\n📧 [EMAIL FALLBACK] Sending mail to: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`HTML Content:\n${html}\n------------------------------`);
        return true;
      }

      const cfg = await getEmailConfig();
      const from = cfg 
        ? `"${cfg.from_name}" <${cfg.from_email}>`
        : (process.env.SMTP_FROM || 'Hi-Secure ERP <noreply@hisecure.store>');

      await transporter.sendMail({
        from,
        to,
        subject,
        html
      });
      console.log(`✉️ Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      return false;
    }
  }

  public static async sendPasswordReset(to: string, name: string, resetLink: string): Promise<boolean> {
    const subject = 'Hi-Secure ERP - Password Reset Request';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1a3480; text-align: center;">Hi-Secure ERP</h2>
        <p>Dear ${name || 'User'},</p>
        <p>We received a request to reset your password. You can do this by clicking the link below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #1a3480; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #64748b; font-size: 13px;">This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 30px; margin-bottom: 20px;">
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">Hi Secure Solutions &bull; Secure Enterprise Resource Planning</p>
      </div>
    `;
    return this.sendMail(to, subject, html);
  }

  public static async sendLicenseActivation(to: string, name: string, subdomain: string, licenseKey: string, expiresAt: Date): Promise<boolean> {
    const subject = 'Hi-Secure ERP - SaaS Plan Activated';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1a3480; text-align: center;">Hi-Secure ERP SaaS Activation</h2>
        <p>Dear ${name || 'Customer'},</p>
        <p>Thank you for subscribing! Your Hi-Secure ERP instance has been activated successfully.</p>
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 15px; margin: 20px 0;">
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="color: #64748b; padding-bottom: 5px;">Your ERP URL:</td>
              <td style="font-weight: bold; padding-bottom: 5px;"><a href="https://${subdomain}.hisecure.store" style="color: #1a3480;">https://${subdomain}.hisecure.store</a></td>
            </tr>
            <tr>
              <td style="color: #64748b; padding-bottom: 5px;">Product Key:</td>
              <td style="font-family: monospace; font-weight: bold; color: #1e293b; padding-bottom: 5px;">${licenseKey}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Subscription Expires:</td>
              <td style="font-weight: bold; color: #b91c1c;">${new Date(expiresAt).toLocaleDateString()}</td>
            </tr>
          </table>
        </div>
        <p>Click the link above and log in using your registered admin credentials to get started.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 30px; margin-bottom: 20px;">
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">Hi Secure Solutions &bull; Secure Enterprise Resource Planning</p>
      </div>
    `;
    return this.sendMail(to, subject, html);
  }
}
