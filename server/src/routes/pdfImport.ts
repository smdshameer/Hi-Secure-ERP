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

/**
 * POST /parts/parse-pdf
 * Accepts a PDF file, extracts text, uses NIM AI to parse product models + prices.
 */
pdfImportRouter.post('/parse-pdf', upload.single('pdf'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    // ── 1. Extract text from PDF ──────────────────────────────────────
    let pdfText = '';
    try {
      // Dynamic require to avoid TS issues with pdf-parse types
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: req.file.buffer });
      const data = await parser.getText();
      await parser.destroy();
      pdfText = data.text || '';
    } catch (pdfErr: any) {
      console.error('[PDF Import] pdf-parse failed:', pdfErr.message);
      return res.status(422).json({ error: 'Could not extract text from this PDF. It may be image-only/scanned.' });
    }

    if (!pdfText.trim() || pdfText.trim().length < 50) {
      return res.status(422).json({ error: 'PDF appears to contain no readable text (possibly a scanned image). Please use a text-based PDF.' });
    }

    // ── 2. Load AI config ─────────────────────────────────────────────
    const aiRow = await prisma.setting.findUnique({ where: { key: 'ai' } });
    const aiConfig = aiRow?.value as any;
    const apiKey = aiConfig?.nvidia_api_key || '';
    const modelId = aiConfig?.model_id || 'meta/llama-3.1-70b-instruct';

    if (!apiKey) {
      return res.status(503).json({ error: 'AI is not configured. Please set your NVIDIA NIM API Key in Settings → AI Assistant.' });
    }

    // Detect default brand from PDF content
    let defaultBrand = '';
    const lowerText = pdfText.toLowerCase();
    if (lowerText.includes('hikvision')) {
      defaultBrand = 'Hikvision';
    } else if (lowerText.includes('cp plus') || lowerText.includes('cpplus')) {
      defaultBrand = 'CP Plus';
    } else if (lowerText.includes('d-link') || lowerText.includes('dlink')) {
      defaultBrand = 'D-Link';
    } else if (lowerText.includes('dahua')) {
      defaultBrand = 'Dahua';
    }

    // ── 3. Truncate text to avoid token limits (keep first ~8000 chars) ──
    const truncated = pdfText.length > 8000 ? pdfText.substring(0, 8000) + '\n...[truncated]' : pdfText;

    // ── 4. Ask AI to extract products ─────────────────────────────────
    const systemPrompt = `You are a product catalog parser. The user will give you raw text extracted from a price list PDF.
Your job is to extract all product entries and return ONLY a valid JSON array — nothing else, no explanation.

Each entry in the array must have EXACTLY these fields (do not include tax_rate, description, brand_name, etc. to keep output small):
- "part_number": the model number / SKU (string, required)
- "name": the product name or category description (string, required)
- "cost_price": the dealer/MRP price as a number (no ₹ symbol, just digits)

Important Parsing Rules:
1. Side-by-Side Columns: The text contains products laid out in multiple columns side-by-side on the same line (e.g., "SKU_A Price_A SKU_B Price_B"). You MUST split these into separate product entries.
   Example line: "DS-2CE5AD0T-ITP\\ECO 790 DS-7104HGHI-M1/T 2420"
   This MUST be parsed as TWO separate products:
   - {"part_number": "DS-2CE5AD0T-ITP\\ECO", "name": "HIKVISION ECO Series CAM & DVR", "selling_price": 790}
   - {"part_number": "DS-7104HGHI-M1/T", "name": "HIKVISION ECO Series CAM & DVR", "selling_price": 2420}
2. Name inference: Infer the category/name from the section headers (e.g., "HIKVISION ECO Series CAM & DVR", "2MP (1080P) Cameras", "Network Video Recorder"). Do NOT include the part number or price in the "name" field. Keep it short.
3. Only include actual products. Skip header lines, page numbers, totals.
4. Output ONLY the raw JSON array starting with [ and ending with ]. No markdown fences.`;

    const userMessage = `Extract all products from this price list:\n\n${truncated}`;

    // Try text-capable models in order (8b first as it is super fast and works great, then step, then configured model)
    const modelsToTry = [
      'meta/llama-3.1-8b-instruct',
      'stepfun-ai/step-3.7-flash',
      modelId,
      'meta/llama-3.1-70b-instruct',
    ].filter((m, i, arr) => arr.indexOf(m) === i); // dedupe

    let parsedProducts: any[] = [];
    let lastError = '';

    for (const model of modelsToTry) {
      try {
        console.log(`[PDF Import] Trying model: ${model}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 50000);

        let response;
        try {
          response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
              ],
              temperature: 0.1,
              max_tokens: 4096,
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const msg = (errData as any)?.error?.message || `HTTP ${response.status}`;
          lastError = msg;
          console.warn(`[PDF Import] Model ${model} failed with status ${response.status} (${msg}), trying next...`);
          continue;
        }

        const data: any = await response.json();
        const aiText = data?.choices?.[0]?.message?.content?.trim() || '';

        // Repair and parse JSON
        parsedProducts = cleanAndParseJSON(aiText);

        if (!Array.isArray(parsedProducts)) {
          lastError = 'AI returned invalid structure.';
          continue;
        }

        // Sanitise: filter rows without part_number or name, map back to target structure
        parsedProducts = parsedProducts.filter(p =>
          p.part_number && String(p.part_number).trim() &&
          p.name && String(p.name).trim()
        ).map(p => ({
          part_number: String(p.part_number).trim(),
          name: String(p.name).trim(),
          brand_name: String(p.brand_name || p.brand || defaultBrand).trim(),
          description: String(p.description || '').trim(),
          cost_price: isNaN(Number(p.cost_price)) ? (isNaN(Number(p.selling_price)) ? 0 : Number(p.selling_price)) : Number(p.cost_price),
          selling_price: isNaN(Number(p.selling_price)) ? (isNaN(Number(p.cost_price)) ? 0 : Number(p.cost_price)) : Number(p.selling_price),
          tax_rate: isNaN(Number(p.tax_rate)) ? 18 : Number(p.tax_rate),
          initial_stock: 0,
          reorder_level: 5,
        }));

        console.log(`[PDF Import] Successfully parsed ${parsedProducts.length} products using ${model}`);
        break; // success

      } catch (modelErr: any) {
        lastError = modelErr.message;
        console.error(`[PDF Import] Model ${model} failed:`, modelErr.message);
      }
    }

    if (parsedProducts.length === 0) {
      return res.status(422).json({
        error: `AI could not extract any products from this PDF. ${lastError ? `Detail: ${lastError}` : 'Please ensure the PDF contains text-based product listings.'}`,
        rawTextPreview: pdfText.substring(0, 500),
      });
    }

    return res.json({
      success: true,
      count: parsedProducts.length,
      products: parsedProducts,
    });

  } catch (err: any) {
    console.error('[PDF Import] Unexpected error:', err);
    return res.status(500).json({ error: err.message || 'PDF import failed.' });
  }
});
