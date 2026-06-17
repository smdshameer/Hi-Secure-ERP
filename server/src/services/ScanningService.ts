import { prisma } from '../index';
import { BarcodeService } from './BarcodeService';
import { OCRService } from './OCRService';

export class ScanningService {
  /**
   * Scans an image buffer. Attempts Barcode first, falls back to PaddleOCR.
   */
  static async scanImage(buffer: Buffer): Promise<any> {
    const startTime = Date.now();
    let engine = 'zxing';
    let ocrTriggered = false;
    let ocrDuration = 0;
    let ocrTextLength = 0;
    let matchedProduct: any = null;
    let barcodeText: string | null = null;
    let ocrText: string | null = null;
    let meta: any = null;

    // STEP 1: Barcode/QR Detection
    const barcodeResult = await BarcodeService.detectBarcode(buffer);
    if (barcodeResult) {
      barcodeText = barcodeResult.text;
      matchedProduct = await BarcodeService.lookupProduct(barcodeResult.text);
    }

    // STEP 2: OCR Fallback if no barcode or product matched
    if (!matchedProduct) {
      ocrTriggered = true;
      engine = 'paddleocr';
      const ocrStart = Date.now();
      const ocrResult = await OCRService.processImage(buffer);
      ocrDuration = Date.now() - ocrStart;
      ocrText = ocrResult.text;
      ocrTextLength = ocrText.length;

      // Run Matching Engine
      const matchResult = await this.matchProductFromText(ocrText);
      matchedProduct = matchResult.product;
      meta = matchResult.meta;
    }

    const totalDuration = Date.now() - startTime;

    // Log the scan result (Console / audit logs)
    console.log(`[ScanningService] Scan completed in ${totalDuration}ms. Engine: ${engine}. Match: ${matchedProduct ? matchedProduct.name : 'None'}`);

    return {
      matchedProduct,
      ocrText,
      barcodeText,
      meta,
      logs: {
        engineUsed: engine,
        detectionTime: totalDuration,
        ocrDuration,
        ocrTriggered,
        ocrTextLength,
        productMatchResult: matchedProduct ? 'matched' : 'not_matched'
      }
    };
  }

  /**
   * Parses product catalog from PDF buffer.
   */
  static async processCatalog(buffer: Buffer): Promise<{ previewItems: any[]; pages: number; logs: any }> {
    const startTime = Date.now();
    
    // 1. Process PDF using OCRService
    const ocrResult = await OCRService.processPDF(buffer);
    const ocrDuration = Date.now() - startTime;
    
    // 2. Parse catalog text into structured items
    const previewItems = await this.parseCatalogText(ocrResult.text);
    
    return {
      previewItems,
      pages: ocrResult.pages,
      logs: {
        engineUsed: ocrResult.source === 'text' ? 'pdf-parse' : 'paddleocr',
        detectionTime: Date.now() - startTime,
        ocrDuration,
        ocrTriggered: ocrResult.source === 'ocr',
        ocrTextLength: ocrResult.text.length,
        catalogPageCount: ocrResult.pages,
        importSuccessCount: previewItems.length
      }
    };
  }

  /**
   * Product Matching Engine Priority Cascade.
   */
  static async matchProductFromText(text: string): Promise<{ product: any | null; meta: any }> {
    const brands = await prisma.brand.findMany({ select: { name: true } });
    const brandNames = brands.map(b => b.name);
    
    // Extract metadata using regex
    const meta = this.extractMetadata(text, brandNames);
    
    // Split text into alphanumeric words for search candidates
    const words = text
      .split(/[\s,\.\/\-_:]+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length >= 3);
      
    // 1. Priority 1: Barcode/Part Number match (search for candidate words that are barcodes or part numbers)
    for (const word of words) {
      if (/^[0-9a-zA-Z]{5,20}$/.test(word)) {
        const product = await prisma.parts.findFirst({
          where: {
            is_active: true,
            OR: [
              { barcode: word },
              { part_number: { equals: word, mode: 'insensitive' } }
            ]
          }
        });
        if (product) return { product, meta };
      }
    }

    // 2. Priority 2: Serial Number match
    if (meta.serial) {
      // Find part sold with this serial in SalesInvoiceItems
      // serial_numbers is String[] array in Postgres
      const soldItem = await prisma.salesInvoiceItems.findFirst({
        where: {
          serial_numbers: { has: meta.serial }
        },
        include: { part: true }
      });
      if (soldItem && soldItem.part) {
        return { product: soldItem.part, meta };
      }

      // Check if this serial is registered in repairs
      const repairItem = await prisma.repair.findFirst({
        where: { serial_number: meta.serial }
      });
      if (repairItem) {
        // Find by model number or brand if available
        if (repairItem.model_number) {
          const product = await prisma.parts.findFirst({
            where: {
              is_active: true,
              model_number: { equals: repairItem.model_number, mode: 'insensitive' }
            }
          });
          if (product) return { product, meta };
        }
      }
    }

    // 3. Priority 3: Model Number match
    if (meta.model) {
      const product = await prisma.parts.findFirst({
        where: {
          is_active: true,
          model_number: { equals: meta.model, mode: 'insensitive' }
        }
      });
      if (product) return { product, meta };
    }
    
    // Fallback model search by matching candidate words
    for (const word of words) {
      const product = await prisma.parts.findFirst({
        where: {
          is_active: true,
          model_number: { equals: word, mode: 'insensitive' }
        }
      });
      if (product) return { product, meta };
    }

    // 4. Priority 4: Part Number match
    if (meta.partNumber) {
      const product = await prisma.parts.findFirst({
        where: {
          is_active: true,
          part_number: { equals: meta.partNumber, mode: 'insensitive' }
        }
      });
      if (product) return { product, meta };
    }

    // 5. Priority 5: Product Name Similarity (>=75% match)
    const allParts = await prisma.parts.findMany({
      where: { is_active: true }
    });
    
    let bestMatch: any = null;
    let highestSimilarity = 0;
    
    for (const part of allParts) {
      const similarity = this.getSimilarity(part.name, text);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = part;
      }
    }
    
