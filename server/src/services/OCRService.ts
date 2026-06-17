import crypto from 'crypto';
import pdfParse from 'pdf-parse';
import { CacheService } from './CacheService';

export class OCRService {
  private static OCR_URL = 'http://127.0.0.1:5050';
  
  // Circuit Breaker State
  private static failedAttempts = 0;
  private static isAvailable = true;
  private static nextRetryTime = 0;
  private static CIRCUIT_BREAKER_THRESHOLD = 3;
  private static RECOVERY_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  // Watchdog metrics
  private static totalResponseTimeMs = 0;
  private static successfulRequestsCount = 0;

  public static getEngineVersion(source: 'text' | 'ocr'): string {
    return source === 'text' ? 'pdf-parse-1.1' : 'PaddleOCR-3.0';
  }

  public static getMetrics() {
    const avgResponseTime = this.successfulRequestsCount > 0
      ? Math.round(this.totalResponseTimeMs / this.successfulRequestsCount)
      : 0;
    return {
      isAvailable: this.isAvailable,
      consecutiveFailures: this.failedAttempts,
      averageResponseTimeMs: avgResponseTime
    };
  }

  public static async runWatchdog(): Promise<{ degraded: boolean; reason?: string }> {
    let memoryUsageBytes = 0;
    let reachable = false;
    
    try {
      const health = await this.checkHealth();
      reachable = health.status === 'healthy';
      memoryUsageBytes = (health as any).memory_usage_bytes || 0;
    } catch (err) {
      reachable = false;
    }

    const consecutiveFailures = this.failedAttempts;
    const maxMemory = 2 * 1024 * 1024 * 1024; // 2 GB
    let degraded = false;
    let reason = '';

    if (!reachable) {
      degraded = true;
      reason = 'OCR service is not reachable';
    } else if (memoryUsageBytes > maxMemory) {
      degraded = true;
      reason = `OCR service memory usage (${(memoryUsageBytes / (1024 * 1024)).toFixed(2)} MB) exceeds 2GB`;
    } else if (consecutiveFailures > 10) {
      degraded = true;
      reason = `OCR service consecutive failures (${consecutiveFailures}) exceed threshold of 10`;
    }

    if (degraded) {
      try {
        const cooldownKey = 'ocr_watchdog_degraded_logged';
        const alreadyLogged = await CacheService.get<boolean>(cooldownKey);
        if (!alreadyLogged) {
          const { BusinessEventService } = require('./BusinessEventService');
          await BusinessEventService.logEvent({
            event_type: 'OCR_SERVICE_DEGRADED',
            entity_type: 'System',
            entity_id: 0,
            description: `OCR service watchdog triggered: ${reason}`
          });
          await CacheService.set(cooldownKey, true, 3600);
        }
      } catch (logErr) {
        console.error('Failed to log watchdog event:', logErr);
      }
    }

    return { degraded, reason };
  }

  // File Limits
  public static MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
  public static MAX_PDF_SIZE = 50 * 1024 * 1024;   // 50 MB

  /**
   * Helper to compute SHA256 hash of a buffer.
   */
  public static getHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Handles Circuit Breaker state check and auto-recovery.
   */
  private static checkAvailability() {
    if (!this.isAvailable) {
      if (Date.now() >= this.nextRetryTime) {
        console.log('[OCRService] Cooldown expired. Attempting circuit breaker recovery...');
        this.isAvailable = true;
        this.failedAttempts = 0;
      } else {
        throw new Error('OCR Service is currently unavailable (circuit breaker active)');
      }
    }
  }

  /**
   * Records a failed attempt. Trip breaker if threshold is exceeded.
   */
  private static recordFailure(errorMsg: string) {
    this.failedAttempts++;
    console.error(`[OCRService] Failed attempt registered (${this.failedAttempts}/${this.CIRCUIT_BREAKER_THRESHOLD}): ${errorMsg}`);
    
    if (this.failedAttempts >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.isAvailable = false;
      this.nextRetryTime = Date.now() + this.RECOVERY_COOLDOWN_MS;
      console.warn(`[OCRService] Circuit breaker TRIP! OCR marked unavailable for 5 minutes.`);
      
      // Log BusinessEvent
      try {
        const { BusinessEventService } = require('./BusinessEventService');
        BusinessEventService.logEvent({
          event_type: 'OCR Circuit Breaker Tripped',
          entity_type: 'System',
          entity_id: 0,
          description: `OCR Service marked unavailable due to consecutive failures. Next retry: ${new Date(this.nextRetryTime).toISOString()}`
        });
      } catch (e) {
        console.error('Failed to log circuit breaker event:', e);
      }
    }
  }

  /**
   * Records a successful attempt. Resets failure counter.
   */
  private static recordSuccess(durationMs?: number) {
    if (durationMs) {
      this.totalResponseTimeMs += durationMs;
      this.successfulRequestsCount++;
    }
    if (this.failedAttempts > 0) {
      console.log('[OCRService] Successful request completed. Resetting failure counter.');
      this.failedAttempts = 0;
    }
    this.isAvailable = true;
  }

