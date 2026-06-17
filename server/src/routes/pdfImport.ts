import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../index';

function cleanAndParseJSON(jsonStr: string): any {
  let cleanText = jsonStr.trim();
  // Strip markdown code fences if present
  cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

  // Escape raw backslashes that are not followed by valid JSON escape sequences
  cleanText = cleanText.replace(/\\(["\\\/bfnrt]|u[0-9a-fA-F]{4})|\\/g, (match, p1) => {
    if (p1) {
      return match;
    }
    return '\\\\';
  });
  
  try {
    return JSON.parse(cleanText);
  } catch (err: any) {
    console.warn('[PDF Import JSON Parse] Direct parse failed, attempting repair...', err.message);
    
    // Find the last closing brace
    const lastBrace = cleanText.lastIndexOf('}');
    if (lastBrace !== -1) {
      // Find the first open bracket to make sure we keep the array structure
      const firstBracket = cleanText.indexOf('[');
      if (firstBracket !== -1 && firstBracket < lastBrace) {
        const sliced = cleanText.substring(firstBracket, lastBrace + 1) + ']';
        try {
          return JSON.parse(sliced);
        } catch (repairErr: any) {
          console.error('[PDF Import JSON Parse] Repair attempt failed:', repairErr.message);
        }
      }
    }
    throw err;
  }
}

export const pdfImportRouter = Router();

// Use memory storage so we don't write PDFs to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted.'));
    }
  }
});

import { CatalogParserService } from '../services/CatalogParserService';

pdfImportRouter.post('/parse-pdf', upload.single('pdf'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    // Look up default supplier or first supplier
    let supplierId = 1;
    const supplier = await prisma.supplier.findFirst();
    if (supplier) {
      supplierId = supplier.supplier_id;
    }

    const userId = req.userId || 1;

    // Use CatalogParserService to parse the catalog
    const result = await CatalogParserService.parseCatalog(
      req.file.buffer,
      req.file.originalname,
      supplierId,
      userId
    );

    const products = [
      ...result.validProducts.map(p => ({
        part_number: p.part_number,
        name: p.name,
        brand_name: p.brand || 'GENERIC',
        description: p.description || '',
        cost_price: p.cost_price,
        selling_price: p.selling_price,
        tax_rate: p.tax_rate,
        initial_stock: 0,
        reorder_level: 5,
        confidence: p.confidence,
        warnings: p.warnings,
        raw_source_text: p.raw_source_text,
        is_duplicate: false
      })),
      ...result.potentialDuplicates.map(p => ({
        part_number: p.part_number,
        name: p.name,
        brand_name: p.brand || 'GENERIC',
        description: p.description || '',
        cost_price: p.cost_price,
        selling_price: p.selling_price,
        tax_rate: p.tax_rate,
        initial_stock: 0,
        reorder_level: 5,
        confidence: p.confidence,
        warnings: p.warnings,
        raw_source_text: p.raw_source_text,
        is_duplicate: true
      })),
      ...result.rejectedProducts.map(p => ({
        part_number: p.part_number,
        name: p.name,
        brand_name: p.brand || 'GENERIC',
        description: p.description || '',
        cost_price: p.cost_price,
        selling_price: p.selling_price,
        tax_rate: p.tax_rate,
        initial_stock: 0,
        reorder_level: 5,
        confidence: p.confidence,
        warnings: p.warnings,
        raw_source_text: p.raw_source_text,
        is_rejected: true
      }))
    ];

    return res.json({
      success: true,
      count: products.length,
      products: products
    });

  } catch (err: any) {
    console.error('[PDF Import] Unexpected error:', err);
    return res.status(500).json({ error: err.message || 'PDF import failed.' });
  }
});

