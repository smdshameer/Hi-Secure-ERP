import { NormalizedProduct } from './ProductNormalizationService';

export class ProductValidationService {
  /**
   * Computes Dice Coefficient similarity between two strings.
   * Dice Coefficient = (2 * intersection) / (size1 + size2)
   */
  public static diceCoefficient(str1: string, str2: string): number {
    const s1 = str1.replace(/\s+/g, '').toLowerCase();
    const s2 = str2.replace(/\s+/g, '').toLowerCase();

    if (s1 === s2) return 1.0;
    if (s1.length < 2 || s2.length < 2) return 0.0;

    const getBigrams = (str: string): Set<string> => {
      const bigrams = new Set<string>();
      for (let i = 0; i < str.length - 1; i++) {
        bigrams.add(str.substring(i, i + 2));
      }
      return bigrams;
    };

    const bigrams1 = getBigrams(s1);
    const bigrams2 = getBigrams(s2);

    let intersection = 0;
    for (const b of bigrams1) {
      if (bigrams2.has(b)) {
        intersection++;
      }
    }

    return (2.0 * intersection) / (bigrams1.size + bigrams2.size);
  }

  /**
   * Performs duplicate detection against existing ERP parts.
   * Checks for model number, part number, and name similarity >= 75%.
   */
  public static detectDuplicate(
    product: NormalizedProduct,
    dbParts: Array<{
      part_id: number;
      part_number: string;
      name: string;
      model_number: string | null;
      barcode: string | null;
    }>
  ): { isDuplicate: boolean; reason: string | null; matchedPartId: number | null } {
    for (const part of dbParts) {
      // 1. Exact match on part number
      if (
        product.part_number &&
        part.part_number &&
        product.part_number.trim().toLowerCase() === part.part_number.trim().toLowerCase()
      ) {
        return {
          isDuplicate: true,
          reason: `Exact match on part number: ${part.part_number}`,
          matchedPartId: part.part_id
        };
      }

      // 2. Exact match on model number
      if (
        product.model_number &&
        part.model_number &&
        product.model_number.trim().toLowerCase() === part.model_number.trim().toLowerCase()
      ) {
        return {
          isDuplicate: true,
          reason: `Exact match on model number: ${part.model_number}`,
          matchedPartId: part.part_id
        };
      }

      // 3. Name similarity check via Dice Coefficient >= 75%
      if (product.name && part.name) {
        const similarity = this.diceCoefficient(product.name, part.name);
        if (similarity >= 0.75) {
          return {
            isDuplicate: true,
            reason: `Name similarity is ${(similarity * 100).toFixed(0)}% (Dice Coefficient >= 75%)`,
            matchedPartId: part.part_id
          };
        }
      }
    }

    return {
      isDuplicate: false,
      reason: null,
      matchedPartId: null
    };
  }

  /**
   * Validates price sanity and identifies outliers or anomalies.
   * Flags warnings instead of silently correcting.
   */
  public static validatePriceRange(
    costPrice: number | null,
    sellingPrice: number | null,
    dbAverageCost: number | null,
    dbAverageSelling: number | null
  ): string[] {
    const warnings: string[] = [];

    if (costPrice !== null) {
      if (costPrice <= 0) {
        warnings.push(`Cost price is zero or negative: ${costPrice}`);
      }
      if (dbAverageCost && dbAverageCost > 0) {
        if (costPrice > dbAverageCost * 10) {
          warnings.push(`Cost price (${costPrice}) is exceptionally high (more than 10x database average: ${dbAverageCost.toFixed(2)}). Possible missing decimal point.`);
        }
        if (costPrice < dbAverageCost * 0.1) {
          warnings.push(`Cost price (${costPrice}) is exceptionally low (less than 10% of database average: ${dbAverageCost.toFixed(2)}).`);
        }
      }
    }

    if (sellingPrice !== null) {
      if (sellingPrice <= 0) {
        warnings.push(`Selling price is zero or negative: ${sellingPrice}`);
      }
      if (dbAverageSelling && dbAverageSelling > 0) {
        if (sellingPrice > dbAverageSelling * 10) {
          warnings.push(`Selling price (${sellingPrice}) is exceptionally high (more than 10x database average: ${dbAverageSelling.toFixed(2)}). Possible missing decimal point.`);
        }
        if (sellingPrice < dbAverageSelling * 0.1) {
          warnings.push(`Selling price (${sellingPrice}) is exceptionally low (less than 10% of database average: ${dbAverageSelling.toFixed(2)}).`);
        }
      }
    }

    if (costPrice !== null && sellingPrice !== null) {
      if (costPrice > sellingPrice) {
        warnings.push(`Cost price (${costPrice}) is greater than the selling price (${sellingPrice}). Mismatch detected.`);
      }
    }

    return warnings;
  }

  /**
   * Computes the confidence level of extraction based on completeness and duplicate presence.
   */
  public static computeConfidence(
    product: NormalizedProduct,
    isDuplicate: boolean
  ): { score: number; level: 'HIGH' | 'MEDIUM' | 'LOW' } {
    let score = 0;

    // Positive scoring factors
    if (product.brand) score += 25;
    if (product.model_number) score += 30;
    if (product.cost_price !== null || product.selling_price !== null) score += 20;
    if (product.category) score += 10;
    if (product.description) score += 5;

    // Negative penalty factors
    if (isDuplicate) score -= 25;
    if (product.cost_price === null && product.selling_price === null) score -= 30;
    if (!product.model_number) score -= 40;

    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    let level: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (score >= 80) {
      level = 'HIGH';
    } else if (score >= 50) {
      level = 'MEDIUM';
    }

    return { score, level };
  }
}
