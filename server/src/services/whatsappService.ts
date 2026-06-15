import { prisma } from '../index';

export async function getWhatsAppConfig() {
  const row = await prisma.setting.findUnique({ where: { key: 'whatsapp' } });
  if (!row || !row.value) return null;
  const v = row.value as any;
  return {
    phone_number_id: v.phone_number_id || '',
    access_token: v.access_token || '',
    business_account_id: v.business_account_id || '',
    enabled: v.enabled === true || v.enabled === 'true',
  };
}

export async function sendWhatsApp(
  to: string,
  message: string,
  _templateName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cfg = await getWhatsAppConfig();
    if (!cfg || !cfg.phone_number_id || !cfg.access_token) {
      return { success: false, error: 'WhatsApp not configured. Go to Settings → WhatsApp to set up.' };
    }
    if (!cfg.enabled) {
      return { success: false, error: 'WhatsApp is disabled in Settings.' };
    }

    // Format phone: ensure starts with country code, no +
    const phone = to.replace(/[^0-9]/g, '');

    const body: any = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: message },
    };

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${cfg.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json() as any;
    if (!res.ok) {
      return { success: false, error: data?.error?.message || 'Meta API error' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send WhatsApp message' };
  }
}
