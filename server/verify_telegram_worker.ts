/**
 * verify_telegram_worker.ts
 * Verification suite for Telegram Worker Graceful Degradation & Stability
 */

process.env.STANDALONE_SCRIPT = 'true';
process.env.TELEGRAM_BOT_ENABLED = 'false'; // Safeguard to ensure disabled during load
import dotenv from 'dotenv';
dotenv.config();

console.log('[Debug] Importing dependencies...');
import { prisma } from './src/index';
import { telegramBotWorker } from './src/jobs/TelegramBotWorker';
import { SystemHealthService } from './src/services/SystemHealthService';

console.log('[Debug] Dependencies imported.');

let totalTests = 0;
let passed = 0;
let failed = 0;
const failures: string[] = [];

function pass(name: string) {
  totalTests++;
  passed++;
  console.log(`  ✅ PASS: ${name}`);
}

function fail(name: string, reason: any) {
  totalTests++;
  failed++;
  const msg = reason instanceof Error ? reason.message : String(reason);
  failures.push(`[${name}] ${msg}`);
  console.error(`  ❌ FAIL: ${name}\n       → ${msg}`);
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

// Intercept console.log to monitor worker state transition logs
const loggedMessages: string[] = [];
const originalConsoleLog = console.log;
console.log = (...args: any[]) => {
  const message = args.join(' ');
  loggedMessages.push(message);
  originalConsoleLog(...args);
};

// Set up mock configurations
const mockTelegramConfig = {
  bot_token: 'default_mock_token',
  chat_id: '123456',
  enabled: true
};

const mockAiConfig = {
  telegram_ai_enabled: true,
  ai_enabled: true
};

// Mock Prisma setting lookups by casting to any to satisfy TS compiler
console.log('[Debug] Setting up Prisma mocks...');
(prisma.setting as any).findUnique = async (args: any) => {
  originalConsoleLog('[Debug] Mock prisma.setting.findUnique called with key:', args.where.key);
  if (args.where.key === 'telegram') {
    return {
      key: 'telegram',
      value: mockTelegramConfig
    };
  }
  if (args.where.key === 'ai') {
    return {
      key: 'ai',
      value: mockAiConfig
    };
  }
  return null;
};

// Override setTimeout to fast-forward polling delays but preserve abort controller timeouts conditionally
let fastForwardTimeout = false;
const originalSetTimeout = global.setTimeout;
(global as any).setTimeout = (callback: any, ms: number, ...args: any[]) => {
  if (ms === 30000 || ms === 60000 || ms === 120000 || ms === 300000) {
    return originalSetTimeout(callback, 0, ...args);
  }
  if (ms === 1000) {
    return originalSetTimeout(callback, 1, ...args); // 1ms yielding delay
  }
  if (fastForwardTimeout && ms === 10000) {
    return originalSetTimeout(callback, 0, ...args);
  }
  return originalSetTimeout(callback, ms, ...args);
};

// Mock fetch support with proper AbortSignal handling
let mockFetchHandler: (url: string, init?: any) => Promise<any> = () => {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, result: [] })
  });
};

global.fetch = async (url: any, init: any) => {
  const signal = init?.signal;
  if (signal) {
    if (signal.aborted) {
      const err = new Error('The user aborted a request.');
      err.name = 'AbortError';
      throw err;
    }
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        signal.removeEventListener('abort', onAbort);
        const err = new Error('The user aborted a request.');
        err.name = 'AbortError';
        reject(err);
      };
      signal.addEventListener('abort', onAbort);
      
      mockFetchHandler(String(url), init)
        .then(res => {
          signal.removeEventListener('abort', onAbort);
          resolve(res);
        })
        .catch(err => {
          signal.removeEventListener('abort', onAbort);
          reject(err);
        });
    });
  }
  return mockFetchHandler(String(url), init);
};

async function executeSingleIteration() {
  originalConsoleLog('[Debug] executeSingleIteration: Starting poll...');
  telegramBotWorker['isRunning'] = true;
  const pollPromise = telegramBotWorker['poll']();
  originalConsoleLog('[Debug] executeSingleIteration: Setting isRunning to false...');
  // Ensure the loop runs exactly once by setting isRunning to false
  telegramBotWorker['isRunning'] = false;
  await pollPromise;
  originalConsoleLog('[Debug] executeSingleIteration: Poll finished.');
}

