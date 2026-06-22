import { prisma } from '../index';

export async function getTelegramConfig() {
  const row = await prisma.setting.findUnique({ where: { key: 'telegram' } });
  if (!row || !row.value) return null;
  const v = row.value as any;
  return {
    bot_token: v.bot_token || '',
    chat_id: v.chat_id || '',
    enabled: v.enabled === true || v.enabled === 'true',
    api_base_url: v.api_base_url || '',
  };
}

export async function sendTelegram(
  message: string,
  chatIdOverride?: string,
  replyMarkupOverride?: any
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

    const defaultKeyboard = {
      keyboard: [
        [{ text: '📦 Stock Report' }, { text: '🏢 Supplier Report' }],
        [{ text: '📄 Invoices Report' }, { text: '👤 Customers Report' }],
        [{ text: '🔧 Repairs List' }, { text: '📊 System Health' }]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    };

    const sanitizedMessage = sanitizeTelegramMarkdown(message);

    const telegramBaseUrl = cfg.api_base_url || process.env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org';
    const res = await fetch(
      `${telegramBaseUrl}/bot${cfg.bot_token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: sanitizedMessage,
          parse_mode: 'Markdown',
          reply_markup: replyMarkupOverride !== undefined ? replyMarkupOverride : defaultKeyboard,
        }),
      }
    );

    const data = await res.json() as any;
    if (!res.ok || !data.ok) {
      const isParseError = data?.description && (
        data.description.includes("can't parse") ||
        data.description.includes("entity") ||
        data.description.includes("parse_mode") ||
        data.description.includes("markdown")
      );
      if (isParseError) {
        console.warn(`[telegramService] Telegram Markdown parsing failed. Retrying in plain text. Error: ${data.description}`);
        const fallbackRes = await fetch(
          `${telegramBaseUrl}/bot${cfg.bot_token}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              reply_markup: replyMarkupOverride !== undefined ? replyMarkupOverride : defaultKeyboard,
            }),
          }
        );
        const fallbackData = await fallbackRes.json() as any;
        if (fallbackRes.ok && fallbackData.ok) {
          return { success: true };
        }
        return { success: false, error: fallbackData?.description || 'Fallback Telegram API error' };
      }
      return { success: false, error: data?.description || 'Telegram API error' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send Telegram message' };
  }
}

export function sanitizeTelegramMarkdown(text: string): string {
  if (!text) return '';
  
  // Split by backticks (code blocks / inline code) to avoid escaping formatting characters inside code
  const parts = text.split(/(`+)/);
  let inCode = false;
  let codeDelim = '';
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith('`')) {
      if (!inCode) {
        inCode = true;
        codeDelim = part;
      } else if (part === codeDelim) {
        inCode = false;
      }
      continue;
    }
    
    if (inCode) {
      // Inside a code block or inline code. Do not escape.
      continue;
    }
    
    // Outside code. Sanitize formatting.
    let cleaned = part;
    
    // 1. Convert standard Markdown bullet points starting with asterisk (* ) to bullet character (• )
    cleaned = cleaned.replace(/^(\s*)\*\s+/gm, '$1• ');
    
    // 2. Convert standard Markdown double asterisks (bold) to Telegram V1 single asterisk
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '*$1*');
    
    // 3. Escape all underscores (_) as (\_) to prevent Telegram V1 italics parsing errors
    cleaned = cleaned.replace(/_/g, '\\_');
    
    parts[i] = cleaned;
  }
  
  return parts.join('');
}
