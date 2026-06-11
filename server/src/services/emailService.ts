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