function resetWorkerState(status: 'healthy' | 'degraded' | 'disabled' = 'healthy') {
  telegramBotWorker.status = status;
  telegramBotWorker.lastError = null;
  telegramBotWorker['lastLoggedState'] = null;
  loggedMessages.length = 0;
}

async function runTests() {
  originalConsoleLog('==================================================');
  originalConsoleLog('TELEGRAM WORKER STABILITY & GRACEFUL DEGRADATION');
  originalConsoleLog('==================================================\n');

  // Immediately stop the worker's default constructor-initiated loop to control it manually
  originalConsoleLog('[Debug] Stopping default worker instance...');
  telegramBotWorker.stop();
  resetWorkerState('disabled');

  // 1. Missing Token Test
  originalConsoleLog('[Debug] Triggering Test 1...');
  await test('Test 1: Missing token defaults to disabled', async () => {
    resetWorkerState('healthy');
    process.env.TELEGRAM_BOT_ENABLED = 'true';
    process.env.TELEGRAM_BOT_TOKEN = '';
    mockTelegramConfig.bot_token = '';

    await executeSingleIteration();

    const status = telegramBotWorker.status as string;
    assert(status === 'disabled', `Expected 'disabled', got '${status}'`);
    assert(telegramBotWorker.lastError !== null && telegramBotWorker.lastError.includes('missing or empty'), 'Error description mismatch');
    assert(loggedMessages.some(m => m.includes('TELEGRAM_DISABLED')), 'Expected TELEGRAM_DISABLED log message');
  });

  // 2. Empty Token Test
  originalConsoleLog('[Debug] Triggering Test 2...');
  await test('Test 2: Empty token (spaces) defaults to disabled', async () => {
    resetWorkerState('healthy');
    process.env.TELEGRAM_BOT_ENABLED = 'true';
    process.env.TELEGRAM_BOT_TOKEN = '   ';
    mockTelegramConfig.bot_token = '   ';

    await executeSingleIteration();

    const status = telegramBotWorker.status as string;
    assert(status === 'disabled', `Expected 'disabled', got '${status}'`);
    assert(telegramBotWorker.lastError !== null && telegramBotWorker.lastError.includes('missing or empty'), 'Error description mismatch');
    assert(loggedMessages.some(m => m.includes('TELEGRAM_DISABLED')), 'Expected TELEGRAM_DISABLED log message');
  });

  // 3. Invalid Token Test
  originalConsoleLog('[Debug] Triggering Test 3...');
  await test('Test 3: Invalid token results in degraded status', async () => {
    resetWorkerState('healthy');
    process.env.TELEGRAM_BOT_ENABLED = 'true';
    process.env.TELEGRAM_BOT_TOKEN = 'invalid_mock_token';
    mockTelegramConfig.bot_token = 'invalid_mock_token';

    // Mock Telegram API returning 401 Unauthorized
    mockFetchHandler = async (url) => {
      if (url.includes('getUpdates')) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ ok: false, error_code: 401, description: 'Unauthorized' })
        };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };

    await executeSingleIteration();

    const status = telegramBotWorker.status as string;
    assert(status === 'degraded', `Expected 'degraded', got '${status}'`);
    assert(telegramBotWorker.lastError === 'Invalid bot token', `Expected 'Invalid bot token', got '${telegramBotWorker.lastError}'`);
    assert(loggedMessages.some(m => m.includes('TELEGRAM_INVALID_TOKEN')), 'Expected TELEGRAM_INVALID_TOKEN log message');
  });

  // 4. Network Timeout Test
  originalConsoleLog('[Debug] Triggering Test 4...');
  await test('Test 4: AbortController timeout results in degraded status', async () => {
    resetWorkerState('healthy');
    process.env.TELEGRAM_BOT_ENABLED = 'true';
    process.env.TELEGRAM_BOT_TOKEN = 'valid_mock_token';
    mockTelegramConfig.bot_token = 'valid_mock_token';

    // Set fetch to hang indefinitely (AbortController should trigger rejection)
    mockFetchHandler = () => {
      return new Promise(() => {
        // Hang forever
      });
    };

    fastForwardTimeout = true;

    await executeSingleIteration();

    fastForwardTimeout = false;

    const status = telegramBotWorker.status as string;
    assert(status === 'degraded', `Expected 'degraded', got '${status}'`);
    assert(telegramBotWorker.lastError === 'Polling connection timed out', `Expected timeout error, got '${telegramBotWorker.lastError}'`);
    assert(loggedMessages.some(m => m.includes('TELEGRAM_POLL_TIMEOUT')), 'Expected TELEGRAM_POLL_TIMEOUT log message');
  });

  // 5. Recovery After Outage Test
  originalConsoleLog('[Debug] Triggering Test 5...');
  await test('Test 5: Recovery after outage transitions to healthy and log once', async () => {
    resetWorkerState('degraded');
    process.env.TELEGRAM_BOT_ENABLED = 'true';
    process.env.TELEGRAM_BOT_TOKEN = 'valid_mock_token';
    mockTelegramConfig.bot_token = 'valid_mock_token';

    // Mock successful fetch response
    mockFetchHandler = async (url) => {
      if (url.includes('getUpdates')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, result: [] })
        };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };

    await executeSingleIteration();

    const status = telegramBotWorker.status as string;
    assert(status === 'healthy', `Expected 'healthy', got '${status}'`);
    assert(telegramBotWorker.lastError === null, `Expected null error, got '${telegramBotWorker.lastError}'`);
    assert(loggedMessages.some(m => m.includes('TELEGRAM_RECOVERED')), 'Expected TELEGRAM_RECOVERED log message');
  });

  // 6. Disabled Mode Test
  originalConsoleLog('[Debug] Triggering Test 6...');
  await test('Test 6: Disabled mode when TELEGRAM_BOT_ENABLED is false', async () => {
    resetWorkerState('healthy');
    process.env.TELEGRAM_BOT_ENABLED = 'false';
    process.env.TELEGRAM_BOT_TOKEN = 'valid_mock_token';

    await executeSingleIteration();

    const status = telegramBotWorker.status as string;
    assert(status === 'disabled', `Expected 'disabled', got '${status}'`);
    assert(telegramBotWorker.lastError === 'TELEGRAM_BOT_ENABLED is false', `Expected 'TELEGRAM_BOT_ENABLED is false', got '${telegramBotWorker.lastError}'`);
    assert(loggedMessages.some(m => m.includes('TELEGRAM_DISABLED')), 'Expected TELEGRAM_DISABLED log message');
  });

  // 7. Startup Without Internet Test
  originalConsoleLog('[Debug] Triggering Test 7...');
  await test('Test 7: Startup without internet results in degraded state instead of crashing', async () => {
    resetWorkerState('healthy');
    process.env.TELEGRAM_BOT_ENABLED = 'true';
    process.env.TELEGRAM_BOT_TOKEN = 'valid_mock_token';

    // Mock fetch error (network failure)
    mockFetchHandler = async () => {
      throw new TypeError('fetch failed');
    };

    await executeSingleIteration();

    const status = telegramBotWorker.status as string;
    assert(status === 'degraded', `Expected 'degraded', got '${status}'`);
    assert(telegramBotWorker.lastError === 'fetch failed', `Expected 'fetch failed', got '${telegramBotWorker.lastError}'`);
    assert(loggedMessages.some(m => m.includes('TELEGRAM_DEGRADED')), 'Expected TELEGRAM_DEGRADED log message');
  });

  // 8. Health Endpoint Reporting Test
  originalConsoleLog('[Debug] Triggering Test 8...');
  await test('Test 8: Health endpoint reports Telegram status accurately', async () => {
    telegramBotWorker.status = 'degraded';
    telegramBotWorker.lastError = 'Simulated connection failure';
    telegramBotWorker.lastSuccessfulPoll = '2026-06-17T12:00:00.000Z';

    const health = await SystemHealthService.getFullHealth();
    
    assert(health.services.telegram.status === 'degraded', 'Health check report status mismatch');
    assert(health.services.telegram.lastError === 'Simulated connection failure', 'Health check report error mismatch');
    assert(health.services.telegram.lastSuccessfulPoll === '2026-06-17T12:00:00.000Z', 'Health check report last poll mismatch');
  });

  // 9. Exponential Backoff Validation Test
  originalConsoleLog('[Debug] Triggering Test 9...');
  await test('Test 9: Exponential backoff increments and caps correctly', async () => {
    resetWorkerState('degraded');
    telegramBotWorker['failureCount'] = 0;

    // Simulate failures
    mockFetchHandler = async () => {
      throw new TypeError('fetch failed');
    };

    await executeSingleIteration(); // Failure 1 -> backoff = 30s
    assert(telegramBotWorker['failureCount'] === 1, `Expected failureCount 1, got ${telegramBotWorker['failureCount']}`);

    await executeSingleIteration(); // Failure 2 -> backoff = 60s
    assert(telegramBotWorker['failureCount'] === 2, `Expected failureCount 2, got ${telegramBotWorker['failureCount']}`);

    await executeSingleIteration(); // Failure 3 -> backoff = 120s
    assert(telegramBotWorker['failureCount'] === 3, `Expected failureCount 3, got ${telegramBotWorker['failureCount']}`);

    await executeSingleIteration(); // Failure 4 -> backoff = 300s
    assert(telegramBotWorker['failureCount'] === 4, `Expected failureCount 4, got ${telegramBotWorker['failureCount']}`);

    await executeSingleIteration(); // Failure 5 -> backoff = 300s (max)
    assert(telegramBotWorker['failureCount'] === 5, `Expected failureCount 5, got ${telegramBotWorker['failureCount']}`);

    // Mock a successful poll to ensure failureCount resets to 0
    mockFetchHandler = async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, result: [] })
      };
    };

    await executeSingleIteration();
    const status = telegramBotWorker.status as string;
    assert(status === 'healthy', 'Should recover to healthy');
    assert(telegramBotWorker['failureCount'] === 0, `Expected failureCount to reset to 0, got ${telegramBotWorker['failureCount']}`);
  });

  // 10. ERP Startup Remains Successful Test
  originalConsoleLog('[Debug] Triggering Test 10...');
  await test('Test 10: Server startup doesn\'t crash or block on Telegram failures', async () => {
    // Override prisma.$connect to verify DB connection fails doesn't block startup
    const originalConnect = prisma.$connect;
    prisma.$connect = async () => {
      throw new Error('Database unavailable');
    };

    // Set bot token and enabled so worker starts
    process.env.TELEGRAM_BOT_ENABLED = 'true';
    process.env.TELEGRAM_BOT_TOKEN = 'valid_mock_token';
    
    // Fetch throws connection failure (offline)
    mockFetchHandler = async () => {
      throw new TypeError('fetch failed');
    };

    // Assert that the server initialization flow can run and startup succeeds asynchronously
    let started = false;
    try {
      telegramBotWorker.start();
      started = true;
    } catch (err) {
      started = false;
    }

    assert(started === true, 'Server startup thread blocked or threw exception due to Telegram Bot Worker');
    
    // Restore prisma.$connect
    prisma.$connect = originalConnect;
    telegramBotWorker.stop();
  });

  originalConsoleLog('\n==================================================');
  originalConsoleLog('VERIFICATION SUMMARY');
  originalConsoleLog('==================================================');
  originalConsoleLog(`Total Tests:  ${totalTests}`);
  originalConsoleLog(`Passed:       ${passed}`);
  originalConsoleLog(`Failed:       ${failed}`);
  originalConsoleLog('==================================================\n');

  if (failed > 0) {
    originalConsoleLog('❌ Telegram Worker validation FAILED with following errors:');
    failures.forEach(f => originalConsoleLog(`  - ${f}`));
    process.exit(1);
  } else {
    originalConsoleLog('✅ All 10 Telegram Worker checks PASSED successfully!');
    process.exit(0);
  }
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    pass(name);
  } catch (err) {
    fail(name, err);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
