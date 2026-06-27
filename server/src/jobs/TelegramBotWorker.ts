import { prisma } from '../index';
import { sendTelegram, getTelegramConfig, sanitizeTelegramMarkdown } from '../services/telegramService';
import { AiService } from '../services/AiService';
import fs from 'fs';

class TelegramBotWorker {
  private offset = 0;
  private isRunning = false;
  
  // Public status variables for health monitoring
  public status: 'healthy' | 'degraded' | 'disabled' = 'disabled';
  public lastSuccessfulPoll: string | null = null;
  public lastError: string | null = null;

  // Track previous status and last logged state to avoid spam logs
  private lastLoggedState: string | null = null;
  private failureCount = 0;

  constructor() {
    // Start asynchronously after 1000ms, ensuring index.ts initialization finishes
    if (process.env.STANDALONE_SCRIPT !== 'true') {
      const isProduction = process.env.NODE_ENV === 'production';
      const isExplicitlyEnabled = process.env.TELEGRAM_BOT_ENABLED === 'true';

      if (!isProduction && !isExplicitlyEnabled) {
        console.log('[TelegramBotWorker] Disabled: Running in non-production environment without explicit TELEGRAM_BOT_ENABLED=true.');
        this.status = 'disabled';
        return;
      }

      const instanceId = process.env.NODE_APP_INSTANCE;
      if (instanceId === undefined || instanceId === '0') {
        setTimeout(() => this.start(), 1000);
      } else {
        console.log(`[TelegramBotWorker] Instance ${instanceId}: Telegram worker disabled to prevent 409 getUpdates conflicts.`);
        this.status = 'disabled';
      }
    }
  }

  private setStatus(
    newStatus: 'healthy' | 'degraded' | 'disabled',
    errorType: 'timeout' | 'invalid_token' | 'other' | null,
    errorMsg: string | null
  ) {
    const prevStatus = this.status;
    this.status = newStatus;
    this.lastError = errorMsg;

    let logState = '';
    if (newStatus === 'disabled') {
      logState = 'TELEGRAM_DISABLED';
    } else if (newStatus === 'degraded') {
      if (errorType === 'timeout') {
        logState = 'TELEGRAM_POLL_TIMEOUT';
      } else if (errorType === 'invalid_token') {
        logState = 'TELEGRAM_INVALID_TOKEN';
      } else {
        logState = 'TELEGRAM_DEGRADED';
      }
    } else if (newStatus === 'healthy') {
      if (prevStatus === 'degraded' || prevStatus === 'disabled') {
        logState = 'TELEGRAM_RECOVERED';
      }
    }

    if (logState && logState !== this.lastLoggedState) {
      console.log(`[TelegramBotWorker] ${logState}${errorMsg ? `: ${errorMsg}` : ''}`);
      this.lastLoggedState = logState;
    }
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.poll();
  }

