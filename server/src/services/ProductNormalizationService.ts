import { BrandAliasService } from './BrandAliasService';
import { CategoryNormalizationService } from './CategoryNormalizationService';

export interface RawProduct {
  brand?: string | null;
  category?: string | null;
  model_number?: string | null;
  part_number?: string | null;
  name?: string | null;
  description?: string | null;
  cost_price?: string | number | null;
  selling_price?: string | number | null;
  tax_rate?: string | number | null;
  [key: string]: any;
}

export interface NormalizedProduct {
  brand: string | null;
  category: string | null;
  model_number: string | null;
  part_number: string | null;
  name: string;
  description: string | null;
  cost_price: number | null;
  selling_price: number | null;
  tax_rate: number;
}

export class ProductNormalizationService {
  /**
   * Cleans OCR text control characters and excessive whitespaces.
   */
  public static cleanText(text: string | null | undefined): string | null {
    if (!text) return null;
    return text
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // strip control chars
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Cleans model numbers and part numbers (removing slashes/whitespaces as appropriate, standardizing to uppercase).
   */
  public static cleanCode(code: string | null | undefined): string | null {
    if (!code) return null;
    return code
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/\s+/g, '') // remove all whitespaces from part/model numbers
      .toUpperCase()
      .trim();
  }

  /**
   * Parses price/currency string into a clean floating-point number.
   * Handles commas, currency symbols, and extra characters.
   */
  public static parseNumber(val: string | number | null | undefined): number | null {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') {
      return isNaN(val) ? null : val;
    }
    
    // Clean string representation of price
    let cleaned = val.trim();
    
    // Remove common prefixes/suffixes like Rs., Rs, INR, $
    cleaned = cleaned.replace(/^(rs\.?|inr|usd|\$)\s*/i, '');
    
    // Remove commas
    cleaned = cleaned.replace(/,/g, '');
    
    // Extract first valid decimal number pattern (e.g. 1234.56 or -1234)
    const match = cleaned.match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const parsed = parseFloat(match[0]);
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }


  /**
   * Normalizes a raw product object into the standard NormalizedProduct format.
   */
  public static normalize(raw: RawProduct): NormalizedProduct {
    const rawBrand = this.cleanText(raw.brand);
    const normalizedBrand = BrandAliasService.normalize(rawBrand);

    const rawCategory = this.cleanText(raw.category);
    const normalizedCategory = CategoryNormalizationService.normalize(rawCategory);

    const modelNumber = this.cleanCode(raw.model_number || raw.model);
    const partNumber = this.cleanCode(raw.part_number || raw.part);
    
    // Clean name: capitalize and clean text
    const rawName = this.cleanText(raw.name) || '';
    const normalizedName = rawName
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ') || modelNumber || partNumber || 'Unnamed Product';

    const description = this.cleanText(raw.description);

    const costPrice = this.parseNumber(raw.cost_price);
    const sellingPrice = this.parseNumber(raw.selling_price);
    
    // Normalize GST tax rate, default to 18% if missing or invalid
    const rawTax = this.parseNumber(raw.tax_rate);
    const taxRate = rawTax !== null ? rawTax : 18;

    return {
      brand: normalizedBrand,
      category: normalizedCategory,
      model_number: modelNumber,
      part_number: partNumber || modelNumber, // fallback to model_number if part_number is missing
      name: normalizedName,
      description,
      cost_price: costPrice,
      selling_price: sellingPrice,
      tax_rate: taxRate
    };
  }
}
