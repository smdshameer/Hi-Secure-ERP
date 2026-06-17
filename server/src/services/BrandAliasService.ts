export class BrandAliasService {
  private static aliasMap: Record<string, string> = {
    'hik': 'Hikvision',
    'hikvision': 'Hikvision',
    'hik vision': 'Hikvision',
    'cpplus': 'CP Plus',
    'cp plus': 'CP Plus',
    'zk': 'ZKTeco',
    'zkteco': 'ZKTeco',
    'dahua': 'Dahua',
    'essl': 'eSSL'
  };

  /**
   * Normalizes a brand name against a known alias dictionary.
   * If no match is found, returns a capitalized trimmed version of the input,
   * or null if the input is empty.
   */
  public static normalize(brand: string | null | undefined): string | null {
    if (!brand) return null;
    const cleaned = brand.trim().toLowerCase().replace(/\s+/g, ' ');
    if (this.aliasMap[cleaned]) {
      return this.aliasMap[cleaned];
    }
    
    // Fallback: capitalize each word
    return brand
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
