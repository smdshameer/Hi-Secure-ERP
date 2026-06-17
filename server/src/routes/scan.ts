import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import { AuthRequest, requirePermission } from '../middleware/auth';
import { prisma } from '../index';
import { ScanningService } from '../services/ScanningService';
import { OCRService } from '../services/OCRService';
import { jobQueue } from '../jobs/JobQueue';
import { CatalogParserService } from '../services/CatalogParserService';

export const scanRouter = Router();

// Configure multer with memory storage and 50MB limit (max PDF limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

/**
 * Audit Logger Helper
 */
async function logAudit(req: AuthRequest, action: string, details: any) {
  try {
    const { AuditService } = require('../services/AuditService');
    await AuditService.log(
      req.userId || null,
      'SCAN_ENGINE',
      action,
      'Parts',
      0,
      null,
      details
    );
  } catch (err) {
    console.error('Failed to log scan audit:', err);
  }
}

/**
 * BusinessEvent Logger Helper
 */
async function logBusinessEvent(req: AuthRequest, eventType: string, desc: string, entityId: number = 0) {
  try {
    const { BusinessEventService } = require('../services/BusinessEventService');
    await BusinessEventService.logEvent({
      event_type: eventType,
      entity_type: 'Parts',
      entity_id: entityId,
      user_id: req.userId || null,
      description: desc
    });
  } catch (err) {
    console.error('Failed to log scan business event:', err);
  }
}

/**
 * POST /api/scan/image
 * Scans an uploaded image (JPEG, PNG, WebP) up to 10MB.
 * Runs barcode detection first, falls back to OCR matching.
 */
scanRouter.post('/image', requirePermission('view_parts'), upload.single('file'), async (req: AuthRequest, res) => {
  const reqId = req.requestId || 'N/A';
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const buffer = req.file.buffer;

    // Check size limit (10MB)
    if (buffer.length > OCRService.MAX_IMAGE_SIZE) {
      return res.status(400).json({ 
        error: `File size exceeds the limit of 10MB (actual: ${(buffer.length / (1024*1024)).toFixed(2)}MB)` 
      });
    }

    const scanResult = await ScanningService.scanImage(buffer);
    
    // Log Audit and BusinessEvent
    const matchStatus = scanResult.matchedProduct ? 'Matched' : 'Not Matched';
    await logAudit(req, 'IMAGE_SCAN', {
      requestId: reqId,
      fileName: req.file.originalname,
      logs: scanResult.logs
    });
    
    await logBusinessEvent(
      req, 
      'Image Scan Executed', 
      `Scanned image ${req.file.originalname} using ${scanResult.logs.engineUsed}. Match: ${matchStatus}.`,
      scanResult.matchedProduct ? scanResult.matchedProduct.part_id : 0
    );

    return res.json(scanResult);
  } catch (err: any) {
    console.error(`[Request ID: ${reqId}] Scan image error:`, err);
    return res.status(500).json({ error: 'Scan processing failed', message: err.message, requestId: reqId });
  }
});

/**
 * POST /api/scan/catalog
 * Accepts PDF catalog uploads up to 50MB.
 * If pages <= 50, processes immediately.
 * If pages > 50, queues background job.
 */