  /**
   * Checks the health of the FastAPI PaddleOCR microservice.
   */
  static async checkHealth(): Promise<{ status: string; engine: string; loaded: boolean }> {
    try {
      const res = await fetch(`${this.OCR_URL}/ocr/health`, {
        signal: AbortSignal.timeout(3000)
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json() as any;
    } catch (err) {
      return { status: 'unhealthy', engine: 'paddleocr', loaded: false };
    }
  }

  /**
   * OCR an image buffer using PaddleOCR FastAPI microservice.
   */
  static async processImage(buffer: Buffer): Promise<{ text: string; confidence: number; regions: any[] }> {
    // 1. File Size Validation
    if (buffer.length > this.MAX_IMAGE_SIZE) {
      throw new Error(`Image file size exceeds limit of 10MB (actual: ${(buffer.length / (1024*1024)).toFixed(2)}MB)`);
    }

    // 2. Cache Check
    const hash = this.getHash(buffer);
    const cacheKey = `ocr:cache:${hash}`;
    const cachedResult = await CacheService.get<{ text: string; confidence: number; regions: any[] }>(cacheKey);
    if (cachedResult) {
      console.log(`[OCRService] Cache hit for file hash ${hash}`);
      return cachedResult;
    }

    // 3. Circuit Breaker Check
    this.checkAvailability();

    // 4. API Request with 30s Timeout Protection
    const start = Date.now();
    try {
      const formData = new FormData();
      const fileBlob = new Blob([buffer]);
      formData.append('file', fileBlob, 'image.png');

      const response = await fetch(`${this.OCR_URL}/ocr/image`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(30000) // 30 seconds timeout
      });

      if (!response.ok) {
        throw new Error(`OCR Server returned HTTP status ${response.status}`);
      }

      const result = await response.json();
      const duration = Date.now() - start;
      this.recordSuccess(duration);

      // Write to cache (TTL: 30 days)
      await CacheService.set(cacheKey, result, 30 * 24 * 3600);

      return result as any;
    } catch (err: any) {
      const errorMsg = err.name === 'TimeoutError' ? 'OCR Request Timed Out' : err.message;
      this.recordFailure(errorMsg);
      throw new Error(`OCR Processing Failed: ${errorMsg}`);
    }
  }

  /**
   * Process PDF document. Uses pdf-parse for text-based, falls back to PaddleOCR FastAPI for scanned pages.
   */
  static async processPDF(buffer: Buffer): Promise<{ text: string; pages: number; source: 'text' | 'ocr' }> {
    // 1. File Size Validation
    if (buffer.length > this.MAX_PDF_SIZE) {
      throw new Error(`PDF file size exceeds limit of 50MB (actual: ${(buffer.length / (1024*1024)).toFixed(2)}MB)`);
    }

    // 2. Cache Check
    const hash = this.getHash(buffer);
    const cacheKey = `ocr:cache:pdf:${hash}`;
    const cachedResult = await CacheService.get<{ text: string; pages: number; source: 'text' | 'ocr' }>(cacheKey);
    if (cachedResult) {
      console.log(`[OCRService] Cache hit for PDF hash ${hash}`);
      return cachedResult;
    }

    // 3. Native Text Extraction Attempt
    try {
      let text = '';
      let numpages = 0;

      const PDFParseClass = (pdfParse as any).PDFParse || (pdfParse as any).default?.PDFParse || require('pdf-parse').PDFParse;
      if (PDFParseClass) {
        const parser = new PDFParseClass({ data: buffer });
        const res = await parser.getText();
        text = res.text;
        numpages = res.total || res.pages || 0;
      } else if (typeof pdfParse === 'function') {
        const res = await (pdfParse as any)(buffer);
        text = res.text;
        numpages = res.numpages;
      } else if (typeof (pdfParse as any).default === 'function') {
        const res = await (pdfParse as any).default(buffer);
        text = res.text;
        numpages = res.numpages;
      } else {
        const oldPdfParse = require('pdf-parse');
        if (typeof oldPdfParse === 'function') {
          const res = await oldPdfParse(buffer);
          text = res.text;
          numpages = res.numpages;
        } else {
          throw new Error('No compatible pdf-parse exporter found');
        }
      }

      const cleaned = this.cleanText(text);
      const avgCharsPerPage = numpages > 0 ? cleaned.length / numpages : 0;
      if (cleaned.length > 300 && avgCharsPerPage > 100) {
        console.log(`[OCRService] Native text extraction succeeded (${numpages} pages, ${cleaned.length} chars, avg ${avgCharsPerPage.toFixed(1)}/page)`);
        const result = { text: cleaned, pages: numpages, source: 'text' as const };
        await CacheService.set(cacheKey, result, 30 * 24 * 3600);
        return result;
      }
    } catch (err) {
      console.log('[OCRService] Native PDF text extraction failed or had insufficient text, falling back to OCR:', err);
    }

    // 4. Circuit Breaker Check for Scanned OCR fallback
    this.checkAvailability();

    // 5. API Request with 30s Timeout Protection
    const start = Date.now();
    try {
      const formData = new FormData();
      const fileBlob = new Blob([buffer]);
      formData.append('file', fileBlob, 'catalog.pdf');

      const response = await fetch(`${this.OCR_URL}/ocr/pdf`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(600000) // 10 minutes timeout for catalog PDFs
      });

      if (!response.ok) {
        throw new Error(`OCR Server returned HTTP status ${response.status}`);
      }

      const result = await response.json() as any;
      const duration = Date.now() - start;
      this.recordSuccess(duration);

      const finalResult = {
        text: result.text,
        pages: result.pages,
        source: 'ocr' as const
      };

      // Write to cache (TTL: 30 days)
      await CacheService.set(cacheKey, finalResult, 30 * 24 * 3600);

      return finalResult;
    } catch (err: any) {
      const errorMsg = err.name === 'TimeoutError' ? 'OCR Request Timed Out' : err.message;
      this.recordFailure(errorMsg);
      throw new Error(`OCR PDF Processing Failed: ${errorMsg}`);
    }
  }

  /**
   * Normalizes whitespace, trims text.
   */
  static cleanText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n')
      .trim();
  }
}
