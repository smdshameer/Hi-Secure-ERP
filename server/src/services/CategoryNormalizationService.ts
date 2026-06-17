export class CategoryNormalizationService {
  private static categoryMap: Record<string, string> = {
    'ip camera': 'Camera',
    'bullet camera': 'Camera',
    'dome camera': 'Camera',
    'analog camera': 'Camera',
    'camera': 'Camera',
    'nvr': 'NVR',
    'network video recorder': 'NVR',
    'dvr': 'DVR',
    'digital video recorder': 'DVR',
    'fingerprint': 'Biometric',
    'fingerprint reader': 'Biometric',
    'biometric device': 'Biometric',
    'face reader': 'Biometric',
    'biometric': 'Biometric',
    'switch': 'Networking',
    'router': 'Networking',
    'cable': 'Networking',
    'rj45': 'Networking',
    'networking': 'Networking'
  };

  /**
   * Maps a free-text category into an official standardized ERP category.
   * Returns a capitalized trimmed string of the input if no match is found,
   * or null if the input is empty.
   */
  public static normalize(category: string | null | undefined): string | null {
    if (!category) return null;
    const cleaned = category.trim().toLowerCase().replace(/\s+/g, ' ');
    if (this.categoryMap[cleaned]) {
      return this.categoryMap[cleaned];
    }

    // Fallback: capitalize each word
    return category
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