scanRouter.post('/catalog', requirePermission('manage_suppliers'), upload.single('file'), async (req: AuthRequest, res) => {
  const reqId = req.requestId || 'N/A';
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No catalog file uploaded.' });
    }

    const buffer = req.file.buffer;
    const supplierId = parseInt(req.body.supplier_id);
    if (!supplierId || isNaN(supplierId)) {
      return res.status(400).json({ error: 'Valid supplier_id is required.' });
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({ where: { supplier_id: supplierId } });
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }

    // Check size limit (50MB)
    if (buffer.length > OCRService.MAX_PDF_SIZE) {
      return res.status(400).json({ 
        error: `File size exceeds the limit of 50MB (actual: ${(buffer.length / (1024*1024)).toFixed(2)}MB)` 
      });
    }

    // Extract PDF metadata to check page count
    let pageCount = 0;
    try {
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(buffer);
      pageCount = pdfData.numpages;
    } catch (pdfErr) {
      pageCount = 1;
    }

    if (pageCount <= 50) {
      // Immediate processing
      const result = await CatalogParserService.parseCatalog(
        buffer,
        req.file.originalname,
        supplierId,
        req.userId || 1
      );
      
      await logAudit(req, 'CATALOG_OCR', {
        requestId: reqId,
        fileName: req.file.originalname,
        pages: pageCount,
        sessionId: result.sessionId,
        performance: result.performance
      });

      await logBusinessEvent(
        req, 
        'Catalog OCR Completed', 
        `Processed catalog ${req.file.originalname} (${pageCount} pages). Found ${result.totalProducts} products.`
      );

      return res.json(result);
    } else {
      // Background Queue processing
      const uploadsDir = path.join(process.cwd(), 'uploads', 'catalogs');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
      const filePath = path.join(uploadsDir, `catalog_${fileHash}.pdf`);
      fs.writeFileSync(filePath, buffer);
      
      // Enqueue job in BullMQ / in-memory JobQueue
      await jobQueue.addJob('CATALOG_IMPORT', {
        filePath,
        supplierId,
        uploadedBy: req.userId || 1,
        fileName: req.file.originalname
      });

      await logAudit(req, 'CATALOG_OCR_QUEUED', {
        requestId: reqId,
        fileName: req.file.originalname,
        pages: pageCount,
        filePath
      });

      await logBusinessEvent(
        req, 
        'Catalog OCR Queued', 
        `Enqueued background processing for large catalog ${req.file.originalname} (${pageCount} pages) for supplier ID ${supplierId}.`
      );

      return res.json({
        success: true,
        queued: true,
        pages: pageCount,
        message: `Catalog contains ${pageCount} pages (exceeds immediate limit of 50). Processing enqueued in background.`
      });
    }
  } catch (err: any) {
    console.error(`[Request ID: ${reqId}] Scan catalog error:`, err);
    return res.status(500).json({ error: 'Catalog processing failed', message: err.message, requestId: reqId });
  }
});

/**
 * POST /api/scan/catalog/import
 * Bulk imports parsed catalog items into inventory under specified supplier.
 */
scanRouter.post('/catalog/import', requirePermission('manage_suppliers'), async (req: AuthRequest, res) => {
  const reqId = req.requestId || 'N/A';
  try {
    const { supplier_id, items } = req.body;
    if (!supplier_id || !Array.isArray(items)) {
      return res.status(400).json({ error: 'supplier_id and items array are required.' });
    }

    const supplier = await prisma.supplier.findUnique({ where: { supplier_id: parseInt(supplier_id) } });
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }

    let importedCount = 0;
    for (const item of items) {
      // Find or create brand
      let brand = null;
      if (item.brand && item.brand !== 'GENERIC') {
        brand = await prisma.brand.findUnique({ where: { name: item.brand } });
        if (!brand) {
          brand = await prisma.brand.create({ data: { name: item.brand } });
        }
      }

      // Generate a part number if not found
      const brandClean = (item.brand || 'GENERIC').replace(/\s+/g, '').toUpperCase();
      const modelClean = (item.model || 'PART').replace(/\s+/g, '').toUpperCase();
      const randStr = crypto.randomBytes(3).toString('hex').toUpperCase();
      const partNum = item.part_number || `${brandClean}-${modelClean}-${randStr}`;

      const existing = await prisma.parts.findUnique({ where: { part_number: partNum } });
      if (!existing) {
        await prisma.parts.create({
          data: {
            part_number: partNum,
            name: item.name || `${item.brand || 'Generic'} ${item.model || 'Part'} (${item.description || ''})`,
            description: item.description || '',
            brand_id: brand ? brand.brand_id : null,
            cost_price: parseFloat(item.cost_price) || 0.0,
            selling_price: parseFloat(item.selling_price) || 0.0,
            stock_quantity: 0,
            model_number: item.model || '',
            is_active: true
          }
        });
        importedCount++;
      }
    }

    await logAudit(req, 'CATALOG_IMPORT_EXECUTE', {
      requestId: reqId,
      supplierId: supplier_id,
      itemsSubmitted: items.length,
      importedCount
    });

    await logBusinessEvent(
      req,
      'Catalog Products Imported',
      `Imported ${importedCount} of ${items.length} items from supplier catalog under supplier: ${supplier.name}.`
    );

    return res.json({
      success: true,
      importedCount,
      totalCount: items.length
    });
  } catch (err: any) {
    console.error(`[Request ID: ${reqId}] Catalog import error:`, err);
    return res.status(500).json({ error: 'Catalog import failed', message: err.message, requestId: reqId });
  }
});
