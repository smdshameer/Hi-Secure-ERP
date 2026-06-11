import { prisma } from '../index';

export async function getTelegramConfig() {
  const row = await prisma.setting.findUnique({ where: { key: 'telegram' } });
  if (!row || !row.value) return null;
  const v = row.value as any;
  return {
    bot_token: v.bot_token || '',
    chat_id: v.chat_id || '',
    enabled: v.enabled === true || v.enabled === 'true',
  };
}

export async function sendTelegram(
  message: string,
  chatIdOverride?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cfg = await getTelegramConfig();
    if (!cfg || !cfg.bot_token) {
      return { success: false, error: 'Telegram not configured. Go to Settings → Telegram to set up.' };
    }
    if (!cfg.enabled) {
      return { success: false, error: 'Telegram is disabled in Settings.' };
    }

    const chatId = chatIdOverride || cfg.chat_id;
    if (!chatId) {
      return { success: false, error: 'No Telegram Chat ID configured.' };
    }

    const res = await fetch(
      `https://api.telegram.org/bot${cfg.bot_token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );

    const data = await res.json() as any;
    if (!res.ok || !data.ok) {
      return { success: false, error: data?.description || 'Telegram API error' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send Telegram message' };
  }
}
