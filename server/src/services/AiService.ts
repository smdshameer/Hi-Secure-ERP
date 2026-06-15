import { prisma } from '../index';
import { BackupService } from './BackupService';
import { SystemHealthService } from './SystemHealthService';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import { AuditService } from './AuditService';

export class AiService {
  private static modelCoolDowns = new Map<string, number>();

  /**
   * Loads AI configuration from settings in the database
   */
  private static async getAiConfig() {
    const row = await prisma.setting.findUnique({ where: { key: 'ai' } });
    if (!row || !row.value) return null;
    const v = row.value as any;
    return {
      ai_enabled: v.ai_enabled === true || v.ai_enabled === 'true',
      nvidia_api_key: v.nvidia_api_key || '',
      model_id: v.model_id || 'stepfun-ai/step-3.7-flash',
      telegram_ai_enabled: v.telegram_ai_enabled === true || v.telegram_ai_enabled === 'true'
    };
  }

  /**
   * Main message processing loop with tool invocation support (OpenAI compat)
   */
  static async processChatMessage(message: string, _userId: number): Promise<string> {
    const rawResponse = await this.executeChatMessage(message, _userId);
    let cleaned = this.wrapAndAlignTables(rawResponse);

    // Clean up unnecessary code block wrapping (like ```markdown ... ```) that the LLM might have outputted around lists or text cards
    cleaned = cleaned.replace(/```markdown\s+([\s\S]*?)\s*```/g, '$1');
    cleaned = cleaned.replace(/```\s*([\s\S]*?)\s*```/g, (match, p1) => {
      // If it doesn't look like a code snippet or table (doesn't contain | or multiple lines of code), strip the backticks
      if (!p1.includes('|') && !p1.includes('const ') && !p1.includes('function ') && !p1.includes('class ')) {
        return p1;
      }
      return match;
    });

    // Clean up nested markdown formatting like *Metric: **Status*** to prevent Telegram V1 parser issues
    cleaned = cleaned.replace(/\*([^*:\n]+):\s*\*\*([^*:\n]+)\*\*\*/g, '*$1*: **$2**');

    // Audit AI usage
    await AuditService.log(
      _userId,
      null,
      'AI_CHAT',
      'AiAssistant',
      0,
      { query: message },
      { response: cleaned }
    );

    return cleaned;
  }

  private static async executeChatMessage(message: string, _userId: number): Promise<string> {
    const config = await this.getAiConfig();
    if (!config || !config.ai_enabled || !config.nvidia_api_key) {
      return 'Hi-Secure AI is currently disabled or API credentials are not configured. Please go to Settings → AI Assistant to enable it and enter your NVIDIA NIM API Key.';
    }

    const systemPrompt = `You are "Hi-Secure AI", the premium intelligent ERP assistant for Hi Secure Solutions.
Your goal is to assist the user in managing their inventory, accounting ledger, sales invoices, repairs, and system configurations.
You have access to real-time tools to inspect database tables and execute actions like taking database backups.
Always keep your answers concise, professional, and clear. Format your tables and lists in Markdown.
Always wrap markdown tables (with pipes and dashes) in monospaced code blocks using triple backticks (\`\`\`) so they align perfectly.
Do NOT wrap lists, cards, bullet points, or regular text responses in triple backticks (or any code blocks), as it prevents Telegram from rendering bold, italic, and emoji styles.
If the user asks you to perform an action (like running a backup or checking ledger health), always run the corresponding tool and report the result.
When generating reports, if the user does not specify a format, always default to "pdf" format and invoke the tool immediately without asking the user for confirmation or format options.
If the user clicks "🔧 Repairs List" or requests a repairs list/report, invoke the "generate_report" tool with report_type="repairs" and format="pdf".
If the user clicks "📊 System Health" or requests system health status/report, invoke the "get_system_health" tool. Format the response as a premium system status dashboard text message exactly like this:
📊 *Hi-Secure Solutions ERP System Health*
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
[Status Emoji] *Overall Status*: **[Overall Status]**

🖥 *Server Infrastructure*
• *Platform*: [Platform Name] (e.g. Windows)
• *Node Version*: [Version]
• *Memory Used*: [Memory MB] MB
• *CPU Cores*: [Cores Count] Cores
• *Uptime*: [Formatted Uptime, e.g. 2 hours 15 minutes]

🗄 *Database & Connection*
• *PostgreSQL Connection*: [Status]
• *Latency*: [Latency] ms

⚙️ *Application Services*
• *Redis Cache*: [Friendly Status, e.g. Active or Inactive (Memory Fallback)]
• *Job Queue*: [Status] ([Active jobs count] active, [Failed jobs count] failed)
• *File Storage*: [Status] ([Uploads count] uploads stored)
• *SMTP Relay*: [Status] [Brief error reason if any, e.g. (Connection Refused)]
• *GST Public API*: [Status]
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
Ensure all statuses are formatted with clean emojis (🟢 for healthy, 🔴 for unhealthy, ⚠️ or 🟡 for fallback). Do NOT print raw underscores (e.g. replace "Windows_NT" with "Windows", and "inactive_memory_fallback" with "Inactive (Memory Fallback)"). Do NOT nest markdown formatting tags (never put bold inside italic like *Metric: **Status***). Use simple, clean, flat markdown (e.g. • *Label*: **Value**).
For general greetings, simple chit-chat, or introductions (such as "Hi", "Hello", "Hey", "Who are you?"), do NOT request any tools. Instead, respond directly with a warm, friendly, professional greeting, introducing yourself as "Hi-Secure AI" and briefly stating how you can assist the user.`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_parts',
          description: 'Search parts inventory. Returns lists of items, current stock quantities, cost, and selling price.',
          parameters: {
            type: 'object',
            properties: {
              search: { type: 'string', description: 'Search query for name, part number (SKU), or HSN code' },
              brand_id: { type: 'number', description: 'Filter by brand ID' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_invoices',
          description: 'Find sales invoices by number, status, or date range.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Invoice number pattern' },
              status: { type: 'string', enum: ['paid', 'unpaid', 'draft'], description: 'Filter by invoice payment status' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_customers',
          description: 'Look up customers in the directory by name, code, or phone number.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Customer name, code, or phone number' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_repairs',
          description: 'Search active or completed repair tickets and assignees.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Ticket number or customer identifier' },
              status: { type: 'string', description: 'Status: received, diagnosed, awaiting_parts, in_repair, ready_for_pickup, completed, cancelled' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_system_health',
          description: 'Checks current ERP node server status, PostgreSQL database connection latency, platforms info, and memory stats.',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'run_backup',
          description: 'Trigger a manual database backup (JSON or SQL) and save it locally and to Google Drive if configured.',
          parameters: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['daily', 'weekly'], description: 'Backup type (default: daily)' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_ledger_status',
          description: 'Performs a double-entry ledger audit verification, calculating debits vs credits for all journal entries.',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'generate_report',
          description: 'Generates structured business reports (stock inventory, today invoices, customer directory, supplier directory, purchase orders, sales revenue, or repairs list) in PDF or Excel format.',
          parameters: {
            type: 'object',
            properties: {
              report_type: { type: 'string', enum: ['stock', 'invoices', 'customers', 'suppliers', 'purchases', 'revenue', 'repairs', 'quotations'], description: 'The type of report' },
              format: { type: 'string', enum: ['pdf', 'excel'], description: 'File format of report' }
            },
            required: ['report_type', 'format']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'generate_invoice_pdf',
          description: 'Generates a beautiful professional sales invoice PDF for a specific invoice number or a customer name (matches their latest invoice). Use this when the user asks for a customer invoice (e.g. "Send Shakila customer invoice") rather than a general report.',
          parameters: {
            type: 'object',
            properties: {
              invoice_number: { type: 'string', description: 'The invoice number (e.g. INV-2026-06-00096) or customer name' },
              customer_name: { type: 'string', description: 'Optional customer name to locate their latest invoice' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_suppliers',
          description: 'Look up suppliers in the directory by name, code, or phone number.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Supplier name, code, or phone number' }
            }
          }
        }
      }
    ];

    const maxIterations = 5;
    let lastToolCallSignature = '';
    const primaryModel = config.model_id;
    const fallbacks = [
      'stepfun-ai/step-3.7-flash',
      'stepfun-ai/step-3.5-flash',
      'mistralai/ministral-14b-instruct-2512',
      'meta/llama-3.2-11b-vision-instruct',
      'moonshotai/kimi-k2.6',
      'upstage/solar-10.7b-instruct',
      'google/gemma-3n-e2b-it',
      'google/gemma-3n-e4b-it',
      'meta/llama-3.2-90b-vision-instruct',
      'meta/llama-3.1-8b-instruct',
      'meta/llama-4-maverick-17b-128e-instruct',
      'google/diffusiongemma-26b-a4b-it',
      'nvidia/nemotron-mini-4b-instruct',
      'meta/llama-3.2-3b-instruct',
      'google/gemma-2-2b-it',
      'meta/llama-3.2-1b-instruct',
      'bytedance/seed-oss-36b-instruct',
      'mistralai/mixtral-8x7b-instruct-v0.1',
      'mistralai/mistral-large-3-675b-instruct-2512',
      'meta/llama-3.1-70b-instruct'
    ];
    
    const now = Date.now();
    const activeModels: string[] = [];
    const coolDownModels: string[] = [];
    const allCandidates = [primaryModel, ...fallbacks.filter(m => m !== primaryModel)];
    for (const m of allCandidates) {
      const coolDownUntil = this.modelCoolDowns.get(m) || 0;
      if (coolDownUntil > now) {
        coolDownModels.push(m);
      } else {
        activeModels.push(m);
      }
    }
    const modelsToTry = [...activeModels, ...coolDownModels];

    for (let i = 0; i < maxIterations; i++) {
      try {
        let response: any = null;
        let resData: any = null;
        let modelUsed = '';

        for (const modelCandidate of modelsToTry) {
          try {
            console.log(`[Hi-Secure AI] Querying model ${modelCandidate}... (Iteration ${i + 1})`);
            const fetchRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${config.nvidia_api_key}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: modelCandidate,
                messages,
                tools,
                tool_choice: 'auto',
                temperature: 0.2
              })
            });

            const data = await fetchRes.json() as any;
            if (fetchRes.ok) {
              response = fetchRes;
              resData = data;
              modelUsed = modelCandidate;
              break;
            } else {
              console.warn(`[Hi-Secure AI] Model ${modelCandidate} failed with status ${fetchRes.status}:`, data?.error?.message || data);
              if (fetchRes.status === 429 || fetchRes.status >= 500) {
                console.log(`[Hi-Secure AI] Putting model ${modelCandidate} on 1-minute cooldown.`);
                this.modelCoolDowns.set(modelCandidate, Date.now() + 60000);
              }
            }
          } catch (fetchErr: any) {
            console.warn(`[Hi-Secure AI] Network error querying model ${modelCandidate}:`, fetchErr.message);
          }
        }

