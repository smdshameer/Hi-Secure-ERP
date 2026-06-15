import { prisma } from '../index';
import { sendTelegram, getTelegramConfig, sanitizeTelegramMarkdown } from '../services/telegramService';
import { AiService } from '../services/AiService';
import fs from 'fs';

class TelegramBotWorker {
  private offset = 0;
  private isRunning = false;

  constructor() {
    setTimeout(() => this.start(), 1000);
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[TelegramBotWorker] Initializing long-polling Telegram AI worker...');
    this.poll();
  }

  private async poll() {
    while (this.isRunning) {
      try {
        const cfg = await getTelegramConfig();
        const aiSetting = await prisma.setting.findUnique({ where: { key: 'ai' } });
        const aiConfig = (aiSetting?.value as any) || {};

        const telegramAiEnabled = aiConfig.telegram_ai_enabled === true || aiConfig.telegram_ai_enabled === 'true';
        const aiEnabled = aiConfig.ai_enabled === true || aiConfig.ai_enabled === 'true';

        if (!cfg || !cfg.bot_token || !telegramAiEnabled || !aiEnabled) {
          // Check again in 15 seconds if config is disabled
          await new Promise(r => setTimeout(r, 15000));
          continue;
        }

        const url = `https://api.telegram.org/bot${cfg.bot_token}/getUpdates?offset=${this.offset}&timeout=10`;
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`[TelegramBotWorker] getUpdates returned status ${res.status}: ${res.statusText}`);
          await new Promise(r => setTimeout(r, 10000));
          continue;
        }

        const data = await res.json() as any;
        if (data.ok && data.result && data.result.length > 0) {
          for (const update of data.result) {
            this.offset = update.update_id + 1;
            const message = update.message;
            if (!message || !message.text) continue;

            const chatId = String(message.chat.id);
            const userText = message.text;

            // Security check: Match sender's chat id
            if (chatId !== String(cfg.chat_id)) {
              console.warn(`[TelegramBotWorker] Unauthorized Chat ID ${chatId} tried to interact with the bot.`);
              await sendTelegram(`❌ Unauthorized Access. You do not have permissions to query HiSecure ERP. Your Chat ID is ${chatId}.`, chatId);
              continue;
            }

            console.log(`[TelegramBotWorker] Processing query from authorized Telegram user: "${userText}"`);

            // Send typing indicator to user
            await fetch(`https://api.telegram.org/bot${cfg.bot_token}/sendChatAction`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, action: 'typing' })
            });

            // Process message via shared AiService
            // Pass admin default ID 1
            const aiResponse = await AiService.processChatMessage(userText, 1);

            // Send Markdown formatted response back or upload file
            if (aiResponse.startsWith('__FILE_ATTACHMENT__::')) {
              const parts = aiResponse.split('::');
              const filePath = parts[1];
              const fileName = parts[2];
              const caption = parts.slice(3).join('::') || '';
              await this.sendTelegramDocument(filePath, fileName, caption, chatId, cfg.bot_token);
            } else {
              const sendResult = await sendTelegram(aiResponse, chatId);
              if (!sendResult.success) {
                console.error(`[TelegramBotWorker] sendTelegram failed to chat ${chatId}:`, sendResult.error);
              }
            }
          }
        }
      } catch (err: any) {
        console.error('[TelegramBotWorker] Error in polling loop:', err.message || err);
        await new Promise(r => setTimeout(r, 10000));
      }
      
      // Prevent CPU thrashing
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  private async sendTelegramDocument(
    filePath: string,
    fileName: string,
    caption: string,
    chatId: string,
    botToken: string
  ): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      const fileBuffer = fs.readFileSync(filePath);
      const mimeType = fileName.endsWith('.xlsx')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      const blob = new Blob([fileBuffer], { type: mimeType });
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('document', blob, fileName);
      formData.append('caption', sanitizeTelegramMarkdown(caption));
      formData.append('parse_mode', 'Markdown');

      const defaultKeyboard = {
        keyboard: [
          [{ text: '📦 Stock Report' }, { text: '🏢 Supplier Report' }],
          [{ text: '📄 Invoices Report' }, { text: '👤 Customers Report' }],
          [{ text: '🔧 Repairs List' }, { text: '📊 System Health' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
      };
      formData.append('reply_markup', JSON.stringify(defaultKeyboard));

      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json() as any;
      if (!res.ok || !data.ok) {
        console.error('[TelegramBotWorker] sendDocument failed:', data);
        await sendTelegram(`❌ Failed to send report file: ${data?.description || 'Telegram API Error'}`, chatId);
      }
    } catch (err: any) {
      console.error('[TelegramBotWorker] sendTelegramDocument error:', err);
      await sendTelegram(`❌ Error generating/sending report document: ${err.message}`, chatId);
    }
  }

  stop() {
    this.isRunning = false;
    console.log('[TelegramBotWorker] Stopped Telegram AI worker.');
  }
}

export const telegramBotWorker = new TelegramBotWorker();