    if (highestSimilarity >= 0.75) {
      console.log(`[ScanningService] Fuzzy match found: ${bestMatch.name} (Similarity: ${highestSimilarity.toFixed(2)})`);
      return { product: bestMatch, meta };
    }

    return { product: null, meta };
  }

  /**
   * Extracts Brand, Model, Serial, Part Number using regex.
   */
  private static extractMetadata(text: string, knownBrands: string[]): any {
    const meta: any = {};
    
    // Find Brand
    for (const brand of knownBrands) {
      const regex = new RegExp(`\\b${brand}\\b`, 'i');
      if (regex.test(text)) {
        meta.brand = brand;
        break;
      }
    }

    // Find Serial
    const serialRegex = /(?:s\/n|serial(?:\s*no)?|sn)[:\s\-=]+([a-zA-Z0-9\-]{5,30})/i;
    const serialMatch = text.match(serialRegex);
    if (serialMatch) {
      meta.serial = serialMatch[1].trim();
    }

    // Find Model
    const modelRegex = /(?:model(?:\s*no)?|m\/n|ref)[:\s\-=]+([a-zA-Z0-9\-]{4,30})/i;
    const modelMatch = text.match(modelRegex);
    if (modelMatch) {
      meta.model = modelMatch[1].trim();
    }

    // Find Part Number
    const partRegex = /(?:p\/n|part(?:\s*no)?|pn)[:\s\-=]+([a-zA-Z0-9\-]{4,30})/i;
    const partMatch = text.match(partRegex);
    if (partMatch) {
      meta.partNumber = partMatch[1].trim();
    }

    return meta;
  }

  /**
   * Helper to compute Dice Coefficient string similarity.
   */
  private static getSimilarity(s1: string, s2: string): number {
    const str1 = s1.replace(/\s+/g, '').toLowerCase();
    const str2 = s2.replace(/\s+/g, '').toLowerCase();
    if (str1 === str2) return 1.0;
    if (str1.length < 2 || str2.length < 2) return 0.0;
    
    const bigrams1 = new Map<string, number>();
    for (let i = 0; i < str1.length - 1; i++) {
      const bigram = str1.slice(i, i + 2);
      bigrams1.set(bigram, (bigrams1.get(bigram) || 0) + 1);
    }
    
    let intersection = 0;
    for (let i = 0; i < str2.length - 1; i++) {
      const bigram = str2.slice(i, i + 2);
      const count = bigrams1.get(bigram) || 0;
      if (count > 0) {
        intersection++;
        bigrams1.set(bigram, count - 1);
      }
    }
    
    return (2.0 * intersection) / (str1.length + str2.length - 2);
  }

  /**
   * Parses catalog OCR text into structured product records.
   */
  private static async parseCatalogText(text: string): Promise<any[]> {
    const items: any[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const brands = await prisma.brand.findMany({ select: { name: true } });
    const brandNames = brands.map(b => b.name.toLowerCase());
    
    for (const line of lines) {
      const priceRegex = /(?:rs|inr|[\u20B9\$])?[:\s]*(\d+(?:\.\d{2})?)\s*$/i;
      const priceMatch = line.match(priceRegex);
      
      if (priceMatch) {
        const priceVal = parseFloat(priceMatch[1]);
        const detailsText = line.replace(priceRegex, '').trim();
        
        let brandFound = '';
        for (const brand of brandNames) {
          if (detailsText.toLowerCase().includes(brand)) {
            brandFound = brand;
            break;
          }
        }
        
        const words = detailsText.split(/\s+/);
        let modelFound = '';
        for (const word of words) {
          if (/[a-zA-Z]+[0-9]+|[0-9]+[a-zA-Z]+|[a-zA-Z0-9]+-[a-zA-Z0-9]+/.test(word)) {
            modelFound = word;
            break;
          }
        }
        
        if (detailsText.length > 5) {
          items.push({
            brand: brandFound ? brandFound.toUpperCase() : 'GENERIC',
            model: modelFound || 'N/A',
            description: detailsText,
            price: priceVal
          });
        }
      }
    }
    
    return items;
  }
}