        if (!response) {
          return 'Failed to communicate with NVIDIA NIM API. All fallback models were exhausted.';
        }

        const choice = resData?.choices?.[0];
        const choiceMessage = choice?.message;
        if (!choiceMessage) {
          return 'Sorry, I did not receive a valid response block from the AI server.';
        }

        // Push model's intermediate message to history
        messages.push(choiceMessage);

        const toolCalls = choiceMessage.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
          // No tools to execute, return the final response
          return choiceMessage.content || 'I completed processing but have nothing to say.';
        }

        // Detect infinite loop of tool calls
        const signature = JSON.stringify(toolCalls.map((tc: any) => ({ name: tc.function.name, args: tc.function.arguments })));
        if (signature === lastToolCallSignature) {
          console.warn(`[Hi-Secure AI] Detected repeating tool call loop: ${signature}. Breaking and formatting last tool results.`);
          break;
        }
        lastToolCallSignature = signature;

        // Handle tool calls
        for (const tc of toolCalls) {
          const fnName = tc.function.name;
          let fnArgs: any = {};
          try {
            fnArgs = JSON.parse(tc.function.arguments || '{}');
          } catch (e) {
            console.warn('[Hi-Secure AI] Failed to parse function args:', e);
          }

          console.log(`[Hi-Secure AI] Model requested tool: ${fnName} with args:`, fnArgs);
          let toolResult = '';

          try {
            // RBAC security check for AI tool executions
            const userRoles = await prisma.userRole.findMany({
              where: { user_id: _userId },
              include: { role: { include: { permissions: { include: { permission: true } } } } }
            });
            const userPermissions = new Set(userRoles.flatMap(ur => ur.role.permissions.map(rp => rp.permission.name)));

            let isAuthorized = false;
            if (userPermissions.has('users:manage')) {
              isAuthorized = true; // Admin can run any AI tools
            } else {
              switch (fnName) {
                case 'search_parts':
                  isAuthorized = userPermissions.has('invoice:create') || userPermissions.has('purchase:create') || userPermissions.has('repairs:create');
                  break;
                case 'search_invoices':
                  isAuthorized = userPermissions.has('invoice:view');
                  break;
                case 'search_customers':
                  isAuthorized = userPermissions.has('invoice:view') || userPermissions.has('repairs:create');
                  break;
                case 'search_repairs':
                  isAuthorized = userPermissions.has('repairs:create') || userPermissions.has('repairs:update_status');
                  break;
                case 'search_suppliers':
                  isAuthorized = userPermissions.has('purchase:create') || userPermissions.has('purchase:receive');
                  break;
                case 'get_ledger_status':
                  isAuthorized = userPermissions.has('ledger:view');
                  break;
                case 'run_backup':
                case 'get_system_health':
                  isAuthorized = userPermissions.has('settings:edit');
                  break;
                case 'generate_invoice_pdf':
                  isAuthorized = userPermissions.has('invoice:view');
                  break;
                case 'generate_report': {
                  const repType = String(fnArgs.report_type || '').toLowerCase();
                  if (repType === 'stock') {
                    isAuthorized = userPermissions.has('purchase:create') || userPermissions.has('purchase:receive');
                  } else if (repType === 'invoices' || repType === 'revenue') {
                    isAuthorized = userPermissions.has('invoice:view') || userPermissions.has('ledger:view');
                  } else if (repType === 'customers') {
                    isAuthorized = userPermissions.has('invoice:view') || userPermissions.has('repairs:create');
                  } else if (repType === 'suppliers' || repType === 'purchases') {
                    isAuthorized = userPermissions.has('purchase:create') || userPermissions.has('purchase:receive');
                  } else if (repType === 'repairs') {
                    isAuthorized = userPermissions.has('repairs:create') || userPermissions.has('repairs:update_status');
                  } else if (repType === 'quotations') {
                    isAuthorized = userPermissions.has('invoice:view');
                  } else {
                    isAuthorized = false;
                  }
                  break;
                }
                default:
                  isAuthorized = false;
              }
            }

            if (!isAuthorized) {
              toolResult = JSON.stringify({ error: `Unauthorized: You do not have permission to execute the tool "${fnName}".` });
            } else {
              switch (fnName) {
                case 'search_parts':
                  toolResult = JSON.stringify(await this.toolSearchParts(fnArgs.search, fnArgs.brand_id));
                  break;
                case 'search_invoices':
                  toolResult = JSON.stringify(await this.toolSearchInvoices(fnArgs.query, fnArgs.status));
                  break;
                case 'search_customers':
                  toolResult = JSON.stringify(await this.toolSearchCustomers(fnArgs.query));
                  break;
                case 'search_repairs':
                  toolResult = JSON.stringify(await this.toolSearchRepairs(fnArgs.query, fnArgs.status));
                  break;
                case 'get_system_health':
                  toolResult = JSON.stringify(await this.toolGetSystemHealth());
                  break;
                case 'run_backup':
                  toolResult = JSON.stringify(await this.toolRunBackup(fnArgs.type || 'daily'));
                  break;
                case 'get_ledger_status':
                  toolResult = JSON.stringify(await this.toolGetLedgerStatus());
                  break;
                case 'generate_report':
                  toolResult = await this.toolGenerateReport(fnArgs.report_type, fnArgs.format);
                  break;
                case 'generate_invoice_pdf':
                  toolResult = await this.toolGenerateInvoicePdf(fnArgs.invoice_number, fnArgs.customer_name);
                  break;
                case 'search_suppliers':
                  toolResult = JSON.stringify(await this.toolSearchSuppliers(fnArgs.query));
                  break;
                default:
                  toolResult = JSON.stringify({ error: `Tool ${fnName} not implemented.` });
              }
            }
          } catch (err: any) {
            console.error(`[Hi-Secure AI] Tool ${fnName} execution failed:`, err);
            toolResult = JSON.stringify({ error: err.message || 'Execution error' });
          }

          // If the tool returned a file attachment instruction, return it immediately
          if (typeof toolResult === 'string' && toolResult.startsWith('__FILE_ATTACHMENT__::')) {
            return toolResult;
          }

          // If the tool is get_system_health, format and return it immediately
          if (fnName === 'get_system_health') {
            return this.formatJsonToMarkdown(toolResult);
          }

          // Push tool execution result to history
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            name: fnName,
            content: toolResult
          });
        }
      } catch (err: any) {
        console.error('[Hi-Secure AI] Network or execution error:', err);
        return `Failed to complete request: ${err.message || err}`;
      }
    }

    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'tool') {
      try {
        return this.formatJsonToMarkdown(lastMsg.content);
      } catch (e) {
        return lastMsg.content || 'Execution stopped.';
      }
    }
    return lastMsg?.content || 'I reached my maximum reasoning iteration threshold.';
  }

  private static formatJsonToMarkdown(data: any): string {
    if (!data) return 'No data available.';
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;

      // Handle nested response with count metadata
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        if (parsed.node_version !== undefined && parsed.database_status !== undefined) {
          const overallStatus = parsed.status === 'healthy' ? '🟢 **healthy**' : '🔴 **unhealthy**';
          const dbStatus = parsed.database_status === 'healthy' ? '🟢 **healthy**' : '🔴 **unhealthy**';
          const redisStatus = parsed.redis_status === 'healthy' ? '🟢 **healthy**' : (parsed.redis_status === 'inactive_memory_fallback' ? '🟡 **Inactive (Memory Fallback)**' : '🔴 **unhealthy**');
          const queueStatus = parsed.queue_status === 'healthy' ? '🟢 **healthy**' : '🔴 **unhealthy**';
          const storageStatus = parsed.storage_status === 'healthy' ? '🟢 **healthy**' : '🔴 **unhealthy**';
          const smtpStatus = parsed.smtp_status === 'healthy' ? '🟢 **healthy**' : (parsed.smtp_status === 'inactive' ? '🟡 **Inactive (Not Configured)**' : '🔴 **unhealthy**');
          const gstStatus = parsed.gst_service_status === 'healthy' ? '🟢 **healthy**' : '🔴 **unhealthy**';
          
          const uptimeSec = Number(parsed.uptime_seconds || 0);
          const hrs = Math.floor(uptimeSec / 3600);
          const mins = Math.floor((uptimeSec % 3600) / 60);
          const secs = uptimeSec % 60;
          const uptimeStr = `${hrs} hours ${mins} minutes ${secs} seconds`;
          
          const smtpErrorStr = parsed.smtp_error ? ` (Error: ${parsed.smtp_error})` : '';

          return `📊 *Hi-Secure Solutions ERP System Health*
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
${overallStatus} *Overall Status*

🖥 *Server Infrastructure*
• *Platform*: **${parsed.platform === 'win32' ? 'Windows' : parsed.platform}**
• *Node Version*: **${parsed.node_version}**
• *Memory Used*: **${parsed.memory_used_mb} MB**
• *CPU Cores*: **${parsed.cpu_cores} Cores**
• *Uptime*: **${uptimeStr}**

🗄 *Database & Connection*
• *PostgreSQL Connection*: ${dbStatus}
• *Latency*: **${parsed.database_latency_ms} ms**

⚙️ *Application Services*
• *Redis Cache*: ${redisStatus}
• *Job Queue*: ${queueStatus} (${parsed.queue_active_jobs} active, ${parsed.queue_failed_jobs} failed)
• *File Storage*: ${storageStatus} (${parsed.storage_uploads_count} uploads stored)
• *SMTP Relay*: ${smtpStatus}${smtpErrorStr}
• *GST Public API*: ${gstStatus}
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;
        }

        if (parsed.total_active_products_in_system !== undefined && Array.isArray(parsed.matching_parts)) {
          const countStr = `📊 *Total Products in System*: ${parsed.total_active_products_in_system}\n\n`;
          if (parsed.matching_parts.length === 0) {
            return `${countStr}No product records found matching your query.`;
          }
          const formattedList = this.formatJsonToMarkdown(parsed.matching_parts);
          let suffix = '';
          if (parsed.total_active_products_in_system > parsed.matching_parts.length) {
            suffix = `\n\n💡 *Note:* Showing first ${parsed.matching_parts.length} of ${parsed.total_active_products_in_system} products. Type a brand name (e.g., "Hikvision") or model number to search specific items.`;
          }
          return `${countStr}${formattedList}${suffix}`;
        }
      }
      
      // If it is an array of objects
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return 'No records found.';
        
        const keys = Array.from(new Set(parsed.flatMap(item => Object.keys(item))));
        const labelMap: Record<string, string> = {
          part_number: 'Part Number',
          name: 'Name',
          brand: 'Brand',
          cost_price: 'Cost',
          selling_price: 'Selling Price',
          tax_rate: 'GST',
          stock_quantity: 'Stock',
          locations: 'Locations',
          invoice_number: 'Invoice No',
          customer_name: 'Customer',
          date: 'Date',
          due_date: 'Due Date',
          total: 'Total',
          tax: 'Tax',
          grand_total: 'Grand Total',
          status: 'Status',
          customer_code: 'Customer Code',
          phone: 'Phone',
          email: 'Email',
          gstin: 'GSTIN',
          customer_type: 'Type',
          ticket_number: 'Ticket No',
          product_type: 'Product',
          serial_number: 'Serial No',
          repair_status: 'Repair Status',
          estimated_cost: 'Est Cost',
          assigned_technician: 'Technician',
          received_date: 'Received Date',
          supplier_code: 'Supplier Code',
          contact_person: 'Contact Person',
          pan: 'PAN',
          address: 'Address',
          city: 'City',
          state: 'State',
          pincode: 'Pincode',
          po_number: 'PO Number',
          supplier_name: 'Supplier',
          order_date: 'Order Date',
          expected_delivery: 'Expected Delivery'
        };

        const displayKeys = keys.filter(k => !k.endsWith('_id') && k !== 'part_id');
        if (displayKeys.length === 0) return JSON.stringify(parsed, null, 2);

        const cardList = parsed.map((item: any, idx: number) => {
          const firstKey = displayKeys[0];
          const firstVal = item[firstKey] !== undefined ? item[firstKey] : '-';
          const firstLabel = labelMap[firstKey] || firstKey;
          
          const details = displayKeys.slice(1).map((k: string) => {
            let val = item[k];
            if (val === undefined || val === null) return null;
            
            // Format price fields
            if (['cost_price', 'selling_price', 'total', 'tax', 'grand_total', 'estimated_cost'].includes(k)) {
              const num = Number(val);
              val = isNaN(num) ? String(val) : `₹${num.toFixed(2)}`;
            }
            // Format dates
            else if (val instanceof Date || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val))) {
              try {
                val = new Date(val).toLocaleDateString('en-IN');
              } catch {
                val = String(val);
              }
            }
            // Format tax rate
            else if (k === 'tax_rate') {
              val = `${val}%`;
            }

            const label = labelMap[k] || k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ');
            return `   • *${label}*: ${val}`;
          }).filter(Boolean).join('\n');

          const icon = ['part_number', 'part_id'].includes(firstKey) ? '📦' : 
                       ['invoice_number', 'invoice_id'].includes(firstKey) ? '📄' : 
                       ['ticket_number', 'repair_id'].includes(firstKey) ? '🔧' : 
                       ['supplier_code', 'supplier_id'].includes(firstKey) ? '🏢' : '👤';

          return `${idx + 1}. ${icon} *${firstLabel}: ${firstVal}*\n${details}`;
        }).join('\n\n');

        return cardList;
      }
      
      // If it is a flat object
      if (typeof parsed === 'object' && parsed !== null) {
        const lines = Object.entries(parsed).map(([key, val]) => {
          let displayVal = val;
          if (typeof val === 'object' && val !== null) {
            displayVal = JSON.stringify(val);
          }
          const cleanKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
          return `• *${cleanKey}*: ${displayVal}`;
        });
        return lines.join('\n');
      }

      return String(data);
    } catch (e) {
      return String(data);
    }
  }

  // ─── Tools Implementations ───────────────────────────────────────

  private static async toolSearchParts(search?: string, brandId?: number) {
    const searchClean = search ? search.trim().toLowerCase() : '';
    const isGenericQuery = !searchClean || 
      /^(all|any|product|products|item|items|part|parts|how\s+many|total|count|list|show\s+me\s+all|everything|erp|software)$/i.test(searchClean);

    const where: any = { is_active: true };
    if (search && !isGenericQuery) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { part_number: { contains: search, mode: 'insensitive' } },
        { hsn_code: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (brandId) where.brand_id = brandId;

    const totalActiveCount = await prisma.parts.count({ where: { is_active: true } });

    const parts = await prisma.parts.findMany({
      where,
      include: {
        stocks: {
          select: { quantity: true, location: { select: { name: true } } }
        },
        brand: { select: { name: true } }
      },
      take: 10
    });

    const mappedParts = parts.map(p => {
      const qty = p.stocks?.reduce((sum: number, s: any) => sum + s.quantity, 0) || 0;
      return {
        part_id: p.part_id,
        part_number: p.part_number,
        name: p.name,
        brand: p.brand?.name || 'Generic',
        cost_price: p.cost_price,
        selling_price: p.selling_price,
        tax_rate: p.tax_rate,
        stock_quantity: qty,
        locations: p.stocks.map((s: any) => `${s.location.name}: ${s.quantity}`).join(', ')
      };
    });

    return {
      total_active_products_in_system: totalActiveCount,
      matching_parts: mappedParts
    };
  }

  private static async toolGenerateReport(reportType: string, format: string): Promise<string> {
    try {
      let headers: string[] = [];
      let keys: string[] = [];
      let data: any[] = [];
      let friendlyName = '';
      
      let totalQty = 0;
      let totalCostValuation = 0;
      let totalSellingValuation = 0;
      let brandQuantities: Record<string, number> = {};

      if (reportType === 'stock') {
        friendlyName = 'Stock_Report';
        headers = ['Part Number', 'Name', 'Brand', 'Cost', 'Selling Price', 'GST', 'Stock'];
        keys = ['part_number', 'name', 'brand', 'cost_price', 'selling_price', 'tax_rate', 'stock_quantity'];

        const parts = await prisma.parts.findMany({
          where: { is_active: true },
          include: { stocks: true, brand: true }
        });

        // Sort in memory: items with stock first, then items with cost > 0, then by name
        parts.sort((a, b) => {
          const qtyA = a.stocks?.reduce((sum: number, s: any) => sum + s.quantity, 0) || 0;
          const qtyB = b.stocks?.reduce((sum: number, s: any) => sum + s.quantity, 0) || 0;
          if (qtyA !== qtyB) return qtyB - qtyA;

          const costA = Number(a.cost_price || 0);
          const costB = Number(b.cost_price || 0);
          if (costA !== costB) return costB - costA;

          return a.name.localeCompare(b.name);
        });

        data = parts.map(p => {
          const qty = p.stocks?.reduce((sum: number, s: any) => sum + s.quantity, 0) || 0;
          const cost = Number(p.cost_price || 0);
          const selling = Number(p.selling_price || 0);

          totalQty += qty;
          totalCostValuation += cost * qty;
          totalSellingValuation += selling * qty;

          const brandName = p.brand?.name || 'Generic';
          brandQuantities[brandName] = (brandQuantities[brandName] || 0) + qty;

          return {
            part_number: p.part_number,
            name: p.name,
            brand: brandName,
            cost_price: `Rs. ${cost.toFixed(2)}`,
            selling_price: `Rs. ${selling.toFixed(2)}`,
            tax_rate: `${p.tax_rate}%`,
            stock_quantity: qty
          };
        });
      } else if (reportType === 'invoices') {
        friendlyName = 'Invoices_Report';
        headers = ['Invoice No', 'Customer', 'Date', 'Amount', 'GST', 'Grand Total', 'Status'];
        keys = ['invoice_number', 'customer_name', 'invoice_date', 'total_amount', 'tax_amount', 'grand_total', 'status'];

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const invoices = await prisma.salesInvoice.findMany({
          where: { invoice_date: { gte: todayStart } },
          include: { customer: true }
        });
        data = invoices.map(i => ({
          invoice_number: i.invoice_number,
          customer_name: i.customer?.name || 'Retail Customer',
          invoice_date: new Date(i.invoice_date).toLocaleDateString('en-IN'),
          total_amount: `Rs. ${Number(i.total_amount).toFixed(2)}`,
          tax_amount: `Rs. ${Number(i.tax_amount).toFixed(2)}`,
          grand_total: `Rs. ${Number(i.grand_total).toFixed(2)}`,
          status: i.status
        }));
      } else if (reportType === 'customers') {
        friendlyName = 'Customers_Report';
        headers = ['Code', 'Name', 'Phone', 'Email', 'GSTIN', 'Type'];
        keys = ['customer_code', 'name', 'phone', 'email', 'gstin', 'customer_type'];

        const customers = await prisma.customer.findMany({
          where: { is_active: true }
        });
        data = customers.map(c => ({
          customer_code: c.customer_code,
          name: c.name,
          phone: c.phone || '-',
          email: c.email || '-',
          gstin: c.gstin || '-',
          customer_type: c.customer_type
        }));
      } else if (reportType === 'revenue') {
        friendlyName = 'Revenue_Report';
        headers = ['Invoice No', 'Customer', 'Date', 'Subtotal', 'Tax', 'Grand Total'];
        keys = ['invoice_number', 'customer_name', 'invoice_date', 'total_amount', 'tax_amount', 'grand_total'];

        const invoices = await prisma.salesInvoice.findMany({
          where: { status: { in: ['paid', 'issued'] } },
          include: { customer: true }
        });
        data = invoices.map(i => ({
          invoice_number: i.invoice_number,
          customer_name: i.customer?.name || 'Retail Customer',
          invoice_date: new Date(i.invoice_date).toLocaleDateString('en-IN'),
          total_amount: `Rs. ${Number(i.total_amount).toFixed(2)}`,
          tax_amount: `Rs. ${Number(i.tax_amount).toFixed(2)}`,
          grand_total: `Rs. ${Number(i.grand_total).toFixed(2)}`
        }));
      } else if (reportType === 'suppliers') {
        friendlyName = 'Suppliers_Report';
        headers = ['Code', 'Name', 'Contact Person', 'Phone', 'Email', 'GSTIN'];
        keys = ['supplier_code', 'name', 'contact_person', 'phone', 'email', 'gstin'];

        const suppliers = await prisma.supplier.findMany({
          where: { is_active: true }
        });
        data = suppliers.map(s => ({
          supplier_code: s.supplier_code,
          name: s.name,
          contact_person: s.contact_person || '-',
          phone: s.phone || '-',
          email: s.email || '-',
          gstin: s.gstin || '-'
        }));
      } else if (reportType === 'purchases') {
        friendlyName = 'Purchases_Report';
        headers = ['PO Number', 'Supplier', 'Order Date', 'Expected Delivery', 'Amount', 'Status'];
        keys = ['po_number', 'supplier_name', 'order_date', 'expected_delivery', 'total_amount', 'status'];

        const pos = await prisma.purchaseOrder.findMany({
          include: { supplier: true }
        });
        data = pos.map(po => ({
          po_number: po.po_number || `PO-${po.po_id}`,
          supplier_name: po.supplier?.name || 'Generic Supplier',
          order_date: new Date(po.order_date).toLocaleDateString('en-IN'),
          expected_delivery: po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString('en-IN') : '-',
          total_amount: `Rs. ${Number(po.total_amount).toFixed(2)}`,
          status: po.status
        }));
      } else if (reportType === 'repairs') {
        friendlyName = 'Repairs_Report';
        headers = ['Ticket No', 'Customer', 'Product', 'Status', 'Est Cost', 'Technician', 'Received Date'];
        keys = ['ticket_number', 'customer_name', 'product_type', 'repair_status', 'estimated_cost', 'assigned_technician', 'received_date'];

        const repairs = await prisma.repair.findMany({
          include: {
            customer: { select: { name: true } },
            assigned_technician: { select: { name: true } }
          },
          orderBy: { received_date: 'desc' }
        });

        data = repairs.map(r => {
          const cost = Number(r.estimated_cost || 0);
          totalQty += 1;
          totalCostValuation += cost;

          return {
            ticket_number: r.ticket_number || `REP-${r.repair_id}`,
            customer_name: r.customer?.name || 'Unknown',
            product_type: r.product_type || '-',
            repair_status: r.repair_status,
            estimated_cost: `Rs. ${cost.toFixed(2)}`,
            assigned_technician: r.assigned_technician?.name || 'Unassigned',
            received_date: r.received_date ? new Date(r.received_date).toLocaleDateString('en-IN') : '-'
          };
        });
      } else if (reportType === 'quotations') {
        friendlyName = 'Quotations_Report';
        headers = ['Quote No', 'Customer', 'Date', 'Valid Until', 'Amount', 'Status'];
        keys = ['quote_number', 'customer_name', 'quote_date', 'valid_until', 'total_amount', 'status'];

        const quotes = await prisma.quotation.findMany({
          include: { customer: true },
          orderBy: { quote_date: 'desc' }
        });

        data = quotes.map(q => {
          const amount = Number(q.total_amount || 0);
          totalQty += 1;
          totalCostValuation += amount;

          return {
            quote_number: q.quote_number || `QT-${q.quote_id}`,
            customer_name: q.customer?.name || 'Unknown',
            quote_date: new Date(q.quote_date).toLocaleDateString('en-IN'),
            valid_until: q.valid_until ? new Date(q.valid_until).toLocaleDateString('en-IN') : '-',
            total_amount: `Rs. ${amount.toFixed(2)}`,
            status: q.status
          };
        });
      } else {
        return JSON.stringify({ error: `Invalid report type: ${reportType}` });
      }

      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      if (format === 'excel') {
        const fileExt = 'xlsx';
        const fileName = `${friendlyName}_${Date.now()}.${fileExt}`;
        const filePath = path.join(tempDir, fileName);

        const excelData = data.map(item => {
          const row: any = {};
          headers.forEach((h, idx) => {
            row[h] = item[keys[idx]];
          });
          return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
        XLSX.writeFile(workbook, filePath);

        return `__FILE_ATTACHMENT__::${filePath}::${fileName}::Here is the requested ${reportType} report in Excel format.`;
      } else {
        const fileExt = 'pdf';
        const fileName = `${friendlyName}_${Date.now()}.${fileExt}`;
        const filePath = path.join(tempDir, fileName);

        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // --- PDF THEME COLORS ---
        const primaryColor = '#1a3480'; // Deep Corporate Blue
        const secondaryColor = '#0f172a'; // Slate dark
        const lightBg = '#f8fafc'; // Very light slate/gray
        const gridColor = '#cbd5e1'; // border gray

        // --- HEADER SECTION (Clean Route-Guide Style Header) ---
        // h1: Hi-Secure Solutions (Centered)
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(18).text('Hi-Secure Solutions', 30, 20, { align: 'center', width: 535 });
        
        // h2: [Type] REPORT (Centered)
        doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(12).text(`${reportType.toUpperCase()} REPORT`, 30, 42, { align: 'center', width: 535 });
        
        // Date: (Centered)
        doc.fillColor('#666666').font('Helvetica').fontSize(8).text(`Generated Date: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}`, 30, 58, { align: 'center', width: 535 });

        // Divider Line
        doc.moveTo(30, 72).lineTo(565, 72).strokeColor(primaryColor).lineWidth(1.5).stroke();

        // Reset coordinates
        doc.y = 85;

        // --- SECTION BANNER BLOCK (Route Overview style) ---
        doc.fillColor(primaryColor).rect(30, doc.y, 535, 20).fill();
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9.5).text(`${reportType.toUpperCase()} OVERVIEW DATA`, 35, doc.y + 6);
        doc.y += 28;

        // --- SUMMARY & METRICS BOX ---
        let sumY = doc.y;

        // Define properties based on report type
        let summaryTitle = '';
        let leftTitle = '';
        let leftItems: { label: string; val: string }[] = [];
        let rightTitle = '';
        let rightItems: { label: string; val: string }[] = [];

        if (reportType === 'stock') {
          summaryTitle = 'STOCK VALUATION & BRAND SUMMARY';
          leftTitle = 'Segment-Wise Stock (Brand)';
          Object.entries(brandQuantities).forEach(([brand, q]) => {
            leftItems.push({ label: `• ${brand}:`, val: `${q} units` });
          });
          rightTitle = 'Stock Valuation Summary';
          rightItems = [
            { label: 'Total Stock Quantity:', val: `${totalQty} units` },
            { label: 'Total Cost Value:', val: `Rs. ${totalCostValuation.toFixed(2)}` },
            { label: 'Total Selling Value:', val: `Rs. ${totalSellingValuation.toFixed(2)}` }
          ];
        } else if (reportType === 'invoices') {
          summaryTitle = 'INVOICE METRICS & STATUS SUMMARY';
          leftTitle = 'Status-Wise Breakdown';
          const statusCounts: Record<string, number> = {};
          data.forEach((item: any) => {
            const st = item.status || 'draft';
            statusCounts[st] = (statusCounts[st] || 0) + 1;
          });
          Object.entries(statusCounts).forEach(([st, count]) => {
            leftItems.push({ label: `• ${st.toUpperCase()}:`, val: `${count} invoices` });
          });

          // Re-calculate or sum from the generated list
          let subtotalVal = 0, taxVal = 0, grandVal = 0;
          data.forEach((item: any) => {
            // Clean the Rs. prefix to calculate sums
            const sub = Number(String(item.total_amount || '').replace('Rs. ', ''));
            const tx = Number(String(item.tax_amount || '').replace('Rs. ', ''));
            const gd = Number(String(item.grand_total || '').replace('Rs. ', ''));
            subtotalVal += isNaN(sub) ? 0 : sub;
            taxVal += isNaN(tx) ? 0 : tx;
            grandVal += isNaN(gd) ? 0 : gd;
          });

          rightTitle = 'Daily Amount Valuation';
          rightItems = [
            { label: 'Total Daily Invoices:', val: `${data.length}` },
            { label: 'Total Subtotal:', val: `Rs. ${subtotalVal.toFixed(2)}` },
            { label: 'Total Tax Amount:', val: `Rs. ${taxVal.toFixed(2)}` },
            { label: 'Total Grand Total:', val: `Rs. ${grandVal.toFixed(2)}` }
          ];
        } else if (reportType === 'customers') {
          summaryTitle = 'CUSTOMER METRICS & SEGMENT SUMMARY';
          leftTitle = 'Customer Types';
          const typeCounts: Record<string, number> = {};
          data.forEach((item: any) => {
            const type = item.customer_type || 'retail';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
          });
          Object.entries(typeCounts).forEach(([type, count]) => {
            leftItems.push({ label: `• ${type.toUpperCase()}:`, val: `${count} customers` });
          });

          rightTitle = 'Directory Overview';
          rightItems = [
            { label: 'Total Customers:', val: `${data.length} active` }
          ];
        } else if (reportType === 'suppliers') {
          summaryTitle = 'SUPPLIER METRICS SUMMARY';
          leftTitle = 'Active Suppliers list';
          leftItems.push({ label: '• Total Suppliers Listed:', val: `${data.length}` });

          rightTitle = 'Directory Overview';
          rightItems = [
            { label: 'Total Active Suppliers:', val: `${data.length}` }
          ];
        } else if (reportType === 'purchases') {
          summaryTitle = 'PURCHASES VALUATION & STATUS SUMMARY';
          leftTitle = 'Status-Wise Purchases';
          const poStatusCounts: Record<string, number> = {};
          data.forEach((item: any) => {
            const st = item.status || 'draft';
            poStatusCounts[st] = (poStatusCounts[st] || 0) + 1;
          });
          Object.entries(poStatusCounts).forEach(([st, count]) => {
            leftItems.push({ label: `• ${st.toUpperCase()}:`, val: `${count} orders` });
          });

          let totalPoVal = 0;
          data.forEach((item: any) => {
            const val = Number(String(item.total_amount || '').replace('Rs. ', ''));
            totalPoVal += isNaN(val) ? 0 : val;
          });

          rightTitle = 'Purchases Value Summary';
          rightItems = [
            { label: 'Total Purchase Orders:', val: `${data.length}` },
            { label: 'Total Ordered Value:', val: `Rs. ${totalPoVal.toFixed(2)}` }
          ];
        } else if (reportType === 'repairs') {
          summaryTitle = 'REPAIRS VALUATION & STATUS SUMMARY';
          leftTitle = 'Status-Wise Repairs';
          const repairStatusCounts: Record<string, number> = {};
          data.forEach((item: any) => {
            const st = item.repair_status || 'received';
            repairStatusCounts[st] = (repairStatusCounts[st] || 0) + 1;
          });
          Object.entries(repairStatusCounts).forEach(([st, count]) => {
            leftItems.push({ label: `• ${st.toUpperCase()}:`, val: `${count} tickets` });
          });

          let totalEstCost = 0;
          data.forEach((item: any) => {
            const val = Number(String(item.estimated_cost || '').replace('Rs. ', ''));
            totalEstCost += isNaN(val) ? 0 : val;
          });

          rightTitle = 'Repairs Value Summary';
          rightItems = [
            { label: 'Total Repair Tickets:', val: `${data.length}` },
            { label: 'Total Estimated Cost:', val: `Rs. ${totalEstCost.toFixed(2)}` }
          ];
        } else if (reportType === 'quotations') {
          summaryTitle = 'QUOTATIONS VALUATION & STATUS SUMMARY';
          leftTitle = 'Status-Wise Quotations';
          const quoteStatusCounts: Record<string, number> = {};
          data.forEach((item: any) => {
            const st = item.status || 'draft';
            quoteStatusCounts[st] = (quoteStatusCounts[st] || 0) + 1;
          });
          Object.entries(quoteStatusCounts).forEach(([st, count]) => {
            leftItems.push({ label: `• ${st.toUpperCase()}:`, val: `${count} quotes` });
          });

          let totalQuoteVal = 0;
          data.forEach((item: any) => {
            const val = Number(String(item.total_amount || '').replace('Rs. ', ''));
            totalQuoteVal += isNaN(val) ? 0 : val;
          });

          rightTitle = 'Quotations Value Summary';
          rightItems = [
            { label: 'Total Quotations:', val: `${data.length}` },
            { label: 'Total Quoted Value:', val: `Rs. ${totalQuoteVal.toFixed(2)}` }
          ];
        } else if (reportType === 'revenue') {
          summaryTitle = 'REVENUE VALUATION & SEGMENT SUMMARY';
          leftTitle = 'Sales Revenue Breakdown';
          leftItems.push({ label: '• Total Paid Invoices:', val: `${data.length}` });

          let totalSubVal = 0, totalTaxVal = 0, totalRevVal = 0;
          data.forEach((item: any) => {
            const sub = Number(String(item.total_amount || '').replace('Rs. ', ''));
            const tx = Number(String(item.tax_amount || '').replace('Rs. ', ''));
            const gd = Number(String(item.grand_total || '').replace('Rs. ', ''));
            totalSubVal += isNaN(sub) ? 0 : sub;
            totalTaxVal += isNaN(tx) ? 0 : tx;
            totalRevVal += isNaN(gd) ? 0 : gd;
          });

          rightTitle = 'Revenue Summary';
          rightItems = [
            { label: 'Total Sales (Excl. Tax):', val: `Rs. ${totalSubVal.toFixed(2)}` },
            { label: 'Total Tax Realized:', val: `Rs. ${totalTaxVal.toFixed(2)}` },
            { label: 'Total Revenue (Inc. Tax):', val: `Rs. ${totalRevVal.toFixed(2)}` }
          ];
        }

        // Render the summary banner & outline box
        if (summaryTitle) {
          // Gold summary header banner
          doc.fillColor('#f59e0b').rect(30, sumY, 535, 20).fill();
          doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9.5).text(summaryTitle, 35, sumY + 6);
          sumY += 26;

          // Compute heights dynamically
          const boxHeight = Math.max(75, 20 + Math.max(leftItems.length, rightItems.length) * 12);

          // Draw outline box
          doc.strokeColor('#f59e0b').lineWidth(1).rect(30, sumY, 535, boxHeight).stroke();

          // Left column
          doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(8.5).text(leftTitle || 'Details Breakdown', 40, sumY + 8);
          let leftY = sumY + 22;
          leftItems.forEach(item => {
            doc.font('Helvetica').fontSize(8).text(item.label, 40, leftY);
            doc.font('Helvetica-Bold').text(item.val, 150, leftY, { align: 'right', width: 80 });
            leftY += 12;
          });

          // Right column
          const valX = 290;
          doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(8.5).text(rightTitle || 'Metrics Summary', valX, sumY + 8);
          
          let rightY = sumY + 22;
          rightItems.forEach(item => {
            doc.font('Helvetica').fontSize(8).text(item.label, valX, rightY);
            doc.font('Helvetica-Bold').text(item.val, valX + 130, rightY, { align: 'right', width: 100 });
            rightY += 12;
          });
          
          doc.y = sumY + boxHeight + 15;
        }

        // Column widths
        let colWidths: number[] = [];
        let colAligns: ('left' | 'right')[] = [];
        if (reportType === 'stock') {
          colWidths = [100, 160, 70, 60, 70, 35, 40];
          colAligns = ['left', 'left', 'left', 'right', 'right', 'right', 'right'];
        } else if (reportType === 'invoices') {
          colWidths = [80, 160, 70, 60, 50, 65, 50];
          colAligns = ['left', 'left', 'left', 'right', 'right', 'right', 'left'];
        } else if (reportType === 'customers') {
          colWidths = [60, 130, 80, 120, 90, 55];
          colAligns = ['left', 'left', 'left', 'left', 'left', 'left'];
        } else if (reportType === 'suppliers') {
          colWidths = [60, 130, 100, 80, 100, 65];
          colAligns = ['left', 'left', 'left', 'left', 'left', 'left'];
        } else if (reportType === 'purchases') {
          colWidths = [80, 150, 80, 80, 75, 70];
          colAligns = ['left', 'left', 'left', 'left', 'right', 'left'];
        } else if (reportType === 'repairs') {
          colWidths = [75, 110, 75, 75, 55, 85, 60];
          colAligns = ['left', 'left', 'left', 'left', 'right', 'left', 'left'];
        } else if (reportType === 'quotations') {
          colWidths = [80, 140, 70, 70, 70, 70];
          colAligns = ['left', 'left', 'left', 'left', 'right', 'left'];
        } else { // revenue
          colWidths = [85, 170, 80, 65, 60, 75];
          colAligns = ['left', 'left', 'left', 'right', 'right', 'right'];
        }

        // Draw Table Header Banner Box (matches Chennai Guide)
        let tableTopY = doc.y;
        let y = doc.y;
        doc.fillColor(primaryColor).rect(30, y, 535, 20).fill();
        
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5);
        headers.forEach((h, i) => {
          const x = 30 + colWidths.slice(0, i).reduce((sum, w) => sum + w, 0);
          doc.text(h, x + 4, y + 6, { width: colWidths[i] - 8, align: colAligns[i] });
        });
        
        doc.y = y + 20;
        tableTopY = y;

        // Draw Rows
        doc.fontSize(8).fillColor(secondaryColor);
        data.forEach((item, rowIdx) => {
          const rowHeights = keys.map((k, i) => {
            const val = item[k] === undefined || item[k] === null ? '-' : String(item[k]);
            return doc.heightOfString(val, { width: colWidths[i] - 8 });
          });
          const maxRowHeight = Math.max(...rowHeights) + 8; // add padding

          // Check for page break based on row height
          if (doc.y + maxRowHeight > 730) {
            // Draw page vertical lines before adding new page
            const tableBottomY = doc.y;
            colWidths.reduce((currentX, width) => {
              doc.moveTo(currentX, tableTopY).lineTo(currentX, tableBottomY).strokeColor(gridColor).lineWidth(0.5).stroke();
              return currentX + width;
            }, 30);
            doc.moveTo(565, tableTopY).lineTo(565, tableBottomY).strokeColor(gridColor).lineWidth(0.5).stroke();
            doc.moveTo(30, tableBottomY).lineTo(565, tableBottomY).strokeColor(gridColor).lineWidth(0.5).stroke();

            doc.addPage();
            tableTopY = doc.y;
            
            y = doc.y;
            doc.fillColor(primaryColor).rect(30, y, 535, 20).fill();
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5);
            headers.forEach((h, i) => {
              const x = 30 + colWidths.slice(0, i).reduce((sum, w) => sum + w, 0);
              doc.text(h, x + 4, y + 6, { width: colWidths[i] - 8, align: colAligns[i] });
            });
            doc.y = y + 20;
            doc.font('Helvetica').fontSize(8).fillColor(secondaryColor);
          }

          y = doc.y;

          // Alternating background color exactly like train route guide table
          if (rowIdx % 2 === 1) {
            doc.fillColor(lightBg).rect(30, y, 535, maxRowHeight).fill();
          }
          doc.fillColor(secondaryColor);

          // Draw cells
          keys.forEach((k, i) => {
            const val = item[k] === undefined || item[k] === null ? '-' : String(item[k]);
            const x = 30 + colWidths.slice(0, i).reduce((sum, w) => sum + w, 0);
            doc.font('Helvetica').fillColor(secondaryColor);
            doc.text(val, x + 4, y + 5, { width: colWidths[i] - 8, align: colAligns[i] });
          });
          
          doc.y = y + maxRowHeight;
          doc.moveTo(30, doc.y).lineTo(565, doc.y).strokeColor(gridColor).lineWidth(0.5).stroke();
        });

        // Close final page borders
        const finalTableBottomY = doc.y;
        colWidths.reduce((currentX, width) => {
          doc.moveTo(currentX, tableTopY).lineTo(currentX, finalTableBottomY).strokeColor(gridColor).lineWidth(0.5).stroke();
          return currentX + width;
        }, 30);
        doc.moveTo(565, tableTopY).lineTo(565, finalTableBottomY).strokeColor(gridColor).lineWidth(0.5).stroke();



        // Footer disclaimer matching style
        doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#666666')
           .text('Generated for your query • Always verify audit records on Hi-Secure ERP system portal • Confidential business data.', 30, doc.page.height - 30, { align: 'center', width: 535 });

        doc.end();

        await new Promise<void>((resolve, reject) => {
          writeStream.on('finish', () => resolve());
          writeStream.on('error', reject);
        });

        return `__FILE_ATTACHMENT__::${filePath}::${fileName}::Here is the requested ${reportType} report in PDF format.`;
      }
    } catch (err: any) {
      console.error('[Hi-Secure AI] Report generation failed:', err);
      return JSON.stringify({ error: err.message || 'Failed to generate report' });
    }
  }

  private static async toolGenerateInvoicePdf(invoiceNumber?: string, customerName?: string): Promise<string> {
    try {
      let invoice = null;
      if (invoiceNumber) {
        invoice = await prisma.salesInvoice.findFirst({
          where: {
            OR: [
              { invoice_number: { equals: invoiceNumber, mode: 'insensitive' } },
              { invoice_number: { contains: invoiceNumber, mode: 'insensitive' } }
            ]
          },
          include: {
            customer: true,
            items: {
              include: {
                part: true
              }
            }
          }
        });
      }

      if (!invoice && customerName) {
        invoice = await prisma.salesInvoice.findFirst({
          where: {
            customer: {
              name: { contains: customerName, mode: 'insensitive' }
            }
          },
          orderBy: {
            invoice_date: 'desc'
          },
          include: {
            customer: true,
            items: {
              include: {
                part: true
              }
            }
          }
        });
      }

      if (!invoice && invoiceNumber) {
        invoice = await prisma.salesInvoice.findFirst({
          where: {
            customer: {
              name: { contains: invoiceNumber, mode: 'insensitive' }
            }
          },
          orderBy: {
            invoice_date: 'desc'
          },
          include: {
            customer: true,
            items: {
              include: {
                part: true
              }
            }
          }
        });
      }

      if (!invoice) {
        return JSON.stringify({ error: `Invoice not found for query: ${invoiceNumber || ''} ${customerName || ''}` });
      }

      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const fileName = `Invoice_${invoice.invoice_number || invoice.invoice_id}_${Date.now()}.pdf`;
      const filePath = path.join(tempDir, fileName);

      const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 20, left: 40, right: 40 } });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // --- PDF THEME COLORS ---
      const primaryColor = '#1a3480'; // Deep Corporate Blue
      const secondaryColor = '#0f172a'; // Slate dark
      const lightBg = '#f8fafc'; // Very light slate/gray
      const gridColor = '#cbd5e1'; // border gray

      // --- HEADER SECTION (Logo on Left, Company Details on Right) ---
      // Logo on top left (vertically centered slightly more relative to right block)
      let logoPath = path.join(__dirname, '../assets/logo.jpg');
      if (!fs.existsSync(logoPath)) {
        logoPath = 'c:/Users/Admin/Desktop/Calude Test/erp-app/server/src/assets/logo.jpg';
      }
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 26, { width: 140 });
      }

      // Company details on top right
      doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(11.5).text('HI-SECURE SOLUTIONS', 300, 18, { align: 'right', width: 255 });
      doc.font('Helvetica').fontSize(8.5).fillColor('#334155');
      doc.text('99, Al-Ahad Complex, Main Road, Thittachery,', 300, 31, { align: 'right', width: 255 });
      doc.text('Nagapattinam - 609703', 300, 41, { align: 'right', width: 255 });
      doc.text('Contact: 9042489993, 9003400586', 300, 51, { align: 'right', width: 255 });
      doc.text('Email: info@hisecuresolutions.com', 300, 61, { align: 'right', width: 255 });
      doc.text('Website: www.hisecuresolutions.com', 300, 71, { align: 'right', width: 255 });
      doc.font('Helvetica-Bold').fillColor(primaryColor).text('GSTIN: 33CMAPM9758H1ZQ', 300, 81, { align: 'right', width: 255 });

      // TAX INVOICE Title (Left-aligned under logo/company details)
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(13.5).text('TAX INVOICE', 40, 79);

      // Divider Line
      doc.moveTo(40, 96).lineTo(555, 96).strokeColor(primaryColor).lineWidth(1.5).stroke();

      // Reset coordinates to after the divider
      doc.y = 106;

      // --- SECTION: Billed To & Invoice Info ---
      doc.fillColor(primaryColor).rect(40, doc.y, 515, 20).fill();
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9.5).text('Billing & Document Details', 45, doc.y + 6);
      
      const startY = doc.y + 28;
      const boxHeight = 105;

      // Draw two side-by-side containers
      // Box 1 (Left): Billed To
      doc.strokeColor(primaryColor).lineWidth(1).rect(40, startY, 250, boxHeight).stroke();
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9).text('Customer Billing Details', 48, startY + 8);
      doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(9.5).text(invoice.customer?.name || 'Retail Customer', 48, startY + 24);
      
      doc.font('Helvetica').fontSize(8);
      let addressY = startY + 38;
      if (invoice.customer?.address) {
        doc.text(invoice.customer.address, 48, addressY, { width: 234 });
        addressY += 24;
      }
      if (invoice.customer?.phone) {
        doc.text(`• Phone: ${invoice.customer.phone}`, 48, addressY);
        addressY += 10;
      }
      if (invoice.customer?.gstin) {
        doc.text(`• GSTIN: ${invoice.customer.gstin}`, 48, addressY);
      }

      // Box 2 (Right): Invoice Info
      doc.strokeColor(primaryColor).lineWidth(1).rect(305, startY, 250, boxHeight).stroke();
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9).text('Invoice Document Details', 313, startY + 8);
      
      doc.fillColor(secondaryColor).font('Helvetica').fontSize(8);
      let metaY = startY + 24;
      
      const metaItems = [
        { label: '• Invoice No:', val: invoice.invoice_number || `INV-${invoice.invoice_id}` },
        { label: '• Invoice Date:', val: new Date(invoice.invoice_date).toLocaleDateString('en-IN') },
        { label: '• Due Date:', val: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : 'Due on Receipt' },
        { label: '• Place of Supply:', val: invoice.place_of_supply || 'Local' },
        { label: '• Payment Status:', val: (invoice.status || 'unpaid').toUpperCase() }
      ];

      metaItems.forEach(item => {
        doc.font('Helvetica-Bold').text(item.label, 313, metaY);
        doc.font('Helvetica').text(item.val, 403, metaY, { width: 140 });
        metaY += 14;
      });

      doc.y = startY + boxHeight + 15;

      // --- SECTION: Products & Services Details (Banner removed as per user request) ---
      doc.y += 10;

      const tableHeaders = ['#', 'Product / Description', 'HSN/SAC', 'Qty', 'Unit Price', 'GST', 'Amount'];
      const tableColWidths = [25, 200, 60, 40, 65, 45, 80];
      const tableColAligns: ('left' | 'right')[] = ['left', 'left', 'left', 'right', 'right', 'right', 'right'];

      let tableTop = doc.y;
      
      // Draw Table Header Background Box
      doc.fillColor(primaryColor).rect(40, tableTop, 515, 20).fill();
      
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5);
      tableHeaders.forEach((h, i) => {
        const x = 40 + tableColWidths.slice(0, i).reduce((sum, w) => sum + w, 0);
        doc.text(h, x + 4, tableTop + 6, { width: tableColWidths[i] - 8, align: tableColAligns[i] });
      });
      
      doc.y = tableTop + 20;
      doc.font('Helvetica').fontSize(8.5).fillColor(secondaryColor);

      // Draw Rows
      const items = invoice.items || [];
      items.forEach((item: any, rowIdx: number) => {
        const currY = doc.y;
        
        // Page break check
        if (currY > 710) {
          // Draw table borders on current page before adding a new one
          const tableBottomY = doc.y;
          tableColWidths.reduce((currentX, width) => {
            doc.moveTo(currentX, tableTop).lineTo(currentX, tableBottomY).strokeColor(gridColor).lineWidth(0.5).stroke();
            return currentX + width;
          }, 40);
          doc.moveTo(555, tableTop).lineTo(555, tableBottomY).strokeColor(gridColor).lineWidth(0.5).stroke();
          doc.moveTo(40, tableBottomY).lineTo(555, tableBottomY).strokeColor(gridColor).lineWidth(0.5).stroke();

          doc.addPage();
          
          const nextY = doc.y;
          tableTop = nextY;
          doc.fillColor(primaryColor).rect(40, nextY, 515, 20).fill();
          doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5);
          tableHeaders.forEach((h, i) => {
            const x = 40 + tableColWidths.slice(0, i).reduce((sum, w) => sum + w, 0);
            doc.text(h, x + 4, nextY + 6, { width: tableColWidths[i] - 8, align: tableColAligns[i] });
          });
          doc.y = nextY + 20;
          doc.font('Helvetica').fontSize(8.5).fillColor(secondaryColor);
        }

        const rowY = doc.y;

        // Alternating background colors
        if (rowIdx % 2 === 1) {
          doc.fillColor(lightBg).rect(40, rowY, 515, 20).fill();
        }
        doc.fillColor(secondaryColor);

        const qty = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        const taxRate = Number(item.tax_rate || 0);
        const totalAmt = Number(item.total_amount || 0);

        const rowData = [
          String(rowIdx + 1),
          `${item.part?.name || 'Item'} (${item.part?.part_number || 'Generic'})`,
          item.part?.hsn_code || '85258900',
          String(qty),
          `Rs. ${unitPrice.toFixed(2)}`,
          `${taxRate}%`,
          `Rs. ${totalAmt.toFixed(2)}`
        ];

        rowData.forEach((val, i) => {
          const x = 40 + tableColWidths.slice(0, i).reduce((sum, w) => sum + w, 0);
          doc.font('Helvetica').fillColor(secondaryColor);
          doc.text(val, x + 4, rowY + 6, { width: tableColWidths[i] - 8, align: tableColAligns[i] });
        });

        doc.y = rowY + 20;
        doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor(gridColor).lineWidth(0.5).stroke();
      });

      // Draw vertical grid borders for final table height
      const finalTableBottomY = doc.y;
      tableColWidths.reduce((currentX, width) => {
        doc.moveTo(currentX, tableTop).lineTo(currentX, finalTableBottomY).strokeColor(gridColor).lineWidth(0.5).stroke();
        return currentX + width;
      }, 40);
      doc.moveTo(555, tableTop).lineTo(555, finalTableBottomY).strokeColor(gridColor).lineWidth(0.5).stroke();

      // --- SECTION: Summary & Grand Total ---
      let sumY = doc.y + 15;
      if (sumY > 640) {
        doc.addPage();
        sumY = doc.y + 15;
      }

      doc.fillColor('#f59e0b').rect(40, sumY, 515, 20).fill(); // Solid orange/gold banner block
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9.5).text('Invoice Totals & Calculation Summary', 45, sumY + 6);
      sumY += 26;

      // Outer outline box for Totals Summary
      const summaryBoxHeight = 82;
      doc.strokeColor('#f59e0b').lineWidth(1).rect(40, sumY, 515, summaryBoxHeight).stroke();

      const summaryX = 350;
      doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(8.5);

      const subtotal = Number(invoice.total_amount || 0);
      const taxTotal = Number(invoice.tax_amount || 0);
      const grandTotal = Number(invoice.grand_total || 0);
      const cgst = Number(invoice.cgst_amount || 0);
      const sgst = Number(invoice.sgst_amount || 0);
      const igst = Number(invoice.igst_amount || 0);

      const summaryRows: { label: string; val: string; isBold?: boolean }[] = [
        { label: 'Subtotal (Excl. Tax):', val: `Rs. ${subtotal.toFixed(2)}` }
      ];

      if (cgst > 0) summaryRows.push({ label: 'CGST:', val: `Rs. ${cgst.toFixed(2)}` });
      if (sgst > 0) summaryRows.push({ label: 'SGST:', val: `Rs. ${sgst.toFixed(2)}` });
      if (igst > 0) summaryRows.push({ label: 'IGST:', val: `Rs. ${igst.toFixed(2)}` });
      if (cgst === 0 && sgst === 0 && igst === 0 && taxTotal > 0) {
        summaryRows.push({ label: 'Tax Amount:', val: `Rs. ${taxTotal.toFixed(2)}` });
      }

      summaryRows.push({ label: 'Grand Total (Inc. Tax):', val: `Rs. ${grandTotal.toFixed(2)}`, isBold: true });

      let currentSumY = sumY + 8;
      summaryRows.forEach(row => {
        if (row.isBold) {
          doc.font('Helvetica-Bold').fontSize(9.5).fillColor(primaryColor);
        } else {
          doc.font('Helvetica').fontSize(8).fillColor(secondaryColor);
        }
        doc.text(row.label, summaryX, currentSumY);
        doc.text(row.val, summaryX + 110, currentSumY, { align: 'right', width: 85 });
        currentSumY += 14;
      });

      // Show payment status inside summary box
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#10b981').text(`PAYMENT STATUS: ${(invoice.status || 'unpaid').toUpperCase()}`, 55, sumY + 35);

      // --- SECTION: Important Notice & Terms ---
      let bottomY = sumY + summaryBoxHeight + 15;
      if (bottomY > 720) {
        doc.addPage();
        bottomY = doc.y + 15;
      }

      doc.fillColor('#ef4444').rect(40, bottomY, 515, 20).fill(); // Solid red banner block
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9.5).text('Important Notice & Terms', 45, bottomY + 6);
      
      const tcBoxHeight = 55;
      doc.strokeColor('#ef4444').lineWidth(1).rect(40, bottomY + 20, 515, tcBoxHeight).stroke();

      doc.fillColor(secondaryColor).font('Helvetica').fontSize(7.5)
         .text('1. Goods once sold will not be taken back or exchanged.', 48, bottomY + 28)
         .text('2. Payments must be made within the due date stated.', 48, bottomY + 38)
         .text('3. Warranty claims are subject to manufacturer policy.', 48, bottomY + 48);

      // Signatory
      doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(8.5).text('For HI-SECURE SOLUTIONS', 380, bottomY + 28, { align: 'right', width: 165 });
      doc.font('Helvetica').fontSize(7.5).fillColor('#666666').text('Authorized Signatory', 380, bottomY + 58, { align: 'right', width: 165 });

      // --- FOOTER SECTION (Italic fine-print) ---
      doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#666666')
         .text('Generated for your query • Always verify invoice details on Hi-Secure ERP system portal • This is a computer-generated tax invoice.', 40, doc.page.height - 30, { align: 'center', width: 515 });

      doc.end();

      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      });

      return `__FILE_ATTACHMENT__::${filePath}::${fileName}::Here is the requested tax invoice for ${invoice.customer?.name || 'Retail Customer'} (${invoice.invoice_number}).`;
    } catch (err: any) {
      console.error('[Hi-Secure AI] Invoice generation failed:', err);
      return JSON.stringify({ error: err.message || 'Failed to generate invoice PDF' });
    }
  }

  private static async toolSearchInvoices(query?: string, status?: string) {
    const where: any = {};
    if (query) {
      where.invoice_number = { contains: query, mode: 'insensitive' };
    }
    if (status) {
      where.status = status;
    }

    const invoices = await prisma.salesInvoice.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } }
      },
      orderBy: { invoice_date: 'desc' },
      take: 10
    });

    return invoices.map(i => ({
      invoice_id: i.invoice_id,
      invoice_number: i.invoice_number,
      customer_name: i.customer?.name || 'Retail Customer',
      date: i.invoice_date,
      due_date: i.due_date,
      total: i.total_amount,
      tax: i.tax_amount,
      grand_total: i.grand_total,
      status: i.status
    }));
  }

  private static async toolSearchCustomers(query?: string) {
    const where: any = { is_active: true };
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { customer_code: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } }
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      take: 10
    });

    return customers.map(c => ({
      customer_id: c.customer_id,
      customer_code: c.customer_code,
      name: c.name,
      phone: c.phone,
      email: c.email,
      gstin: c.gstin,
      customer_type: c.customer_type
    }));
  }

  private static async toolSearchSuppliers(query?: string) {
    const where: any = { is_active: true };
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { supplier_code: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } }
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      take: 10
    });

    return suppliers.map(s => ({
      supplier_id: s.supplier_id,
      supplier_code: s.supplier_code,
      name: s.name,
      contact_person: s.contact_person,
      phone: s.phone,
      email: s.email,
      gstin: s.gstin,
      address: s.address,
      city: s.city,
      state: s.state
    }));
  }

  private static async toolSearchRepairs(query?: string, status?: string) {
    const where: any = {};
    if (query) {
      where.OR = [
        { ticket_number: { contains: query, mode: 'insensitive' } },
        { customer: { name: { contains: query, mode: 'insensitive' } } }
      ];
    }
    if (status) {
      where.repair_status = status as any;
    }

    const repairs = await prisma.repair.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        assigned_technician: { select: { name: true } }
      },
      orderBy: { received_date: 'desc' },
      take: 10
    });

    return repairs.map(r => ({
      repair_id: r.repair_id,
      ticket_number: r.ticket_number,
      customer_name: r.customer?.name || 'Unknown',
      product_type: r.product_type,
      serial_number: r.serial_number,
      repair_status: r.repair_status,
      estimated_cost: r.estimated_cost,
      assigned_technician: r.assigned_technician?.name || 'Unassigned',
      received_date: r.received_date
    }));
  }

  private static async toolGetSystemHealth() {
    try {
      const stats = await SystemHealthService.checkHealth();
      const full = await SystemHealthService.getFullHealth();
      return {
        status: full.status,
        database_status: full.services.database.status,
        database_latency_ms: stats.database.latency_ms,
        redis_status: full.services.redis.status,
        queue_status: full.services.queue.status,
        queue_active_jobs: full.services.queue.active_jobs,
        queue_failed_jobs: full.services.queue.failed_jobs,
        storage_status: full.services.storage.status,
        storage_uploads_count: full.services.storage.uploads_count,
        smtp_status: full.services.smtp.status,
        smtp_error: full.services.smtp.error || null,
        gst_service_status: full.services.gst_service.status,
        node_version: stats.server.node_version,
        platform: stats.server.platform,
        memory_used_mb: stats.server.memory_used_mb,
        cpu_cores: stats.system.cpu_cores,
        uptime_seconds: stats.server.uptime_seconds,
        os_type: stats.system.os_type
      };
    } catch (err: any) {
      return { status: 'degraded', error: err.message || err };
    }
  }

  private static async toolRunBackup(type: 'daily' | 'weekly') {
    try {
      const result = await BackupService.runBackup(type);
      return {
        success: result.success,
        format: result.format,
        file_path: result.filePath,
        message: 'Database backup triggered and processed successfully.'
      };
    } catch (err: any) {
      return { success: false, error: err.message || err };
    }
  }

  private static async toolGetLedgerStatus() {
    try {
      // Direct balanced ledger auditing
      const journalEntries = await prisma.journalEntry.findMany({ include: { lines: true } });
      let unbalancedCount = 0;
      let issues = [];

      for (const entry of journalEntries) {
        let debitSum = 0;
        let creditSum = 0;

        entry.lines.forEach((line: any) => {
          const amt = Number(line.amount || 0);
          if (line.entry_type.toLowerCase() === 'debit') debitSum += amt;
          else if (line.entry_type.toLowerCase() === 'credit') creditSum += amt;
        });

        if (Math.abs(debitSum - creditSum) > 0.01) {
          unbalancedCount++;
          issues.push({
            entry_id: entry.entry_id,
            ref_type: entry.reference_type,
            ref_id: entry.reference_id,
            debits: debitSum,
            credits: creditSum,
            diff: Math.abs(debitSum - creditSum)
          });
        }
      }

      return {
        status: unbalancedCount === 0 ? 'perfect' : 'unbalanced',
        total_journal_entries: journalEntries.length,
        unbalanced_entries_count: unbalancedCount,
        issues: issues.slice(0, 10) // return max 10 issues
      };
    } catch (err: any) {
      return { error: err.message || err };
    }
  }

  /**
   * Validate connection to NVIDIA NIM API with a lightweight completions request
   */
  public static async testNvidiaConnection(apiKey: string, modelId: string): Promise<boolean> {
    try {
      if (!apiKey) {
        throw new Error('NVIDIA NIM API Key is required.');
      }
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId || 'stepfun-ai/step-3.7-flash',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 1
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as any)?.error?.message || `HTTP ${response.status} ${response.statusText}`);
      }
      return true;
    } catch (err: any) {
      console.error('[Hi-Secure AI] testNvidiaConnection failed:', err.message || err);
      throw new Error(err.message || 'Failed to authenticate with NVIDIA NIM API.');
    }
  }

  private static wrapAndAlignTables(text: string): string {
    if (!text) return text;

    // Matches any markdown table pattern with piping columns
    const tableRegex = /((?:^|\n)\|[^\n]+\|[^\n]*\n\|[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|[^\n]*\n)((?:\|[^\n]+\|[^\n]*(?:\n|$))+)/g;

    return text.replace(tableRegex, (match: string, headerAndDivider: string, dataLinesStr: string) => {
      const lines = (headerAndDivider + dataLinesStr).trim().split('\n');
      const tableRows = lines.map((line: string) => {
        const cells = line.split('|').map((c: string) => c.trim());
        if (cells[0] === '') cells.shift();
        if (cells[cells.length - 1] === '') cells.pop();
        return cells;
      });

      if (tableRows.length < 2) return match;

      const headers = tableRows[0];
      const dataRows = tableRows.slice(2); // Skip header and divider row

      if (dataRows.length === 0) return 'No records found.';

      const labelMap: Record<string, string> = {
        part_number: 'Part Number',
        name: 'Name',
        brand: 'Brand',
        cost_price: 'Cost',
        selling_price: 'Selling Price',
        tax_rate: 'GST',
        stock_quantity: 'Stock',
        locations: 'Locations',
        invoice_number: 'Invoice No',
        customer_name: 'Customer',
        date: 'Date',
        due_date: 'Due Date',
        total: 'Total',
        tax: 'Tax',
        grand_total: 'Grand Total',
        status: 'Status',
        customer_code: 'Customer Code',
        phone: 'Phone',
        email: 'Email',
        gstin: 'GSTIN',
        customer_type: 'Type',
        ticket_number: 'Ticket No',
        product_type: 'Product',
        serial_number: 'Serial No',
        repair_status: 'Repair Status',
        estimated_cost: 'Est Cost',
        assigned_technician: 'Technician',
        received_date: 'Received Date'
      };

      const cardList = dataRows.map((row: string[], idx: number) => {
        const titleField = row[0] || '-';
        const titleLabel = labelMap[headers[0].toLowerCase().replace(/[^a-z0-9_]/g, '')] || headers[0];
        
        const details = headers.slice(1).map((header: string, hIdx: number) => {
          let val = row[hIdx + 1] || '-';
          const cleanHeader = header.toLowerCase().replace(/[^a-z0-9_]/g, '');
          const label = labelMap[cleanHeader] || header;
          
          // Add ₹ to price fields if not already formatted
          if (['cost', 'selling', 'price', 'total', 'tax', 'grand_total', 'estimated_cost', 'est_cost'].some(keyword => cleanHeader.includes(keyword))) {
            if (!val.startsWith('₹') && !isNaN(Number(val))) {
              val = `₹${Number(val).toFixed(2)}`;
            }
          }
          // Add % to tax rate fields
          if (cleanHeader.includes('tax') || cleanHeader.includes('gst')) {
            if (!val.endsWith('%') && !isNaN(Number(val))) {
              val = `${val}%`;
            }
          }

          return `   • *${label}*: ${val}`;
        }).join('\n');

        const lowerFirstHeader = headers[0].toLowerCase();
        const icon = lowerFirstHeader.includes('part') || lowerFirstHeader.includes('sku') || lowerFirstHeader.includes('model') ? '📦' :
                     lowerFirstHeader.includes('invoice') ? '📄' :
                     lowerFirstHeader.includes('ticket') || lowerFirstHeader.includes('repair') ? '🔧' : '👤';

        return `${idx + 1}. ${icon} *${titleLabel}: ${titleField}*\n${details}`;
      }).join('\n\n');

      return `\n${cardList}\n`;
    });
  }
}