  private async poll() {
    const BACKOFF_DELAYS = [30000, 60000, 120000, 300000]; // 30s, 60s, 120s, 300s max

    while (this.isRunning) {
      let delay = 1000; // Default sleep delay between successful polls

      try {
        // 1. Environment Variable Validation
        const envEnabled = process.env.TELEGRAM_BOT_ENABLED;
        const envToken = process.env.TELEGRAM_BOT_TOKEN;

        if (envEnabled === 'false') {
          this.setStatus('disabled', null, 'TELEGRAM_BOT_ENABLED is false');
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        let token = (envToken || '').trim();
        let chatId = '';
        let telegramAiEnabled = true;
        let aiEnabled = true;
        let cfg: any = null;

        try {
          // Get DB settings
          cfg = await getTelegramConfig();
          const aiSetting = await prisma.setting.findUnique({ where: { key: 'ai' } });
          const aiConfig = (aiSetting?.value as any) || {};

          telegramAiEnabled = aiConfig.telegram_ai_enabled === true || aiConfig.telegram_ai_enabled === 'true';
          aiEnabled = aiConfig.ai_enabled === true || aiConfig.ai_enabled === 'true';

          if (cfg) {
            if (!token) token = (cfg.bot_token || '').trim();
            chatId = (cfg.chat_id || '').trim();
            // If DB config disables it, respect the user's choice in settings UI
            if (cfg.enabled === false) {
              this.setStatus('disabled', null, 'Disabled in database settings');
              await new Promise(r => setTimeout(r, 1000));
              continue;
            }
          }
        } catch (dbErr: any) {
          // If database is not ready yet, degrade state but do not crash
          this.setStatus('degraded', 'other', 'Database connection failure: ' + dbErr.message);
          
          const backoffDelay = BACKOFF_DELAYS[Math.min(this.failureCount++, BACKOFF_DELAYS.length - 1)];
          await new Promise(r => setTimeout(r, backoffDelay));
          continue;
        }

        // 3. Missing Token Check
        if (!token || token.trim() === '') {
          this.setStatus('disabled', null, 'Bot token is missing or empty');
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        // 4. AI Feature Check
        if (!telegramAiEnabled || !aiEnabled) {
          this.setStatus('disabled', null, 'AI feature or Telegram AI interaction is disabled');
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        // 5. Query Telegram long-polling endpoint with timeout
        const telegramBaseUrl = cfg?.api_base_url || process.env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org';
        const url = `${telegramBaseUrl}/bot${token}/getUpdates?offset=${this.offset}&timeout=8`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // Poll timeout = 10 seconds

        let res: Response;
        try {
          res = await fetch(url, { signal: controller.signal as any }) as any;
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          if (fetchErr.name === 'AbortError') {
            this.setStatus('degraded', 'timeout', 'Polling connection timed out');
          } else {
            this.setStatus('degraded', 'other', fetchErr.message || String(fetchErr));
          }

          const backoffDelay = BACKOFF_DELAYS[Math.min(this.failureCount++, BACKOFF_DELAYS.length - 1)];
          await new Promise(r => setTimeout(r, backoffDelay));
          continue;
        }
        clearTimeout(timeoutId);

        // 6. Handle Invalid Token vs Standard Response Statuses
        if (res.status === 401 || res.status === 404) {
          this.setStatus('degraded', 'invalid_token', 'Invalid bot token');
          const backoffDelay = BACKOFF_DELAYS[Math.min(this.failureCount++, BACKOFF_DELAYS.length - 1)];
          await new Promise(r => setTimeout(r, backoffDelay));
          continue;
        }

        if (!res.ok) {
          this.setStatus('degraded', 'other', `Telegram server error status ${res.status}`);
          const backoffDelay = BACKOFF_DELAYS[Math.min(this.failureCount++, BACKOFF_DELAYS.length - 1)];
          await new Promise(r => setTimeout(r, backoffDelay));
          continue;
        }

        // 7. Parse Data and Reset Failure/Backoff states on success
        const data = await res.json() as any;
        if (data.ok) {
          this.setStatus('healthy', null, null);
          this.lastSuccessfulPoll = new Date().toISOString();
          this.failureCount = 0; // Reset consecutive failures count

          if (data.result && data.result.length > 0) {
            for (const update of data.result) {
              this.offset = update.update_id + 1;
              const message = update.message;
              if (!message || !message.text) continue;

              const chatIdLoc = String(message.chat.id);
              const userText = message.text;

              // Security check: Match sender's chat id (supports comma-separated list of authorized IDs)
              const authorizedChatIds = chatId.split(',').map((id: string) => id.trim()).filter(Boolean);
              if (!authorizedChatIds.includes(chatIdLoc)) {
                console.warn(`[TelegramBotWorker] Unauthorized Chat ID ${chatIdLoc} tried to interact with the bot.`);
                await sendTelegram(`❌ Unauthorized Access. You do not have permissions to query HiSecure ERP. Your Chat ID is ${chatIdLoc}.`, chatIdLoc);
                continue;
              }

              console.log(`[TelegramBotWorker] Processing query from authorized Telegram user: "${userText}"`);

              // Send typing indicator to user
              await fetch(`${telegramBaseUrl}/bot${token}/sendChatAction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatIdLoc, action: 'typing' })
              }).catch(() => {});

              // Process message via shared AiService
              const aiResponse = await AiService.processChatMessage(userText, 1);

              // Send Markdown formatted response back or upload file
              if (aiResponse.startsWith('__FILE_ATTACHMENT__::')) {
                const parts = aiResponse.split('::');
                const filePath = parts[1];
                const fileName = parts[2];
                const caption = parts.slice(3).join('::') || '';
                await this.sendTelegramDocument(filePath, fileName, caption, chatIdLoc, token);
              } else {
                const sendResult = await sendTelegram(aiResponse, chatIdLoc);
                if (!sendResult.success) {
                  console.error(`[TelegramBotWorker] sendTelegram failed to chat ${chatIdLoc}:`, sendResult.error);
                }
              }
            }
          }
        } else {
          this.setStatus('degraded', 'other', data.description || 'Unknown Telegram API Error');
          const backoffDelay = BACKOFF_DELAYS[Math.min(this.failureCount++, BACKOFF_DELAYS.length - 1)];
          await new Promise(r => setTimeout(r, backoffDelay));
          continue;
        }
      } catch (err: any) {
        this.setStatus('degraded', 'other', err.message || String(err));
        const backoffDelay = BACKOFF_DELAYS[Math.min(this.failureCount++, BACKOFF_DELAYS.length - 1)];
        await new Promise(r => setTimeout(r, backoffDelay));
        continue;
      }
      
      // Prevent CPU thrashing
      await new Promise(r => setTimeout(r, delay));
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

      const cfg = await getTelegramConfig();
      const telegramBaseUrl = cfg?.api_base_url || process.env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org';
      const res = await fetch(`${telegramBaseUrl}/bot${botToken}/sendDocument`, {
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
    this.setStatus('disabled', null, 'Stopped Telegram AI worker');
  }
}

export const telegramBotWorker = new TelegramBotWorker();
export default telegramBotWorker;